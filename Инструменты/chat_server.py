# База чата отдельная, ключ модера всё равно общий.
"""Тематический чат: отдельная ограниченная SQLite-база, без внешних зависимостей."""
import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from urllib.parse import parse_qs


class ChatError(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status


class ChatService:
    DAYS = 30
    TOTAL = 6000
    PER_TOPIC = 2000

    def __init__(self, guestbook):
        self.gb = guestbook
        self.path = guestbook.private / "chat.sqlite3"
        self.cleaned = 0
        with self.db() as db:
            db.executescript(
                """
                PRAGMA auto_vacuum=INCREMENTAL;
                CREATE TABLE IF NOT EXISTS topics(id INTEGER PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,created INTEGER NOT NULL,closed INTEGER NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS users(identity TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,created INTEGER NOT NULL,last_seen INTEGER NOT NULL,banned_until INTEGER NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,topic INTEGER NOT NULL,identity TEXT NOT NULL,code TEXT NOT NULL,nick TEXT NOT NULL,text TEXT NOT NULL,status TEXT NOT NULL,flags TEXT NOT NULL,ip TEXT NOT NULL,created INTEGER NOT NULL);
                CREATE INDEX IF NOT EXISTS chat_topic ON messages(topic,id);
                CREATE INDEX IF NOT EXISTS chat_created ON messages(created);
                CREATE INDEX IF NOT EXISTS chat_identity ON messages(identity,created);
                CREATE TABLE IF NOT EXISTS reports(message INTEGER NOT NULL,identity TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(message,identity));
                CREATE TABLE IF NOT EXISTS limits(id TEXT PRIMARY KEY,last REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS bans(ip TEXT PRIMARY KEY,until INTEGER NOT NULL);
            """
            )

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=8)
        db.row_factory = sqlite3.Row
        # В эти 20 МиБ входят и индексы. Освободившиеся страницы база заберёт повторно.
        db.execute("PRAGMA max_page_count=5120")
        try:
            with db:
                yield db
        finally:
            db.close()

    def digest(self, value):
        return hmac.new(
            self.gb.key.encode(), value.encode(), hashlib.sha256
        ).hexdigest()

    # Не чистить всю историю на каждом запросе, пожалуйста.
    def clean(self, force=False):
        now = int(time.time())
        if not force and now - self.cleaned < 600:
            return
        with self.db() as db:
            db.execute(
                "DELETE FROM messages WHERE created<?", (now - self.DAYS * 86400,)
            )
            for topic in db.execute("SELECT id FROM topics").fetchall():
                db.execute(
                    "DELETE FROM messages WHERE topic=? AND id NOT IN (SELECT id FROM messages WHERE topic=? ORDER BY id DESC LIMIT ?)",
                    (topic["id"], topic["id"], self.PER_TOPIC),
                )
            db.execute(
                "DELETE FROM messages WHERE id NOT IN (SELECT id FROM messages ORDER BY id DESC LIMIT ?)",
                (self.TOTAL,),
            )
            db.execute(
                "DELETE FROM reports WHERE message NOT IN (SELECT id FROM messages)"
            )
            db.execute(
                "DELETE FROM users WHERE last_seen<? AND identity NOT IN (SELECT identity FROM messages)",
                (now - self.DAYS * 86400,),
            )
            db.execute("DELETE FROM limits WHERE last<?", (now - 3600,))
            db.execute("DELETE FROM bans WHERE until<?", (now,))
            db.execute("PRAGMA incremental_vacuum(128)")
        self.cleaned = now

    def limit(self, db, key, seconds):
        now = time.time()
        last = db.execute("SELECT last FROM limits WHERE id=?", (key,)).fetchone()
        if last and now - last["last"] < seconds:
            raise ChatError(
                "Слишком быстро. Подожди немного. / Too fast. Please wait.", 429
            )
        db.execute("INSERT OR REPLACE INTO limits VALUES(?,?)", (key, now))

    # Я тот же ник ничего не значит. Нужен токен из базы, и ещё проверить бан.
    def user(self, env, db):
        token = env.get("HTTP_X_CHAT_TOKEN", "")
        if not re.fullmatch("[a-f0-9]{64}", token):
            raise ChatError("Нужен код посетителя. / A visitor code is required.", 401)
        row = db.execute(
            "SELECT * FROM users WHERE identity=?", (self.digest("user:" + token),)
        ).fetchone()
        if not row:
            raise ChatError("Обнови код посетителя. / Renew your visitor code.", 401)
        if row["banned_until"] > time.time():
            raise ChatError("Доступ временно ограничен. / Temporarily banned.", 403)
        return row

    # наружу только эти поля
    def public_message(self, row):
        return {
            key: row[key] for key in ["id", "topic", "code", "nick", "text", "created"]
        }

    def handle(self, env, response):
        try:
            self.clean()
            route, method = env["PATH_INFO"], env["REQUEST_METHOD"]
            query = parse_qs(env.get("QUERY_STRING", ""))
            admin = route.startswith("/api/chat/admin/")
            if admin and not hmac.compare_digest(
                env.get("HTTP_AUTHORIZATION", ""), "Bearer " + self.gb.key
            ):
                raise ChatError("Нужен ключ модератора. / Moderator key required.", 401)
            payload = {}
            if method == "POST":
                try:
                    length = int(env.get("CONTENT_LENGTH") or 0)
                    if (
                        not 0 < length <= 12000
                        or env.get("CONTENT_TYPE", "").split(";")[0]
                        != "application/json"
                    ):
                        raise ValueError()
                    payload = json.loads(env["wsgi.input"].read(length))
                    if not isinstance(payload, dict):
                        raise ValueError()
                except (ValueError, UnicodeError):
                    raise ChatError("Некорректный запрос. / Invalid request.")
            ip = self.digest("chat-ip:" + env.get("REMOTE_ADDR", ""))
            now = int(time.time())
            with self.db() as db:
                if method == "GET" and route == "/api/chat/topics":
                    topics = [
                        dict(row)
                        for row in db.execute(
                            "SELECT t.*, (SELECT COUNT(*) FROM messages m WHERE m.topic=t.id AND m.status='approved') AS count FROM topics t ORDER BY t.id DESC"
                        )
                    ]
                    return response(
                        {
                            "topics": topics,
                            "retentionDays": self.DAYS,
                            "maxMessages": self.TOTAL,
                        }
                    )
                if method == "POST" and route == "/api/chat/identity":
                    self.limit(db, "new:" + ip, 10)
                    ban = db.execute(
                        "SELECT until FROM bans WHERE ip=?", (ip,)
                    ).fetchone()
                    if ban and ban["until"] > now:
                        raise ChatError(
                            "Доступ временно ограничен. / Temporarily banned.", 403
                        )
                    if db.execute("SELECT COUNT(*) FROM users").fetchone()[0] >= 10000:
                        raise ChatError("Попробуй позже. / Please try later.", 429)
                    token = secrets.token_hex(32)
                    identity = self.digest("user:" + token)
                    code = self.digest("code:" + token)[:10].upper()
                    db.execute(
                        "INSERT INTO users VALUES(?,?,?,?,0)",
                        (identity, code, now, now),
                    )
                    return response({"token": token, "code": code}, 201)
                if method == "GET" and route == "/api/chat/me":
                    user = self.user(env, db)
                    return response({"code": user["code"]})
                if method == "GET" and route == "/api/chat/messages":
                    try:
                        topic = int(query.get("topic", ["0"])[0])
                        after = int(query.get("after", ["0"])[0])
                        before = int(query.get("before", ["0"])[0])
                    except ValueError:
                        raise ChatError("Некорректная страница. / Invalid page.")
                    if not db.execute(
                        "SELECT id FROM topics WHERE id=?", (topic,)
                    ).fetchone():
                        raise ChatError("Тема не найдена. / Topic not found.", 404)
                    rows = db.execute(
                        "SELECT * FROM messages WHERE topic=? AND status='approved' AND id>? AND (?=0 OR id<?) ORDER BY id DESC LIMIT 51",
                        (topic, after, before, before),
                    ).fetchall()
                    # Свежую пачку заменить целиком. Иначе удалённое так и будет торчать у посетителя.
                    visitor_token = env.get("HTTP_X_CHAT_TOKEN", "")
                    identity = (
                        self.digest("user:" + visitor_token)
                        if re.fullmatch("[a-f0-9]{64}", visitor_token)
                        else ""
                    )
                    data = [
                        dict(
                            self.public_message(row),
                            mine=bool(
                                identity
                                and hmac.compare_digest(identity, row["identity"])
                            ),
                        )
                        for row in reversed(rows[:50])
                    ]
                    return response(
                        {
                            "messages": data,
                            "older": rows[49]["id"] if len(rows) > 50 else None,
                        }
                    )
                if method == "POST" and route == "/api/chat/send":
                    user = self.user(env, db)
                    topic = payload.get("topic")
                    text = payload.get("text")
                    nick = payload.get("nick", "")
                    if (
                        type(topic) is not int
                        or not isinstance(text, str)
                        or not isinstance(nick, str)
                    ):
                        raise ChatError("Некорректное сообщение. / Invalid message.")
                    text = text.strip()
                    nick = nick.strip()
                    if (
                        not 1 <= len(text) <= 500
                        or len(nick) > 24
                        or any(ord(c) < 32 and c not in "\n\t" for c in text + nick)
                    ):
                        raise ChatError(
                            "До 500 знаков; ник до 24. / Up to 500 characters; nickname up to 24."
                        )
                    thread = db.execute(
                        "SELECT * FROM topics WHERE id=?", (topic,)
                    ).fetchone()
                    if not thread:
                        raise ChatError("Тема не найдена. / Topic not found.", 404)
                    if thread["closed"]:
                        raise ChatError("Тема закрыта. / Topic is closed.", 403)
                    ban = db.execute(
                        "SELECT until FROM bans WHERE ip=?", (ip,)
                    ).fetchone()
                    if ban and ban["until"] > now:
                        raise ChatError(
                            "Доступ временно ограничен. / Temporarily banned.", 403
                        )
                    self.limit(db, "send:" + user["identity"], 5)
                    self.limit(db, "ip:" + ip, 2)
                    if (
                        db.execute(
                            "SELECT COUNT(*) FROM messages WHERE identity=? AND created>?",
                            (user["identity"], now - 3600),
                        ).fetchone()[0]
                        >= 120
                    ):
                        raise ChatError(
                            "Лимит сообщений за час. / Hourly message limit reached.",
                            429,
                        )
                    if db.execute(
                        "SELECT 1 FROM messages WHERE identity=? AND text=? AND created>?",
                        (user["identity"], text, now - 600),
                    ).fetchone():
                        raise ChatError(
                            "Такое сообщение уже отправлено. / Duplicate message.", 409
                        )
                    if (
                        db.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
                        >= self.TOTAL
                    ):
                        db.execute(
                            "DELETE FROM messages WHERE id IN (SELECT id FROM messages ORDER BY id LIMIT 100)"
                        )
                    if (
                        db.execute(
                            "SELECT COUNT(*) FROM messages WHERE topic=?", (topic,)
                        ).fetchone()[0]
                        >= self.PER_TOPIC
                    ):
                        db.execute(
                            "DELETE FROM messages WHERE id IN (SELECT id FROM messages WHERE topic=? ORDER BY id LIMIT 50)",
                            (topic,),
                        )
                    flags = self.gb.flags(nick + " " + text)
                    if flags:
                        status = 'pending'
                    else:
                        status = 'approved'
                    cursor = db.execute(
                        "INSERT INTO messages(topic,identity,code,nick,text,status,flags,ip,created) VALUES(?,?,?,?,?,?,?,?,?)",
                        (
                            topic,
                            user["identity"],
                            user["code"],
                            nick,
                            text,
                            status,
                            json.dumps(flags, ensure_ascii=False),
                            ip,
                            now,
                        ),
                    )
                    db.execute(
                        "UPDATE users SET last_seen=? WHERE identity=?",
                        (now, user["identity"]),
                    )
                    return response({"id": cursor.lastrowid, "status": status}, 201)
                if method == "POST" and route in [
                    "/api/chat/delete",
                    "/api/chat/admin/delete",
                ]:
                    mid = payload.get("id")
                    if type(mid) is not int:
                        raise ChatError("Некорректный запрос. / Invalid request.")
                    message = db.execute(
                        "SELECT identity FROM messages WHERE id=?", (mid,)
                    ).fetchone()
                    if not message:
                        raise ChatError(
                            "Сообщение не найдено. / Message not found.", 404
                        )
                    if not admin:
                        user = self.user(env, db)
                        if not hmac.compare_digest(
                            user["identity"], message["identity"]
                        ):
                            raise ChatError(
                                "Можно удалять только свои сообщения. / You can only delete your own messages.",
                                403,
                            )
                    db.execute("DELETE FROM reports WHERE message=?", (mid,))
                    db.execute("DELETE FROM messages WHERE id=?", (mid,))
                    return response({"ok": True})
                if method == "POST" and route == "/api/chat/report":
                    user = self.user(env, db)
                    mid = payload.get("id")
                    if (
                        type(mid) is not int
                        or not db.execute(
                            "SELECT id FROM messages WHERE id=? AND status='approved'",
                            (mid,),
                        ).fetchone()
                    ):
                        raise ChatError(
                            "Сообщение не найдено. / Message not found.", 404
                        )
                    self.limit(db, "report:" + user["identity"], 10)
                    db.execute(
                        "INSERT OR IGNORE INTO reports VALUES(?,?,?)",
                        (mid, user["identity"], now),
                    )
                    return response({"ok": True})
                if admin and method == "GET" and route == "/api/chat/admin/stats":
                    return response(
                        {
                            "messages": db.execute(
                                "SELECT COUNT(*) FROM messages"
                            ).fetchone()[0],
                            "pending": db.execute(
                                "SELECT COUNT(*) FROM messages WHERE status='pending'"
                            ).fetchone()[0],
                            "databaseBytes": self.path.stat().st_size,
                            "budgetBytes": 20 * 1024 * 1024,
                            "retentionDays": self.DAYS,
                        }
                    )
                if admin and method == "GET" and route == "/api/chat/admin/messages":
                    rows = db.execute(
                        "SELECT m.*, (SELECT COUNT(*) FROM reports r WHERE r.message=m.id) AS reports FROM messages m ORDER BY (m.status='pending') DESC, reports DESC, m.id DESC LIMIT 100"
                    ).fetchall()
                    return response(
                        {
                            "messages": [
                                dict(
                                    self.public_message(row),
                                    status=row["status"],
                                    flags=json.loads(row["flags"]),
                                    reports=row["reports"],
                                )
                                for row in rows
                            ]
                        }
                    )
                if admin and method == "POST" and route == "/api/chat/admin/topic":
                    if type(payload.get("id")) is int:
                        if type(payload.get("closed")) is not bool:
                            raise ChatError(
                                "Нужно состояние темы. / Topic state required."
                            )
                        db.execute(
                            "UPDATE topics SET closed=? WHERE id=?",
                            (int(payload["closed"]), payload["id"]),
                        )
                    else:
                        title = payload.get("title", "")
                        description = payload.get("description", "")
                        if (
                            not isinstance(title, str)
                            or not isinstance(description, str)
                            or not 1 <= len(title.strip()) <= 80
                            or len(description) > 500
                        ):
                            raise ChatError(
                                "Название до 80, описание до 500. / Title up to 80; description up to 500."
                            )
                        if (
                            db.execute("SELECT COUNT(*) FROM topics").fetchone()[0]
                            >= 12
                        ):
                            raise ChatError("Максимум 12 тем. / Maximum 12 topics.")
                        db.execute(
                            "INSERT INTO topics(title,description,created) VALUES(?,?,?)",
                            (title.strip(), description.strip(), now),
                        )
                    return response({"ok": True})
                if admin and method == "POST" and route == "/api/chat/admin/moderate":
                    mid = payload.get("id")
                    action = payload.get("action")
                    if type(mid) is not int or action not in [
                        "approve",
                        "reject",
                        "ban",
                    ]:
                        raise ChatError("Некорректное действие. / Invalid action.")
                    message = db.execute(
                        "SELECT * FROM messages WHERE id=?", (mid,)
                    ).fetchone()
                    if not message:
                        raise ChatError(
                            "Сообщение не найдено. / Message not found.", 404
                        )
                    db.execute(
                        "UPDATE messages SET status=? WHERE id=?",
                        ("approved" if action == "approve" else "rejected", mid),
                    )
                    if action == "ban":
                        db.execute(
                            "UPDATE users SET banned_until=? WHERE identity=?",
                            (now + 86400, message["identity"]),
                        )
                        db.execute(
                            "INSERT OR REPLACE INTO bans VALUES(?,?)",
                            (message["ip"], now + 86400),
                        )
                    return response({"ok": True})
            if admin and method == "POST" and route == "/api/chat/admin/cleanup":
                self.clean(force=True)
                return response({"ok": True})
            raise ChatError("Не найдено. / Not found.", 404)
        except ChatError as error:
            return response({"message": error.message}, error.status)
        except sqlite3.DatabaseError:
            return response(
                {
                    "message": "Хранилище чата временно недоступно. / Chat storage is temporarily unavailable."
                },
                503,
            )

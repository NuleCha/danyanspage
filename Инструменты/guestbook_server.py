
"""Локальная гостевая и WSGI-приложение. Данные и ключ — только в .private/."""
import base64
import hashlib
import hmac
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import sys
import sqlite3
import time
import unicodedata
from contextlib import contextmanager
from urllib.parse import parse_qs
from wsgiref.simple_server import make_server, WSGIServer, WSGIRequestHandler
from socketserver import ThreadingMixIn

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "Инструменты"))
from chat_server import ChatService

QUOTE_LIMIT = 64
MAX_MESSAGE = 3000
REACTIONS = {
    "biggrin",
    "yes",
    "ireful1",
    "give_rose",
    "wink",
    "shok",
    "clap",
    "scratch_one-s_head",
    "give_heart",
    "bye",
    "party",
    "dance",
    "sarcastic",
    "nea",
    "hello",
    "devil",
    "rofl",
    "thank_you2",
    "secret",
    "music",
    "drinks",
    "help",
    "wall",
    "ok",
    "boredom",
    "popcorm1",
    "angel",
    "mega_shok",
    "crazy",
    "unknw",
    "smile",
    "sorry",
    "friends",
    "rtfm",
    "sad",
    "blush",
    "air_kiss",
    "good",
    "yahoo",
    "cray",
}


def normalize(text):
    text = unicodedata.normalize("NFKC", text)
    text = re.sub("[\u200b-\u200f\ufeff]", "", text)
    return re.sub(r"\s+", " ", text).strip()


class Problem(Exception):
    def __init__(self, code, message, status=400):
        self.code, self.message, self.status = code, message, status


class Guestbook:
    def __init__(self, root=ROOT, private=None, min_age=2, interval=30):
        self.root = Path(root)
        self.private = Path(
            private or os.getenv("GUESTBOOK_DATA_DIR") or self.root / ".private"
        )
        self.private.mkdir(parents=True, exist_ok=True)
        self.key_path = self.private / "guestbook-admin-key.txt"
        if not self.key_path.exists():
            self.key_path.write_text(secrets.token_urlsafe(36), encoding="utf-8")
            try:
                self.key_path.chmod(0o600)
            except OSError:
                pass
        self.key = self.key_path.read_text(encoding="utf-8").strip()
        self.db_path = self.private / "guestbook.sqlite3"
        self.min_age, self.interval = min_age, interval
        self.origins = {
            o.strip().rstrip("/")
            for o in os.getenv("GUESTBOOK_ALLOWED_ORIGINS", "").split(",")
            if o.strip()
        }
        with self.db() as db:
            db.executescript(
                """
                CREATE TABLE IF NOT EXISTS entries (
                  id INTEGER PRIMARY KEY, name TEXT NOT NULL, message TEXT NOT NULL,
                  quote TEXT NOT NULL, danmaku INTEGER NOT NULL DEFAULT 0,
                  status TEXT NOT NULL DEFAULT 'pending', flags TEXT NOT NULL,
                  fingerprint TEXT NOT NULL, signature TEXT NOT NULL, created INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS entries_status ON entries(status, id);
                CREATE INDEX IF NOT EXISTS entries_signature ON entries(signature);
                CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY, value TEXT NOT NULL);
                INSERT OR IGNORE INTO settings VALUES ('automod', 'true');
                CREATE TABLE IF NOT EXISTS reactions (entry_id INTEGER NOT NULL, visitor TEXT NOT NULL, kind TEXT NOT NULL, PRIMARY KEY(entry_id,visitor));
                CREATE TABLE IF NOT EXISTS reaction_attempts (visitor TEXT PRIMARY KEY, created REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS attempts (fingerprint TEXT PRIMARY KEY, created INTEGER NOT NULL);
            """
            )

        with self.db() as db:
            if "owner_hash" not in [
                row[1] for row in db.execute("PRAGMA table_info(entries)")
            ]:
                db.execute(
                    "ALTER TABLE entries ADD COLUMN owner_hash TEXT NOT NULL DEFAULT ''"
                )

        self.chat = ChatService(self)

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.db_path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def token(self):
        value = str(int(time.time())) + ":" + secrets.token_hex(8)
        mac = hmac.new(self.key.encode(), value.encode(), hashlib.sha256).hexdigest()
        return base64.urlsafe_b64encode((value + ":" + mac).encode()).decode()

    def verify_token(self, token):
        try:
            value, mac = (
                base64.urlsafe_b64decode(token.encode()).decode().rsplit(":", 1)
            )
            # Пока подпись не сошлась, содержимому токена вообще не верю.
            # Сравнение оставляю hmac. Самодельной криптографии мне ещё не хватало:
            # https://github.com/python/cpython/blob/v3.11.0/Lib/hmac.py
            expected = hmac.new(
                self.key.encode(), value.encode(), hashlib.sha256
            ).hexdigest()
            age = time.time() - int(value.split(":")[0])
            if (
                not hmac.compare_digest(expected, mac)
                or age < self.min_age
                or age > 3600
            ):
                raise ValueError()
        except (ValueError, TypeError, UnicodeError, AttributeError):
            raise Problem("form", "Обнови форму и подожди пару секунд перед отправкой.")

    # До INSERT разобраться с длинами и полями, не после.
    def validate(self, payload):
        if not isinstance(payload, dict):
            raise Problem("format", "Некорректная запись.")
        if payload.get("website"):
            raise Problem("spam", "Запись отклонена антиспамом.")
        name, message, quote = [
            payload.get(k, "") for k in ["name", "message", "quote"]
        ]
        if not all(isinstance(v, str) for v in [name, message, quote]):
            raise Problem("format", "Поля записи должны быть текстом.")
        name, message, quote = name.strip() or "Анон", message.strip(), normalize(quote)
        if len(name) > 32 or not 1 <= len(message) <= MAX_MESSAGE:
            raise Problem("length", "Имя — до 32 знаков, запись — от 1 до 3000.")
        if any(ord(c) < 32 and c not in "\n\r\t" for c in name + message + quote):
            raise Problem("format", "В тексте есть недопустимые управляющие символы.")
        danmaku = payload.get("danmaku", False) is True
        if danmaku and (
            not quote or len(quote) > QUOTE_LIMIT or quote not in normalize(message)
        ):
            raise Problem(
                "quote", "Для полёта выбери фразу из своей записи, до 64 знаков."
            )
        if not danmaku:
            quote = ""
        return name, message, quote, danmaku

    def submit(self, payload, address):
        name, message, quote, danmaku = self.validate(payload)
        self.verify_token(payload.get("token", ""))
        fingerprint = hmac.new(
            self.key.encode(), address.encode(), hashlib.sha256
        ).hexdigest()
        signature = hashlib.sha256(normalize(message).casefold().encode()).hexdigest()
        flags = self.flags(name + " " + message)
        now = int(time.time())
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            previous = db.execute(
                "SELECT created FROM attempts WHERE fingerprint=?", (fingerprint,)
            ).fetchone()
            if previous and now - previous["created"] < self.interval:
                raise Problem("rate", "Подожди полминуты перед следующей записью.", 429)
            if db.execute(
                "SELECT 1 FROM entries WHERE signature=? AND fingerprint=?",
                (signature, fingerprint),
            ).fetchone():
                raise Problem("duplicate", "Такая запись уже отправлена.", 409)
            if db.execute(
                "SELECT 1 FROM entries WHERE signature=? AND created>?",
                (signature, now - 86400),
            ).fetchone():
                flags.append("похожая запись уже встречалась")
            recent = db.execute(
                "SELECT COUNT(*) FROM entries WHERE fingerprint=? AND created>?",
                (fingerprint, now - 3600),
            ).fetchone()[0]
            if recent >= 10:
                raise Problem(
                    "rate", "Слишком много записей за час. Попробуй позже.", 429
                )
            if recent >= 3:
                flags.append("много записей за час")
            auto = (
                db.execute(
                    "SELECT value FROM settings WHERE name='automod'"
                ).fetchone()[0]
                == "true"
            )
            if auto and (not flags):
                status = 'approved'
            else:
                status = 'pending'
            db.execute(
                "INSERT OR REPLACE INTO attempts VALUES (?,?)", (fingerprint, now)
            )
            owner = secrets.token_urlsafe(32)
            owner_hash = hashlib.sha256(owner.encode()).hexdigest()
            cursor = db.execute(
                """INSERT INTO entries
                (name,message,quote,danmaku,flags,fingerprint,signature,created,status,owner_hash)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    name,
                    message,
                    quote,
                    int(danmaku),
                    json.dumps(flags, ensure_ascii=False),
                    fingerprint,
                    signature,
                    now,
                    status,
                    owner_hash,
                ),
            )
            db.execute("DELETE FROM attempts WHERE created < ?", (now - 86400,))
            return {"id": cursor.lastrowid, "status": status, "ownerToken": owner}

    def flags(self, value):
        value = normalize(value).casefold()
        flags = []
        if re.search(
            r"https?://|www\.|(?:[\w-]+\.)+(?:[a-z]{2,24}|рф)(?:[/\s:]|$)|[\w.+-]+@[\w.-]+|(?:https?|t)\s*\[?[:.]\]?\s*[/\.]",
            value,
        ):
            flags.append("ссылка или контакт")
        if re.search(
            r"казино|промокод|подписывай|заработок|легк.{0,8}деньг|криптовалют|ставки на|casino|promo code|subscribe|earn money|crypto|buy now",
            value,
        ):
            flags.append("возможная реклама")
        if re.search(
            r"убью|убить тебя|твой адрес|изнасил|суицид|kill you|your address|child porn|педофил|детск.{0,12}порно|сдохни|ниггер|nigger",
            value,
        ):
            flags.append("требует проверки содержания")
        if re.search(r"(.)\1{12,}", value) or re.search(
            r"(.{3,40})(?:\s*\1){4,}", value
        ):
            flags.append("массовые повторы")
        if len(value) > 1000:
            flags.append("длинная запись")
        return flags

    def automod(self, payload=None):
        with self.db() as db:
            if payload is not None:
                if (
                    not isinstance(payload, dict)
                    or type(payload.get("enabled")) is not bool
                ):
                    raise Problem("format", "Нужно указать enabled: true или false.")
                db.execute(
                    "UPDATE settings SET value=? WHERE name='automod'",
                    ("true" if payload["enabled"] else "false",),
                )
            return {
                "enabled": db.execute(
                    "SELECT value FROM settings WHERE name='automod'"
                ).fetchone()[0]
                == "true"
            }

    # чужое удаляет только модер
    def delete_entry(self, payload, admin=False):
        if not isinstance(payload, dict) or type(payload.get("id")) is not int:
            raise Problem("format", "Некорректный запрос.")
        with self.db() as db:
            row = db.execute(
                "SELECT owner_hash FROM entries WHERE id=?", (payload["id"],)
            ).fetchone()
            if not row:
                raise Problem("missing", "Запись не найдена.", 404)
            token = payload.get("token", "")
            if not admin and (
                not isinstance(token, str)
                or not row["owner_hash"]
                or not hmac.compare_digest(
                    hashlib.sha256(token.encode()).hexdigest(), row["owner_hash"]
                )
            ):
                raise Problem("auth", "Можно удалять только свои записи.", 403)
            # ID НЕ переиспользовать. Иначе старый токен попадёт уже в чужую запись. БЛЯТЬ.
            db.execute(
                "UPDATE entries SET status='deleted',name='',message='',quote='',danmaku=0,flags='[]',owner_hash='' WHERE id=?",
                (payload["id"],),
            )
            db.execute("DELETE FROM reactions WHERE entry_id=?", (payload["id"],))
        return {"ok": True}

    def stop_phrase(self, payload):
        if (
            not isinstance(payload, dict)
            or type(payload.get("id")) is not int
            or not isinstance(payload.get("token"), str)
        ):
            raise Problem("format", "Некорректный запрос.")
        digest = hashlib.sha256(payload["token"].encode()).hexdigest()
        with self.db() as db:
            row = db.execute(
                "SELECT owner_hash FROM entries WHERE id=?", (payload["id"],)
            ).fetchone()
            if (
                not row
                or not row["owner_hash"]
                or not hmac.compare_digest(digest, row["owner_hash"])
            ):
                raise Problem("auth", "Нет права отключить эту фразу.", 403)
            db.execute(
                "UPDATE entries SET danmaku=0,quote='' WHERE id=?", (payload["id"],)
            )
        return {"ok": True}

    def reaction_visitor(self, value):
        if not isinstance(value, str) or not re.fullmatch("[a-f0-9]{32}", value):
            raise Problem("visitor", "Обнови страницу, чтобы поставить реакцию.")
        return hmac.new(
            self.key.encode(), ("reaction:" + value).encode(), hashlib.sha256
        ).hexdigest()

    # Повторный тык снимает реакцию, а не добавляет ещё одну.
    def react(self, payload, address=""):
        if (
            not isinstance(payload, dict)
            or type(payload.get("id")) is not int
            or not isinstance(payload.get("kind"), str)
            or payload.get("kind") not in REACTIONS
        ):
            raise Problem("reaction", "Неизвестная реакция.")
        visitor = self.reaction_visitor(payload.get("visitor"))
        ip = hmac.new(
            self.key.encode(), ("reaction-ip:" + address).encode(), hashlib.sha256
        ).hexdigest()
        now = time.time()
        with self.db() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT id FROM entries WHERE id=? AND status='approved'",
                (payload["id"],),
            ).fetchone()
            if not row:
                raise Problem("missing", "Запись не найдена.", 404)
            for key, delay in [(visitor, 0.5), (ip, 0.2)]:
                last = db.execute(
                    "SELECT created FROM reaction_attempts WHERE visitor=?", (key,)
                ).fetchone()
                if last and now - last["created"] < delay:
                    raise Problem(
                        "reaction_rate", "Слишком быстро. Подожди секунду.", 429
                    )
            old = db.execute(
                "SELECT kind FROM reactions WHERE entry_id=? AND visitor=?",
                (payload["id"], visitor),
            ).fetchone()
            if old and old["kind"] == payload["kind"]:
                db.execute(
                    "DELETE FROM reactions WHERE entry_id=? AND visitor=?",
                    (payload["id"], visitor),
                )
            else:
                db.execute(
                    "INSERT INTO reactions(entry_id,visitor,kind) VALUES(?,?,?) ON CONFLICT(entry_id,visitor) DO UPDATE SET kind=excluded.kind",
                    (payload["id"], visitor, payload["kind"]),
                )
            for key in [visitor, ip]:
                db.execute(
                    "INSERT OR REPLACE INTO reaction_attempts VALUES(?,?)", (key, now)
                )
            db.execute("DELETE FROM reaction_attempts WHERE created<?", (now - 3600,))
            result = self.reaction_counts(db, payload["id"], visitor)
        return result

    def reaction_counts(self, db, entry_id, visitor=""):
        counts = {
            row["kind"]: row["n"]
            for row in db.execute(
                "SELECT kind,COUNT(*) AS n FROM reactions WHERE entry_id=? GROUP BY kind",
                (entry_id,),
            )
        }
        mine = (
            db.execute(
                "SELECT kind FROM reactions WHERE entry_id=? AND visitor=?",
                (entry_id, visitor),
            ).fetchone()
            if visitor
            else None
        )
        return {"counts": counts, "mine": mine["kind"] if mine else None}

    def entries(self, admin=False, before=0, visitor=""):
        if visitor:
            visitor_hash = self.reaction_visitor(visitor)
        else:
            visitor_hash = ''
        with self.db() as db:
            if admin:
                rows = db.execute(
                    "SELECT * FROM entries WHERE (?=0 OR id<?) ORDER BY id DESC LIMIT 101",
                    (before, before),
                ).fetchall()
            else:
                rows = db.execute(
                    "SELECT * FROM entries WHERE status='approved' AND (?=0 OR id<?) ORDER BY id DESC LIMIT 21",
                    (before, before),
                ).fetchall()
            reaction_data = {}
            if not admin and rows:
                ids = [row["id"] for row in rows[:20]]
                placeholders = ",".join("?" for _ in ids)
                reaction_data = {n: {"counts": {}, "mine": None} for n in ids}
                for reaction in db.execute(
                    "SELECT entry_id,kind,COUNT(*) AS n FROM reactions WHERE entry_id IN ("
                    + placeholders
                    + ") GROUP BY entry_id,kind",
                    ids,
                ):
                    reaction_data[reaction["entry_id"]]["counts"][reaction["kind"]] = (
                        reaction["n"]
                    )
                if visitor_hash:
                    for reaction in db.execute(
                        "SELECT entry_id,kind FROM reactions WHERE visitor=? AND entry_id IN ("
                        + placeholders
                        + ")",
                        [visitor_hash] + ids,
                    ):
                        reaction_data[reaction["entry_id"]]["mine"] = reaction["kind"]
        if admin:
            page_size = 100
        else:
            page_size = 20
        has_more = len(rows) > page_size
        data = []
        for row in rows[:page_size]:
            item = {k: row[k] for k in ["id", "name", "message", "quote", "created"]}
            item["danmaku"] = bool(row["danmaku"])
            if not admin:
                item["reactions"] = reaction_data[row["id"]]
            if admin:
                item["status"], item["flags"] = row["status"], json.loads(row["flags"])
            data.append(item)
        return {"entries": data, "next": data[-1]["id"] if data and has_more else None}

    def moderate(self, payload):
        if not isinstance(payload, dict) or type(payload.get("id")) is not int:
            raise Problem("format", "Не указана запись.")
        status = payload.get("status")
        if status not in ["approved", "rejected", "pending"]:
            raise Problem("status", "Неизвестное действие.")
        with self.db() as db:
            row = db.execute(
                "SELECT * FROM entries WHERE id=?", (payload["id"],)
            ).fetchone()
            if not row:
                raise Problem("missing", "Запись не найдена.", 404)
            validation = dict(payload, name=row["name"], message=row["message"])
            _, _, quote, danmaku = self.validate(validation)
            db.execute(
                "UPDATE entries SET status=?, quote=?, danmaku=? WHERE id=?",
                (status, quote, int(danmaku), row["id"]),
            )
        return {"ok": True}

    def __call__(self, environ, respond):
        origin = environ.get("HTTP_ORIGIN", "").rstrip("/")
        same_origin = (
            environ.get("wsgi.url_scheme", "http")
            + "://"
            + environ.get("HTTP_HOST", "")
        )
        allowed = not origin or origin == same_origin or origin in self.origins
        headers = [("X-Content-Type-Options", "nosniff"), ("Cache-Control", "no-store")]
        if origin and allowed:
            headers += [("Access-Control-Allow-Origin", origin), ("Vary", "Origin")]

        def response(data, status=200, content_type="application/json; charset=utf-8"):
            raw = (
                json.dumps(data, ensure_ascii=False).encode()
                if isinstance(data, (dict, list))
                else data
            )
            reason = {
                200: "OK",
                201: "Created",
                204: "No Content",
                400: "Bad Request",
                401: "Unauthorized",
                403: "Forbidden",
                404: "Not Found",
                409: "Conflict",
                413: "Payload Too Large",
                429: "Too Many Requests",
                500: "Internal Server Error",
            }.get(status, "Error")
            respond(
                str(status) + " " + reason,
                headers
                + [("Content-Type", content_type), ("Content-Length", str(len(raw)))],
            )
            return [raw]

        try:
            route, method = environ.get("PATH_INFO", "/"), environ["REQUEST_METHOD"]
            try:
                # WSGI приносит путь как latin1. С русскими папками без этого будут 404.
                route = route.encode("latin1").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
            if not allowed:
                raise Problem("origin", "Источник запроса не разрешён.", 403)
            if method == "OPTIONS":
                headers += [
                    ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
                    (
                        "Access-Control-Allow-Headers",
                        "Content-Type, Authorization, X-Guest-Visitor, X-Chat-Token",
                    ),
                ]
                return response(b"", 204)
            if route.startswith("/api/chat/"):
                return self.chat.handle(environ, response)
            if route.startswith("/api/admin/"):
                auth = environ.get("HTTP_AUTHORIZATION", "")
                if not hmac.compare_digest(auth, "Bearer " + self.key):
                    raise Problem("auth", "Нужен ключ модератора.", 401)
            if method == "GET" and route == "/api/health":
                with self.db() as db:
                    db.execute("SELECT 1").fetchone()
                return response({"ok": True})
            if method == "GET" and route == "/api/admin/settings":
                return response(self.automod())
            if method == "GET" and route == "/api/form":
                return response({"token": self.token(), "quoteLimit": QUOTE_LIMIT})
            if method == "GET" and route == "/api/entries":
                try:
                    before = int(
                        parse_qs(environ.get("QUERY_STRING", "")).get("before", ["0"])[
                            0
                        ]
                    )
                except ValueError:
                    raise Problem("format", "Некорректная страница.")
                return response(
                    self.entries(
                        before=before, visitor=environ.get("HTTP_X_GUEST_VISITOR", "")
                    )
                )
            if method == "GET" and route == "/api/admin/entries":
                try:
                    before = int(
                        parse_qs(environ.get("QUERY_STRING", "")).get("before", ["0"])[
                            0
                        ]
                    )
                except ValueError:
                    raise Problem("format", "Некорректная страница.")
                return response(self.entries(admin=True, before=before))
            if method == "GET" and route == "/api/admin/export":
                all_entries, before = [], 0
                while True:
                    page = self.entries(admin=True, before=before)
                    all_entries.extend(page["entries"])
                    if not page["next"]:
                        break
                    before = page["next"]
                return response({"entries": all_entries})
            if method == "POST" and route in [
                "/api/entries",
                "/api/admin/moderate",
                "/api/admin/settings",
                "/api/phrase/stop",
                "/api/reactions",
                "/api/delete",
                "/api/admin/delete",
            ]:
                try:
                    length = int(environ.get("CONTENT_LENGTH") or 0)
                except ValueError:
                    raise Problem("length", "Некорректный размер запроса.")
                if not 0 < length <= 20000:
                    raise Problem("length", "Слишком большой запрос.", 413)
                if environ.get("CONTENT_TYPE", "").split(";")[0] != "application/json":
                    raise Problem("format", "Ожидается JSON.")
                try:
                    payload = json.loads(environ["wsgi.input"].read(length))
                except (ValueError, UnicodeError):
                    raise Problem("format", "Не удалось прочитать запись.")
                if route in ["/api/delete", "/api/admin/delete"]:
                    return response(
                        self.delete_entry(payload, admin=route == "/api/admin/delete")
                    )
                if route == "/api/reactions":
                    return response(self.react(payload, environ.get("REMOTE_ADDR", "")))
                if route == "/api/phrase/stop":
                    return response(self.stop_phrase(payload))
                if route.endswith("/settings"):
                    return response(self.automod(payload))
                if route.endswith("moderate"):
                    return response(self.moderate(payload))
                return response(
                    self.submit(payload, environ.get("REMOTE_ADDR", "")), 201
                )
            if method != "GET":
                raise Problem("missing", "Не найдено.", 404)
            if route == "/_chat":
                file = self.root / "Инструменты/chat-public.html"
                data = file.read_bytes()
                if (self.root / "publish").is_dir():
                    data = data.replace(
                        b'<base href="https://danyanspage.neocities.org/">', b""
                    )
                return response(data, content_type="text/html; charset=utf-8")
            if route == "/_guestbook":
                return response(
                    (self.root / "Инструменты/guestbook-public.html").read_bytes(),
                    content_type="text/html; charset=utf-8",
                )
            if route == "/_moderation":
                headers.append(
                    (
                        "Content-Security-Policy",
                        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
                    )
                )
                return response(
                    (self.root / "Инструменты/moderation.html").read_bytes(),
                    content_type="text/html; charset=utf-8",
                )
            if route.startswith("/api/"):
                raise Problem("missing", "Не найдено.", 404)
            if not (self.root / "publish").is_dir():
                raise Problem("missing", "Не найдено.", 404)
            public = (self.root / "publish").resolve()
            file = (public / route.lstrip("/")).resolve()
            if route == "/":
                file = public / "index.html"
            if public not in file.parents or not file.is_file() or file.is_symlink():
                return response(
                    (public / "not_found.html").read_bytes(),
                    404,
                    "text/html; charset=utf-8",
                )
            data = file.read_bytes()
            mime = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
            if file.name in ["index.html", "home.html"]:
                data = data.replace(
                    b"<head>", b'<head><script>window.GUESTBOOK_API="/api";</script>', 1
                )
            return response(data, content_type=mime)
        except Problem as error:
            return response(
                {"error": error.code, "message": error.message}, error.status
            )
        except Exception:
            return response(
                {
                    "error": "server",
                    "message": "Не удалось выполнить запрос. Попробуй позже.",
                },
                500,
            )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8768)
    args = parser.parse_args()
    app = Guestbook()
    print("Сайт: http://127.0.0.1:" + str(args.port), flush=True)
    print("Модерация: http://127.0.0.1:" + str(args.port) + "/_moderation", flush=True)
    print(
        "Ключ модератора находится в .private/guestbook-admin-key.txt (не публиковать).",
        flush=True,
    )

    # Пять мест в очереди кончились от двух вкладок. Ну охуеть, вот и вся нагрузка.
    class LocalServer(ThreadingMixIn, WSGIServer):
        daemon_threads = True
        request_queue_size = 32

    class QuietHandler(WSGIRequestHandler):
        def log_message(self, format, *args):
            pass

    with make_server(
        "127.0.0.1",
        args.port,
        app,
        server_class=LocalServer,
        handler_class=QuietHandler,
    ) as server:
        server.serve_forever()

# Без постоянной папки для базы дальше не запускаюсь.
"""Точка входа WSGI. HTTPS снаружи, данные на постоянном диске."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "Инструменты"))
from guestbook_server import Guestbook

if not os.environ.get("GUESTBOOK_DATA_DIR"):
    raise RuntimeError("Set GUESTBOOK_DATA_DIR to a persistent private directory.")
if not os.environ.get("GUESTBOOK_ALLOWED_ORIGINS"):
    raise RuntimeError("Set GUESTBOOK_ALLOWED_ORIGINS to the exact website origin.")
application = Guestbook(root=ROOT)

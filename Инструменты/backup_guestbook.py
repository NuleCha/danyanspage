# Ключ не бэкаплю вместе с базой. Саму базу копирую средствами SQLite.
"""Согласованная копия SQLite без ключа модератора."""
from contextlib import closing
import argparse
from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3

parser = argparse.ArgumentParser()
parser.add_argument(
    "--data",
    default=os.getenv(
        "GUESTBOOK_DATA_DIR", str(Path(__file__).resolve().parent.parent / ".private")
    ),
)
parser.add_argument("--output", required=True)
args = parser.parse_args()
source = Path(args.data) / "guestbook.sqlite3"
if not source.is_file():
    parser.error("Guestbook database not found.")
folder = Path(args.output)
folder.mkdir(parents=True, exist_ok=True)
target = folder / (
    "guestbook-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f") + ".sqlite3"
)
with closing(
    sqlite3.connect(source.resolve().as_uri() + "?mode=ro", uri=True)
) as original:
    with closing(sqlite3.connect(target)) as backup:
        # У sqlite3 есть backup(). Живую базу обычным copy дёргать не буду:
        # https://github.com/python/cpython/blob/v3.11.0/Modules/_sqlite/connection.c
        original.backup(backup)
print("Backup saved:", target)

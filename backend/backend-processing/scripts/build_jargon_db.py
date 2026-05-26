"""
build_jargon_db.py - Build the jargon SQLite database from JSON source files.

Run from the backend-processing directory:
    python scripts/build_jargon_db.py

Reads:
    data/jargon/ahrq_plain_language.json
    data/jargon/michigan_medical_dictionary.json
    data/jargon/abbreviations.json

Writes:
    data/jargon/jargon.sqlite
"""

import json
import logging
import os
import sqlite3
import sys
import unicodedata

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "jargon")
DB_PATH = os.path.join(DATA_DIR, "jargon.sqlite")


def normalize(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().split())


def create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS plain_language_terms;
        DROP TABLE IF EXISTS medical_terms;
        DROP TABLE IF EXISTS abbreviation_terms;

        CREATE TABLE plain_language_terms (
            id               INTEGER PRIMARY KEY,
            source           TEXT NOT NULL,
            term             TEXT NOT NULL,
            normalized_term  TEXT NOT NULL,
            replacements_json TEXT,
            notes            TEXT
        );

        CREATE TABLE medical_terms (
            id               INTEGER PRIMARY KEY,
            source           TEXT NOT NULL,
            term             TEXT NOT NULL,
            normalized_term  TEXT NOT NULL,
            definition       TEXT,
            preserve_default INTEGER DEFAULT 1
        );

        CREATE TABLE abbreviation_terms (
            id                      INTEGER PRIMARY KEY,
            abbreviation            TEXT NOT NULL,
            normalized_abbreviation TEXT NOT NULL,
            expansion               TEXT NOT NULL,
            source                  TEXT NOT NULL
        );

        CREATE INDEX idx_plt_normalized ON plain_language_terms(normalized_term);
        CREATE INDEX idx_mt_normalized  ON medical_terms(normalized_term);
        CREATE INDEX idx_at_normalized  ON abbreviation_terms(normalized_abbreviation);
    """
    )
    logger.info("Schema created.")


def load_ahrq(conn: sqlite3.Connection) -> int:
    path = os.path.join(DATA_DIR, "ahrq_plain_language.json")
    with open(path, encoding="utf-8") as f:
        records = json.load(f)

    rows = [
        (
            r["source"],
            r["term"],
            normalize(r["term"]),
            json.dumps([r["replacement"]]),
            r.get("notes", ""),
        )
        for r in records
    ]
    conn.executemany(
        "INSERT INTO plain_language_terms (source, term, normalized_term, replacements_json, notes) "
        "VALUES (?, ?, ?, ?, ?)",
        rows,
    )
    logger.info("Loaded %d AHRQ terms.", len(rows))
    return len(rows)


def load_michigan(conn: sqlite3.Connection) -> int:
    path = os.path.join(DATA_DIR, "michigan_medical_dictionary.json")
    with open(path, encoding="utf-8") as f:
        records = json.load(f)

    rows = [
        (
            r["source"],
            r["term"],
            normalize(r["term"]),
            r["definition"],
            1,
        )
        for r in records
    ]
    conn.executemany(
        "INSERT INTO medical_terms (source, term, normalized_term, definition, preserve_default) "
        "VALUES (?, ?, ?, ?, ?)",
        rows,
    )
    logger.info("Loaded %d Michigan medical terms.", len(rows))
    return len(rows)


def load_abbreviations(conn: sqlite3.Connection) -> int:
    path = os.path.join(DATA_DIR, "abbreviations.json")
    with open(path, encoding="utf-8") as f:
        abbrev_map: dict[str, str] = json.load(f)

    rows = [
        (abbrev, normalize(abbrev), expansion, "local_abbreviation_map")
        for abbrev, expansion in abbrev_map.items()
    ]
    conn.executemany(
        "INSERT INTO abbreviation_terms (abbreviation, normalized_abbreviation, expansion, source) "
        "VALUES (?, ?, ?, ?)",
        rows,
    )
    logger.info("Loaded %d abbreviations.", len(rows))
    return len(rows)


def build() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        logger.info("Removed old jargon.sqlite.")

    conn = sqlite3.connect(DB_PATH)
    try:
        create_schema(conn)
        load_ahrq(conn)
        load_michigan(conn)
        load_abbreviations(conn)
        conn.commit()
        logger.info("jargon.sqlite written to %s", DB_PATH)
    finally:
        conn.close()


if __name__ == "__main__":
    build()
    sys.exit(0)

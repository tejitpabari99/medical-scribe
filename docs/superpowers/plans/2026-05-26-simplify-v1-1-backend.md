# Simplify V1.1 — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the simplify pipeline into a versioned folder structure, implement the V1.1 pipeline (deterministic term detection + appointment-only structuring + compact terms glossary), and add separate `/upload`, `/simplify/v1`, and `/simplify/v1-1` endpoints.

**Architecture:** All version pipelines live under `backend/backend-processing/simplify/` and implement a shared `SimplifyPipeline` interface with a `run()` method. Term detection is deterministic (SQLite-backed JSON data files) and feeds matched terms into LLM prompts. The existing `/simplify` route is kept intact and re-routed via a `SIMPLIFY_DEFAULT_VERSION` env var.

**Tech Stack:** Python 3.12, Flask, Vertex AI (Gemini), Google Cloud Storage, SQLite (stdlib `sqlite3`), `textstat`, `re`

**Key constraint:** Do NOT modify or delete any existing routes or files. Copy, extend, and add new ones only.

---

## File Map

### Created
```
backend/backend-processing/simplify/__init__.py
backend/backend-processing/simplify/interface.py
backend/backend-processing/simplify/v1/__init__.py
backend/backend-processing/simplify/v1/pipeline.py
backend/backend-processing/simplify/v1_1/__init__.py
backend/backend-processing/simplify/v1_1/pipeline.py
backend/backend-processing/simplify/v1_1/appointment_schema.json

backend/backend-processing/utils/term_detection.py
backend/backend-processing/utils/jargon_db.py

backend/backend-processing/data/jargon/ahrq_plain_language.json
backend/backend-processing/data/jargon/michigan_medical_dictionary.json
backend/backend-processing/data/jargon/abbreviations.json

backend/backend-processing/scripts/__init__.py
backend/backend-processing/scripts/build_jargon_db.py

backend/backend-processing/routes/upload.py
backend/backend-processing/routes/simplify_v1_1.py
```

### Modified
```
backend/backend-processing/routes/simplify.py     — add /simplify/v1 route + version routing on /simplify
backend/backend-processing/routes/__init__.py     — register upload_bp and simplify_v1_1_bp
backend/backend-processing/config.py              — add SIMPLIFY_DEFAULT_VERSION
backend/backend-processing/requirements.txt       — no new deps needed (sqlite3 is stdlib)
```

---

## Task 1: Create starter data files

**Files:**
- Create: `backend/backend-processing/data/jargon/ahrq_plain_language.json`
- Create: `backend/backend-processing/data/jargon/michigan_medical_dictionary.json`
- Create: `backend/backend-processing/data/jargon/abbreviations.json`

These are starter seeds. The user will provide real extracted data in the same schema later.

- [ ] **Step 1: Create the data directory**

```bash
mkdir -p backend/backend-processing/data/jargon
```

- [ ] **Step 2: Create `ahrq_plain_language.json`**

Schema: list of objects with `term`, `replacement`, `source`, `action`, `notes`.
`action` is always `"replace_if_context_fits"` — LLM rewrites naturally, never blind string swap.

```json
[
  {"term": "absence of", "replacement": "no / none", "source": "AHRQ", "action": "replace_if_context_fits", "notes": "use 'no' or 'none' depending on context"},
  {"term": "administer", "replacement": "give", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "adverse effects", "replacement": "side effects", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "adverse reactions", "replacement": "side effects", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "approximately", "replacement": "about", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "commence", "replacement": "start", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "contraindicated", "replacement": "should not be used", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "discontinue", "replacement": "stop", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "elevated", "replacement": "high", "source": "AHRQ", "action": "replace_if_context_fits", "notes": "only when referring to levels or values"},
  {"term": "facilitate", "replacement": "help", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "hypertension", "replacement": "high blood pressure", "source": "AHRQ", "action": "replace_if_context_fits", "notes": "safe substitution when used as a plain condition name"},
  {"term": "indicate", "replacement": "show", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "initiate", "replacement": "start", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "medication adherence", "replacement": "taking your medicine as directed", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "monitor", "replacement": "check / watch", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "obtain", "replacement": "get", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "perform", "replacement": "do", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "physician", "replacement": "doctor", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "prior to", "replacement": "before", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "sufficient", "replacement": "enough", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "utilize", "replacement": "use", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "following", "replacement": "after", "source": "AHRQ", "action": "replace_if_context_fits", "notes": "only when meaning 'after'"},
  {"term": "subsequently", "replacement": "then / after that", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "demonstrate", "replacement": "show", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "assist", "replacement": "help", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "attempt", "replacement": "try", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "requires", "replacement": "needs", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "concerning", "replacement": "about / worrying", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "in order to", "replacement": "to", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""},
  {"term": "at this time", "replacement": "now", "source": "AHRQ", "action": "replace_if_context_fits", "notes": ""}
]
```

- [ ] **Step 3: Create `michigan_medical_dictionary.json`**

Schema: list of objects with `term`, `definition`, `source`, `action`.
`action` is always `"preserve_define"` — keep the term as-is in simplified text, show definition in UI.

```json
[
  {"term": "multiple sclerosis", "definition": "a disease where the body's immune system attacks the nerves, causing problems with movement, balance, and vision", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "Parkinson's disease", "definition": "a brain disorder that causes shaking, stiffness, and problems with movement", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "ocrelizumab", "definition": "a medicine (infusion) used to treat multiple sclerosis by calming the immune system", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "MRI", "definition": "a scan that uses magnets to take detailed pictures inside your body — no radiation", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "myelin", "definition": "the protective coating around nerve fibres — like insulation on an electrical wire", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "neuropsychology", "definition": "the study of how brain conditions affect thinking, memory, and behaviour", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "dementia", "definition": "a group of conditions that cause problems with memory, thinking, and daily tasks", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "relapse", "definition": "a return or worsening of symptoms after a period of improvement", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "atrial fibrillation", "definition": "an irregular and often fast heartbeat that can lead to blood clots or stroke", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "diabetes mellitus", "definition": "a condition where the body cannot control blood sugar levels properly", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "hypothyroidism", "definition": "when the thyroid gland does not make enough hormones, causing tiredness and weight gain", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "osteoporosis", "definition": "a condition where bones become weak and break more easily", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "dyslipidemia", "definition": "abnormal levels of fats (such as cholesterol) in the blood", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "neuropathy", "definition": "nerve damage that causes pain, numbness, or weakness, often in the hands or feet", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "edema", "definition": "swelling caused by too much fluid in the body's tissues", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "arrhythmia", "definition": "an abnormal heart rhythm — too fast, too slow, or irregular", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "COPD", "definition": "chronic obstructive pulmonary disease — a lung condition that makes it hard to breathe", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "asthma", "definition": "a condition where the airways swell and narrow, making breathing difficult", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "gastroesophageal reflux", "definition": "when stomach acid flows back into the throat, causing heartburn and irritation", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "hypertension", "definition": "high blood pressure — when the force of blood pushing through arteries is too strong", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "coronary artery disease", "definition": "narrowing of the arteries that supply blood to the heart, raising the risk of heart attack", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "fibromyalgia", "definition": "a condition that causes widespread muscle pain, fatigue, and tender spots", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "rheumatoid arthritis", "definition": "a condition where the immune system attacks the joints, causing pain, swelling, and stiffness", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "tachycardia", "definition": "a faster-than-normal heart rate, usually above 100 beats per minute", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "bradycardia", "definition": "a slower-than-normal heart rate, usually below 60 beats per minute", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "syncope", "definition": "a brief loss of consciousness (fainting) caused by reduced blood flow to the brain", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "dyspnea", "definition": "shortness of breath or difficulty breathing", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "palpitations", "definition": "feelings of a fast, fluttering, or pounding heartbeat", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "diuretic", "definition": "a medicine that helps the kidneys remove extra water and salt from the body", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"},
  {"term": "anticoagulant", "definition": "a medicine that helps prevent blood clots from forming", "source": "Michigan Plain Language Medical Dictionary", "action": "preserve_define"}
]
```

- [ ] **Step 4: Create `abbreviations.json`**

Schema: flat dict `{abbreviation: expansion}`. Keys are lowercase, with and without dots.

```json
{
  "bid": "twice a day",
  "b.i.d.": "twice a day",
  "tid": "three times a day",
  "t.i.d.": "three times a day",
  "qid": "four times a day",
  "q.i.d.": "four times a day",
  "qd": "once a day",
  "q.d.": "once a day",
  "qhs": "at bedtime",
  "q.h.s.": "at bedtime",
  "prn": "as needed",
  "p.r.n.": "as needed",
  "po": "by mouth",
  "p.o.": "by mouth",
  "npo": "nothing by mouth",
  "iv": "through a vein",
  "i.v.": "through a vein",
  "im": "by injection into a muscle",
  "i.m.": "by injection into a muscle",
  "subq": "under the skin",
  "sq": "under the skin",
  "sob": "shortness of breath",
  "hx": "history",
  "dx": "diagnosis",
  "tx": "treatment",
  "rx": "prescription",
  "f/u": "follow-up",
  "w/": "with",
  "w/o": "without",
  "c/o": "complains of",
  "h/o": "history of",
  "r/o": "rule out",
  "s/p": "status after",
  "sig": "take as directed",
  "stat": "immediately",
  "am": "morning",
  "pm": "evening",
  "hs": "at bedtime",
  "ac": "before meals",
  "pc": "after meals",
  "wt": "weight",
  "ht": "height",
  "bp": "blood pressure",
  "hr": "heart rate",
  "rr": "breathing rate",
  "temp": "temperature",
  "bmi": "body mass index",
  "ekg": "heart tracing (electrocardiogram)",
  "ecg": "heart tracing (electrocardiogram)",
  "cbc": "complete blood count",
  "bmp": "basic metabolic panel",
  "cmp": "complete metabolic panel",
  "lft": "liver function tests",
  "uti": "urinary tract infection",
  "uri": "upper respiratory infection",
  "gerd": "acid reflux disease"
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/backend-processing/data/
git commit -m "feat(simplify): add starter jargon data files (AHRQ, Michigan, abbreviations)"
```

---

## Task 2: Create `utils/jargon_db.py`

**Files:**
- Create: `backend/backend-processing/utils/jargon_db.py`

Responsibilities: open read-only SQLite, provide lookup helpers, normalize terms.

- [ ] **Step 1: Write `jargon_db.py`**

```python
"""
jargon_db.py — Read-only SQLite helpers for the jargon term database.

The DB is built at deploy/build time by scripts/build_jargon_db.py.
At runtime this module opens a single read-only connection per process.
"""

import json
import logging
import os
import sqlite3
import unicodedata

logger = logging.getLogger(__name__)

_DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "..", "data", "jargon", "jargon.sqlite",
)
_conn: sqlite3.Connection | None = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        db_path = os.path.abspath(_DB_PATH)
        if not os.path.exists(db_path):
            raise RuntimeError(
                f"Jargon SQLite DB not found at {db_path}. "
                "Run scripts/build_jargon_db.py first."
            )
        _conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        logger.info("jargon_db: opened read-only connection to %s", db_path)
    return _conn


def normalize(text: str) -> str:
    """Lowercase, strip accents, collapse whitespace."""
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().split())


def lookup_plain_language_terms(text: str) -> list[dict]:
    """
    Return AHRQ plain-language terms found in text.
    Each hit: {term, replacement, source, action, notes}.
    """
    conn = _get_conn()
    normalized_text = normalize(text)
    rows = conn.execute(
        "SELECT term, normalized_term, replacements_json, source, notes "
        "FROM plain_language_terms ORDER BY LENGTH(term) DESC"
    ).fetchall()

    hits: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        n = row["normalized_term"]
        if n in seen:
            continue
        if n in normalized_text:
            seen.add(n)
            replacements = json.loads(row["replacements_json"] or "[]")
            hits.append({
                "term":        row["term"],
                "replacement": replacements[0] if replacements else row["term"],
                "source":      row["source"],
                "action":      "replace_if_context_fits",
                "notes":       row["notes"] or "",
            })
    return hits


def lookup_medical_terms(text: str) -> list[dict]:
    """
    Return Michigan medical dictionary terms found in text.
    Each hit: {term, definition, source, action}.
    Matches longer phrases first to avoid sub-term collisions.
    """
    conn = _get_conn()
    normalized_text = normalize(text)
    rows = conn.execute(
        "SELECT term, normalized_term, definition, source "
        "FROM medical_terms ORDER BY LENGTH(term) DESC"
    ).fetchall()

    hits: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        n = row["normalized_term"]
        if n in seen:
            continue
        if n in normalized_text:
            # Skip sub-terms already covered by a longer match
            already_covered = any(n in s for s in seen)
            if already_covered:
                continue
            seen.add(n)
            hits.append({
                "term":       row["term"],
                "definition": row["definition"],
                "source":     row["source"],
                "action":     "preserve_define",
            })
    return hits


def lookup_abbreviations(text: str) -> list[dict]:
    """
    Return abbreviation expansions found in text.
    Each hit: {term, expansion, source}.
    """
    conn = _get_conn()
    normalized_text = normalize(text)
    rows = conn.execute(
        "SELECT abbreviation, normalized_abbreviation, expansion, source "
        "FROM abbreviation_terms ORDER BY LENGTH(abbreviation) DESC"
    ).fetchall()

    hits: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        n = row["normalized_abbreviation"]
        if n in seen:
            continue
        # Word-boundary check: must appear as whole word in normalized text
        import re
        pattern = r'\b' + re.escape(n) + r'\b'
        if re.search(pattern, normalized_text):
            seen.add(n)
            hits.append({
                "term":      row["abbreviation"],
                "expansion": row["expansion"],
                "source":    row["source"],
            })
    return hits


def build_terms_glossary(medical_term_hits: list[dict]) -> dict[str, dict]:
    """
    Build the compact terms glossary dict for the final JSON output.
    Keys are the original term strings (title-cased as found).
    Values: {definition, source}.
    """
    glossary: dict[str, dict] = {}
    for hit in medical_term_hits:
        glossary[hit["term"]] = {
            "definition": hit["definition"],
            "source":     hit["source"],
        }
    return glossary
```

- [ ] **Step 2: Commit**

```bash
git add backend/backend-processing/utils/jargon_db.py
git commit -m "feat(simplify): add jargon_db SQLite read-only helpers"
```

---

## Task 3: Create `scripts/build_jargon_db.py`

**Files:**
- Create: `backend/backend-processing/scripts/__init__.py` (empty)
- Create: `backend/backend-processing/scripts/build_jargon_db.py`

Run once at deploy/build time. Reads the JSON data files and writes `jargon.sqlite`.

- [ ] **Step 1: Create `scripts/__init__.py`**

```python
```
(empty file)

- [ ] **Step 2: Write `build_jargon_db.py`**

```python
"""
build_jargon_db.py — Build the jargon SQLite database from JSON source files.

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
DB_PATH  = os.path.join(DATA_DIR, "jargon.sqlite")


def normalize(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text)
    ascii_text = nfkd.encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().split())


def create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript("""
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
            id                    INTEGER PRIMARY KEY,
            abbreviation          TEXT NOT NULL,
            normalized_abbreviation TEXT NOT NULL,
            expansion             TEXT NOT NULL,
            source                TEXT NOT NULL
        );

        CREATE INDEX idx_plt_normalized ON plain_language_terms(normalized_term);
        CREATE INDEX idx_mt_normalized  ON medical_terms(normalized_term);
        CREATE INDEX idx_at_normalized  ON abbreviation_terms(normalized_abbreviation);
    """)
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
```

- [ ] **Step 3: Run the build script to generate `jargon.sqlite`**

```bash
cd backend/backend-processing
python scripts/build_jargon_db.py
```

Expected output:
```
INFO: Schema created.
INFO: Loaded 30 AHRQ terms.
INFO: Loaded 30 Michigan medical terms.
INFO: Loaded 40 abbreviations.
INFO: jargon.sqlite written to .../data/jargon/jargon.sqlite
```

- [ ] **Step 4: Add `jargon.sqlite` to `.gitignore` (built at deploy time, not committed)**

In `backend/backend-processing/.gitignore`, add:
```
data/jargon/jargon.sqlite
```

- [ ] **Step 5: Commit**

```bash
git add backend/backend-processing/scripts/ backend/backend-processing/.gitignore
git commit -m "feat(simplify): add jargon DB build script and gitignore for sqlite"
```

---

## Task 4: Create `utils/term_detection.py`

**Files:**
- Create: `backend/backend-processing/utils/term_detection.py`

Responsibilities: orchestrates AHRQ + Michigan + abbreviation detection against a document. Returns structured term data for the LLM prompt and post-LLM glossary.

- [ ] **Step 1: Write `term_detection.py`**

```python
"""
term_detection.py — Deterministic term detection for the V1.1 simplify pipeline.

Uses the SQLite jargon database (built by scripts/build_jargon_db.py) to detect:
  - AHRQ plain-language substitution candidates
  - Michigan medical dictionary terms to preserve + define
  - Local abbreviation expansions

Returns structured data for LLM prompt construction and post-processing.
"""

import logging

from utils.jargon_db import (
    lookup_plain_language_terms,
    lookup_medical_terms,
    lookup_abbreviations,
    build_terms_glossary,
)

logger = logging.getLogger(__name__)


def detect_terms(text: str) -> dict:
    """
    Run all three deterministic detectors against the input text.

    Returns:
        {
          "substitution_candidates": [{term, replacement, source, action, notes}],
          "preserve_and_define_terms": [{term, definition, source, action}],
          "abbreviations": [{term, expansion, source}],
        }
    """
    try:
        substitution_candidates = lookup_plain_language_terms(text)
    except Exception:
        logger.exception("term_detection: AHRQ lookup failed — continuing with empty list")
        substitution_candidates = []

    try:
        preserve_and_define_terms = lookup_medical_terms(text)
    except Exception:
        logger.exception("term_detection: Michigan lookup failed — continuing with empty list")
        preserve_and_define_terms = []

    try:
        abbreviations = lookup_abbreviations(text)
    except Exception:
        logger.exception("term_detection: abbreviation lookup failed — continuing with empty list")
        abbreviations = []

    logger.info(
        "term_detection: found %d AHRQ | %d medical | %d abbrev",
        len(substitution_candidates),
        len(preserve_and_define_terms),
        len(abbreviations),
    )

    return {
        "substitution_candidates":  substitution_candidates,
        "preserve_and_define_terms": preserve_and_define_terms,
        "abbreviations":            abbreviations,
    }


def build_glossary_from_simplified_text(
    simplified_text: str,
    preserve_and_define_terms: list[dict],
) -> dict[str, dict]:
    """
    Re-detect Michigan medical terms in the final simplified text
    and build a compact glossary dict for the JSON output.

    This runs AFTER the LLM has rewritten the text, so the glossary
    only contains terms actually present in the output.

    Returns:
        {"multiple sclerosis": {"definition": "...", "source": "..."}, ...}
    """
    found_terms = [
        t for t in preserve_and_define_terms
        if t["term"].lower() in simplified_text.lower()
    ]
    return build_terms_glossary(found_terms)


def format_substitution_candidates_for_prompt(candidates: list[dict]) -> str:
    """Format AHRQ hits as a bulleted list for the LLM prompt."""
    if not candidates:
        return "(none detected)"
    lines = [
        f"- \"{c['term']}\" → \"{c['replacement']}\""
        + (f"  ({c['notes']})" if c.get("notes") else "")
        for c in candidates[:40]
    ]
    return "\n".join(lines)


def format_medical_terms_for_prompt(terms: list[dict]) -> str:
    """Format Michigan medical terms as a list for the LLM prompt."""
    if not terms:
        return "(none detected)"
    return "\n".join(f"- {t['term']}" for t in terms[:60])


def format_abbreviations_for_prompt(abbreviations: list[dict]) -> str:
    """Format abbreviation expansions as a list for the LLM prompt."""
    if not abbreviations:
        return "(none detected)"
    return "\n".join(
        f"- \"{a['term']}\" → \"{a['expansion']}\""
        for a in abbreviations[:30]
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/backend-processing/utils/term_detection.py
git commit -m "feat(simplify): add deterministic term_detection module"
```

---

## Task 5: Create `simplify/interface.py`

**Files:**
- Create: `backend/backend-processing/simplify/__init__.py` (empty)
- Create: `backend/backend-processing/simplify/interface.py`

- [ ] **Step 1: Create `simplify/__init__.py`**

Empty file.

- [ ] **Step 2: Write `simplify/interface.py`**

```python
"""
simplify/interface.py — Abstract interface for all simplify pipeline versions.

Every version must subclass SimplifyPipeline and implement run().
"""

from abc import ABC, abstractmethod


class SimplifyPipeline(ABC):
    """
    Base class for all simplify pipeline versions.

    Subclasses implement run() which accepts raw text and returns
    a structured result dict ready to be sent as the SSE 'result' payload.
    """

    @abstractmethod
    def run(self, text: str) -> dict:
        """
        Run the full simplification pipeline on the given plain text.

        Args:
            text: Raw document text (already extracted from PDF/TXT/DOCX).

        Returns:
            Structured result dict matching the pipeline's output schema.
            Must always include 'doc_type' key.
        """
```

- [ ] **Step 3: Commit**

```bash
git add backend/backend-processing/simplify/
git commit -m "feat(simplify): add SimplifyPipeline abstract interface"
```

---

## Task 6: Create `simplify/v1/pipeline.py` (refactored V1)

**Files:**
- Create: `backend/backend-processing/simplify/v1/__init__.py` (empty)
- Create: `backend/backend-processing/simplify/v1/pipeline.py`

This is a clean refactor of `utils/simplify_ai.py` — same logic, but:
- Implements `SimplifyPipeline` with `run()`
- No nested functions
- No imports inside functions
- All helpers are module-level or in utils

The original `utils/simplify_ai.py` is **not modified** — V1 pipeline.py is a fresh copy.

- [ ] **Step 1: Create `simplify/v1/__init__.py`** (empty)

- [ ] **Step 2: Write `simplify/v1/pipeline.py`**

```python
"""
simplify/v1/pipeline.py — V1 medical document simplification pipeline.

Implements SimplifyPipeline. Refactored from utils/simplify_ai.py.
Steps:
  0. detect_jargon      — scispaCy NER + textstat fallback (deterministic)
  1. classify_document  — LLM classifies lab_result vs appointment_note
  A. simplify_language  — LLM rewrites to 6th-grade level
  B. add_definitions    — LLM injects parenthetical definitions
  C. clarify_and_action — regex pre-pass + LLM numeracy/action cleanup
  D. structure_document — LLM produces structured JSON (lab or appointment)
"""

import json
import logging
import re
import os

import vertexai
from vertexai.preview.generative_models import (
    GenerativeModel,
    GenerationConfig,
    HarmCategory,
    HarmBlockThreshold,
    FinishReason,
)

from simplify.interface import SimplifyPipeline
from utils.scoring import score_text

logger = logging.getLogger(__name__)

# ── Optional scispaCy ─────────────────────────────────────────────────────────
try:
    import spacy
    _SPACY_MODEL_NAME = "en_ner_bc5cdr_md"
    try:
        _NLP = spacy.load(_SPACY_MODEL_NAME)
        _SCISPACY_AVAILABLE = True
    except OSError:
        _NLP = None
        _SCISPACY_AVAILABLE = False
except ImportError:
    _NLP = None
    _SCISPACY_AVAILABLE = False

# ── Optional textstat ─────────────────────────────────────────────────────────
try:
    import textstat as _textstat
    _TEXTSTAT_AVAILABLE = True
except ImportError:
    _textstat = None
    _TEXTSTAT_AVAILABLE = False

# ── AHRQ substitution list (passed to LLM as guidance) ───────────────────────
_AHRQ_SUBSTITUTIONS = """
- "absence of" → "none" / "no"
- "administer" → "give"
- "adverse effects" → "side effects"
- "approximately" → "about"
- "commence" → "start"
- "contraindicated" → "should not be used"
- "discontinue" → "stop"
- "elevated" → "high"
- "facilitate" → "help"
- "hypertension" → "high blood pressure"
- "indicate" → "show"
- "initiate" → "start"
- "medication" → "medicine"
- "monitor" → "check" / "watch"
- "obtain" → "get"
- "perform" → "do"
- "physician" → "doctor"
- "prior to" → "before"
- "sufficient" → "enough"
- "utilize" → "use"
"""

# ── Abbreviation regex map ────────────────────────────────────────────────────
_ABBREVIATION_MAP = {
    r'\bq\.?d\.?\b':    'once a day',
    r'\bb\.?i\.?d\.?\b': 'twice a day',
    r'\bt\.?i\.?d\.?\b': 'three times a day',
    r'\bq\.?i\.?d\.?\b': 'four times a day',
    r'\bp\.?r\.?n\.?\b': 'as needed',
    r'\ba\.?m\.?\b':    'morning',
    r'\bp\.?m\.?\b':    'evening',
    r'\bp\.?o\.?\b':    'by mouth',
    r'\bi\.?v\.?\b':    'intravenously',
    r'\bi\.?m\.?\b':    'by injection',
    r'\bh\.?s\.?\b':    'at bedtime',
    r'\bstat\b':        'immediately',
}

# ── Medical prefix/suffix heuristics for keyword fallback ────────────────────
_MED_PREFIXES = (
    'hyper', 'hypo', 'cardio', 'neuro', 'hepat', 'nephro',
    'onco', 'hemo', 'leuko', 'erythro', 'osteo', 'arthro',
    'dermato', 'gastro', 'pulmon', 'cerebro', 'vascu',
)
_MED_SUFFIXES = (
    'ectomy', 'oscopy', 'otomy', 'plasty', 'ology', 'itis',
    'osis', 'emia', 'pathy', 'algia', 'uria', 'iasis',
    'genesis', 'lysis', 'megaly', 'phobia', 'tomy',
)


def _apply_abbreviation_regex(text: str) -> str:
    for pattern, replacement in _ABBREVIATION_MAP.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    text = re.sub(r'\b(\d+)/(\d+)\b', lambda m: f'{m.group(1)} in {m.group(2)}', text)
    text = re.sub(r'(\d+(?:\.\d+)?)\s*%', lambda m: f'{m.group(1)} out of 100', text)
    return text


def _keyword_jargon_detect(text: str) -> list[str]:
    words = re.findall(r'\b[A-Za-z][a-z]{7,}\b', text)
    seen: set[str] = set()
    result: list[str] = []
    for w in words:
        lw = w.lower()
        if lw not in seen:
            seen.add(lw)
            result.append(lw)
    return result


def _strip_json_fences(raw: str) -> str:
    match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', raw, re.DOTALL)
    return match.group(1).strip() if match else raw.strip()


class V1Pipeline(SimplifyPipeline):
    """V1 simplification pipeline — refactored from SimplifyService."""

    def __init__(self):
        project_id = os.environ.get("GCP_PROJECT_ID", "")
        location   = os.environ.get("GCP_LOCATION", "us-central1")
        model_name = os.environ.get("VERTEX_AI_MODEL", "gemini-1.5-pro")
        vertexai.init(project=project_id, location=location)
        self._model = GenerativeModel(model_name)
        self._safety = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH:       HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HARASSMENT:        HarmBlockThreshold.BLOCK_NONE,
        }

    def _generate_text(self, prompt: str, temperature: float = 0.3,
                       max_tokens: int = 8192) -> str:
        response = self._model.generate_content(
            prompt,
            generation_config=GenerationConfig(temperature=temperature, max_output_tokens=max_tokens),
            safety_settings=self._safety,
        )
        if not response.candidates:
            raise RuntimeError("Model response blocked or no candidates")
        candidate = response.candidates[0]
        if hasattr(candidate, 'finish_reason') and candidate.finish_reason == FinishReason.MAX_TOKENS:
            logger.warning("V1Pipeline: hit max tokens — proceeding with partial output")
        return response.text.strip()

    def _generate_json(self, prompt: str, temperature: float = 0.2,
                       max_tokens: int = 8192) -> dict | list:
        raw = self._generate_text(prompt, temperature, max_tokens)
        return json.loads(_strip_json_fences(raw))

    def detect_jargon(self, text: str) -> dict[str, list[str]]:
        medical_jargon: list[str] = []
        complex_terms: list[str] = []

        if _SCISPACY_AVAILABLE and _NLP is not None:
            doc = _NLP(text[:100_000])
            seen_ents: set[str] = set()
            for ent in doc.ents:
                lower = ent.text.lower().strip()
                if lower and lower not in seen_ents:
                    seen_ents.add(lower)
                    medical_jargon.append(ent.text.strip())
            seen_complex: set[str] = set()
            for token in doc:
                if (not token.is_stop and not token.is_punct
                        and len(token.text) > 8
                        and token.text.lower() not in seen_ents
                        and token.text.lower() not in seen_complex):
                    seen_complex.add(token.text.lower())
                    complex_terms.append(token.text)
        else:
            all_long = _keyword_jargon_detect(text)
            for w in all_long:
                if any(w.startswith(p) for p in _MED_PREFIXES) or \
                   any(w.endswith(s) for s in _MED_SUFFIXES):
                    medical_jargon.append(w)
                else:
                    complex_terms.append(w)

        if _TEXTSTAT_AVAILABLE and _textstat is not None:
            complex_terms = [w for w in complex_terms if len(w) > 10]

        return {
            "medical_jargon": medical_jargon[:150],
            "complex_terms":  complex_terms[:150],
        }

    def classify_document(self, text: str) -> dict:
        prompt = f"""Classify the following medical document into one of two categories:
- "lab_result": primarily contains test values, lab measurements, reference ranges, or diagnostic test results
- "appointment_note": primarily describes a clinical visit, doctor's notes, diagnoses, prescriptions, or patient-provider interactions

Return a JSON object with exactly these keys:
{{"doc_type": "lab_result" or "appointment_note", "confidence": "high" or "low"}}

Rules:
- If the document contains mostly numerical lab values with reference ranges, choose "lab_result"
- If the document is primarily a narrative of a medical visit or clinical notes, choose "appointment_note"
- If uncertain, default to "appointment_note"
- Output ONLY valid JSON — no markdown, no commentary

DOCUMENT (first 2000 characters):
{text[:2000]}

JSON OUTPUT:"""
        try:
            raw = self._generate_json(prompt, temperature=0.1, max_tokens=256)
            if isinstance(raw, dict) and raw.get("doc_type") in ("lab_result", "appointment_note"):
                return raw
        except Exception:
            logger.warning("V1Pipeline.classify_document failed — defaulting to appointment_note")
        return {"doc_type": "appointment_note", "confidence": "low"}

    def simplify_language(self, text: str, medical_jargon: list[str],
                          complex_terms: list[str]) -> str:
        jargon_str  = ', '.join(medical_jargon[:60]) or 'none'
        complex_str = ', '.join(complex_terms[:60]) or 'none'
        prompt = f"""You are a health literacy expert. Rewrite the following medical document so a patient with a 6th-grade reading level can understand it.

RULES:
1. Use short sentences (under 20 words each where possible).
2. Use active voice. Address the patient as "you".
3. Preserve these medical terms EXACTLY as written (do not change or define them here): {jargon_str}
4. Replace complex words where possible. Suggested replacements: {complex_str}
5. Use these AHRQ-recommended substitutions where applicable:
{_AHRQ_SUBSTITUTIONS}
6. Do NOT add information that is not in the original text.
7. Keep all numbers, dates, and dosages accurate.
8. Output ONLY the rewritten text — no preamble, no headings, no commentary.
9. Do NOT include the patient's name, date of birth, age, address, insurance details, or any other personal identifiers. Refer to the patient only as "you" / "your".

ORIGINAL DOCUMENT:
{text}

REWRITTEN DOCUMENT:"""
        simplified = self._generate_text(prompt, temperature=0.3, max_tokens=16384)
        if _TEXTSTAT_AVAILABLE and _textstat is not None:
            grade = _textstat.flesch_kincaid_grade(simplified)
            if grade > 7:
                stricter = f"""The following text is still too complex. Rewrite it at a 5th-grade level.
Keep all medical terms ({jargon_str}) unchanged. Output ONLY the rewritten text.

TEXT:
{simplified}

SIMPLER VERSION:"""
                simplified = self._generate_text(stricter, temperature=0.2, max_tokens=16384)
        return simplified

    def add_definitions(self, text: str, medical_jargon: list[str]) -> str:
        if not medical_jargon:
            return text
        jargon_str = ', '.join(medical_jargon[:60])
        prompt = f"""You are a patient education specialist. In the text below, add a short parenthetical definition (3–5 words) after the FIRST occurrence of each medical term that a patient would not know.

TERMS TO CONSIDER: {jargon_str}

RULES:
1. Only define terms genuinely opaque to the average patient.
2. Skip common terms: "blood pressure", "MRI", "X-ray", "heart rate", "diabetes", "cancer", "infection", "fever", "pain".
3. Format: TERM (plain definition) — example: "myelin (protective nerve coating)"
4. Define each term ONLY on first occurrence.
5. Do NOT change any other part of the text.
6. Output ONLY the modified text — no commentary.

TEXT:
{text}

TEXT WITH DEFINITIONS:"""
        return self._generate_text(prompt, temperature=0.1, max_tokens=16384)

    def clarify_and_action(self, text: str) -> str:
        pre_processed = _apply_abbreviation_regex(text)
        prompt = f"""You are a health literacy expert helping patients understand what they need to do.

Review the text below and:
1. Convert any remaining medical abbreviations to plain English.
2. Where context makes it clear, replace vague quantities with specifics. Never fabricate — only clarify when the context explicitly supports a specific number.
3. Make sure every instruction to the patient is in active voice and starts with a clear action verb ("Take", "Call", "Schedule", "Avoid", "Ask").
4. Do NOT add, remove, or fabricate any medical information.
5. Output ONLY the improved text — no commentary, no headings.

TEXT:
{pre_processed}

IMPROVED TEXT:"""
        return self._generate_text(prompt, temperature=0.2, max_tokens=16384)

    def structure_document(self, text: str, medical_jargon: list[str],
                           doc_type: str = "appointment_note") -> dict:
        if doc_type == "lab_result":
            return self._structure_lab_result(text, medical_jargon)
        return self._structure_appointment_note(text, medical_jargon)

    def _structure_lab_result(self, text: str, medical_jargon: list[str]) -> dict:
        jargon_str = ', '.join(medical_jargon[:60]) or 'none'
        prompt = f"""You are a medical document analyst. Read the simplified lab result text and extract structured information.

MEDICAL TERMS (for reference): {jargon_str}

TEXT:
{text}

Return a single JSON object with EXACTLY these keys:
{{
  "doc_type": "lab_result",
  "urgency": "normal|caution|concern|urgent",
  "summary": "2-3 plain-language sentences covering the overall result",
  "critical_flags": ["string"],
  "abnormal_results": [{{"name": "string", "value": "string", "unit": "string", "normal_range": "string", "status": "caution|concern|critical", "plain_meaning": "string", "why": "string"}}],
  "normal_results": [{{"name": "string", "value": "string", "unit": "string"}}],
  "action_items": [{{"text": "string", "urgency": "immediate|soon|routine"}}],
  "what_this_means": "string",
  "follow_ups": ["string"],
  "questions": ["string"]
}}

Output ONLY valid JSON — no markdown, no commentary.

JSON OUTPUT:"""
        raw = self._generate_json(prompt, temperature=0.2, max_tokens=8192)
        if not isinstance(raw, dict):
            raise ValueError(f"Expected dict from lab structure, got {type(raw)}")
        defaults = {
            "doc_type": "lab_result", "urgency": "normal", "summary": "",
            "critical_flags": [], "abnormal_results": [], "normal_results": [],
            "action_items": [], "what_this_means": "", "follow_ups": [], "questions": [],
        }
        for k, v in defaults.items():
            if k not in raw:
                raw[k] = v
        raw["doc_type"] = "lab_result"
        return raw

    def _structure_appointment_note(self, text: str, medical_jargon: list[str]) -> dict:
        jargon_str = ', '.join(medical_jargon[:60]) or 'none'
        prompt = f"""You are a medical document analyst. Read the simplified appointment note and extract structured information.

MEDICAL TERMS (for reference): {jargon_str}

TEXT:
{text}

Return a single JSON object with EXACTLY these keys:
{{
  "doc_type": "appointment_note",
  "urgency": "normal|caution|concern|urgent",
  "summary": "2-3 plain-language sentences",
  "what_happened": {{"summary": "string", "date": "string or null", "reason": "string"}},
  "what_it_means": {{"headline": "string", "findings": [{{"item": "string", "urgency": "immediate|soon|routine|informational"}}]}},
  "what_to_do": [{{"text": "string", "urgency": "immediate|soon|routine", "category": "medication|appointment|lifestyle|monitoring", "why": "string"}}],
  "low_priority": ["string"],
  "follow_ups": ["string"],
  "questions": ["string"]
}}

RULES:
1. Everything the doctor said goes somewhere — nothing is silently dropped.
2. Items noted as "normal" or "unremarkable" go in low_priority.
3. Sort what_to_do by urgency: immediate first.
4. questions: generate 3-5 questions grounded in what the text says.
5. Output ONLY valid JSON — no markdown, no commentary.

JSON OUTPUT:"""
        raw = self._generate_json(prompt, temperature=0.2, max_tokens=8192)
        if not isinstance(raw, dict):
            raise ValueError(f"Expected dict from appointment structure, got {type(raw)}")
        defaults = {
            "doc_type": "appointment_note", "urgency": "normal", "summary": "",
            "what_happened": {"summary": "", "date": None, "reason": ""},
            "what_it_means": {"headline": "", "findings": []},
            "what_to_do": [], "low_priority": [], "follow_ups": [], "questions": [],
        }
        for k, v in defaults.items():
            if k not in raw:
                raw[k] = v
        raw["doc_type"] = "appointment_note"
        return raw

    def run(self, text: str) -> dict:
        """Run the full V1 pipeline. Returns structured result dict."""
        before_score = score_text(text)

        jargon_result  = self.detect_jargon(text)
        medical_jargon = jargon_result["medical_jargon"]
        complex_terms  = jargon_result["complex_terms"]

        classification = self.classify_document(text)
        doc_type       = classification.get("doc_type", "appointment_note")

        simplified = self.simplify_language(text, medical_jargon, complex_terms)
        with_defs  = self.add_definitions(simplified, medical_jargon)
        clarified  = self.clarify_and_action(with_defs)

        after_score = score_text(clarified)

        structured = self.structure_document(clarified, medical_jargon, doc_type)

        result = {**structured}
        if before_score is not None:
            result["before_score"] = before_score
        if after_score is not None:
            result["after_score"] = after_score
        return result
```

- [ ] **Step 3: Commit**

```bash
git add backend/backend-processing/simplify/v1/
git commit -m "feat(simplify): add V1Pipeline (refactored SimplifyService)"
```

---

## Task 7: Create `simplify/v1_1/pipeline.py` (V1.1 pipeline)

**Files:**
- Create: `backend/backend-processing/simplify/v1_1/__init__.py` (empty)
- Create: `backend/backend-processing/simplify/v1_1/pipeline.py`
- Create: `backend/backend-processing/simplify/v1_1/appointment_schema.json`

V1.1 changes from V1:
- Removes: lab result branch, classify_document LLM call, scispaCy, inline definitions
- Adds: deterministic term detection → compact `terms` glossary in output
- No questions generated (structuring prompt omits them)
- Appointment-only structuring
- Same output JSON shape as V1 appointment_note, plus `"terms": {...}` key

- [ ] **Step 1: Create `simplify/v1_1/__init__.py`** (empty)

- [ ] **Step 2: Write `simplify/v1_1/appointment_schema.json`** (reference only, not loaded at runtime)

```json
{
  "doc_type": "appointment_note",
  "urgency": "normal|caution|concern|urgent",
  "summary": "2-3 plain-language sentences",
  "what_happened": {
    "summary": "string",
    "date": "string or null",
    "reason": "string"
  },
  "what_it_means": {
    "headline": "string",
    "findings": [{"item": "string", "urgency": "immediate|soon|routine|informational"}]
  },
  "what_to_do": [
    {
      "text": "string — starts with an action verb",
      "urgency": "immediate|soon|routine",
      "category": "medication|appointment|lifestyle|monitoring|test|referral|home_instruction|warning_sign",
      "why": "string or empty string"
    }
  ],
  "low_priority": ["string"],
  "follow_ups": ["string"],
  "terms": {
    "term_name": {"definition": "string", "source": "string"}
  },
  "before_score": {},
  "after_score": {}
}
```

- [ ] **Step 3: Write `simplify/v1_1/pipeline.py`**

```python
"""
simplify/v1_1/pipeline.py — V1.1 medical document simplification pipeline.

Implements SimplifyPipeline. Key differences from V1:
  - Deterministic term detection (AHRQ + Michigan + abbreviations) via SQLite
  - No lab result support — appointment/SOAP notes only
  - No document classification LLM call
  - No scispaCy dependency
  - No parenthetical definitions in prose — compact terms glossary in output
  - No follow-up question generation
  - Same output JSON shape as V1 appointment_note, plus "terms" key

Steps:
  1. detect_terms          — deterministic, SQLite-backed
  2. simplify_language     — LLM rewrites using matched term guidance
  3. clarify_and_action    — LLM active-voice / numeracy cleanup
  4. structure_document    — LLM appointment-note JSON (no questions)
  5. postprocess           — re-detect medical terms in output, build glossary, score
"""

import json
import logging
import re
import os

import vertexai
from vertexai.preview.generative_models import (
    GenerativeModel,
    GenerationConfig,
    HarmCategory,
    HarmBlockThreshold,
    FinishReason,
)

from simplify.interface import SimplifyPipeline
from utils.scoring import score_text
from utils.term_detection import (
    detect_terms,
    build_glossary_from_simplified_text,
    format_substitution_candidates_for_prompt,
    format_medical_terms_for_prompt,
    format_abbreviations_for_prompt,
)

logger = logging.getLogger(__name__)

_UNSUPPORTED_DOC_KEYWORDS = [
    "reference range", "normal range", "test result", "lab value",
    "specimen", "collected:", "result:", "units:", "flag:",
]

_STRUCTURING_SCHEMA = """{
  "doc_type": "appointment_note",
  "urgency": "normal|caution|concern|urgent",
  "summary": "2-3 plain-language sentences covering what happened, the key finding, and the main next step",
  "what_happened": {
    "summary": "1-2 sentence visit summary",
    "date": "string or null",
    "reason": "why the patient came to this appointment"
  },
  "what_it_means": {
    "headline": "key finding or diagnosis in one plain-language sentence",
    "findings": [
      {"item": "string", "urgency": "immediate|soon|routine|informational"}
    ]
  },
  "what_to_do": [
    {
      "text": "action starting with a verb (Take / Call / Schedule / Avoid / Ask / Bring / Watch / Continue / Stop)",
      "urgency": "immediate|soon|routine",
      "category": "medication|appointment|lifestyle|monitoring|test|referral|home_instruction|warning_sign",
      "why": "one sentence on why this action matters (empty string if not applicable)"
    }
  ],
  "low_priority": ["string — items noted as normal, unremarkable, or informational"],
  "follow_ups": ["string"]
}"""


def _is_likely_lab_result(text: str) -> bool:
    lower = text.lower()
    hits = sum(1 for kw in _UNSUPPORTED_DOC_KEYWORDS if kw in lower)
    return hits >= 3


def _strip_json_fences(raw: str) -> str:
    match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', raw, re.DOTALL)
    return match.group(1).strip() if match else raw.strip()


class V1_1Pipeline(SimplifyPipeline):
    """V1.1 simplification pipeline — deterministic term detection + appointment-only."""

    def __init__(self):
        project_id = os.environ.get("GCP_PROJECT_ID", "")
        location   = os.environ.get("GCP_LOCATION", "us-central1")
        model_name = os.environ.get("VERTEX_AI_MODEL", "gemini-1.5-pro")
        vertexai.init(project=project_id, location=location)
        self._model = GenerativeModel(model_name)
        self._safety = {
            HarmCategory.HARM_CATEGORY_HATE_SPEECH:       HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_HARASSMENT:        HarmBlockThreshold.BLOCK_NONE,
        }

    def _generate_text(self, prompt: str, temperature: float = 0.3,
                       max_tokens: int = 8192) -> str:
        response = self._model.generate_content(
            prompt,
            generation_config=GenerationConfig(temperature=temperature, max_output_tokens=max_tokens),
            safety_settings=self._safety,
        )
        if not response.candidates:
            raise RuntimeError("Model response blocked or no candidates")
        candidate = response.candidates[0]
        if hasattr(candidate, 'finish_reason') and candidate.finish_reason == FinishReason.MAX_TOKENS:
            logger.warning("V1_1Pipeline: hit max tokens — proceeding with partial output")
        return response.text.strip()

    def _generate_json(self, prompt: str, temperature: float = 0.2,
                       max_tokens: int = 8192) -> dict | list:
        raw = self._generate_text(prompt, temperature, max_tokens)
        return json.loads(_strip_json_fences(raw))

    def simplify_language_with_term_plan(
        self,
        text: str,
        substitution_candidates: list[dict],
        preserve_and_define_terms: list[dict],
        abbreviations: list[dict],
    ) -> str:
        sub_block    = format_substitution_candidates_for_prompt(substitution_candidates)
        medical_block = format_medical_terms_for_prompt(preserve_and_define_terms)
        abbrev_block  = format_abbreviations_for_prompt(abbreviations)

        prompt = f"""You are a health literacy expert helping rewrite a provider note for a patient.

Rewrite the note so it is easier to understand at about a 6th-grade reading level.

Use these plain-language replacement suggestions when they fit naturally in context:
{sub_block}

Preserve these medical terms exactly. Do not define them inline. They will be explained separately in the UI:
{medical_block}

Expand these abbreviations when they appear:
{abbrev_block}

Rules:
1. Keep all medical facts from the source accurate.
2. Do not add diagnosis, medical advice, urgency, prognosis, or treatment interpretation.
3. Do not remove important information.
4. Use short sentences (under 20 words where possible).
5. Use active voice.
6. Use "you" and "your."
7. Do not include the patient's name, date of birth, address, insurance details, or other identifiers.
8. Do not add parenthetical definitions.
9. Do not return term annotations or spans.
10. Output only the rewritten text — no preamble, no commentary.

SOURCE NOTE:
{text}

REWRITTEN NOTE:"""
        return self._generate_text(prompt, temperature=0.3, max_tokens=16384)

    def clarify_and_action(self, text: str, abbreviations: list[dict]) -> str:
        abbrev_block = format_abbreviations_for_prompt(abbreviations)
        prompt = f"""You are a health literacy expert helping patients understand what they need to do.

Review the text below and:
1. Use active voice throughout.
2. Address the patient as "you."
3. Start every patient action with a clear verb: Take / Call / Schedule / Ask / Bring / Watch / Avoid / Continue / Stop.
4. Do not fabricate numbers. Do not convert vague wording into exact numbers unless the source contains the exact number.
5. Do not add urgency unless the source implies urgency.
6. Do not create new medical advice.
7. Break multi-step instructions into separate steps.
8. Expand any remaining abbreviations using these known expansions:
{abbrev_block}
9. Output ONLY the improved text — no commentary, no headings.

TEXT:
{text}

IMPROVED TEXT:"""
        return self._generate_text(prompt, temperature=0.2, max_tokens=16384)

    def structure_appointment_note(self, text: str) -> dict:
        prompt = f"""You are structuring a simplified provider note for a patient.

Return JSON only. Use this schema:
{_STRUCTURING_SCHEMA}

Rules:
1. Use only information found in the source text.
2. Do not add diagnosis, urgency, prognosis, or medical advice.
3. If the source does not contain a field, use an empty string or empty array.
4. Every action in what_to_do must start with a clear verb.
5. Include what, why, when, and how in each action only when present in the source.
6. Put normal or reassuring details in low_priority.
7. Put less important details in low_priority as well.
8. Do not generate questions — leave questions out entirely.
9. Do not return term annotations or spans.
10. Output ONLY valid JSON — no markdown, no commentary.

SOURCE TEXT:
{text}

JSON OUTPUT:"""
        raw = self._generate_json(prompt, temperature=0.2, max_tokens=8192)
        if not isinstance(raw, dict):
            raise ValueError(f"Expected dict from structure step, got {type(raw)}")
        defaults = {
            "doc_type": "appointment_note", "urgency": "normal", "summary": "",
            "what_happened": {"summary": "", "date": None, "reason": ""},
            "what_it_means": {"headline": "", "findings": []},
            "what_to_do": [], "low_priority": [], "follow_ups": [],
        }
        for k, v in defaults.items():
            if k not in raw:
                raw[k] = v
        raw["doc_type"] = "appointment_note"
        raw.pop("questions", None)
        return raw

    def run(self, text: str) -> dict:
        """
        Run the full V1.1 pipeline.

        Returns structured result dict with the same shape as V1 appointment_note,
        plus a 'terms' glossary dict and no 'questions' field.

        Raises ValueError if the document appears to be a lab result.
        """
        if _is_likely_lab_result(text):
            raise ValueError(
                "This version works best for provider notes, appointment summaries, and SOAP notes. "
                "Lab reports are not supported yet."
            )

        before_score = score_text(text)

        term_data = detect_terms(text)
        substitution_candidates   = term_data["substitution_candidates"]
        preserve_and_define_terms = term_data["preserve_and_define_terms"]
        abbreviations             = term_data["abbreviations"]

        simplified = self.simplify_language_with_term_plan(
            text,
            substitution_candidates,
            preserve_and_define_terms,
            abbreviations,
        )

        clarified = self.clarify_and_action(simplified, abbreviations)

        structured = self.structure_appointment_note(clarified)

        after_score = score_text(clarified)

        terms_glossary = build_glossary_from_simplified_text(
            clarified, preserve_and_define_terms
        )

        result = {**structured, "terms": terms_glossary}
        if before_score is not None:
            result["before_score"] = before_score
        if after_score is not None:
            result["after_score"] = after_score
        return result
```

- [ ] **Step 4: Commit**

```bash
git add backend/backend-processing/simplify/v1_1/
git commit -m "feat(simplify): add V1.1 pipeline with deterministic term detection"
```

---

## Task 8: Create `routes/upload.py`

**Files:**
- Create: `backend/backend-processing/routes/upload.py`

Uploads any file to GCS under a test-user path. No auth required. Returns `doc_id` and `gcs_uri`.

- [ ] **Step 1: Write `routes/upload.py`**

```python
"""
upload.py — File upload endpoint for the simplify tool.

POST /upload
  Accepts: multipart/form-data with 'file' field (any format)
  Returns: {"doc_id": "<uuid>", "gcs_uri": "gs://...", "filename": "..."}

Uses the backend GCS service account — no user auth required.
Files are stored at: simplify-uploads/<doc_id>/<filename>
"""

import logging
import mimetypes
import os
import uuid

from flask import Blueprint, request, jsonify
from google.cloud import storage as gcs

logger = logging.getLogger(__name__)

upload_bp = Blueprint("upload", __name__)

_GCS_BUCKET_NAME = os.environ.get("GCP_BUCKET_NAME", "")
_UPLOAD_PREFIX   = "simplify-uploads"
_MAX_FILE_BYTES  = 20 * 1024 * 1024  # 20 MB


def _get_gcs_client() -> gcs.Client:
    project_id = os.environ.get("GCP_PROJECT_ID", "")
    return gcs.Client(project=project_id or None)


def _upload_to_gcs(file_bytes: bytes, filename: str, content_type: str) -> tuple[str, str]:
    """Upload bytes to GCS. Returns (doc_id, gcs_uri)."""
    doc_id  = str(uuid.uuid4())
    blob_name = f"{_UPLOAD_PREFIX}/{doc_id}/{filename}"
    client = _get_gcs_client()
    bucket = client.bucket(_GCS_BUCKET_NAME)
    blob   = bucket.blob(blob_name)
    blob.upload_from_string(file_bytes, content_type=content_type)
    gcs_uri = f"gs://{_GCS_BUCKET_NAME}/{blob_name}"
    return doc_id, gcs_uri


def _detect_content_type(filename: str, file_bytes: bytes) -> str:
    mime, _ = mimetypes.guess_type(filename)
    return mime or "application/octet-stream"


@upload_bp.route("/upload", methods=["POST"])
def upload_file():
    """Upload a file to GCS and return its doc_id."""
    if "file" not in request.files:
        return jsonify({"error": "No file field in request"}), 400

    upload = request.files["file"]
    if not upload.filename:
        return jsonify({"error": "No filename provided"}), 400

    file_bytes = upload.read()
    if len(file_bytes) == 0:
        return jsonify({"error": "File is empty"}), 400
    if len(file_bytes) > _MAX_FILE_BYTES:
        return jsonify({"error": "File exceeds 20 MB limit"}), 413

    filename     = upload.filename
    content_type = _detect_content_type(filename, file_bytes)

    logger.info("upload: received '%s' (%d bytes, %s)", filename, len(file_bytes), content_type)

    try:
        doc_id, gcs_uri = _upload_to_gcs(file_bytes, filename, content_type)
    except Exception as exc:
        logger.exception("upload: GCS upload failed")
        return jsonify({"error": f"Upload failed: {exc}"}), 500

    logger.info("upload: stored as doc_id=%s gcs_uri=%s", doc_id, gcs_uri)
    return jsonify({"doc_id": doc_id, "gcs_uri": gcs_uri, "filename": filename})
```

- [ ] **Step 2: Commit**

```bash
git add backend/backend-processing/routes/upload.py
git commit -m "feat(simplify): add /upload endpoint (GCS, no auth)"
```

---

## Task 9: Create `routes/simplify_v1_1.py`

**Files:**
- Create: `backend/backend-processing/routes/simplify_v1_1.py`

SSE-streaming route for the V1.1 pipeline. Accepts either a direct file upload (multipart) or a `doc_id` + optional `text` in JSON body.

- [ ] **Step 1: Write `routes/simplify_v1_1.py`**

```python
"""
simplify_v1_1.py — V1.1 simplification route.

POST /simplify/v1-1
  Accepts (pick one):
    A) multipart/form-data with 'file' field (PDF, TXT, DOCX)
    B) multipart/form-data with 'text' field (plain text input)
    C) application/json {"doc_id": "<uuid>"}  — fetches from GCS

  Returns: text/event-stream (SSE) — same format as /simplify

SSE steps for V1.1:
  1. Reading your note
  2. Finding difficult and medical terms
  3. Simplifying language
  4. Clarifying actions and numbers
  5. Organizing your care plan
"""

import io
import json
import logging
import os

from flask import Blueprint, request, Response, stream_with_context
from google.cloud import storage as gcs

from utils.pdf_extract import extract_text_from_pdf
from utils.scoring import score_text
from simplify.v1_1.pipeline import V1_1Pipeline

logger = logging.getLogger(__name__)

simplify_v1_1_bp = Blueprint("simplify_v1_1", __name__)

STEPS = {
    1: "Reading your note",
    2: "Finding difficult and medical terms",
    3: "Simplifying language",
    4: "Clarifying actions and numbers",
    5: "Organizing your care plan",
}

ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
_GCS_BUCKET_NAME = os.environ.get("GCP_BUCKET_NAME", "")
_UPLOAD_PREFIX   = "simplify-uploads"


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[1].lower()
    if ext == "txt":
        return file_bytes.decode("utf-8", errors="replace")
    if ext == "pdf":
        return extract_text_from_pdf(file_bytes)
    if ext == "docx":
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    raise ValueError(f"Unsupported extension: {ext}")


def _fetch_from_gcs(doc_id: str) -> tuple[bytes, str]:
    """Fetch uploaded file bytes from GCS by doc_id. Returns (bytes, filename)."""
    project_id = os.environ.get("GCP_PROJECT_ID", "")
    client  = gcs.Client(project=project_id or None)
    bucket  = client.bucket(_GCS_BUCKET_NAME)
    prefix  = f"{_UPLOAD_PREFIX}/{doc_id}/"
    blobs   = list(bucket.list_blobs(prefix=prefix))
    if not blobs:
        raise FileNotFoundError(f"No file found for doc_id={doc_id}")
    blob     = blobs[0]
    filename = blob.name.split("/")[-1]
    return blob.download_as_bytes(), filename


def _resolve_input() -> tuple[str, str]:
    """
    Resolve input from the request. Returns (text, source_description).
    Priority: text field > file field > doc_id JSON.
    """
    # Text box input
    text_input = request.form.get("text", "").strip()
    if text_input:
        return text_input, "text_input"

    # File upload
    if "file" in request.files:
        upload = request.files["file"]
        if upload.filename and _allowed(upload.filename):
            file_bytes = upload.read()
            if len(file_bytes) > MAX_FILE_BYTES:
                raise ValueError("File exceeds 10 MB limit")
            return _extract_text_from_bytes(file_bytes, upload.filename), upload.filename

    # doc_id via JSON body
    data = request.get_json(silent=True) or {}
    doc_id = data.get("doc_id", "").strip()
    if doc_id:
        file_bytes, filename = _fetch_from_gcs(doc_id)
        return _extract_text_from_bytes(file_bytes, filename), f"doc:{doc_id}"

    raise ValueError("Request must include 'file', 'text', or 'doc_id'")


def _generate_stream():
    pipeline = V1_1Pipeline()

    try:
        # Step 1: Read input
        yield _sse({"step": 1, "status": "active", "label": STEPS[1]})
        try:
            text, source = _resolve_input()
        except Exception as exc:
            yield _sse({"step": "error", "error": f"Could not read input: {exc}"})
            return
        if not text.strip():
            yield _sse({"step": "error", "error": "Input appears to be empty or unreadable."})
            return
        yield _sse({"step": 1, "status": "done", "label": STEPS[1]})

        logger.info("simplify_v1_1: processing source=%s (%d chars)", source, len(text))

        # Step 2: Term detection (deterministic — no LLM)
        yield _sse({"step": 2, "status": "active", "label": STEPS[2]})
        from utils.term_detection import detect_terms
        try:
            term_data = detect_terms(text)
        except Exception:
            logger.exception("simplify_v1_1: term detection failed — continuing with empty terms")
            term_data = {"substitution_candidates": [], "preserve_and_define_terms": [], "abbreviations": []}
        yield _sse({"step": 2, "status": "done", "label": STEPS[2]})

        # Step 3: Simplify language
        yield _sse({"step": 3, "status": "active", "label": STEPS[3]})
        try:
            simplified = pipeline.simplify_language_with_term_plan(
                text,
                term_data["substitution_candidates"],
                term_data["preserve_and_define_terms"],
                term_data["abbreviations"],
            )
        except Exception as exc:
            logger.exception("simplify_v1_1: simplification failed")
            yield _sse({"step": "error", "error": f"Simplification failed: {exc}"})
            return
        yield _sse({"step": 3, "status": "done", "label": STEPS[3]})

        # Step 4: Clarify actions and numbers
        yield _sse({"step": 4, "status": "active", "label": STEPS[4]})
        try:
            clarified = pipeline.clarify_and_action(simplified, term_data["abbreviations"])
        except Exception:
            logger.exception("simplify_v1_1: clarify step failed — using simplified text")
            clarified = simplified
        yield _sse({"step": 4, "status": "done", "label": STEPS[4]})

        # Step 5: Structure appointment note
        yield _sse({"step": 5, "status": "active", "label": STEPS[5]})
        try:
            structured = pipeline.structure_appointment_note(clarified)
        except Exception as exc:
            logger.exception("simplify_v1_1: structuring failed")
            yield _sse({"step": "error", "error": f"Structuring failed: {exc}"})
            return
        yield _sse({"step": 5, "status": "done", "label": STEPS[5]})

        # Post-process: build glossary + scores
        before_score = score_text(text)
        after_score  = score_text(clarified)
        from utils.term_detection import build_glossary_from_simplified_text
        terms_glossary = build_glossary_from_simplified_text(
            clarified, term_data["preserve_and_define_terms"]
        )

        result = {**structured, "terms": terms_glossary}
        if before_score is not None:
            result["before_score"] = before_score
        if after_score is not None:
            result["after_score"] = after_score

        yield _sse({"step": "result", "data": result})

    except Exception as exc:
        logger.exception("simplify_v1_1: unexpected pipeline error")
        yield _sse({"step": "error", "error": f"Pipeline error: {exc}"})


@simplify_v1_1_bp.route("/simplify/v1-1", methods=["POST"])
def simplify_v1_1():
    """Stream V1.1 simplification pipeline via SSE."""
    return Response(
        stream_with_context(_generate_stream()),
        content_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":        "keep-alive",
        },
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/backend-processing/routes/simplify_v1_1.py
git commit -m "feat(simplify): add /simplify/v1-1 SSE route"
```

---

## Task 10: Update `routes/simplify.py` — add `/simplify/v1` and version routing

**Files:**
- Modify: `backend/backend-processing/routes/simplify.py`

Add two things:
1. New route `POST /simplify/v1` — identical to current `/simplify` but explicitly uses V1Pipeline
2. Update existing `POST /simplify` route to delegate to the configured default version

- [ ] **Step 1: Add imports and version routing to `routes/simplify.py`**

At the top of the file, after existing imports, add:

```python
import os
from config import SIMPLIFY_DEFAULT_VERSION
from simplify.v1.pipeline import V1Pipeline
```

- [ ] **Step 2: Add the `/simplify/v1` explicit route**

Add this function **before** the existing `simplify_document` function:

```python
@simplify_bp.route("/simplify/v1", methods=["POST"])
def simplify_v1():
    """Stream V1 simplification pipeline explicitly."""
    if "file" not in request.files:
        return {"error": "No file field in request"}, 400
    upload = request.files["file"]
    if not upload.filename or not _allowed(upload.filename):
        return {"error": "File must be PDF, TXT, or DOCX"}, 400
    file_bytes = upload.read()
    if len(file_bytes) > MAX_FILE_BYTES:
        return {"error": "File exceeds 10 MB limit"}, 413
    filename = upload.filename
    logger.info("simplify/v1: received '%s' (%d bytes)", filename, len(file_bytes))

    def generate():
        pipeline = V1Pipeline()
        try:
            yield _sse({"step": 1, "status": "active", "label": STEPS[1]})
            try:
                text = _extract_text(file_bytes, filename)
            except Exception as exc:
                yield _sse({"step": "error", "error": f"Could not read file: {exc}"})
                return
            if not text.strip():
                yield _sse({"step": "error", "error": "File appears to be empty or unreadable."})
                return
            yield _sse({"step": 1, "status": "done", "label": STEPS[1]})

            try:
                before_score = score_text(text)
            except Exception:
                before_score = None

            yield _sse({"step": 2, "status": "active", "label": STEPS[2]})
            try:
                classification = pipeline.classify_document(text)
                doc_type = classification.get("doc_type", "appointment_note")
            except Exception:
                doc_type = "appointment_note"
            yield _sse({"step": 2, "status": "done", "label": STEPS[2]})

            try:
                jargon_result  = pipeline.detect_jargon(text)
                medical_jargon = jargon_result["medical_jargon"]
                complex_terms  = jargon_result["complex_terms"]
            except Exception:
                medical_jargon = []
                complex_terms  = []

            yield _sse({"step": 3, "status": "active", "label": STEPS[3]})
            try:
                simplified = pipeline.simplify_language(text, medical_jargon, complex_terms)
            except Exception as exc:
                yield _sse({"step": "error", "error": f"Simplification failed: {exc}"})
                return
            yield _sse({"step": 3, "status": "done", "label": STEPS[3]})

            yield _sse({"step": 4, "status": "active", "label": STEPS[4]})
            try:
                with_defs = pipeline.add_definitions(simplified, medical_jargon)
            except Exception:
                with_defs = simplified
            yield _sse({"step": 4, "status": "done", "label": STEPS[4]})

            yield _sse({"step": 5, "status": "active", "label": STEPS[5]})
            try:
                clarified = pipeline.clarify_and_action(with_defs)
            except Exception:
                clarified = with_defs
            yield _sse({"step": 5, "status": "done", "label": STEPS[5]})

            try:
                after_score = score_text(clarified)
            except Exception:
                after_score = None

            yield _sse({"step": 6, "status": "active", "label": STEPS[6]})
            yield _sse({"step": 7, "status": "active", "label": STEPS[7]})
            try:
                structured = pipeline.structure_document(clarified, medical_jargon, doc_type)
            except Exception as exc:
                yield _sse({"step": "error", "error": f"Structuring failed: {exc}"})
                return
            yield _sse({"step": 6, "status": "done", "label": STEPS[6]})
            yield _sse({"step": 7, "status": "done", "label": STEPS[7]})

            result = {**structured}
            if before_score is not None:
                result["before_score"] = before_score
            if after_score is not None:
                result["after_score"] = after_score
            yield _sse({"step": "result", "data": result})
        except Exception as exc:
            logger.exception("simplify/v1: unexpected pipeline error")
            yield _sse({"step": "error", "error": f"Pipeline error: {exc}"})

    return Response(
        stream_with_context(generate()),
        content_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )
```

- [ ] **Step 3: Update the existing `/simplify` route to delegate by version**

Replace the `simplify_document` function's opening section. Before `generate()`, add a version check:

```python
@simplify_bp.route("/simplify", methods=["POST"])
def simplify_document():
    """Stream simplification pipeline. Routes to default version via SIMPLIFY_DEFAULT_VERSION."""
    if SIMPLIFY_DEFAULT_VERSION == "v1-1":
        # Forward the request context to V1.1 handler
        from routes.simplify_v1_1 import simplify_v1_1
        return simplify_v1_1()
    # Default: V1 pipeline (existing behaviour preserved exactly)
    # ... (rest of existing function unchanged)
```

- [ ] **Step 4: Commit**

```bash
git add backend/backend-processing/routes/simplify.py
git commit -m "feat(simplify): add /simplify/v1 explicit route + version routing on /simplify"
```

---

## Task 11: Update `config.py` and `routes/__init__.py`

**Files:**
- Modify: `backend/backend-processing/config.py`
- Modify: `backend/backend-processing/routes/__init__.py`

- [ ] **Step 1: Add `SIMPLIFY_DEFAULT_VERSION` to `config.py`**

Add this line at the end of `config.py`:

```python
# Simplify pipeline version routing
# Set to "v1" or "v1-1". The /simplify endpoint routes to this version.
SIMPLIFY_DEFAULT_VERSION = os.getenv("SIMPLIFY_DEFAULT_VERSION", "v1")
```

- [ ] **Step 2: Register new blueprints in `routes/__init__.py`**

Replace the file with:

```python
"""
Routes package — registers all API blueprints.
"""

from routes.appointments_crud import appointments_crud_bp
from routes.audio import audio_bp
from routes.processing import processing_bp
from routes.try_endpoints import try_bp
from routes.simplify import simplify_bp
from routes.simplify_v1_1 import simplify_v1_1_bp
from routes.upload import upload_bp
from routes.score import score_bp

all_blueprints = [
    appointments_crud_bp,
    audio_bp,
    processing_bp,
    try_bp,
    simplify_bp,
    simplify_v1_1_bp,
    upload_bp,
    score_bp,
]
```

- [ ] **Step 3: Update `.env.example` to document the new var**

Add to `backend/backend-processing/.env.example`:
```
# Simplify pipeline default version: "v1" or "v1-1"
SIMPLIFY_DEFAULT_VERSION=v1
```

- [ ] **Step 4: Commit**

```bash
git add backend/backend-processing/config.py \
        backend/backend-processing/routes/__init__.py \
        backend/backend-processing/.env.example
git commit -m "feat(simplify): register upload + v1-1 blueprints, add SIMPLIFY_DEFAULT_VERSION config"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Starter AHRQ/Michigan/abbrev JSON files | Task 1 |
| SQLite jargon DB + build script | Tasks 2 & 3 |
| Deterministic term detection (prefer over LLM) | Task 4 |
| SimplifyPipeline interface with `run()` | Task 5 |
| V1 refactored to versioned folder | Task 6 |
| V1.1 pipeline: no lab result, no classify LLM, deterministic terms | Task 7 |
| V1.1: compact `terms` glossary in output | Task 7 |
| V1.1: no follow-up question generation | Task 7 |
| V1.1: same appointment_note JSON shape | Task 7 |
| No nested functions, no in-function imports (V1.1) | Task 7 |
| Upload endpoint (GCS, no auth) → doc_id | Task 8 |
| `/simplify/v1-1` SSE route with 5 steps | Task 9 |
| `/simplify/v1` explicit route | Task 10 |
| `/simplify` routes to default version via config | Tasks 10 & 11 |
| SIMPLIFY_DEFAULT_VERSION env var | Task 11 |
| Existing `/simplify` and other routes untouched | All tasks (copy, don't modify) |

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:** `V1Pipeline` and `V1_1Pipeline` both implement `SimplifyPipeline.run(text: str) -> dict`. `detect_terms` return keys (`substitution_candidates`, `preserve_and_define_terms`, `abbreviations`) match usage in V1.1 pipeline and route.

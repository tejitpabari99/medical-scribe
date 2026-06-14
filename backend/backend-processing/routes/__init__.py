"""
Routes package — registers all API blueprints.

Modules:
- services.py          — Shared infrastructure (DB, services, helpers)
- appointments_crud.py — Create, delete, search, health check
- audio.py             — Audio upload, chunking, transcription, finalize
- processing.py        — AI processing, questions, notes, documents
- try_endpoints.py     — Unauthenticated demo endpoints
- simplify.py          — Medical document simplification (SSE streaming)
- simplify_v1_2.py     — Simplify V1.2 simplification endpoint
- score.py             — Patient Accessibility Score (standalone + embedded)
"""

from routes.appointments_crud import appointments_crud_bp
from routes.audio import audio_bp
from routes.processing import processing_bp
from routes.try_endpoints import try_bp
from routes.simplify import simplify_bp
from routes.simplify_v1_1 import simplify_v1_1_bp
from routes.simplify_v1_2 import simplify_v1_2_bp
from routes.upload import upload_bp
from routes.score import score_bp

all_blueprints = [
    appointments_crud_bp,
    audio_bp,
    processing_bp,
    try_bp,
    simplify_bp,
    simplify_v1_1_bp,
    simplify_v1_2_bp,
    upload_bp,
    score_bp,
]

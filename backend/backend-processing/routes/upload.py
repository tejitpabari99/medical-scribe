"""
upload.py - File upload endpoint for the simplify tool.

POST /upload
  Accepts: multipart/form-data with 'file' field (any format)
  Returns: {"doc_id": "<uuid>", "gcs_uri": "gs://...", "filename": "..."}

Uses the backend GCS service account - no user auth required.
Files are stored at: simplify-uploads/<doc_id>/<filename>
"""

import logging
import mimetypes
import os
import uuid

from flask import Blueprint, jsonify, request
from google.cloud import storage as gcs

logger = logging.getLogger(__name__)

upload_bp = Blueprint("upload", __name__)

_GCS_BUCKET_NAME = os.environ.get("GCP_BUCKET_NAME", "")
_UPLOAD_PREFIX = "simplify-uploads"
_MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


def _get_gcs_client() -> gcs.Client:
    project_id = os.environ.get("GCP_PROJECT_ID", "")
    return gcs.Client(project=project_id or None)


def _upload_to_gcs(file_bytes: bytes, filename: str, content_type: str) -> tuple[str, str]:
    """Upload bytes to GCS. Returns (doc_id, gcs_uri)."""
    doc_id = str(uuid.uuid4())
    blob_name = f"{_UPLOAD_PREFIX}/{doc_id}/{filename}"
    client = _get_gcs_client()
    bucket = client.bucket(_GCS_BUCKET_NAME)
    blob = bucket.blob(blob_name)
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

    filename = upload.filename
    content_type = _detect_content_type(filename, file_bytes)

    logger.info("upload: received '%s' (%d bytes, %s)", filename, len(file_bytes), content_type)

    try:
        doc_id, gcs_uri = _upload_to_gcs(file_bytes, filename, content_type)
    except Exception as exc:
        logger.exception("upload: GCS upload failed")
        return jsonify({"error": f"Upload failed: {exc}"}), 500

    logger.info("upload: stored as doc_id=%s gcs_uri=%s", doc_id, gcs_uri)
    return jsonify({"doc_id": doc_id, "gcs_uri": gcs_uri, "filename": filename})

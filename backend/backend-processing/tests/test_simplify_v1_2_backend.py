import json
import py_compile
import sys
import tempfile
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))
V1_2_SCHEMA_PATH = BASE_DIR / "simplify" / "v1_2" / "appointment.schema.json"


def test_simplify_v1_1_stays_old_shape_and_strips_questions():
    pipeline_source = (BASE_DIR / "simplify" / "v1_1" / "pipeline.py").read_text(
        encoding="utf-8"
    )
    route_source = (BASE_DIR / "routes" / "simplify_v1_1.py").read_text(
        encoding="utf-8"
    )

    assert "class V1_1Pipeline" in pipeline_source
    assert '"what_happened"' in pipeline_source
    assert '"what_it_means"' in pipeline_source
    assert '"what_to_do"' in pipeline_source
    assert '"follow_ups"' in pipeline_source
    assert '"version": "1.2"' not in pipeline_source
    assert '"warning_signs"' not in pipeline_source
    assert 'raw.pop("questions", None)' in pipeline_source
    assert 'result.pop("questions", None)' in pipeline_source
    assert 'result.pop("questions", None)' in route_source


def test_simplify_v1_2_structured_output_keeps_questions():
    pipeline_source = (BASE_DIR / "simplify" / "v1_2" / "pipeline.py").read_text(
        encoding="utf-8"
    )
    route_source = (BASE_DIR / "routes" / "simplify_v1_2.py").read_text(
        encoding="utf-8"
    )
    dispatch_source = (BASE_DIR / "routes" / "simplify.py").read_text(encoding="utf-8")
    package_source = (BASE_DIR / "routes" / "__init__.py").read_text(encoding="utf-8")

    assert "class V1_2Pipeline" in pipeline_source
    assert "appointment.schema.json" in pipeline_source
    assert "_STRUCTURING_SCHEMA_PATH" in pipeline_source
    assert 'raw["version"] = "1.2"' in pipeline_source
    assert 'result.pop("questions", None)' not in pipeline_source
    assert '@simplify_v1_2_bp.route("/simplify/v1-2", methods=["POST"])' in route_source
    assert "from simplify.v1_2.pipeline import V1_2Pipeline" in route_source
    assert "pipeline = V1_2Pipeline()" in route_source
    assert 'result.pop("questions", None)' not in route_source
    assert 'if SIMPLIFY_DEFAULT_VERSION == "v1-2":' in dispatch_source
    assert "return simplify_v1_2()" in dispatch_source
    assert 'if SIMPLIFY_DEFAULT_VERSION == "v1-1":' in dispatch_source
    assert "return simplify_v1_1()" in dispatch_source
    assert "from routes.simplify_v1_2 import simplify_v1_2_bp" in package_source
    assert "simplify_v1_2_bp" in package_source


def test_simplify_v1_2_schema_file_is_valid_and_complete():
    assert V1_2_SCHEMA_PATH.exists()

    schema = json.loads(V1_2_SCHEMA_PATH.read_text(encoding="utf-8"))

    assert schema["doc_type"] == "appointment_note"
    assert schema["version"] == "1.2"
    for key in [
        "reason_for_visit",
        "diagnosis",
        "medications",
        "tests",
        "procedures",
        "follow_up",
        "warning_signs",
        "questions",
        "low_priority",
    ]:
        assert key in schema

    assert schema["warning_signs"][0]["what_to_do"]
    assert schema["warning_signs"][0]["urgency"]
    assert len(schema["questions"]) == 3


def test_simplify_backend_sources_compile_without_importing_vertexai():
    paths = [
        "routes/simplify.py",
        "routes/simplify_v1_1.py",
        "routes/simplify_v1_2.py",
        "simplify/v1_1/pipeline.py",
        "simplify/v1_2/pipeline.py",
        "routes/__init__.py",
    ]

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        for path in paths:
            pyc_path = tmp_path / (path.replace("/", "_") + "c")
            py_compile.compile(str(BASE_DIR / path), cfile=str(pyc_path), doraise=True)


if __name__ == "__main__":
    test_simplify_v1_1_stays_old_shape_and_strips_questions()
    test_simplify_v1_2_structured_output_keeps_questions()
    test_simplify_v1_2_schema_file_is_valid_and_complete()
    test_simplify_backend_sources_compile_without_importing_vertexai()
    print("Simplify V1.2 backend validation OK")

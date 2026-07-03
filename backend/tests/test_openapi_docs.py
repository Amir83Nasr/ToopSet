from __future__ import annotations

from app.main import app


def test_all_openapi_operations_have_descriptions() -> None:
    schema = app.openapi()
    missing = [
        f"{method.upper()} {path}"
        for path, methods in schema["paths"].items()
        for method, operation in methods.items()
        if not operation.get("description")
    ]

    assert missing == []

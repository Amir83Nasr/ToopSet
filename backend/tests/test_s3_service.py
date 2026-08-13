"""Unit tests for the split ParsPack S3 and public media configuration."""

from __future__ import annotations

import importlib
from types import SimpleNamespace

import pytest

from app.core import s3_service


@pytest.fixture
def parspack_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        s3_service,
        "settings",
        SimpleNamespace(
            parspack_endpoint_url="http://c228415.parspack.net",
            parspack_public_base_url="https://media.toopset.ir/c228415",
            parspack_access_key="access-key",
            parspack_secret_key=SimpleNamespace(get_secret_value=lambda: "secret-key"),
            parspack_bucket_name="c228415",
        ),
    )


def test_public_url_uses_public_base_not_s3_endpoint(parspack_settings: None) -> None:
    assert s3_service.public_url("vendors/photo.jpg") == (
        "https://media.toopset.ir/c228415/vendors/photo.jpg"
    )


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        (
            "https://media.toopset.ir/c228415/vendors/photo.jpg",
            "vendors/photo.jpg",
        ),
        (
            "https://c228415.parspack.net/c228415/vendors/legacy.jpg",
            "vendors/legacy.jpg",
        ),
        ("https://media.toopset.ir/other/photo.jpg", None),
        ("https://attacker.example/c228415/vendors/photo.jpg", None),
    ],
)
def test_key_from_url_accepts_public_and_legacy_urls_only(
    parspack_settings: None, url: str, expected: str | None
) -> None:
    assert s3_service._key_from_url(url) == expected


@pytest.mark.asyncio
async def test_upload_uses_s3_endpoint_and_returns_public_url(
    parspack_settings: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: dict[str, object] = {}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def put_object(self, **kwargs):
            calls["put_object"] = kwargs

    class FakeSession:
        def client(self, service: str, **kwargs):
            calls["service"] = service
            calls["client"] = kwargs
            return FakeClient()

    monkeypatch.setattr(s3_service, "_session", lambda: FakeSession())
    monkeypatch.setattr(s3_service.uuid, "uuid4", lambda: SimpleNamespace(hex="fixed-id"))

    url = await s3_service.upload_to_s3(
        content=b"image-bytes",
        original_filename="court.JPG",
        content_type="image/jpeg",
    )

    assert calls["service"] == "s3"
    assert calls["client"]["endpoint_url"] == "http://c228415.parspack.net"
    assert calls["put_object"] == {
        "Bucket": "c228415",
        "Key": "vendors/fixed-id.jpg",
        "Body": b"image-bytes",
        "ContentType": "image/jpeg",
    }
    assert url == "https://media.toopset.ir/c228415/vendors/fixed-id.jpg"


@pytest.mark.asyncio
async def test_delete_public_url_uses_internal_s3_endpoint(
    parspack_settings: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: dict[str, object] = {}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def delete_object(self, **kwargs):
            calls["delete_object"] = kwargs

    class FakeSession:
        def client(self, service: str, **kwargs):
            calls["endpoint_url"] = kwargs["endpoint_url"]
            return FakeClient()

    monkeypatch.setattr(s3_service, "_session", lambda: FakeSession())

    deleted = await s3_service.delete_from_s3("https://media.toopset.ir/c228415/vendors/photo.jpg")

    assert deleted is True
    assert calls["endpoint_url"] == "http://c228415.parspack.net"
    assert calls["delete_object"] == {
        "Bucket": "c228415",
        "Key": "vendors/photo.jpg",
    }


@pytest.mark.parametrize(
    ("direction", "old_base", "new_base"),
    [
        (
            "upgrade",
            "https://c228415.parspack.net/c228415",
            "https://media.toopset.ir/c228415",
        ),
        (
            "downgrade",
            "https://media.toopset.ir/c228415",
            "https://c228415.parspack.net/c228415",
        ),
    ],
)
def test_vendor_image_url_migration_replaces_only_matching_prefixes(
    monkeypatch: pytest.MonkeyPatch,
    direction: str,
    old_base: str,
    new_base: str,
) -> None:
    migration = importlib.import_module("migrations.versions.0036_migrate_vendor_image_public_urls")
    calls: list[tuple[object, dict[str, str]]] = []

    class FakeBind:
        def execute(self, statement, parameters):
            calls.append((statement, parameters))

    monkeypatch.setattr(migration.op, "get_bind", lambda: FakeBind())

    getattr(migration, direction)()

    assert len(calls) == 1
    statement, parameters = calls[0]
    assert "UPDATE vendor_images" in str(statement)
    assert parameters == {
        "old_base": old_base,
        "new_base": new_base,
        "old_pattern": f"{old_base}/%",
    }

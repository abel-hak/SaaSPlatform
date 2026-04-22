"""
Upload / MIME validation tests.
Ensures the magic-byte check blocks disguised binary files.
"""
import io
import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

def _register_and_get_headers(client, suffix: str = "") -> dict:
    import uuid
    unique = uuid.uuid4().hex[:8] + suffix
    res = client.post("/auth/register", json={
        "org_name": f"Upload Org {unique}",
        "email": f"upload_{unique}@example.com",
        "password": "StrongPass123!",
    })
    assert res.status_code == 200, res.json()
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def _upload(client, headers: dict, filename: str, content: bytes, content_type: str = "application/octet-stream"):
    return client.post(
        "/documents/upload",
        files={"file": (filename, io.BytesIO(content), content_type)},
        headers=headers,
    )


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_upload_valid_text_file(client):
    headers = _register_and_get_headers(client, "txt")
    res = _upload(client, headers, "notes.txt", b"Hello world, this is a plain text document.")
    assert res.status_code == 202


def test_upload_valid_pdf_accepted(client):
    headers = _register_and_get_headers(client, "pdf")
    # Valid PDF magic bytes
    fake_pdf = b"%PDF-1.4 1 0 obj\n<< /Type /Catalog >>\nendobj\n"
    res = _upload(client, headers, "report.pdf", fake_pdf, "application/pdf")
    assert res.status_code == 202


def test_upload_exe_disguised_as_pdf_is_blocked(client):
    """MZ header (Windows PE) renamed to .pdf must be rejected."""
    headers = _register_and_get_headers(client, "exe")
    exe_content = b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 100
    res = _upload(client, headers, "totally_not_malware.pdf", exe_content, "application/pdf")
    assert res.status_code == 400
    assert "Blocked" in res.json()["detail"]


def test_upload_elf_disguised_as_txt_is_blocked(client):
    """ELF binary renamed to .txt must be rejected."""
    headers = _register_and_get_headers(client, "elf")
    elf_content = b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 100
    res = _upload(client, headers, "readme.txt", elf_content, "text/plain")
    assert res.status_code == 400
    assert "Blocked" in res.json()["detail"]


def test_upload_png_image_is_blocked(client):
    """PNG image renamed to .txt must be rejected."""
    headers = _register_and_get_headers(client, "png")
    png_content = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    res = _upload(client, headers, "image.txt", png_content, "text/plain")
    assert res.status_code == 400


def test_upload_pdf_with_wrong_magic_bytes_is_blocked(client):
    """.pdf extension but content is not a PDF — must be rejected."""
    headers = _register_and_get_headers(client, "fakepdf")
    fake_content = b"This is not a PDF at all, just text"
    res = _upload(client, headers, "doc.pdf", fake_content, "application/pdf")
    assert res.status_code == 400
    assert "valid PDF" in res.json()["detail"]


def test_upload_empty_file_is_rejected(client):
    headers = _register_and_get_headers(client, "empty")
    res = _upload(client, headers, "empty.txt", b"")
    assert res.status_code == 400


def test_upload_disallowed_extension_is_rejected(client):
    headers = _register_and_get_headers(client, "ext")
    res = _upload(client, headers, "virus.exe", b"MZ\x90" + b"\x00" * 50, "application/octet-stream")
    # .exe is not in ALLOWED_EXTENSIONS — should fail at extension check
    assert res.status_code == 400


def test_upload_requires_auth(client):
    res = _upload(client, {}, "notes.txt", b"Hello")
    assert res.status_code == 401

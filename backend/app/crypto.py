"""
AES-128-CBC + HMAC-SHA256 encryption for sensitive fields (Fernet).
Used to encrypt BYOK API keys at rest in the database.

Usage:
    from .crypto import encrypt_field, decrypt_field

    # On write:
    org.ai_api_key = encrypt_field(raw_key)

    # On read:
    raw_key = decrypt_field(org.ai_api_key)
"""

import base64
import logging
import os

from cryptography.fernet import Fernet, InvalidToken

from .config import get_settings

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    """Return a Fernet instance keyed from ENCRYPTION_KEY env var."""
    settings = get_settings()
    raw = settings.encryption_key
    # Fernet requires a 32-byte URL-safe base64-encoded key
    # If provided as a raw 32-byte hex string, encode it; otherwise use as-is
    try:
        key = raw.encode() if isinstance(raw, str) else raw
        return Fernet(key)
    except Exception as exc:
        raise ValueError(
            "ENCRYPTION_KEY must be a valid Fernet key. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        ) from exc


def encrypt_field(value: str) -> str:
    """Encrypt a plaintext string. Returns a base64-encoded ciphertext string."""
    if not value:
        return value
    f = _get_fernet()
    return f.encrypt(value.encode()).decode()


def decrypt_field(value: str | None) -> str | None:
    """Decrypt a Fernet-encrypted string. Returns plaintext or None."""
    if not value:
        return value
    try:
        f = _get_fernet()
        return f.decrypt(value.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt field — possible key rotation or data corruption")
        return None


def generate_key() -> str:
    """Helper to generate a new Fernet key for first-time setup."""
    return Fernet.generate_key().decode()

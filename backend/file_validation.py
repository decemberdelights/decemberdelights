"""Document file validation: extension, declared MIME, and actual file content (magic bytes).

Defence in depth:
- Extension must be in the allow-list.
- Declared Content-Type must match (or be octet-stream).
- First bytes of the file are checked against known magic signatures so a
  renamed malicious file (e.g. a PHP script with a .pdf extension) is rejected
  before it ever touches disk.
"""
import os
from fastapi import HTTPException

DOCUMENT_MIME_TYPES = {
    ".pdf": ("application/pdf", {"application/pdf", "application/x-pdf"}, [b"%PDF"]),
    ".jpg": ("image/jpeg", {"image/jpeg", "image/jpg"}, [b"\xff\xd8\xff"]),
    ".jpeg": ("image/jpeg", {"image/jpeg", "image/jpg"}, [b"\xff\xd8\xff"]),
    ".png": ("image/png", {"image/png"}, [b"\x89PNG\r\n\x1a\n"]),
    ".doc": ("application/msword", {"application/msword"}, [b"\xd0\xcf\x11\xe0"]),
    ".docx": (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
        [b"PK\x03\x04"],  # DOCX is a ZIP container
    ),
}

# Magic bytes shared across multiple types (ZIP-based). For DOCX we additionally
# check the internal entry names below.
_ZIP_MAGIC = b"PK\x03\x04"


def _check_magic_bytes(content: bytes, magic_list: list[bytes]) -> bool:
    """Return True if content starts with any of the given magic signatures."""
    return any(content.startswith(magic) for magic in magic_list)


def _is_valid_docx(content: bytes) -> bool:
    """DOCX files are ZIPs; verify they contain expected word/document.xml entry."""
    if not content.startswith(_ZIP_MAGIC):
        return False
    # Very light check: look for the word/document.xml entry name in the ZIP
    # central directory / local file headers. This catches non-DOCX ZIPs renamed
    # to .docx without fully decompressing.
    needle = b"word/document.xml"
    return needle in content[:65535]  # scan first 64KB for the entry name


def validated_document_content_type(filename: str, declared_content_type: str | None, content: bytes | None = None) -> str:
    extension = os.path.splitext(filename or "")[1].lower()
    file_type = DOCUMENT_MIME_TYPES.get(extension)
    if file_type is None:
        raise HTTPException(status_code=400, detail=f"File type {extension} not allowed")

    canonical_type, accepted_types, magic_list = file_type
    content_type = (declared_content_type or "").split(";", 1)[0].strip().lower()
    if content_type and content_type != "application/octet-stream" and content_type not in accepted_types:
        raise HTTPException(status_code=400, detail=f"File content type {content_type} not allowed")

    # Magic-byte verification when file bytes are provided.
    if content is not None:
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        if extension == ".docx":
            if not _is_valid_docx(content):
                raise HTTPException(status_code=400, detail="File content does not match a valid DOCX document")
        elif not _check_magic_bytes(content, magic_list):
            raise HTTPException(status_code=400, detail="File content does not match its declared type")

    return canonical_type
import os
import sys

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from file_validation import validated_document_content_type
from routers.careers import _is_missing_tracking_code_column


@pytest.mark.parametrize(
    ("filename", "content_type", "expected"),
    [
        ("resume.pdf", "application/pdf", "application/pdf"),
        ("photo.jpg", "image/jpeg", "image/jpeg"),
        ("photo.jpeg", "image/jpg", "image/jpeg"),
        ("photo.jpeg", "application/octet-stream", "image/jpeg"),
        ("photo.png", "image/png", "image/png"),
        ("resume.doc", "application/msword", "application/msword"),
        (
            "resume.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
    ],
)
def test_document_types_are_normalized(filename, content_type, expected):
    assert validated_document_content_type(filename, content_type) == expected


def test_document_type_rejects_unsupported_extension():
    with pytest.raises(HTTPException) as exc_info:
        validated_document_content_type("archive.zip", "application/zip")
    assert exc_info.value.status_code == 400


def test_document_type_rejects_mismatched_mime_type():
    with pytest.raises(HTTPException) as exc_info:
        validated_document_content_type("photo.jpg", "image/png")
    assert exc_info.value.status_code == 400


def test_missing_career_tracking_column_is_detected():
    error = Exception(
        "{'message': \"Could not find the 'tracking_code' column of "
        "'career_applications' in the schema cache\", 'code': 'PGRST204'}"
    )
    assert _is_missing_tracking_code_column(error)


def test_unrelated_schema_errors_do_not_trigger_legacy_retry():
    assert not _is_missing_tracking_code_column(Exception("PGRST204: missing another_column"))

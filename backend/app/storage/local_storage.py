"""Local filesystem storage — implements abstract interface for easy S3 swap later."""
import os
import uuid
import aiofiles
from fastapi import UploadFile
from app.config import settings
from app.core.exceptions import FileTooLargeError, UnsupportedFileTypeError


class LocalStorage:

    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    def _validate(self, file: UploadFile, size: int) -> None:
        if size > settings.max_upload_size_bytes:
            raise FileTooLargeError(settings.MAX_UPLOAD_SIZE_MB)
        mime = file.content_type or ""
        if mime not in settings.allowed_mime_types_list:
            raise UnsupportedFileTypeError(mime)

    async def save(self, file: UploadFile, tenant_id: str) -> tuple[str, int]:
        """
        Save a file and return (storage_key, size_bytes).
        storage_key is the relative path inside upload_dir.
        """
        content = await file.read()
        size = len(content)
        self._validate(file, size)

        ext = os.path.splitext(file.filename or "file")[1]
        filename = f"{uuid.uuid4().hex}{ext}"
        relative_key = f"{tenant_id}/{filename}"
        full_path = os.path.join(self.upload_dir, tenant_id)
        os.makedirs(full_path, exist_ok=True)

        async with aiofiles.open(os.path.join(self.upload_dir, relative_key), "wb") as f:
            await f.write(content)

        return relative_key, size

    async def get_path(self, storage_key: str) -> str:
        """Return the full filesystem path for a storage key."""
        return os.path.join(self.upload_dir, storage_key)

    async def delete(self, storage_key: str) -> None:
        path = os.path.join(self.upload_dir, storage_key)
        if os.path.exists(path):
            os.remove(path)


storage = LocalStorage()

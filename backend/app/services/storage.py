import httpx
import os
import uuid as _uuid

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "internal-resources")


async def upload_file_to_supabase(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Upload bytes to Supabase Storage; return the public URL."""
    unique_name = f"{_uuid.uuid4()}_{filename}"
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{unique_name}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, content=file_bytes)
        resp.raise_for_status()

    public_url = (
        f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{unique_name}"
    )
    return public_url


async def delete_file_from_supabase(file_url: str) -> None:
    """Delete a file from Supabase Storage given its public URL."""
    # Extract path after bucket name
    marker = f"/object/public/{BUCKET}/"
    if marker in file_url:
        path = file_url.split(marker, 1)[1]
        url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}"
        headers = {"Authorization": f"Bearer {SUPABASE_KEY}"}
        async with httpx.AsyncClient() as client:
            await client.delete(url, headers=headers)

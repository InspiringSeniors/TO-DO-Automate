import httpx
import os
import uuid as _uuid
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def _cfg():
    """Read config at call time so .env hot-reloads are always picked up."""
    url    = os.getenv("SUPABASE_URL", "")
    svc    = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "internal-resources")
    return url, svc, bucket


def _extract_error(resp: httpx.Response) -> str:
    try:
        body = resp.json()
        return body.get("message") or body.get("error") or resp.text
    except Exception:
        return resp.text


async def _ensure_bucket(client: httpx.AsyncClient, url: str, svc: str, bucket: str) -> None:
    """Create the storage bucket if it does not exist yet (requires service role key)."""
    svc_headers = {
        "Authorization": f"Bearer {svc}",
        "Content-Type": "application/json",
    }
    check_resp = await client.get(f"{url}/storage/v1/bucket/{bucket}", headers=svc_headers)
    if check_resp.status_code == 200:
        return  # bucket already exists

    create_resp = await client.post(
        f"{url}/storage/v1/bucket",
        headers=svc_headers,
        json={"id": bucket, "name": bucket, "public": True},
    )
    if create_resp.status_code not in (200, 201):
        detail = _extract_error(create_resp)
        logger.error(f"[Storage] Could not create bucket '{bucket}': {detail}")
        raise HTTPException(
            status_code=503,
            detail=(
                f"Supabase Storage bucket '{bucket}' does not exist and could not be auto-created. "
                f"Fix: Add SUPABASE_SERVICE_KEY to backend/.env "
                f"(Supabase Dashboard → Project Settings → API → service_role key). "
                f"Supabase error: {detail}"
            ),
        )
    logger.info(f"[Storage] Bucket '{bucket}' created automatically.")


async def upload_file_to_supabase(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Upload bytes to Supabase Storage; return the public URL."""
    url, svc, bucket = _cfg()
    if not url or not svc:
        raise HTTPException(
            status_code=503,
            detail="Supabase Storage is not configured (missing SUPABASE_URL or SUPABASE_SERVICE_KEY)."
        )

    unique_name = f"{_uuid.uuid4()}_{filename}"
    upload_url  = f"{url}/storage/v1/object/{bucket}/{unique_name}"
    headers = {
        "Authorization": f"Bearer {svc}",
        "Content-Type": content_type,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        await _ensure_bucket(client, url, svc, bucket)
        resp = await client.post(upload_url, headers=headers, content=file_bytes)
        if not resp.is_success:
            detail = _extract_error(resp)
            logger.error(f"[Storage] Upload failed ({resp.status_code}): {detail}")
            raise HTTPException(status_code=502, detail=f"File upload to Supabase failed: {detail}")

    return f"{url}/storage/v1/object/public/{bucket}/{unique_name}"


async def delete_file_from_supabase(file_url: str) -> None:
    """Delete a file from Supabase Storage given its public URL."""
    url, svc, bucket = _cfg()
    marker = f"/object/public/{bucket}/"
    if marker in file_url:
        path      = file_url.split(marker, 1)[1]
        delete_url = f"{url}/storage/v1/object/{bucket}/{path}"
        headers   = {"Authorization": f"Bearer {svc}"}
        async with httpx.AsyncClient() as client:
            await client.delete(delete_url, headers=headers)

import json
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings as cfg
from .models import Notification, PaperVersion, Setting, User

JSON_KEYS = {"objectives", "guidelines", "registration_fees"}
BOOL_KEYS = {"submissions_open"}
SETTING_KEYS = {
    "conference_name", "full_name", "subtitle", "tagline", "start_date", "end_date", "venue",
    "organizer", "institution_name", "about_conference", "about_institution", "contact_email",
    "contact_phone", "contact_address", "submission_deadline", "submissions_open",
    "objectives", "guidelines", "registration_fees", "registration_link", "submission_email", "publication_note",
    "contact_person", "website",
}


def get_settings(db: Session) -> dict:
    out: dict[str, Any] = {}
    for s in db.scalars(select(Setting)):
        v: Any = s.value
        if s.key in JSON_KEYS:
            try:
                v = json.loads(v)
            except ValueError:
                v = []
        elif s.key in BOOL_KEYS:
            v = v == "true"
        out[s.key] = v
    return out


def set_setting(db: Session, key: str, value: Any) -> None:
    if key in JSON_KEYS:
        items = value if isinstance(value, list) else str(value).splitlines()
        value = json.dumps([str(x).strip() for x in items if str(x).strip()])
    elif key in BOOL_KEYS:
        value = "true" if value in (True, "true", "True", 1) else "false"
    else:
        value = "" if value is None else str(value)
    row = db.get(Setting, key)
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))


def notify(db: Session, user_id: int, title: str, message: str, link: Optional[str] = None) -> None:
    db.add(Notification(user_id=user_id, title=title, message=message, link=link))


def notify_admins(db: Session, title: str, message: str, link: Optional[str] = None) -> None:
    for uid in db.scalars(select(User.id).where(User.role == "admin", User.is_active == True)):  # noqa: E712
        notify(db, uid, title, message, link)


# ---------- PDF storage ----------
def save_pdf(upload: UploadFile, paper_id: int, version_no: int) -> tuple[str, int, str]:
    name = upload.filename or "paper.pdf"
    if not name.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")
    limit = cfg.MAX_UPLOAD_MB * 1024 * 1024
    data = upload.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"File is larger than {cfg.MAX_UPLOAD_MB} MB")
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "The uploaded file is not a valid PDF")
    rel = f"papers/{paper_id}/v{version_no}_{uuid.uuid4().hex[:8]}.pdf"
    path = Path(cfg.STORAGE_DIR) / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return rel, len(data), name[:255]


def pick_version(paper, version_no: Optional[int]) -> PaperVersion:
    wanted = version_no or paper.current_version
    for v in paper.versions:
        if v.version_no == wanted:
            return v
    raise HTTPException(404, "Version not found")


def pdf_response(paper, version: PaperVersion) -> FileResponse:
    root = Path(cfg.STORAGE_DIR).resolve()
    path = (root / version.stored_path).resolve()
    if root not in path.parents or not path.exists():
        raise HTTPException(404, "File not found on server")
    return FileResponse(
        path, media_type="application/pdf", filename=f"{paper.paper_code}_v{version.version_no}.pdf",
        content_disposition_type="inline", headers={"Cache-Control": "no-store"})

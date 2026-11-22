"""Keynote / invited speakers: public list + photo, admin create / edit / delete / photo upload."""
from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CommitteeMember, MemberPhoto, Speaker
from ..security import require_role
from .public import member_out

public = APIRouter(prefix="/api/public", tags=["speakers"])
admin = APIRouter(prefix="/api/admin", tags=["speakers-admin"], dependencies=[Depends(require_role("admin"))])

MAX_PHOTO = 2 * 1024 * 1024


def out(s: Speaker) -> dict:
    v = int(s.updated_at.timestamp()) if s.updated_at else 0
    return {"id": s.id, "kind": s.kind, "name": s.name, "designation": s.designation or "", "details": s.details or "",
            "sort_order": s.sort_order, "photo_url": f"/api/public/speakers/{s.id}/photo?v={v}" if s.photo_type else None}


@public.get("/speakers")
def list_speakers(db: Session = Depends(get_db)):
    rows = db.scalars(select(Speaker).order_by(Speaker.kind.desc(), Speaker.sort_order, Speaker.id))  # "keynote" > "invited"
    return [out(s) for s in rows]


@public.get("/speakers/{sid}/photo")
def photo(sid: int, db: Session = Depends(get_db)):
    s = db.get(Speaker, sid)
    if not s or not s.photo_type or not s.photo_data:
        raise HTTPException(404, "No photo")
    return Response(content=s.photo_data, media_type=s.photo_type, headers={"Cache-Control": "public, max-age=86400"})


class SpeakerIn(BaseModel):
    kind: Literal["keynote", "invited"]
    name: str = Field(min_length=2, max_length=160)
    designation: Optional[str] = Field(None, max_length=300)
    details: Optional[str] = Field(None, max_length=600)
    sort_order: Optional[int] = Field(None, ge=0, le=9999)


def clean(v: Optional[str]) -> Optional[str]:
    return (v or "").strip() or None


@admin.post("/speakers")
def create_speaker(data: SpeakerIn, db: Session = Depends(get_db)):
    order = data.sort_order
    if order is None:
        order = (db.scalar(select(func.max(Speaker.sort_order)).where(Speaker.kind == data.kind)) or 0) + 10
    s = Speaker(kind=data.kind, name=data.name.strip(), designation=clean(data.designation), details=clean(data.details), sort_order=order)
    db.add(s)
    db.commit()
    db.refresh(s)
    return out(s)


@admin.put("/speakers/{sid}")
def update_speaker(sid: int, data: SpeakerIn, db: Session = Depends(get_db)):
    s = db.get(Speaker, sid)
    if not s:
        raise HTTPException(404, "Speaker not found")
    s.kind, s.name = data.kind, data.name.strip()
    s.designation, s.details = clean(data.designation), clean(data.details)
    if data.sort_order is not None:
        s.sort_order = data.sort_order
    db.commit()
    db.refresh(s)
    return out(s)


@admin.delete("/speakers/{sid}")
def delete_speaker(sid: int, db: Session = Depends(get_db)):
    s = db.get(Speaker, sid)
    if not s:
        raise HTTPException(404, "Speaker not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


def sniff(b: bytes) -> Optional[str]:
    if b[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "image/webp"
    return None


@admin.post("/speakers/{sid}/photo")
async def upload_photo(sid: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    s = db.get(Speaker, sid)
    if not s:
        raise HTTPException(404, "Speaker not found")
    data = await file.read(MAX_PHOTO + 1)
    if len(data) > MAX_PHOTO:
        raise HTTPException(413, "Photo is too large (maximum 2 MB)")
    kind = sniff(data)           # trust the file's real content, not its name or declared type
    if not kind:
        raise HTTPException(422, "Please upload a JPG, PNG or WebP image")
    s.photo_type, s.photo_data = kind, data
    db.commit()
    db.refresh(s)
    return out(s)


@admin.delete("/speakers/{sid}/photo")
def remove_photo(sid: int, db: Session = Depends(get_db)):
    s = db.get(Speaker, sid)
    if not s:
        raise HTTPException(404, "Speaker not found")
    s.photo_type, s.photo_data = None, None
    db.commit()
    db.refresh(s)
    return out(s)


# ---------------------------------------------------------------- committee-member photos
@public.get("/committee/{mid}/photo")
def member_photo(mid: int, db: Session = Depends(get_db)):
    p = db.get(MemberPhoto, mid)
    if not p:
        raise HTTPException(404, "No photo")
    return Response(content=p.photo_data, media_type=p.photo_type, headers={"Cache-Control": "public, max-age=86400"})


@admin.post("/committees/{mid}/photo")
async def upload_member_photo(mid: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    m = db.get(CommitteeMember, mid)
    if not m:
        raise HTTPException(404, "Member not found")
    data = await file.read(MAX_PHOTO + 1)
    if len(data) > MAX_PHOTO:
        raise HTTPException(413, "Photo is too large (maximum 2 MB)")
    kind = sniff(data)
    if not kind:
        raise HTTPException(422, "Please upload a JPG, PNG or WebP image")
    if m.photo:
        m.photo.photo_type, m.photo.photo_data, m.photo.rev = kind, data, (m.photo.rev or 0) + 1
    else:
        m.photo = MemberPhoto(photo_type=kind, photo_data=data, rev=1)
    db.commit()
    db.refresh(m)
    return member_out(m)


@admin.delete("/committees/{mid}/photo")
def remove_member_photo(mid: int, db: Session = Depends(get_db)):
    m = db.get(CommitteeMember, mid)
    if not m:
        raise HTTPException(404, "Member not found")
    m.photo = None
    db.commit()
    db.refresh(m)
    return member_out(m)

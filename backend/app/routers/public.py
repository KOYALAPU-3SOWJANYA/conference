from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CommitteeMember, ContactMessage, ImportantDate, Track
from ..serializers import iso
from ..services import get_settings, notify_admins

router = APIRouter(prefix="/api/public", tags=["public"])


def track_out(t):
    return {"id": t.id, "name": t.name, "description": t.description, "icon": t.icon, "sort_order": t.sort_order}


def member_out(m):
    return {"id": m.id, "group": m.group, "name": m.name, "designation": m.designation,
            "affiliation": m.affiliation, "sort_order": m.sort_order,
            "photo_url": f"/api/public/committee/{m.id}/photo?v={m.photo.rev}" if m.photo else None}


def date_out(d):
    return {"id": d.id, "label": d.label, "event_date": iso(d.event_date), "note": d.note, "sort_order": d.sort_order}


@router.get("/site")
def site(db: Session = Depends(get_db)):
    return {
        "settings": get_settings(db),
        "tracks": [track_out(t) for t in db.scalars(select(Track).order_by(Track.sort_order, Track.id))],
        "committees": [member_out(m) for m in db.scalars(
            select(CommitteeMember).order_by(CommitteeMember.sort_order, CommitteeMember.id))],
        "dates": [date_out(d) for d in db.scalars(
            select(ImportantDate).order_by(ImportantDate.event_date, ImportantDate.sort_order))],
    }


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=10, max_length=4000)


@router.post("/contact")
def contact(data: ContactIn, db: Session = Depends(get_db)):
    db.add(ContactMessage(**data.model_dump()))
    notify_admins(db, "New contact message", f"{data.name}: {data.subject}", "/admin/messages")
    db.commit()
    return {"ok": True}

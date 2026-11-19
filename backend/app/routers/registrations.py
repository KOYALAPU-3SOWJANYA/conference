"""Conference registration + payment.

Rules (enforced here on the server, not just in the form):
  * Registering WITH a Paper ID is only allowed when that paper's status is ACCEPTED.
    Rejected papers get no payment; papers still under review / in revision must wait.
  * The Paper ID must belong to the author's e-mail address, and the paper title is always taken from
    the database (never from what the browser sends).
  * One registration per paper, and every UPI reference number can be used only once.
  * Admin verifies (or rejects) each payment; the author is notified in-app.
"""
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Paper, Registration, User
from ..security import require_role
from ..serializers import iso
from ..services import get_settings, notify, notify_admins

public = APIRouter(prefix="/api/public", tags=["registration"])
admin = APIRouter(prefix="/api/admin", tags=["registration-admin"], dependencies=[Depends(require_role("admin"))])


# ------------------------------------------------------------------ helpers
def fee_table(db: Session) -> dict:
    """'Students | Rs. 1000' -> {'Students': 1000}"""
    out = {}
    for line in get_settings(db).get("registration_fees", []):
        cat, _, amt = line.partition("|")
        digits = re.sub(r"\D", "", amt)
        if cat.strip():
            out[cat.strip()] = int(digits) if digits else 0
    return out


def find_paper(db: Session, paper_code: str, email: str) -> Paper:
    p = db.scalar(select(Paper).where(func.lower(Paper.paper_code) == paper_code.strip().lower()))
    if not p or p.author.email.lower() != email.strip().lower():
        # same message for both cases so Paper IDs can't be probed
        raise HTTPException(404, "No paper found with this Paper ID for that e-mail address. "
                                 "Use the e-mail you registered with as an author.")
    return p


def gate(db: Session, p: Paper) -> dict:
    taken = db.scalar(select(Registration.id).where(Registration.paper_id == p.id))
    if p.status == "accepted":
        if taken:
            return {"can_pay": False, "message": "A registration has already been submitted for this paper."}
        return {"can_pay": True, "message": "Your paper is accepted. You can proceed to payment."}
    if p.status == "rejected":
        return {"can_pay": False, "message": "This paper was not accepted, so registration payment is not available for it."}
    if p.status in ("minor_revision", "major_revision"):
        return {"can_pay": False, "message": "A revision is required for this paper. Payment opens once it is accepted."}
    return {"can_pay": False, "message": "Your paper is still under evaluation. Payment opens once it is accepted."}


def paper_info(p: Paper, g: dict) -> dict:
    return {"paper_code": p.paper_code, "title": p.title, "status": p.status, **g}


# ------------------------------------------------------------------ public
class LookupIn(BaseModel):
    paper_code: str = Field(min_length=3, max_length=30)
    email: EmailStr


@public.post("/registration/lookup")
def lookup(data: LookupIn, db: Session = Depends(get_db)):
    p = find_paper(db, data.paper_code, data.email)
    return paper_info(p, gate(db, p))


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    designation: str = Field(min_length=2, max_length=120)
    organization: str = Field(min_length=2, max_length=255)
    address: str = Field(min_length=5, max_length=1000)
    mobile: str = Field(min_length=7, max_length=20)
    email: EmailStr
    category: str = Field(min_length=2, max_length=80)
    paper_code: Optional[str] = Field(None, max_length=30)
    upi_reference: str = Field(min_length=6, max_length=40)

    @field_validator("mobile")
    @classmethod
    def _mobile(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"\+?[0-9 \-]{7,20}", v):
            raise ValueError("Enter a valid mobile number")
        return v

    @field_validator("upi_reference")
    @classmethod
    def _upi(cls, v: str) -> str:
        v = v.strip()
        if not re.fullmatch(r"[A-Za-z0-9._@\-]{6,40}", v):
            raise ValueError("UPI reference may contain only letters, numbers and . _ @ -")
        return v


@public.post("/registrations")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    fees = fee_table(db)
    if fees and data.category not in fees:
        raise HTTPException(422, "Please choose a valid registration category")
    paper: Optional[Paper] = None
    if data.paper_code and data.paper_code.strip():
        paper = find_paper(db, data.paper_code, data.email)
        g = gate(db, paper)
        if not g["can_pay"]:
            raise HTTPException(403, g["message"])
    if db.scalar(select(Registration.id).where(Registration.upi_reference == data.upi_reference)):
        raise HTTPException(409, "This UPI reference number has already been used")
    reg = Registration(
        paper_id=paper.id if paper else None, paper_code=paper.paper_code if paper else None,
        paper_title=paper.title if paper else None,
        name=data.name.strip(), designation=data.designation.strip(), organization=data.organization.strip(),
        address=data.address.strip(), mobile=data.mobile, email=data.email.lower(), category=data.category,
        amount=fees.get(data.category, 0), upi_reference=data.upi_reference)
    db.add(reg)
    db.flush()
    reg.reg_code = f"NISE26-R{reg.id:04d}"
    notify_admins(db, "New registration", f"{reg.name} ({reg.reg_code}) submitted a payment reference"
                  + (f" for {reg.paper_code}." if paper else "."), "/admin/registrations")
    if paper:
        notify(db, paper.author_id, "Registration received",
               f"Your registration {reg.reg_code} for {paper.paper_code} is awaiting payment verification.",
               f"/author/papers/{paper.id}")
    db.commit()
    return {"id": reg.id, "reg_code": reg.reg_code, "amount": reg.amount, "payment_status": reg.payment_status}


# ------------------------------------------------------------------ admin
def reg_out(r: Registration) -> dict:
    return {"id": r.id, "reg_code": r.reg_code, "paper_id": r.paper_id, "paper_code": r.paper_code,
            "paper_title": r.paper_title, "paper_status": r.paper.status if r.paper else None,
            "name": r.name, "designation": r.designation, "organization": r.organization, "address": r.address,
            "mobile": r.mobile, "email": r.email, "category": r.category, "amount": r.amount,
            "upi_reference": r.upi_reference, "payment_status": r.payment_status, "admin_note": r.admin_note,
            "created_at": iso(r.created_at)}


@admin.get("/registrations")
def list_registrations(db: Session = Depends(get_db)):
    return [reg_out(r) for r in db.scalars(select(Registration).order_by(Registration.id.desc()))]


class StatusIn(BaseModel):
    payment_status: str
    admin_note: Optional[str] = Field(None, max_length=2000)


@admin.patch("/registrations/{rid}")
def update_registration(rid: int, data: StatusIn, db: Session = Depends(get_db)):
    if data.payment_status not in ("pending", "verified", "rejected"):
        raise HTTPException(422, "Invalid payment status")
    r = db.get(Registration, rid)
    if not r:
        raise HTTPException(404, "Registration not found")
    r.payment_status = data.payment_status
    if data.admin_note is not None:
        r.admin_note = data.admin_note.strip() or None
    if r.paper_id and data.payment_status in ("verified", "rejected"):
        word = "verified. You are registered for the conference." if data.payment_status == "verified" \
            else "not verified. Please contact the organisers or register again with the correct UPI reference."
        notify(db, r.paper.author_id, f"Payment {data.payment_status}", f"Your payment for {r.reg_code} was {word}",
               f"/author/papers/{r.paper_id}")
    db.commit()
    return reg_out(r)

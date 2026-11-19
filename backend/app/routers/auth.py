import hmac
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Notification, User
from ..security import create_token, get_current_user, hash_password, verify_password
from ..serializers import iso, user_out
from ..services import notify_admins

router = APIRouter(prefix="/api", tags=["auth"])


def _strong(v: str) -> str:
    if not (any(c.isalpha() for c in v) and any(c.isdigit() for c in v)):
        raise ValueError("Password must contain both letters and numbers")
    return v


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: Optional[str] = Field(None, max_length=30)
    affiliation: Optional[str] = Field(None, max_length=255)
    designation: Optional[str] = Field(None, max_length=120)
    expertise: Optional[str] = Field(None, max_length=1000)
    invite_code: Optional[str] = None

    @field_validator("password")
    @classmethod
    def _check_pw(cls, v: str) -> str:
        return _strong(v)


class LoginIn(BaseModel):
    # plain string on purpose: sign-in only has to match an existing account, and strict e-mail
    # validation rejects reserved domains such as admin@raise2026.local
    email: str = Field(min_length=3, max_length=255)
    password: str
    role: str

    @field_validator("email")
    @classmethod
    def _norm(cls, v: str) -> str:
        return v.strip().lower()


class ProfileIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: Optional[str] = Field(None, max_length=30)
    affiliation: Optional[str] = Field(None, max_length=255)
    designation: Optional[str] = Field(None, max_length=120)
    expertise: Optional[str] = Field(None, max_length=1000)


class PasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _check_pw(cls, v: str) -> str:
        return _strong(v)


@router.post("/auth/register/{role}")
def register(role: str, data: RegisterIn, db: Session = Depends(get_db)):
    if role not in ("author", "reviewer", "admin"):
        raise HTTPException(404, "Unknown portal")
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email, User.role == role)):
        raise HTTPException(409, f"A {role} account with this email already exists")
    if role == "admin":
        code = settings.ADMIN_SIGNUP_CODE
        if not code or not data.invite_code or not hmac.compare_digest(code, data.invite_code):
            raise HTTPException(403, "Invalid admin invite code")
    if role == "reviewer" and not (data.affiliation and data.expertise):
        raise HTTPException(422, "Affiliation and areas of expertise are required for reviewers")
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password), role=role,
                phone=data.phone, affiliation=data.affiliation, designation=data.designation,
                expertise=data.expertise, approval_status="pending" if role == "reviewer" else "approved")
    db.add(user)
    db.flush()
    if role == "reviewer":
        notify_admins(db, "New reviewer registration", f"{user.name} is waiting for approval.", "/admin/reviewers")
    db.commit()
    if role == "reviewer":
        return {"pending": True, "message": "Registration received. You can sign in once an admin approves your account."}
    return {"access_token": create_token(user), "user": user_out(user)}


@router.post("/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower(), User.role == data.role))
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password for this portal")
    if not user.is_active:
        raise HTTPException(403, "This account has been deactivated. Contact the organisers.")
    if user.role == "reviewer" and user.approval_status == "pending":
        raise HTTPException(403, "Your reviewer account is awaiting admin approval.")
    if user.role == "reviewer" and user.approval_status == "rejected":
        raise HTTPException(403, "Your reviewer application was not approved.")
    return {"access_token": create_token(user), "user": user_out(user)}


@router.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@router.put("/auth/me")
def update_me(data: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for k, v in data.model_dump().items():
        setattr(user, k, v)
    db.commit()
    return user_out(user)


@router.post("/auth/change-password")
def change_password(data: PasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


# ---------- in-app notifications (all roles) ----------
@router.get("/notifications")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id)
                      .order_by(Notification.id.desc()).limit(100)).all()
    return {"unread": sum(1 for n in rows if not n.is_read),
            "items": [{"id": n.id, "title": n.title, "message": n.message, "link": n.link,
                       "is_read": n.is_read, "created_at": iso(n.created_at)} for n in rows]}


@router.post("/notifications/read-all")
def read_all(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for n in db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.is_read == False)):  # noqa: E712
        n.is_read = True
    db.commit()
    return {"ok": True}


@router.post("/notifications/{nid}/read")
def read_one(nid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.get(Notification, nid)
    if not n or n.user_id != user.id:
        raise HTTPException(404, "Not found")
    n.is_read = True
    db.commit()
    return {"ok": True}

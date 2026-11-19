from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import (CRITERIA, DECISIONS, Assignment, CommitteeMember, ContactMessage, Decision,
                      ImportantDate, Paper, Review, Track, User)
from ..security import hash_password, require_role
from ..serializers import admin_paper_detail, iso, paper_row, user_out
from ..services import (SETTING_KEYS, get_settings, notify, pdf_response, pick_version, set_setting)
from .public import date_out, member_out, track_out

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_role("admin"))])
Admin = Depends(require_role("admin"))

PAPER_LOAD = (selectinload(Paper.assignments).selectinload(Assignment.reviews),
              selectinload(Paper.assignments).selectinload(Assignment.reviewer),
              selectinload(Paper.track), selectinload(Paper.author), selectinload(Paper.versions),
              selectinload(Paper.decisions).selectinload(Decision.admin))


def get_paper(db: Session, pid: int) -> Paper:
    p = db.scalars(select(Paper).where(Paper.id == pid).options(*PAPER_LOAD)).first()
    if not p:
        raise HTTPException(404, "Paper not found")
    return p


# ------------------------------------------------------------------ analytics
@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    papers = db.scalars(select(Paper).options(*PAPER_LOAD).order_by(Paper.id.desc())).all()
    by_status = {s: 0 for s in ("submitted", "under_review", "minor_revision", "major_revision", "accepted", "rejected")}
    for p in papers:
        by_status[p.status] = by_status.get(p.status, 0) + 1
    ready = [p for p in papers if p.status == "under_review" and p.assignments
             and all(a.status == "completed" for a in p.assignments)]
    a_counts = dict(db.execute(select(Assignment.status, func.count()).group_by(Assignment.status)).all())
    track_rows = db.execute(
        select(Track.name, func.count(Paper.id)).select_from(Track).outerjoin(Paper, Paper.track_id == Track.id)
        .group_by(Track.id, Track.name).order_by(Track.sort_order, Track.id)).all()
    day = func.date(Paper.created_at)
    time_rows = db.execute(select(day, func.count()).group_by(day).order_by(day)).all()
    rec_rows = db.execute(select(Review.recommendation, func.count()).where(Review.is_final == True)  # noqa: E712
                          .group_by(Review.recommendation)).all()
    avg_row = db.execute(select(*[func.avg(getattr(Review, c)) for c in CRITERIA]).where(Review.is_final == True)).one()  # noqa: E712
    reviewers = db.scalars(select(User).where(User.role == "reviewer", User.approval_status == "approved")).all()
    load = {r: {"assigned": 0, "completed": 0} for r in [u.id for u in reviewers]}
    for rid, st, c in db.execute(select(Assignment.reviewer_id, Assignment.status, func.count())
                                 .group_by(Assignment.reviewer_id, Assignment.status)).all():
        if rid in load:
            load[rid]["assigned"] += c
            if st == "completed":
                load[rid]["completed"] += c
    all_scores = [r.overall for p in papers for a in p.assignments for r in a.reviews if r.is_final and r.overall]
    return {
        "kpis": {
            "total_papers": len(papers), "awaiting_assignment": by_status["submitted"],
            "under_review": by_status["under_review"], "ready_for_decision": len(ready),
            "accepted": by_status["accepted"], "rejected": by_status["rejected"],
            "revision": by_status["minor_revision"] + by_status["major_revision"],
            "authors": db.scalar(select(func.count(User.id)).where(User.role == "author")),
            "reviewers": len(reviewers),
            "pending_reviewers": db.scalar(select(func.count(User.id)).where(User.role == "reviewer", User.approval_status == "pending")),
            "reviews_completed": a_counts.get("completed", 0),
            "reviews_total": sum(a_counts.values()),
            "avg_score": round(sum(all_scores) / len(all_scores), 2) if all_scores else None,
            "unread_messages": db.scalar(select(func.count(ContactMessage.id)).where(ContactMessage.is_read == False)),  # noqa: E712
        },
        "by_status": by_status,
        "by_track": [{"name": n, "count": c} for n, c in track_rows],
        "submissions_over_time": [{"date": str(d), "count": c} for d, c in time_rows],
        "review_progress": {"assigned": a_counts.get("assigned", 0), "in_progress": a_counts.get("in_progress", 0),
                            "completed": a_counts.get("completed", 0)},
        "recommendations": [{"name": r or "unknown", "count": c} for r, c in rec_rows],
        "avg_criteria": [{"criterion": c, "score": round(float(v), 2) if v is not None else 0}
                         for c, v in zip(CRITERIA, avg_row)],
        "reviewer_load": [{"id": u.id, "name": u.name, **load[u.id]} for u in reviewers],
        "recent_papers": [paper_row(p) for p in papers[:6]],
        "needs_decision": [paper_row(p) for p in ready[:6]],
        "needs_reviewers": [paper_row(p) for p in papers if p.status == "submitted"][:6],
    }


# ------------------------------------------------------------------ papers
@router.get("/papers")
def list_papers(q: Optional[str] = None, status: Optional[str] = None, track_id: Optional[int] = None,
                db: Session = Depends(get_db)):
    stmt = select(Paper).options(*PAPER_LOAD).order_by(Paper.id.desc())
    if status:
        stmt = stmt.where(Paper.status == status)
    if track_id:
        stmt = stmt.where(Paper.track_id == track_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(Paper.title.ilike(like) | Paper.paper_code.ilike(like)
                          | Paper.author.has(User.name.ilike(like)))
    return [paper_row(p) for p in db.scalars(stmt).all()]


@router.get("/papers/{pid}")
def paper_detail(pid: int, db: Session = Depends(get_db)):
    return admin_paper_detail(get_paper(db, pid))


@router.get("/papers/{pid}/download")
def download(pid: int, version: Optional[int] = None, db: Session = Depends(get_db)):
    p = get_paper(db, pid)
    return pdf_response(p, pick_version(p, version))


class AssignIn(BaseModel):
    reviewer_ids: List[int] = Field(min_length=1)
    due_date: Optional[date] = None


@router.post("/papers/{pid}/assign")
def assign(pid: int, data: AssignIn, admin: User = Admin, db: Session = Depends(get_db)):
    p = get_paper(db, pid)
    if p.status in ("accepted", "rejected"):
        raise HTTPException(400, "A final decision has already been made on this paper")
    existing = {a.reviewer_id for a in p.assignments}
    added = 0
    for rid in set(data.reviewer_ids) - existing:
        r = db.get(User, rid)
        if not r or r.role != "reviewer" or r.approval_status != "approved" or not r.is_active:
            raise HTTPException(422, "Only approved, active reviewers can be assigned")
        a = Assignment(paper_id=p.id, reviewer_id=rid, assigned_by=admin.id, due_date=data.due_date)
        db.add(a)
        db.flush()
        notify(db, rid, "New paper assigned", f"{p.paper_code} “{p.title}” is ready for your review.",
               f"/reviewer/assignments/{a.id}")
        added += 1
    if added and p.status == "submitted":
        p.status = "under_review"
        notify(db, p.author_id, "Paper under review", f"{p.paper_code} has entered peer review.", f"/author/papers/{p.id}")
    if not added:
        raise HTTPException(400, "The selected reviewers are already assigned to this paper")
    db.commit()
    return {"assigned": added}


@router.delete("/assignments/{aid}")
def unassign(aid: int, db: Session = Depends(get_db)):
    a = db.get(Assignment, aid)
    if not a:
        raise HTTPException(404, "Assignment not found")
    if any(r.is_final for r in a.reviews):
        raise HTTPException(400, "A reviewer who has submitted a review cannot be removed")
    p = a.paper
    db.delete(a)
    db.flush()
    db.refresh(p)
    if not p.assignments and p.status == "under_review":
        p.status = "submitted"
    db.commit()
    return {"ok": True}


class DecisionIn(BaseModel):
    decision: str
    comments: Optional[str] = Field(None, max_length=8000)
    release_feedback: bool = True


@router.post("/papers/{pid}/decision")
def decide(pid: int, data: DecisionIn, admin: User = Admin, db: Session = Depends(get_db)):
    p = get_paper(db, pid)
    if data.decision not in DECISIONS:
        raise HTTPException(422, "Invalid decision")
    has_final = any(r.is_final for a in p.assignments for r in a.reviews)
    if data.decision != "rejected" and not has_final:
        raise HTTPException(400, "At least one submitted review is needed before accepting or requesting a revision")
    p.decisions.append(Decision(paper_id=p.id, version_no=p.current_version, decision=data.decision,
                                comments=data.comments, release_feedback=data.release_feedback, decided_by=admin.id))
    p.status = data.decision
    p.decided_at = datetime.now(timezone.utc)
    db.flush()
    p.decisions[-1].admin = admin
    label = data.decision.replace("_", " ")
    notify(db, p.author_id, f"Decision: {label}", f"A decision has been recorded for {p.paper_code}: {label}.",
           f"/author/papers/{p.id}")
    db.commit()
    return admin_paper_detail(get_paper(db, pid))


class ReleaseIn(BaseModel):
    release_feedback: bool


@router.post("/papers/{pid}/release")
def release(pid: int, data: ReleaseIn, db: Session = Depends(get_db)):
    p = get_paper(db, pid)
    if not p.decisions:
        raise HTTPException(400, "Record a decision first")
    latest = p.decisions[-1]
    latest.release_feedback = data.release_feedback
    if data.release_feedback:
        notify(db, p.author_id, "Reviewer feedback released", f"Feedback for {p.paper_code} is now available.",
               f"/author/papers/{p.id}")
    db.commit()
    return admin_paper_detail(get_paper(db, pid))


# ------------------------------------------------------------------ review progress
@router.get("/assignments")
def all_assignments(status: Optional[str] = None, db: Session = Depends(get_db)):
    stmt = select(Assignment).options(selectinload(Assignment.paper).selectinload(Paper.track),
                                      selectinload(Assignment.reviewer), selectinload(Assignment.reviews)
                                      ).order_by(Assignment.id.desc())
    if status:
        stmt = stmt.where(Assignment.status == status)
    out = []
    for a in db.scalars(stmt).all():
        cur = next((r for r in a.reviews if r.version_no == a.paper.current_version), None)
        out.append({"id": a.id, "paper_id": a.paper_id, "paper_code": a.paper.paper_code, "title": a.paper.title,
                    "track": a.paper.track.name if a.paper.track else None, "status": a.status,
                    "paper_status": a.paper.status, "version": a.paper.current_version,
                    "reviewer": {"id": a.reviewer.id, "name": a.reviewer.name},
                    "assigned_at": iso(a.assigned_at), "due_date": iso(a.due_date),
                    "overdue": bool(a.due_date and a.due_date < date.today() and a.status != "completed"),
                    "overall": cur.overall if cur and cur.is_final else None,
                    "recommendation": cur.recommendation if cur and cur.is_final else None})
    return out


# ------------------------------------------------------------------ users
@router.get("/users")
def list_users(role: str, q: Optional[str] = None, db: Session = Depends(get_db)):
    if role not in ("author", "reviewer"):
        raise HTTPException(422, "role must be author or reviewer")
    stmt = select(User).where(User.role == role).order_by(User.id.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(User.name.ilike(like) | User.email.ilike(like) | User.affiliation.ilike(like))
    users = db.scalars(stmt).all()
    out = []
    if role == "author":
        counts = dict(db.execute(select(Paper.author_id, func.count()).group_by(Paper.author_id)).all())
        for u in users:
            out.append({**user_out(u), "papers": counts.get(u.id, 0)})
    else:
        rows = db.execute(select(Assignment.reviewer_id, Assignment.status, func.count())
                          .group_by(Assignment.reviewer_id, Assignment.status)).all()
        stats: Dict[int, Dict[str, int]] = {}
        for rid, st, c in rows:
            s = stats.setdefault(rid, {"assigned": 0, "completed": 0})
            s["assigned"] += c
            if st == "completed":
                s["completed"] += c
        for u in users:
            out.append({**user_out(u), **stats.get(u.id, {"assigned": 0, "completed": 0})})
    return out


class UserPatch(BaseModel):
    is_active: Optional[bool] = None
    approval_status: Optional[str] = None


@router.patch("/users/{uid}")
def patch_user(uid: int, data: UserPatch, db: Session = Depends(get_db)):
    u = db.get(User, uid)
    if not u or u.role == "admin":
        raise HTTPException(404, "User not found")
    if data.is_active is not None:
        u.is_active = data.is_active
    if data.approval_status is not None:
        if u.role != "reviewer" or data.approval_status not in ("approved", "rejected", "pending"):
            raise HTTPException(422, "Invalid approval status")
        u.approval_status = data.approval_status
    db.commit()
    return user_out(u)


class UserCreate(BaseModel):
    role: str
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    affiliation: Optional[str] = None
    expertise: Optional[str] = None
    phone: Optional[str] = None


@router.post("/users")
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if data.role not in ("author", "reviewer"):
        raise HTTPException(422, "role must be author or reviewer")
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email, User.role == data.role)):
        raise HTTPException(409, "An account with this email already exists")
    u = User(name=data.name, email=email, password_hash=hash_password(data.password), role=data.role,
             affiliation=data.affiliation, expertise=data.expertise, phone=data.phone, approval_status="approved")
    db.add(u)
    db.commit()
    return user_out(u)


# ------------------------------------------------------------------ conference content
class TrackIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0


class MemberIn(BaseModel):
    group: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=160)
    designation: Optional[str] = None
    affiliation: Optional[str] = None
    sort_order: int = 0


class DateIn(BaseModel):
    label: str = Field(min_length=2, max_length=200)
    event_date: date
    note: Optional[str] = None
    sort_order: int = 0


def crud(path: str, Model, Schema, out, order, guard=None):
    @router.get(f"/{path}", name=f"list_{path}")
    def _list(db: Session = Depends(get_db)):
        return [out(x) for x in db.scalars(select(Model).order_by(*order))]

    @router.post(f"/{path}", name=f"create_{path}")
    def _create(data: Schema, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        obj = Model(**data.model_dump())
        db.add(obj)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(409, "Could not save — a record with this name may already exist")
        return out(obj)

    @router.put(f"/{path}/{{oid}}", name=f"update_{path}")
    def _update(oid: int, data: Schema, db: Session = Depends(get_db)):  # type: ignore[valid-type]
        obj = db.get(Model, oid)
        if not obj:
            raise HTTPException(404, "Not found")
        for k, v in data.model_dump().items():
            setattr(obj, k, v)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise HTTPException(409, "Could not save — a record with this name may already exist")
        return out(obj)

    @router.delete(f"/{path}/{{oid}}", name=f"delete_{path}")
    def _delete(oid: int, db: Session = Depends(get_db)):
        obj = db.get(Model, oid)
        if not obj:
            raise HTTPException(404, "Not found")
        if guard:
            guard(db, obj)
        db.delete(obj)
        db.commit()
        return {"ok": True}


def _track_guard(db: Session, t: Track):
    n = db.scalar(select(func.count(Paper.id)).where(Paper.track_id == t.id))
    if n:
        raise HTTPException(409, f"{n} paper(s) use this track, so it cannot be deleted")


crud("tracks", Track, TrackIn, track_out, (Track.sort_order, Track.id), _track_guard)
crud("committees", CommitteeMember, MemberIn, member_out, (CommitteeMember.sort_order, CommitteeMember.id))
crud("dates", ImportantDate, DateIn, date_out, (ImportantDate.event_date, ImportantDate.id))


@router.get("/settings")
def read_settings(db: Session = Depends(get_db)):
    return get_settings(db)


@router.put("/settings")
def update_settings(data: Dict[str, Any], db: Session = Depends(get_db)):
    for k, v in data.items():
        if k in SETTING_KEYS:
            set_setting(db, k, v)
    db.commit()
    return get_settings(db)


# ------------------------------------------------------------------ contact messages
@router.get("/messages")
def messages(db: Session = Depends(get_db)):
    return [{"id": m.id, "name": m.name, "email": m.email, "subject": m.subject, "message": m.message,
             "is_read": m.is_read, "created_at": iso(m.created_at)}
            for m in db.scalars(select(ContactMessage).order_by(ContactMessage.id.desc()))]


@router.post("/messages/{mid}/read")
def message_read(mid: int, db: Session = Depends(get_db)):
    m = db.get(ContactMessage, mid)
    if not m:
        raise HTTPException(404, "Not found")
    m.is_read = True
    db.commit()
    return {"ok": True}


@router.delete("/messages/{mid}")
def message_delete(mid: int, db: Session = Depends(get_db)):
    m = db.get(ContactMessage, mid)
    if m:
        db.delete(m)
        db.commit()
    return {"ok": True}

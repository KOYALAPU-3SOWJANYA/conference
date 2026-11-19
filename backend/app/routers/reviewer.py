from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import CRITERIA, RECOMMENDATIONS, Assignment, Review, User
from ..security import require_role
from ..serializers import iso, review_out, reviewer_assignment_row, version_out
from ..services import notify_admins, pdf_response, pick_version

router = APIRouter(prefix="/api/reviewer", tags=["reviewer"])
Reviewer = Depends(require_role("reviewer"))


def my_assignment(db: Session, aid: int, user: User) -> Assignment:
    a = db.get(Assignment, aid)
    if not a or a.reviewer_id != user.id:  # reviewers only see papers assigned to them
        raise HTTPException(404, "Assignment not found")
    return a


@router.get("/assignments")
def assignments(user: User = Reviewer, db: Session = Depends(get_db)):
    rows = db.scalars(select(Assignment).where(Assignment.reviewer_id == user.id).order_by(Assignment.id.desc())).all()
    return [reviewer_assignment_row(a) for a in rows]


@router.get("/assignments/{aid}")
def assignment_detail(aid: int, user: User = Reviewer, db: Session = Depends(get_db)):
    a = my_assignment(db, aid, user)
    p = a.paper
    row = reviewer_assignment_row(a)
    # double-blind: author identity is never exposed to reviewers
    row.update({"abstract": p.abstract, "versions": [version_out(v) for v in p.versions],
                "review": next((review_out(r, True) for r in a.reviews if r.version_no == p.current_version), None),
                "previous_reviews": [review_out(r, True) for r in a.reviews if r.version_no != p.current_version]})
    return row


@router.get("/assignments/{aid}/download")
def download(aid: int, version: Optional[int] = None, user: User = Reviewer, db: Session = Depends(get_db)):
    a = my_assignment(db, aid, user)
    return pdf_response(a.paper, pick_version(a.paper, version))


class ReviewIn(BaseModel):
    originality: Optional[int] = Field(None, ge=1, le=10)
    technical_quality: Optional[int] = Field(None, ge=1, le=10)
    relevance: Optional[int] = Field(None, ge=1, le=10)
    clarity: Optional[int] = Field(None, ge=1, le=10)
    significance: Optional[int] = Field(None, ge=1, le=10)
    strengths: Optional[str] = Field(None, max_length=8000)
    weaknesses: Optional[str] = Field(None, max_length=8000)
    comments: Optional[str] = Field(None, max_length=12000)
    confidential_comments: Optional[str] = Field(None, max_length=8000)
    recommendation: Optional[str] = None
    is_final: bool = False


@router.put("/assignments/{aid}/review")
def save_review(aid: int, data: ReviewIn, user: User = Reviewer, db: Session = Depends(get_db)):
    a = my_assignment(db, aid, user)
    p = a.paper
    if p.status in ("accepted", "rejected"):
        raise HTTPException(400, "A final decision has already been made on this paper")
    review = next((r for r in a.reviews if r.version_no == p.current_version), None)
    if review and review.is_final:
        raise HTTPException(400, "This review has already been submitted and can no longer be edited")
    if data.recommendation and data.recommendation not in RECOMMENDATIONS:
        raise HTTPException(422, "Invalid recommendation")
    if data.is_final:
        missing = [c.replace("_", " ") for c in CRITERIA if getattr(data, c) is None]
        if missing:
            raise HTTPException(422, "Please score every criterion: " + ", ".join(missing))
        if not data.recommendation:
            raise HTTPException(422, "Please choose a recommendation")
        for field in ("strengths", "weaknesses", "comments"):
            if len((getattr(data, field) or "").strip()) < 10:
                raise HTTPException(422, f"Please write a meaningful {field} section (at least 10 characters)")
    if not review:
        review = Review(assignment_id=a.id, version_no=p.current_version)
        db.add(review)
        a.reviews.append(review)
    for k, v in data.model_dump(exclude={"is_final"}).items():
        setattr(review, k, v)
    if data.is_final:
        review.is_final = True
        review.submitted_at = datetime.now(timezone.utc)
        a.status = "completed"
        notify_admins(db, "Review submitted", f"{user.name} completed the review of {p.paper_code}.", f"/admin/papers/{p.id}")
    else:
        a.status = "in_progress"
    db.commit()
    return review_out(review, True)


@router.get("/history")
def history(user: User = Reviewer, db: Session = Depends(get_db)):
    out = []
    for a in db.scalars(select(Assignment).where(Assignment.reviewer_id == user.id)):
        for r in a.reviews:
            if r.is_final:
                out.append({**review_out(r, True), "assignment_id": a.id, "paper_code": a.paper.paper_code,
                            "title": a.paper.title, "track": a.paper.track.name if a.paper.track else None,
                            "paper_status": a.paper.status})
    out.sort(key=lambda x: x["submitted_at"] or "", reverse=True)
    return out

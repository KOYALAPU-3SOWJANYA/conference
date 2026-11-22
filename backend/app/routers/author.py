from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Paper, PaperVersion, Track, User
from ..security import require_role
from ..serializers import author_paper_detail, iso, paper_base
from ..services import get_settings, notify, notify_admins, pdf_response, pick_version, save_pdf

router = APIRouter(prefix="/api/author", tags=["author"])
Author = Depends(require_role("author"))


def own_paper(db: Session, pid: int, user: User) -> Paper:
    p = db.get(Paper, pid)
    if not p or p.author_id != user.id:  # authors can only ever see their own submissions
        raise HTTPException(404, "Paper not found")
    return p


@router.get("/papers")
def my_papers(user: User = Author, db: Session = Depends(get_db)):
    rows = db.scalars(select(Paper).where(Paper.author_id == user.id).order_by(Paper.id.desc())).all()
    return [{**paper_base(p), "can_revise": p.status in ("minor_revision", "major_revision")} for p in rows]


@router.post("/papers")
def submit_paper(title: str = Form(..., min_length=5, max_length=500), abstract: str = Form(..., min_length=50),
                 track_id: int = Form(...), keywords: str = Form(""), co_authors: str = Form(""),
                 file: UploadFile = File(...), user: User = Author, db: Session = Depends(get_db)):
    if not get_settings(db).get("submissions_open", True):
        raise HTTPException(403, "Paper submissions are currently closed")
    if not db.get(Track, track_id):
        raise HTTPException(422, "Please choose a valid technical track")
    paper = Paper(title=title.strip(), abstract=abstract.strip(), keywords=keywords.strip(),
                  co_authors=co_authors.strip(), author_id=user.id, track_id=track_id)
    db.add(paper)
    db.flush()
    paper.paper_code = f"NISE2026-{paper.id:04d}"
    rel, size, name = save_pdf(file, paper.id, 1)
    db.add(PaperVersion(paper_id=paper.id, version_no=1, original_filename=name, stored_path=rel, file_size=size,
                        note="Initial submission"))
    notify(db, user.id, "Paper submitted", f"{paper.paper_code} was submitted successfully.", f"/author/papers/{paper.id}")
    notify_admins(db, "New paper submitted", f"{paper.paper_code} “{paper.title}” by {user.name}.", f"/admin/papers/{paper.id}")
    db.commit()
    return {"id": paper.id, "paper_code": paper.paper_code}


@router.get("/papers/{pid}")
def paper_detail(pid: int, user: User = Author, db: Session = Depends(get_db)):
    return author_paper_detail(own_paper(db, pid, user))


@router.get("/papers/{pid}/download")
def download(pid: int, version: Optional[int] = None, user: User = Author, db: Session = Depends(get_db)):
    p = own_paper(db, pid, user)
    return pdf_response(p, pick_version(p, version))


@router.post("/papers/{pid}/revision")
def upload_revision(pid: int, note: str = Form(""), file: UploadFile = File(...), user: User = Author,
                    db: Session = Depends(get_db)):
    p = own_paper(db, pid, user)
    if p.status not in ("minor_revision", "major_revision"):
        raise HTTPException(400, "A revised version can only be uploaded when a revision has been requested")
    new_no = p.current_version + 1
    rel, size, name = save_pdf(file, p.id, new_no)
    db.add(PaperVersion(paper_id=p.id, version_no=new_no, original_filename=name, stored_path=rel,
                        file_size=size, note=note.strip() or f"Revised version {new_no}"))
    p.current_version = new_no
    p.status = "under_review" if p.assignments else "submitted"
    for a in p.assignments:  # reviewers get a fresh review round for the new version
        a.status = "assigned"
        notify(db, a.reviewer_id, "Revised paper available",
               f"{p.paper_code} has a revised version (v{new_no}) ready for re-evaluation.", f"/reviewer/assignments/{a.id}")
    notify(db, user.id, "Revision uploaded", f"Version {new_no} of {p.paper_code} was received.", f"/author/papers/{p.id}")
    notify_admins(db, "Revised paper uploaded", f"{p.paper_code} now has version {new_no}.", f"/admin/papers/{p.id}")
    db.commit()
    return {"ok": True, "version": new_no}


@router.get("/history")
def history(user: User = Author, db: Session = Depends(get_db)):
    """Chronological activity across all of the author's papers."""
    events = []
    for p in db.scalars(select(Paper).where(Paper.author_id == user.id)):
        for v in p.versions:
            events.append({"type": "version", "paper_id": p.id, "paper_code": p.paper_code, "title": p.title,
                           "label": "Initial submission" if v.version_no == 1 else f"Revised version v{v.version_no} uploaded",
                           "detail": v.note, "at": iso(v.created_at)})
        for d in p.decisions:
            events.append({"type": "decision", "paper_id": p.id, "paper_code": p.paper_code, "title": p.title,
                           "label": f"Decision: {d.decision.replace('_', ' ')}", "detail": None, "at": iso(d.decided_at)})
    events.sort(key=lambda e: e["at"] or "", reverse=True)
    return events

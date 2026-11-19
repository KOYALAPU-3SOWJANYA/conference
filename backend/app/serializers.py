from typing import Optional

from .models import CRITERIA, Assignment, Paper, Review, User


def iso(v):
    return v.isoformat() if v else None


def user_out(u: User) -> dict:
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role, "phone": u.phone,
            "affiliation": u.affiliation, "designation": u.designation, "expertise": u.expertise,
            "is_active": u.is_active, "approval_status": u.approval_status, "created_at": iso(u.created_at)}


def version_out(v) -> dict:
    return {"version_no": v.version_no, "filename": v.original_filename, "size": v.file_size,
            "note": v.note, "uploaded_at": iso(v.created_at)}


def review_out(r: Review, confidential: bool = False) -> dict:
    d = {"id": r.id, "version_no": r.version_no, "strengths": r.strengths, "weaknesses": r.weaknesses,
         "comments": r.comments, "recommendation": r.recommendation, "is_final": r.is_final,
         "overall": r.overall, "submitted_at": iso(r.submitted_at), "updated_at": iso(r.updated_at)}
    for c in CRITERIA:
        d[c] = getattr(r, c)
    if confidential:
        d["confidential_comments"] = r.confidential_comments
    return d


def paper_base(p: Paper) -> dict:
    return {"id": p.id, "paper_code": p.paper_code, "title": p.title, "abstract": p.abstract,
            "keywords": p.keywords, "co_authors": p.co_authors, "track_id": p.track_id,
            "track": p.track.name if p.track else None, "status": p.status,
            "current_version": p.current_version, "created_at": iso(p.created_at),
            "updated_at": iso(p.updated_at), "decided_at": iso(p.decided_at)}


def current_reviews(p: Paper):
    """Final reviews for the paper's current version."""
    return [r for a in p.assignments for r in a.reviews if r.is_final and r.version_no == p.current_version]


def paper_row(p: Paper) -> dict:
    d = paper_base(p)
    revs = current_reviews(p)
    scores = [r.overall for r in revs if r.overall is not None]
    d["author"] = {"id": p.author.id, "name": p.author.name, "affiliation": p.author.affiliation}
    d["reviewers_assigned"] = len(p.assignments)
    d["reviews_completed"] = sum(1 for a in p.assignments if a.status == "completed")
    d["avg_score"] = round(sum(scores) / len(scores), 2) if scores else None
    return d


def assignment_admin(a: Assignment) -> dict:
    return {"id": a.id, "status": a.status, "assigned_at": iso(a.assigned_at), "due_date": iso(a.due_date),
            "reviewer": {"id": a.reviewer.id, "name": a.reviewer.name, "email": a.reviewer.email,
                         "affiliation": a.reviewer.affiliation, "expertise": a.reviewer.expertise},
            "reviews": [review_out(r, True) for r in a.reviews]}


def decision_out(d) -> dict:
    return {"id": d.id, "version_no": d.version_no, "decision": d.decision, "comments": d.comments,
            "release_feedback": d.release_feedback, "decided_at": iso(d.decided_at),
            "decided_by": d.admin.name if d.admin else None}


def admin_paper_detail(p: Paper) -> dict:
    d = paper_row(p)
    d["author"] = {**d["author"], "email": p.author.email, "phone": p.author.phone,
                   "designation": p.author.designation}
    d["versions"] = [version_out(v) for v in p.versions]
    d["assignments"] = [assignment_admin(a) for a in p.assignments]
    d["decisions"] = [decision_out(x) for x in reversed(p.decisions)]
    return d


def author_paper_detail(p: Paper) -> dict:
    d = paper_base(p)
    d["versions"] = [version_out(v) for v in p.versions]
    d["can_revise"] = p.status in ("minor_revision", "major_revision")
    idx = {a.id: i + 1 for i, a in enumerate(p.assignments)}
    decisions = []
    for dec in p.decisions:
        item = {"id": dec.id, "version_no": dec.version_no, "decision": dec.decision,
                "decided_at": iso(dec.decided_at), "feedback_released": dec.release_feedback,
                "comments": dec.comments if dec.release_feedback else None, "reviews": []}
        if dec.release_feedback:
            for a in p.assignments:
                for r in a.reviews:
                    if r.is_final and r.version_no == dec.version_no:
                        item["reviews"].append({**review_out(r), "reviewer_label": f"Reviewer {idx[a.id]}"})
        decisions.append(item)
    d["decisions"] = list(reversed(decisions))
    return d


def reviewer_assignment_row(a: Assignment) -> dict:
    p = a.paper
    mine = next((r for r in a.reviews if r.version_no == p.current_version), None)
    return {"id": a.id, "paper_code": p.paper_code, "title": p.title, "track": p.track.name if p.track else None,
            "keywords": p.keywords, "current_version": p.current_version, "status": a.status,
            "paper_status": p.status, "assigned_at": iso(a.assigned_at), "due_date": iso(a.due_date),
            "review_state": "final" if mine and mine.is_final else ("draft" if mine else "none"),
            "overall": mine.overall if mine and mine.is_final else None,
            "recommendation": mine.recommendation if mine and mine.is_final else None,
            "submitted_at": iso(mine.submitted_at) if mine else None}

from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import (Boolean, Date, DateTime, ForeignKey, Integer, LargeBinary, String, Text,
                        UniqueConstraint, func)
from sqlalchemy.orm import Mapped, deferred, mapped_column, relationship

from .database import Base

ROLES = ("admin", "author", "reviewer")
PAPER_STATUSES = ("submitted", "under_review", "minor_revision", "major_revision", "accepted", "rejected")
DECISIONS = ("accepted", "rejected", "minor_revision", "major_revision")
RECOMMENDATIONS = ("accept", "minor_revision", "major_revision", "reject")
CRITERIA = ("originality", "technical_quality", "relevance", "clarity", "significance")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", "role", name="uq_user_email_role"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    affiliation: Mapped[Optional[str]] = mapped_column(String(255))
    designation: Mapped[Optional[str]] = mapped_column(String(120))
    expertise: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # reviewers start as "pending" and must be approved by an admin
    approval_status: Mapped[str] = mapped_column(String(20), default="approved")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Track(Base):
    __tablename__ = "tracks"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    icon: Mapped[Optional[str]] = mapped_column(String(40))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class CommitteeMember(Base):
    __tablename__ = "committee_members"
    id: Mapped[int] = mapped_column(primary_key=True)
    group: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(160))
    designation: Mapped[Optional[str]] = mapped_column(String(200))
    affiliation: Mapped[Optional[str]] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    # photo is kept in its own table so existing databases need no column migration
    photo: Mapped[Optional["MemberPhoto"]] = relationship(cascade="all, delete-orphan", uselist=False, lazy="selectin")


class MemberPhoto(Base):
    __tablename__ = "member_photos"
    member_id: Mapped[int] = mapped_column(ForeignKey("committee_members.id", ondelete="CASCADE"), primary_key=True)
    photo_type: Mapped[str] = mapped_column(String(30))
    photo_data: Mapped[bytes] = deferred(mapped_column(LargeBinary))
    rev: Mapped[int] = mapped_column(Integer, default=1)


class ImportantDate(Base):
    __tablename__ = "important_dates"
    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(200))
    event_date: Mapped[date] = mapped_column(Date)
    note: Mapped[Optional[str]] = mapped_column(String(300))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Paper(Base):
    __tablename__ = "papers"
    id: Mapped[int] = mapped_column(primary_key=True)
    paper_code: Mapped[Optional[str]] = mapped_column(String(30), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500))
    abstract: Mapped[str] = mapped_column(Text)
    keywords: Mapped[Optional[str]] = mapped_column(String(500))
    co_authors: Mapped[Optional[str]] = mapped_column(Text)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    track_id: Mapped[Optional[int]] = mapped_column(ForeignKey("tracks.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String(20), default="submitted", index=True)
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    author: Mapped[User] = relationship(foreign_keys=[author_id])
    track: Mapped[Optional[Track]] = relationship()
    versions: Mapped[List["PaperVersion"]] = relationship(
        back_populates="paper", order_by="PaperVersion.version_no", cascade="all, delete-orphan")
    assignments: Mapped[List["Assignment"]] = relationship(
        back_populates="paper", order_by="Assignment.id", cascade="all, delete-orphan")
    decisions: Mapped[List["Decision"]] = relationship(
        back_populates="paper", order_by="Decision.id", cascade="all, delete-orphan")


class PaperVersion(Base):
    __tablename__ = "paper_versions"
    __table_args__ = (UniqueConstraint("paper_id", "version_no", name="uq_paper_version"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    version_no: Mapped[int] = mapped_column(Integer)
    original_filename: Mapped[str] = mapped_column(String(255))
    stored_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paper: Mapped[Paper] = relationship(back_populates="versions")


class Assignment(Base):
    __tablename__ = "assignments"
    __table_args__ = (UniqueConstraint("paper_id", "reviewer_id", name="uq_assignment"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    assigned_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    # status of the review for the paper's CURRENT version: assigned | in_progress | completed
    status: Mapped[str] = mapped_column(String(20), default="assigned")
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    paper: Mapped[Paper] = relationship(back_populates="assignments")
    reviewer: Mapped[User] = relationship(foreign_keys=[reviewer_id])
    reviews: Mapped[List["Review"]] = relationship(
        back_populates="assignment", order_by="Review.version_no", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("assignment_id", "version_no", name="uq_review_version"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("assignments.id", ondelete="CASCADE"), index=True)
    version_no: Mapped[int] = mapped_column(Integer, default=1)
    originality: Mapped[Optional[int]] = mapped_column(Integer)
    technical_quality: Mapped[Optional[int]] = mapped_column(Integer)
    relevance: Mapped[Optional[int]] = mapped_column(Integer)
    clarity: Mapped[Optional[int]] = mapped_column(Integer)
    significance: Mapped[Optional[int]] = mapped_column(Integer)
    strengths: Mapped[Optional[str]] = mapped_column(Text)
    weaknesses: Mapped[Optional[str]] = mapped_column(Text)
    comments: Mapped[Optional[str]] = mapped_column(Text)
    confidential_comments: Mapped[Optional[str]] = mapped_column(Text)  # visible to admin only
    recommendation: Mapped[Optional[str]] = mapped_column(String(20))
    is_final: Mapped[bool] = mapped_column(Boolean, default=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    assignment: Mapped[Assignment] = relationship(back_populates="reviews")

    @property
    def overall(self) -> Optional[float]:
        vals = [getattr(self, c) for c in CRITERIA if getattr(self, c) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None


class Decision(Base):
    __tablename__ = "decisions"
    id: Mapped[int] = mapped_column(primary_key=True)
    paper_id: Mapped[int] = mapped_column(ForeignKey("papers.id", ondelete="CASCADE"), index=True)
    version_no: Mapped[int] = mapped_column(Integer, default=1)
    decision: Mapped[str] = mapped_column(String(20))
    comments: Mapped[Optional[str]] = mapped_column(Text)
    release_feedback: Mapped[bool] = mapped_column(Boolean, default=False)
    decided_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paper: Mapped[Paper] = relationship(back_populates="decisions")
    admin: Mapped[Optional[User]] = relationship(foreign_keys=[decided_by])


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    link: Mapped[Optional[str]] = mapped_column(String(300))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Registration(Base):
    """Conference registration (and UPI payment reference). Linked to a paper only when the registrant
    is presenting one - and then only an ACCEPTED paper may be registered/paid for."""
    __tablename__ = "registrations"
    id: Mapped[int] = mapped_column(primary_key=True)
    reg_code: Mapped[Optional[str]] = mapped_column(String(20), unique=True, index=True)
    paper_id: Mapped[Optional[int]] = mapped_column(ForeignKey("papers.id", ondelete="SET NULL"), unique=True)
    paper_code: Mapped[Optional[str]] = mapped_column(String(30), index=True)
    paper_title: Mapped[Optional[str]] = mapped_column(String(500))
    name: Mapped[str] = mapped_column(String(120))
    designation: Mapped[str] = mapped_column(String(120))
    organization: Mapped[str] = mapped_column(String(255))
    address: Mapped[str] = mapped_column(Text)
    mobile: Mapped[str] = mapped_column(String(30))
    email: Mapped[str] = mapped_column(String(255), index=True)
    category: Mapped[str] = mapped_column(String(80))
    amount: Mapped[int] = mapped_column(Integer, default=0)
    upi_reference: Mapped[str] = mapped_column(String(60), unique=True)
    payment_status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending | verified | rejected
    admin_note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    paper: Mapped[Optional[Paper]] = relationship()


class Speaker(Base):
    """Keynote / invited speakers shown on the home page. The photo lives in the database (not on disk) so it
    survives restarts and redeploys on hosts with an ephemeral file system."""
    __tablename__ = "speakers"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(10), default="invited", index=True)   # keynote | invited
    name: Mapped[str] = mapped_column(String(160))
    designation: Mapped[Optional[str]] = mapped_column(String(300))
    details: Mapped[Optional[str]] = mapped_column(String(600))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    photo_type: Mapped[Optional[str]] = mapped_column(String(30))
    photo_data: Mapped[Optional[bytes]] = deferred(mapped_column(LargeBinary))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

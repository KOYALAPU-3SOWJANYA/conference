"""Optional demo data:  python -m app.seed_demo
Creates 1 author, 3 approved reviewers and 3 sample papers so every dashboard has something to show.
Demo password for all demo accounts: Demo@12345"""
from pathlib import Path

from sqlalchemy import select

from .config import settings
from .database import Base, SessionLocal, engine
from .models import Paper, PaperVersion, Track, User
from .security import hash_password
from .seed import seed_defaults


def tiny_pdf(title: str) -> bytes:
    safe = title.replace("(", "[").replace(")", "]").replace("\\", "/")
    stream = f"BT /F1 20 Tf 72 720 Td ({safe}) Tj ET".encode()
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode()
    return bytes(out)


def main():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_defaults(db)
        pw = hash_password("Demo@12345")

        def user(name, email, role, **kw):
            u = db.scalar(select(User).where(User.email == email, User.role == role))
            if not u:
                u = User(name=name, email=email, role=role, password_hash=pw, approval_status="approved", **kw)
                db.add(u)
                db.flush()
            return u

        author = user("Dr. Ananya Rao", "author@demo.raise", "author", affiliation="Demo University", designation="Assistant Professor")
        user("Prof. Kiran Varma", "reviewer1@demo.raise", "reviewer", affiliation="Demo Institute of Technology", expertise="Machine learning, computer vision")
        user("Dr. Meera Iyer", "reviewer2@demo.raise", "reviewer", affiliation="Demo Research Labs", expertise="Cyber security, blockchain")
        user("Dr. Rahul Sen", "reviewer3@demo.raise", "reviewer", affiliation="Demo College of Engineering", expertise="IoT, embedded systems, energy")
        tracks = db.scalars(select(Track).order_by(Track.id)).all()
        samples = [
            ("A Lightweight Transformer for Real-Time Crop Disease Detection", "machine learning, vision", 0),
            ("Privacy-Preserving Federated Analytics for Hospital Networks", "federated learning, privacy", 5),
            ("Edge-Assisted Smart Grid Load Forecasting Using IoT Telemetry", "iot, smart grid", 3),
        ]
        for title, kw, ti in samples:
            if db.scalar(select(Paper.id).where(Paper.title == title)):
                continue
            p = Paper(title=title, keywords=kw, author_id=author.id, track_id=tracks[ti].id,
                      abstract=("This demonstration abstract describes the motivation, method, experiments and results of "
                                "the sample paper so that reviewers and administrators have realistic content to work with."))
            db.add(p)
            db.flush()
            p.paper_code = f"NISE2026-{p.id:04d}"
            rel = f"papers/{p.id}/v1_demo.pdf"
            f = Path(settings.STORAGE_DIR) / rel
            f.parent.mkdir(parents=True, exist_ok=True)
            data = tiny_pdf(f"{p.paper_code} - {title}")
            f.write_bytes(data)
            db.add(PaperVersion(paper_id=p.id, version_no=1, original_filename="demo-paper.pdf",
                                stored_path=rel, file_size=len(data), note="Initial submission"))
        db.commit()
    print("Demo data ready. Accounts (password Demo@12345): author@demo.raise, reviewer1..3@demo.raise")


if __name__ == "__main__":
    main()

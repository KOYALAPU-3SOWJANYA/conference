"""One-time: load the NISE-2026 brochure content into an ALREADY-seeded database.

    cd backend && python -m app.seed_brochure

Overwrites conference info, tracks, committees and important dates (papers & users are untouched).
Fresh databases don't need this - the same data is seeded automatically on first start.
"""
from .database import SessionLocal
from .seed import apply_brochure

if __name__ == "__main__":
    with SessionLocal() as db:
        apply_brochure(db)
    print("Brochure content loaded.")

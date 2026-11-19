"""Idempotent first-run data: default admin, conference content, tracks, committees, dates.
Everything seeded here is editable from the Admin dashboard (Conference Content)."""
import json
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .models import CommitteeMember, ImportantDate, Setting, Track, User
from .security import hash_password

DEFAULT_SETTINGS = {
    "conference_name": "NISE 2026",
    "full_name": "Intelligent Systems and Emerging Technologies",
    "subtitle": "A Three-Day National Conference",
    "tagline": "Innovating Today for an Intelligent Tomorrow",
    "start_date": "2026-12-17",
    "end_date": "2026-12-19",
    "submission_deadline": "2026-11-30",
    "venue": "GVPIHLR, Madhurawada, Visakhapatnam",
    "organizer": "School of Computer Science and Engineering & School of Sciences",
    "institution_name": "GVPIHLR",
    "contact_email": "natconf2023@gvpcew.ac.in",
    "contact_phone": "9848483016, 9963444007",
    "contact_address": "GVP College of Engineering for Women, Madhurawada, Visakhapatnam – 48, Andhra Pradesh, India",
    "contact_person": "Dr. PVS Lakshmi Jagadamba, Organizing Secretary",
    "submission_email": "etisconf@gvpce.ac.in",
    "website": "www.gvpcew.ac.in",
    "registration_link": "http://gvpwims.in/ETIS/index.php?page=register",
    "registration_fees": json.dumps([
        "Industry Sponsored | Rs. 3000",
        "Academicians | Rs. 2000",
        "Research Scholars | Rs. 1500",
        "Students | Rs. 1000",
    ]),
    "publication_note": "All accepted papers will be published in peer reviewed Journals.",
    "submissions_open": "true",
    "about_conference": (
        "The National Conference is to provide a dynamic platform for researchers, academicians, industry "
        "professionals, and students to share innovative ideas, present research findings, and explore "
        "advancements in emerging technologies. This conference focuses on the transformative potential of "
        "Artificial Intelligence, Generative AI, Intelligent Systems, Robotics, IoT, Data Science, Cloud "
        "Computing, Cybersecurity, Healthcare Technologies, and Next-generation Computing paradigms. It aims "
        "to foster interdisciplinary collaboration, encourage innovation and to promote technology-driven "
        "solutions in real-world challenges."),
    "about_institution": (
        "Established in 1988, Gayatri Vidya Parishad (GVP) stands as a cornerstone of educational excellence in "
        "Visakhapatnam, Andhra Pradesh. Under the visionary leadership of eminent academicians and educational "
        "pioneers, GVP has cultivated a rich legacy, comprising a degree and post-graduation college, three "
        "engineering colleges (including one dedicated to women), and a medical college. GVP has also "
        "established and collaborated on various centres dedicated to scientific research, policy studies, "
        "skill development, medical imaging, integrated tribal development, and e-mobility.\n\n"
        "Now, charting a course toward greater horizons, GVP presents the Gayatri Vidya Parishad Institute of "
        "Higher Learning and Research (GVPIHLR), an ambitious undertaking set to redefine educational standards, "
        "research frontiers, and seeks to preserve, promote, and propagate traditional Indian education systems "
        "within the context of modern technological advancements and pedagogical innovations with a special "
        "focus on Medical Technology. Its primary objective is to disseminate knowledge across diverse academic "
        "domains, encompassing Arts, Commerce & Management, Science, Engineering & Technology. This mission is "
        "driven by a resolute commitment to tailor education to effectively address global challenges while also "
        "addressing the intricacies of local issues.\n\n"
        "GVPIHLR is a University that is distinct in its approach to education. Inspired by the ancient Indian "
        "tradition of Chauthur Sashti Kalas (64 arts) and aligned with the National Education Policy 2020, "
        "GVPIHLR will integrate STEAM (Science, Technology, Engineering, Arts and Mathematics) with Humanities "
        "and Management. This unique interdisciplinary and transdisciplinary approach aims to cultivate students "
        "to grasp the interconnectedness of knowledge, think integratively, meet the needs of a globalized "
        "world, contribute to sustainable development and embrace Indian knowledge systems."),
    "objectives": json.dumps([
        "To provide a platform to share present knowledge and innovative ideas in emerging technologies.",
        "To promote interdisciplinary research among academia, industry and research organizations to develop innovative solutions.",
        "To enable researchers & students to present their work, explore emerging trends and identify future research areas.",
        "To develop healthcare systems through emerging technologies.",
    ]),
    "guidelines": json.dumps([
        "Submit the full length paper in IEEE format.",
        "Submit original, unpublished work that is not under review elsewhere.",
        "Papers must be submitted as a single PDF file (maximum 10 MB).",
        "Remove author names and affiliations from the PDF – reviews are double-blind.",
        "Select the technical track that best fits your work when submitting.",
        "Revised papers must be uploaded from your dashboard when a revision is requested.",
        "All accepted papers will be published in peer reviewed Journals.",
        "The decision of the organising committee is final.",
    ]),
}

# Scope of the conference (shown as "Technical tracks")
DEFAULT_TRACKS = [
    ("Artificial Intelligence and Generative AI", "Artificial Intelligence and Generative AI.", "brain"),
    ("Intelligent Systems and Autonomous Technologies", "Intelligent systems and autonomous technologies.", "flask"),
    ("Robotics, IoT and Industry 5.0", "Robotics, IoT and Industry 5.0.", "cpu"),
    ("Data Science, Cloud and Cybersecurity", "Data Science, Cloud Computing and Cybersecurity.", "shield"),
    ("Healthcare Technologies and Smart Applications", "Healthcare technologies and smart applications.", "heart"),
    ("Emerging Computing Paradigms", "Next-generation computing paradigms.", "cloud"),
]

# group -> "Name, Designation, Affiliation" lines (straight from the brochure)
COMMITTEE_DATA = [
    ("Chief Patrons", [
        "Prof. Dr. Ing. P. S. Rao, Chancellor, GVPIHLR",
        "Sri. D. Dakshina Murthy, President, Gayatri Vidya Parishad",
    ]),
    ("Patrons", [
        "Dr. K. P. R. Sastry, Vice-President, GVPIHLR",
        "Dr. B. Subba Rao, Vice-President, GVPIHLR",
        "Prof. P. Somaraju, Secretary, GVPIHLR",
        "Prof. P. Rajaganapathi, Treasurer, GVPIHLR",
        "Sri V. R. K. S. Siva Prasad, Member, GVPIHLR",
        "Sri A. S. N. Prasad, Member, GVPIHLR",
        "Prof. P. V. Sarma, Member, GVPIHLR",
        "Prof. V. S. R. Krishna Prasad, Member, GVPIHLR",
    ]),
    ("Co-Patrons", [
        "Prof. Dr. P. S. Avadhani, Vice-Chancellor, GVPIHLR",
        "Prof. Dr. P Venkata Rao, Registrar, GVPIHLR",
    ]),
    ("Advisory Committee", [
        "Prof. Dr. A. Bala Koteswara Rao, Pro-Chancellor, GVPIHLR",
        "Prof. Dr. G. Sudheer, Dean Academics & Planning, GVPIHLR",
        "Prof. Dr. R K Goswami, Principal, GVPCEW",
        "Prof. Dr. P. Krishna Subba Rao, Principal, GVPCE(A)",
        "Prof. K. S. Bose, Principal, GVPCDPGDC",
        "Prof. Dr. A. Syamsundar, Vice-Principal, GVPCE(A)",
        "Prof. Dr. C Srinivas, CoE, GVPIHLR",
        "Prof. M. Shashi, Professor, GVPIHLR",
        "Prof. Dr. G. Sitarama Brahmam, Professor, GVPIHLR",
        "Prof. P. Prapoorna Roja, Professor, GVPIHLR",
        "Prof. Dr. C. V. Guru Rao, Professor, GVPIHLR",
        "Prof. D. Saritha, Professor, GVPIHLR",
        "Prof. N Venu Gopal, Professor, GVPIHLR",
    ]),
    ("Invited Speakers", [
        "Prof. Dr. Venu Govinda Rajulu",
        "Prof. Aditya Shiva Varma",
        "Prof. P Krishna Saatry",
        "Prof. P Srinivasa Murthy",
        "Prof. DVLN Somayajulu",
        "Prof. ASN Chakravarthy",
    ]),
    ("Chairs", [
        "Dr. K. B. Madhuri, Dean School of Computer Science and Engineering, GVPIHLR",
        "Dr. I.S. Pallavi, Dean School of Sciences, GVPIHLR",
    ]),
    ("Organizing Secretaries", [
        "Dr. PVS Lakshmi Jagadamba, Professor, HoD, CSE, GVPIHLR",
        "Dr. N. V. Ramana Murty, HoD, CSE(AI&ML), GVPIHLR",
    ]),
    ("Secretaries", [
        "Dr. D. K. Bebarta, Assoc. Prof., HoD, CSE(AI&ML), GVPCEW",
        "Dr. M. Bhanu Sridhar, Assoc. Prof., HoD, IT, GVPCEW",
        "Dr. D. Uma Devi, Prof., HoD, CSE(AI&ML), GVPCOE",
        "Dr. Y. Anuradha, Prof., HoD, CSE(Data Science), GVPCOE",
        "Dr. G. R. S. Murthy, Prof., HoD, CSE, GVPGDPGC(A)",
    ]),
    ("Organizing Committee Members", [
        "Dr. Bh. Padma, Professor, GVPIHLR",
        "Dr. D. Chandravathi, Assoc. Prof., GVPIHLR",
        "Dr. G. Satya Keerthi, Assoc. Prof., GVPIHLR",
        "Dr. Ch. Sitha Kumari, Assoc. Prof., GVPIHLR",
        "Dr. K. K. Sandhya Rani, Assoc. Prof., GVPIHLR",
        "Dr. V. Lakshmana Rao, Assoc. Prof., GVPIHLR",
        "Dr. S. Sumahasan, Assoc. Prof., GVPIHLR",
        "Dr. D. Indu, Assoc. Prof., GVPIHLR",
        "Dr. S. Kranthi Kiran, Assoc. Prof., GVPIHLR",
        "Mr. G. Kalyan Chakravarthy, Asst. Prof., GVPIHLR",
        "Dr. D. S. S. N. Raju, Asst. Prof., GVPIHLR",
        "Mrs. P. Ratna Pavani, Asst. Prof., GVPIHLR",
        "Mrs. V. Lakshmi, Asst. Prof., GVPIHLR",
        "Mrs. Y. Vijaya Lakshmi, Asst. Prof., GVPIHLR",
        "Mrs. R. Archana, Asst. Prof., GVPIHLR",
    ]),
    ("Technical Program Committee", [
        "Dr. K. Purushottam Naidu, Assoc. Prof., GVPIHLR",
        "Mr. G. Appajee, Asst. Prof., GVPIHLR",
        "Mr. D. V. Murali Krishna, Network Admin, GVPCDPGDC",
    ]),
]

DEFAULT_DATES = [
    ("Submission of full length paper", date(2026, 11, 30), "Submit your full length paper (IEEE format) from the Author dashboard"),
    ("Acceptance of full length paper", date(2026, 12, 7), ""),
    ("Last date of registration", date(2026, 12, 12), ""),
    ("NISE 2026 – Day 1", date(2026, 12, 17), "Conference begins"),
    ("NISE 2026 – Day 3", date(2026, 12, 19), "Conference concludes"),
]


def split_person(line: str):
    """'Dr. X, Assoc. Prof., HoD, GVPIHLR' -> (name, designation, affiliation)."""
    parts = [" ".join(p.replace("\ufeff", "").split()) for p in line.split(",")]
    parts = [p for p in parts if p]
    if len(parts) == 1:
        return parts[0], "", ""
    if len(parts) == 2:
        return parts[0], parts[1], ""
    return parts[0], ", ".join(parts[1:-1]), parts[-1]


def committee_rows():
    n = 0
    for group, people in COMMITTEE_DATA:
        for line in people:
            n += 1
            name, desig, aff = split_person(line)
            yield CommitteeMember(group=group, name=name, designation=desig, affiliation=aff, sort_order=n)


def apply_brochure(db: Session) -> None:
    """Overwrite conference content with the NISE-2026 brochure data (used by `python -m app.seed_brochure`).
    Existing papers/users are untouched; a track that already has papers is kept so nothing breaks."""
    from .models import Paper
    for k, v in DEFAULT_SETTINGS.items():
        if k == "submissions_open" and db.get(Setting, k):
            continue
        row = db.get(Setting, k)
        if row:
            row.value = v
        else:
            db.add(Setting(key=k, value=v))

    wanted = {n for n, _, _ in DEFAULT_TRACKS}
    existing = {t.name: t for t in db.scalars(select(Track))}
    for i, (n, d, ic) in enumerate(DEFAULT_TRACKS):
        t = existing.get(n)
        if t:
            t.description, t.icon, t.sort_order = d, ic, i
        else:
            db.add(Track(name=n, description=d, icon=ic, sort_order=i))
    for name, t in existing.items():
        if name not in wanted and not db.scalar(select(func.count(Paper.id)).where(Paper.track_id == t.id)):
            db.delete(t)
        elif name not in wanted:
            t.sort_order = 100 + t.sort_order   # keep, but list after the new areas

    for m in db.scalars(select(CommitteeMember)):
        db.delete(m)
    for d in db.scalars(select(ImportantDate)):
        db.delete(d)
    db.flush()
    db.add_all(list(committee_rows()))
    for i, (label, d, note) in enumerate(DEFAULT_DATES):
        db.add(ImportantDate(label=label, event_date=d, note=note, sort_order=i))
    db.commit()


def seed_defaults(db: Session) -> None:
    if not db.scalar(select(func.count()).select_from(Setting)):
        for k, v in DEFAULT_SETTINGS.items():
            db.add(Setting(key=k, value=v))
    if not db.scalar(select(func.count()).select_from(Track)):
        for i, (n, d, ic) in enumerate(DEFAULT_TRACKS):
            db.add(Track(name=n, description=d, icon=ic, sort_order=i))
    if not db.scalar(select(func.count()).select_from(CommitteeMember)):
        db.add_all(list(committee_rows()))
    if not db.scalar(select(func.count()).select_from(ImportantDate)):
        for i, (label, d, note) in enumerate(DEFAULT_DATES):
            db.add(ImportantDate(label=label, event_date=d, note=note, sort_order=i))
    if not db.scalar(select(User.id).where(User.role == "admin")):
        db.add(User(name=settings.ADMIN_NAME, email=settings.ADMIN_EMAIL.lower(), role="admin",
                    password_hash=hash_password(settings.ADMIN_PASSWORD), approval_status="approved"))
    db.commit()

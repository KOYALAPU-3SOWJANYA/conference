export type Role = "admin" | "author" | "reviewer";
export type PaperStatus = "submitted" | "under_review" | "minor_revision" | "major_revision" | "accepted" | "rejected";
export type Recommendation = "accept" | "minor_revision" | "major_revision" | "reject";

export interface User {
  id: number; name: string; email: string; role: Role; phone?: string | null; affiliation?: string | null;
  designation?: string | null; expertise?: string | null; is_active: boolean; approval_status: string; created_at: string;
  papers?: number; assigned?: number; completed?: number;
}
export interface Track { id: number; name: string; description?: string | null; icon?: string | null; sort_order: number }
export interface Member { id: number; group: string; name: string; designation?: string | null; affiliation?: string | null; sort_order: number; photo_url?: string | null }
export interface ImportantDate { id: number; label: string; event_date: string; note?: string | null; sort_order: number }
export interface SiteSettings {
  conference_name: string; full_name: string; subtitle: string; tagline: string; start_date: string; end_date: string;
  submission_deadline: string; venue: string; organizer: string; institution_name: string; contact_email: string;
  contact_phone: string; contact_address: string; submissions_open: boolean; about_conference: string;
  about_institution: string; objectives: string[]; guidelines: string[];
  contact_person: string; submission_email: string; submission_link: string; website: string; registration_link: string;
  registration_fees: string[]; publication_note: string;
}
export interface SiteData { settings: SiteSettings; tracks: Track[]; committees: Member[]; dates: ImportantDate[] }

export interface Version { version_no: number; filename: string; size: number; note?: string | null; uploaded_at: string }
export interface Review {
  id: number; version_no: number; originality: number | null; technical_quality: number | null; relevance: number | null;
  clarity: number | null; significance: number | null; strengths?: string | null; weaknesses?: string | null;
  comments?: string | null; confidential_comments?: string | null; recommendation?: Recommendation | null;
  is_final: boolean; overall: number | null; submitted_at?: string | null; updated_at?: string; reviewer_label?: string;
}
export interface Paper {
  id: number; paper_code: string; title: string; abstract: string; keywords?: string | null; co_authors?: string | null;
  track_id: number | null; track: string | null; status: PaperStatus; current_version: number; created_at: string;
  updated_at: string; decided_at?: string | null; can_revise?: boolean;
  author?: { id: number; name: string; affiliation?: string | null; email?: string; phone?: string | null; designation?: string | null };
  reviewers_assigned?: number; reviews_completed?: number; avg_score?: number | null;
}
export interface AdminAssignment {
  id: number; status: string; assigned_at: string; due_date?: string | null;
  reviewer: { id: number; name: string; email: string; affiliation?: string | null; expertise?: string | null };
  reviews: Review[];
}
export interface DecisionRec { id: number; version_no: number; decision: PaperStatus; comments?: string | null; release_feedback: boolean; decided_at: string; decided_by?: string | null }
export interface AdminPaper extends Paper { versions: Version[]; assignments: AdminAssignment[]; decisions: DecisionRec[] }
export interface AuthorDecision { id: number; version_no: number; decision: PaperStatus; decided_at: string; feedback_released: boolean; comments?: string | null; reviews: Review[] }
export interface AuthorPaper extends Paper { versions: Version[]; decisions: AuthorDecision[] }
export interface ReviewerAssignment {
  id: number; paper_code: string; title: string; track: string | null; keywords?: string | null; current_version: number;
  status: string; paper_status: string; assigned_at: string; due_date?: string | null; review_state: "none" | "draft" | "final";
  overall: number | null; recommendation: Recommendation | null; submitted_at?: string | null;
  abstract?: string; versions?: Version[]; review?: Review | null; previous_reviews?: Review[];
}
export interface Notice { id: number; title: string; message: string; link?: string | null; is_read: boolean; created_at: string }

export const CRITERIA: { key: "originality" | "technical_quality" | "relevance" | "clarity" | "significance"; label: string; hint: string }[] = [
  { key: "originality", label: "Originality", hint: "Novelty of the idea and contribution" },
  { key: "technical_quality", label: "Technical Quality", hint: "Soundness of method, experiments and analysis" },
  { key: "relevance", label: "Relevance", hint: "Fit with the selected track and conference theme" },
  { key: "clarity", label: "Clarity & Presentation", hint: "Organisation, writing and figures" },
  { key: "significance", label: "Significance", hint: "Potential impact on the field" },
];

export interface Registration {
  id: number; reg_code: string; paper_id: number | null; paper_code: string | null; paper_title: string | null; paper_status: string | null;
  name: string; designation: string; organization: string; address: string; mobile: string; email: string; category: string;
  amount: number; upi_reference: string; payment_status: "pending" | "verified" | "rejected"; admin_note?: string | null; created_at: string;
}

export interface Speaker { id: number; kind: "keynote" | "invited"; name: string; designation: string; details: string; sort_order: number; photo_url: string | null }

import { Bell, BookOpenCheck, CalendarCheck, ClipboardList, CreditCard, FilePlus2, Mic, FileText, History, LayoutDashboard, LibraryBig, Mail, Settings2, UserCog, UserRound, Users, UsersRound } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout, { NavItem } from "./components/DashboardLayout";
import PublicLayout from "./components/PublicLayout";
import { RequireRole } from "./lib/auth";
import AuthPage from "./pages/auth/AuthPage";
import Home from "./pages/public/Home";
import { About, Committees, Contact, Dates, Guidelines, Institution, Objectives, Registration, Tracks } from "./pages/public/Pages";
import Notifications from "./pages/shared/Notifications";
import Profile from "./pages/shared/Profile";
import AdminOverview from "./pages/admin/Overview";
import AdminPapers from "./pages/admin/Papers";
import AdminPaperDetail from "./pages/admin/PaperDetail";
import AdminUsers from "./pages/admin/Users";
import Progress from "./pages/admin/Progress";
import Content from "./pages/admin/Content";
import Messages from "./pages/admin/Messages";
import Registrations from "./pages/admin/Registrations";
import AdminSpeakers from "./pages/admin/Speakers";
import AuthorOverview from "./pages/author/Overview";
import AuthorPapers from "./pages/author/Papers";
import Submit from "./pages/author/Submit";
import AuthorPaperDetail from "./pages/author/PaperDetail";
import AuthorHistory from "./pages/author/History";
import ReviewerOverview from "./pages/reviewer/Overview";
import Assignments from "./pages/reviewer/Assignments";
import ReviewPaper from "./pages/reviewer/ReviewPaper";
import ReviewerHistory from "./pages/reviewer/History";

const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true }, { to: "/admin/papers", label: "Papers", icon: FileText },
  { to: "/admin/progress", label: "Review Progress", icon: ClipboardList }, { to: "/admin/reviewers", label: "Reviewers", icon: UserCog },
  { to: "/admin/authors", label: "Authors", icon: Users }, { to: "/admin/content", label: "Conference Content", icon: Settings2 },
  { to: "/admin/speakers", label: "Speakers & Committees", icon: Mic }, { to: "/admin/registrations", label: "Registrations", icon: CreditCard }, { to: "/admin/messages", label: "Messages", icon: Mail }, { to: "/admin/notifications", label: "Notifications", icon: Bell }, { to: "/admin/profile", label: "Profile", icon: UserRound },
];
const AUTHOR_NAV: NavItem[] = [
  { to: "/author", label: "Dashboard", icon: LayoutDashboard, end: true }, { to: "/author/submit", label: "Submit Paper", icon: FilePlus2 },
  { to: "/author/papers", label: "My Papers", icon: LibraryBig }, { to: "/author/history", label: "History", icon: History },
  { to: "/author/notifications", label: "Notifications", icon: Bell }, { to: "/author/profile", label: "Profile", icon: UserRound },
];
const REVIEWER_NAV: NavItem[] = [
  { to: "/reviewer", label: "Dashboard", icon: LayoutDashboard, end: true }, { to: "/reviewer/assignments", label: "Assigned Papers", icon: BookOpenCheck },
  { to: "/reviewer/history", label: "Review History", icon: CalendarCheck }, { to: "/reviewer/notifications", label: "Notifications", icon: Bell }, { to: "/reviewer/profile", label: "Profile", icon: UserRound },
];

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} /><Route path="about" element={<About />} /><Route path="institution" element={<Institution />} />
        <Route path="objectives" element={<Objectives />} /><Route path="tracks" element={<Tracks />} /><Route path="committees" element={<Committees />} />
        <Route path="dates" element={<Dates />} /><Route path="registration" element={<Registration />} /><Route path="guidelines" element={<Guidelines />} /><Route path="contact" element={<Contact />} />
      </Route>

      <Route path="/author/login" element={<AuthPage role="author" />} />
      <Route path="/reviewer/login" element={<AuthPage role="reviewer" />} />
      <Route path="/admin/login" element={<AuthPage role="admin" />} />

      <Route path="/admin" element={<RequireRole role="admin"><DashboardLayout role="admin" nav={ADMIN_NAV} /></RequireRole>}>
        <Route index element={<AdminOverview />} /><Route path="papers" element={<AdminPapers />} /><Route path="papers/:id" element={<AdminPaperDetail />} />
        <Route path="progress" element={<Progress />} /><Route path="reviewers" element={<AdminUsers role="reviewer" />} /><Route path="authors" element={<AdminUsers role="author" />} />
        <Route path="content" element={<Content />} /><Route path="speakers" element={<AdminSpeakers />} /><Route path="registrations" element={<Registrations />} /><Route path="messages" element={<Messages />} /><Route path="notifications" element={<Notifications />} /><Route path="profile" element={<Profile />} />
      </Route>
      <Route path="/author" element={<RequireRole role="author"><DashboardLayout role="author" nav={AUTHOR_NAV} /></RequireRole>}>
        <Route index element={<AuthorOverview />} /><Route path="submit" element={<Submit />} /><Route path="papers" element={<AuthorPapers />} /><Route path="papers/:id" element={<AuthorPaperDetail />} />
        <Route path="history" element={<AuthorHistory />} /><Route path="notifications" element={<Notifications />} /><Route path="profile" element={<Profile />} />
      </Route>
      <Route path="/reviewer" element={<RequireRole role="reviewer"><DashboardLayout role="reviewer" nav={REVIEWER_NAV} /></RequireRole>}>
        <Route index element={<ReviewerOverview />} /><Route path="assignments" element={<Assignments />} /><Route path="assignments/:id" element={<ReviewPaper />} />
        <Route path="history" element={<ReviewerHistory />} /><Route path="notifications" element={<Notifications />} /><Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

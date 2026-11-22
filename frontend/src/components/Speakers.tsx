import { Mic2, Quote } from "lucide-react";
import { API_BASE } from "../lib/api";
import { useFetch } from "../lib/hooks";
import { Speaker } from "../lib/types";

const TITLES = /^(prof|dr|mr|mrs|ms|sri|smt|ing)\.?$/i;
export const initials = (name: string) =>
  name.split(/\s+/).filter((w) => w && !TITLES.test(w) && /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

// Order of committee groups (whatever the admin typed: "Patron", "Patrons", "Chief Patrons"...). Unknown groups keep their own order after these.
const GROUP_RANK: [RegExp, number][] = [[/chief/i, 0], [/co-?\s?patron/i, 2], [/patron/i, 1], [/advis/i, 3], [/chair/i, 4], [/organi[sz]ing\s+secretar/i, 5], [/secretar/i, 6], [/member/i, 7], [/technical|program/i, 8]];
export const groupRank = (g: string) => GROUP_RANK.find(([re]) => re.test(g))?.[1] ?? 50;
export const isPatronGroup = (g: string) => /patron|advis/i.test(g);   // brochure column 1; everything else = Organizing Committee
export const STANDARD_GROUPS = ["Chief Patron", "Patrons", "Co-Patrons", "Advisory Committee", "Chairs", "Organizing Secretaries", "Secretaries", "Members", "Technical Program Committee"];

/** Round/square speaker photo; falls back to gradient initials when there is no photo. */
export function SpeakerPhoto({ s, className = "h-28 w-28", rounded = "rounded-2xl" }: { s: Pick<Speaker, "name" | "photo_url">; className?: string; rounded?: string }) {
  return s.photo_url
    ? <img src={s.photo_url.startsWith("blob:") ? s.photo_url : API_BASE + s.photo_url} alt={s.name} loading="lazy" className={`${className} ${rounded} shrink-0 bg-slate-100 object-cover object-top shadow-md ring-4 ring-white`} />
    : <div className={`${className} ${rounded} grid shrink-0 place-items-center bg-gradient-to-br from-royal to-plum font-display text-3xl font-bold text-white shadow-md ring-4 ring-white`}>{initials(s.name)}</div>;
}

export default function SpeakersSection() {
  const { data } = useFetch<Speaker[]>("/public/speakers");
  const keynote = (data ?? []).filter((s) => s.kind === "keynote");
  const invited = (data ?? []).filter((s) => s.kind === "invited");
  if (!keynote.length && !invited.length) return null;
  return (
    <section className="bg-gradient-to-b from-mist to-white py-20">
      <div className="section">
        {keynote.length > 0 && (<>
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-widest text-royal">Keynote address</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Our keynote speaker{keynote.length > 1 ? "s" : ""}</h2></div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6">
            {keynote.map((s) => (
              <div key={s.id} className="card relative overflow-hidden p-6 sm:p-8">
                <Quote className="absolute right-6 top-6 h-16 w-16 text-blue-50" />
                <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
                  <SpeakerPhoto s={s} className="h-40 w-40" rounded="rounded-3xl" />
                  <div><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-royal"><Mic2 className="h-3.5 w-3.5" />Keynote</span>
                    <h3 className="mt-3 text-2xl font-bold text-navy md:text-3xl">{s.name}</h3>
                    {s.designation && <p className="mt-2 font-medium text-slate-700">{s.designation}</p>}
                    {s.details && <p className="mt-1 text-slate-500">{s.details}</p>}</div>
                </div>
              </div>))}
          </div>
        </>)}
        {invited.length > 0 && (<>
          <div className={`mx-auto max-w-2xl text-center ${keynote.length ? "mt-20" : ""}`}><p className="text-sm font-semibold uppercase tracking-widest text-royal">Invited speakers</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Learn from leading voices</h2></div>
          <div className="stagger mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {invited.map((s) => (
              <div key={s.id} className="card card-hover flex flex-col items-center p-6 text-center">
                <SpeakerPhoto s={s} className="h-32 w-32" />
                <h3 className="mt-4 text-base font-bold text-navy">{s.name}</h3>
                {s.designation && <p className="mt-1 text-sm text-slate-600">{s.designation}</p>}
                {s.details && <p className="mt-1 text-xs text-slate-400">{s.details}</p>}
              </div>))}
          </div>
        </>)}
      </div>
    </section>);
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, BadgeDollarSign, BarChart3, Bell,
  Cake, CalendarDays, Check, ChevronRight, CircleHelp, Clock3,
  Coffee, Download, Ellipsis, Flower2, Leaf, LoaderCircle, MapPin, Menu, Plus, Search,
  Settings2, ShoppingBag, Sparkles, Trash2, Undo2, Users, Utensils, Wallet, X,
} from "lucide-react";
import BloomScene from "@/components/BloomScene";
import UploadDropzone from "@/components/UploadDropzone";
import MotionEffects, { CountUp } from "@/components/MotionEffects";

type Employee = { name: string; team: string; initials: string; active: boolean; lunch: "Joining" | "Not joining" | "Pending" };
type Section = "Overview" | "Team" | "Lunch" | "Food & AI" | "Finance" | "Events" | "Reports";
type EventKind = "Birthday" | "Office event";
type OfficeEvent = { id: string; title: string; date: string; kind: EventKind; note: string };

const initialEvents: OfficeEvent[] = [
  { id: "ev-lina-birthday", title: "Lina’s birthday", date: "2026-11-24", kind: "Birthday", note: "People team" },
  { id: "ev-team-breakfast", title: "Monthly team breakfast", date: "2026-11-28", kind: "Office event", note: "Kitchen & lounge" },
  { id: "ev-year-end", title: "Year-end gathering", date: "2026-12-12", kind: "Office event", note: "Save the date" },
];

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const parseDay = (iso: string) => new Date(`${iso}T00:00:00`);
const dateParts = (iso: string) => { const date = parseDay(iso); return { day: String(date.getDate()), month: MONTHS[date.getMonth()], year: String(date.getFullYear()) }; };
const todayIso = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const daysUntil = (iso: string) => Math.round((parseDay(iso).getTime() - parseDay(todayIso()).getTime()) / 86400000);
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const initialEmployees: Employee[] = [
  { name: "Maya Hassan", team: "Design", initials: "MH", active: true, lunch: "Joining" },
  { name: "Omar Khalid", team: "Operations", initials: "OK", active: true, lunch: "Joining" },
  { name: "Lina Farouk", team: "People", initials: "LF", active: true, lunch: "Pending" },
  { name: "Zayd Rahman", team: "Engineering", initials: "ZR", active: true, lunch: "Not joining" },
  { name: "Sara Nasser", team: "Finance", initials: "SN", active: true, lunch: "Joining" },
  { name: "Noah Aziz", team: "Engineering", initials: "NA", active: true, lunch: "Pending" },
];

const navItems: { label: Section; icon: typeof Flower2 }[] = [
  { label: "Overview", icon: Flower2 }, { label: "Team", icon: Users },
  { label: "Lunch", icon: Utensils }, { label: "Food & AI", icon: Sparkles },
  { label: "Finance", icon: Wallet }, { label: "Events", icon: CalendarDays },
  { label: "Reports", icon: BarChart3 },
];

const restaurants = [
  { name: "The Daily", cuisine: "Modern Middle Eastern", rating: "4.8", price: "AED 45–75", color: "peach" },
  { name: "Jun's", cuisine: "Asian fusion", rating: "4.7", price: "AED 55–90", color: "sage" },
  { name: "Nolu's", cuisine: "California Afghan", rating: "4.6", price: "AED 40–70", color: "yellow" },
];

function Metric({ label, value, note, icon: Icon, tone, trend }: { label: string; value: string; note: string; icon: typeof Users; tone: string; trend?: string }) {
  return <article className="metric"><div className={`metric-icon ${tone}`}><Icon size={17} strokeWidth={1.8} /></div><div className="metric-copy"><span>{label}</span><strong><CountUp value={value} /></strong><small>{trend && <em><ArrowUpRight size={12} />{trend}</em>}{note}</small></div></article>;
}

export default function Dashboard() {
  const [section, setSection] = useState<Section>("Overview");
  const [employees, setEmployees] = useState(initialEmployees);
  const [events, setEvents] = useState(initialEvents);
  const [eventDate, setEventDate] = useState("");
  const [eventKind, setEventKind] = useState<EventKind>("Office event");
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ id: number; text: string; undo?: () => void } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState("Connecting to office data...");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState(3);
  const [modal, setModal] = useState<"employee" | "event" | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadEmployees() {
      const readLocal = <T,>(key: string, fallback: T): T => {
        try {
          const saved = window.localStorage.getItem(key);
          if (saved) { const parsed = JSON.parse(saved) as T; if (Array.isArray(parsed)) return parsed; }
        } catch { try { window.localStorage.removeItem(key); } catch { /* storage blocked */ } }
        return fallback;
      };
      const localEmployees = readLocal("bloom-employees", initialEmployees);
      const localEvents = readLocal("bloom-events", initialEvents);
      if (active) setEvents(localEvents);
      try {
        const response = await fetch("/api/records?kind=employees");
        if (!response.ok) throw new Error("Supabase unavailable");
        const result = await response.json() as { records: { id: string; data: { key?: string; employees?: Employee[]; events?: OfficeEvent[] } }[] };
        const dashboardRecord = result.records.find((record) => record.data.key === "dashboard");
        if (dashboardRecord) {
          if (active && Array.isArray(dashboardRecord.data.employees)) setEmployees(dashboardRecord.data.employees);
          if (active && Array.isArray(dashboardRecord.data.events)) setEvents(dashboardRecord.data.events);
          if (active) setRecordId(dashboardRecord.id);
        } else {
          const created = await fetch("/api/records?kind=employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { key: "dashboard", employees: localEmployees, events: localEvents } }) });
          if (!created.ok) throw new Error("Could not initialize Supabase data");
          const result = await created.json() as { record: { id: string } };
          if (active) setRecordId(result.record.id);
        }
        if (active) setStorageStatus("Supabase connected");
      } catch {
        if (active) {
          setEmployees(localEmployees);
          setStorageStatus("Local preview · connect Supabase to sync");
        }
      } finally {
        if (active) setHydrated(true);
      }
    }
    void loadEmployees();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem("bloom-employees", JSON.stringify(employees));
      window.localStorage.setItem("bloom-events", JSON.stringify(events));
    } catch { /* storage blocked: keep working in memory */ }
    if (!recordId) return;
    const timer = window.setTimeout(() => {
      void fetch(`/api/records?kind=employees&id=${recordId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { key: "dashboard", employees, events } }) })
        .then((response) => { if (!response.ok) throw new Error("Sync failed"); setStorageStatus("Supabase connected"); })
        .catch(() => setStorageStatus("Sync issue · saved on this device"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [employees, events, hydrated, recordId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeCount = employees.filter((person) => person.active).length;
  const joiningCount = employees.filter((person) => person.active && person.lunch === "Joining").length;
  const pendingCount = employees.filter((person) => person.active && person.lunch === "Pending").length;
  const visibleEmployees = employees.filter((person) => `${person.name} ${person.team}`.toLowerCase().includes(query.toLowerCase()));

  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingEvents = sortedEvents.filter((event) => daysUntil(event.date) >= 0);
  const nextEvent = upcomingEvents[0];

  function showToast(text: string, undo?: () => void) {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, text, undo }));
  }

  function openModal(kind: "employee" | "event") {
    setNameInput("");
    setFormError("");
    setEventDate(todayIso());
    setEventKind("Office event");
    setModal(kind);
  }

  function closeModal() {
    setModal(null);
    setFormError("");
  }

  function addRecord() {
    const name = nameInput.trim();
    if (!name) { setFormError(modal === "employee" ? "Please enter the employee’s name." : "Please give the event a name."); return; }
    if (modal === "employee") {
      if (employees.some((person) => person.name.toLowerCase() === name.toLowerCase())) { setFormError(`${name} is already on the team.`); return; }
      const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
      setEmployees((current) => [...current, { name, team: "General", initials, active: true, lunch: "Pending" }]);
      setSection("Team");
      showToast(`${name} added to the team`);
    } else if (modal === "event") {
      if (!eventDate) { setFormError("Please pick a date."); return; }
      setEvents((current) => [...current, { id: newId(), title: name, date: eventDate, kind: eventKind, note: eventKind === "Birthday" ? "Let’s make it lovely" : "Office event" }]);
      setSection("Events");
      showToast(`“${name}” added to the calendar`);
    }
    setNameInput("");
    setFormError("");
    setModal(null);
  }

  function deleteEmployee(person: Employee) {
    const snapshot = employees;
    setEmployees((current) => current.filter((entry) => entry !== person));
    showToast(`${person.name} removed`, () => setEmployees(snapshot));
  }

  function deleteEvent(event: OfficeEvent) {
    const snapshot = events;
    setEvents((current) => current.filter((entry) => entry.id !== event.id));
    showToast(`“${event.title}” deleted`, () => setEvents(snapshot));
  }

  async function askFoodAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiLoading(true);
    setAiError("");
    setAiResult("");
    try {
      const response = await fetch("/api/food-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: aiPrompt }) });
      const result = await response.json() as { recommendation?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Recommendations are unavailable.");
      setAiResult(result.recommendation ?? "");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Recommendations are unavailable.");
    } finally {
      setAiLoading(false);
    }
  }

  const pageTitles: Record<Section, string> = {
    Overview: "Good morning, Maya", Team: "Your people", Lunch: "This week’s lunch",
    "Food & AI": "A better lunch, together", Finance: "Office fund", Events: "Moments worth celebrating", Reports: "Reports & exports",
  };

  return (
    <div className="app-shell">
      <MotionEffects watch={section} />
      <div className="ambient" aria-hidden="true"><span className="blob blob-a" /><span className="blob blob-b" /><span className="blob blob-c" /></div>
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Flower2 size={21} strokeWidth={1.8} /></div><span>bloom<span className="brand-light">connect</span></span><button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="workspace-label">OFFICE WORKSPACE</div>
        <nav className="nav-list" aria-label="Management modules">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${section === label ? "active" : ""}`} onClick={() => { setSection(label); setMobileNav(false); }}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === "Lunch" && <span className="nav-count">{pendingCount}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="fund-mini"><div className="fund-mini-head"><span>Office fund</span><BadgeDollarSign size={16} /></div><strong><CountUp value="AED 8,420" /></strong><div className="fund-progress"><span /></div><small>68% of monthly target</small></div>
          <button className="nav-item"><Settings2 size={17} /><span>Workspace settings</span></button>
          <div className="manager-profile"><div className="avatar avatar-manager">MA</div><div><strong>Maya Alami</strong><small>Office manager</small></div><Ellipsis size={18} className="profile-more" /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="crumb">Bloom Office <ChevronRight size={14} /> <span>{section}</span></div><div className="top-actions"><div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search anything..." aria-label="Search dashboard" /><kbd>⌘ K</kbd></div><button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="top-date"><CalendarDays size={15} /> Thu, 20 Nov</div></div></header>

        <div className="page-content section-stage" key={section}>
          <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> YOUR OFFICE, IN BLOOM <span className="storage-status"><i className={storageStatus === "Supabase connected" ? "storage-live" : "storage-local"} />{storageStatus}</span></div><h1>{pageTitles[section]}<span className="heading-period">.</span></h1><p>{section === "Overview" ? "Here’s what’s happening around the office today." : `Keep your ${section.toLowerCase()} running smoothly.`}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => openModal("event")}><Plus size={16} /> New event</button><button className="button button-primary" onClick={() => openModal("employee")}><Plus size={16} /> Add employee</button></div></div>

          {section === "Overview" && <>
            <section className="hero-banner"><div className="hero-copy"><span className="hero-kicker"><Sparkles size={14} /> THURSDAY, NOVEMBER 20</span><h2>A little more care<br />goes a long way.</h2><p>One place to make office life feel a little more human.</p><button className="hero-link" onClick={() => setSection("Lunch")}>Plan this week’s lunch <ArrowUpRight size={15} /></button></div><div className="hero-scene-wrap"><div className="scene-orbit orbit-one" /><div className="scene-orbit orbit-two" /><BloomScene /><div className="hero-note"><span className="note-dot" /> Weekend lunch <strong>Saturday, 12:30</strong></div></div><div className="hero-sparkle sparkle-a">✳</div><div className="hero-sparkle sparkle-b">✦</div></section>

            <section className="metrics-grid" aria-label="Office snapshot"><Metric label="Total employees" value={`${employees.length}`} note="across your office" icon={Users} tone="tone-sage" /><Metric label="Active employees" value={`${activeCount}`} note="currently on the team" icon={Leaf} tone="tone-green" /><Metric label="Joining lunch" value={`${joiningCount}`} note={`${pendingCount} responses pending`} icon={Utensils} tone="tone-peach" trend="12% " /><Metric label="Fund balance" value="AED 8,420" note="AED 2,180 spent this month" icon={Wallet} tone="tone-yellow" /></section>

            <div className="overview-grid"><section className="panel lunch-panel"><div className="panel-heading"><div><span className="section-label">THE WEEKLY TABLE</span><h3>Weekend lunch</h3></div><button className="text-button" onClick={() => setSection("Lunch")}>Manage lunch <ArrowUpRight size={14} /></button></div><div className="lunch-event"><div className="date-tile"><span>SAT</span><strong>22</strong><small>NOV</small></div><div className="lunch-detail"><strong>Saturday lunch at The Daily</strong><span><MapPin size={13} /> Al Maryah Island · 12:30 PM</span><div className="attendee-avatars"><span className="avatar avatar-coral">MH</span><span className="avatar avatar-green">OK</span><span className="avatar avatar-blue">SN</span><span className="avatar avatar-cream">+{Math.max(joiningCount - 3, 0)}</span><small>{joiningCount} joining</small></div></div><button className="arrow-button" onClick={() => setSection("Lunch")} aria-label="View lunch"><ChevronRight size={18} /></button></div><div className="response-summary"><div><span>Confirmed</span><strong>{joiningCount}<small> / {activeCount}</small></strong></div><div className="response-bar"><span style={{ width: `${activeCount ? joiningCount / activeCount * 100 : 0}%` }} /></div><div className="response-legend"><span><i className="legend-green" />Joining {joiningCount}</span><span><i className="legend-coral" />Not joining {employees.filter((person) => person.active && person.lunch === "Not joining").length}</span><span><i className="legend-gray" />Pending {pendingCount}</span></div></div></section>

            <section className="panel fund-panel"><div className="panel-heading"><div><span className="section-label">THE OFFICE FUND</span><h3>Money, made clear</h3></div><button className="icon-button" onClick={() => setSection("Finance")} aria-label="Open finance"><ArrowUpRight size={17} /></button></div><div className="fund-total"><strong><CountUp value="AED 8,420" /></strong><span><ArrowUpRight size={13} /> 8.4% this month</span></div><div className="chart-wrap"><div className="chart-labels"><span>3,000</span><span>2,000</span><span>1,000</span><span>0</span></div><svg className="fund-chart" viewBox="0 0 360 112" preserveAspectRatio="none" role="img" aria-label="Office fund balance trend over the last six months"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ff3b4f" stopOpacity=".45" /><stop offset="100%" stopColor="#ff3b4f" stopOpacity="0" /></linearGradient></defs><path className="chart-area" d="M0 86 C25 78 35 82 56 68 S92 78 114 58 S145 62 171 43 S204 55 228 33 S265 49 286 25 S325 36 360 11 V112 H0 Z" fill="url(#chartFill)" /><path className="chart-line" pathLength={1} d="M0 86 C25 78 35 82 56 68 S92 78 114 58 S145 62 171 43 S204 55 228 33 S265 49 286 25 S325 36 360 11" fill="none" stroke="#ff3b4f" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg><div className="chart-months"><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span></div></div><div className="fund-foot"><span><i className="legend-green" /> Contributions <strong>AED 3,600</strong></span><span><i className="legend-coral" /> Expenses <strong>AED 2,180</strong></span></div></section>

            <section className="panel birthdays-panel"><div className="panel-heading"><div><span className="section-label">GOOD THINGS AHEAD</span><h3>Coming up</h3></div><button className="icon-button" onClick={() => setSection("Events")} aria-label="Open events"><ArrowUpRight size={17} /></button></div>{upcomingEvents.length === 0 && <p className="empty-note">Nothing planned yet. <button className="text-button" onClick={() => openModal("event")}>Add an event</button></p>}{upcomingEvents.slice(0, 3).map((event, index) => { const { day, month } = dateParts(event.date); const EventIcon = event.kind === "Birthday" ? Cake : index % 2 ? Flower2 : Coffee; return <div className="coming-row" key={event.id}><div className={`coming-icon ${event.kind === "Birthday" ? "cake-icon" : "event-icon"}`}><EventIcon size={17} /></div><div className="coming-copy"><strong>{event.title}</strong><span>{event.note}</span></div><div className="coming-date"><strong>{day}</strong><span>{month}</span></div></div>; })}<button className="panel-footer-link" onClick={() => setSection("Events")}>See all celebrations <ChevronRight size={14} /></button></section>

            <section className="panel activity-panel"><div className="panel-heading"><div><span className="section-label">LITTLE THINGS, ADDED UP</span><h3>Recent activity</h3></div><button className="icon-button" aria-label="More activity"><Ellipsis size={18} /></button></div><div className="activity-list"><div className="activity-item"><div className="activity-mark mark-green"><Check size={14} /></div><div><strong>Lunch confirmed</strong><span>Omar joined Saturday lunch</span></div><time>9:42 AM</time></div><div className="activity-item"><div className="activity-mark mark-peach"><BadgeDollarSign size={14} /></div><div><strong>Contribution recorded</strong><span>Sara · AED 300 for November</span></div><time>Yesterday</time></div><div className="activity-item"><div className="activity-mark mark-yellow"><Cake size={14} /></div><div><strong>Birthday coming up</strong><span>Lina’s birthday is in 4 days</span></div><time>Yesterday</time></div><div className="activity-item"><div className="activity-mark mark-blue"><Utensils size={14} /></div><div><strong>Restaurant added</strong><span>The Daily added to your lunch list</span></div><time>Mon</time></div></div></section></div>
          </>}

          {section === "Team" && <section className="panel module-panel"><div className="panel-heading"><div><span className="section-label">YOUR OFFICE, YOUR PEOPLE</span><h3>{employees.length} employee records</h3></div><button className="button button-primary" onClick={() => openModal("employee")}><Plus size={15} /> Add employee</button></div><div className="table-wrap"><table><thead><tr><th>EMPLOYEE</th><th>TEAM</th><th>LUNCH RESPONSE</th><th>STATUS</th><th /></tr></thead><tbody>{visibleEmployees.map((person, index) => <tr key={`${person.name}-${index}`}><td><div className="person-cell"><span className={`avatar avatar-${index % 4}`}>{person.initials}</span><div><strong>{person.name}</strong><small>{person.name.toLowerCase().replace(" ", ".")}@bloomoffice.ae</small></div></div></td><td>{person.team}</td><td><span className={`status-pill status-${person.lunch.toLowerCase().replace(" ", "-")}`}>{person.lunch}</span></td><td><span className={`status-dot ${person.active ? "is-active" : "is-inactive"}`} />{person.active ? "Active" : "Inactive"}</td><td><div className="row-actions"><button className="text-button" onClick={() => setEmployees((current) => current.map((entry) => entry === person ? { ...entry, active: !entry.active } : entry))}>{person.active ? "Deactivate" : "Reactivate"}</button><button className="icon-button delete-button" onClick={() => deleteEmployee(person)} aria-label={`Delete ${person.name}`} title="Delete employee"><Trash2 size={15} /></button></div></td></tr>)}{visibleEmployees.length === 0 && <tr><td colSpan={5} className="empty-cell">{employees.length ? "No one matches your search." : "No employees yet. Add your first team member."}</td></tr>}</tbody></table></div></section>}

          {section === "Lunch" && <div className="module-grid"><section className="panel module-panel"><div className="panel-heading"><div><span className="section-label">SATURDAY, NOVEMBER 22 · 12:30 PM</span><h3>The Daily · Al Maryah Island</h3></div><button className="button button-secondary"><MapPin size={15} /> Restaurant details</button></div><p className="module-description">Update participation manually as your team confirms. Responses are kept together for an accurate headcount.</p><div className="participant-list">{employees.filter((person) => person.active).map((person, index) => <div className="participant-row" key={person.name}><div className="person-cell"><span className={`avatar avatar-${index % 4}`}>{person.initials}</span><strong>{person.name}</strong></div><select aria-label={`${person.name} lunch response`} value={person.lunch} onChange={(event) => setEmployees((current) => current.map((entry) => entry.name === person.name ? { ...entry, lunch: event.target.value as Employee["lunch"] } : entry))}><option>Joining</option><option>Not joining</option><option>Pending</option></select></div>)}</div></section><aside className="panel side-module"><span className="section-label">HEADCOUNT</span><h3>{joiningCount} joining</h3><div className="response-bar response-bar-large"><span style={{ width: `${activeCount ? joiningCount / activeCount * 100 : 0}%` }} /></div><p>{pendingCount} team members haven’t responded yet.</p><button className="button button-primary button-wide"><Utensils size={15} /> Create next week’s lunch</button></aside></div>}

          {section === "Food & AI" && <><section className="ai-banner"><div className="ai-copy"><span className="hero-kicker"><Sparkles size={14} /> BLOOM FOOD AI</span><h2>Find the lunch<br />everyone loves.</h2><p>Ask for a place, a dish, or a little inspiration.</p><form className="ai-input" onSubmit={askFoodAI}><input value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Try ‘healthy lunch for 8 near Al Maryah’" aria-label="Ask Bloom Food AI" /><button aria-label="Get recommendations" disabled={aiLoading}>{aiLoading ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}</button></form></div><div className="ai-illustration"><span className="ai-ring ai-ring-1" /><span className="ai-ring ai-ring-2" /><div className="ai-plate"><Utensils size={53} strokeWidth={1.15} /></div><span className="ai-leaf"><Leaf size={31} /></span><span className="ai-spark">✦</span></div></section>{(aiError || aiResult) && <section className={`panel ai-response ${aiError ? "ai-response-error" : ""}`}><span className="section-label">{aiError ? "BLOOM FOOD AI" : "A FEW IDEAS FOR YOUR TABLE"}</span><p>{aiError || aiResult}</p></section>}<div className="panel-heading restaurant-heading"><div><span className="section-label">GOOD PLACES, CLOSE BY</span><h3>Abu Dhabi favourites</h3></div><button className="text-button"><MapPin size={15} /> Compare restaurants</button></div><div className="restaurant-grid">{restaurants.map((place) => <article className="restaurant-card" key={place.name}><div className={`restaurant-art art-${place.color}`}><span className="rating-pill">★ {place.rating}</span><span className="restaurant-illustration"><Utensils size={35} strokeWidth={1.2} /></span></div><div className="restaurant-info"><div><h3>{place.name}</h3><span>{place.cuisine}</span></div><strong>{place.price}</strong></div><div className="restaurant-actions"><span><Clock3 size={13} /> 15–20 min away</span><button className="button button-secondary" onClick={() => setCart((count) => count + 1)}><Plus size={14} /> Add dish</button></div></article>)}</div><div className="cart-bar"><div className="cart-icon"><ShoppingBag size={18} /><b>{cart}</b></div><span><strong>Team lunch cart</strong><small>Items for {joiningCount} employees</small></span><strong className="cart-total">AED 286</strong><button className="button button-primary">Review cart <ChevronRight size={15} /></button></div></>}

          {section === "Finance" && <div className="module-grid"><section className="panel module-panel finance-overview"><div className="panel-heading"><div><span className="section-label">NOVEMBER 2026</span><h3>Contributions &amp; expenses</h3></div><button className="button button-primary"><Plus size={15} /> Record transaction</button></div><div className="finance-summary"><div><span>Current balance</span><strong>AED 8,420</strong><small><ArrowUpRight size={13} /> 8.4% from last month</small></div><div><span>Contributions</span><strong>AED 3,600</strong><small>12 employee contributions</small></div><div><span>Total expenses</span><strong>AED 2,180</strong><small><ArrowDownRight size={13} /> 6 transactions</small></div></div><h4 className="subheading">Recent transactions</h4><div className="transaction-row"><span className="transaction-icon income"><ArrowDownRight size={16} /></span><span><strong>Monthly contribution</strong><small>Sara Nasser · Nov 19</small></span><b className="income-text">+ AED 300</b></div><div className="transaction-row"><span className="transaction-icon expense"><ArrowUpRight size={16} /></span><span><strong>Team lunch · The Daily</strong><small>Restaurant · Nov 16</small></span><b className="expense-text">− AED 640</b></div><div className="transaction-row"><span className="transaction-icon income"><ArrowDownRight size={16} /></span><span><strong>Monthly contribution</strong><small>Omar Khalid · Nov 15</small></span><b className="income-text">+ AED 300</b></div></section><aside className="panel side-module"><span className="section-label">MONTHLY CONTRIBUTIONS</span><h3>12 of 14 received</h3><div className="contribution-progress"><span /></div><p>AED 3,600 of AED 4,200 expected this month.</p><button className="button button-secondary button-wide"><Download size={15} /> Export transactions</button><UploadDropzone category="receipt" /></aside></div>}

          {section === "Events" && <div className="module-grid"><section className="panel module-panel"><div className="panel-heading"><div><span className="section-label">CALENDAR · {events.length} {events.length === 1 ? "EVENT" : "EVENTS"}</span><h3>Celebrations &amp; office events</h3></div><button className="button button-primary" onClick={() => openModal("event")}><Plus size={15} /> Add event</button></div>{sortedEvents.length === 0 && <p className="empty-note">No events yet. Add a birthday or office gathering to get started.</p>}{sortedEvents.map((event) => { const { day, month, year } = dateParts(event.date); const past = daysUntil(event.date) < 0; return <div className={`event-row ${past ? "event-past" : ""}`} key={event.id}><div className="date-tile"><span>{month}</span><strong>{day}</strong><small>{year}</small></div><div className={`coming-icon ${event.kind === "Birthday" ? "cake-icon" : "event-icon"}`}>{event.kind === "Birthday" ? <Cake size={18} /> : <CalendarDays size={18} />}</div><div className="event-row-copy"><strong>{event.title}</strong><span>{event.kind} · {past ? "Past" : event.note}</span></div><button className="icon-button delete-button" onClick={() => deleteEvent(event)} aria-label={`Delete ${event.title}`} title="Delete event"><Trash2 size={16} /></button></div>; })}</section><aside className="panel side-module birthday-highlight"><div className="birthday-art"><Cake size={39} strokeWidth={1.2} /></div><span className="section-label">UP NEXT</span><h3>{nextEvent ? `${nextEvent.title} ${daysUntil(nextEvent.date) === 0 ? "is today" : daysUntil(nextEvent.date) === 1 ? "is tomorrow" : `is in ${daysUntil(nextEvent.date)} days`}` : "Nothing planned yet"}</h3><p>Make it personal. Add a note, plan a treat, or invite the team to celebrate.</p><button className="button button-primary button-wide" onClick={() => openModal("event")}><Plus size={15} /> Plan a celebration</button><UploadDropzone category="image" /></aside></div>}

          {section === "Reports" && <div className="report-grid"><section className="panel report-card"><div className="report-icon tone-sage"><Users size={20} /></div><h3>Employee directory</h3><p>Names, teams, activity and food preferences.</p><button className="button button-secondary" onClick={() => downloadCsv(employees)}> <Download size={15} /> Export CSV</button></section><section className="panel report-card"><div className="report-icon tone-peach"><Utensils size={20} /></div><h3>Lunch participation</h3><p>Attendance and headcounts by weekly lunch.</p><button className="button button-secondary" onClick={() => downloadCsv(employees.map(({ name, lunch }) => ({ name, lunch })))}><Download size={15} /> Export CSV</button></section><section className="panel report-card"><div className="report-icon tone-yellow"><Wallet size={20} /></div><h3>Office fund report</h3><p>Contributions, expenses and monthly balance.</p><button className="button button-secondary"><Download size={15} /> Export report</button></section><section className="panel report-card"><div className="report-icon tone-green"><Cake size={20} /></div><h3>Events calendar</h3><p>Birthdays, office gatherings and celebrations.</p><button className="button button-secondary"><Download size={15} /> Export calendar</button></section></div>}

          <footer className="page-footer"><span><Flower2 size={14} /> A little more human, every day.</span><span><CircleHelp size={14} /> Bloom Connect · Office management</span></footer>
        </div>
      </main>
      {modal && <div className="modal-backdrop" role="presentation" onClick={closeModal} onKeyDown={(event) => { if (event.key === "Escape") closeModal(); }}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); addRecord(); }} noValidate><button type="button" className="icon-button modal-close" onClick={closeModal} aria-label="Close"><X size={18} /></button><span className="section-label">BLOOM CONNECT</span><h2 id="modal-title">{modal === "employee" ? "Add to your team" : "Make something to look forward to"}</h2><p>{modal === "employee" ? "Start with a name. You can add the details later." : "Give your event a name and a date to get it on the calendar."}</p><label htmlFor="record-name">{modal === "employee" ? "Employee name" : "Event name"}</label><input id="record-name" autoFocus value={nameInput} onChange={(event) => { setNameInput(event.target.value); setFormError(""); }} placeholder={modal === "employee" ? "e.g. Amal Hassan" : "e.g. Winter team lunch"} aria-invalid={Boolean(formError)} />{modal === "event" && <div className="modal-row"><div><label htmlFor="event-date">Date</label><input id="event-date" type="date" value={eventDate} onChange={(event) => { setEventDate(event.target.value); setFormError(""); }} /></div><div><label htmlFor="event-kind">Type</label><select id="event-kind" value={eventKind} onChange={(event) => setEventKind(event.target.value as EventKind)}><option>Office event</option><option>Birthday</option></select></div></div>}{formError && <p className="form-error" role="alert">{formError}</p>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={closeModal}>Cancel</button><button type="submit" className="button button-primary"><Plus size={15} /> {modal === "employee" ? "Add employee" : "Add event"}</button></div></form></div>}
      {toast && <div className="toast" role="status" key={toast.id}><Check size={15} /><span>{toast.text}</span>{toast.undo && <button onClick={() => { toast.undo?.(); setToast(null); }}><Undo2 size={14} /> Undo</button>}<button className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss"><X size={14} /></button></div>}
    </div>
  );
}

function downloadCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "bloom-connect-report.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
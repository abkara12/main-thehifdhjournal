"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  getDoc,
  getDocs,
  orderBy,
  query,
  doc,
} from "firebase/firestore";
import { auth, db } from "../../../../lib/firebase";

/* ---------------- helpers ---------------- */
function toText(v: unknown) {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

function num(v: unknown) {
  const s = toText(v).trim();
  if (!s) return 0;
  const m = s.replace(",", ".").match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function getDateKeySA() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${d}`;
}

function getDayName(dateKey?: string) {
  if (!dateKey) return "";
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatLongDate(dateKey?: string) {
  if (!dateKey) return "";
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getMonthLabel(dateKey?: string) {
  if (!dateKey) return "";
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function diffDaysInclusive(startKey: string, endKey: string) {
  const a = parseDateKey(startKey);
  const b = parseDateKey(endKey);
  const ms = b.getTime() - a.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return Math.max(0, days) + 1;
}

function formatPhone(v?: string) {
  return toText(v) || "—";
}

/* ---------------- sabak normalization ---------------- */
function sabakToLines(v: unknown) {
  const s = toText(v).toLowerCase().trim();
  if (!s) return 0;

  if (s.includes("page") || s.includes("pages") || s === "p" || s.includes(" p")) {
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n * 13;
  }

  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? 0 : n;
}

type LogRow = {
  id: string;
  dateKey?: string;

  attendance?: string;

  sabak?: string;
  sabakRead?: string;
  sabakReadQuality?: string;
  sabakReadNotes?: string;

  sabakDhor?: string;
  sabakDhorRead?: string;
  sabakDhorReadQuality?: string;
  sabakDhorReadNotes?: string;

  dhor?: string;
  dhorRead?: string;
  dhorReadQuality?: string;
  dhorReadNotes?: string;

  weeklyGoal?: string;

  sabakDhorMistakes?: string;
  dhorMistakes?: string;

  weeklyGoalStartDateKey?: string;
  weeklyGoalCompletedDateKey?: string;
  weeklyGoalDurationDays?: number | string;

updatedByName?: string;
updatedByEmail?: string;
};

type StudentMeta = {
  fullName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  weeklyGoal: string;
  weeklyGoalStartDateKey: string;
  weeklyGoalCompletedDateKey: string;
  weeklyGoalDurationDays: number | null;
  currentSabak: string;
  currentSabakDhor: string;
  currentDhor: string;
  currentSabakReadQuality: string;
  currentSabakDhorReadQuality: string;
  currentDhorReadQuality: string;
  currentSabakReadNotes: string;
  currentSabakDhorReadNotes: string;
  currentDhorReadNotes: string;
  currentSabakDhorMistakes: string;
  currentDhorMistakes: string;
};

async function fetchLogs(madrassahId: string, studentId: string): Promise<LogRow[]> {
  const qy = query(
    collection(db, "madrassahs", madrassahId, "students", studentId, "logs"),
    orderBy("dateKey", "desc")
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-300 bg-white/70 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur">
      {children}
    </span>
  );
}

/* ---------------- page ---------------- */
export default function AdminStudentOverviewPage() {
  const params = useParams<{ uid: string }>();
  const studentId = params?.uid || "";

  const [me, setMe] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [madrassahId, setMadrassahId] = useState<string | null>(null);

  const [studentMeta, setStudentMeta] = useState<StudentMeta | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentExists, setStudentExists] = useState(false);

  const [rows, setRows] = useState<LogRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [pageErr, setPageErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setMe(u);

      if (!u) {
        setRole(null);
        setMadrassahId(null);
        setChecking(false);
        return;
      }

      try {
        const myDoc = await getDoc(doc(db, "users", u.uid));
        const myData = myDoc.exists() ? (myDoc.data() as any) : null;

        setRole(myData?.role ?? null);
        setMadrassahId(myData?.madrassahId ?? null);
      } catch (e: any) {
        setPageErr(e?.message ?? "Could not load your account.");
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, []);

  async function loadStudentMetaAndLogs(currentMadrassahId: string, currentStudentId: string) {
    if (!currentMadrassahId || !currentStudentId) return;

    setPageErr(null);
    setLoadingRows(true);
    setStudentExists(false);

    try {
      const sDoc = await getDoc(doc(db, "madrassahs", currentMadrassahId, "students", currentStudentId));

      if (!sDoc.exists()) {
        setStudentName("Student");
        setStudentMeta(null);
        setRows([]);
        setPageErr("Student not found in this madrassah.");
        return;
      }

      const sData = sDoc.data() as any;
      setStudentExists(true);
      setStudentName(toText(sData.fullName) || "Student");
      setStudentMeta({
        fullName: toText(sData.fullName),
        parentName: toText(sData.parentName),
        parentPhone: toText(sData.parentPhone),
        parentEmail: toText(sData.parentEmail),
        weeklyGoal: toText(sData.weeklyGoal),
        weeklyGoalStartDateKey: toText(sData.weeklyGoalStartDateKey),
        weeklyGoalCompletedDateKey: toText(sData.weeklyGoalCompletedDateKey),
        weeklyGoalDurationDays:
          typeof sData.weeklyGoalDurationDays === "number"
            ? sData.weeklyGoalDurationDays
            : sData.weeklyGoalDurationDays
            ? Number(sData.weeklyGoalDurationDays)
            : null,
        currentSabak: toText(sData.currentSabak),
        currentSabakDhor: toText(sData.currentSabakDhor),
        currentDhor: toText(sData.currentDhor),
        currentSabakReadQuality: toText(sData.currentSabakReadQuality),
        currentSabakDhorReadQuality: toText(sData.currentSabakDhorReadQuality),
        currentDhorReadQuality: toText(sData.currentDhorReadQuality),
        currentSabakReadNotes: toText(sData.currentSabakReadNotes),
        currentSabakDhorReadNotes: toText(sData.currentSabakDhorReadNotes),
        currentDhorReadNotes: toText(sData.currentDhorReadNotes),
        currentSabakDhorMistakes: toText(sData.currentSabakDhorMistakes),
        currentDhorMistakes: toText(sData.currentDhorMistakes),
      });

      const data = await fetchLogs(currentMadrassahId, currentStudentId);
      setRows(data);
    } catch (e: any) {
      setRows([]);
      setStudentMeta(null);
      setPageErr(e?.message ?? "Could not load the student overview.");
    } finally {
      setLoadingRows(false);
    }
  }

  useEffect(() => {
    if (!madrassahId || !studentId) return;
    loadStudentMetaAndLogs(madrassahId, studentId);
  }, [madrassahId, studentId]);

  const absentsByMonth = useMemo(() => {
    const map: Record<string, number> = {};

    rows.forEach((r) => {
      if (r.attendance !== "absent") return;

      const month = getMonthLabel(r.dateKey);
      if (!month) return;

      map[month] = (map[month] || 0) + 1;
    });

    return map;
  }, [rows]);

  const currentMonth = getMonthLabel(getDateKeySA());
  const currentMonthAbsents = absentsByMonth[currentMonth] || 0;

  const summary = useMemo(() => {
    if (!rows.length) {
      return {
        totalDays: 0,
        avgSabakLines: 0,
        avgPresentLines: 0,
        lastGoalText: "",
        presentDays: 0,
      };
    }

    const totalLines = rows.reduce((sum, r) => sum + sabakToLines(r.sabak), 0);
    const avgSabakLines = totalLines / rows.length;

    const presentRows = rows.filter((r) => r.attendance === "present");
    const totalPresentLines = presentRows.reduce((sum, r) => sum + sabakToLines(r.sabak), 0);
    const avgPresentLines = presentRows.length ? totalPresentLines / presentRows.length : 0;

    const lastGoalText = toText(rows.find((r) => toText(r.weeklyGoal))?.weeklyGoal);

    return {
      totalDays: rows.length,
      avgSabakLines,
      avgPresentLines,
      lastGoalText,
      presentDays: presentRows.length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((r) => {
      const haystack = [
        r.dateKey,
        r.attendance,
        r.sabak,
        r.sabakReadQuality,
        r.sabakRead,
        r.sabakReadNotes,
        r.sabakDhor,
        r.sabakDhorReadQuality,
        r.sabakDhorRead,
        r.sabakDhorReadNotes,
        r.dhor,
        r.dhorReadQuality,
        r.dhorRead,
        r.dhorReadNotes,
        r.weeklyGoal,
        r.sabakDhorMistakes,
        r.dhorMistakes,
        r.updatedByName,
        r.updatedByEmail,     
 ]
        .map((v) => toText(v).toLowerCase())
        .join(" ");

      return haystack.includes(term);
    });
  }, [rows, search]);

  if (checking) {
    return (
      <main className="min-h-screen">
        <FancyBg />
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
          <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-8 shadow-sm">
            Loading…
          </div>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="min-h-screen">
        <FancyBg />
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
          <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-10 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">Please sign in</h1>
            <p className="mt-3 text-gray-700">You must sign in to view this student overview.</p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-900"
              >
                Sign In
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center h-11 px-6 rounded-full border border-gray-300 bg-white/70 backdrop-blur text-sm font-medium hover:bg-white"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!role || !["admin", "teacher"].includes(role)) {
    return (
      <main className="min-h-screen">
        <FancyBg />
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
          <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-10 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">Not allowed</h1>
            <p className="mt-3 text-gray-700">This account cannot view student overviews.</p>
            <div className="mt-6 flex gap-3">
              <Link href="/" className="underline">
                Home
              </Link>
              <Link href="/admin" className="underline">
                Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!madrassahId) {
    return (
      <main className="min-h-screen">
        <FancyBg />
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
          <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-10 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">No madrassah linked</h1>
            <p className="mt-3 text-gray-700">This account is missing a madrassah connection.</p>
          </div>
        </div>
      </main>
    );
  }

  if (!studentId || !studentExists) {
    return (
      <main className="min-h-screen">
        <FancyBg />
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-10 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight text-red-700">Student not found</h1>
            <p className="mt-3 text-red-700">
              {pageErr || "This student could not be found for your madrassah."}
            </p>
            <div className="mt-6">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-900"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-gray-900">
      <FancyBg />

      <header className="max-w-6xl mx-auto px-6 sm:px-10 py-8 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-black text-white grid place-items-center shadow-sm shrink-0">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path
                  d="M8 7V4m8 3V4M5 11h14M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="text-sm text-gray-600">Student Overview</div>
              <div className="text-xl font-semibold tracking-tight truncate">
                {studentName || "Student"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (madrassahId && studentId) {
                  loadStudentMetaAndLogs(madrassahId, studentId);
                }
              }}
              disabled={loadingRows}
              className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-gray-300 bg-white/70 backdrop-blur text-sm font-medium hover:bg-white disabled:opacity-60"
            >
              {loadingRows ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              href={`/admin/student/${studentId}`}
              className="inline-flex items-center justify-center h-11 px-5 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-900"
            >
              Log Work
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-gray-300 bg-white/70 backdrop-blur text-sm font-medium hover:bg-white"
            >
              Back
            </Link>
          </div>
        </div>

        {studentMeta ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-6 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-[#B8963D]">Student details</div>
              <div className="mt-3 grid gap-3 text-sm">
                <InfoRow label="Student" value={studentMeta.fullName || "—"} />
                <InfoRow label="Parent" value={studentMeta.parentName || "—"} />
                <InfoRow label="Parent phone" value={formatPhone(studentMeta.parentPhone)} />
                <InfoRow label="Parent email" value={studentMeta.parentEmail || "—"} />
              </div>
            </div>

            <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-6 shadow-sm">
              <div className="text-xs uppercase tracking-widest text-[#B8963D]">Current stored progress</div>
              <div className="mt-3 grid gap-3 text-sm">
                <InfoRow label="Current Sabak" value={studentMeta.currentSabak || "—"} />
                <InfoRow label="Current Sabak Dhor" value={studentMeta.currentSabakDhor || "—"} />
                <InfoRow label="Current Dhor" value={studentMeta.currentDhor || "—"} />
                <InfoRow label="Weekly goal" value={studentMeta.weeklyGoal || "—"} />
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-16">
        {pageErr ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageErr}
          </div>
        ) : null}

        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
          <StatCard label="Days logged" value={String(summary.totalDays)} />
          <StatCard label="Present days" value={String(summary.presentDays)} />
          <StatCard label="Absences (this month)" value={String(currentMonthAbsents)} />
          <StatCard
            label="Average Sabak"
            value={summary.avgSabakLines ? `${summary.avgSabakLines.toFixed(1)} lines/day` : "—"}
          />
          <StatCard
            label="Latest weekly goal"
            value={summary.lastGoalText || "—"}
          />
        </div>

        {Object.keys(absentsByMonth).length > 0 ? (
          <div className="mb-6 flex flex-wrap gap-3">
            {Object.entries(absentsByMonth).map(([month, count]) => (
              <div
                key={month}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
              >
                {month}: {count} absent day(s)
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-300 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="uppercase tracking-widest text-xs text-[#B8963D]">History table</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Student daily logs</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge>{role === "admin" ? "Admin view" : "Teacher view"}</Badge>
                <Badge>Newest → oldest</Badge>
                <Badge>{filteredRows.length} shown</Badge>
              </div>
            </div>

            <div className="grid gap-2 sm:max-w-md">
              <label className="text-sm font-semibold text-gray-900">Search logs</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/30"
                placeholder="Search by date, sabak, notes, attendance, goal..."
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {loadingRows ? (
              <div className="text-gray-700">Loading logs…</div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-gray-300 bg-white/70 p-6">
                <div className="text-lg font-semibold">No logs yet</div>
                <p className="mt-2 text-gray-700">Once the student has entries, they will show here.</p>
                <div className="mt-4">
                  <Link
                    href={`/admin/student/${studentId}`}
                    className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-black text-white text-sm font-medium hover:bg-gray-900"
                  >
                    Log first entry
                  </Link>
                </div>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
                No logs match your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[1220px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-gray-500">
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 pr-4 pl-2 border-b border-gray-300">
                        Day
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 pr-4 pl-2 border-b border-gray-300">
                        Date
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Attendance
                      </th>

                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Sabak
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Read
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Notes
                      </th>

                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Sabak Dhor
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Read
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Notes
                      </th>

                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Dhor
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Read
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Notes
                      </th>

                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        SD Mistakes
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        D Mistakes
                      </th>

                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Weekly Goal
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Goal Status
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Duration
                      </th>
                      <th className="sticky top-0 bg-white/70 backdrop-blur pb-3 px-4 border-b border-gray-300 border-l border-gray-100">
                        Updated By
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-300">
                    {filteredRows.map((r, index) => {
                      const rowMonthLabel = getMonthLabel(r.dateKey);
                      const prevMonthLabel =
                        index > 0 ? getMonthLabel(filteredRows[index - 1].dateKey) : null;

                      const showMonthHeader = index === 0 || rowMonthLabel !== prevMonthLabel;
                      const goalText = toText(r.weeklyGoal);

                      const startKey = toText(r.weeklyGoalStartDateKey);
                      const completedKey = toText(r.weeklyGoalCompletedDateKey);

                      const storedDur =
                        typeof r.weeklyGoalDurationDays === "number"
                          ? r.weeklyGoalDurationDays
                          : toText(r.weeklyGoalDurationDays)
                          ? Number(r.weeklyGoalDurationDays)
                          : null;

                      const calcDur =
                        startKey && completedKey ? diffDaysInclusive(startKey, completedKey) : null;

                      const duration = storedDur ?? calcDur;
                      const notReached =
                        startKey &&
                        r.dateKey &&
                        !completedKey &&
                        diffDaysInclusive(startKey, r.dateKey) > 7;

                      const completed = Boolean(completedKey);

                      const sabakReadText = toText(r.sabakReadQuality || r.sabakRead);
                      const sabakDhorReadText = toText(r.sabakDhorReadQuality || r.sabakDhorRead);
                      const dhorReadText = toText(r.dhorReadQuality || r.dhorRead);

                      return (
                        <FragmentRow
                          key={r.id}
                          showMonthHeader={showMonthHeader}
                          currentMonthLabel={rowMonthLabel}
                          row={
                            <tr className="text-sm hover:bg-black/[0.02] transition-colors align-top">
                              <td className="py-4 pr-4 pl-2 font-medium text-gray-600">
                                {getDayName(r.dateKey)}
                              </td>
                              <td className="py-4 pr-4 pl-2 font-medium text-gray-900 whitespace-nowrap">
                                {r.dateKey ?? r.id}
                              </td>

                              <td className="py-4 px-4 border-l border-gray-100">
                                {r.attendance === "present" ? (
                                  <span className="text-emerald-600 font-semibold">Present</span>
                                ) : r.attendance === "absent" ? (
                                  <span className="text-red-600 font-semibold">Absent</span>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td className="py-4 px-4 text-gray-800 border-l border-gray-100">
                                {toText(r.sabak) || "—"}
                              </td>
                              <td className="py-4 px-4 text-gray-700 border-l border-gray-100">
                                {sabakReadText || "—"}
                              </td>
                              <td className="py-4 px-4 text-gray-700 border-l border-gray-100 max-w-[220px] whitespace-pre-wrap">
                                {toText(r.sabakReadNotes) || "—"}
                              </td>

                              <td className="py-4 px-4 text-gray-800 border-l border-gray-100">
                                {toText(r.sabakDhor) || "—"}
                              </td>
                              <td className="py-4 px-4 text-gray-700 border-l border-gray-100">
                                {sabakDhorReadText || "—"}
                              </td>
                              <td className="py-4 px-4 text-gray-700 border-l border-gray-100 max-w-[220px] whitespace-pre-wrap">
                                {toText(r.sabakDhorReadNotes) || "—"}
                              </td>

                              <td className="py-4 px-4 text-gray-800 border-l border-gray-100">
                                {toText(r.dhor) || "—"}
                              </td>
                              <td className="py-4 px-4 text-gray-700 border-l border-gray-100">
                                {dhorReadText || "—"}
                              </td>
                              <td className="py-4 px-4 text-gray-700 border-l border-gray-100 max-w-[220px] whitespace-pre-wrap">
                                {toText(r.dhorReadNotes) || "—"}
                              </td>

                              <td className="py-4 px-4 text-gray-800 border-l border-gray-100">
                                {toText(r.sabakDhorMistakes) || "—"}
                              </td>
                              <td className="py-4 px-4 text-gray-800 border-l border-gray-100">
                                {toText(r.dhorMistakes) || "—"}
                              </td>

                              <td className="py-4 px-4 text-gray-800 border-l border-gray-100">
                                {goalText || "—"}
                              </td>

                              <td className="py-4 px-4 border-l border-gray-100">
                                {goalText ? (
                                  <span
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${
                                      completed
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : notReached
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : "border-amber-200 bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    <span
                                      className={`h-2 w-2 rounded-full ${
                                        completed
                                          ? "bg-emerald-500"
                                          : notReached
                                          ? "bg-red-500"
                                          : "bg-amber-500"
                                      }`}
                                    />
                                    {completed ? "Completed" : notReached ? "Not reached" : "In progress"}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">No goal set</span>
                                )}
                              </td>

                              <td className="py-4 px-4 text-gray-800 border-l border-gray-100 whitespace-nowrap">
                                {duration ? `${duration} day(s)` : "—"}
                              </td>

                              <td className="py-4 px-4 text-gray-700 border-l border-gray-100 whitespace-nowrap">
                                {toText(r.updatedByEmail) || "—"}
                              </td>
                            </tr>
                          }
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------------- UI bits ---------------- */
function FragmentRow({
  showMonthHeader,
  currentMonthLabel,
  row,
}: {
  showMonthHeader: boolean;
  currentMonthLabel: string;
  row: React.ReactNode;
}) {
  return (
    <>
      {showMonthHeader ? (
        <tr>
          <td
            colSpan={18}
            className="bg-gradient-to-r from-[#B8963D]/15 to-transparent text-sm font-semibold text-gray-900 py-4 px-4 uppercase tracking-wider"
          >
            {currentMonthLabel}
          </td>
        </tr>
      ) : null}
      {row}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-6 shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#B8963D] via-[#B8963D]/60 to-transparent" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#B8963D]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="text-xs uppercase tracking-widest text-gray-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 break-words">{value}</div>
    </div>
  );
}

function FancyBg() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[#F8F6F1]" />
      <div className="absolute -top-72 -right-40 h-[900px] w-[900px] rounded-full bg-[#1F3F3F]/25 blur-3xl" />
      <div className="absolute bottom-[-25%] left-[-15%] h-[1000px] w-[1000px] rounded-full bg-[#B8963D]/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_70%_20%,rgba(184,150,61,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_10%,transparent_50%,rgba(0,0,0,0.08))]" />
      <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply bg-[url('/noise.png')]" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-gray-500">{label}</div>
      <div className="text-right font-medium text-gray-900 break-words">{value}</div>
    </div>
  );
}
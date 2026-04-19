"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  collection,
  getDoc,
  getDocs,
  orderBy,
  query,
  doc,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useRequireStaff } from "../../../../lib/auth-guards";
import { getDateKeySA, diffDaysInclusive } from "../../../../lib/date";
import {
  DashboardShell,
  PremiumBadge,
  PremiumStatCard,
} from "../../../../components/dashboard-shell";

/* ---------------- helpers ---------------- */
function toText(v: unknown) {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function getDayName(dateKey?: string) {
  if (!dateKey) return "";
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function getMonthLabel(dateKey?: string) {
  if (!dateKey) return "";
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

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

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
      {subtitle ? (
        <p className="mt-2 text-sm leading-7 text-white/58">{subtitle}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SnapshotCard({
  title,
  value,
  quality,
  notes,
  mistakes,
}: {
  title: string;
  value: string;
  quality: string;
  notes?: string;
  mistakes?: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-black/10 p-5">
      <p className="text-sm text-white/45">{title}</p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-white">
        {value || "—"}
      </p>
      <div className="mt-3">
        <PremiumBadge>{quality || "No quality"}</PremiumBadge>
      </div>
      {notes ? (
        <p className="mt-4 text-sm leading-6 text-white/58">{notes}</p>
      ) : null}
      {mistakes ? (
        <p className="mt-4 text-sm text-white/52">Mistakes: {mistakes}</p>
      ) : null}
    </div>
  );
}

function LogCard({ row }: { row: LogRow }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.018))] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.16)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
              {getDayName(row.dateKey)} {row.dateKey || "—"}
            </h3>
            <PremiumBadge>{row.attendance || "—"}</PremiumBadge>
          </div>

          {row.updatedByEmail ? (
            <p className="mt-2 text-sm text-white/45">Updated by: {row.updatedByEmail}</p>
          ) : null}
        </div>

        {row.weeklyGoal ? (
          <div className="text-sm text-white/52">Goal: {row.weeklyGoal}</div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <SnapshotCard
          title="Sabak"
          value={row.sabak || ""}
          quality={row.sabakReadQuality || row.sabakRead || ""}
          notes={row.sabakReadNotes || ""}
        />

        <SnapshotCard
          title="Sabak Dhor"
          value={row.sabakDhor || ""}
          quality={row.sabakDhorReadQuality || row.sabakDhorRead || ""}
          notes={row.sabakDhorReadNotes || ""}
          mistakes={row.sabakDhorMistakes || ""}
        />

        <SnapshotCard
          title="Dhor"
          value={row.dhor || ""}
          quality={row.dhorReadQuality || row.dhorRead || ""}
          notes={row.dhorReadNotes || ""}
          mistakes={row.dhorMistakes || ""}
        />
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */
export default function StudentOverviewPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId || "";

  const { loading, profile, error } = useRequireStaff();

  const [studentMeta, setStudentMeta] = useState<StudentMeta | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentExists, setStudentExists] = useState(false);

  const [rows, setRows] = useState<LogRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [pageErr, setPageErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  async function loadStudentMetaAndLogs(currentMadrassahId: string, currentStudentId: string) {
    if (!currentMadrassahId || !currentStudentId) return;

    setPageErr(null);
    setLoadingRows(true);
    setStudentExists(false);

    try {
      const sDoc = await getDoc(
        doc(db, "madrassahs", currentMadrassahId, "students", currentStudentId)
      );

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
    if (!profile?.madrassahId || !studentId) return;
    loadStudentMetaAndLogs(profile.madrassahId, studentId);
  }, [profile, studentId]);

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
        presentDays: 0,
      };
    }

    const totalLines = rows.reduce((sum, r) => sum + sabakToLines(r.sabak), 0);
    const avgSabakLines = totalLines / rows.length;

    const presentRows = rows.filter((r) => r.attendance === "present");
    const totalPresentLines = presentRows.reduce((sum, r) => sum + sabakToLines(r.sabak), 0);
    const avgPresentLines = presentRows.length ? totalPresentLines / presentRows.length : 0;

    return {
      totalDays: rows.length,
      avgSabakLines,
      avgPresentLines,
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
        r.updatedByEmail,
      ]
        .map((v) => toText(v).toLowerCase())
        .join(" ");

      return haystack.includes(term);
    });
  }, [rows, search]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-black text-white">
        Loading...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center bg-black px-6 text-white">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-200">
          {error || "Could not load overview page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title={studentName || "Student Overview"}
      subtitle="Review the full progress story, current standing, attendance, and weekly goal performance in one premium overview."
      eyebrow="Student Intelligence View"
      rightSlot={
        <>
          <Link
            href={`/dashboard/students/${studentId}`}
            className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.08]"
          >
            Back to Student Record
          </Link>
          <Link
            href="/dashboard/students"
            className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)]"
          >
            Back to Students
          </Link>
        </>
      }
    >
      {pageErr ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {pageErr}
        </div>
      ) : null}

      {loadingRows ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
          Loading overview...
        </div>
      ) : !studentExists || !studentMeta ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PremiumStatCard
              label="Total Log Days"
              value={String(summary.totalDays)}
              subtext="All recorded log entries for this student."
            />
            <PremiumStatCard
              label="Present Days"
              value={String(summary.presentDays)}
              subtext="Days marked present."
            />
            <PremiumStatCard
              label="Avg Sabak"
              value={summary.avgSabakLines ? `${summary.avgSabakLines.toFixed(1)} lines` : "—"}
              subtext="Average across all logged days."
            />
            <PremiumStatCard
              label="Current Month Absents"
              value={String(currentMonthAbsents)}
              subtext={currentMonth || "This month"}
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <SectionCard
                title="Parent Details"
                subtitle="Keep parent communication context visible at a glance."
              >
                <div className="grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-sm text-white/45">Parent Name</p>
                    <p className="mt-2 font-medium text-white">{studentMeta.parentName || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-sm text-white/45">Phone</p>
                    <p className="mt-2 font-medium text-white">{studentMeta.parentPhone || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-sm text-white/45">Email</p>
                    <p className="mt-2 font-medium text-white">{studentMeta.parentEmail || "—"}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Weekly Goal"
                subtitle="Monitor the current goal and whether it is still running or already complete."
              >
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-sm text-white/45">Goal</p>
                    <p className="mt-2 font-medium text-white">{studentMeta.weeklyGoal || "—"}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-sm text-white/45">Started</p>
                      <p className="mt-2 font-medium text-white">
                        {studentMeta.weeklyGoalStartDateKey || "—"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                      <p className="text-sm text-white/45">Completed</p>
                      <p className="mt-2 font-medium text-white">
                        {studentMeta.weeklyGoalCompletedDateKey || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-sm text-white/45">Duration</p>
                    <p className="mt-2 font-medium text-white">
                      {studentMeta.weeklyGoalDurationDays
                        ? `${studentMeta.weeklyGoalDurationDays} day(s)`
                        : studentMeta.weeklyGoalStartDateKey && !studentMeta.weeklyGoalCompletedDateKey
                        ? `${diffDaysInclusive(studentMeta.weeklyGoalStartDateKey, getDateKeySA())} day(s) running`
                        : "—"}
                    </p>
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard
                title="Current Progress Snapshot"
                subtitle="A clean view of the latest known standing for sabak, sabak dhor, and dhor."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <SnapshotCard
                    title="Sabak"
                    value={studentMeta.currentSabak}
                    quality={studentMeta.currentSabakReadQuality}
                    notes={studentMeta.currentSabakReadNotes}
                  />

                  <SnapshotCard
                    title="Sabak Dhor"
                    value={studentMeta.currentSabakDhor}
                    quality={studentMeta.currentSabakDhorReadQuality}
                    notes={studentMeta.currentSabakDhorReadNotes}
                    mistakes={studentMeta.currentSabakDhorMistakes}
                  />

                  <SnapshotCard
                    title="Dhor"
                    value={studentMeta.currentDhor}
                    quality={studentMeta.currentDhorReadQuality}
                    notes={studentMeta.currentDhorReadNotes}
                    mistakes={studentMeta.currentDhorMistakes}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Log History"
                subtitle="Search through the full history and review how this student has been progressing over time."
              >
                <div className="mb-5">
                  <input
                    type="text"
                    placeholder="Search logs by date, attendance, notes, mistakes, goals, or teacher email..."
                    className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {!rows.length ? (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-6 text-center text-white/58">
                    No logs have been recorded for this student yet.
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-6 text-center text-white/58">
                    No logs matched your search.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredRows.map((row) => (
                      <LogCard key={row.id} row={row} />
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
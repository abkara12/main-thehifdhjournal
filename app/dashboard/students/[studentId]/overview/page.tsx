"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
    <section className="rounded-[30px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">{title}</h2>
      {subtitle ? (
        <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">{subtitle}</p>
      ) : null}
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}

function AttendanceBadge({ value }: { value?: string }) {
  const isPresent = value === "present";
  const isAbsent = value === "absent";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
        isPresent
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : isAbsent
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-gray-300 bg-white/80 text-[#5f5f5f]"
      }`}
    >
      {value || "—"}
    </span>
  );
}

function LogDetails({ row }: { row: LogRow }) {
  return (
    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3">
      <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
        <p className="text-sm text-[#7a7a7a]">Sabak</p>
        <p className="mt-2 font-medium text-[#171717]">{row.sabak || "—"}</p>
        <p className="mt-3 text-sm text-[#7a7a7a]">Quality</p>
        <p className="mt-1 text-sm text-[#171717]">{row.sabakReadQuality || row.sabakRead || "—"}</p>
        <p className="mt-3 text-sm text-[#7a7a7a]">Notes</p>
        <p className="mt-1 break-words text-sm text-[#5f5f5f]">{row.sabakReadNotes || "—"}</p>
      </div>

      <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
        <p className="text-sm text-[#7a7a7a]">Sabak Dhor</p>
        <p className="mt-2 font-medium text-[#171717]">{row.sabakDhor || "—"}</p>
        <p className="mt-3 text-sm text-[#7a7a7a]">Quality</p>
        <p className="mt-1 text-sm text-[#171717]">{row.sabakDhorReadQuality || row.sabakDhorRead || "—"}</p>
        <p className="mt-3 text-sm text-[#7a7a7a]">Notes</p>
        <p className="mt-1 break-words text-sm text-[#5f5f5f]">{row.sabakDhorReadNotes || "—"}</p>
        <p className="mt-3 text-sm text-[#7a7a7a]">Mistakes</p>
        <p className="mt-1 break-words text-sm text-[#5f5f5f]">{row.sabakDhorMistakes || "—"}</p>
      </div>

      <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
        <p className="text-sm text-[#7a7a7a]">Dhor</p>
        <p className="mt-2 font-medium text-[#171717]">{row.dhor || "—"}</p>
        <p className="mt-3 text-sm text-[#7a7a7a]">Quality</p>
        <p className="mt-1 text-sm text-[#171717]">{row.dhorReadQuality || row.dhorRead || "—"}</p>
        <p className="mt-3 text-sm text-[#7a7a7a]">Notes</p>
        <p className="mt-1 break-words text-sm text-[#5f5f5f]">{row.dhorReadNotes || "—"}</p>
        <p className="mt-3 text-sm text-[#7a7a7a]">Mistakes</p>
        <p className="mt-1 break-words text-sm text-[#5f5f5f]">{row.dhorMistakes || "—"}</p>
      </div>

      <div className="rounded-2xl border border-gray-300 bg-white/82 p-4 lg:col-span-3">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-[#7a7a7a]">Weekly Goal</p>
            <p className="mt-1 break-words text-sm text-[#171717]">{row.weeklyGoal || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-[#7a7a7a]">Updated By</p>
            <p className="mt-1 break-words text-sm text-[#171717]">{row.updatedByEmail || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileLogCard({
  row,
  isOpen,
  onToggle,
}: {
  row: LogRow;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-gray-300 bg-white/84 shadow-sm backdrop-blur-xl">
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#171717]">
              {getDayName(row.dateKey)} {row.dateKey || "—"}
            </p>
            <p className="mt-1 text-sm text-[#5f5f5f]">
              {row.sabak || "—"} • {row.sabakDhor || "—"} • {row.dhor || "—"}
            </p>
          </div>

          <AttendanceBadge value={row.attendance} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.16em] text-[#8d7440]">Updated By</p>
            <p className="mt-1 break-words text-xs text-[#7a7a7a]">{row.updatedByEmail || "—"}</p>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-gray-300 bg-white/80 px-4 py-2 text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
          >
            {isOpen ? "Hide Details" : "View Details"}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-gray-300 bg-[#faf8f3]">
          <LogDetails row={row} />
        </div>
      ) : null}
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
  const [openRowId, setOpenRowId] = useState<string | null>(null);

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
      <main className="min-h-screen grid place-items-center bg-[#F8F6F1] text-[#171717]">
        Loading...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#F8F6F1] px-6 text-[#171717]">
        <div className="rounded-2xl border border-red-300 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error || "Could not load overview page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title={studentName || "Student Overview"}
      subtitle="Review the full progress story, attendance, weekly goal performance, and full log history in one clean overview."
      eyebrow="Student Intelligence View"
      rightSlot={
        <div className="flex w-full flex-col gap-3 rounded-[24px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.60))] p-3 shadow-[0_12px_36px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-4 lg:min-w-[260px] lg:max-w-[340px]">
          <Link
            href={`/dashboard/students/${studentId}`}
            className="w-full rounded-full border border-gray-300 bg-white/72 px-5 py-3 text-center text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
          >
            Back to Student Record
          </Link>
          <Link
            href="/dashboard/students"
            className="w-full rounded-full bg-black px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d]"
          >
            Back to Students
          </Link>
        </div>
      }
    >
      {pageErr ? (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {pageErr}
        </div>
      ) : null}

      {loadingRows ? (
        <div className="rounded-[28px] border border-gray-300 bg-white/74 p-8 text-center text-[#666666] shadow-sm backdrop-blur-xl">
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
              label="Current Month Absents"
              value={String(currentMonthAbsents)}
              subtext={currentMonth || "This month"}
            />
            <PremiumStatCard
              label="Avg Sabak"
              value={summary.avgSabakLines ? `${summary.avgSabakLines.toFixed(1)} lines` : "—"}
              subtext="Average across all logged days."
            />
          </div>

          <div className="mt-8 grid gap-6">
            <SectionCard
              title="Weekly Goal"
              subtitle="Monitor the current goal and whether it is still running or already complete."
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
                  <p className="text-sm text-[#7a7a7a]">Goal</p>
                  <p className="mt-2 font-medium text-[#171717]">
                    {studentMeta.weeklyGoal || "—"}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
                    <p className="text-sm text-[#7a7a7a]">Started</p>
                    <p className="mt-2 font-medium text-[#171717]">
                      {studentMeta.weeklyGoalStartDateKey || "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
                    <p className="text-sm text-[#7a7a7a]">Completed</p>
                    <p className="mt-2 font-medium text-[#171717]">
                      {studentMeta.weeklyGoalCompletedDateKey || "—"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
                  <p className="text-sm text-[#7a7a7a]">Duration</p>
                  <p className="mt-2 font-medium text-[#171717]">
                    {studentMeta.weeklyGoalDurationDays
                      ? `${studentMeta.weeklyGoalDurationDays} day(s)`
                      : studentMeta.weeklyGoalStartDateKey && !studentMeta.weeklyGoalCompletedDateKey
                      ? `${diffDaysInclusive(studentMeta.weeklyGoalStartDateKey, getDateKeySA())} day(s) running`
                      : "—"}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Log History"
              subtitle="Search through the full history and review how this student has been progressing over time."
            >
              <div className="mb-5 min-w-0">
                <input
                  type="text"
                  placeholder="Search logs by date, attendance, notes, mistakes, goals, or teacher email..."
                  className="w-full min-w-0 rounded-2xl border border-gray-300 bg-white/88 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {!rows.length ? (
                <div className="rounded-2xl border border-gray-300 bg-white/82 p-6 text-center text-[#666666]">
                  No logs have been recorded for this student yet.
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="rounded-2xl border border-gray-300 bg-white/82 p-6 text-center text-[#666666]">
                  No logs matched your search.
                </div>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-[24px] border border-gray-300 bg-white/86 shadow-sm lg:block">
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-300 bg-[#f6f2ea]">
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7440]">
                              Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7440]">
                              Attendance
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7440]">
                              Sabak
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7440]">
                              Sabak Dhor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7440]">
                              Dhor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7440]">
                              Goal
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7440]">
                              Updated By
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-[#8d7440]">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredRows.map((row, index) => {
                            const isOpen = openRowId === row.id;

                            return (
                              <Fragment key={row.id}>
                                <tr
                                  className={`border-b border-gray-200 ${
                                    index % 2 === 0 ? "bg-white/70" : "bg-[#faf8f3]"
                                  }`}
                                >
                                  <td className="px-4 py-4 align-top text-sm text-[#171717]">
                                    <div className="font-medium">
                                      {getDayName(row.dateKey)} {row.dateKey || "—"}
                                    </div>
                                  </td>

                                  <td className="px-4 py-4 align-top">
                                    <AttendanceBadge value={row.attendance} />
                                  </td>

                                  <td className="px-4 py-4 align-top text-sm text-[#171717]">
                                    {row.sabak || "—"}
                                  </td>

                                  <td className="px-4 py-4 align-top text-sm text-[#171717]">
                                    {row.sabakDhor || "—"}
                                  </td>

                                  <td className="px-4 py-4 align-top text-sm text-[#171717]">
                                    {row.dhor || "—"}
                                  </td>

                                  <td className="px-4 py-4 align-top text-sm text-[#5f5f5f]">
                                    <div className="max-w-[160px] break-words">
                                      {row.weeklyGoal || "—"}
                                    </div>
                                  </td>

                                  <td className="px-4 py-4 align-top text-sm text-[#7a7a7a]">
                                    <div className="max-w-[180px] break-words">
                                      {row.updatedByEmail || "—"}
                                    </div>
                                  </td>

                                  <td className="px-4 py-4 align-top text-right">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenRowId((prev) => (prev === row.id ? null : row.id))
                                      }
                                      className="rounded-full border border-gray-300 bg-white/80 px-4 py-2 text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
                                    >
                                      {isOpen ? "Hide Details" : "View Details"}
                                    </button>
                                  </td>
                                </tr>

                                {isOpen ? (
                                  <tr className="border-b border-gray-200 bg-[#fdfbf7] last:border-b-0">
                                    <td colSpan={8} className="p-0">
                                      <LogDetails row={row} />
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:hidden">
                    {filteredRows.map((row) => (
                      <MobileLogCard
                        key={row.id}
                        row={row}
                        isOpen={openRowId === row.id}
                        onToggle={() =>
                          setOpenRowId((prev) => (prev === row.id ? null : row.id))
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
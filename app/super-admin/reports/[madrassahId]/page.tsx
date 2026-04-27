"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../../../app/lib/firebase";
import { useRequireSuperAdmin } from "../../../lib/auth-guards";
import { formatWeeklyReportText, type WeeklyReportLog } from "../../../lib/report-format";
import { getMonthLabel } from "../../../lib/date";
import { getCurrentReportWindow } from "../../../lib/report-run";
import {
  DashboardShell,
  PremiumBadge,
  PremiumStatCard,
} from "../../../components/dashboard-shell";

type StudentRow = {
  id: string;
  fullName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  isActive: boolean;
};

type StoredReportRow = {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  reportText: string;
  hasLogs: boolean;
  logCount: number;
  copiedAt?: any;
  copiedByEmail?: string;
  sentAt?: any;
  sentByEmail?: string;
};

type ReportRunRow = {
  id: string;
  startKey: string;
  endKey: string;
  label: string;
  reportCount: number;
  createdAt?: any;
  createdByEmail?: string;
};

function cleanPhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;

  return digits;
}

function openWhatsAppMessage(phone: string, message: string) {
  const cleanPhone = cleanPhoneForWhatsApp(phone);

  if (!cleanPhone) {
    alert("No parent phone number found for this student.");
    return false;
  }

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

function RunCard({
  run,
  active,
  onClick,
}: {
  run: ReportRunRow;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        active
          ? "border-[#d8b67e]/30 bg-[linear-gradient(135deg,rgba(251,244,232,0.16),rgba(216,182,126,0.18),rgba(255,255,255,0.06))]"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <p className="text-sm font-semibold text-white">{run.label}</p>
      <p className="mt-2 text-xs text-white/55">{run.reportCount} report(s)</p>
      {run.createdByEmail ? (
        <p className="mt-1 text-xs text-white/42">{run.createdByEmail}</p>
      ) : null}
    </button>
  );
}

function ReportCard({
  report,
  sentId,
  onSendWhatsApp,
}: {
  report: StoredReportRow;
  sentId: string | null;
  onSendWhatsApp: (report: StoredReportRow) => void;
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">
              {report.studentName}
            </h2>

            {report.hasLogs ? (
              <PremiumBadge>{report.logCount} log(s)</PremiumBadge>
            ) : (
              <PremiumBadge>No logs</PremiumBadge>
            )}

            {report.sentAt ? <PremiumBadge>Sent</PremiumBadge> : null}
          </div>

          <div className="mt-3 space-y-1 text-sm text-white/60">
            <p>Parent: {report.parentName || "—"}</p>
            <p>Phone: {report.parentPhone || "—"}</p>
            <p>Email: {report.parentEmail || "—"}</p>
            {report.sentByEmail ? <p>Sent by: {report.sentByEmail}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onSendWhatsApp(report)}
            className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)]"
          >
            {sentId === report.studentId
              ? "Opened WhatsApp"
              : report.sentAt
              ? "Send Again"
              : "Send WhatsApp"}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/10 p-5">
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-white/74">
          {report.reportText}
        </pre>
      </div>
    </div>
  );
}

export default function SuperAdminMadrassahReportsPage() {
  const params = useParams();
  const madrassahId = String(params?.madrassahId || "");

  const { loading, profile, firebaseUser, error } = useRequireSuperAdmin();

  const [madrassahName, setMadrassahName] = useState("Madrassah");
  const [runs, setRuns] = useState<ReportRunRow[]>([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [reports, setReports] = useState<StoredReportRow[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [pageError, setPageError] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sentId, setSentId] = useState<string | null>(null);

  const currentWindow = useMemo(() => getCurrentReportWindow(), []);

  async function loadMadrassah() {
    const madrassahSnap = await getDoc(doc(db, "madrassahs", madrassahId));

    if (madrassahSnap.exists()) {
      const data = madrassahSnap.data() as any;
      setMadrassahName(String(data.name || "Madrassah"));
    }
  }

  async function loadRuns() {
    const runSnap = await getDocs(
      query(
        collection(db, "madrassahs", madrassahId, "reportRuns"),
        orderBy("createdAt", "desc")
      )
    );

    const nextRuns: ReportRunRow[] = runSnap.docs.map((docSnap) => {
      const data = docSnap.data() as any;

      return {
        id: docSnap.id,
        startKey: String(data.startKey || ""),
        endKey: String(data.endKey || ""),
        label: String(data.label || docSnap.id),
        reportCount: Number(data.reportCount || 0),
        createdAt: data.createdAt,
        createdByEmail: String(data.createdByEmail || ""),
      };
    });

    setRuns(nextRuns);

    const currentExists = nextRuns.some((r) => r.id === currentWindow.runId);

    if (currentExists) {
      setSelectedRunId(currentWindow.runId);
    } else if (nextRuns[0]) {
      setSelectedRunId(nextRuns[0].id);
    }
  }

  async function loadReportsForRun(runId: string) {
    setLoadingReports(true);
    setPageError("");

    try {
      const snap = await getDocs(
        query(
          collection(db, "madrassahs", madrassahId, "reportRuns", runId, "reports"),
          orderBy("studentName")
        )
      );

      const nextReports: StoredReportRow[] = snap.docs.map((docSnap) => {
        const data = docSnap.data() as any;

        return {
          id: docSnap.id,
          studentId: String(data.studentId || docSnap.id),
          studentName: String(data.studentName || ""),
          parentName: String(data.parentName || ""),
          parentPhone: String(data.parentPhone || ""),
          parentEmail: String(data.parentEmail || ""),
          reportText: String(data.reportText || ""),
          hasLogs: data.hasLogs === true,
          logCount: Number(data.logCount || 0),
          copiedAt: data.copiedAt,
          copiedByEmail: String(data.copiedByEmail || ""),
          sentAt: data.sentAt,
          sentByEmail: String(data.sentByEmail || ""),
        };
      });

      setReports(nextReports);
    } catch (err: any) {
      setPageError(err?.message || "Could not load report run.");
    } finally {
      setLoadingReports(false);
    }
  }

  useEffect(() => {
    async function init() {
      if (!madrassahId) return;

      setLoadingPage(true);
      setPageError("");
      setMsg("");

      try {
        await loadMadrassah();
        await loadRuns();
      } catch (err: any) {
        setPageError(err?.message || "Could not load reports page.");
      } finally {
        setLoadingPage(false);
      }
    }

    if (!loading && profile) {
      init();
    }
  }, [loading, profile, madrassahId]);

  useEffect(() => {
    if (!madrassahId || !selectedRunId) return;
    loadReportsForRun(selectedRunId);
  }, [madrassahId, selectedRunId]);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return reports;

    return reports.filter((report) =>
      [
        report.studentName,
        report.parentName,
        report.parentPhone,
        report.parentEmail,
        report.reportText,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [reports, search]);

  const sentCount = reports.filter((r) => !!r.sentAt).length;
  const withLogsCount = reports.filter((r) => r.hasLogs).length;

  async function handlePrepareCurrentRun() {
    if (!madrassahId || !firebaseUser?.uid) {
      setPageError("Your account is not linked correctly.");
      return;
    }

    setPreparing(true);
    setPageError("");
    setMsg("");

    try {
      const studentsSnap = await getDocs(
        query(
          collection(db, "madrassahs", madrassahId, "students"),
          orderBy("fullName")
        )
      );

      const students: StudentRow[] = studentsSnap.docs
        .map((docSnap) => {
          const data = docSnap.data() as any;

          return {
            id: docSnap.id,
            fullName: String(data.fullName || "Student"),
            parentName: String(data.parentName || ""),
            parentPhone: String(data.parentPhone || ""),
            parentEmail: String(data.parentEmail || ""),
            isActive: data.isActive !== false,
          };
        })
        .filter((student) => student.isActive);

      const runRef = doc(
        db,
        "madrassahs",
        madrassahId,
        "reportRuns",
        currentWindow.runId
      );

      await setDoc(
        runRef,
        {
          startKey: currentWindow.startKey,
          endKey: currentWindow.endKey,
          label: currentWindow.label,
          reportCount: students.length,
          createdByUid: firebaseUser.uid,
          createdByEmail: profile?.email || firebaseUser.email || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await Promise.all(
        students.map(async (student) => {
          const logsSnap = await getDocs(
            query(
              collection(
                db,
                "madrassahs",
                madrassahId,
                "students",
                student.id,
                "logs"
              ),
              where("dateKey", ">=", currentWindow.startKey),
              where("dateKey", "<=", currentWindow.endKey),
              orderBy("dateKey", "desc")
            )
          );

          const logs = logsSnap.docs.map((docSnap) => {
            const data = docSnap.data() as any;

            return {
              dateKey: data.dateKey,
              attendance: data.attendance,
              sabak: data.sabak,
              sabakRead: data.sabakRead,
              sabakReadQuality: data.sabakReadQuality,
              sabakReadNotes: data.sabakReadNotes,
              sabakDhor: data.sabakDhor,
              sabakDhorRead: data.sabakDhorRead,
              sabakDhorReadQuality: data.sabakDhorReadQuality,
              sabakDhorReadNotes: data.sabakDhorReadNotes,
              dhor: data.dhor,
              dhorRead: data.dhorRead,
              dhorReadQuality: data.dhorReadQuality,
              dhorReadNotes: data.dhorReadNotes,
              sabakDhorMistakes: data.sabakDhorMistakes,
              dhorMistakes: data.dhorMistakes,
              weeklyGoal: data.weeklyGoal,
              weeklyGoalCompleted: data.weeklyGoalCompleted,
              weeklyGoalCompletedDateKey: data.weeklyGoalCompletedDateKey,
              weeklyGoalDurationDays: data.weeklyGoalDurationDays,
            } satisfies WeeklyReportLog;
          });

          const monthLabel =
            logs.length > 0
              ? getMonthLabel(logs[0].dateKey)
              : getMonthLabel(currentWindow.endKey);

          const reportText = formatWeeklyReportText({
            studentName: student.fullName,
            madrassahName,
            monthLabel,
            logs,
          });

          await setDoc(
            doc(
              db,
              "madrassahs",
              madrassahId,
              "reportRuns",
              currentWindow.runId,
              "reports",
              student.id
            ),
            {
              studentId: student.id,
              studentName: student.fullName,
              parentName: student.parentName,
              parentPhone: student.parentPhone,
              parentEmail: student.parentEmail,
              reportText,
              monthLabel,
              hasLogs: logs.length > 0,
              logCount: logs.length,
              runId: currentWindow.runId,
              startKey: currentWindow.startKey,
              endKey: currentWindow.endKey,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        })
      );

      await loadRuns();
      setSelectedRunId(currentWindow.runId);
      await loadReportsForRun(currentWindow.runId);
      setMsg("Current week reports generated successfully.");
    } catch (err: any) {
      setPageError(err?.message || "Could not generate reports.");
    } finally {
      setPreparing(false);
    }
  }

  async function handleSendWhatsApp(report: StoredReportRow) {
    const opened = openWhatsAppMessage(report.parentPhone, report.reportText);

    if (!opened) return;
    if (!madrassahId || !firebaseUser?.uid || !selectedRunId) return;

    try {
      await updateDoc(
        doc(
          db,
          "madrassahs",
          madrassahId,
          "reportRuns",
          selectedRunId,
          "reports",
          report.studentId
        ),
        {
          sentAt: serverTimestamp(),
          sentByUid: firebaseUser.uid,
          sentByEmail: profile?.email || firebaseUser.email || "",
        }
      );

      setSentId(report.studentId);

      setReports((prev) =>
        prev.map((item) =>
          item.studentId === report.studentId
            ? {
                ...item,
                sentAt: new Date(),
                sentByEmail: profile?.email || firebaseUser.email || "",
              }
            : item
        )
      );

      window.setTimeout(() => setSentId(null), 1400);
    } catch {
      alert("WhatsApp opened, but the system could not mark this report as sent.");
    }
  }

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
          {error || "Could not load reports page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title={`${madrassahName} Reports`}
      subtitle="Generate weekly reports from the super admin side, open WhatsApp directly to the parent, and track which reports have been sent."
      eyebrow="Super Admin • Weekly Reports"
      rightSlot={
        <>
          <PremiumBadge>{currentWindow.label}</PremiumBadge>
          <button
            type="button"
            onClick={handlePrepareCurrentRun}
            disabled={preparing}
            className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)] disabled:opacity-60"
          >
            {preparing ? "Generating..." : "Generate Reports"}
          </button>
        </>
      }
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {pageError}
        </div>
      ) : null}

      {msg ? (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/80">
          {msg}
        </div>
      ) : null}

      <div className="mb-6 flex justify-end xl:hidden">
        <button
          type="button"
          onClick={handlePrepareCurrentRun}
          disabled={preparing}
          className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)] disabled:opacity-60"
        >
          {preparing ? "Generating..." : "Generate Reports"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard
          label="Report Runs"
          value={String(runs.length)}
          subtext="Saved weekly run history."
        />
        <PremiumStatCard
          label="Reports With Logs"
          value={String(withLogsCount)}
          subtext="Prepared reports backed by logs."
        />
        <PremiumStatCard
          label="Sent"
          value={String(sentCount)}
          subtext="Reports opened in WhatsApp."
        />
        <PremiumStatCard
          label="Total Reports"
          value={String(reports.length)}
          subtext="Reports in this selected run."
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
          <div className="mb-4 flex flex-wrap gap-2">
            <PremiumBadge>Current Window</PremiumBadge>
            <PremiumBadge>{currentWindow.label}</PremiumBadge>
          </div>

          <p className="text-sm font-medium text-white/75">Report History</p>

          <div className="mt-4 grid gap-3">
            {loadingPage ? (
              <p className="text-sm text-white/55">Loading runs...</p>
            ) : runs.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/55">
                No report runs yet.
              </div>
            ) : (
              runs.map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  active={selectedRunId === run.id}
                  onClick={() => setSelectedRunId(run.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
          <input
            type="text"
            placeholder="Search by student, parent, phone, email, or report content..."
            className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="mt-6">
            {loadingReports ? (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-8 text-center text-white/60">
                Loading reports...
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-10 text-center text-white/60">
                {selectedRunId
                  ? "No reports matched your search."
                  : "Select or generate a run first."}
              </div>
            ) : (
              <div className="grid gap-5">
                {filteredReports.map((report) => (
                  <ReportCard
                    key={report.studentId}
                    report={report}
                    sentId={sentId}
                    onSendWhatsApp={handleSendWhatsApp}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
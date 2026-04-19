"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../../../app/lib/firebase";
import { useRequireSuperAdmin } from "../../../lib/auth-guards";
import { getCurrentReportWindow } from "../../../lib/report-run";
import { DashboardShell, PremiumBadge, PremiumStatCard } from "../../../components/dashboard-shell";

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

function ReportTrackingCard({
  report,
  isBusy,
  onToggleSent,
}: {
  report: StoredReportRow;
  isBusy: boolean;
  onToggleSent: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{report.studentName}</h2>
            {report.hasLogs ? <PremiumBadge>{report.logCount} log(s)</PremiumBadge> : <PremiumBadge>No logs</PremiumBadge>}
            {report.copiedAt ? <PremiumBadge>Copied</PremiumBadge> : null}
            {report.sentAt ? <PremiumBadge>Sent</PremiumBadge> : null}
          </div>

          <div className="mt-3 space-y-1 text-sm text-white/60">
            <p>Parent: {report.parentName || "—"}</p>
            <p>Phone: {report.parentPhone || "—"}</p>
            <p>Email: {report.parentEmail || "—"}</p>
            {report.copiedByEmail ? <p>Copied by: {report.copiedByEmail}</p> : null}
            {report.sentByEmail ? <p>Sent by: {report.sentByEmail}</p> : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleSent}
          disabled={isBusy}
          className={`rounded-full px-5 py-3 text-sm font-medium ${
            report.sentAt
              ? "border border-red-500/20 bg-red-500/10 text-red-200"
              : "bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] text-black"
          } disabled:opacity-60`}
        >
          {isBusy ? "Saving..." : report.sentAt ? "Mark Unsent" : "Mark Sent"}
        </button>
      </div>
    </div>
  );
}

export default function SuperAdminReportTrackingDetailPage() {
  const params = useParams<{ madrassahId: string }>();
  const madrassahId = params?.madrassahId || "";
  const { loading, profile, firebaseUser, error } = useRequireSuperAdmin();

  const [madrassahName, setMadrassahName] = useState("Madrassah");
  const [reports, setReports] = useState<StoredReportRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [pageError, setPageError] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const currentWindow = useMemo(() => getCurrentReportWindow(), []);

  async function loadPage() {
    if (!madrassahId) return;

    setLoadingData(true);
    setPageError("");
    setMsg("");

    try {
      const [madrassahSnap, reportsSnap] = await Promise.all([
        getDoc(doc(db, "madrassahs", madrassahId)),
        getDocs(
          query(
            collection(db, "madrassahs", madrassahId, "reportRuns", currentWindow.runId, "reports"),
            orderBy("studentName")
          )
        ),
      ]);

      if (madrassahSnap.exists()) {
        const data = madrassahSnap.data() as any;
        setMadrassahName(String(data.name || "Madrassah"));
      }

      const nextReports: StoredReportRow[] = reportsSnap.docs.map((docSnap) => {
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
      setPageError(err?.message || "Could not load report tracking.");
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!loading && profile) loadPage();
  }, [loading, profile, madrassahId]);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return reports;

    return reports.filter((report) =>
      [report.studentName, report.parentName, report.parentPhone, report.parentEmail]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [reports, search]);

  async function handleToggleSent(report: StoredReportRow) {
    if (!firebaseUser?.uid) return;

    setBusyId(report.studentId);
    setPageError("");
    setMsg("");

    try {
      const ref = doc(
        db,
        "madrassahs",
        madrassahId,
        "reportRuns",
        currentWindow.runId,
        "reports",
        report.studentId
      );

      if (report.sentAt) {
        await updateDoc(ref, {
          sentAt: null,
          sentByUid: "",
          sentByEmail: "",
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(ref, {
          sentAt: serverTimestamp(),
          sentByUid: firebaseUser.uid,
          sentByEmail: profile?.email || firebaseUser.email || "",
          updatedAt: serverTimestamp(),
        });
      }

      await loadPage();
      setMsg(`${report.studentName} status updated.`);
    } catch (err: any) {
      setPageError(err?.message || "Could not update sent status.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-black text-white">Loading...</main>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center bg-black px-6 text-white">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-200">
          {error || "Could not load report tracking detail page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title={madrassahName}
      subtitle="Track the current weekly report run and mark reports as sent once they’ve been handled."
      eyebrow="Super Admin • Report Tracking Detail"
      rightSlot={
        <>
          <PremiumBadge>{currentWindow.label}</PremiumBadge>
          <PremiumBadge>{reports.length} report(s)</PremiumBadge>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard label="Prepared" value={String(reports.length)} subtext="Reports in the current run." />
        <PremiumStatCard label="Copied" value={String(reports.filter((r) => !!r.copiedAt).length)} subtext="Copied reports in this run." />
        <PremiumStatCard label="Sent" value={String(reports.filter((r) => !!r.sentAt).length)} subtext="Sent reports in this run." />
        <PremiumStatCard label="Unsent" value={String(reports.filter((r) => !r.sentAt).length)} subtext="Still needing action." />
      </div>

      <div className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        <input
          type="text"
          placeholder="Search by student or parent details..."
          className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-8">
        {loadingData ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
            Loading reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            {reports.length === 0 ? "No reports prepared for this run yet." : "No reports matched your search."}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <ReportTrackingCard
                key={report.studentId}
                report={report}
                isBusy={busyId === report.studentId}
                onToggleSent={() => handleToggleSent(report)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../app/lib/firebase";
import { useRequireSuperAdmin } from "../../lib/auth-guards";
import { getCurrentReportWindow } from "../../lib/report-run";
import { DashboardShell, PremiumBadge, PremiumStatCard } from "../../components/dashboard-shell";

type ReportTenantRow = {
  madrassahId: string;
  madrassahName: string;
  totalStudents: number;
  reportsPrepared: number;
  reportsCopied: number;
  reportsSent: number;
  hasCurrentRun: boolean;
};

function TrackingCard({ row }: { row: ReportTenantRow }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{row.madrassahName}</h2>
            {row.hasCurrentRun ? <PremiumBadge>Prepared</PremiumBadge> : <PremiumBadge>Not Prepared</PremiumBadge>}
          </div>

          <p className="mt-2 text-sm text-white/55">
            ID: <span className="font-mono text-xs">{row.madrassahId}</span>
          </p>
        </div>

        <div className="grid gap-2 text-sm text-white/65 xl:text-right">
          <p>Total Students: {row.totalStudents}</p>
          <p>Prepared: {row.reportsPrepared}</p>
          <p>Copied: {row.reportsCopied}</p>
          <p>Sent: {row.reportsSent}</p>
        </div>

        <Link
          href={`/super-admin/reports/${row.madrassahId}`}
          className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-5 py-3 text-sm font-semibold text-black"
        >
          Open Tracking
        </Link>
      </div>
    </div>
  );
}

export default function SuperAdminReportsPage() {
  const { loading, profile, error } = useRequireSuperAdmin();
  const [rows, setRows] = useState<ReportTenantRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");

  const currentWindow = useMemo(() => getCurrentReportWindow(), []);

  useEffect(() => {
    async function loadRows() {
      setLoadingRows(true);
      setPageError("");

      try {
        const madrassahSnap = await getDocs(query(collection(db, "madrassahs"), orderBy("name")));

        const results = await Promise.all(
          madrassahSnap.docs.map(async (docSnap) => {
            const data = docSnap.data() as any;
            const madrassahId = docSnap.id;

            const [studentsSnap, reportsSnap] = await Promise.all([
              getDocs(collection(db, "madrassahs", madrassahId, "students")),
              getDocs(collection(db, "madrassahs", madrassahId, "reportRuns", currentWindow.runId, "reports")),
            ]);

            const reportRows = reportsSnap.docs.map((d) => d.data() as any);

            return {
              madrassahId,
              madrassahName: String(data.name || "Madrassah"),
              totalStudents: studentsSnap.size,
              reportsPrepared: reportsSnap.size,
              reportsCopied: reportRows.filter((r) => !!r.copiedAt).length,
              reportsSent: reportRows.filter((r) => !!r.sentAt).length,
              hasCurrentRun: reportsSnap.size > 0,
            } satisfies ReportTenantRow;
          })
        );

        setRows(results);
      } catch (err: any) {
        setPageError(err?.message || "Could not load report tracking.");
      } finally {
        setLoadingRows(false);
      }
    }

    if (!loading && profile) loadRows();
  }, [loading, profile, currentWindow.runId]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.madrassahName, row.madrassahId].join(" ").toLowerCase().includes(term)
    );
  }, [rows, search]);

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-black text-white">Loading...</main>;
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
      title="Report Tracking"
      subtitle="Track which madrassahs have prepared reports for the current week, and how far each workflow has moved."
      eyebrow="Super Admin • Reports"
      rightSlot={<PremiumBadge>{currentWindow.label}</PremiumBadge>}
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {pageError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard label="Madrassahs" value={String(rows.length)} subtext="Tenants shown in report tracking." />
        <PremiumStatCard label="Prepared" value={String(rows.filter((r) => r.hasCurrentRun).length)} subtext="Have a current run prepared." />
        <PremiumStatCard label="Copied" value={String(rows.reduce((sum, r) => sum + r.reportsCopied, 0))} subtext="Copied report count across tenants." />
        <PremiumStatCard label="Sent" value={String(rows.reduce((sum, r) => sum + r.reportsSent, 0))} subtext="Sent report count across tenants." />
      </div>

      <div className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        <input
          type="text"
          placeholder="Search by madrassah name or ID..."
          className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-8">
        {loadingRows ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
            Loading report tracking...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            {rows.length === 0 ? "No madrassahs found." : "No results matched your search."}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRows.map((row) => (
              <TrackingCard key={row.madrassahId} row={row} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
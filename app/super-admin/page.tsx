"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../app/lib/firebase";
import { useRequireSuperAdmin } from "../lib/auth-guards";
import { getDateKeySA, shiftDateKey } from "../lib/date";
import { getCurrentReportWindow } from "../lib/report-run";
import {
  DashboardShell,
  PremiumActionCard,
  PremiumBadge,
  PremiumStatCard,
} from "../components/dashboard-shell";

type SuperAdminStats = {
  totalMadrassahs: number;
  activeMadrassahs: number;
  totalStudents: number;
  totalStaff: number;
  madrassahsWithRecentLogs: number;
};

type MadrassahAlertRow = {
  id: string;
  name: string;
  subscriptionStatus: string;
  onboardingStatus: string;
  isActive: boolean;
  totalStudents: number;
  inactiveStudents: number;
  latestLogDateKey: string;
  hasCurrentRun: boolean;
};

function AlertPanel({
  title,
  count,
  items,
  emptyText,
}: {
  title: string;
  count: number;
  items: Array<{ id: string; href: string; title: string; meta1?: string; meta2?: string }>;
  emptyText: string;
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{title}</h3>
        <PremiumBadge>{count}</PremiumBadge>
      </div>

      <div className="mt-5 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/58">
            {emptyText}
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:bg-white/[0.05]"
            >
              <p className="font-medium text-white">{item.title}</p>
              {item.meta1 ? <p className="mt-1 text-sm text-white/60">{item.meta1}</p> : null}
              {item.meta2 ? <p className="mt-1 text-xs text-white/45">{item.meta2}</p> : null}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export default function SuperAdminHomePage() {
  const { loading, profile, error } = useRequireSuperAdmin();

  const [stats, setStats] = useState<SuperAdminStats>({
    totalMadrassahs: 0,
    activeMadrassahs: 0,
    totalStudents: 0,
    totalStaff: 0,
    madrassahsWithRecentLogs: 0,
  });

  const [rows, setRows] = useState<MadrassahAlertRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [pageError, setPageError] = useState("");

  const currentWindow = useMemo(() => getCurrentReportWindow(), []);
  const todayKey = useMemo(() => getDateKeySA(), []);
  const sevenDaysAgo = useMemo(() => shiftDateKey(todayKey, -7), [todayKey]);

  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      setPageError("");

      try {
        const madrassahSnap = await getDocs(query(collection(db, "madrassahs"), orderBy("name")));
        const madrassahs = madrassahSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any),
        }));

        let totalStudents = 0;
        let totalStaff = 0;
        let madrassahsWithRecentLogs = 0;

        const alertRows = await Promise.all(
          madrassahs.map(async (m) => {
            const [studentsSnap, staffSnap, currentRunReportsSnap] = await Promise.all([
              getDocs(collection(db, "madrassahs", m.id, "students")),
              getDocs(collection(db, "madrassahs", m.id, "staff")),
              getDocs(
                collection(db, "madrassahs", m.id, "reportRuns", currentWindow.runId, "reports")
              ),
            ]);

            const studentRows = studentsSnap.docs.map((s) => s.data() as any);
            const inactiveStudents = studentRows.filter((s) => s.isActive === false).length;

            let latestLogDateKey = "";
            const hasRecent = studentRows.some((s) => {
              const lastLogDateKey = String(s.lastLogDateKey || "");
              if (lastLogDateKey && (!latestLogDateKey || lastLogDateKey > latestLogDateKey)) {
                latestLogDateKey = lastLogDateKey;
              }
              return lastLogDateKey && lastLogDateKey >= sevenDaysAgo && lastLogDateKey <= todayKey;
            });

            totalStudents += studentRows.length;
            totalStaff += staffSnap.size;
            if (hasRecent) madrassahsWithRecentLogs += 1;

            return {
              id: m.id,
              name: String(m.name || "Madrassah"),
              subscriptionStatus: String(m.subscriptionStatus || ""),
              onboardingStatus: String(m.onboardingStatus || ""),
              isActive: m.isActive !== false,
              totalStudents: studentRows.length,
              inactiveStudents,
              latestLogDateKey,
              hasCurrentRun: currentRunReportsSnap.size > 0,
            } satisfies MadrassahAlertRow;
          })
        );

        setRows(alertRows);
        setStats({
          totalMadrassahs: madrassahs.length,
          activeMadrassahs: madrassahs.filter((m) => m.isActive !== false).length,
          totalStudents,
          totalStaff,
          madrassahsWithRecentLogs,
        });
      } catch (err: any) {
        setPageError(err?.message || "Could not load super admin stats.");
      } finally {
        setLoadingStats(false);
      }
    }

    if (!loading && profile) loadStats();
  }, [loading, profile, currentWindow.runId, sevenDaysAgo, todayKey]);

  const noRecentLogs = useMemo(
    () => rows.filter((row) => !row.latestLogDateKey || row.latestLogDateKey < sevenDaysAgo),
    [rows, sevenDaysAgo]
  );

  const overdueMadrassahs = useMemo(
    () => rows.filter((row) => row.subscriptionStatus === "overdue"),
    [rows]
  );

  const missingCurrentRun = useMemo(
    () => rows.filter((row) => !row.hasCurrentRun && row.totalStudents > 0),
    [rows]
  );

  const manyInactiveStudents = useMemo(
    () => rows.filter((row) => row.inactiveStudents >= 3),
    [rows]
  );

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-black text-white">Loading...</main>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center bg-black px-6 text-white">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-200">
          {error || "Could not load super admin area."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title="Platform Control Center"
      subtitle="Oversee madrassahs, monitor growth, catch billing and activity issues early, and run the platform cleanly."
      eyebrow="Super Admin"
      rightSlot={
        <>
          <PremiumBadge>Current Run: {currentWindow.label}</PremiumBadge>
          <PremiumBadge>{profile.email || "Super Admin"}</PremiumBadge>
        </>
      }
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {pageError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <PremiumStatCard label="Madrassahs" value={loadingStats ? "..." : String(stats.totalMadrassahs)} subtext="Total tenants on the platform." />
        <PremiumStatCard label="Active" value={loadingStats ? "..." : String(stats.activeMadrassahs)} subtext="Currently active madrassahs." />
        <PremiumStatCard label="Students" value={loadingStats ? "..." : String(stats.totalStudents)} subtext="Students across all madrassahs." />
        <PremiumStatCard label="Staff" value={loadingStats ? "..." : String(stats.totalStaff)} subtext="Admins and teachers across the platform." />
        <PremiumStatCard label="Recent Logs" value={loadingStats ? "..." : String(stats.madrassahsWithRecentLogs)} subtext="Madrassahs with logs in last 7 days." />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <AlertPanel
          title="No Recent Logs"
          count={noRecentLogs.length}
          emptyText="Every madrassah has recent activity."
          items={noRecentLogs.slice(0, 6).map((row) => ({
            id: row.id,
            href: `/super-admin/madrassahs/${row.id}`,
            title: row.name,
            meta1: `Latest log: ${row.latestLogDateKey || "Never"}`,
          }))}
        />

        <AlertPanel
          title="Overdue Customers"
          count={overdueMadrassahs.length}
          emptyText="No overdue madrassahs right now."
          items={overdueMadrassahs.slice(0, 6).map((row) => ({
            id: row.id,
            href: `/super-admin/madrassahs/${row.id}`,
            title: row.name,
            meta1: `Subscription: ${row.subscriptionStatus}`,
          }))}
        />

        <AlertPanel
          title="Current Run Not Prepared"
          count={missingCurrentRun.length}
          emptyText="All madrassahs with students have a current run prepared."
          items={missingCurrentRun.slice(0, 6).map((row) => ({
            id: row.id,
            href: `/super-admin/reports/${row.id}`,
            title: row.name,
            meta1: `Students: ${row.totalStudents}`,
          }))}
        />

        <AlertPanel
          title="Many Inactive Students"
          count={manyInactiveStudents.length}
          emptyText="No madrassah has a large inactive student count right now."
          items={manyInactiveStudents.slice(0, 6).map((row) => ({
            id: row.id,
            href: `/super-admin/madrassahs/${row.id}`,
            title: row.name,
            meta1: `Inactive students: ${row.inactiveStudents}`,
          }))}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <PremiumActionCard
          title="Madrassahs"
          text="Browse tenants, inspect size, billing state, onboarding state, and activity."
          href="/super-admin/madrassahs"
        />
        <PremiumActionCard
          title="Reports"
          text="Track report preparation, copied state, and sent state across madrassahs."
          href="/super-admin/reports"
        />
        <PremiumActionCard
          title="Back to Dashboard"
          text="Return to the normal product dashboard if you need to work inside one madrassah context."
          href="/dashboard"
        />
      </div>
    </DashboardShell>
  );
}
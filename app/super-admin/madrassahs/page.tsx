"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../app/lib/firebase";
import { useRequireSuperAdmin } from "../../lib/auth-guards";
import { DashboardShell, PremiumBadge, PremiumStatCard } from "../../components/dashboard-shell";

type MadrassahRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  studentCount: number;
  staffCount: number;
  lastLogDateKey: string;
  subscriptionStatus: string;
  onboardingStatus: string;
  plan: string;
};

function RowCard({ row }: { row: MadrassahRow }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{row.name || "Unnamed Madrassah"}</h2>
            <PremiumBadge>{row.isActive ? "Active" : "Inactive"}</PremiumBadge>
            {row.subscriptionStatus ? <PremiumBadge>{row.subscriptionStatus}</PremiumBadge> : null}
            {row.onboardingStatus ? <PremiumBadge>{row.onboardingStatus}</PremiumBadge> : null}
            {row.plan ? <PremiumBadge>{row.plan}</PremiumBadge> : null}
          </div>

          <div className="mt-3 space-y-1 text-sm text-white/60">
            <p>Slug: {row.slug || "—"}</p>
            <p>Madrassah ID: <span className="font-mono text-xs">{row.id}</span></p>
            <p>Latest Log: {row.lastLogDateKey || "—"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:items-end">
          <div className="grid gap-2 text-sm text-white/65 xl:text-right">
            <p>Students: {row.studentCount}</p>
            <p>Staff: {row.staffCount}</p>
          </div>

          <Link
            href={`/super-admin/madrassahs/${row.id}`}
            className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-5 py-3 text-sm font-semibold text-black"
          >
            Open Control Page
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminMadrassahsPage() {
  const { loading, profile, error } = useRequireSuperAdmin();

  const [rows, setRows] = useState<MadrassahRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadRows() {
      setLoadingRows(true);
      setPageError("");

      try {
        const snap = await getDocs(query(collection(db, "madrassahs"), orderBy("name")));

        const results = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const data = docSnap.data() as any;
            const madrassahId = docSnap.id;

            const [studentsSnap, staffSnap] = await Promise.all([
              getDocs(collection(db, "madrassahs", madrassahId, "students")),
              getDocs(collection(db, "madrassahs", madrassahId, "staff")),
            ]);

            let lastLogDateKey = "";
            studentsSnap.docs.forEach((s) => {
              const sd = s.data() as any;
              const current = String(sd.lastLogDateKey || "");
              if (current && (!lastLogDateKey || current > lastLogDateKey)) {
                lastLogDateKey = current;
              }
            });

            return {
              id: madrassahId,
              name: String(data.name || ""),
              slug: String(data.slug || ""),
              isActive: data.isActive !== false,
              studentCount: studentsSnap.size,
              staffCount: staffSnap.size,
              lastLogDateKey,
              subscriptionStatus: String(data.subscriptionStatus || ""),
              onboardingStatus: String(data.onboardingStatus || ""),
              plan: String(data.plan || ""),
            } satisfies MadrassahRow;
          })
        );

        setRows(results);
      } catch (err: any) {
        setPageError(err?.message || "Could not load madrassahs.");
      } finally {
        setLoadingRows(false);
      }
    }

    if (!loading && profile) loadRows();
  }, [loading, profile]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      [
        row.name,
        row.slug,
        row.lastLogDateKey,
        row.subscriptionStatus,
        row.onboardingStatus,
        row.plan,
        row.isActive ? "active" : "inactive",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [rows, search]);

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-black text-white">Loading...</main>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center bg-black px-6 text-white">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-200">
          {error || "Could not load madrassahs page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title="All Madrassahs"
      subtitle="Search platform tenants, inspect their size and state, and move quickly into billing and control work."
      eyebrow="Super Admin • Madrassahs"
      rightSlot={<PremiumBadge>{rows.length} total</PremiumBadge>}
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {pageError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard label="Total" value={String(rows.length)} subtext="All madrassahs on the platform." />
        <PremiumStatCard label="Active" value={String(rows.filter((r) => r.isActive).length)} subtext="Currently active tenants." />
        <PremiumStatCard label="Overdue" value={String(rows.filter((r) => r.subscriptionStatus === "overdue").length)} subtext="Need payment follow-up." />
        <PremiumStatCard label="Live" value={String(rows.filter((r) => r.onboardingStatus === "live").length)} subtext="Fully onboarded madrassahs." />
      </div>

      <div className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        <input
          type="text"
          placeholder="Search by name, slug, plan, status, onboarding, or latest log date..."
          className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-8">
        {loadingRows ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
            Loading madrassahs...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            {rows.length === 0 ? "No madrassahs found." : "No madrassahs matched your search."}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRows.map((row) => (
              <RowCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
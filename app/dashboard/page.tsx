"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useRequireAdmin } from "../lib/auth-guards";
import {
  DashboardShell,
  PremiumBadge,
  PremiumStatCard,
} from "../components/dashboard-shell";

type StaffRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: "admin" | "teacher";
  isActive: boolean;
};

function RoleBadge({ role }: { role: "admin" | "teacher" }) {
  const styles =
    role === "admin"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
      : "border-white/10 bg-white/5 text-white/75";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>
      {role === "admin" ? "Admin" : "Teacher"}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const styles = active
    ? "border-green-500/20 bg-green-500/10 text-green-200"
    : "border-red-500/20 bg-red-500/10 text-red-200";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function StaffCard({
  person,
  isBusy,
  onToggle,
}: {
  person: StaffRow;
  isBusy: boolean;
  onToggle: () => void;
}) {
  const canToggle = person.role === "teacher";

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
              {person.fullName || "Unnamed Staff"}
            </h3>
            <RoleBadge role={person.role} />
            <StatusBadge active={person.isActive} />
          </div>

          <div className="mt-3 space-y-1 text-sm text-white/60">
            <p>Email: {person.email || "—"}</p>
            <p>Phone: {person.phone || "—"}</p>
            <p className="font-mono text-xs text-white/40">User ID: {person.userId || "—"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canToggle ? (
            <button
              type="button"
              onClick={onToggle}
              disabled={isBusy}
              className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                person.isActive
                  ? "border border-red-500/20 bg-red-500/10 text-red-200"
                  : "bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)]"
              } disabled:opacity-60`}
            >
              {isBusy ? "Saving..." : person.isActive ? "Deactivate" : "Activate"}
            </button>
          ) : (
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/55">
              Admin Protected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeachersPage() {
  const { loading, profile, error } = useRequireAdmin();

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadPageData(currentMadrassahId: string) {
    setLoadingData(true);
    setPageError("");
    setActionMsg("");

    try {
      const [staffSnap, configSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "madrassahs", currentMadrassahId, "staff"),
            orderBy("fullName")
          )
        ),
        getDoc(doc(db, "madrassahs", currentMadrassahId, "private", "config")),
      ]);

      const rows: StaffRow[] = staffSnap.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          userId: String(data.userId || docSnap.id),
          fullName: String(data.fullName || ""),
          email: String(data.email || ""),
          phone: String(data.phone || ""),
          role: data.role === "admin" ? "admin" : "teacher",
          isActive: data.isActive !== false,
        };
      });

      setStaff(rows);
      setJoinCode(configSnap.exists() ? String((configSnap.data() as any).joinCode || "") : "");
    } catch (err: any) {
      setPageError(err?.message || "Could not load teachers.");
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!loading && profile?.madrassahId) {
      loadPageData(profile.madrassahId);
    }
  }, [loading, profile]);

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staff;

    return staff.filter((person) => {
      const haystack = [
        person.fullName,
        person.email,
        person.phone,
        person.role,
        person.isActive ? "active" : "inactive",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [staff, search]);

  const teacherCount = staff.filter((s) => s.role === "teacher").length;
  const adminCount = staff.filter((s) => s.role === "admin").length;
  const activeCount = staff.filter((s) => s.isActive).length;

  async function handleToggleTeacher(person: StaffRow) {
    if (!profile?.madrassahId) {
      setPageError("Your account is not linked to a madrassah.");
      return;
    }

    if (person.role === "admin") {
      setPageError("Admin accounts cannot be toggled from here.");
      return;
    }

    setBusyId(person.id);
    setPageError("");
    setActionMsg("");

    const nextIsActive = !person.isActive;

    try {
      const staffRef = doc(db, "madrassahs", profile.madrassahId, "staff", person.id);
      const userRef = doc(db, "users", person.userId);

      await Promise.all([
        updateDoc(staffRef, {
          isActive: nextIsActive,
          updatedAt: serverTimestamp(),
        }),
        updateDoc(userRef, {
          isActive: nextIsActive,
          updatedAt: serverTimestamp(),
        }),
      ]);

      setStaff((prev) =>
        prev.map((item) =>
          item.id === person.id ? { ...item, isActive: nextIsActive } : item
        )
      );

      setActionMsg(
        `${person.fullName || "Teacher"} has been ${
          nextIsActive ? "activated" : "deactivated"
        }.`
      );
    } catch (err: any) {
      setPageError(err?.message || "Could not update teacher status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCopyJoinCode() {
    try {
      await navigator.clipboard.writeText(joinCode);
      setActionMsg("Join code copied.");
      window.setTimeout(() => setActionMsg(""), 1200);
    } catch {
      setPageError("Could not copy join code.");
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
          {error || "Could not load teachers page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title="Teacher Management"
      subtitle="Manage staff access, monitor teacher status, and keep the madrassah team organized with confidence."
      eyebrow="Staff & Access Control"
      rightSlot={
        <>
          {joinCode ? <PremiumBadge>Join Code: {joinCode}</PremiumBadge> : null}
          <button
            type="button"
            onClick={handleCopyJoinCode}
            disabled={!joinCode}
            className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)] disabled:opacity-60"
          >
            Copy Join Code
          </button>
        </>
      }
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {pageError}
        </div>
      ) : null}

      {actionMsg ? (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/80">
          {actionMsg}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard
          label="Total Staff"
          value={String(staff.length)}
          subtext="All staff records linked to this madrassah."
        />
        <PremiumStatCard
          label="Admins"
          value={String(adminCount)}
          subtext="Protected admin accounts."
        />
        <PremiumStatCard
          label="Teachers"
          value={String(teacherCount)}
          subtext="Teacher accounts in the system."
        />
        <PremiumStatCard
          label="Active Staff"
          value={String(activeCount)}
          subtext="Currently active staff members."
        />
      </div>

      <div className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        <input
          type="text"
          placeholder="Search by name, email, phone, role, or status..."
          className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-8">
        {loadingData ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
            Loading staff...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            {staff.length === 0
              ? "No staff records found yet."
              : "No staff matched your search."}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredStaff.map((person) => (
              <StaffCard
                key={person.id}
                person={person}
                isBusy={busyId === person.id}
                onToggle={() => handleToggleTeacher(person)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
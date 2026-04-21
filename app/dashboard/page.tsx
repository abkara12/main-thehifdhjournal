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
      ? "border-[#B8963D]/25 bg-[#B8963D]/10 text-[#7b6128]"
      : "border-gray-300 bg-white/75 text-[#5e5e5e]";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>
      {role === "admin" ? "Admin" : "Teacher"}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const styles = active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";

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
    <div className="rounded-[28px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#171717] sm:text-xl">
              {person.fullName || "Unnamed Staff"}
            </h3>
            <RoleBadge role={person.role} />
            <StatusBadge active={person.isActive} />
          </div>

          <div className="mt-3 space-y-1 text-sm text-[#5f5f5f]">
            <p className="break-all">Email: {person.email || "—"}</p>
            <p>Phone: {person.phone || "—"}</p>
            <p className="break-all font-mono text-xs text-[#8a8a8a]">
              User ID: {person.userId || "—"}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-3 xl:w-auto xl:justify-end">
          {canToggle ? (
            <button
              type="button"
              onClick={onToggle}
              disabled={isBusy}
              className={`min-h-[46px] rounded-full px-5 py-3 text-sm font-medium transition disabled:opacity-60 ${
                person.isActive
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "bg-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] hover:bg-[#1d1d1d]"
              }`}
            >
              {isBusy ? "Saving..." : person.isActive ? "Deactivate" : "Activate"}
            </button>
          ) : (
            <div className="rounded-full border border-gray-300 bg-white/75 px-5 py-3 text-sm font-medium text-[#6b6b6b]">
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
      <main className="grid min-h-screen place-items-center bg-[#F8F6F1] text-[#171717]">
        Loading...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F6F1] px-6 text-[#171717]">
        <div className="rounded-2xl border border-red-300 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error || "Could not load teachers page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
  title="Teacher Management"
  eyebrow={profile?.madrassahName || "Your Madrassah"}
  subtitle="Manage staff access, monitor teacher status, and keep the madrassah team organized with confidence."
      rightSlot={
        <div className="w-full lg:w-auto">
<div className="flex w-full flex-col items-center gap-4 text-center rounded-[24px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(255,255,255,0.56))] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:items-start sm:text-left lg:min-w-[250px] lg:max-w-[320px]">            {joinCode ? (
              <div className="flex flex-col items-center justify-center gap-2 text-center">
  <span className="text-xs uppercase tracking-[0.2em] text-[#8a8a8a]">
    Join Code
  </span>

  <div className="rounded-full border border-[#B8963D]/30 bg-[#B8963D]/10 px-6 py-2 text-lg font-semibold tracking-wider text-[#7b6128]">
    {joinCode}
  </div>
</div>
            ) : null}

            <button
  type="button"
  onClick={handleCopyJoinCode}
  disabled={!joinCode}
  className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d] disabled:opacity-60 sm:w-auto"
>
  Copy Join Code
</button>
          </div>
        </div>
      }
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {pageError}
        </div>
      ) : null}

      {actionMsg ? (
        <div className="mb-6 rounded-2xl border border-gray-300 bg-white/75 p-4 text-sm text-[#4f4f4f] shadow-sm backdrop-blur-xl">
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
      </div>

      <div className="mt-8 rounded-[30px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-5">
        <input
          type="text"
          placeholder="Search by name, email, phone, role, or status..."
          className="w-full rounded-2xl border border-gray-300 bg-white/85 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-8">
        {loadingData ? (
          <div className="rounded-[28px] border border-gray-300 bg-white/70 p-8 text-center text-[#666666] shadow-sm backdrop-blur-xl">
            Loading staff...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="rounded-[28px] border border-gray-300 bg-white/70 p-10 text-center text-[#666666] shadow-sm backdrop-blur-xl">
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
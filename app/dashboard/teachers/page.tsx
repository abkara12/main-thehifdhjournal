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
import { db } from "../../../app/lib/firebase";
import { useRequireAdmin } from "../../lib/auth-guards";

type StaffRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: "admin" | "teacher";
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

type ConfigDoc = {
  joinCode: string;
};

function RoleBadge({ role }: { role: "admin" | "teacher" }) {
  const styles =
    role === "admin"
      ? "border-[#B8963D]/25 bg-[#B8963D]/10 text-[#7b6128]"
      : "border-gray-300 bg-white/80 text-[#5e5e5e]";

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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[26px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8d7440]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#171717]">{value}</p>
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
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
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
      <main className="min-h-screen bg-transparent text-[#171717]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[#F8F6F1]" />
          <div className="absolute -top-72 -right-40 h-[900px] w-[900px] rounded-full bg-[#1F3F3F]/25 blur-3xl" />
          <div className="absolute bottom-[-25%] left-[-15%] h-[1000px] w-[1000px] rounded-full bg-[#B8963D]/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_70%_20%,rgba(184,150,61,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_10%,transparent_50%,rgba(0,0,0,0.08))]" />
          <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply bg-[url('/noise.png')]" />
        </div>

        <div className="grid min-h-screen place-items-center px-6">
          <div className="rounded-2xl border border-gray-300 bg-white/75 px-6 py-4 text-sm text-[#5f5f5f] shadow-sm backdrop-blur-xl">
            Loading...
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-transparent text-[#171717]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[#F8F6F1]" />
          <div className="absolute -top-72 -right-40 h-[900px] w-[900px] rounded-full bg-[#1F3F3F]/25 blur-3xl" />
          <div className="absolute bottom-[-25%] left-[-15%] h-[1000px] w-[1000px] rounded-full bg-[#B8963D]/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_70%_20%,rgba(184,150,61,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_10%,transparent_50%,rgba(0,0,0,0.08))]" />
          <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply bg-[url('/noise.png')]" />
        </div>

        <div className="grid min-h-screen place-items-center px-6">
          <div className="rounded-2xl border border-red-300 bg-red-50 px-6 py-4 text-sm text-red-700 shadow-sm">
            {error || "Could not load teachers page."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-6 text-[#171717] sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#F8F6F1]" />
        <div className="absolute -top-72 -right-40 h-[900px] w-[900px] rounded-full bg-[#1F3F3F]/25 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-15%] h-[1000px] w-[1000px] rounded-full bg-[#B8963D]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_70%_20%,rgba(184,150,61,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_10%,transparent_50%,rgba(0,0,0,0.08))]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply bg-[url('/noise.png')]" />
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[32px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.62))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-2xl sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#8d7440]">
            Dashboard → Teachers
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-4xl">
            Teacher Management
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5f5f5f] sm:text-base">
            View staff, manage teacher access, and keep your madrassah team
            organized as the system grows.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Staff" value={staff.length} />
            <StatCard label="Admins" value={adminCount} />
            <StatCard label="Teachers" value={teacherCount} />
          </div>
        </div>

        {pageError ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            {pageError}
          </div>
        ) : null}

        {actionMsg ? (
          <div className="rounded-2xl border border-gray-300 bg-white/78 p-4 text-sm text-[#4f4f4f] shadow-sm backdrop-blur-xl">
            {actionMsg}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-[32px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.62))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8d7440]">
              Teacher Access
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#171717]">
              Teacher Join Code
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">
              Share this code with teachers so they can join this madrassah from
              the join page.
            </p>

            <div className="mt-5 rounded-[24px] border border-gray-300 bg-white/82 p-5 shadow-sm">
              <p className="text-sm text-[#7a7a7a]">Join Code</p>
              <p className="mt-3 break-all font-mono text-2xl font-semibold tracking-[0.22em] text-[#171717]">
                {joinCode || "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyJoinCode}
              disabled={!joinCode}
              className="mt-4 w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d] disabled:opacity-60 sm:w-auto"
            >
              Copy Join Code
            </button>
          </section>

          <section className="rounded-[32px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.62))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#8d7440]">
                  Staff Access
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Staff Directory
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">
                  Search staff and control whether teachers can access the system.
                </p>
              </div>

              <div className="w-full md:max-w-sm">
                <input
                  type="text"
                  placeholder="Search by name, email, phone, role, status..."
                  className="w-full rounded-2xl border border-gray-300 bg-white/88 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6">
              {loadingData ? (
                <div className="rounded-2xl border border-gray-300 bg-white/82 p-6 text-center text-[#666666]">
                  Loading staff...
                </div>
              ) : filteredStaff.length === 0 ? (
                <div className="rounded-2xl border border-gray-300 bg-white/82 p-6 text-center text-[#666666]">
                  {staff.length === 0
                    ? "No staff records found yet."
                    : "No staff matched your search."}
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredStaff.map((person) => {
                    const isBusy = busyId === person.id;
                    const canToggle = person.role === "teacher";

                    return (
                      <div
                        key={person.id}
                        className="rounded-[26px] border border-gray-300 bg-white/82 p-5 shadow-sm backdrop-blur-xl"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                                {person.fullName || "Unnamed Staff"}
                              </h3>
                              <RoleBadge role={person.role} />
                              <StatusBadge active={person.isActive} />
                            </div>

                            <div className="mt-3 text-sm text-[#6a6a6a]">
  {person.role === "admin" ? "Madrassah Admin" : "Teacher Account"}
</div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {canToggle ? (
                              <button
                                type="button"
                                onClick={() => handleToggleTeacher(person)}
                                disabled={isBusy}
                                className={`rounded-full px-5 py-3 text-sm font-medium transition disabled:opacity-60 ${
                                  person.isActive
                                    ? "border border-red-200 bg-red-50 text-red-700"
                                    : "bg-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] hover:bg-[#1d1d1d]"
                                }`}
                              >
                                {isBusy
                                  ? "Saving..."
                                  : person.isActive
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            ) : (
                              <div className="rounded-full border border-gray-300 bg-white/80 px-5 py-3 text-sm font-medium text-[#6b6b6b]">
                                Admin protected
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
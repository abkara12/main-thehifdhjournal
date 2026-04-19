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
      <main className="min-h-screen grid place-items-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
          Loading...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div>{error || "Could not load teachers page."}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            Dashboard → Teachers
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Teacher Management
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 sm:text-base">
            View staff, manage teacher access, and keep your madrassah team
            organized as the system grows.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Total Staff</p>
              <p className="mt-3 text-2xl font-semibold">{staff.length}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Admins</p>
              <p className="mt-3 text-2xl font-semibold">{adminCount}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Teachers</p>
              <p className="mt-3 text-2xl font-semibold">{teacherCount}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Active Staff</p>
              <p className="mt-3 text-2xl font-semibold">{activeCount}</p>
            </div>
          </div>
        </div>

        {pageError ? (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {pageError}
          </div>
        ) : null}

        {actionMsg ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            {actionMsg}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <h2 className="text-xl font-semibold">Teacher Join Code</h2>
            <p className="mt-2 text-sm leading-7 text-white/60">
              Share this code with teachers so they can join this madrassah from
              the join page.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="font-mono text-2xl font-semibold tracking-[0.22em]">
                {joinCode || "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyJoinCode}
              disabled={!joinCode}
              className="mt-4 rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-60"
            >
              Copy Join Code
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Staff Directory</h2>
                <p className="mt-2 text-sm leading-7 text-white/60">
                  Search staff and control whether teachers can access the system.
                </p>
              </div>

              <div className="w-full md:max-w-sm">
                <input
                  type="text"
                  placeholder="Search by name, email, phone, role, status..."
                  className="w-full rounded-2xl bg-white/10 p-4 outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6">
              {loadingData ? (
                <p className="text-white/70">Loading staff...</p>
              ) : filteredStaff.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-white/60">
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
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-xl font-semibold">
                                {person.fullName || "Unnamed Staff"}
                              </h3>
                              <RoleBadge role={person.role} />
                              <StatusBadge active={person.isActive} />
                            </div>

                            <div className="mt-3 space-y-1 text-sm text-white/60">
                              <p>Email: {person.email || "—"}</p>
                              <p>Phone: {person.phone || "—"}</p>
                              <p className="font-mono text-xs text-white/45">
                                User ID: {person.userId || "—"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            {canToggle ? (
                              <button
                                type="button"
                                onClick={() => handleToggleTeacher(person)}
                                disabled={isBusy}
                                className={`rounded-xl px-5 py-3 text-sm font-medium ${
                                  person.isActive
                                    ? "border border-red-500/20 bg-red-500/10 text-red-200"
                                    : "bg-white text-black"
                                } disabled:opacity-60`}
                              >
                                {isBusy
                                  ? "Saving..."
                                  : person.isActive
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            ) : (
                              <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white/55">
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
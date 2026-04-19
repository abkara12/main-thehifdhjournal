"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../app/lib/firebase";
import { useRequireStaff } from "../../lib/auth-guards";
import {
  DashboardShell,
  PremiumBadge,
  PremiumStatCard,
} from "../../components/dashboard-shell";

type StudentRow = {
  id: string;
  fullName: string;
  fullNameLower: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  isActive: boolean;
  weeklyGoal: string;
  lastLogDateKey: string;
};

function StudentCard({ student }: { student: StudentRow }) {
  return (
    <Link
      href={`/dashboard/students/${student.id}`}
      className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:bg-white/[0.08]"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              {student.fullName || "Unnamed Student"}
            </h2>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                student.isActive
                  ? "border-green-500/20 bg-green-500/10 text-green-200"
                  : "border-red-500/20 bg-red-500/10 text-red-200"
              }`}
            >
              {student.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <p className="mt-3 text-sm text-white/62">
            Parent: {student.parentName || "—"}
          </p>
          <p className="mt-1 text-sm text-white/48">
            {student.parentPhone || "—"}
            {student.parentEmail ? ` • ${student.parentEmail}` : ""}
          </p>
        </div>

        <div className="grid gap-2 text-sm text-white/58 xl:text-right">
          <p>Weekly Goal: {student.weeklyGoal || "—"}</p>
          <p>Last Log: {student.lastLogDateKey || "—"}</p>
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-[#e7cf9c] transition group-hover:translate-x-1">
        Open Student →
      </p>
    </Link>
  );
}

export default function StudentsPage() {
  const { loading, profile, error } = useRequireStaff();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    async function loadStudents() {
      if (!profile?.madrassahId) {
        setLoadingStudents(false);
        return;
      }

      setLoadingStudents(true);
      setPageError("");

      try {
        const qy = query(
          collection(db, "madrassahs", profile.madrassahId, "students"),
          orderBy("fullName")
        );

        const snap = await getDocs(qy);

        const rows: StudentRow[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as any;

          return {
            id: docSnap.id,
            fullName: String(data.fullName || ""),
            fullNameLower: String(data.fullNameLower || "").toLowerCase(),
            parentName: String(data.parentName || ""),
            parentPhone: String(data.parentPhone || ""),
            parentEmail: String(data.parentEmail || ""),
            isActive: data.isActive !== false,
            weeklyGoal: String(data.weeklyGoal || ""),
            lastLogDateKey: String(data.lastLogDateKey || ""),
          };
        });

        setStudents(rows);
      } catch (err: any) {
        setPageError(err?.message || "Could not load students.");
      } finally {
        setLoadingStudents(false);
      }
    }

    if (!loading && profile) {
      loadStudents();
    }
  }, [loading, profile]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !term ||
        [
          student.fullName,
          student.parentName,
          student.parentPhone,
          student.parentEmail,
          student.weeklyGoal,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && student.isActive) ||
        (statusFilter === "inactive" && !student.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.isActive).length;
  const inactiveStudents = students.filter((s) => !s.isActive).length;
  const withGoals = students.filter((s) => s.weeklyGoal.trim()).length;

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
          {error || "Could not load students page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title="Students"
      subtitle="Search learners, review parent details, and move quickly into daily progress logging."
      eyebrow="Student Management"
      rightSlot={
        <>
          <PremiumBadge>{profile.madrassahName || "Madrassah"}</PremiumBadge>
          <Link
            href="/dashboard/students/new"
            className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)]"
          >
            Add Student
          </Link>
        </>
      }
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {pageError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard
          label="Total Students"
          value={loadingStudents ? "..." : String(totalStudents)}
          subtext="All student records in this madrassah."
        />
        <PremiumStatCard
          label="Active"
          value={loadingStudents ? "..." : String(activeStudents)}
          subtext="Students currently active."
        />
        <PremiumStatCard
          label="Inactive"
          value={loadingStudents ? "..." : String(inactiveStudents)}
          subtext="Students currently inactive."
        />
        <PremiumStatCard
          label="With Weekly Goals"
          value={loadingStudents ? "..." : String(withGoals)}
          subtext="Students with a current weekly goal set."
        />
      </div>

      <div className="mt-8 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            type="text"
            placeholder="Search by student, parent, phone, email, or weekly goal..."
            className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {(["all", "active", "inactive"] as const).map((option) => {
              const active = statusFilter === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatusFilter(option)}
                  className={`rounded-full border px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "border-[#d8b67e]/30 bg-[linear-gradient(135deg,rgba(251,244,232,0.18),rgba(216,182,126,0.22),rgba(255,255,255,0.08))] text-white"
                      : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {option === "all"
                    ? "All"
                    : option === "active"
                    ? "Active"
                    : "Inactive"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8">
        {loadingStudents ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            {students.length === 0
              ? "No students found yet."
              : "No students matched your search or filter."}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredStudents.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
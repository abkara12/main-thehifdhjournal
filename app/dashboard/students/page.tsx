"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../../app/lib/firebase";
import { useRequireStaff } from "../../lib/auth-guards";
import {
  DashboardShell,
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
      className="group block rounded-[30px] border border-[#d9d4c7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,244,238,0.9))] p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-[2px] hover:shadow-[0_22px_55px_rgba(15,23,42,0.1)] sm:p-6"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[1.15rem] font-semibold tracking-[-0.03em] text-[#171717] sm:text-[1.3rem]">
              {student.fullName || "Unnamed Student"}
            </h2>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                student.isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {student.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e8e1d3] bg-white/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a8450]">
                Parent
              </p>
              <p className="mt-2 text-sm font-medium text-[#2a2a2a]">
                {student.parentName || "—"}
              </p>
              <p className="mt-1 break-words text-sm text-[#6d6d6d]">
                {student.parentPhone || "—"}
                {student.parentEmail ? ` • ${student.parentEmail}` : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-[#e8e1d3] bg-white/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a8450]">
                Learning Summary
              </p>
              <p className="mt-2 text-sm text-[#2a2a2a]">
                <span className="font-medium">Weekly Goal:</span>{" "}
                {student.weeklyGoal || "—"}
              </p>
              <p className="mt-1 text-sm text-[#6d6d6d]">
                <span className="font-medium text-[#2a2a2a]">Last Log:</span>{" "}
                {student.lastLogDateKey || "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="xl:pl-4">
          <div className="inline-flex items-center rounded-full border border-[#d8c08b]/40 bg-[#fbf6ea] px-4 py-2 text-sm font-semibold text-[#8d7440] transition group-hover:translate-x-1">
            Open Student →
          </div>
        </div>
      </div>
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
  const withGoals = students.filter((s) => s.weeklyGoal.trim()).length;
  const recentlyLogged = students.filter((s) => s.lastLogDateKey.trim()).length;

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
          {error || "Could not load students page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title=""
      subtitle=""
      eyebrow=""
      rightSlot={null}
    >
      <section className="rounded-[34px] border border-[#ddd6c8] bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(244,239,231,0.92))] px-5 py-8 shadow-[0_18px_60px_rgba(15,23,42,0.07)] sm:px-8 sm:py-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.34em] text-[#a2874c]">
            Student Management
          </p>

          <h1 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.05em] text-[#171717] sm:text-[2.5rem]">
            Students
          </h1>

          <div className="mt-4 flex justify-center">
            <div className="rounded-full border border-[#d8c08b]/40 bg-[#fbf6ea] px-6 py-2.5 text-[1rem] font-semibold tracking-[-0.02em] text-[#7b6128] shadow-[0_10px_30px_rgba(184,150,61,0.08)] sm:px-7 sm:text-[1.1rem]">
              {profile.madrassahName || "Your Madrassah"}
            </div>
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#666666] sm:text-[0.98rem]">
            Search learners, review parent details, and move quickly into daily progress
            logging with a cleaner, more focused dashboard experience.
          </p>

          <div className="mt-7 flex justify-center">
            <Link
              href="/dashboard/students/new"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d]"
            >
              Add Student
            </Link>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {pageError}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <PremiumStatCard
          label="Total Students"
          value={loadingStudents ? "..." : String(totalStudents)}
          subtext="All student records in this madrassah."
        />
        <PremiumStatCard
          label="With Weekly Goals"
          value={loadingStudents ? "..." : String(withGoals)}
          subtext="Students with a current weekly goal set."
        />
        <PremiumStatCard
          label="Logged Students"
          value={loadingStudents ? "..." : String(recentlyLogged)}
          subtext="Students with at least one saved last log date."
        />
      </div>

      <div className="mt-8 rounded-[32px] border border-[#ddd6c8] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,245,239,0.84))] p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                Find and manage students
              </h2>
              <p className="mt-1 text-sm text-[#6d6d6d]">
                Use search and filters to get to the right student quickly.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "active", "inactive"] as const).map((option) => {
                const active = statusFilter === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStatusFilter(option)}
                    className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
                      active
                        ? "border border-[#B8963D]/25 bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
                        : "border border-gray-300 bg-white/80 text-[#5e5e5e] hover:bg-white hover:text-[#171717]"
                    }`}
                  >
                    {option === "all"
                      ? "All Students"
                      : option === "active"
                      ? "Active"
                      : "Inactive"}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            type="text"
            placeholder="Search by student, parent, phone, email, or weekly goal..."
            className="w-full rounded-2xl border border-gray-300 bg-white/90 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8">
        {loadingStudents ? (
          <div className="rounded-[28px] border border-gray-300 bg-white/80 p-8 text-center text-[#666666] shadow-sm backdrop-blur-xl">
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-[28px] border border-gray-300 bg-white/80 p-10 text-center text-[#666666] shadow-sm backdrop-blur-xl">
            {students.length === 0
              ? "No students found yet."
              : "No students matched your search or filter."}
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredStudents.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
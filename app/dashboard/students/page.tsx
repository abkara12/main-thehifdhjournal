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
      className="group rounded-[28px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.66))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.07)] backdrop-blur-xl transition hover:-translate-y-[1px] hover:bg-white/95 sm:p-6"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-[#171717] sm:text-[1.25rem]">
              {student.fullName || "Unnamed Student"}
            </h2>

            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                student.isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {student.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[280px]">
          <div className="rounded-2xl border border-gray-200 bg-white/75 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
              Weekly Goal
            </p>
            <p className="mt-1 text-sm font-medium text-[#2f2f2f]">
              {student.weeklyGoal || "Not set"}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white/75 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a9a9a]">
              Last Log
            </p>
            <p className="mt-1 text-sm font-medium text-[#2f2f2f]">
              {student.lastLogDateKey || "No log yet"}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-[#8d7440] transition group-hover:translate-x-1">
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
title="Teacher Workspace"
subtitle="Open a student, record today’s work, and keep each learner’s daily hifdh progress updated smoothly."eyebrow={
  <div className="w-full text-center space-y-2">
    <div className="text-[0.75rem] uppercase tracking-[0.35em] text-[#4f4d4d]">
      Student Management
    </div>

    <div className="text-[1.2rem] sm:text-[1.4rem]  uppercase tracking-[0.24em] text-[#a88423]">
      {profile?.madrassahName || "Your Madrassah"}
    </div>
  </div>
}      rightSlot={
        <div className="flex w-full flex-col gap-3 rounded-[24px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.60))] p-3 shadow-[0_12px_36px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-4 lg:min-w-[250px] lg:max-w-[320px]">
          <div className="flex flex-wrap items-center gap-2">
          </div>

          <Link
            href="/dashboard/students/new"
            className="w-full rounded-full bg-black px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d]"
          >
            Add Student
          </Link>
        </div>
      }
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
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
          label="With Weekly Goals"
          value={loadingStudents ? "..." : String(withGoals)}
          subtext="Students with a current weekly goal set."
        />
      </div>

      <div className="mt-8 rounded-[30px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <input
            type="text"
            placeholder="Search by student, parent, phone, email, or weekly goal..."
            className="w-full rounded-2xl border border-gray-300 bg-white/88 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

        </div>
      </div>

      <div className="mt-8">
        {loadingStudents ? (
          <div className="rounded-[28px] border border-gray-300 bg-white/74 p-8 text-center text-[#666666] shadow-sm backdrop-blur-xl">
            Loading students...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-[28px] border border-gray-300 bg-white/74 p-10 text-center text-[#666666] shadow-sm backdrop-blur-xl">
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
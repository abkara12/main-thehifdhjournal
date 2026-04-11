"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";

type StudentOption = { id: string; fullName: string };

function getDateKeySA() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const d = parts.find((p) => p.type === "day")?.value ?? "00";
  return `${y}-${m}-${d}`;
}

function PageShell({
  children,
  title,
  subtitle,
  rightSlot,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen text-gray-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#F8F6F1]" />
        <div className="absolute -top-72 -right-40 h-[900px] w-[900px] rounded-full bg-[#1F3F3F]/25 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-15%] h-[1000px] w-[1000px] rounded-full bg-[#B8963D]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_70%_20%,rgba(184,150,61,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_10%,transparent_50%,rgba(0,0,0,0.08))]" />
        <div className="absolute inset-0 opacity-[0.035] mix-blend-multiply bg-[url('/noise.png')]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="uppercase tracking-widest text-xs text-[#B8963D]">
              Madrassah Dashboard
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-gray-700 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            ) : null}
          </div>

          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-6 shadow-sm">
      <div className="h-4 w-28 bg-black/10 rounded-full animate-pulse" />
      <div className="mt-3 h-8 w-2/3 bg-black/10 rounded-2xl animate-pulse" />
      <div className="mt-6 grid gap-3">
        <div className="h-12 w-full bg-black/10 rounded-2xl animate-pulse" />
        <div className="h-12 w-full bg-black/10 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [me, setMe] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [madrassahId, setMadrassahId] = useState<string | null>(null);
  const [madrassahName, setMadrassahName] = useState<string>("");
  const [joinCode, setJoinCode] = useState<string>("");

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [studentFullName, setStudentFullName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentMsg, setStudentMsg] = useState<string | null>(null);
  const [joinCodeMsg, setJoinCodeMsg] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);

  const today = useMemo(() => getDateKeySA(), []);

  async function loadStudents(currentMadrassahId: string) {
    setLoadingStudents(true);
    setErr(null);

    try {
      const studentsRef = collection(db, "madrassahs", currentMadrassahId, "students");
      const qy = query(studentsRef, orderBy("fullName"));
      const snap = await getDocs(qy);

      const list: StudentOption[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          fullName: (data.fullName || "Unnamed Student").toString(),
        };
      });

      setStudents(list);

      if (list.length > 0) {
        setSelectedStudentId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          return list[0].id;
        });
      } else {
        setSelectedStudentId("");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Could not load students.");
    } finally {
      setLoadingStudents(false);
    }
  }

  async function loadMadrassahMeta(currentMadrassahId: string) {
    try {
      const madrassahSnap = await getDoc(doc(db, "madrassahs", currentMadrassahId));
      if (!madrassahSnap.exists()) return;

      const data = madrassahSnap.data() as { name?: string; joinCode?: string };
      if (data.name) setMadrassahName(data.name);
      if (data.joinCode) setJoinCode(data.joinCode);
    } catch (e: any) {
      setErr(e?.message ?? "Could not load madrassah details.");
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setMe(u);

      if (!u) {
        setRole(null);
        setMadrassahId(null);
        setMadrassahName("");
        setJoinCode("");
        setChecking(false);
        return;
      }

      try {
        const mySnap = await getDoc(doc(db, "users", u.uid));

        if (!mySnap.exists()) {
          setRole(null);
          setMadrassahId(null);
          setMadrassahName("");
          setJoinCode("");
          setErr("Your account record was not found.");
          return;
        }

        const myData = mySnap.data() as {
          role?: string;
          madrassahId?: string;
          madrassahName?: string;
          isActive?: boolean;
        };

        if (myData.isActive === false) {
          setErr("This account is inactive.");
          setRole(null);
          setMadrassahId(null);
          setMadrassahName("");
          setJoinCode("");
          return;
        }

        const nextRole = myData.role ?? null;
        const nextMadrassahId = myData.madrassahId ?? null;
        const nextMadrassahName = myData.madrassahName ?? "";

        setRole(nextRole);
        setMadrassahId(nextMadrassahId);
        setMadrassahName(nextMadrassahName);

        if (nextMadrassahId && nextRole && ["admin", "teacher"].includes(nextRole)) {
          await Promise.all([
            loadStudents(nextMadrassahId),
            loadMadrassahMeta(nextMadrassahId),
          ]);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Could not load your account.");
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, []);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();

    if (!me || !madrassahId || !role || !["admin", "teacher"].includes(role)) return;

    const cleanFullName = studentFullName.trim();
    const cleanParentName = parentName.trim();
    const cleanParentPhone = parentPhone.trim();
    const cleanParentEmail = parentEmail.trim().toLowerCase();

    if (!cleanFullName) {
      setStudentMsg("Please enter the student's full name.");
      return;
    }

    setAddingStudent(true);
    setStudentMsg(null);

    try {
      const studentsRef = collection(db, "madrassahs", madrassahId, "students");

      const newStudentRef = await addDoc(studentsRef, {
        fullName: cleanFullName,
        parentName: cleanParentName,
        parentPhone: cleanParentPhone,
        parentEmail: cleanParentEmail,
        createdBy: me.uid,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        weeklyGoal: "",
        weeklyGoalWeekKey: "",
        weeklyGoalStartDateKey: "",
        weeklyGoalCompletedDateKey: "",
        weeklyGoalDurationDays: null,

        currentSabak: "",
        currentSabakDhor: "",
        currentDhor: "",
        currentSabakReadQuality: "",
        currentSabakDhorReadQuality: "",
        currentDhorReadQuality: "",
        currentSabakReadNotes: "",
        currentSabakDhorReadNotes: "",
        currentDhorReadNotes: "",
        currentSabakDhorMistakes: "",
        currentDhorMistakes: "",
      });

      setStudentFullName("");
      setParentName("");
      setParentPhone("");
      setParentEmail("");
      setStudentMsg("Student added successfully.");
      setSelectedStudentId(newStudentRef.id);

      await loadStudents(madrassahId);
    } catch (e: any) {
      setStudentMsg(e?.message ?? "Could not add student.");
    } finally {
      setAddingStudent(false);
    }
  }

  async function handleCopyJoinCode() {
    if (!joinCode) return;

    try {
      await navigator.clipboard.writeText(joinCode);
      setJoinCodeMsg("Join code copied.");
      setTimeout(() => setJoinCodeMsg(null), 2000);
    } catch {
      setJoinCodeMsg("Could not copy join code.");
      setTimeout(() => setJoinCodeMsg(null), 2000);
    }
  }

  if (checking) {
    return (
      <PageShell title="Loading…" subtitle="Just a moment.">
        <SkeletonCard />
      </PageShell>
    );
  }

  if (!me) {
    return (
      <PageShell
        title="Please sign in"
        subtitle="You need to be signed in to access the madrassah dashboard."
        rightSlot={
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-gray-300 bg-white/70 hover:bg-white transition-colors text-sm font-semibold"
          >
            Home
          </Link>
        }
      >
        <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-7 shadow-sm">
          <p className="text-gray-700">Go to login, then come back to the dashboard.</p>
        </div>
      </PageShell>
    );
  }

  if (!role || !["admin", "teacher"].includes(role)) {
    return (
      <PageShell
        title="Access denied"
        subtitle="This account does not have permission to use the madrassah dashboard."
        rightSlot={
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-gray-300 bg-white/70 hover:bg-white transition-colors text-sm font-semibold"
          >
            Home
          </Link>
        }
      >
        <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-7 shadow-sm">
          <div className="text-sm text-gray-600">Signed in as</div>
          <div className="mt-1 font-semibold">{me.email}</div>
        </div>
      </PageShell>
    );
  }

  if (!madrassahId) {
    return (
      <PageShell
        title="No madrassah linked"
        subtitle="This account is missing a madrassah connection."
        rightSlot={
          <Link
            href="/"
            className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-gray-300 bg-white/70 hover:bg-white transition-colors text-sm font-semibold"
          >
            Home
          </Link>
        }
      >
        <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-7 shadow-sm">
          <p className="text-gray-700">
            Your account exists, but no madrassah is linked to it yet.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={role === "admin" ? "Admin Dashboard" : "Teacher Dashboard"}
      subtitle={`${
        madrassahName || "Your madrassah"
      } • Add students and log their work for today (${today}).`}
      rightSlot={
        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 px-5 rounded-full border border-gray-300 bg-white/70 hover:bg-white transition-colors text-sm font-semibold"
        >
          Home
        </Link>
      }
    >
      <div className="grid gap-6">
        <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600">Teacher onboarding</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                Madrassah join code
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/70 px-4 py-2 text-xs font-semibold text-gray-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {role === "admin" ? "Admin active" : "Teacher active"}
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-2xl border border-gray-300 bg-white/80 px-5 py-5">
              <div className="text-xs uppercase tracking-widest text-gray-500">
                Share this code with teachers
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-semibold tracking-[0.15em] text-gray-900 break-all">
                {joinCode || "No join code found"}
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Teachers can use this code on the signup page to join this madrassah.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCopyJoinCode}
                  disabled={!joinCode}
                  className="h-12 w-full sm:w-auto px-7 rounded-2xl bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60 shadow-sm"
                >
                  Copy Join Code
                </button>
              </div>

              <div className="text-sm font-medium text-gray-700">
                {joinCodeMsg ?? ""}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600">Student creation</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                Add a new student
              </div>
            </div>
          </div>

          <form onSubmit={handleAddStudent} className="mt-6 grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-gray-900">Student full name</span>
                <input
                  value={studentFullName}
                  onChange={(e) => setStudentFullName(e.target.value)}
                  className="h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/30"
                  placeholder="e.g. Muhammad Ismail"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-gray-900">Parent name</span>
                <input
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/30"
                  placeholder="e.g. Ahmed Ismail"
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-gray-900">Parent phone</span>
                <input
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/30"
                  placeholder="e.g. 082 123 4567"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-gray-900">Parent email</span>
                <input
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  type="email"
                  className="h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/30"
                  placeholder="e.g. parent@email.com"
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <button
                disabled={addingStudent}
                className="h-12 w-full sm:w-auto px-7 rounded-2xl bg-black text-white font-semibold hover:bg-gray-900 disabled:opacity-60 shadow-sm"
              >
                {addingStudent ? "Adding..." : "Add Student"}
              </button>

              <div
                className={`text-sm font-medium ${
                  studentMsg?.toLowerCase().includes("success") ? "text-emerald-700" : "text-gray-700"
                }`}
              >
                {studentMsg ?? ""}
              </div>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600">Student selection</div>
              <div className="mt-1 text-xl font-semibold tracking-tight">
                Choose a student
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <label className="text-sm font-semibold text-gray-900">Students</label>

            <div className="relative">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 pr-10 outline-none focus:ring-2 focus:ring-[#B8963D]/30"
                disabled={loadingStudents}
              >
                {loadingStudents ? (
                  <option>Loading students…</option>
                ) : students.length === 0 ? (
                  <option>No students found</option>
                ) : (
                  students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))
                )}
              </select>

              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                ▼
              </div>
            </div>

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}
              </div>
            ) : null}

            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href={selectedStudentId ? `/admin/student/${selectedStudentId}` : "/admin"}
                className={`inline-flex items-center justify-center h-12 px-6 rounded-2xl text-sm font-semibold transition-colors shadow-sm ${
                  selectedStudentId
                    ? "bg-[#111111] text-white hover:bg-[#1c1c1c] shadow-lg shadow-black/10"
                    : "bg-black/40 text-white cursor-not-allowed"
                }`}
                aria-disabled={!selectedStudentId}
                onClick={(e) => {
                  if (!selectedStudentId) e.preventDefault();
                }}
              >
                Log work for student →
              </Link>

              <Link
                href={selectedStudentId ? `/admin/student/${selectedStudentId}/overview` : "/admin"}
                className={`inline-flex items-center justify-center h-12 px-6 rounded-2xl border text-sm font-semibold transition-colors ${
                  selectedStudentId
                    ? "border-gray-300 bg-white/70 hover:bg-white"
                    : "border-gray-300 bg-white/40 text-gray-500 cursor-not-allowed"
                }`}
                aria-disabled={!selectedStudentId}
                onClick={(e) => {
                  if (!selectedStudentId) e.preventDefault();
                }}
              >
                View student overview
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-6 shadow-sm">
          <div className="text-sm font-semibold text-gray-900">Tip for faster workflow</div>
          <p className="mt-1 text-sm text-gray-700">
            Add the student once, then select the student, log work, save, and move straight to the next one.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
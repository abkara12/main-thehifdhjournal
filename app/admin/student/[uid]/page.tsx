"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

type StudentAccessMode = "shared" | "assigned";

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

function parseDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function diffDaysInclusive(startKey: string, endKey: string) {
  const a = parseDateKey(startKey);
  const b = parseDateKey(endKey);
  const ms = b.getTime() - a.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return Math.max(0, days) + 1;
}

function isoWeekKeyFromDateKey(dateKey: string) {
  const d = parseDateKey(dateKey);
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day + 3);

  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);

  const weekNo =
    1 +
    Math.round(
      (date.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

  return `${date.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function toText(v: unknown) {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

function userCanAccessStudent({
  mode,
  role,
  uid,
  student,
}: {
  mode: StudentAccessMode;
  role: string | null;
  uid: string;
  student: any;
}) {
  const cleanRole = String(role || "").trim().toLowerCase();

  if (cleanRole === "admin" || cleanRole === "super_admin") return true;

  if (mode === "shared") {
    return cleanRole === "teacher";
  }

  if (cleanRole !== "teacher") return false;

  const teacherIds = Array.isArray(student?.teacherIds) ? student.teacherIds : [];

  return (
    student?.teacherId === uid ||
    student?.createdBy === uid ||
    teacherIds.includes(uid)
  );
}

const READING_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "Excellent", label: "Excellent" },
  { value: "Good", label: "Good" },
  { value: "Average", label: "Average" },
  { value: "Poor", label: "Poor" },
];

type ExistingLogMeta = {
  updatedByName?: string;
  updatedAtText?: string;
};

function Shell({
  title,
  subtitle,
  rightSlot,
  children,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
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

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-[#B8963D]">
              Dashboard → Student
            </p>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl leading-relaxed text-gray-700">
                {subtitle}
              </p>
            ) : null}
          </div>

          {rightSlot ? <div className="w-full sm:w-auto">{rightSlot}</div> : null}
        </div>

        <div className="mt-7 sm:mt-8">{children}</div>
      </div>
    </main>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-3xl border border-gray-300 bg-white/70 p-6 shadow-sm backdrop-blur sm:p-7">
      <div className="h-5 w-40 animate-pulse rounded-full bg-black/10" />
      <div className="mt-3 h-10 w-2/3 animate-pulse rounded-2xl bg-black/10" />
      <div className="mt-6 grid gap-3">
        <div className="h-12 animate-pulse rounded-2xl bg-black/10" />
        <div className="h-12 animate-pulse rounded-2xl bg-black/10" />
        <div className="h-12 animate-pulse rounded-2xl bg-black/10" />
      </div>
    </div>
  );
}

export default function AdminStudentPage() {
  const params = useParams<{ uid: string }>();
  const studentId = params?.uid || "";

  const [attendance, setAttendance] = useState<"present" | "absent">("present");
  const [me, setMe] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [madrassahId, setMadrassahId] = useState<string | null>(null);
  const [myFullName, setMyFullName] = useState("");

  const [studentName, setStudentName] = useState("");
  const [studentExists, setStudentExists] = useState(false);
  const [pageErr, setPageErr] = useState<string | null>(null);

  const [sabak, setSabak] = useState("");
  const [sabakDhor, setSabakDhor] = useState("");
  const [dhor, setDhor] = useState("");
  const [sabakReadQuality, setSabakReadQuality] = useState("");
  const [sabakReadNotes, setSabakReadNotes] = useState("");
  const [sabakDhorReadQuality, setSabakDhorReadQuality] = useState("");
  const [sabakDhorReadNotes, setSabakDhorReadNotes] = useState("");
  const [dhorReadQuality, setDhorReadQuality] = useState("");
  const [dhorReadNotes, setDhorReadNotes] = useState("");
  const [sabakDhorMistakes, setSabakDhorMistakes] = useState("");
  const [dhorMistakes, setDhorMistakes] = useState("");

  const [weeklyGoal, setWeeklyGoal] = useState("");
  const [weeklyGoalWeekKey, setWeeklyGoalWeekKey] = useState("");
  const [weeklyGoalStartDateKey, setWeeklyGoalStartDateKey] = useState("");
  const [weeklyGoalCompletedDateKey, setWeeklyGoalCompletedDateKey] = useState("");
  const [weeklyGoalDurationDays, setWeeklyGoalDurationDays] = useState<number | null>(null);

  const [markGoalCompleted, setMarkGoalCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [hasExistingTodayLog, setHasExistingTodayLog] = useState(false);
  const [editorMode, setEditorMode] = useState<"new" | "edit" | "overwrite" | null>(null);
  const [existingLogMeta, setExistingLogMeta] = useState<ExistingLogMeta | null>(null);

  function getUpdaterName() {
    return myFullName || me?.displayName || me?.email || "Staff";
  }

  function resetFields() {
    setAttendance("present");
    setSabak("");
    setSabakDhor("");
    setDhor("");
    setSabakReadQuality("");
    setSabakReadNotes("");
    setSabakDhorReadQuality("");
    setSabakDhorReadNotes("");
    setDhorReadQuality("");
    setDhorReadNotes("");
    setSabakDhorMistakes("");
    setDhorMistakes("");
  }

  function fillFieldsFromLog(data: any) {
    setAttendance(data?.attendance === "absent" ? "absent" : "present");
    setSabak(toText(data?.sabak));
    setSabakDhor(toText(data?.sabakDhor));
    setDhor(toText(data?.dhor));
    setSabakReadQuality(toText(data?.sabakReadQuality || data?.sabakRead));
    setSabakReadNotes(toText(data?.sabakReadNotes));
    setSabakDhorReadQuality(toText(data?.sabakDhorReadQuality || data?.sabakDhorRead));
    setSabakDhorReadNotes(toText(data?.sabakDhorReadNotes));
    setDhorReadQuality(toText(data?.dhorReadQuality || data?.dhorRead));
    setDhorReadNotes(toText(data?.dhorReadNotes));
    setSabakDhorMistakes(toText(data?.sabakDhorMistakes));
    setDhorMistakes(toText(data?.dhorMistakes));
  }

  const dateKey = useMemo(() => getDateKeySA(), []);
  const currentWeekKey = useMemo(() => isoWeekKeyFromDateKey(dateKey), [dateKey]);

  const goalLocked =
    weeklyGoal.trim().length > 0 &&
    weeklyGoalWeekKey === currentWeekKey &&
    !weeklyGoalCompletedDateKey;

  const goalAlreadyCompleted =
    Boolean(weeklyGoalCompletedDateKey) || (weeklyGoalDurationDays ?? 0) > 0;

  const goalNotReached =
    weeklyGoal.trim().length > 0 &&
    weeklyGoalStartDateKey.trim().length > 0 &&
    !weeklyGoalCompletedDateKey &&
    diffDaysInclusive(weeklyGoalStartDateKey, dateKey) > 7;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setMe(u);

      if (!u) {
        setRole(null);
        setMadrassahId(null);
        setMyFullName("");
        setChecking(false);
        return;
      }

      try {
        const myDoc = await getDoc(doc(db, "users", u.uid));
        const myData = myDoc.exists() ? (myDoc.data() as any) : null;

        setRole(myData?.role ?? null);
        setMadrassahId(myData?.madrassahId ?? null);
        setMyFullName(
          toText(myData?.fullName) ||
            toText(myData?.name) ||
            u.displayName ||
            u.email ||
            ""
        );
      } catch (e: any) {
        setPageErr(e?.message ?? "Could not load your account.");
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    async function loadStudent() {
      if (!studentId || !madrassahId || !me) return;

      resetFields();
      setMarkGoalCompleted(false);
      setMsg(null);
      setPageErr(null);
      setStudentExists(false);
      setHasExistingTodayLog(false);
      setEditorMode(null);
      setExistingLogMeta(null);

      try {
        const madrassahSnap = await getDoc(doc(db, "madrassahs", madrassahId));
        const madrassahData = madrassahSnap.exists()
          ? (madrassahSnap.data() as any)
          : {};

        const mode: StudentAccessMode =
          madrassahData?.studentAccessMode === "assigned" ? "assigned" : "shared";

        const sDoc = await getDoc(
          doc(db, "madrassahs", madrassahId, "students", studentId)
        );

        if (!sDoc.exists()) {
          setStudentName("Student");
          setPageErr("Student not found in this madrassah.");
          return;
        }

        const data = sDoc.data() as any;

        if (!userCanAccessStudent({ mode, role, uid: me.uid, student: data })) {
          setStudentName(toText(data.fullName) || "Student");
          setPageErr("You do not have access to this student.");
          return;
        }

        setStudentExists(true);
        setStudentName(toText(data.fullName) || "Student");
        setWeeklyGoal(toText(data.weeklyGoal));
        setWeeklyGoalWeekKey(toText(data.weeklyGoalWeekKey));
        setWeeklyGoalStartDateKey(toText(data.weeklyGoalStartDateKey));
        setWeeklyGoalCompletedDateKey(toText(data.weeklyGoalCompletedDateKey));

        const dur = data.weeklyGoalDurationDays;
        setWeeklyGoalDurationDays(typeof dur === "number" ? dur : dur ? Number(dur) : null);

        const logRef = doc(
          db,
          "madrassahs",
          madrassahId,
          "students",
          studentId,
          "logs",
          dateKey
        );
        const logSnap = await getDoc(logRef);

        if (logSnap.exists()) {
          const logData = logSnap.data() as any;
          setHasExistingTodayLog(true);
          setEditorMode(null);

          const updatedAtValue = logData?.updatedAt?.toDate?.();
          setExistingLogMeta({
            updatedByName:
              toText(logData?.updatedByName) || toText(logData?.updatedByEmail) || "",
            updatedAtText: updatedAtValue
              ? updatedAtValue.toLocaleString("en-ZA", {
                  timeZone: "Africa/Johannesburg",
                })
              : "",
          });
        } else {
          setHasExistingTodayLog(false);
          setEditorMode("new");
        }
      } catch (e: any) {
        setStudentName("Student");
        setPageErr(e?.message ?? "Could not load the student.");
      }
    }

    loadStudent();
  }, [studentId, madrassahId, dateKey, me, role]);

  async function openEditTodayLog() {
    if (!madrassahId || !studentId) return;

    try {
      setPageErr(null);

      const logRef = doc(
        db,
        "madrassahs",
        madrassahId,
        "students",
        studentId,
        "logs",
        dateKey
      );
      const logSnap = await getDoc(logRef);

      if (!logSnap.exists()) {
        setHasExistingTodayLog(false);
        setEditorMode("new");
        resetFields();
        return;
      }

      fillFieldsFromLog(logSnap.data());
      setEditorMode("edit");
    } catch (e: any) {
      setPageErr(e?.message ?? "Could not load today’s saved log.");
    }
  }

  function openOverwriteTodayLog() {
    resetFields();
    setMarkGoalCompleted(false);
    setEditorMode("overwrite");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!studentId) return setMsg("Error: Invalid student.");
    if (!me || !madrassahId || !role || !["admin", "teacher"].includes(role)) {
      return setMsg("Error: You do not have permission to save.");
    }
    if (!studentExists) return setMsg("Error: Student not found.");
    if (hasExistingTodayLog && !editorMode) {
      return setMsg("Error: Choose Edit or Overwrite for today’s saved log first.");
    }

    setSaving(true);
    setMsg(null);

    try {
      const cleanSabak = sabak.trim();
      const cleanSabakDhor = sabakDhor.trim();
      const cleanDhor = dhor.trim();
      const cleanSabakReadQuality = sabakReadQuality.trim();
      const cleanSabakReadNotes = sabakReadNotes.trim();
      const cleanSabakDhorReadQuality = sabakDhorReadQuality.trim();
      const cleanSabakDhorReadNotes = sabakDhorReadNotes.trim();
      const cleanDhorReadQuality = dhorReadQuality.trim();
      const cleanDhorReadNotes = dhorReadNotes.trim();
      const cleanSabakDhorMistakes = sabakDhorMistakes.replace(/[^\d]/g, "");
      const cleanDhorMistakes = dhorMistakes.replace(/[^\d]/g, "");

      let nextGoal = weeklyGoal.trim();
      let nextWeekKey = weeklyGoalWeekKey;
      let nextStartKey = weeklyGoalStartDateKey;
      let nextCompletedKey = weeklyGoalCompletedDateKey;
      let nextDuration: number | null = weeklyGoalDurationDays ?? null;

      if (nextGoal) {
        if (!nextStartKey || nextWeekKey !== currentWeekKey) {
          nextStartKey = dateKey;
          nextWeekKey = currentWeekKey;
          nextCompletedKey = "";
          nextDuration = null;
        }

        if (markGoalCompleted && !nextCompletedKey) {
          nextCompletedKey = dateKey;
          nextDuration = diffDaysInclusive(nextStartKey, dateKey);
        }
      } else {
        nextWeekKey = "";
        nextStartKey = "";
        nextCompletedKey = "";
        nextDuration = null;
      }

      const logRef = doc(
        db,
        "madrassahs",
        madrassahId,
        "students",
        studentId,
        "logs",
        dateKey
      );

      const existingLogSnap = await getDoc(logRef);
      const updaterName = getUpdaterName();

      await setDoc(
        logRef,
        {
          dateKey,
          ...(existingLogSnap.exists() ? {} : { createdAt: serverTimestamp() }),
          attendance,
          sabak: cleanSabak,
          sabakDhor: cleanSabakDhor,
          dhor: cleanDhor,
          sabakRead: cleanSabakReadQuality,
          sabakDhorRead: cleanSabakDhorReadQuality,
          dhorRead: cleanDhorReadQuality,
          sabakReadQuality: cleanSabakReadQuality,
          sabakDhorReadQuality: cleanSabakDhorReadQuality,
          dhorReadQuality: cleanDhorReadQuality,
          sabakReadNotes: cleanSabakReadNotes,
          sabakDhorReadNotes: cleanSabakDhorReadNotes,
          dhorReadNotes: cleanDhorReadNotes,
          sabakDhorMistakes: cleanSabakDhorMistakes,
          dhorMistakes: cleanDhorMistakes,
          weeklyGoal: nextGoal,
          weeklyGoalWeekKey: nextWeekKey || null,
          weeklyGoalStartDateKey: nextStartKey || null,
          weeklyGoalCompletedDateKey: nextCompletedKey || null,
          weeklyGoalDurationDays: nextDuration,
          weeklyGoalCompleted: Boolean(nextCompletedKey),
          updatedBy: me.uid,
          updatedByName: updaterName,
          updatedByEmail: me.email ?? "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "madrassahs", madrassahId, "students", studentId),
        {
          weeklyGoal: nextGoal,
          weeklyGoalWeekKey: nextWeekKey || null,
          weeklyGoalStartDateKey: nextStartKey || null,
          weeklyGoalCompletedDateKey: nextCompletedKey || null,
          weeklyGoalDurationDays: nextDuration,
          currentSabak: cleanSabak,
          currentSabakDhor: cleanSabakDhor,
          currentDhor: cleanDhor,
          currentSabakReadQuality: cleanSabakReadQuality,
          currentSabakDhorReadQuality: cleanSabakDhorReadQuality,
          currentDhorReadQuality: cleanDhorReadQuality,
          currentSabakReadNotes: cleanSabakReadNotes,
          currentSabakDhorReadNotes: cleanSabakDhorReadNotes,
          currentDhorReadNotes: cleanDhorReadNotes,
          currentSabakDhorMistakes: cleanSabakDhorMistakes,
          currentDhorMistakes: cleanDhorMistakes,
          updatedAt: serverTimestamp(),
          lastUpdatedBy: me.uid,
          lastUpdatedByName: updaterName,
        },
        { merge: true }
      );

      setWeeklyGoal(nextGoal);
      setWeeklyGoalWeekKey(nextWeekKey || "");
      setWeeklyGoalStartDateKey(nextStartKey || "");
      setWeeklyGoalCompletedDateKey(nextCompletedKey || "");
      setWeeklyGoalDurationDays(nextDuration);

      setMsg("Saved ✅");
      setTimeout(() => setMsg(null), 2500);

      resetFields();
      setMarkGoalCompleted(false);
      setHasExistingTodayLog(true);
      setEditorMode(null);
      setExistingLogMeta({
        updatedByName: updaterName,
        updatedAtText: new Date().toLocaleString("en-ZA", {
          timeZone: "Africa/Johannesburg",
        }),
      });
    } catch (err: any) {
      setMsg(err?.message ? `Error: ${err.message}` : "Error saving.");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <Shell title="Loading…" subtitle="Opening student page…">
        <LoadingCard />
      </Shell>
    );
  }

  if (!me) {
    return (
      <Shell title="Please sign in" subtitle="You must be signed in to log work for a student.">
        <div className="rounded-3xl border border-gray-300 bg-white/70 p-6 shadow-sm backdrop-blur sm:p-7">
          <p className="text-gray-700">Go to login, then return to the dashboard.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-gray-900">
              Go to login
            </Link>
            <Link href="/dashboard/students" className="inline-flex h-11 items-center justify-center rounded-full border border-gray-300 bg-white/70 px-6 text-sm font-semibold hover:bg-white">
              Back to Students
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (!role || !["admin", "teacher", "super_admin"].includes(role)) {
    return (
      <Shell title="Access denied" subtitle="This account cannot log work for students.">
        <div className="rounded-3xl border border-gray-300 bg-white/70 p-6 shadow-sm backdrop-blur sm:p-7">
          <div className="text-sm text-gray-600">Signed in as</div>
          <div className="mt-1 font-semibold">{myFullName || me.email}</div>
        </div>
      </Shell>
    );
  }

  if (!madrassahId) {
    return (
      <Shell title="No madrassah linked" subtitle="This account is missing a madrassah connection.">
        <div className="rounded-3xl border border-gray-300 bg-white/70 p-6 shadow-sm backdrop-blur sm:p-7">
          <p className="text-gray-700">Your account is not linked to a madrassah yet.</p>
        </div>
      </Shell>
    );
  }

  if (!studentId || !studentExists) {
    return (
      <Shell title="Student not found" subtitle="This student could not be found or accessed.">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm sm:p-7">
          <p className="text-red-700">{pageErr || "Invalid student."}</p>
          <div className="mt-5">
            <Link href="/dashboard/students" className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-gray-900">
              Back to Students
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={`Log work for ${studentName || "student"}`}
      subtitle={`Submitting for ${dateKey} • ${currentWeekKey}`}
      rightSlot={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href="/dashboard/students" className="inline-flex h-11 w-full items-center justify-center rounded-full border border-gray-300 bg-white/70 px-5 text-sm font-semibold transition-colors hover:bg-white sm:w-auto">
            Back
          </Link>
          <Link href={`/dashboard/students/${studentId}/overview`} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#111111] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1c1c1c] sm:w-auto">
            Student Overview
          </Link>
        </div>
      }
    >
      <div className="rounded-3xl border border-gray-300 bg-white/70 p-5 shadow-sm backdrop-blur sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-300 bg-white/70 px-4 py-2 text-xs font-semibold text-gray-700">
            <span className="h-2 w-2 rounded-full bg-[#B8963D]" />
            Update today’s work
          </div>
        </div>

        {pageErr ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageErr}
          </div>
        ) : null}

        {hasExistingTodayLog && !editorMode ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="text-sm font-semibold text-amber-900">
              Today’s log has already been saved for this student.
            </div>
            <div className="mt-2 text-sm leading-relaxed text-amber-800">
              Choose whether you want to edit the saved log or intentionally start fresh.
            </div>

            {existingLogMeta?.updatedByName || existingLogMeta?.updatedAtText ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-white/70 px-4 py-3 text-sm text-gray-700">
                {existingLogMeta?.updatedByName ? (
                  <div>
                    Last updated by: <span className="font-semibold">{existingLogMeta.updatedByName}</span>
                  </div>
                ) : null}
                {existingLogMeta?.updatedAtText ? (
                  <div className="mt-1">
                    Saved at: <span className="font-semibold">{existingLogMeta.updatedAtText}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={openEditTodayLog} className="inline-flex h-12 items-center justify-center rounded-2xl bg-black px-6 font-semibold text-white hover:bg-gray-900">
                Edit today’s log
              </button>
              <button type="button" onClick={openOverwriteTodayLog} className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-6 font-semibold text-gray-900 hover:bg-gray-50">
                Overwrite with blank form
              </button>
            </div>
          </div>
        ) : null}

        {editorMode ? (
          <form onSubmit={handleSave} className="mt-6 grid gap-5">
            <Section title="Attendance">
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setAttendance("present")} className={`rounded-xl border px-4 py-2 ${attendance === "present" ? "border-emerald-400 bg-emerald-100 text-emerald-700" : "border-gray-300 bg-white"}`}>
                  Present
                </button>
                <button type="button" onClick={() => setAttendance("absent")} className={`rounded-xl border px-4 py-2 ${attendance === "absent" ? "border-red-400 bg-red-100 text-red-700" : "border-gray-300 bg-white"}`}>
                  Absent
                </button>
              </div>
            </Section>

            <Section title="Sabak">
              <Field label="Sabak amount" value={sabak} setValue={setSabak} hint="Example: 5 lines" />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="How did the student read Sabak?" value={sabakReadQuality} setValue={setSabakReadQuality} options={READING_OPTIONS} />
                <Field label="Sabak reading notes" value={sabakReadNotes} setValue={setSabakReadNotes} hint="Optional" />
              </div>
            </Section>

            <Section title="Sabak Dhor">
              <Field label="Sabak Dhor amount" value={sabakDhor} setValue={setSabakDhor} hint="Revision" />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="How did the student read Sabak Dhor?" value={sabakDhorReadQuality} setValue={setSabakDhorReadQuality} options={READING_OPTIONS} />
                <Field label="Sabak Dhor reading notes" value={sabakDhorReadNotes} setValue={setSabakDhorReadNotes} hint="Optional" />
              </div>
              <Field label="Sabak Dhor mistakes" value={sabakDhorMistakes} setValue={setSabakDhorMistakes} hint="Number" />
            </Section>

            <Section title="Dhor">
              <Field label="Dhor amount" value={dhor} setValue={setDhor} hint="Older revision" />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="How did the student read Dhor?" value={dhorReadQuality} setValue={setDhorReadQuality} options={READING_OPTIONS} />
                <Field label="Dhor reading notes" value={dhorReadNotes} setValue={setDhorReadNotes} hint="Optional" />
              </div>
              <Field label="Dhor mistakes" value={dhorMistakes} setValue={setDhorMistakes} hint="Number" />
            </Section>

            <Section title="Weekly Goal">
              <Field label="Weekly Sabak Goal" value={weeklyGoal} setValue={setWeeklyGoal} hint={goalLocked ? "Locked until completed" : "Set goal"} />

              <div className="grid gap-2 sm:grid-cols-3">
                <MiniInfo label="Started" value={weeklyGoalStartDateKey || "—"} />
                <MiniInfo label="Completed" value={weeklyGoalCompletedDateKey || "—"} />
                <MiniInfo label="Duration" value={weeklyGoalDurationDays ? `${weeklyGoalDurationDays} day(s)` : "—"} />
              </div>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-300 bg-white/70 px-4 py-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Weekly Goal Completed</div>
                  <div className="mt-1 text-xs text-gray-600">
                    Tick only when the student has finished their weekly goal.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={goalAlreadyCompleted ? true : markGoalCompleted}
                  disabled={!weeklyGoal.trim() || goalAlreadyCompleted}
                  onChange={(e) => setMarkGoalCompleted(e.target.checked)}
                  className="h-6 w-6 accent-black disabled:opacity-50"
                />
              </label>
            </Section>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <button disabled={saving} className="h-12 w-full rounded-2xl bg-black px-7 font-semibold text-white shadow-sm hover:bg-gray-900 disabled:opacity-60 sm:w-auto">
                {saving ? "Saving..." : "Save"}
              </button>

              <div className={`text-sm font-medium ${msg?.startsWith("Error") ? "text-red-600" : "text-gray-700"}`}>
                {msg ?? ""}
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </Shell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 rounded-3xl border border-gray-300 bg-white/70 p-5 backdrop-blur sm:p-6">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  setValue,
}: {
  label: string;
  hint: string;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <div className="flex items-end justify-between gap-4">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        <span className="text-xs text-gray-500">{hint}</span>
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/30"
        placeholder="Type here…"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2">
      <div className="flex items-end justify-between gap-4">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        <span className="text-xs text-gray-500">Select</span>
      </div>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-300 bg-white/70 px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-gray-900">{value}</div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRequireStaff } from "../../../lib/auth-guards";
import {
  getDateKeySA,
  isoWeekKeyFromDateKey,
  diffDaysInclusive,
} from "../../../lib/date";
import {
  DashboardShell,
  PremiumBadge,
} from "../../../components/dashboard-shell";

/* ---------------- helpers ---------------- */
function toText(v: unknown) {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
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

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">{subtitle}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-medium text-[#5f5f5f]">
      {children}
    </label>
  );
}

function PremiumInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white/88 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
        props.className || ""
      }`}
    />
  );
}

function PremiumTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white/88 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
        props.className || ""
      }`}
    />
  );
}

function PremiumSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-gray-300 bg-white/88 p-4 text-[#171717] outline-none transition focus:border-[#B8963D] focus:bg-white disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
        props.className || ""
      }`}
    />
  );
}

function getEmptyCurrentLogFields() {
  return {
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
  };
}

function hasAnyCurrentLogData(data: any) {
  return [
    data?.currentSabak,
    data?.currentSabakDhor,
    data?.currentDhor,
    data?.currentSabakReadQuality,
    data?.currentSabakDhorReadQuality,
    data?.currentDhorReadQuality,
    data?.currentSabakReadNotes,
    data?.currentSabakDhorReadNotes,
    data?.currentDhorReadNotes,
    data?.currentSabakDhorMistakes,
    data?.currentDhorMistakes,
  ].some((value) => toText(value).trim().length > 0);
}

function hasAnyWorkLogged(values: {
  sabak: string;
  sabakDhor: string;
  dhor: string;
  sabakReadQuality: string;
  sabakReadNotes: string;
  sabakDhorReadQuality: string;
  sabakDhorReadNotes: string;
  dhorReadQuality: string;
  dhorReadNotes: string;
  sabakDhorMistakes: string;
  dhorMistakes: string;
}) {
  return Object.values(values).some((value) => value.trim().length > 0);
}

export default function StudentDetailPage() {
  const { loading, profile, firebaseUser, error } = useRequireStaff();
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId || "";

  const [dateKey, setDateKey] = useState(() => getDateKeySA());

  const [studentName, setStudentName] = useState("");
  const [studentExists, setStudentExists] = useState(false);
  const [pageErr, setPageErr] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<"present" | "absent">(
    "present"
  );

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
  const [weeklyGoalCompletedDateKey, setWeeklyGoalCompletedDateKey] =
    useState("");
  const [weeklyGoalDurationDays, setWeeklyGoalDurationDays] = useState<
    number | null
  >(null);

  const [markGoalCompleted, setMarkGoalCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [saveButtonDone, setSaveButtonDone] = useState(false);

  const [hasExistingTodayLog, setHasExistingTodayLog] = useState(false);
  const [existingLogMeta, setExistingLogMeta] =
    useState<ExistingLogMeta | null>(null);

  const currentWeekKey = useMemo(
    () => isoWeekKeyFromDateKey(dateKey),
    [dateKey]
  );

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

  const workDisabled = attendance === "absent" || saving;

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

  function clearWorkFieldsOnly() {
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

    setSabakDhorReadQuality(
      toText(data?.sabakDhorReadQuality || data?.sabakDhorRead)
    );
    setSabakDhorReadNotes(toText(data?.sabakDhorReadNotes));

    setDhorReadQuality(toText(data?.dhorReadQuality || data?.dhorRead));
    setDhorReadNotes(toText(data?.dhorReadNotes));

    setSabakDhorMistakes(toText(data?.sabakDhorMistakes));
    setDhorMistakes(toText(data?.dhorMistakes));
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      const latestDateKey = getDateKeySA();
      setDateKey((current) =>
        current === latestDateKey ? current : latestDateKey
      );
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadStudent() {
      if (!profile?.madrassahId || !studentId) return;

      resetFields();
      setMarkGoalCompleted(false);
      setMsg(null);
      setSaveButtonDone(false);
      setPageErr(null);
      setStudentExists(false);
      setHasExistingTodayLog(false);
      setExistingLogMeta(null);

      try {
        const studentRef = doc(
          db,
          "madrassahs",
          profile.madrassahId,
          "students",
          studentId
        );

        const sDoc = await getDoc(studentRef);

        if (!sDoc.exists()) {
          setStudentName("Student");
          setPageErr("Student not found in this madrassah.");
          return;
        }

        const data = sDoc.data() as any;

        const lastLogDateKey = toText(data.lastLogDateKey);
        const staleCurrentFields =
          lastLogDateKey &&
          lastLogDateKey !== dateKey &&
          hasAnyCurrentLogData(data);

        if (staleCurrentFields) {
          await updateDoc(studentRef, {
            ...getEmptyCurrentLogFields(),
            updatedAt: serverTimestamp(),
          });
        }

        setStudentExists(true);
        setStudentName(toText(data.fullName) || "Student");
        setWeeklyGoal(toText(data.weeklyGoal));
        setWeeklyGoalWeekKey(toText(data.weeklyGoalWeekKey));
        setWeeklyGoalStartDateKey(toText(data.weeklyGoalStartDateKey));
        setWeeklyGoalCompletedDateKey(
          toText(data.weeklyGoalCompletedDateKey)
        );

        const dur = data.weeklyGoalDurationDays;
        setWeeklyGoalDurationDays(
          typeof dur === "number" ? dur : dur ? Number(dur) : null
        );

        const todayLogRef = doc(
          db,
          "madrassahs",
          profile.madrassahId,
          "students",
          studentId,
          "logs",
          dateKey
        );

        const todayLogSnap = await getDoc(todayLogRef);

        if (!todayLogSnap.exists()) {
          setHasExistingTodayLog(false);
          return;
        }

        const logData = todayLogSnap.data() as any;

        setHasExistingTodayLog(true);
        fillFieldsFromLog(logData);

        setExistingLogMeta({
          updatedByName: toText(logData.updatedByName),
          updatedAtText: logData.updatedAt?.toDate
            ? logData.updatedAt.toDate().toLocaleString()
            : "",
        });
      } catch (e: any) {
        setPageErr(e?.message ?? "Could not load the student.");
      }
    }

    if (!loading && profile) {
      loadStudent();
    }
  }, [loading, profile, studentId, dateKey]);

  async function handleSave() {
    setMsg("Saving...");
    setSaveButtonDone(false);
    setPageErr(null);

    if (saving) return;

    if (!profile?.madrassahId || !firebaseUser?.uid) {
      setPageErr("Your account is not linked correctly.");
      setMsg(null);
      return;
    }

    if (!studentExists) {
      setPageErr("Student not found.");
      setMsg(null);
      return;
    }

    setSaving(true);

    try {
      const latestDateKey = getDateKeySA();

      if (latestDateKey !== dateKey) {
        setDateKey(latestDateKey);
        setMsg(
          "The date changed while this page was open. Please save again on the new day."
        );
        setSaveButtonDone(false);
        return;
      }

      const studentRef = doc(
        db,
        "madrassahs",
        profile.madrassahId,
        "students",
        studentId
      );

      const logRef = doc(
        db,
        "madrassahs",
        profile.madrassahId,
        "students",
        studentId,
        "logs",
        dateKey
      );

      let nextGoal = weeklyGoal.trim();
      let nextGoalWeekKey = weeklyGoalWeekKey;
      let nextGoalStartDateKey = weeklyGoalStartDateKey;
      let nextGoalCompletedDateKey = weeklyGoalCompletedDateKey;
      let nextGoalDurationDays = weeklyGoalDurationDays;

      const isNewWeeklyGoalForThisWeek =
        nextGoal.length > 0 &&
        (!weeklyGoalWeekKey || weeklyGoalWeekKey !== currentWeekKey) &&
        !goalAlreadyCompleted;

      if (isNewWeeklyGoalForThisWeek) {
        nextGoalWeekKey = currentWeekKey;
        nextGoalStartDateKey = dateKey;
        nextGoalCompletedDateKey = "";
        nextGoalDurationDays = null;
      }

      if (markGoalCompleted && nextGoal.trim()) {
        nextGoalCompletedDateKey = dateKey;
        nextGoalDurationDays = nextGoalStartDateKey
          ? diffDaysInclusive(nextGoalStartDateKey, dateKey)
          : 1;
      }

      if (!nextGoal.trim()) {
        nextGoalWeekKey = "";
        nextGoalStartDateKey = "";
        nextGoalCompletedDateKey = "";
        nextGoalDurationDays = null;
      }

      const trimmedSabak = sabak.trim();
      const trimmedSabakDhor = sabakDhor.trim();
      const trimmedDhor = dhor.trim();
      const trimmedSabakReadQuality = sabakReadQuality.trim();
      const trimmedSabakReadNotes = sabakReadNotes.trim();
      const trimmedSabakDhorReadQuality = sabakDhorReadQuality.trim();
      const trimmedSabakDhorReadNotes = sabakDhorReadNotes.trim();
      const trimmedDhorReadQuality = dhorReadQuality.trim();
      const trimmedDhorReadNotes = dhorReadNotes.trim();
      const trimmedSabakDhorMistakes = sabakDhorMistakes.trim();
      const trimmedDhorMistakes = dhorMistakes.trim();

      const staffName =
        profile.fullName ||
        (profile as any).name ||
        firebaseUser.displayName ||
        profile.email ||
        firebaseUser.email ||
        "Staff";

      const staffEmail = profile.email || firebaseUser.email || "";

      const workValues =
        attendance === "absent"
          ? {
              sabak: "",
              sabakDhor: "",
              dhor: "",
              sabakReadQuality: "",
              sabakReadNotes: "",
              sabakDhorReadQuality: "",
              sabakDhorReadNotes: "",
              dhorReadQuality: "",
              dhorReadNotes: "",
              sabakDhorMistakes: "",
              dhorMistakes: "",
            }
          : {
              sabak: trimmedSabak,
              sabakDhor: trimmedSabakDhor,
              dhor: trimmedDhor,
              sabakReadQuality: trimmedSabakReadQuality,
              sabakReadNotes: trimmedSabakReadNotes,
              sabakDhorReadQuality: trimmedSabakDhorReadQuality,
              sabakDhorReadNotes: trimmedSabakDhorReadNotes,
              dhorReadQuality: trimmedDhorReadQuality,
              dhorReadNotes: trimmedDhorReadNotes,
              sabakDhorMistakes: trimmedSabakDhorMistakes,
              dhorMistakes: trimmedDhorMistakes,
            };

      const hasWork = hasAnyWorkLogged(workValues);

      if (attendance === "present" && !hasWork && !nextGoal.trim()) {
        setMsg(
          "Please enter at least one item, mark absent, or update the weekly goal."
        );
        setSaveButtonDone(false);
        return;
      }

      const logPayload = {
        dateKey,
        attendance,

        ...workValues,

        weeklyGoal: nextGoal,
        weeklyGoalWeekKey: nextGoalWeekKey,
        weeklyGoalStartDateKey: nextGoalStartDateKey,
        weeklyGoalCompletedDateKey: nextGoalCompletedDateKey,
        weeklyGoalDurationDays: nextGoalDurationDays,
        weeklyGoalCompleted: Boolean(nextGoalCompletedDateKey),

        updatedBy: firebaseUser.uid,
        updatedByName: staffName,
        updatedByEmail: staffEmail,
        updatedAt: serverTimestamp(),
      };

      const currentStudentFields =
        attendance === "absent"
          ? getEmptyCurrentLogFields()
          : {
              currentSabak: trimmedSabak,
              currentSabakDhor: trimmedSabakDhor,
              currentDhor: trimmedDhor,

              currentSabakReadQuality: trimmedSabakReadQuality,
              currentSabakDhorReadQuality: trimmedSabakDhorReadQuality,
              currentDhorReadQuality: trimmedDhorReadQuality,

              currentSabakReadNotes: trimmedSabakReadNotes,
              currentSabakDhorReadNotes: trimmedSabakDhorReadNotes,
              currentDhorReadNotes: trimmedDhorReadNotes,

              currentSabakDhorMistakes: trimmedSabakDhorMistakes,
              currentDhorMistakes: trimmedDhorMistakes,
            };

      await runTransaction(db, async (transaction) => {
        const existingLog = await transaction.get(logRef);

        transaction.set(
          logRef,
          {
            ...logPayload,
            createdAt: existingLog.exists()
              ? existingLog.data()?.createdAt || serverTimestamp()
              : serverTimestamp(),
          },
          { merge: true }
        );

        transaction.update(studentRef, {
          ...currentStudentFields,

          weeklyGoal: nextGoal,
          weeklyGoalWeekKey: nextGoalWeekKey,
          weeklyGoalStartDateKey: nextGoalStartDateKey,
          weeklyGoalCompletedDateKey: nextGoalCompletedDateKey,
          weeklyGoalDurationDays: nextGoalDurationDays,

          lastLogDateKey: dateKey,
          updatedByUid: firebaseUser.uid,
          updatedByName: staffName,
          updatedByEmail: staffEmail,
          updatedAt: serverTimestamp(),
        });
      });

      setWeeklyGoal(nextGoal);
      setWeeklyGoalWeekKey(nextGoalWeekKey);
      setWeeklyGoalStartDateKey(nextGoalStartDateKey);
      setWeeklyGoalCompletedDateKey(nextGoalCompletedDateKey);
      setWeeklyGoalDurationDays(nextGoalDurationDays);

      setHasExistingTodayLog(true);
      setExistingLogMeta({
        updatedByName: staffName,
        updatedAtText: new Date().toLocaleString(),
      });

      setMarkGoalCompleted(false);
      setSaveButtonDone(true);

      if (attendance === "absent") {
        clearWorkFieldsOnly();
      }

      setMsg("✅ Log saved successfully.");

      window.setTimeout(() => {
        setMsg(null);
        setSaveButtonDone(false);
      }, 2500);
    } catch (e: any) {
      setMsg(e?.message ?? "Could not save the log.");
      setSaveButtonDone(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#F8F6F1] text-[#171717]">
        Loading...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#F8F6F1] px-6 text-[#171717]">
        <div className="rounded-2xl border border-red-300 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error || "Could not load this page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title={studentName || "Student Record"}
      subtitle="Capture today’s lesson in any order. Sabak, Sabak Dhor, and Dhor can be saved separately throughout the day."
      eyebrow="Daily Progress Logging"
      rightSlot={
        <div className="flex w-full flex-col gap-3 rounded-[24px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.60))] p-3 shadow-[0_12px_36px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-4 lg:min-w-[260px] lg:max-w-[340px]">
          <Link
            href="/dashboard/students"
            className="w-full rounded-full border border-gray-300 bg-white/72 px-5 py-3 text-center text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
          >
            Back to Students
          </Link>
          <Link
            href={`/dashboard/students/${studentId}/overview`}
            className="w-full rounded-full bg-black px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d]"
          >
            Open Overview
          </Link>
        </div>
      }
    >
      {pageErr ? (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {pageErr}
        </div>
      ) : null}

      {msg ? (
        <div
          className={`mb-6 flex items-center justify-center rounded-2xl px-6 py-5 text-center text-base font-semibold shadow-lg transition-all ${
            msg.includes("✅")
              ? "border border-emerald-300 bg-emerald-100 text-emerald-800"
              : msg.includes("Saving")
              ? "border border-gray-300 bg-white text-[#5f5f5f]"
              : "border border-red-300 bg-red-100 text-red-700"
          }`}
        >
          {msg}
        </div>
      ) : null}

      {hasExistingTodayLog ? (
        <div className="mt-8 rounded-[28px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <p className="text-base font-semibold text-[#171717]">
            Today’s log is open and editable.
          </p>
          <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">
            You can save Sabak now, Dhor later, and Sabak Dhor later. The same
            day’s record will keep updating.
          </p>
          {existingLogMeta?.updatedByName ? (
            <p className="mt-2 text-sm text-[#5f5f5f]">
              Last updated by {existingLogMeta.updatedByName}
              {existingLogMeta.updatedAtText
                ? ` • ${existingLogMeta.updatedAtText}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 rounded-[28px] border border-gray-300 bg-white/70 p-5 text-sm leading-7 text-[#5f5f5f] shadow-[0_12px_40px_rgba(0,0,0,0.05)] backdrop-blur-xl">
          No log has been saved for today yet. Enter whatever the student has
          read so far and save.
        </div>
      )}

      <div className="mt-8 grid gap-6">
        <SectionCard
          title="Attendance"
          subtitle="If the student is absent, the work fields will be saved empty for today."
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => setAttendance("present")}
              className={`rounded-full px-5 py-3 text-sm font-medium transition disabled:opacity-60 ${
                attendance === "present"
                  ? "bg-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
                  : "border border-gray-300 bg-white/72 text-[#5e5e5e] hover:bg-white hover:text-[#171717]"
              }`}
            >
              Present
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => setAttendance("absent")}
              className={`rounded-full px-5 py-3 text-sm font-medium transition disabled:opacity-60 ${
                attendance === "absent"
                  ? "bg-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
                  : "border border-gray-300 bg-white/72 text-[#5e5e5e] hover:bg-white hover:text-[#171717]"
              }`}
            >
              Absent
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Sabak">
          <div className="grid gap-4">
            <div>
              <FieldLabel>Sabak</FieldLabel>
              <PremiumInput
                disabled={workDisabled}
                value={sabak}
                onChange={(e) => setSabak(e.target.value)}
                placeholder="Enter sabak"
              />
            </div>

            <div>
              <FieldLabel>Reading Quality</FieldLabel>
              <PremiumSelect
                disabled={workDisabled}
                value={sabakReadQuality}
                onChange={(e) => setSabakReadQuality(e.target.value)}
              >
                {READING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </PremiumSelect>
            </div>

            <div>
              <FieldLabel>Sabak Notes</FieldLabel>
              <PremiumTextarea
                disabled={workDisabled}
                value={sabakReadNotes}
                onChange={(e) => setSabakReadNotes(e.target.value)}
                placeholder="Notes about today’s sabak"
                rows={4}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Sabak Dhor">
          <div className="grid gap-4">
            <div>
              <FieldLabel>Sabak Dhor</FieldLabel>
              <PremiumInput
                disabled={workDisabled}
                value={sabakDhor}
                onChange={(e) => setSabakDhor(e.target.value)}
                placeholder="Enter sabak dhor"
              />
            </div>

            <div>
              <FieldLabel>Reading Quality</FieldLabel>
              <PremiumSelect
                disabled={workDisabled}
                value={sabakDhorReadQuality}
                onChange={(e) => setSabakDhorReadQuality(e.target.value)}
              >
                {READING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </PremiumSelect>
            </div>

            <div>
              <FieldLabel>Sabak Dhor Notes</FieldLabel>
              <PremiumTextarea
                disabled={workDisabled}
                value={sabakDhorReadNotes}
                onChange={(e) => setSabakDhorReadNotes(e.target.value)}
                placeholder="Notes about sabak dhor"
                rows={4}
              />
            </div>

            <div>
              <FieldLabel>Sabak Dhor Mistakes</FieldLabel>
              <PremiumInput
                disabled={workDisabled}
                value={sabakDhorMistakes}
                onChange={(e) => setSabakDhorMistakes(e.target.value)}
                placeholder="Enter mistakes"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Dhor">
          <div className="grid gap-4">
            <div>
              <FieldLabel>Dhor</FieldLabel>
              <PremiumInput
                disabled={workDisabled}
                value={dhor}
                onChange={(e) => setDhor(e.target.value)}
                placeholder="Enter dhor"
              />
            </div>

            <div>
              <FieldLabel>Reading Quality</FieldLabel>
              <PremiumSelect
                disabled={workDisabled}
                value={dhorReadQuality}
                onChange={(e) => setDhorReadQuality(e.target.value)}
              >
                {READING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </PremiumSelect>
            </div>

            <div>
              <FieldLabel>Dhor Notes</FieldLabel>
              <PremiumTextarea
                disabled={workDisabled}
                value={dhorReadNotes}
                onChange={(e) => setDhorReadNotes(e.target.value)}
                placeholder="Notes about dhor"
                rows={4}
              />
            </div>

            <div>
              <FieldLabel>Dhor Mistakes</FieldLabel>
              <PremiumInput
                disabled={workDisabled}
                value={dhorMistakes}
                onChange={(e) => setDhorMistakes(e.target.value)}
                placeholder="Enter mistakes"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Weekly Goal"
          subtitle="Set this week’s target and mark it complete when achieved."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {goalLocked ? <PremiumBadge>Current week goal active</PremiumBadge> : null}
            {goalAlreadyCompleted ? <PremiumBadge>Goal completed</PremiumBadge> : null}
            {goalNotReached ? <PremiumBadge>Goal overdue</PremiumBadge> : null}
          </div>

          <div className="grid gap-4">
            <div>
              <FieldLabel>Weekly Goal</FieldLabel>
              <PremiumInput
                disabled={saving}
                value={weeklyGoal}
                onChange={(e) => setWeeklyGoal(e.target.value)}
                placeholder="Set weekly goal"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-gray-300 bg-white/80 px-4 py-4 text-sm text-[#5f5f5f]">
              <input
                type="checkbox"
                disabled={saving || !weeklyGoal.trim()}
                checked={markGoalCompleted}
                onChange={(e) => setMarkGoalCompleted(e.target.checked)}
              />
              Mark this week’s goal as completed
            </label>

            {weeklyGoalStartDateKey ? (
              <div className="rounded-2xl border border-gray-300 bg-white/80 p-4 text-sm text-[#5f5f5f]">
                Goal started: {weeklyGoalStartDateKey}
                {weeklyGoalCompletedDateKey
                  ? ` • Completed: ${weeklyGoalCompletedDateKey}`
                  : ""}
                {weeklyGoalDurationDays
                  ? ` • Duration: ${weeklyGoalDurationDays} day(s)`
                  : ""}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !studentExists}
            className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d] disabled:opacity-60"
          >
            {saving ? "Saving..." : saveButtonDone ? "Saved ✓" : "Save Today’s Log"}
          </button>

          <Link
            href={`/dashboard/students/${studentId}/overview`}
            className="rounded-full border border-gray-300 bg-white/72 px-6 py-3 text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
          >
            View Full Overview
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
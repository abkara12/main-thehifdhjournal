"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
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
  PremiumStatCard,
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
  updatedByEmail?: string;
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
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
      {subtitle ? (
        <p className="mt-2 text-sm leading-7 text-white/58">{subtitle}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm text-white/60">{children}</label>;
}

function PremiumInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35 ${props.className || ""}`}
    />
  );
}

function PremiumTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35 ${props.className || ""}`}
    />
  );
}

function PremiumSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none ${props.className || ""}`}
    />
  );
}

export default function StudentDetailPage() {
  const { loading, profile, firebaseUser, error } = useRequireStaff();
  const params = useParams<{ studentId: string }>();
  const studentId = params?.studentId || "";

  const [studentName, setStudentName] = useState("");
  const [studentExists, setStudentExists] = useState(false);
  const [pageErr, setPageErr] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<"present" | "absent">("present");

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
    async function loadStudent() {
      if (!profile?.madrassahId || !studentId) return;

      resetFields();
      setMarkGoalCompleted(false);
      setMsg(null);
      setPageErr(null);
      setStudentExists(false);
      setHasExistingTodayLog(false);
      setEditorMode(null);
      setExistingLogMeta(null);

      try {
        const sDoc = await getDoc(
          doc(db, "madrassahs", profile.madrassahId, "students", studentId)
        );

        if (!sDoc.exists()) {
          setStudentName("Student");
          setPageErr("Student not found in this madrassah.");
          return;
        }

        const data = sDoc.data() as any;

        setStudentExists(true);
        setStudentName(toText(data.fullName) || "Student");
        setWeeklyGoal(toText(data.weeklyGoal));
        setWeeklyGoalWeekKey(toText(data.weeklyGoalWeekKey));
        setWeeklyGoalStartDateKey(toText(data.weeklyGoalStartDateKey));
        setWeeklyGoalCompletedDateKey(toText(data.weeklyGoalCompletedDateKey));

        const dur = data.weeklyGoalDurationDays;
        setWeeklyGoalDurationDays(typeof dur === "number" ? dur : dur ? Number(dur) : null);

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
          setEditorMode("new");
          return;
        }

        const logData = todayLogSnap.data() as any;

        setHasExistingTodayLog(true);
        fillFieldsFromLog(logData);

        setExistingLogMeta({
          updatedByEmail: toText(logData.updatedByEmail),
          updatedAtText: logData.updatedAt?.toDate
            ? logData.updatedAt.toDate().toLocaleString()
            : "",
        });

        setEditorMode("edit");
      } catch (e: any) {
        setPageErr(e?.message ?? "Could not load the student.");
      }
    }

    if (!loading && profile) {
      loadStudent();
    }
  }, [loading, profile, studentId, dateKey]);

  async function handleSave() {
    setMsg(null);

    if (!profile?.madrassahId || !firebaseUser?.uid) {
      setPageErr("Your account is not linked correctly.");
      return;
    }

    if (!studentExists) {
      setPageErr("Student not found.");
      return;
    }

    setSaving(true);

    try {
      const studentRef = doc(db, "madrassahs", profile.madrassahId, "students", studentId);
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

      const logPayload = {
        dateKey,
        attendance,
        sabak: sabak.trim(),
        sabakDhor: sabakDhor.trim(),
        dhor: dhor.trim(),

        sabakReadQuality: sabakReadQuality.trim(),
        sabakReadNotes: sabakReadNotes.trim(),

        sabakDhorReadQuality: sabakDhorReadQuality.trim(),
        sabakDhorReadNotes: sabakDhorReadNotes.trim(),

        dhorReadQuality: dhorReadQuality.trim(),
        dhorReadNotes: dhorReadNotes.trim(),

        sabakDhorMistakes: sabakDhorMistakes.trim(),
        dhorMistakes: dhorMistakes.trim(),

        weeklyGoal: nextGoal,
        weeklyGoalWeekKey: nextGoalWeekKey,
        weeklyGoalStartDateKey: nextGoalStartDateKey,
        weeklyGoalCompletedDateKey: nextGoalCompletedDateKey,
        weeklyGoalDurationDays: nextGoalDurationDays,
        weeklyGoalCompleted: Boolean(nextGoalCompletedDateKey),

        updatedBy: firebaseUser.uid,
        updatedByEmail: profile.email || firebaseUser.email || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(logRef, logPayload, { merge: true });

      await updateDoc(studentRef, {
        currentSabak: sabak.trim(),
        currentSabakDhor: sabakDhor.trim(),
        currentDhor: dhor.trim(),

        currentSabakReadQuality: sabakReadQuality.trim(),
        currentSabakDhorReadQuality: sabakDhorReadQuality.trim(),
        currentDhorReadQuality: dhorReadQuality.trim(),

        currentSabakReadNotes: sabakReadNotes.trim(),
        currentSabakDhorReadNotes: sabakDhorReadNotes.trim(),
        currentDhorReadNotes: dhorReadNotes.trim(),

        currentSabakDhorMistakes: sabakDhorMistakes.trim(),
        currentDhorMistakes: dhorMistakes.trim(),

        weeklyGoal: nextGoal,
        weeklyGoalWeekKey: nextGoalWeekKey,
        weeklyGoalStartDateKey: nextGoalStartDateKey,
        weeklyGoalCompletedDateKey: nextGoalCompletedDateKey,
        weeklyGoalDurationDays: nextGoalDurationDays,

        lastLogDateKey: dateKey,
        updatedByUid: firebaseUser.uid,
        updatedByEmail: profile.email || firebaseUser.email || "",
        updatedAt: serverTimestamp(),
      });

      setWeeklyGoal(nextGoal);
      setWeeklyGoalWeekKey(nextGoalWeekKey);
      setWeeklyGoalStartDateKey(nextGoalStartDateKey);
      setWeeklyGoalCompletedDateKey(nextGoalCompletedDateKey);
      setWeeklyGoalDurationDays(nextGoalDurationDays);

      setHasExistingTodayLog(true);
      setEditorMode("edit");
      setMarkGoalCompleted(false);
      setMsg("Today’s log was saved successfully.");
    } catch (e: any) {
      setMsg(e?.message ?? "Could not save the log.");
    } finally {
      setSaving(false);
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
          {error || "Could not load this page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title={studentName || "Student Record"}
      subtitle="Record attendance, progress quality, notes, mistakes, and weekly goal status with a clean premium workflow."
      eyebrow="Daily Progress Logging"
      rightSlot={
        <>
          <Link
            href="/dashboard/students"
            className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.08]"
          >
            Back to Students
          </Link>
          <Link
            href={`/dashboard/students/${studentId}/overview`}
            className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-5 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)]"
          >
            Open Overview
          </Link>
        </>
      }
    >
      {pageErr ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {pageErr}
        </div>
      ) : null}

      {msg ? (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/80">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumStatCard
          label="Today"
          value={dateKey}
          subtext="Current South Africa date key."
        />
        <PremiumStatCard
          label="Attendance"
          value={attendance === "present" ? "Present" : "Absent"}
          subtext="Current selected status."
        />
        <PremiumStatCard
          label="Weekly Goal"
          value={weeklyGoal ? "Set" : "Not Set"}
          subtext={goalAlreadyCompleted ? "Completed" : goalLocked ? "Active" : "Open"}
        />
        <PremiumStatCard
          label="Editor Mode"
          value={editorMode ? editorMode.toUpperCase() : "—"}
          subtext="How this log is currently being handled."
        />
      </div>

      {hasExistingTodayLog ? (
        <div className="mt-8 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-base font-semibold text-white">Today already has a saved log.</p>
              {existingLogMeta?.updatedByEmail ? (
                <p className="mt-2 text-sm text-white/58">
                  Last updated by {existingLogMeta.updatedByEmail}
                  {existingLogMeta.updatedAtText ? ` • ${existingLogMeta.updatedAtText}` : ""}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditorMode("edit")}
                className={`rounded-full border px-4 py-3 text-sm font-medium transition ${
                  editorMode === "edit"
                    ? "border-[#d8b67e]/30 bg-[linear-gradient(135deg,rgba(251,244,232,0.18),rgba(216,182,126,0.22),rgba(255,255,255,0.08))] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                Edit Today’s Log
              </button>

              <button
                type="button"
                onClick={() => setEditorMode("overwrite")}
                className={`rounded-full border px-4 py-3 text-sm font-medium transition ${
                  editorMode === "overwrite"
                    ? "border-[#d8b67e]/30 bg-[linear-gradient(135deg,rgba(251,244,232,0.18),rgba(216,182,126,0.22),rgba(255,255,255,0.08))] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                Overwrite Today’s Log
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6">
        <SectionCard
          title="Attendance"
          subtitle="Set today’s attendance status before capturing the learning detail."
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setAttendance("present")}
              className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                attendance === "present"
                  ? "bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)]"
                  : "border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]"
              }`}
            >
              Present
            </button>

            <button
              type="button"
              onClick={() => setAttendance("absent")}
              className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                attendance === "absent"
                  ? "bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)]"
                  : "border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]"
              }`}
            >
              Absent
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Sabak" subtitle="Capture the new lesson and how it was read today.">
          <div className="grid gap-4">
            <div>
              <FieldLabel>Sabak</FieldLabel>
              <PremiumInput
                value={sabak}
                onChange={(e) => setSabak(e.target.value)}
                placeholder="Enter sabak"
              />
            </div>

            <div>
              <FieldLabel>Reading Quality</FieldLabel>
              <PremiumSelect
                value={sabakReadQuality}
                onChange={(e) => setSabakReadQuality(e.target.value)}
              >
                {READING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-neutral-950">
                    {opt.label}
                  </option>
                ))}
              </PremiumSelect>
            </div>

            <div>
              <FieldLabel>Sabak Notes</FieldLabel>
              <PremiumTextarea
                value={sabakReadNotes}
                onChange={(e) => setSabakReadNotes(e.target.value)}
                placeholder="Notes about today’s sabak"
                rows={4}
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Sabak Dhor" subtitle="Capture revision quality and any mistakes needing attention.">
          <div className="grid gap-4">
            <div>
              <FieldLabel>Sabak Dhor</FieldLabel>
              <PremiumInput
                value={sabakDhor}
                onChange={(e) => setSabakDhor(e.target.value)}
                placeholder="Enter sabak dhor"
              />
            </div>

            <div>
              <FieldLabel>Reading Quality</FieldLabel>
              <PremiumSelect
                value={sabakDhorReadQuality}
                onChange={(e) => setSabakDhorReadQuality(e.target.value)}
              >
                {READING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-neutral-950">
                    {opt.label}
                  </option>
                ))}
              </PremiumSelect>
            </div>

            <div>
              <FieldLabel>Sabak Dhor Notes</FieldLabel>
              <PremiumTextarea
                value={sabakDhorReadNotes}
                onChange={(e) => setSabakDhorReadNotes(e.target.value)}
                placeholder="Notes about sabak dhor"
                rows={4}
              />
            </div>

            <div>
              <FieldLabel>Sabak Dhor Mistakes</FieldLabel>
              <PremiumInput
                value={sabakDhorMistakes}
                onChange={(e) => setSabakDhorMistakes(e.target.value)}
                placeholder="Enter mistakes"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Dhor" subtitle="Capture older revision quality and supporting notes.">
          <div className="grid gap-4">
            <div>
              <FieldLabel>Dhor</FieldLabel>
              <PremiumInput
                value={dhor}
                onChange={(e) => setDhor(e.target.value)}
                placeholder="Enter dhor"
              />
            </div>

            <div>
              <FieldLabel>Reading Quality</FieldLabel>
              <PremiumSelect
                value={dhorReadQuality}
                onChange={(e) => setDhorReadQuality(e.target.value)}
              >
                {READING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-neutral-950">
                    {opt.label}
                  </option>
                ))}
              </PremiumSelect>
            </div>

            <div>
              <FieldLabel>Dhor Notes</FieldLabel>
              <PremiumTextarea
                value={dhorReadNotes}
                onChange={(e) => setDhorReadNotes(e.target.value)}
                placeholder="Notes about dhor"
                rows={4}
              />
            </div>

            <div>
              <FieldLabel>Dhor Mistakes</FieldLabel>
              <PremiumInput
                value={dhorMistakes}
                onChange={(e) => setDhorMistakes(e.target.value)}
                placeholder="Enter mistakes"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Weekly Goal" subtitle="Set this week’s target and mark it complete when achieved.">
          <div className="mb-4 flex flex-wrap gap-2">
            {goalLocked ? <PremiumBadge>Current week goal active</PremiumBadge> : null}
            {goalAlreadyCompleted ? <PremiumBadge>Goal completed</PremiumBadge> : null}
            {goalNotReached ? <PremiumBadge>Goal overdue</PremiumBadge> : null}
          </div>

          <div className="grid gap-4">
            <div>
              <FieldLabel>Weekly Goal</FieldLabel>
              <PremiumInput
                value={weeklyGoal}
                onChange={(e) => setWeeklyGoal(e.target.value)}
                placeholder="Set weekly goal"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-sm text-white/75">
              <input
                type="checkbox"
                checked={markGoalCompleted}
                onChange={(e) => setMarkGoalCompleted(e.target.checked)}
              />
              Mark this week’s goal as completed
            </label>

            {weeklyGoalStartDateKey ? (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/58">
                Goal started: {weeklyGoalStartDateKey}
                {weeklyGoalCompletedDateKey ? ` • Completed: ${weeklyGoalCompletedDateKey}` : ""}
                {weeklyGoalDurationDays ? ` • Duration: ${weeklyGoalDurationDays} day(s)` : ""}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (hasExistingTodayLog && editorMode === null)}
            className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-6 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Today’s Log"}
          </button>

          <Link
            href={`/dashboard/students/${studentId}/overview`}
            className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white/75 transition hover:bg-white/[0.08]"
          >
            View Full Overview
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
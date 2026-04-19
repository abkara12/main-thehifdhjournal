"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../app/lib/firebase";
import { useRequireStaff } from "../../../lib/auth-guards";

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export default function NewStudentPage() {
  const router = useRouter();
  const { loading, profile, firebaseUser, error } = useRequireStaff();

  const [fullName, setFullName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const canSubmit = useMemo(() => {
    return !!profile?.madrassahId && !loading && !saving;
  }, [profile, loading, saving]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    if (!profile?.madrassahId) {
      setFormError("Your account is not linked to a madrassah.");
      return;
    }

    const cleanFullName = normalizeName(fullName);
    const cleanParentName = normalizeName(parentName);
    const cleanParentPhone = normalizePhone(parentPhone);
    const cleanParentEmail = parentEmail.trim().toLowerCase();

    if (!cleanFullName) {
      setFormError("Please enter the student's full name.");
      return;
    }

    if (!cleanParentName) {
      setFormError("Please enter the parent's name.");
      return;
    }

    if (!cleanParentPhone) {
      setFormError("Please enter the parent's phone number.");
      return;
    }

    if (!isValidPhone(cleanParentPhone)) {
      setFormError("Please enter a valid parent phone number.");
      return;
    }

    setSaving(true);

    try {
      const ref = await addDoc(
        collection(db, "madrassahs", profile.madrassahId, "students"),
        {
          fullName: cleanFullName,
          fullNameLower: cleanFullName.toLowerCase(),
          parentName: cleanParentName,
          parentPhone: cleanParentPhone,
          parentEmail: cleanParentEmail,
          isActive: true,
          createdBy: firebaseUser?.uid ?? "",
          createdByEmail: profile.email,
          lastLogDateKey: "",
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
          weeklyGoal: "",
          weeklyGoalWeekKey: "",
          weeklyGoalStartDateKey: "",
          weeklyGoalCompletedDateKey: "",
          weeklyGoalDurationDays: null,
            updatedByUid: firebaseUser?.uid ?? "",
          updatedByEmail: profile.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      setSuccessMsg("Student added successfully.");
      setFullName("");
      setParentName("");
      setParentPhone("");
      setParentEmail("");

      router.push(`/dashboard/students/${ref.id}`);
    } catch (err: any) {
      setFormError(err?.message || "Could not add student.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen grid place-items-center">Loading...</main>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div>{error || "Could not load this page."}</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <h1 className="text-3xl font-semibold">Add Student</h1>
        <p className="mt-3 text-white/65">
          Create a new student record for {profile.madrassahName || "your madrassah"}.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {formError ? <p className="text-sm text-red-300">{formError}</p> : null}
          {successMsg ? <p className="text-sm text-green-300">{successMsg}</p> : null}

          <input
            type="text"
            placeholder="Student full name"
            className="w-full rounded-xl bg-white/10 p-3 outline-none"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Parent name"
            className="w-full rounded-xl bg-white/10 p-3 outline-none"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Parent phone"
            className="w-full rounded-xl bg-white/10 p-3 outline-none"
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
          />

          <input
            type="email"
            placeholder="Parent email (optional)"
            className="w-full rounded-xl bg-white/10 p-3 outline-none"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
          />

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-white px-6 py-3 font-medium text-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Student"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/dashboard/students")}
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-medium"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
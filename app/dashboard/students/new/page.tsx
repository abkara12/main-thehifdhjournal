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
            {error || "Could not load this page."}
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

      <div className="mx-auto max-w-4xl">
        <div className="rounded-[32px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.62))] shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-2xl overflow-hidden">
          <div className="border-b border-gray-300 px-5 py-5 sm:px-8 sm:py-7">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#8d7440]">
              Student Management
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#171717] sm:text-4xl">
              Add Student
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5f5f5f] sm:text-base">
              Create a new student record for{" "}
              {profile.madrassahName || "your madrassah"} with a clean,
              organised setup ready for progress tracking and parent reporting.
            </p>
          </div>

          <div className="grid gap-6 px-5 py-5 sm:px-8 sm:py-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError ? (
                  <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                    {formError}
                  </div>
                ) : null}

                {successMsg ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    {successMsg}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#5f5f5f]">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter student full name"
                    className="w-full rounded-2xl border border-gray-300 bg-white/85 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

        

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#5f5f5f]">
                    Parent Phone
                  </label>
                  <input
                    type="text"
                    placeholder="Enter parent phone number"
                    className="w-full rounded-2xl border border-gray-300 bg-white/85 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                  />
                </div>


                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Add Student"}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/students")}
                    className="rounded-full border border-gray-300 bg-white/72 px-6 py-3.5 text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>

           <div className="space-y-4">
  <div className="rounded-[28px] border border-gray-300 bg-white/72 p-5 shadow-sm backdrop-blur-xl">
    <p className="text-[11px] uppercase tracking-[0.24em] text-[#B8963D]">
      Student Registration
    </p>

    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#171717]">
      Add a new student
    </h2>

    <p className="mt-3 text-sm leading-7 text-[#5f5f5f]">
      Enter the student’s details to begin tracking their daily lessons,
      revision, and weekly progress in a clear and structured system.
    </p>
  </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
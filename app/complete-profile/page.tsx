"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export default function CompleteProfilePage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [childName, setChildName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUid(user.uid);

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          router.push("/signup");
          return;
        }

        const data = snap.data() as any;

        if (data.accountType === "ustad" || data.role === "admin" || data.role === "pending_admin") {
          router.push("/");
          return;
        }

        if (data.profileCompleted === true) {
          router.push("/");
          return;
        }

        setParentName(data.username || "");
        setParentPhone(data.phone || "");
      } catch {
        setErr("Could not load your profile details.");
      } finally {
        setChecking(false);
      }
    });

    return () => unsub();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;

    setErr(null);
    setLoading(true);

    try {
      await setDoc(
        doc(db, "users", uid),
        {
          childName: childName.trim(),
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim(),
          profileCompleted: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.push("/");
    } catch {
      setErr("Could not save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
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

        <div className="min-h-screen grid place-items-center px-6">
          <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-8 shadow-lg text-gray-700">
            Loading...
          </div>
        </div>
      </main>
    );
  }

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

      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="h-[80px] w-[85px] rounded-xl bg-white/100 backdrop-blur border border-gray-300 shadow-sm grid place-items-center">
              <Image src="/logo4.png" alt="Hifdh Journal" width={58} height={58} className="rounded" />
            </div>
          </Link>

          <div className="text-sm font-medium text-gray-700">
            Complete your setup <span className="text-[#B8963D]">to continue</span>
          </div>
        </div>

        <div className="mt-10 grid lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur-xl p-8 shadow-lg">
              <p className="uppercase tracking-widest text-xs text-[#B8963D]">Hifdh Journal</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight leading-tight">
                Complete your profile
              </h1>
              <p className="mt-3 text-gray-700 leading-relaxed">
                Add the child and parent details to finish setting up your Hifdh Journal account.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {["Child details", "Parent details", "Weekly reports", "Easy setup"].map((t) => (
                  <div
                    key={t}
                    className="rounded-2xl border border-gray-300 bg-white/70 px-4 py-4 text-sm font-medium"
                  >
                    {t}
                    <div className="mt-1 h-1 w-10 rounded-full bg-[#B8963D]/60" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-black text-white p-7 shadow-xl relative overflow-hidden">
              <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#B8963D]/25 blur-2xl" />
              <p className="text-white/70 text-sm italic leading-relaxed">
                “And We have certainly made the Qur’an easy for remembrance, so is there any who
                will remember?”
              </p>
              <p className="mt-4 text-white/70 text-sm">Surah Al-Qamar • 54:17</p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-8 shadow-lg">
              <h2 className="text-2xl font-semibold tracking-tight">Parent Information</h2>
              <p className="mt-2 text-sm text-gray-600">
                Please complete the details below before continuing.
              </p>

              {err && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {err}
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-6 grid gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-800">
                    Child&apos;s Name
                  </label>
                  <input
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    type="text"
                    required
                    placeholder="e.g. Muhammad Ahmed"
                    className="mt-2 w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/40"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">
                    Parent&apos;s Name
                  </label>
                  <input
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    type="text"
                    required
                    placeholder="e.g. Ahmed Khan"
                    className="mt-2 w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/40"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">
                    Parent&apos;s Phone Number
                  </label>
                  <input
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    type="tel"
                    required
                    placeholder="e.g. 082 123 4567"
                    className="mt-2 w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:ring-2 focus:ring-[#B8963D]/40"
                  />
                </div>

                <button
                  disabled={loading}
                  className="mt-2 h-12 rounded-2xl bg-black text-white font-semibold hover:bg-gray-900 transition-colors shadow-sm disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Save and Continue"}
                </button>

                <div className="text-sm text-gray-600 text-center">
                  This helps us enable weekly reports and complete the child profile properly.
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
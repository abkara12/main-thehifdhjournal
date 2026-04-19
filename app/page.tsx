"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "./lib/firebase";
import { getUserProfileByUid } from "./lib/current-user";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const profile = await getUserProfileByUid(user.uid);

        if (
          profile &&
          profile.isActive &&
          ["admin", "teacher", "super_admin"].includes(profile.role)
        ) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // fall through to public homepage
      }

      setChecking(false);
    });

    return () => unsub();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.25em] text-white/60">
            The Hifdh Journal
          </p>

          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl md:text-6xl">
            A premium hifdh tracking system for madrassahs that want clarity,
            structure, and professional parent reporting.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
            Teachers record progress daily. Admins stay in control. Weekly
            reports are prepared beautifully and ready to be sent.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-xl bg-white px-6 py-3 font-medium text-black transition hover:opacity-90"
            >
              Create Madrassah
            </Link>

            <Link
              href="/join"
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-medium transition hover:bg-white/10"
            >
              Join as Teacher
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-medium transition hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
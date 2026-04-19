"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function JoinPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/join-teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          password,
          joinCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to join.");
      }

      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to join.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,#050505_0%,#0b0b0b_48%,#050505_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="hidden lg:block">
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/40">
              The Hifdh Journal
            </p>

            <h1 className="mt-5 max-w-2xl bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_42%,#ffffff_100%)] bg-clip-text text-[3.15rem] font-semibold leading-[1.02] tracking-[-0.06em] text-transparent">
              Join your
              <span className="mt-1 block">madrassah with</span>
              <span className="mt-1 block">clarity and ease.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[1rem] leading-8 text-white/62">
              Use your madrassah join code to enter the platform as a teacher,
              access student records, and maintain daily hifdh progress with precision.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/68">
                Join-code access
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/68">
                Teacher workflow
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/68">
                Daily progress logging
              </div>
            </div>
          </section>

          <section>
            <div className="mx-auto w-full max-w-md rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8">
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                  Join as Teacher
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                  Enter your madrassah
                </h2>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Create your teacher account and connect it to the correct madrassah using the join code.
                </p>
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                {error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm text-white/60">Full Name</label>
                  <input
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Phone</label>
                  <input
                    placeholder="Enter phone number"
                    className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Password</label>
                  <input
                    type="password"
                    placeholder="Create a password"
                    className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none placeholder:text-white/35"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/60">Join Code</label>
                  <input
                    placeholder="Enter join code"
                    className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white uppercase outline-none placeholder:text-white/35"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <button
                  disabled={loading}
                  className="w-full rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-6 py-3.5 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(216,182,126,0.18)] disabled:opacity-60"
                >
                  {loading ? "Joining..." : "Join Madrassah"}
                </button>
              </form>

              <div className="mt-6 grid gap-3">
                <Link
                  href="/login"
                  className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-center text-sm font-medium text-white/72 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Back to Login
                </Link>

                <Link
                  href="/signup"
                  className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-center text-sm font-medium text-white/72 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Create Madrassah
                </Link>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-white/52">
                You will need the correct join code from your madrassah admin to create access successfully.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
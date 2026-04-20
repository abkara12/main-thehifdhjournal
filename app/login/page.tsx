"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { getUserProfileByUid } from "../lib/current-user";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      const profile = await getUserProfileByUid(cred.user.uid);

      if (!profile) {
        throw new Error("Account not found.");
      }

      if (!profile.isActive) {
        throw new Error("Account is inactive.");
      }

      if (!["admin", "teacher", "super_admin"].includes(profile.role)) {
        throw new Error("Access denied.");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-transparent text-gray-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#F8F6F1]" />
        <div className="absolute -top-72 -right-40 h-[900px] w-[900px] rounded-full bg-[#1F3F3F]/25 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-15%] h-[1000px] w-[1000px] rounded-full bg-[#B8963D]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_70%_20%,rgba(184,150,61,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_10%,transparent_50%,rgba(0,0,0,0.08))]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply bg-[url('/noise.png')]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="hidden lg:block">
            <div className="flex items-center gap-4">
              <div className="grid h-[80px] w-[85px] place-items-center rounded-xl border border-gray-300 bg-white/100 shadow-sm backdrop-blur">
                <Image
                  src="/logo4.png"
                  alt="Hifdh Journal"
                  width={58}
                  height={58}
                  className="rounded"
                  priority
                />
              </div>
            </div>

            <p className="mt-8 text-[11px] uppercase tracking-[0.34em] text-[#8d7440]">
              The Hifdh Journal
            </p>

            <h1 className="mt-5 max-w-2xl text-[3.3rem] font-semibold leading-[1.02] tracking-[-0.06em] text-[#171717]">
              Premium progress
              <span className="mt-1 block text-[#1F3F3F]">tracking for</span>
              <span className="mt-1 block">serious madrassahs.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[1rem] leading-8 text-[#575757]">
              Log daily hifdh progress, monitor weekly goals, manage staff cleanly,
              and prepare refined parent reports from one elegant system.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full border border-gray-300 bg-white/60 px-4 py-2 text-sm text-[#555] backdrop-blur-xl">
                Staff-only access
              </div>
              <div className="rounded-full border border-gray-300 bg-white/60 px-4 py-2 text-sm text-[#555] backdrop-blur-xl">
                Multi-madrassah platform
              </div>
              <div className="rounded-full border border-gray-300 bg-white/60 px-4 py-2 text-sm text-[#555] backdrop-blur-xl">
                Weekly report workflow
              </div>
            </div>

            <div className="mt-10 grid max-w-xl gap-4">
              <div className="rounded-3xl border border-gray-300 bg-white/72 p-6 shadow-sm backdrop-blur-xl">
                <p className="text-sm uppercase tracking-[0.24em] text-[#B8963D]">
                  Secure access
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#171717]">
                  Continue inside the platform
                </h3>
                <p className="mt-3 leading-7 text-[#5e5e5e]">
                  Sign in to continue managing students, reports, and daily madrassah
                  operations from the refined system environment.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="mx-auto w-full max-w-md rounded-[32px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.58))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.10)] backdrop-blur-2xl sm:p-8">
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#8d7440]">
                  Staff Login
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#171717]">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">
                  Sign in to continue managing students, reports, and madrassah operations.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {error ? (
                  <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm text-[#5f5f5f]">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full rounded-2xl border border-gray-300 bg-white/80 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[#5f5f5f]">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-gray-300 bg-white/80 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  disabled={loading}
                  className="w-full rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d] disabled:opacity-60"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <div className="mt-6 grid gap-3">
                <Link
                  href="/signup"
                  className="rounded-full border border-gray-300 bg-white/70 px-5 py-3 text-center text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
                >
                  Create Madrassah
                </Link>

                <Link
                  href="/join"
                  className="rounded-full border border-gray-300 bg-white/70 px-5 py-3 text-center text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
                >
                  Join as Teacher
                </Link>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-300 bg-white/65 p-4 text-sm leading-7 text-[#5b5b5b]">
                Access is reserved for approved admin, teacher, and super admin accounts.
              </div>
            </div>

            <div className="mx-auto mt-5 max-w-md lg:hidden">
              <div className="rounded-3xl border border-gray-300 bg-white/72 p-5 shadow-sm backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.24em] text-[#B8963D]">
                  The Hifdh Journal
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#171717]">
                  Premium staff access
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#5e5e5e]">
                  Sign in to access your madrassah workspace, manage progress properly,
                  and continue from a clean professional system.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
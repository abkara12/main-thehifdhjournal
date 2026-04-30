"use client";

import Image from "next/image";
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
  const [showPassword, setShowPassword] = useState(false);

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
      router.push("/dashboard/students");
    } catch (err: any) {
      setError(err?.message || "Failed to join.");
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

            <h1 className="mt-5 max-w-2xl text-[3.15rem] font-semibold leading-[1.02] tracking-[-0.06em] text-[#171717]">
              Join your
              <span className="mt-1 block text-[#1F3F3F]">madrassah with</span>
              <span className="mt-1 block">clarity and ease.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[1rem] leading-8 text-[#575757]">
              Use your madrassah join code to enter the platform as a teacher,
              access student records, and maintain daily hifdh progress with precision.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full border border-gray-300 bg-white/60 px-4 py-2 text-sm text-[#555] backdrop-blur-xl">
                Join-code access
              </div>
              <div className="rounded-full border border-gray-300 bg-white/60 px-4 py-2 text-sm text-[#555] backdrop-blur-xl">
                Teacher workflow
              </div>
              <div className="rounded-full border border-gray-300 bg-white/60 px-4 py-2 text-sm text-[#555] backdrop-blur-xl">
                Daily progress logging
              </div>
            </div>

            <div className="mt-10 grid max-w-xl gap-4">
              <div className="rounded-3xl border border-gray-300 bg-white/72 p-6 shadow-sm backdrop-blur-xl">
                <p className="text-sm uppercase tracking-[0.24em] text-[#B8963D]">
                  Teacher access
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#171717]">
                  Enter through the correct madrassah
                </h3>
                <p className="mt-3 leading-7 text-[#5e5e5e]">
                  Create your teacher account and connect it to the correct
                  madrassah using the join code given to you by the admin.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="mx-auto w-full max-w-md rounded-[32px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.58))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.10)] backdrop-blur-2xl sm:p-8">
              <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#8d7440]">
                  Join as Teacher
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#171717]">
                  Create Your Teacher Account
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">
                  Create your teacher account and connect it to the correct madrassah using the join code.
                </p>
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                {error ? (
                  <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm text-[#5f5f5f]">Full Name</label>
                  <input
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-gray-300 bg-white/80 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[#5f5f5f]">Phone</label>
                  <input
                    placeholder="Enter phone number"
                    className="w-full rounded-2xl border border-gray-300 bg-white/80 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

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
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className="w-full rounded-2xl border border-gray-300 bg-white/80 p-4 pr-24 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#5b5b5b] transition hover:bg-[#f7f7f7]"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[#5f5f5f]">Join Code</label>
                  <input
                    placeholder="Enter join code"
                    className="w-full rounded-2xl border border-gray-300 bg-white/80 p-4 text-[#171717] uppercase outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <button
                  disabled={loading}
                  className="w-full rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d] disabled:opacity-60"
                >
                  {loading ? "Joining..." : "Join Madrassah"}
                </button>
              </form>

              <div className="mt-6 grid gap-3">
                <Link
                  href="/login"
                  className="rounded-full border border-gray-300 bg-white/70 px-5 py-3 text-center text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
                >
                  Back to Login
                </Link>

                <Link
                  href="/signup"
                  className="rounded-full border border-gray-300 bg-white/70 px-5 py-3 text-center text-sm font-medium text-[#5b5b5b] transition hover:bg-white hover:text-[#171717]"
                >
                  Create Madrassah
                </Link>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-300 bg-white/65 p-4 text-sm leading-7 text-[#5b5b5b]">
                You will need the correct join code from your madrassah admin to create access successfully.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
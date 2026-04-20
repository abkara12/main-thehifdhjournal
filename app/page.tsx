"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "./lib/firebase";
import { getUserProfileByUid } from "./lib/current-user";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 transition-transform duration-300 ${
        open ? "rotate-180" : "rotate-0"
      }`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="w-full rounded-[28px] border border-[#d7d0c3] bg-white/72 px-6 py-5 text-left shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:shadow-[0_14px_42px_rgba(15,23,42,0.08)]"
      aria-expanded={open}
    >
      <div className="flex items-center justify-between gap-6">
        <h4 className="text-base font-semibold text-[#161616] sm:text-lg">
          {question}
        </h4>

        <span className="flex items-center gap-3 text-[#B8963D]">
          <span className="hidden text-sm font-medium sm:inline">
            {open ? "Close" : "Open"}
          </span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#B8963D]/10">
            <ChevronIcon open={open} />
          </span>
        </span>
      </div>

      <div
        className={`grid overflow-hidden transition-all duration-300 ${
          open ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-7 text-[#5b5b5b] sm:text-[15px]">
            {answer}
          </p>
        </div>
      </div>
    </button>
  );
}

function FeatureCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[32px] border border-[#d8d1c4] bg-white/72 p-7 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.1)] sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#B8963D]/10 blur-3xl opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#111111] text-white shadow-sm">
          {icon}
        </div>

        <div>
          <h3 className="text-xl font-semibold tracking-tight text-[#171717] sm:text-2xl">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-[#5e5e5e] sm:text-[15px]">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

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
      <main className="min-h-screen grid place-items-center bg-[#F8F6F1] px-6">
        <div className="rounded-3xl border border-[#d8d1c4] bg-white/70 px-6 py-4 text-[#191919] shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main
      id="top"
      className="min-h-screen overflow-x-hidden bg-transparent text-[#111111]"
    >
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#F8F6F1]" />
        <div className="absolute -right-40 -top-72 h-[900px] w-[900px] rounded-full bg-[#1F3F3F]/25 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-15%] h-[1000px] w-[1000px] rounded-full bg-[#B8963D]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_70%_20%,rgba(184,150,61,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_10%,transparent_50%,rgba(0,0,0,0.07))]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply bg-[url('/noise.png')]" />
      </div>

      {/* Navbar */}
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-7 sm:px-10">
        <div className="flex items-center gap-4">
          <div className="grid h-[72px] w-[76px] place-items-center rounded-2xl border border-[#d8d1c4] bg-white/90 shadow-sm backdrop-blur-xl sm:h-[80px] sm:w-[85px]">
            <Image
              src="/logo4.png"
              alt="The Hifdh Journal"
              width={56}
              height={56}
              className="rounded"
              priority
            />
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#8d7440]">
              Multi-Madrassah Platform
            </p>
            <p className="mt-1 text-sm font-semibold text-[#171717] sm:text-base">
              The Hifdh Journal
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/join"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7d0c3] bg-white/60 px-5 text-sm font-medium text-[#1a1a1a] backdrop-blur-xl transition hover:bg-white/88"
          >
            Join as Teacher
          </Link>

          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7d0c3] bg-white/60 px-5 text-sm font-medium text-[#1a1a1a] backdrop-blur-xl transition hover:bg-white/88"
          >
            Login
          </Link>

          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-6 text-sm font-medium text-white shadow-sm transition hover:bg-[#1d1d1d]"
          >
            Create Madrassah
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-8 sm:px-10 sm:pb-20 sm:pt-10">
        <div className="grid items-stretch gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7d0c3] bg-white/70 px-4 py-2 text-sm backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-[#B8963D]" />
              <span className="text-[#323232]">
                Premium hifdh tracking for modern madrassahs
              </span>
            </div>

            <h1 className="mt-6 max-w-4xl text-[2.5rem] font-bold leading-[1.02] tracking-[-0.045em] text-[#111111] sm:text-[4.1rem]">
              Structure your madrassah.
              <br />
              <span className="text-[#1F3F3F]">Elevate parent reporting.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-[1rem] leading-8 text-[#555555] sm:text-lg">
              A premium hifdh tracking system for madrassahs that want clarity,
              consistency, and professional reporting across students, teachers,
              and administration.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#111111] px-8 text-base font-medium text-white shadow-sm transition hover:bg-[#1c1c1c]"
              >
                Create Madrassah
              </Link>

              <Link
                href="/join"
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#d7d0c3] bg-white/55 px-8 text-base font-medium text-[#171717] backdrop-blur-xl transition hover:bg-white/88"
              >
                Join as Teacher
              </Link>

              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#d7d0c3] bg-white/55 px-8 text-base font-medium text-[#171717] backdrop-blur-xl transition hover:bg-white/88"
              >
                Login
              </Link>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  k: "Daily Logs",
                  v: "Teacher progress capture",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path
                        d="M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ),
                },
                {
                  k: "Admin Control",
                  v: "Multi-madrassah clarity",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path
                        d="M12 6v6l4 2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  ),
                },
                {
                  k: "Reports",
                  v: "Beautiful weekly summaries",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path
                        d="M9 11l3 3L22 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div
                  key={item.k}
                  className="group relative flex h-[92px] items-center overflow-hidden rounded-[28px] border border-[#d7d0c3] bg-white/72 px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
                >
                  <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#B8963D] via-[#B8963D]/60 to-transparent" />
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#B8963D]/10 blur-2xl opacity-0 transition group-hover:opacity-100" />

                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#111111] text-white shadow-sm">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-sm text-[#6a6a6a]">{item.k}</div>
                      <div className="mt-0.5 font-semibold text-[#161616]">
                        {item.v}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:col-span-5">
            <div className="rounded-[32px] border border-[#d7d0c3] bg-gradient-to-br from-white/80 to-white/40 p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <p className="text-xl italic leading-relaxed text-[#161616]">
                “And We have certainly made the Qur’an easy for remembrance, so
                is there any who will remember?”
              </p>
              <p className="mt-5 text-sm text-[#666666]">
                Surah Al-Qamar • 54:17
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[32px] border border-black/10 bg-[#111111] p-8 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#B8963D]/20 blur-3xl" />

              <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                System Preview
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                Built for calm, focused daily operation
              </h3>
              <p className="mt-3 leading-7 text-white/72">
                Teachers record progress daily. Admins stay in control. Weekly
                reports are prepared beautifully and ready to be sent.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {["Sabak", "Sabak Dhor", "Dhor", "Weekly Goal"].map((t) => (
                  <div
                    key={t}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
                  >
                    <div className="text-sm text-white/75">{t}</div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      —
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <div className="rounded-[34px] border border-[#d7d0c3] bg-white/72 p-8 shadow-[0_10px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-10">
            <p className="mb-3 text-sm uppercase tracking-[0.26em] text-[#B8963D]">
              About the Hifdh Journal
            </p>

            <h2 className="text-3xl font-semibold tracking-tight text-[#161616] sm:text-4xl">
              Clarity, consistency, and accountability for every madrassah
            </h2>

            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <p className="text-base leading-8 text-[#555555] sm:text-lg">
                A structured and organised platform designed to track hifdh
                progress with excellence across multiple madrassahs, teachers,
                and students — without the mess and inconsistency of notebooks
                and scattered records.
              </p>

              <p className="text-base leading-8 text-[#555555] sm:text-lg">
                Daily progress tracking, organised teacher workflows, admin
                oversight, and beautiful reporting all come together in one
                premium system that feels professional and easy to use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 pb-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#5E4A1D]">
                Platform Highlights
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#161616] sm:text-4xl">
                Designed for modern madrassah operations
              </h2>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              title="Teacher-Friendly Logging"
              text="Teachers can record daily progress smoothly and consistently without the system feeling heavy or confusing."
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                  <path
                    d="M7 4h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />

            <FeatureCard
              title="Professional Oversight"
              text="Admins stay in control with clear structure, organised records, and an interface built for serious madrassah management."
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                  <path
                    d="M8 7V4m8 3V4M5 11h14M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />

            <FeatureCard
              title="Parent Reporting"
              text="Weekly reports are presented beautifully, helping parents see progress clearly and making the entire madrassah feel more professional."
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                  <path
                    d="M12 12a4 4 0 100-8 4 4 0 000 8z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M4 20a8 8 0 0116 0"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="mx-auto max-w-4xl px-6 sm:px-10">
          <div className="mb-12 text-center">
            <p className="text-sm uppercase tracking-[0.24em] text-[#5E4A1D]">
              Questions & Answers
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#161616] sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid gap-4">
            <FAQItem
              question="What makes this system better than basic manual tracking?"
              answer="Instead of scattered notebooks and inconsistent records, the system brings daily progress, structured oversight, and parent-ready reporting into one organised and premium experience."
            />
            <FAQItem
              question="Is this suitable for multiple madrassahs?"
              answer="Yes. The platform is built to support a proper multi-madrassah setup while still keeping the experience clean, professional, and easy to navigate."
            />
            <FAQItem
              question="Will teachers still find it simple to use?"
              answer="Yes. Even though the system is more advanced on the backend, the teacher-facing experience remains straightforward and focused on daily progress capture."
            />
            <FAQItem
              question="Does it help present the madrassah more professionally to parents?"
              answer="Absolutely. The reporting and overall system presentation create a far more professional impression and make communication with parents clearer and more structured."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="relative overflow-hidden rounded-[34px] border border-[#d7d0c3] bg-gradient-to-br from-white/72 to-white/40 p-8 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-10">
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#B8963D]/15 blur-3xl" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

            <div className="relative grid items-center gap-10 md:grid-cols-12">
              <div className="md:col-span-8">
                <p className="text-sm uppercase tracking-[0.24em] text-[#B8963D]">
                  Ready to begin?
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#161616] sm:text-4xl">
                  Bring premium structure to your madrassah
                </h2>
                <p className="mt-4 text-base leading-8 text-[#555555] sm:text-lg">
                  Create your madrassah, invite teachers, and start using a
                  serious system built for clarity, professionalism, and steady
                  progress.
                </p>
              </div>

              <div className="flex gap-3 md:col-span-4 md:justify-end">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#111111] px-7 text-base font-medium text-white transition hover:bg-[#1d1d1d]"
                >
                  Create Madrassah
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[#d7d0c3] bg-white/60 px-7 text-base font-medium text-[#171717] backdrop-blur-xl transition hover:bg-white/88"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#d8d1c4] bg-white/72 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="grid items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="flex items-center gap-4">
                <div className="grid h-[72px] w-[76px] place-items-center rounded-2xl border border-[#d8d1c4] bg-white/90 shadow-sm backdrop-blur-xl sm:h-[80px] sm:w-[85px]">
                  <Image
                    src="/logo4.png"
                    alt="The Hifdh Journal"
                    width={56}
                    height={56}
                    className="rounded"
                  />
                </div>

                <div>
                  <div className="text-lg font-semibold text-[#171717]">
                    The Hifdh Journal
                  </div>
                  <div className="text-sm text-[#666666]">
                    Premium madrassah progress system
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                <div>
                  <div className="mb-4 text-sm font-semibold text-[#171717]">
                    Explore
                  </div>
                  <div className="space-y-3">
                    <a href="/" className="block text-sm text-[#666] hover:text-black">
                      Home
                    </a>
                    <a
                      href="#about"
                      className="block text-sm text-[#666] hover:text-black"
                    >
                      About
                    </a>
                    <a
                      href="#faq"
                      className="block text-sm text-[#666] hover:text-black"
                    >
                      FAQ
                    </a>
                  </div>
                </div>

                <div>
                  <div className="mb-4 text-sm font-semibold text-[#171717]">
                    Access
                  </div>
                  <div className="space-y-3">
                    <a
                      href="/login"
                      className="block text-sm text-[#666] hover:text-black"
                    >
                      Login
                    </a>
                    <a
                      href="/join"
                      className="block text-sm text-[#666] hover:text-black"
                    >
                      Join as Teacher
                    </a>
                    <a
                      href="/signup"
                      className="block text-sm text-[#666] hover:text-black"
                    >
                      Create Madrassah
                    </a>
                  </div>
                </div>

                <div>
                  <div className="mb-4 text-sm font-semibold text-[#171717]">
                    System
                  </div>
                  <div className="space-y-3">
                    <a
                      href="#about"
                      className="block text-sm text-[#666] hover:text-black"
                    >
                      Structure
                    </a>
                    <a
                      href="#faq"
                      className="block text-sm text-[#666] hover:text-black"
                    >
                      Questions
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-[30px] border border-[#d7d0c3] bg-gradient-to-br from-white/72 to-white/40 p-6 shadow-[0_10px_34px_rgba(15,23,42,0.05)] backdrop-blur-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm uppercase tracking-[0.24em] text-[#B8963D]">
                      Start now
                    </div>
                    <div className="mt-1 text-lg font-semibold text-[#171717]">
                      Ready to set up your madrassah?
                    </div>
                    <div className="mt-1 text-sm text-[#666666]">
                      Create your madrassah and start using the platform.
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <a
                      href="/signup"
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-6 text-sm font-medium text-white hover:bg-[#1d1d1d]"
                    >
                      Create Madrassah
                    </a>
                    <a
                      href="/login"
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7d0c3] bg-white/70 px-6 text-sm font-medium text-[#171717] transition hover:bg-white"
                    >
                      Login
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="my-10 h-px bg-[#e3ddd1]" />

          <div className="flex flex-col items-center justify-between gap-4 text-sm text-[#666666] sm:flex-row">
            <div>© {new Date().getFullYear()} The Hifdh Journal</div>
            <a href="#top" className="hover:text-black">
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
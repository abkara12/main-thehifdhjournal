"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "./lib/firebase";
import { getUserProfileByUid } from "./lib/current-user";

/* ---------------- PWA Install Prompt (ALWAYS shows until installed) ---------------- */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as any).standalone === true;
  const mql = window.matchMedia?.("(display-mode: standalone)");
  const displayModeStandalone = mql ? mql.matches : false;
  return iosStandalone || displayModeStandalone;
}

function InstallAppPrompt() {
  const [open, setOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  const DISMISS_KEY = "pwa_install_dismissed_at";
  const DISMISS_COOLDOWN_HOURS = 6;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ios = isIosDevice();
    setIsIOS(ios);

    const standaloneNow = isStandaloneMode();
    setStandalone(standaloneNow);

    if (standaloneNow) {
      setOpen(false);
      return;
    }

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0");
    const hoursSince = dismissedAt ? (Date.now() - dismissedAt) / (1000 * 60 * 60) : 999;

    if (ios) {
      if (hoursSince >= DISMISS_COOLDOWN_HOURS) setOpen(true);
      return;
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (hoursSince >= DISMISS_COOLDOWN_HOURS) setOpen(true);
    };

    const onInstalled = () => {
      setOpen(false);
      setDeferred(null);
      localStorage.removeItem(DISMISS_KEY);
      setStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    if (hoursSince >= DISMISS_COOLDOWN_HOURS) setOpen(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferred) return;

    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;

      if (choice.outcome === "accepted") {
        setOpen(false);
        localStorage.removeItem(DISMISS_KEY);
      } else {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setOpen(false);
      }
    } catch {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setOpen(false);
    }
  }

  function handleClose() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  }

  if (standalone) return null;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={handleClose} />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/30 bg-white/75 shadow-2xl backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#B8963D]/18 blur-3xl" />
          <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-black/10 blur-3xl" />
        </div>

        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-[#B8963D]">Install App</div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
                Add the Hifdh Journal App to your Home Screen
              </h3>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gray-300 bg-white/70 transition-colors hover:bg-white"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path
                  d="M6 6l12 12M18 6l-12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {isIOS ? (
            <div className="mt-5 rounded-2xl border border-gray-300 bg-white/70 p-4 text-sm text-gray-700">
              <div className="font-semibold text-gray-900">On iPhone / iPad (Safari):</div>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>
                  Tap the <span className="font-semibold">Share</span> button
                </li>
                <li>
                  Select <span className="font-semibold">Add to Home Screen</span>
                </li>
                <li>
                  Tap <span className="font-semibold">Add</span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-gray-300 bg-white/70 p-4 text-sm text-gray-700">
              {deferred ? (
                <div>
                  Tap <span className="font-semibold">Install</span> to add it to your Home Screen.
                </div>
              ) : (
                <div>
                  A calm, focused space for daily Qur’an progress.
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            {!isIOS ? (
              <button
                type="button"
                onClick={handleInstall}
                className="h-12 flex-1 rounded-2xl bg-black font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-60"
                disabled={!deferred}
              >
                Install
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleClose}
              className="h-12 flex-1 rounded-2xl border border-gray-300 bg-white/70 font-semibold transition-colors hover:bg-white"
            >
              Not now
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            This message will keep showing until the app is installed.
          </div>
        </div>
      </div>
    </div>
  );
}

/* Icons */
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6l-12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 transition-transform duration-300 ${open ? "rotate-180" : "rotate-0"}`}
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

function DotArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.5 12h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="w-full rounded-2xl border border-gray-300 bg-white/70 px-6 py-5 text-left shadow-sm backdrop-blur transition-shadow hover:shadow-md"
      aria-expanded={open}
    >
      <div className="flex items-center justify-between gap-6">
        <h4 className="text-lg font-semibold text-gray-900">{question}</h4>
        <span className="flex items-center gap-3 text-[#B8963D]">
          <span className="hidden text-sm font-medium sm:inline">{open ? "Close" : "Open"}</span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#B8963D]/10 text-[#B8963D]">
            <ChevronIcon open={open} />
          </span>
        </span>
      </div>

      <div
        className={`grid transition-all duration-300 ${
          open ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="leading-relaxed text-gray-700">{answer}</p>
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
    <div className="group relative overflow-hidden rounded-3xl border border-gray-300 bg-white/70 p-8 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#B8963D]/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white shadow-sm">
          {icon}
        </div>
        <div>
          <h4 className="mb-2 text-2xl font-semibold">{title}</h4>
          <p className="leading-relaxed text-gray-700">{text}</p>
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  href,
  label,
  sub,
  onClick,
  variant = "default",
}: {
  href: string;
  label: string;
  sub?: string;
  onClick: () => void;
  variant?: "default" | "primary";
}) {
  const base =
    "group relative overflow-hidden rounded-2xl border px-4 py-4 text-sm font-semibold transition-all duration-300";
  const primary =
    "border-black bg-[#111111] text-white shadow-lg shadow-black/10 hover:bg-[#1c1c1c]";
  const normal = "border-gray-300 bg-white/70 text-gray-900 shadow-sm hover:bg-white";

  return (
    <Link href={href} onClick={onClick} className={`${base} ${variant === "primary" ? primary : normal}`}>
      <div
        className={`pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${
          variant === "primary" ? "bg-white/15" : "bg-[#B8963D]/14"
        }`}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-base leading-tight">{label}</div>
          {sub ? (
            <div
              className={`mt-1 text-xs font-medium ${
                variant === "primary" ? "text-white/70" : "text-gray-600"
              }`}
            >
              {sub}
            </div>
          ) : null}
        </div>

        <div
          className={`grid h-10 w-10 place-items-center rounded-full transition-all duration-300 group-hover:scale-[1.04] ${
            variant === "primary" ? "bg-white/10 text-white" : "bg-[#B8963D]/10 text-[#B8963D]"
          }`}
        >
          <DotArrowIcon />
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuState, setMenuState] = useState<"open" | "closed">("closed");

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

  const footerLinks = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: "About", href: "#about" },
      { label: "FAQ", href: "#faq" },
      { label: "Login", href: "/login" },
      { label: "Create Madrassah", href: "/signup" },
      { label: "Join as Teacher", href: "/join" },
    ],
    []
  );

  function closeMenu() {
    setMenuState("closed");
    setTimeout(() => setMobileOpen(false), 650);
  }

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F6F1] px-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main id="top" className="min-h-screen bg-transparent text-gray-900">
      <InstallAppPrompt />

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#F8F6F1]" />
        <div className="absolute -right-40 -top-72 h-[900px] w-[900px] rounded-full bg-[#1F3F3F]/25 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-15%] h-[1000px] w-[1000px] rounded-full bg-[#B8963D]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_70%_20%,rgba(184,150,61,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_10%,transparent_50%,rgba(0,0,0,0.08))]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply bg-[url('/noise.png')]" />
      </div>

      {/* NAVBAR */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7 sm:px-10">
        <div className="flex items-center gap-4">
          <div className="grid h-[80px] w-[85px] place-items-center rounded-xl border border-gray-300 bg-white/100 shadow-sm backdrop-blur">
            <Image src="/logo4.png" alt="Hifdh Journal" width={58} height={58} className="rounded" priority />
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/join"
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-gray-900 transition-colors hover:bg-white/70 backdrop-blur-xl"
          >
            Join as Teacher
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium text-gray-900 transition-colors hover:bg-white/70 backdrop-blur-xl"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white shadow-sm hover:bg-gray-900"
          >
            Create Madrassah
          </Link>
        </div>

        <button
          type="button"
          onClick={() => {
            setMobileOpen(true);
            requestAnimationFrame(() => setMenuState("open"));
          }}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white/70 shadow-sm transition-colors hover:bg-white lg:hidden"
          aria-label="Open menu"
        >
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-black/5" />
          <MenuIcon />
        </button>
      </header>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50">
          <div
            onClick={closeMenu}
            className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-[650ms] ease-out ${
              menuState === "open" ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            className={`absolute right-0 top-0 h-full w-[92%] max-w-sm border-l border-white/40 bg-white/75 shadow-2xl backdrop-blur-2xl transition-transform duration-[650ms] ease-[cubic-bezier(.16,1,.3,1)] ${
              menuState === "open" ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#B8963D]/18 blur-3xl" />
              <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#2f6f6f]/12 blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_70%_10%,rgba(156,124,56,0.14),transparent_55%)]" />
            </div>

            <div className="relative flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-[80px] w-[85px] place-items-center rounded-xl border border-gray-300 bg-white/100 shadow-sm backdrop-blur">
                    <Image src="/logo4.png" alt="Hifdh Journal" width={58} height={58} className="rounded" priority />
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">The Hifdh Journal</div>
                    <div className="text-xs text-gray-700">Menu</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeMenu}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white/70 shadow-sm transition-colors hover:bg-white"
                  aria-label="Close menu"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-black/5" />
                  <CloseIcon />
                </button>
              </div>

              <div className="mt-6 rounded-3xl border border-gray-300 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl">
                <div className="text-xs uppercase tracking-widest text-[#B8963D]">Status</div>
                <div className="text-sm font-semibold text-gray-900">Guest</div>
              </div>

              <div className="mt-6 grid gap-3">
                <MenuRow href="/" label="Home" sub="Back to the main page" onClick={closeMenu} />
                <MenuRow href="#about" label="About" sub="About the system" onClick={closeMenu} />
                <MenuRow href="#faq" label="FAQ" sub="Common questions" onClick={closeMenu} />
                <div className="my-1 h-px bg-gray-200/80" />
                <MenuRow href="/login" label="Sign In" sub="Continue your journey" onClick={closeMenu} />
                <MenuRow href="/join" label="Join as Teacher" sub="Join your madrassah" onClick={closeMenu} />
                <MenuRow
                  href="/signup"
                  label="Create Madrassah"
                  sub="Start your madrassah profile"
                  onClick={closeMenu}
                  variant="primary"
                />
              </div>

              <div className="mt-auto pt-6">
                <div className="rounded-3xl border border-gray-300 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl">
                  <div className="text-xs uppercase tracking-widest text-[#B8963D]">Quick tip</div>
                  <div className="mt-1 text-sm text-gray-700">Add this site to your home screen.</div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                  <span>© {new Date().getFullYear()} Hifdh Journal</span>
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="rounded-full border border-gray-300 bg-white/70 px-3 py-1.5 transition-colors hover:bg-white backdrop-blur-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10 sm:px-10">
        <div className="grid items-stretch gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
<div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/70 px-4 py-2 text-sm backdrop-blur-xl lg:mx-0">              <span className="h-2 w-2 rounded-full bg-[#B8963D]" />
              <span className="text-gray-800">The Hifdh Journal</span>
            </div>

<h1 className="mt-6 text-center text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-left">              Preserve the Qur’an.
              <br />
              <span className="text-[#1F3F3F]">Elevate the Heart.</span>
            </h1>

<p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-gray-800 sm:text-xl lg:mx-0 lg:text-left">              Welcome to the Hifdh Journal — a journey of memorisation, discipline,
              and spiritual growth. Track your daily Sabak, Dhor, Sabak Dhor and weekly goals — all
              in one place.
            </p>

<div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-base font-medium text-white shadow-sm hover:bg-gray-900"
              >
                Create Madrassah
              </Link>
              <Link
                href="/join"
                className="inline-flex h-12 items-center justify-center rounded-full border border-gray-300 bg-white/40 px-8 text-base font-medium backdrop-blur transition-colors hover:bg-white/70"
              >
                Join as Teacher
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-gray-300 bg-white/40 px-8 text-base font-medium backdrop-blur transition-colors hover:bg-white/70"
              >
                Sign In
              </Link>
            </div>

<div className="mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3 items-stretch">              {[
                {
                  k: "Sabak",
                  v: "Daily memorisation",
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
                  k: "Dhor",
                  v: "Strong retention",
                  icon: (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  ),
                },
                {
                  k: "Targets",
                  v: "Weekly clarity",
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
                  className="group relative flex h-[88px] items-center overflow-hidden rounded-3xl border border-gray-300 bg-white/70 px-5 py-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#B8963D] via-[#B8963D]/60 to-transparent" />
                  <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#B8963D]/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />

<div className="flex items-center justify-center gap-3 text-center sm:text-left">                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black text-white shadow-sm">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-sm text-gray-700">{item.k}</div>
                      <div className="mt-0.5 font-semibold text-gray-900">{item.v}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:col-span-5">
            <div className="rounded-3xl border border-gray-300 bg-gradient-to-br from-white/80 to-white/40 p-8 shadow-lg backdrop-blur">
              <p className="text-xl italic leading-relaxed">
                “And We have certainly made the Qur’an easy for remembrance, so is there any who
                will remember?”
              </p>
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-gray-600">Surah Al-Qamar • 54:17</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-gray-300 bg-black p-8 text-white shadow-xl">
              <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#B8963D]/25 blur-2xl" />
              <h3 className="mt-1 text-2xl font-semibold">Preview: Student Dashboard</h3>
              <p className="mt-3 leading-relaxed text-white/70">
                Secure login. Daily submissions. Weekly goals. A calm system designed for focus —
                not distraction.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {["Sabak", "Sabak Dhor", "Dhor", "Weekly Goal"].map((t) => (
                  <div key={t} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                    <div className="text-sm text-white/80">{t}</div>
                    <div className="mt-1 text-sm font-semibold">—</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <div className="rounded-3xl border border-gray-300 bg-white/70 p-10 shadow-sm backdrop-blur-xl">
              <p className="mb-3 text-center text-sm uppercase tracking-widest text-[#B8963D] md:text-left">About the Hifdh Journal</p>

              <h2 className="text-center text-4xl font-semibold tracking-tight md:text-left">  
                            Clarity, Consistency, and Accountability in Hifdh
                          </h2>

                          <div className="mt-6 grid gap-8 md:grid-cols-2">
              <p className="text-center text-lg leading-relaxed text-gray-800 md:text-left">
                  A structured and organised platform designed to track and manage Hifdh progress with
                clarity and consistency.
                <br />
                <br />
                Through focused Sabak tracking, Dhor monitoring, weekly targets, and personalised
                notes, the system ensures steady memorisation progress while promoting discipline and
                accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-12 pb-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="text-center md:text-left">
            <p className="text-sm uppercase tracking-widest text-[#5E4A1D]">Program Highlights</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight">
                Designed for Consistency & Excellence
              </h2>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              title="Structured Memorisation"
              text="Daily Sabak and guided Dhor routines help students progress steadily with strong retention."
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
              title="Weekly Accountability"
              text="Clear weekly targets make progress measurable and keep students motivated and consistent."
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
              title="Progress System"
              text="The Ustadh logs in and submits the student's Sabak, Dhor, sabak dhor and weekly goal progress."
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                  <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 20a8 8 0 0116 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
            <p className="text-sm uppercase tracking-widest text-[#5E4A1D]">Questions & Answers</p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="grid gap-4">
            <FAQItem
              question="What makes this system more effective than simple tracking?"
              answer="Unlike basic record-keeping, this system combines progress tracking, structured targets, and performance notes in one place — creating a complete overview that supports both discipline and steady improvement."
            />
            <FAQItem
              question="Does it replace manual record-keeping?"
              answer="Yes. Instead of using notebooks, everything is organised and securely stored in one structured digital system."
            />
            <FAQItem
              question="How does the system support long-term Hifdh goals?"
              answer="By combining daily tracking, revision monitoring, and structured targets, the system encourages steady progress and long-term memorisation retention."
            />
            <FAQItem
              question="How will this system improve memorisation consistency?"
              answer="The system creates clear daily and weekly structure through Sabak and Dhor tracking, helping maintain discipline and preventing gaps in revision."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="relative overflow-hidden rounded-3xl border border-gray-300 bg-gradient-to-br from-white/70 to-white/40 p-10 shadow-lg backdrop-blur">
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#B8963D]/15 blur-3xl" />
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

            <div className="relative grid items-center gap-10 md:grid-cols-12">
            <div className="text-center md:col-span-8 md:text-left">                <p className="text-sm uppercase tracking-widest text-[#B8963D]">Ready to begin?</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-tight">
                  Enrol and start tracking your Hifdh journey today
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-gray-800">
                  A focused system for daily Sabak, consistent Dhor, and weekly targets — built for
                  clarity, discipline, and steady progress.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 md:col-span-4 md:justify-end">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-black px-7 text-base font-medium text-white shadow-sm hover:bg-gray-900"
                >
                  Create Madrassah
                </Link>
                <Link
                  href="/join"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-gray-300 bg-white/50 px-7 text-base font-medium backdrop-blur transition-colors hover:bg-white/80"
                >
                  Join as Teacher
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-gray-300 bg-white/50 px-7 text-base font-medium backdrop-blur transition-colors hover:bg-white/80"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-300 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-14 sm:px-10">
          <div className="grid items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="flex items-center justify-center gap-4 text-center lg:justify-start lg:text-left">
                <div className="grid h-[80px] w-[85px] place-items-center rounded-xl border border-gray-300 bg-white/100 shadow-sm backdrop-blur">
                  <Image src="/logo4.png" alt="Hifdh Journal" width={58} height={58} className="rounded" priority />
                </div>
                <div>
                  <div className="text-lg font-semibold">The Hifdh Journal</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <div className="grid grid-cols-2 gap-8 text-center sm:grid-cols-3 lg:text-left">
                <div>
                  <div className="mb-4 text-sm font-semibold text-gray-900">Explore</div>
                  <div className="space-y-3">
                    <a href="/" className="block text-sm text-gray-700 hover:text-black">
                      Home
                    </a>
                    <a href="#about" className="block text-sm text-gray-700 hover:text-black">
                      About
                    </a>
                    <a href="#faq" className="block text-sm text-gray-700 hover:text-black">
                      FAQ
                    </a>
                  </div>
                </div>

                <div>
                  <div className="mb-4 text-sm font-semibold text-gray-900">Portal</div>
                  <div className="space-y-3">
                    <a href="/login" className="block text-sm text-gray-700 hover:text-black">
                      Sign In
                    </a>
                    <a href="/join" className="block text-sm text-gray-700 hover:text-black">
                      Join as Teacher
                    </a>
                    <a href="/signup" className="block text-sm text-gray-700 hover:text-black">
                      Create Madrassah
                    </a>
                  </div>
                </div>

                <div>
                  <div className="mb-4 text-sm font-semibold text-gray-900">Program</div>
                  <div className="space-y-3">
                    <a href="#about" className="block text-sm text-gray-700 hover:text-black">
                      Structure
                    </a>
                    <a href="/signup" className="block text-sm text-gray-700 hover:text-black">
                      Enrolment
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-10 rounded-3xl border border-gray-300 bg-gradient-to-br from-white/70 to-white/40 p-6 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                  <div>
                    <div className="text-sm uppercase tracking-widest text-[#B8963D]">Student Portal</div>
                    <div className="mt-1 text-lg font-semibold">Ready to begin your journey?</div>
                    <div className="mt-1 text-sm text-gray-700">
                      Sign up and start tracking daily progress.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="/signup"
                      className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white hover:bg-gray-900"
                    >
                      Create Madrassah
                    </a>
                    <a
                      href="/join"
                      className="inline-flex h-11 items-center justify-center rounded-full border border-gray-300 bg-white/70 px-6 text-sm font-medium transition-colors hover:bg-white"
                    >
                      Join as Teacher
                    </a>
                    <a
                      href="/login"
                      className="inline-flex h-11 items-center justify-center rounded-full border border-gray-300 bg-white/70 px-6 text-sm font-medium transition-colors hover:bg-white"
                    >
                      Sign In
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="my-10 h-px bg-gray-200" />

<div className="flex flex-col items-center justify-between gap-4 text-center text-sm text-gray-600 sm:flex-row sm:text-left">            <div className="flex items-center gap-4">
              <a href="#top" className="hover:text-black">
                Back to top ↑
              </a>
              <span className="text-gray-300">|</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
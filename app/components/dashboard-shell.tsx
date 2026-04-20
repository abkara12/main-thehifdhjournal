"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Students", href: "/dashboard/students" },
  { label: "Reports", href: "/dashboard/reports" },
  { label: "Settings", href: "/dashboard/settings" },
  { label: "Teachers", href: "/dashboard/teachers" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DashboardShell({
  title,
  subtitle,
  eyebrow,
  rightSlot,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,#050505_0%,#0b0b0b_45%,#050505_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <div className="sticky top-4 z-30 mb-6">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/40 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">
                  The Hifdh Journal
                </p>
                <h1 className="mt-2 bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_42%,#ffffff_100%)] bg-clip-text text-2xl font-semibold tracking-[-0.04em] text-transparent sm:text-3xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/60">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {rightSlot ? (
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                  {rightSlot}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 px-3 py-3">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      active
                        ? "border-[#d8b67e]/30 bg-[linear-gradient(135deg,rgba(251,244,232,0.18),rgba(216,182,126,0.22),rgba(255,255,255,0.08))] text-white shadow-[0_10px_30px_rgba(216,182,126,0.12)]"
                        : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.08] hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <section className="mb-6">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
            {eyebrow ? (
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                {eyebrow}
              </p>
            ) : null}
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PremiumStatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
        {value}
      </p>
      {subtext ? (
        <p className="mt-2 text-sm leading-6 text-white/58">{subtext}</p>
      ) : null}
    </div>
  );
}

export function PremiumActionCard({
  title,
  text,
  href,
}: {
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:bg-white/[0.08]"
    >
      <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-white/60">{text}</p>
      <p className="mt-5 text-sm font-medium text-[#e7cf9c] transition group-hover:translate-x-1">
        Open →
      </p>
    </Link>
  );
}

export function PremiumBadge({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="rounded-full border border-[#d8b67e]/20 bg-[linear-gradient(135deg,rgba(251,244,232,0.12),rgba(216,182,126,0.14),rgba(255,255,255,0.03))] px-4 py-2 text-xs font-medium text-[#f3e5c5]">
      {children}
    </span>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { getUserProfileByUid } from "../lib/current-user";

type NavItem = {
  label: string;
  href: string;
};

type StaffRole = "admin" | "teacher" | "super_admin" | "";

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Students", href: "/dashboard/students" },
  { label: "Reports", href: "/dashboard/reports" },
  { label: "Settings", href: "/dashboard/settings" },
  { label: "Teachers", href: "/dashboard/teachers" },
];

const TEACHER_NAV_ITEMS: NavItem[] = [
  { label: "Students", href: "/dashboard/students" },
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
  const [role, setRole] = useState<StaffRole>("");
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole("");
        setRoleLoading(false);
        return;
      }

      try {
        const profile = await getUserProfileByUid(user.uid);
        const nextRole =
          profile?.role === "admin" ||
          profile?.role === "teacher" ||
          profile?.role === "super_admin"
            ? profile.role
            : "";
        setRole(nextRole);
      } catch {
        setRole("");
      } finally {
        setRoleLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const navItems = useMemo(() => {
    if (role === "teacher") return TEACHER_NAV_ITEMS;
    return ADMIN_NAV_ITEMS;
  }, [role]);

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

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="overflow-hidden rounded-[28px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.62))] shadow-[0_18px_60px_rgba(0,0,0,0.08)] backdrop-blur-2xl">
            <div className="flex flex-col gap-4 border-b border-gray-300 px-4 py-4 sm:px-5 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#8d7440]">
                  The Hifdh Journal
                </p>

                <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.04em] text-[#171717] sm:text-[2rem]">
                  {title}
                </h1>

                {subtitle && (
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#5f5f5f]">
                    {subtitle}
                  </p>
                )}
              </div>

              {rightSlot && (
                <div className="w-full lg:w-auto lg:max-w-[360px]">
                  {rightSlot}
                </div>
              )}
            </div>

            <div className="px-3 py-3 sm:px-4">
              <div className="flex flex-wrap gap-2">
                {!roleLoading &&
                  navItems.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cx(
                          "rounded-full border px-4 py-2.5 text-sm font-medium transition",
                          active
                            ? "border-[#B8963D]/25 bg-black text-white shadow-[0_10px_30px_rgba(0,0,0,0.12)]"
                            : "border-gray-300 bg-white/72 text-[#5e5e5e] hover:bg-white hover:text-[#171717]"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        <section className="mb-6">
          <div className="rounded-[32px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.58))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-8">
            {eyebrow && (
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#8d7440]">
                {eyebrow}
              </p>
            )}
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
    <div className="rounded-[28px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#8d7440]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#171717]">
        {value}
      </p>
      {subtext && (
        <p className="mt-2 text-sm leading-6 text-[#5f5f5f]">{subtext}</p>
      )}
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
      className="group rounded-[28px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.56))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition hover:-translate-y-[1px] hover:bg-white/90"
    >
      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-7 text-[#5f5f5f]">{text}</p>
      <p className="mt-5 text-sm font-medium text-[#8d7440] transition group-hover:translate-x-1">
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
    <span className="inline-flex rounded-full border border-[#B8963D]/25 bg-[#B8963D]/10 px-4 py-2 text-xs font-medium text-[#7b6128]">
      {children}
    </span>
  );
}
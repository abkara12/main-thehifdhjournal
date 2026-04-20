"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../app/lib/firebase";
import { useRequireAdmin } from "../../lib/auth-guards";
import {
  DashboardShell,
  PremiumBadge,
  PremiumStatCard,
} from "../../components/dashboard-shell";

type MadrassahDoc = {
  name: string;
  slug: string;
  isActive: boolean;
  createdBy?: string;
  adminUserId?: string;
};

type ConfigDoc = {
  joinCode: string;
  reportAccessKey: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function InfoCard({
  label,
  value,
  subtext,
  mono = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7440]">{label}</p>
      <p
        className={`mt-3 font-medium text-[#171717] ${
          mono ? "break-all font-mono text-sm" : "text-lg"
        }`}
      >
        {value || "—"}
      </p>
      {subtext ? <p className="mt-2 text-sm text-[#5f5f5f]">{subtext}</p> : null}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[30px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-6">
      <h2 className="break-words text-xl font-semibold tracking-[-0.03em] text-[#171717]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-2 break-words text-sm leading-7 text-[#5f5f5f]">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-5 min-w-0">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { loading, profile, error } = useRequireAdmin();

  const [madrassah, setMadrassah] = useState<MadrassahDoc | null>(null);
  const [config, setConfig] = useState<ConfigDoc | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [pageError, setPageError] = useState("");

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadSettings() {
      if (!profile?.madrassahId) {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      setPageError("");
      setMsg("");

      try {
        const madrassahRef = doc(db, "madrassahs", profile.madrassahId);
        const configRef = doc(db, "madrassahs", profile.madrassahId, "private", "config");

        const [madrassahSnap, configSnap] = await Promise.all([
          getDoc(madrassahRef),
          getDoc(configRef),
        ]);

        if (!madrassahSnap.exists()) {
          setPageError("Madrassah record not found.");
          setMadrassah(null);
          setConfig(null);
          return;
        }

        const madrassahData = madrassahSnap.data() as any;
        const configData = configSnap.exists() ? (configSnap.data() as any) : null;

        const nextMadrassah: MadrassahDoc = {
          name: String(madrassahData.name || ""),
          slug: String(madrassahData.slug || ""),
          isActive: madrassahData.isActive !== false,
          createdBy: String(madrassahData.createdBy || ""),
          adminUserId: String(madrassahData.adminUserId || ""),
        };

        const nextConfig: ConfigDoc | null = configData
          ? {
              joinCode: String(configData.joinCode || ""),
              reportAccessKey: String(configData.reportAccessKey || ""),
            }
          : null;

        setMadrassah(nextMadrassah);
        setConfig(nextConfig);
        setName(nextMadrassah.name);
      } catch (err: any) {
        setPageError(err?.message || "Could not load settings.");
      } finally {
        setLoadingData(false);
      }
    }

    if (!loading && profile) {
      loadSettings();
    }
  }, [loading, profile]);

  const canSave = useMemo(() => {
    return !!profile?.madrassahId && !saving && name.trim().length > 0;
  }, [profile, saving, name]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!profile?.madrassahId) {
      setPageError("Your account is not linked to a madrassah.");
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setPageError("Please enter the madrassah name.");
      return;
    }

    setSaving(true);
    setPageError("");
    setMsg("");

    try {
      await updateDoc(doc(db, "madrassahs", profile.madrassahId), {
        name: cleanName,
        slug: slugify(cleanName),
        updatedAt: serverTimestamp(),
      });

      setMadrassah((prev) =>
        prev
          ? {
              ...prev,
              name: cleanName,
              slug: slugify(cleanName),
            }
          : prev
      );

      setMsg("Settings updated successfully.");
    } catch (err: any) {
      setPageError(err?.message || "Could not update settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#F8F6F1] text-[#171717]">
        Loading...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#F8F6F1] px-6 text-[#171717]">
        <div className="rounded-2xl border border-red-300 bg-red-50 px-6 py-4 text-sm text-red-700">
          {error || "Could not load settings page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title="Madrassah Settings"
      subtitle="Manage the core identity, private configuration, and internal reference details of your madrassah."
      eyebrow="Settings & Configuration"
      rightSlot={
        <div className="flex w-full flex-col gap-3 rounded-[24px] border border-gray-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.60))] p-3 shadow-[0_12px_36px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:p-4 lg:min-w-[250px] lg:max-w-[320px]">
          <div className="flex flex-wrap gap-2">
            <PremiumBadge>{profile.madrassahName || "Madrassah"}</PremiumBadge>
            <PremiumBadge>{profile.role}</PremiumBadge>
          </div>
        </div>
      }
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {pageError}
        </div>
      ) : null}

      {msg ? (
        <div className="mb-6 rounded-2xl border border-gray-300 bg-white/78 p-4 text-sm text-[#4f4f4f] shadow-sm backdrop-blur-xl">
          {msg}
        </div>
      ) : null}

      {loadingData ? (
        <div className="rounded-[28px] border border-gray-300 bg-white/74 p-8 text-center text-[#666666] shadow-sm backdrop-blur-xl">
          Loading settings...
        </div>
      ) : !madrassah ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PremiumStatCard
              label="Madrassah Name"
              value={madrassah.name}
              subtext="Primary display name used across the platform."
            />
            <PremiumStatCard
              label="Status"
              value={madrassah.isActive ? "Active" : "Inactive"}
              subtext="Current madrassah availability state."
            />
            <PremiumStatCard
              label="Join Code"
              value={config?.joinCode || "—"}
              subtext="Used by teachers to join this madrassah."
            />
            <PremiumStatCard
              label="Report Key"
              value={config?.reportAccessKey || "—"}
              subtext="Private reporting configuration reference."
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Slug"
              value={madrassah.slug}
              subtext="System-friendly version of the madrassah name."
              mono
            />
            <InfoCard
              label="Admin User ID"
              value={madrassah.adminUserId || "—"}
              subtext="Main admin linked to this madrassah."
              mono
            />
            <InfoCard
              label="Created By"
              value={madrassah.createdBy || "—"}
              subtext="User that originally created this madrassah."
              mono
            />
            <InfoCard
              label="Madrassah ID"
              value={profile.madrassahId || "—"}
              subtext="Unique platform identifier."
              mono
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard
              title="Update Madrassah Identity"
              subtitle="Refine the display name and keep the branding of this madrassah polished and accurate."
            >
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#5f5f5f]">
                    Madrassah Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter madrassah name"
                    className="w-full rounded-2xl border border-gray-300 bg-white/88 p-4 text-[#171717] outline-none placeholder:text-[#8a8a8a] transition focus:border-[#B8963D] focus:bg-white"
                  />
                </div>

                <div className="rounded-2xl border border-gray-300 bg-white/82 p-4 text-sm text-[#5f5f5f]">
                  The slug will automatically update when you save this new name.
                </div>

                <button
                  type="submit"
                  disabled={!canSave}
                  className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#1d1d1d] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </SectionCard>

            <SectionCard
              title="Access & Internal Details"
              subtitle="Quick operational context for admins managing this madrassah."
            >
              <div className="grid gap-4">
                <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
                  <p className="text-sm text-[#7a7a7a]">Your Role</p>
                  <p className="mt-2 font-medium text-[#171717]">{profile.role}</p>
                </div>

                <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
                  <p className="text-sm text-[#7a7a7a]">Madrassah Status</p>
                  <p className="mt-2 font-medium text-[#171717]">
                    {madrassah.isActive ? "Active" : "Inactive"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
                  <p className="text-sm text-[#7a7a7a]">Join Code</p>
                  <p className="mt-2 break-all font-mono text-sm text-[#171717]">
                    {config?.joinCode || "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-300 bg-white/82 p-4">
                  <p className="text-sm text-[#7a7a7a]">Report Access Key</p>
                  <p className="mt-2 break-all font-mono text-sm text-[#171717]">
                    {config?.reportAccessKey || "—"}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
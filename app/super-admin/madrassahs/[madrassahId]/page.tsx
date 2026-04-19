"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../../../app/lib/firebase";
import { useRequireSuperAdmin } from "../../../lib/auth-guards";
import { DashboardShell, PremiumBadge, PremiumStatCard } from "../../../components/dashboard-shell";

type MadrassahControlDoc = {
  name: string;
  slug: string;
  isActive: boolean;
  subscriptionStatus: string;
  onboardingStatus: string;
  plan: string;
  trialEndsOn: string;
  nextPaymentDate: string;
  notes: string;
  billingAmount: string;
  billingCurrency: string;
  billingCycle: string;
  paymentStatus: string;
  lastPaymentDate: string;
  paymentMethod: string;
  billingNotes: string;
  createdBy?: string;
  adminUserId?: string;
};

const SUBSCRIPTION_OPTIONS = ["trial", "active", "overdue", "paused"];
const ONBOARDING_OPTIONS = ["pending", "live"];
const PLAN_OPTIONS = ["starter", "growth", "premium"];
const BILLING_CYCLE_OPTIONS = ["monthly", "quarterly", "yearly"];
const PAYMENT_STATUS_OPTIONS = ["unpaid", "paid", "overdue", "partial"];
const PAYMENT_METHOD_OPTIONS = ["eft", "cash", "payfast", "other"];

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
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm leading-7 text-white/58">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-black/10 p-4">
      <p className="text-sm text-white/45">{label}</p>
      <p className={`mt-2 font-medium text-white ${mono ? "break-all font-mono text-sm" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

export default function SuperAdminMadrassahControlPage() {
  const params = useParams<{ madrassahId: string }>();
  const madrassahId = params?.madrassahId || "";
  const { loading, profile, error } = useRequireSuperAdmin();

  const [docData, setDocData] = useState<MadrassahControlDoc | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);

  const [name, setName] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("trial");
  const [onboardingStatus, setOnboardingStatus] = useState("pending");
  const [plan, setPlan] = useState("starter");
  const [trialEndsOn, setTrialEndsOn] = useState("");
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [billingAmount, setBillingAmount] = useState("");
  const [billingCurrency, setBillingCurrency] = useState("ZAR");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [lastPaymentDate, setLastPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("eft");
  const [billingNotes, setBillingNotes] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [pageError, setPageError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleGeneratePaymentLink() {
    try {
      const res = await fetch("/api/payments/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: billingAmount,
          madrassahName: docData?.name || name,
          email: "",
          returnUrl: window.location.origin + "/payment-success",
          cancelUrl: window.location.origin + "/payment-cancel",
          notifyUrl: window.location.origin + "/api/payments/webhook",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create link.");
      window.open(data.url, "_blank");
    } catch (err: any) {
      setPageError(err?.message || "Could not generate payment link.");
    }
  }

  useEffect(() => {
    async function loadPage() {
      if (!madrassahId) {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      setPageError("");
      setMsg("");

      try {
        const madrassahRef = doc(db, "madrassahs", madrassahId);
        const configRef = doc(db, "madrassahs", madrassahId, "private", "config");

        const [madrassahSnap, configSnap, studentsSnap, staffSnap] = await Promise.all([
          getDoc(madrassahRef),
          getDoc(configRef),
          getDocs(collection(db, "madrassahs", madrassahId, "students")),
          getDocs(collection(db, "madrassahs", madrassahId, "staff")),
        ]);

        if (!madrassahSnap.exists()) {
          setPageError("Madrassah not found.");
          setDocData(null);
          return;
        }

        const data = madrassahSnap.data() as any;
        const next: MadrassahControlDoc = {
          name: String(data.name || ""),
          slug: String(data.slug || ""),
          isActive: data.isActive !== false,
          subscriptionStatus: String(data.subscriptionStatus || "trial"),
          onboardingStatus: String(data.onboardingStatus || "pending"),
          plan: String(data.plan || "starter"),
          trialEndsOn: String(data.trialEndsOn || ""),
          nextPaymentDate: String(data.nextPaymentDate || ""),
          notes: String(data.notes || ""),
          billingAmount: String(data.billingAmount || ""),
          billingCurrency: String(data.billingCurrency || "ZAR"),
          billingCycle: String(data.billingCycle || "monthly"),
          paymentStatus: String(data.paymentStatus || "unpaid"),
          lastPaymentDate: String(data.lastPaymentDate || ""),
          paymentMethod: String(data.paymentMethod || "eft"),
          billingNotes: String(data.billingNotes || ""),
          createdBy: String(data.createdBy || ""),
          adminUserId: String(data.adminUserId || ""),
        };

        setDocData(next);
        setJoinCode(configSnap.exists() ? String((configSnap.data() as any).joinCode || "") : "");
        setStudentCount(studentsSnap.size);
        setStaffCount(staffSnap.size);

        setName(next.name);
        setSubscriptionStatus(next.subscriptionStatus);
        setOnboardingStatus(next.onboardingStatus);
        setPlan(next.plan);
        setTrialEndsOn(next.trialEndsOn);
        setNextPaymentDate(next.nextPaymentDate);
        setNotes(next.notes);
        setIsActive(next.isActive);

        setBillingAmount(next.billingAmount);
        setBillingCurrency(next.billingCurrency);
        setBillingCycle(next.billingCycle);
        setPaymentStatus(next.paymentStatus);
        setLastPaymentDate(next.lastPaymentDate);
        setPaymentMethod(next.paymentMethod);
        setBillingNotes(next.billingNotes);
      } catch (err: any) {
        setPageError(err?.message || "Could not load madrassah control page.");
      } finally {
        setLoadingData(false);
      }
    }

    if (!loading && profile) loadPage();
  }, [loading, profile, madrassahId]);

  const canSave = useMemo(() => !saving && madrassahId.length > 0 && name.trim().length > 0, [
    saving,
    madrassahId,
    name,
  ]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!madrassahId || !name.trim()) return;

    setSaving(true);
    setPageError("");
    setMsg("");

    try {
      await updateDoc(doc(db, "madrassahs", madrassahId), {
        name: name.trim(),
        subscriptionStatus,
        onboardingStatus,
        plan,
        trialEndsOn: trialEndsOn.trim(),
        nextPaymentDate: nextPaymentDate.trim(),
        notes: notes.trim(),
        isActive,
        billingAmount: billingAmount.trim(),
        billingCurrency: billingCurrency.trim(),
        billingCycle,
        paymentStatus,
        lastPaymentDate: lastPaymentDate.trim(),
        paymentMethod,
        billingNotes: billingNotes.trim(),
        updatedAt: serverTimestamp(),
      });

      setDocData((prev) =>
        prev
          ? {
              ...prev,
              name: name.trim(),
              subscriptionStatus,
              onboardingStatus,
              plan,
              trialEndsOn: trialEndsOn.trim(),
              nextPaymentDate: nextPaymentDate.trim(),
              notes: notes.trim(),
              isActive,
              billingAmount: billingAmount.trim(),
              billingCurrency: billingCurrency.trim(),
              billingCycle,
              paymentStatus,
              lastPaymentDate: lastPaymentDate.trim(),
              paymentMethod,
              billingNotes: billingNotes.trim(),
            }
          : prev
      );

      setMsg("Madrassah control settings updated successfully.");
    } catch (err: any) {
      setPageError(err?.message || "Could not update madrassah.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-black text-white">Loading...</main>;
  }

  if (!profile) {
    return (
      <main className="min-h-screen grid place-items-center bg-black px-6 text-white">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-200">
          {error || "Could not load control page."}
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title={docData?.name || "Madrassah Control"}
      subtitle="Manage billing state, onboarding state, activation, and internal operational notes for this madrassah."
      eyebrow="Super Admin • Control Page"
      rightSlot={
        <>
          <PremiumBadge>{joinCode || "No Join Code"}</PremiumBadge>
          <PremiumBadge>{subscriptionStatus}</PremiumBadge>
          <PremiumBadge>{paymentStatus}</PremiumBadge>
        </>
      }
    >
      {pageError ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {pageError}
        </div>
      ) : null}

      {msg ? (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/80">
          {msg}
        </div>
      ) : null}

      {loadingData ? (
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
          Loading madrassah details...
        </div>
      ) : !docData ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PremiumStatCard label="Students" value={String(studentCount)} subtext="Student records in this madrassah." />
            <PremiumStatCard label="Staff" value={String(staffCount)} subtext="Admins and teachers linked here." />
            <PremiumStatCard label="Billing Amount" value={docData.billingAmount || "—"} subtext={docData.billingCurrency || "Currency not set"} />
            <PremiumStatCard label="Last Payment" value={docData.lastPaymentDate || "—"} subtext={`Method: ${docData.paymentMethod || "—"}`} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionCard title="Control Panel" subtitle="Update platform-side status, billing, and operational notes.">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Madrassah Name" className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none" />
                  <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none">
                    {PLAN_OPTIONS.map((option) => <option key={option} value={option} className="bg-neutral-950">{option}</option>)}
                  </select>
                  <select value={subscriptionStatus} onChange={(e) => setSubscriptionStatus(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none">
                    {SUBSCRIPTION_OPTIONS.map((option) => <option key={option} value={option} className="bg-neutral-950">{option}</option>)}
                  </select>
                  <select value={onboardingStatus} onChange={(e) => setOnboardingStatus(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none">
                    {ONBOARDING_OPTIONS.map((option) => <option key={option} value={option} className="bg-neutral-950">{option}</option>)}
                  </select>
                  <input value={trialEndsOn} onChange={(e) => setTrialEndsOn(e.target.value)} placeholder="Trial Ends On (YYYY-MM-DD)" className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none" />
                  <input value={nextPaymentDate} onChange={(e) => setNextPaymentDate(e.target.value)} placeholder="Next Payment Date (YYYY-MM-DD)" className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none" />
                </div>

                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Internal notes about this madrassah..." className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none" />

                <div className="grid gap-4 md:grid-cols-2">
                  <input value={billingAmount} onChange={(e) => setBillingAmount(e.target.value)} placeholder="Billing Amount" className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none" />
                  <input value={billingCurrency} onChange={(e) => setBillingCurrency(e.target.value)} placeholder="Billing Currency" className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none" />
                  <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none">
                    {BILLING_CYCLE_OPTIONS.map((option) => <option key={option} value={option} className="bg-neutral-950">{option}</option>)}
                  </select>
                  <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none">
                    {PAYMENT_STATUS_OPTIONS.map((option) => <option key={option} value={option} className="bg-neutral-950">{option}</option>)}
                  </select>
                  <input value={lastPaymentDate} onChange={(e) => setLastPaymentDate(e.target.value)} placeholder="Last Payment Date (YYYY-MM-DD)" className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none" />
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none">
                    {PAYMENT_METHOD_OPTIONS.map((option) => <option key={option} value={option} className="bg-neutral-950">{option}</option>)}
                  </select>
                </div>

                <textarea value={billingNotes} onChange={(e) => setBillingNotes(e.target.value)} rows={4} placeholder="Billing notes, promises, payment follow-up, etc..." className="w-full rounded-2xl border border-white/10 bg-black/10 p-4 text-white outline-none" />

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleGeneratePaymentLink} className="rounded-full border border-green-500/20 bg-green-500/10 px-5 py-3 text-sm font-medium text-green-200">
                    Generate Payment Link
                  </button>

                  <label className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/75">
                    <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    Madrassah is active
                  </label>

                  <button
                    type="submit"
                    disabled={!canSave}
                    className="rounded-full bg-[linear-gradient(135deg,#fbf4e8_0%,#d8b67e_45%,#ffffff_100%)] px-6 py-3 text-sm font-semibold text-black disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Control Changes"}
                  </button>
                </div>
              </form>
            </SectionCard>

            <SectionCard title="Internal Reference" subtitle="Quick context for platform-level decisions.">
              <div className="grid gap-4">
                <InfoCard label="Madrassah ID" value={madrassahId} mono />
                <InfoCard label="Slug" value={docData.slug} mono />
                <InfoCard label="Join Code" value={joinCode} mono />
                <InfoCard label="Created By" value={docData.createdBy || "—"} mono />
                <InfoCard label="Admin UID" value={docData.adminUserId || "—"} mono />
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
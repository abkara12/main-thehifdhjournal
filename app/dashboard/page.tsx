"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useRequireAdmin } from "../lib/auth-guards";
import {
  DashboardShell,
  PremiumBadge,
  PremiumStatCard,
} from "../components/dashboard-shell";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";

type StaffRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  role: "admin" | "teacher";
  isActive: boolean;
};

/* ---------------- SIGN OUT ---------------- */

async function handleSignOut() {
  await signOut(auth);
  window.location.href = "/login";
}

/* ---------------- COPY ---------------- */

async function copyTextToClipboard(text: string) {
  if (!text) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    if (typeof document === "undefined") return false;

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    return successful;
  } catch {
    return false;
  }
}

/* ---------------- UI ---------------- */

function RoleBadge({ role }: { role: "admin" | "teacher" }) {
  const styles =
    role === "admin"
      ? "border-[#B8963D]/25 bg-[#B8963D]/10 text-[#7b6128]"
      : "border-gray-300 bg-white/75 text-[#5e5e5e]";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>
      {role === "admin" ? "Admin" : "Teacher"}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const styles = active
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-red-200 bg-red-50 text-red-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${styles}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function TeachersPage() {
  const { loading, profile, error } = useRequireAdmin();

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadPageData(currentMadrassahId: string) {
    setLoadingData(true);
    setPageError("");
    setActionMsg("");

    try {
      const [staffSnap, configSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "madrassahs", currentMadrassahId, "staff"),
            orderBy("fullName")
          )
        ),
        getDoc(doc(db, "madrassahs", currentMadrassahId, "private", "config")),
      ]);

      const rows: StaffRow[] = staffSnap.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          userId: String(data.userId || docSnap.id),
          fullName: String(data.fullName || ""),
          email: String(data.email || ""),
          phone: String(data.phone || ""),
          role: data.role === "admin" ? "admin" : "teacher",
          isActive: data.isActive !== false,
        };
      });

      setStaff(rows);
      setJoinCode(configSnap.exists() ? String((configSnap.data() as any).joinCode || "") : "");
    } catch (err: any) {
      setPageError(err?.message || "Could not load teachers.");
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!loading && profile?.madrassahId) {
      loadPageData(profile.madrassahId);
    }
  }, [loading, profile]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F6F1]">
        Loading...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center">
        {error || "Error"}
      </main>
    );
  }

  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Manage your madrassah"
      rightSlot={
        <div className="flex flex-col gap-3">

          {/* SIGN OUT BUTTON */}
          <button
            onClick={handleSignOut}
            className="rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            Sign Out
          </button>

          {/* JOIN CODE */}
          {joinCode && (
            <button
              onClick={() => copyTextToClipboard(joinCode)}
              className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
            >
              Copy Join Code
            </button>
          )}
        </div>
      }
    >
      <div className="mt-6">
        {staff.map((person) => (
          <div key={person.id} className="mb-4 p-4 border rounded">
            <div className="flex justify-between">
              <div>
                <div>{person.fullName}</div>
                <RoleBadge role={person.role} />
                <StatusBadge active={person.isActive} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
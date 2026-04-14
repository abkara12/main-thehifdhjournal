"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { useRouter } from "next/navigation";

function friendlySignupError(code?: string) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";
    default:
      return "Signup failed. Please try again.";
  }
}

type AccountType = "admin" | "teacher";

function slugifyMadrassahName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function normalizeJoinCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function makeReadableJoinCode(name: string) {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean);
  const joined = words.join("");
  const base = (joined || "MADRASSAH").slice(0, 10);
  const random2 = String(Math.floor(Math.random() * 100)).padStart(2, "0");

  return `${base}-${random2}`;
}

function makeReportAccessKey() {
  const randomA = Math.random().toString(36).slice(2, 8).toUpperCase();
  const randomB = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `REP-${randomA}${randomB}`;
}

async function generateUniqueJoinCode(name: string) {
  for (let i = 0; i < 20; i++) {
    const code = makeReadableJoinCode(name);

    const q = query(
      collection(db, "teacherJoinCodes"),
      where("__name__", "==", code),
      limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) return code;
  }

  throw new Error("Could not generate a unique join code. Please try again.");
}

async function generateUniqueReportAccessKey() {
  for (let i = 0; i < 10; i++) {
    const key = makeReportAccessKey();

    const q = query(
      collection(db, "madrassahs"),
      where("reportAccessKeyMirror", "==", key),
      limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) return key;
  }

  throw new Error("Could not generate a unique report key. Please try again.");
}

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("admin");
  const [madrassahName, setMadrassahName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const joinCodeHint = useMemo(() => {
    const clean = normalizeJoinCode(joinCode);
    return clean || "JOIN-CODE";
  }, [joinCode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanFullName = normalizeName(fullName);
    const cleanPhone = normalizePhone(phone);
    const cleanMadrassahName = normalizeName(madrassahName);
    const cleanJoinCode = normalizeJoinCode(joinCode);

    if (!cleanFullName) {
      setErr("Please enter your full name.");
      return;
    }

    if (!cleanPhone) {
      setErr("Please enter your phone number.");
      return;
    }

    if (!isValidPhone(cleanPhone)) {
      setErr("Please enter a valid phone number.");
      return;
    }

    if (!cleanEmail) {
      setErr("Please enter your email address.");
      return;
    }

    if (!password || password.length < 6) {
      setErr("Please enter a password of at least 6 characters.");
      return;
    }

    if (accountType === "admin" && !cleanMadrassahName) {
      setErr("Please enter the madrassah name.");
      return;
    }

    if (accountType === "teacher" && !cleanJoinCode) {
      setErr("Please enter the madrassah join code.");
      return;
    }

    setLoading(true);

    try {
      if (accountType === "admin") {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const userId = cred.user.uid;

        const madrassahRef = doc(collection(db, "madrassahs"));
        const madrassahId = madrassahRef.id;
        const slug = slugifyMadrassahName(cleanMadrassahName);
        const uniqueJoinCode = await generateUniqueJoinCode(cleanMadrassahName);
        const uniqueReportAccessKey = await generateUniqueReportAccessKey();

        const batch = writeBatch(db);

        batch.set(madrassahRef, {
          name: cleanMadrassahName,
          slug,
          createdBy: userId,
          adminUserId: userId,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          reportAccessKeyMirror: uniqueReportAccessKey,
        });

        batch.set(doc(db, "madrassahs", madrassahId, "private", "config"), {
          joinCode: uniqueJoinCode,
          reportAccessKey: uniqueReportAccessKey,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, "teacherJoinCodes", uniqueJoinCode), {
          madrassahId,
          madrassahName: cleanMadrassahName,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, "users", userId), {
          email: (cred.user.email ?? cleanEmail).toLowerCase(),
          fullName: cleanFullName,
          phone: cleanPhone,
          role: "admin",
          madrassahId,
          madrassahName: cleanMadrassahName,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(doc(db, "madrassahs", madrassahId, "staff", userId), {
          userId,
          fullName: cleanFullName,
          email: (cred.user.email ?? cleanEmail).toLowerCase(),
          phone: cleanPhone,
          role: "admin",
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        await batch.commit();
        router.push("/admin");
        return;
      }

      const joinCodeRef = doc(db, "teacherJoinCodes", cleanJoinCode);
      const joinCodeSnap = await getDoc(joinCodeRef);

      if (!joinCodeSnap.exists()) {
        setErr("That join code is not valid. Please check it and try again.");
        setLoading(false);
        return;
      }

      const joinData = joinCodeSnap.data() as {
        madrassahId?: string;
        madrassahName?: string;
        isActive?: boolean;
      };

      if (joinData.isActive === false || !joinData.madrassahId) {
        setErr("That join code is inactive.");
        setLoading(false);
        return;
      }

      const foundMadrassahId = joinData.madrassahId;
      const foundMadrassahName = joinData.madrassahName?.trim() || "Madrassah";

      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const userId = cred.user.uid;

      const batch = writeBatch(db);

      batch.set(doc(db, "users", userId), {
        email: (cred.user.email ?? cleanEmail).toLowerCase(),
        fullName: cleanFullName,
        phone: cleanPhone,
        role: "teacher",
        madrassahId: foundMadrassahId,
        madrassahName: foundMadrassahName,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, "madrassahs", foundMadrassahId, "staff", userId), {
        userId,
        fullName: cleanFullName,
        email: (cred.user.email ?? cleanEmail).toLowerCase(),
        phone: cleanPhone,
        role: "teacher",
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      router.push("/admin");
    } catch (error: any) {
      setErr(friendlySignupError(error?.code) || error?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-gray-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#F8F6F1]" />
        <div className="absolute -top-72 -right-40 h-[900px] w-[900px] rounded-full bg-[#1F3F3F]/25 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-15%] h-[1000px] w-[1000px] rounded-full bg-[#B8963D]/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_70%_20%,rgba(184,150,61,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_50%_10%,transparent_50%,rgba(0,0,0,0.08))]" />
        <div className="absolute inset-0 opacity-[0.035] mix-blend-multiply bg-[url('/noise.png')]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="h-[80px] w-[85px] rounded-xl bg-white/100 backdrop-blur border border-gray-300 shadow-sm grid place-items-center">
              <Image src="/logo4.png" alt="Hifdh Journal" width={58} height={58} className="rounded" />
            </div>
          </Link>

          <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-black">
            Already have an account? <span className="text-[#B8963D]">Sign In</span>
          </Link>
        </div>

        <div className="mt-10 grid lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur-xl p-8 shadow-lg">
              <p className="uppercase tracking-widest text-xs text-[#B8963D]">Hifdh Journal</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight leading-tight">
                Create your account
              </h1>
              <p className="mt-3 text-gray-700 leading-relaxed">
                Admins can set up their madrassah and teachers can join using the madrassah join code.
              </p>
            </div>

            <div className="mt-6 rounded-3xl bg-black text-white p-7 shadow-xl relative overflow-hidden">
              <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[#B8963D]/25 blur-2xl" />
              <p className="text-white/70 text-sm italic leading-relaxed">
                “And We have certainly made the Qur’an easy for remembrance, so is there any who
                will remember?”
              </p>
              <p className="mt-4 text-white/70 text-sm">Surah Al-Qamar • 54:17</p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-gray-300 bg-white/70 backdrop-blur p-8 shadow-lg">
              <h2 className="text-2xl font-semibold tracking-tight">Sign Up</h2>
              <p className="mt-2 text-sm text-gray-600">
                Create an admin or teacher account.
              </p>

              {err ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {err}
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="mt-6 grid gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-800">Account type</label>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType("admin")}
                      className={`h-12 rounded-2xl border text-sm font-semibold transition-colors ${
                        accountType === "admin"
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white/80 text-gray-800 hover:bg-white"
                      }`}
                    >
                      Admin
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType("teacher")}
                      className={`h-12 rounded-2xl border text-sm font-semibold transition-colors ${
                        accountType === "teacher"
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white/80 text-gray-800 hover:bg-white"
                      }`}
                    >
                      Teacher
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">Full name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    type="text"
                    required
                    placeholder="Your full name"
                    className="mt-2 w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">Phone number</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    required
                    placeholder="Your phone number"
                    className="mt-2 w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="email@example.com"
                    className="mt-2 w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">Password</label>
                  <div className="mt-2 relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      className="w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 pr-20 outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-600 hover:text-black"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {accountType === "admin" ? (
                  <div>
                    <label className="text-sm font-medium text-gray-800">Madrassah name</label>
                    <input
                      value={madrassahName}
                      onChange={(e) => setMadrassahName(e.target.value)}
                      type="text"
                      required
                      placeholder="Enter the madrassah name"
                      className="mt-2 w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 outline-none focus:border-black"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sm font-medium text-gray-800">Join code</label>
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(normalizeJoinCode(e.target.value))}
                      type="text"
                      required
                      placeholder="Enter the madrassah join code"
                      className="mt-2 w-full h-12 rounded-2xl border border-gray-300 bg-white/80 px-4 uppercase outline-none focus:border-black"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Code preview: <span className="font-semibold tracking-wider">{joinCodeHint}</span>
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 h-12 rounded-2xl bg-black text-white font-semibold hover:bg-gray-900 transition-colors disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
import { NextResponse } from "next/server";
import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Firebase environment variables are not set.");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = admin.firestore();
const auth = admin.auth();

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

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
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
    const snap = await db.collection("teacherJoinCodes").doc(code).get();
    if (!snap.exists) return code;
  }

  throw new Error("Could not generate a unique join code.");
}

async function generateUniqueReportAccessKey() {
  for (let i = 0; i < 20; i++) {
    const key = makeReportAccessKey();

    const snap = await db
      .collection("madrassahs")
      .where("reportAccessKeyMirror", "==", key)
      .limit(1)
      .get();

    if (snap.empty) return key;
  }

  throw new Error("Could not generate a unique report access key.");
}

export async function POST(req: Request) {
  let createdUid: string | null = null;

  try {
    const body = await req.json();

    const fullName = normalizeName(body?.fullName || "");
    const madrassahName = normalizeName(body?.madrassahName || "");
    const phone = normalizePhone(body?.phone || "");
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    if (!madrassahName) {
      return NextResponse.json({ error: "Madrassah name is required." }, { status: 400 });
    }

    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
      disabled: false,
    });

    createdUid = userRecord.uid;

    const madrassahRef = db.collection("madrassahs").doc();
    const madrassahId = madrassahRef.id;
    const slug = slugify(madrassahName);
    const joinCode = await generateUniqueJoinCode(madrassahName);
    const reportAccessKey = await generateUniqueReportAccessKey();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const batch = db.batch();

    batch.set(madrassahRef, {
      name: madrassahName,
      slug,
      createdBy: createdUid,
      adminUserId: createdUid,
      isActive: true,

      studentAccessMode: "shared",

      subscriptionStatus: "trial",
      onboardingStatus: "pending",
      plan: "starter",
      trialEndsOn: "",
      nextPaymentDate: "",
      notes: "",

      billingAmount: "",
      billingCurrency: "ZAR",
      billingCycle: "monthly",
      paymentStatus: "unpaid",
      lastPaymentDate: "",
      paymentMethod: "eft",
      billingNotes: "",

      reportAccessKeyMirror: reportAccessKey,

      createdAt: now,
      updatedAt: now,
    });

    batch.set(db.doc(`madrassahs/${madrassahId}/private/config`), {
      joinCode,
      reportAccessKey,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(db.doc(`teacherJoinCodes/${joinCode}`), {
      madrassahId,
      madrassahName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(db.doc(`users/${createdUid}`), {
      email,
      fullName,
      phone,
      role: "admin",
      madrassahId,
      madrassahName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(db.doc(`madrassahs/${madrassahId}/staff/${createdUid}`), {
      userId: createdUid,
      fullName,
      email,
      phone,
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();

    return NextResponse.json({
      ok: true,
      uid: createdUid,
      email,
    });
  } catch (error: any) {
    if (createdUid) {
      try {
        await auth.deleteUser(createdUid);
      } catch {}
    }

    const message =
      error?.code === "auth/email-already-exists"
        ? "An account with this email already exists."
        : error?.message || "Could not create admin account.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
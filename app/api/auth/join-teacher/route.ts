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

export async function POST(req: Request) {
  let createdUid: string | null = null;

  try {
    const body = await req.json();

    const fullName = normalizeName(body?.fullName || "");
    const phone = normalizePhone(body?.phone || "");
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const joinCode = normalizeJoinCode(body?.joinCode || "");

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
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

    if (!joinCode) {
      return NextResponse.json({ error: "Join code is required." }, { status: 400 });
    }

    const joinSnap = await db.doc(`teacherJoinCodes/${joinCode}`).get();

    if (!joinSnap.exists) {
      return NextResponse.json({ error: "Invalid join code." }, { status: 400 });
    }

    const joinData = joinSnap.data() as {
      madrassahId?: string;
      madrassahName?: string;
      isActive?: boolean;
    };

    if (joinData.isActive === false) {
      return NextResponse.json({ error: "This join code is inactive." }, { status: 400 });
    }

    const madrassahId = String(joinData.madrassahId || "");
    const madrassahName = String(joinData.madrassahName || "");

    if (!madrassahId) {
      return NextResponse.json(
        { error: "Join code is not linked correctly." },
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

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    batch.set(db.doc(`users/${createdUid}`), {
      email,
      fullName,
      phone,
      role: "teacher",
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
      role: "teacher",
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
      } catch {
        // swallow cleanup failure
      }
    }

    return NextResponse.json(
      { error: error?.message || "Could not join madrassah." },
      { status: 500 }
    );
  }
}
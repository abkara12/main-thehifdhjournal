import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const body = await req.formData();

    const amount = body.get("amount_gross");
    const itemName = body.get("item_name");

    // Extract madrassah name from item
    const name = String(itemName || "").replace("Hifdh Journal Subscription - ", "");

    const snap = await db
      .collection("madrassahs")
      .where("name", "==", name)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ ok: true });
    }

    const docRef = snap.docs[0].ref;

    const today = new Date().toISOString().slice(0, 10);

    await docRef.update({
      paymentStatus: "paid",
      subscriptionStatus: "active",
      lastPaymentDate: today,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
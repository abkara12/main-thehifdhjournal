import { NextResponse } from "next/server";
import crypto from "crypto";

const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID!;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY!;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || "";

function generateSignature(data: Record<string, string>) {
  const pfOutput = Object.keys(data)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}`)
    .join("&");

  const stringToHash = PAYFAST_PASSPHRASE
    ? `${pfOutput}&passphrase=${encodeURIComponent(PAYFAST_PASSPHRASE.trim()).replace(/%20/g, "+")}`
    : pfOutput;

  return crypto.createHash("md5").update(stringToHash).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      amount,
      madrassahName,
      email,
      returnUrl,
      cancelUrl,
      notifyUrl,
    } = body;

    const data: Record<string, string> = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      amount: amount,
      item_name: `Hifdh Journal Subscription - ${madrassahName}`,
      email_address: email,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
    };

    const signature = generateSignature(data);

    const queryString =
      Object.entries(data)
        .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
        .join("&") + `&signature=${signature}`;

    return NextResponse.json({
      url: `https://www.payfast.co.za/eng/process?${queryString}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not generate payment link." },
      { status: 500 }
    );
  }
}
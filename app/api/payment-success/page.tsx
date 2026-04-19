"use client";

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 text-center">
        <h1 className="text-2xl font-semibold text-green-200">Payment Successful</h1>
        <p className="mt-3 text-white/70">
          Your payment has been received. You may now return to the system.
        </p>
      </div>
    </main>
  );
}
"use client";

import React from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white text-xl font-semibold shadow-md">
            J
          </div>

          <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Sign in to continue to your dashboard.
          </p>
        </div>

        <div className="px-8 pb-8">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.99] shadow-lg shadow-zinc-300/40"
          >
            Sign in with Google
          </button>

          <p className="mt-4 text-center text-xs text-zinc-500">
            Use your authorized account to access the system.
          </p>
        </div>

        <div className="border-t border-zinc-100 bg-zinc-50 px-8 py-4 text-center">
          <p className="text-xs text-zinc-500">
            Secure login powered by your organization account
          </p>
        </div>
      </div>
    </div>
  );
}
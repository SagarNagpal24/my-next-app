"use client";

import React from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ marginBottom: 12 }}>Login</h2>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{ padding: "10px 14px", cursor: "pointer" }}
        >
          Sign in with your user
        </button>
        <p style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
          
        </p>
      </div>
    </div>
  );
}

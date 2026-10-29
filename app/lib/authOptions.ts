import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "./mongodb";

type Role = "admin" | "user";

// ✅ permissions keys you want to control from Admin
export type Permissions = {
  customers?: boolean;
  bulkUpload?: boolean;
  trainData?: boolean;
  nominalRoll?: boolean;
  reports?: boolean;
  jathaDate?: boolean;
  calling?: boolean; // ✅ NEW
  followup?: boolean;
};

type AllowedUser = {
  email: string;
  role: Role;
  active: boolean;
  permissions?: Permissions;
};

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ user }) {
      const email = (user.email || "").toLowerCase().trim();
      if (!email) return false;

      try {
        const db = await getDb();

        const allowed = await db
          .collection<AllowedUser>("allowed_users")
          .findOne({ email, active: true });

        return !!allowed;
      } catch (e) {
        console.error("MongoDB unavailable during signIn:", e);
        return false;
      }
    },

    async jwt({ token }) {
      const email = (token.email || "").toLowerCase().trim();
      if (!email) return token;

      try {
        const db = await getDb();

        const allowed = await db
          .collection<AllowedUser>("allowed_users")
          .findOne({ email, active: true });

        (token as any).role = allowed?.role || "user";
        (token as any).isAllowed = !!allowed;

        // ✅ include permissions in token (admins can be treated as "all true" later)
        (token as any).permissions = allowed?.permissions || {};
      } catch (e) {
        console.error("MongoDB unavailable during jwt:", e);
      }

      return token;
    },

   async session({ session, token }) {
  const email = (token.email || "").toLowerCase().trim();

  (session as any).role = (token as any).role || "user";
  (session as any).isAllowed = (token as any).isAllowed || false;

  // ✅ ALWAYS fetch latest permissions from DB (so navbar updates immediately)
  if (email) {
    try {
      const db = await getDb();

      const allowed = await db
        .collection("allowed_users")
        .findOne({ email, active: true });

      (session as any).permissions = allowed?.permissions || {};
      (session as any).role = allowed?.role || (session as any).role; // keep role synced too
    } catch (e) {
      console.error("MongoDB unavailable during session:", e);
      (session as any).permissions = (token as any).permissions || {};
    }
  } else {
    (session as any).permissions = (token as any).permissions || {};
  }

  return session;
}

  },
};

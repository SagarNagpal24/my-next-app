import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import clientPromise from "./mongodb";

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

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB || "jatha");

      const allowed = await db
        .collection<AllowedUser>("allowed_users")
        .findOne({ email, active: true });

      return !!allowed;
    },

    async jwt({ token }) {
      const email = (token.email || "").toLowerCase().trim();
      if (!email) return token;

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB || "jatha");

      const allowed = await db
        .collection<AllowedUser>("allowed_users")
        .findOne({ email, active: true });

      (token as any).role = allowed?.role || "user";
      (token as any).isAllowed = !!allowed;

      // ✅ include permissions in token (admins can be treated as "all true" later)
      (token as any).permissions = allowed?.permissions || {};

      return token;
    },

   async session({ session, token }) {
  const email = (token.email || "").toLowerCase().trim();

  (session as any).role = (token as any).role || "user";
  (session as any).isAllowed = (token as any).isAllowed || false;

  // ✅ ALWAYS fetch latest permissions from DB (so navbar updates immediately)
  if (email) {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jatha");

    const allowed = await db
      .collection("allowed_users")
      .findOne({ email, active: true });

    (session as any).permissions = allowed?.permissions || {};
    (session as any).role = allowed?.role || (session as any).role; // keep role synced too
  } else {
    (session as any).permissions = (token as any).permissions || {};
  }

  return session;
}

  },
};

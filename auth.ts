// auth.ts (project root)
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import clientPromise from "./app/lib/mongodb"; // ✅ adjust if your mongodb file is elsewhere

type AllowedUser = { email: string; role: "admin" | "user"; active: boolean };

export const { handlers, auth } = NextAuth({
    secret: process.env.AUTH_SECRET,
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
      return token;
    },

    async session({ session, token }) {
  const email = (token.email || "").toLowerCase().trim();

  (session as any).role = (token as any).role || "user";
  (session as any).isAllowed = (token as any).isAllowed || false;

  if (email) {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jatha");
    const allowed = await db.collection("allowed_users").findOne({ email, active: true });

    (session as any).permissions = allowed?.permissions || {};
    (session as any).role = allowed?.role || (session as any).role;
  } else {
    (session as any).permissions = (token as any).permissions || {};
  }

  return session;
}

  },
});

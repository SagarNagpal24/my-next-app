import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import clientPromise from "../../../lib/mongodb";

type Role = "admin" | "user";

type Permissions = {
  customers?: boolean;
  bulkUpload?: boolean;
  trainData?: boolean;
  nominalRoll?: boolean;
  reports?: boolean;
  jathaDate?: boolean;
  calling?: boolean;
};

type AllowedUser = {
  email: string;
  role: Role;
  active: boolean;
  permissions?: Permissions;
};

const handler = NextAuth({
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

    // ✅ Put role + permissions into JWT token
    async jwt({ token, trigger }) {
      const email = (token.email || "").toLowerCase().trim();
      if (!email) return token;

      // ✅ Refresh from DB on first run OR when client calls useSession().update()
      if (trigger === "update" || (token as any).permissions == null || (token as any).role == null) {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB || "jatha");

        const allowed = await db
          .collection<AllowedUser>("allowed_users")
          .findOne({ email, active: true });

        (token as any).role = allowed?.role || "user";
        (token as any).permissions = allowed?.permissions || {};
        (token as any).isAllowed = !!allowed;
      }

      return token;
    },

    // ✅ Expose role + permissions to client session (Navbar uses this)
    async session({ session, token }) {
      (session as any).role = (token as any).role || "user";
      (session as any).permissions = (token as any).permissions || {};
      (session as any).isAllowed = (token as any).isAllowed || false;
      return session;
    },
  },
});

export { handler as GET, handler as POST };

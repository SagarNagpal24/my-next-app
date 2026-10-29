import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "../../../lib/mongodb";

type Role = "admin" | "user";

type Permissions = {
  customers?: boolean;
  bulkUpload?: boolean;
  trainData?: boolean;
  nominalRoll?: boolean;
  reports?: boolean;
  jathaDate?: boolean;
  calling?: boolean;
  followup?: boolean;
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

    // ✅ Put role + permissions into JWT token
    async jwt({ token, trigger }) {
      const email = (token.email || "").toLowerCase().trim();
      if (!email) return token;

      // ✅ Refresh from DB on first run OR when client calls useSession().update()
      if (trigger === "update" || (token as any).permissions == null || (token as any).role == null) {
        try {
          const db = await getDb();

          const allowed = await db
            .collection<AllowedUser>("allowed_users")
            .findOne({ email, active: true });

          (token as any).role = allowed?.role || "user";
          (token as any).permissions = allowed?.permissions || {};
          (token as any).isAllowed = !!allowed;
        } catch (e) {
          console.error("MongoDB unavailable during jwt:", e);
        }
      }

      return token;
    },

    // ✅ Expose role + permissions to client session (Navbar uses this)
    async session({ session, token }) {
      const email = ((token as any).email || "").toLowerCase().trim();

      (session as any).role = (token as any).role || "user";
      (session as any).permissions = (token as any).permissions || {};
      (session as any).isAllowed = (token as any).isAllowed || false;

      // Refresh permissions from DB so admin changes reflect without re-login.
      if (email) {
        try {
          const db = await getDb();

          const allowed = await db
            .collection<AllowedUser>("allowed_users")
            .findOne({ email, active: true });

          if (allowed) {
            (session as any).role = allowed.role;
            (session as any).permissions = allowed.permissions || {};
            (session as any).isAllowed = true;
          }
        } catch (e) {
          console.error("MongoDB unavailable during session:", e);
        }
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };

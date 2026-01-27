import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/authOptions";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as any)?.role || "user";
    if (!session?.user?.email || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const email = (body?.email || "").toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

    const permsRaw = body?.permissions || {};
    const permissions: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(permsRaw)) {
      permissions[k] = v === true || v === "true" || v === 1 || v === "1";
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jatha");

    const res = await db.collection("allowed_users").updateOne(
      { email, active: true },
      { $set: { permissions } }
    );

    return NextResponse.json({ ok: true, matched: res.matchedCount, modified: res.modifiedCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

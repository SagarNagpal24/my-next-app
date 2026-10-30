import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

const COLLECTIONS: Record<string, string> = {
  ladoo: "nominalRollLadoo",
  parantha: "nominalRollParantha",
  bhati: "nominalRollBhati",
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const assignedTo = String(body?.assignedTo ?? "").trim();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No rows to assign" }, { status: 400 });
    }

    const grouped = new Map<string, ObjectId[]>();

    for (const item of items) {
      const category = String(item?.sourceType || "").toLowerCase();
      if (!COLLECTIONS[category]) continue;

      const id = String(item?.id || "");
      if (!ObjectId.isValid(id)) continue;

      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category)!.push(new ObjectId(id));
    }

    if (grouped.size === 0) {
      return NextResponse.json({ error: "No valid rows to assign" }, { status: 400 });
    }

    const db = await getDb();

    const results = await Promise.all(
      Array.from(grouped.entries()).map(([category, ids]) =>
        db
          .collection(COLLECTIONS[category])
          .updateMany(
            { _id: { $in: ids } },
            { $set: { assignedTo, updatedAt: new Date() } }
          )
      )
    );

    const matched = results.reduce((sum, r) => sum + (r.matchedCount || 0), 0);
    const updated = results.reduce((sum, r) => sum + (r.modifiedCount || 0), 0);

    return NextResponse.json({ ok: true, matched, updated });
  } catch (e: any) {
    console.error("POST /api/followup/assign error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

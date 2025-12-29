import { NextResponse } from "next/server";
import { getDb } from "../../lib/mongodb";

const COLLECTION = "jathaDates";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get("category") || "").trim();

    const filter: any = {};
    if (category) filter.category = category;

    const db = await getDb();
    const items = await db.collection(COLLECTION).find(filter).sort({ travelDate: -1 }).limit(500).toArray();

    const safe = items.map((x: any) => ({
      ...x,
      _id: x._id.toString(),
      travelDate: x.travelDate ? x.travelDate.toISOString().slice(0, 10) : "",
    }));

    return NextResponse.json({ items: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const category = String(body.category || "").trim();
    const travelDate = String(body.travelDate || "").trim();
    const notes = String(body.notes || "").trim();

    if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });
    if (!travelDate) return NextResponse.json({ error: "Travel date is required" }, { status: 400 });

    const doc = {
      category,
      travelDate: new Date(travelDate),
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).insertOne(doc);

    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

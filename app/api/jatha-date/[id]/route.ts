import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "jathaDates";

function extractObjectId(raw: string) {
  const match = String(raw || "").match(/[a-fA-F0-9]{24}/);
  return match?.[0] || null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = extractObjectId(params.id);
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json();

    const category = String(body.category || "").trim();
    const travelDate = String(body.travelDate || "").trim();
    const notes = String(body.notes || "").trim();

    if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });
    if (!travelDate) return NextResponse.json({ error: "Travel date is required" }, { status: 400 });

    const update = {
      category,
      travelDate: new Date(travelDate),
      notes,
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: update });

    if (result.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = extractObjectId(params.id);
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

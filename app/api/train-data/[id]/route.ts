import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "trainData";

// tolerant id extraction
function extractObjectId(raw: string) {
  const match = String(raw || "").match(/[a-fA-F0-9]{24}/);
  return match?.[0] || null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = extractObjectId(params.id);
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json();

    const trainName = String(body.trainName || "").trim();
    const seatNumber = String(body.seatNumber || "").trim().toUpperCase();
    const travelDate = String(body.travelDate || "").trim();
    const travelRoute = String(body.travelRoute || "").trim();

    if (!trainName) return NextResponse.json({ error: "Train name is required" }, { status: 400 });
    if (!seatNumber) return NextResponse.json({ error: "Seat number is required" }, { status: 400 });
    if (!/^[A-Za-z]\d{1,3}$/.test(seatNumber)) return NextResponse.json({ error: "Invalid seat number format" }, { status: 400 });
    if (!travelDate) return NextResponse.json({ error: "Travel date is required" }, { status: 400 });
    if (!travelRoute) return NextResponse.json({ error: "Travel route is required" }, { status: 400 });

    const update = {
      trainName,
      seatNumber,
      travelDate: new Date(travelDate),
      travelRoute,
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

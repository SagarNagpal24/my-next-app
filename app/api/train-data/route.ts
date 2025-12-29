import { NextResponse } from "next/server";
import { getDb } from "../../lib/mongodb";

const COLLECTION = "trainData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const filter: any = {};
    if (q) {
      filter.$or = [
        { trainName: { $regex: q, $options: "i" } },
        { seatNumber: { $regex: q, $options: "i" } },
        { travelRoute: { $regex: q, $options: "i" } },
      ];
    }

    const db = await getDb();
    const items = await db.collection(COLLECTION).find(filter).sort({ createdAt: -1 }).limit(500).toArray();

    // return _id as string
    const safe = items.map((x: any) => ({ ...x, _id: x._id.toString() }));
    return NextResponse.json({ items: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    const doc = {
      trainName,
      seatNumber,
      travelDate: new Date(travelDate),
      travelRoute,
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

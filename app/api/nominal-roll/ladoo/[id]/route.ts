import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

const COLLECTION = "nominalRollLadoo";

function extractObjectId(raw: string) {
  const match = String(raw || "").match(/[a-fA-F0-9]{24}/);
  return match?.[0] || null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = extractObjectId(params.id);
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json();

    const mode = String(body.mode || "").trim();

    const bookingReqDelhiBeas = String(body.bookingReqDelhiBeas || "").trim();
    const bookingReqBeasDelhi = String(body.bookingReqBeasDelhi || "").trim();

    const ticketDelhiBeas = String(body.ticketDelhiBeas || "").trim();
    const ticketBeasDelhi = String(body.ticketBeasDelhi || "").trim();

    const payment = String(body.payment || "").trim();

    const jathaDateId = String(body.jathaDateId || "").trim();
    const jathaDate = String(body.jathaDate || "").trim();

    const travelStartDate = String(body.travelStartDate || "").trim();
    const travelEndDate = String(body.travelEndDate || "").trim();
    const notes = String(body.notes || "").trim();

    if (!jathaDateId) return NextResponse.json({ error: "Jatha date required" }, { status: 400 });
    if (!jathaDate) return NextResponse.json({ error: "Jatha date value missing" }, { status: 400 });

    if (!mode) return NextResponse.json({ error: "Mode is required" }, { status: 400 });

    if (!bookingReqDelhiBeas) return NextResponse.json({ error: "REQ (Delhi–Beas) required" }, { status: 400 });
    if (!bookingReqBeasDelhi) return NextResponse.json({ error: "REQ (Beas–Delhi) required" }, { status: 400 });

    if (!payment) return NextResponse.json({ error: "Payment required" }, { status: 400 });
    if (!travelStartDate) return NextResponse.json({ error: "Travel start date required" }, { status: 400 });
    if (!travelEndDate) return NextResponse.json({ error: "Travel end date required" }, { status: 400 });

    const update = {
      mode,

      bookingReqDelhiBeas,
      bookingReqBeasDelhi,

      ticketDelhiBeas,
      ticketBeasDelhi,

      payment,

      jathaDateId,
      jathaDate: new Date(jathaDate),

      travelStartDate: new Date(travelStartDate),
      travelEndDate: new Date(travelEndDate),

      notes,
      updatedAt: new Date(),
    };

    const db = await getDb();
    try {
      const result = await db.collection(COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: update });

      if (result.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json(
          { error: "This customer is already added for the selected Jatha Date (duplicate not allowed)." },
          { status: 409 }
        );
      }
      throw err;
    }
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

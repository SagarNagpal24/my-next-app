import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "nominalRollLadoo";

// Ensure unique constraint exists (idempotent)
async function ensureIndexes(db: any) {
  await db.collection(COLLECTION).createIndex(
    { customerId: 1, jathaDateId: 1 },
    { unique: true, name: "uniq_customer_jathadate" }
  );
}

export async function GET() {
  try {
    const db = await getDb();
    await ensureIndexes(db);

    const items = await db.collection(COLLECTION).find({}).sort({ createdAt: -1 }).limit(1000).toArray();

    const safe = items.map((x: any) => ({
      ...x,
      _id: x._id.toString(),
      jathaDate: x.jathaDate ? x.jathaDate.toISOString().slice(0, 10) : "",
      travelStartDate: x.travelStartDate ? x.travelStartDate.toISOString().slice(0, 10) : "",
      travelEndDate: x.travelEndDate ? x.travelEndDate.toISOString().slice(0, 10) : "",
    }));

    return NextResponse.json({ items: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDb();
    await ensureIndexes(db);

    const body = await req.json();

    // snapshot customer data
    const customerId = String(body.customerId || "").trim();
    const customerName = String(body.customerName || "").trim();
    const badgeNo = String(body.badgeNo || "").trim();
    const fatherOrHusbandName = String(body.fatherOrHusbandName || "").trim();
    const gender = String(body.gender || "").trim();
    const age = body.age === "" || body.age === null || body.age === undefined ? null : Number(body.age);
    const address = String(body.address || "").trim();
    const mobile = String(body.mobile || "").trim();
    const adhaarNumber = String(body.adhaarNumber || "").trim();

    // user fields
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

    if (!customerId) return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    if (!customerName) return NextResponse.json({ error: "Customer name missing" }, { status: 400 });

    if (!jathaDateId) return NextResponse.json({ error: "Jatha date required" }, { status: 400 });
    if (!jathaDate) return NextResponse.json({ error: "Jatha date value missing" }, { status: 400 });

    if (!mode) return NextResponse.json({ error: "Mode is required" }, { status: 400 });

    if (!bookingReqDelhiBeas) return NextResponse.json({ error: "Booking REQ (Delhi–Beas) required" }, { status: 400 });
    if (!bookingReqBeasDelhi) return NextResponse.json({ error: "Booking REQ (Beas–Delhi) required" }, { status: 400 });

    if (!payment) return NextResponse.json({ error: "Payment required" }, { status: 400 });
    if (!travelStartDate) return NextResponse.json({ error: "Travel start date required" }, { status: 400 });
    if (!travelEndDate) return NextResponse.json({ error: "Travel end date required" }, { status: 400 });

    const doc = {
      customerId,
      customerName,
      badgeNo,
      fatherOrHusbandName,
      gender,
      age,
      address,
      mobile,
      adhaarNumber,

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

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const result = await db.collection(COLLECTION).insertOne(doc);
      return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
    } catch (err: any) {
      // Duplicate key error
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

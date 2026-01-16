import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "nominalRollLadoo";

/** Safe YYYY-MM-DD output for Date or string */
function toYMD(v: any) {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  try {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return "";
}

// Ensure indexes exist (idempotent) — BUT do not crash GET if duplicates exist
async function ensureIndexes(db: any) {
  // customer duplicate protection
  await db
    .collection(COLLECTION)
    .createIndex({ customerId: 1, jathaDateId: 1 }, { unique: true, name: "uniq_customer_jathadate" });

  // ticket locking (unique only when non-empty string)
  await db.collection(COLLECTION).createIndex(
    { ticketDelhiBeas: 1 },
    {
      unique: true,
      name: "uniq_ticket_delhi_beas",
      partialFilterExpression: { ticketDelhiBeas: { $type: "string", $ne: "" } },
    }
  );

  await db.collection(COLLECTION).createIndex(
    { ticketBeasDelhi: 1 },
    {
      unique: true,
      name: "uniq_ticket_beas_delhi",
      partialFilterExpression: { ticketBeasDelhi: { $type: "string", $ne: "" } },
    }
  );
}

export async function GET() {
  try {
    const db = await getDb();

    // ✅ IMPORTANT: Do not break GET if index creation fails due to existing duplicates
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (GET) - likely duplicates exist:", e?.message || e);
    }

    const items = await db.collection(COLLECTION).find({}).sort({ createdAt: -1 }).limit(1000).toArray();

    const safe = items.map((x: any) => ({
      ...x,
      _id: x._id.toString(),

      // ✅ safe strings
      department: String(x.department || "").trim(),
      sangat: String(x.sangat || "").trim(), // ✅ NEW

      // ✅ safe formatting whether stored as Date or string
      jathaDate: toYMD(x.jathaDate),
      travelStartDate: toYMD(x.travelStartDate),
      travelEndDate: toYMD(x.travelEndDate),

      // keep as strings
      ticketDelhiBeas: String(x.ticketDelhiBeas || ""),
      ticketBeasDelhi: String(x.ticketBeasDelhi || ""),
    }));

    return NextResponse.json({ items: safe });
  } catch (e: any) {
    console.error("GET /nominal-roll/ladoo error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDb();

    // ✅ For POST we DO want indexes; if duplicates exist, return readable error
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (POST):", e?.message || e);
      // still allow POST attempt; Mongo will enforce whatever indexes exist
    }

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

    // ✅ department + sangat (editable)
    const department = String(body.department || "").trim();
    const sangat = String(body.sangat || "").trim(); // ✅ NEW (Yes/No or "")

    // user fields
    const mode = String(body.mode || "").trim();

    let bookingReqDelhiBeas = String(body.bookingReqDelhiBeas || "").trim();
    let bookingReqBeasDelhi = String(body.bookingReqBeasDelhi || "").trim();

    let ticketDelhiBeas = String(body.ticketDelhiBeas || "").trim();
    let ticketBeasDelhi = String(body.ticketBeasDelhi || "").trim();

    const payment = String(body.payment || "").trim();

    const jathaDateId = String(body.jathaDateId || "").trim();
    const jathaDate = String(body.jathaDate || "").trim(); // kept (start date)

    const travelStartDate = String(body.travelStartDate || "").trim();
    const travelEndDate = String(body.travelEndDate || "").trim();
    const notes = String(body.notes || "").trim();

    if (!customerId) return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    if (!customerName) return NextResponse.json({ error: "Customer name missing" }, { status: 400 });

    if (!jathaDateId) return NextResponse.json({ error: "Jatha date required" }, { status: 400 });
    if (!jathaDate) return NextResponse.json({ error: "Jatha date value missing" }, { status: 400 });

    if (!mode) return NextResponse.json({ error: "Mode is required" }, { status: 400 });

    // ✅ Sangat validation (optional — if you want required, uncomment)
    // if (!sangat) return NextResponse.json({ error: "Sangat is required" }, { status: 400 });
    if (sangat && !["Yes", "No"].includes(sangat)) {
      return NextResponse.json({ error: "Sangat must be Yes or No" }, { status: 400 });
    }

    // ✅ If mode != Train => force-disable booking/tickets
    if (mode !== "Train") {
      bookingReqDelhiBeas = "";
      bookingReqBeasDelhi = "";
      ticketDelhiBeas = "";
      ticketBeasDelhi = "";
    }

    // ✅ If Train => booking required
    if (mode === "Train") {
      if (!bookingReqDelhiBeas) return NextResponse.json({ error: "Booking REQ (Delhi–Beas) required" }, { status: 400 });
      if (!bookingReqBeasDelhi) return NextResponse.json({ error: "Booking REQ (Beas–Delhi) required" }, { status: 400 });
    }

    if (!payment) return NextResponse.json({ error: "Payment required" }, { status: 400 });
    if (!travelStartDate) return NextResponse.json({ error: "Travel start date required" }, { status: 400 });
    if (!travelEndDate) return NextResponse.json({ error: "Travel end date required" }, { status: 400 });

    const doc = {
      customerId,
      customerName,
      badgeNo,
      fatherOrHusbandName,
      gender,
      age: Number.isNaN(age) ? null : age,
      address,
      mobile,
      adhaarNumber,

      // ✅ NEW
      department,
      sangat,

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
      if (err?.code === 11000) {
        const msg = String(err?.message || "");
        if (msg.includes("uniq_ticket_delhi_beas")) {
          return NextResponse.json({ error: "Ticket (Delhi–Beas) is already assigned to someone else." }, { status: 409 });
        }
        if (msg.includes("uniq_ticket_beas_delhi")) {
          return NextResponse.json({ error: "Ticket (Beas–Delhi) is already assigned to someone else." }, { status: 409 });
        }
        return NextResponse.json(
          { error: "This customer is already added for the selected Jatha Date (duplicate not allowed)." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (e: any) {
    console.error("POST /nominal-roll/ladoo error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

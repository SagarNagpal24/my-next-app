import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "nominalRollParantha";

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

function asString(v: any) {
  return String(v ?? "").trim();
}

function asYesNo(v: any): "" | "Yes" | "No" {
  const s = String(v ?? "").trim();
  return s === "Yes" || s === "No" ? s : "";
}

async function ensureIndexes(db: any) {
  await db.collection(COLLECTION).createIndex(
    { customerId: 1, jathaDateId: 1 },
    { unique: true, name: "uniq_customer_jathadate" }
  );

  await db.collection(COLLECTION).createIndex(
    { ticketDelhiBeas: 1 },
    {
      unique: true,
      name: "uniq_ticket_delhi_beas",
      partialFilterExpression: {
        ticketDelhiBeas: { $type: "string", $ne: "" },
      },
    }
  );

  await db.collection(COLLECTION).createIndex(
    { ticketBeasDelhi: 1 },
    {
      unique: true,
      name: "uniq_ticket_beas_delhi",
      partialFilterExpression: {
        ticketBeasDelhi: { $type: "string", $ne: "" },
      },
    }
  );
}

/* =========================
   GET
========================= */
export async function GET() {
  try {
    const db = await getDb();

    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (GET parantha):", e?.message || e);
    }

    const items = await db
      .collection(COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .limit(1500)
      .toArray();

    const safe = items.map((x: any) => ({
      ...x,
      _id: x._id.toString(),

      jathaDate: toYMD(x.jathaDate),
      travelStartDate: toYMD(x.travelStartDate),
      travelEndDate: toYMD(x.travelEndDate),

      ticketDelhiBeas: asString(x.ticketDelhiBeas),
      ticketBeasDelhi: asString(x.ticketBeasDelhi),

      confirm: asYesNo(x.confirm),
      ferry: asYesNo(x.ferry),
      remarks: asString(x.remarks),
    }));

    return NextResponse.json({ items: safe });
  } catch (e: any) {
    console.error("GET /nominal-roll/parantha error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* =========================
   POST
========================= */
export async function POST(req: Request) {
  try {
    const db = await getDb();

    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (POST parantha):", e?.message || e);
    }

    const body = await req.json();

    const customerId = asString(body.customerId);
    const customerName = asString(body.customerName);
    const badgeNo = asString(body.badgeNo);
    const fatherOrHusbandName = asString(body.fatherOrHusbandName);
    const gender = asString(body.gender);
    const age =
      body.age === "" || body.age === null || body.age === undefined
        ? null
        : Number(body.age);

    const address = asString(body.address);
    const mobile = asString(body.mobile);
    const adhaarNumber = asString(body.adhaarNumber);

    const department = asString(body.department);
    const sangat = asString(body.sangat);

    const mode = asString(body.mode);

    let bookingReqDelhiBeas = asString(body.bookingReqDelhiBeas);
    let bookingReqBeasDelhi = asString(body.bookingReqBeasDelhi);

    let ticketDelhiBeas = asString(body.ticketDelhiBeas);
    let ticketBeasDelhi = asString(body.ticketBeasDelhi);

    const payment = asString(body.payment);

    const jathaDateId = asString(body.jathaDateId);
    const jathaDate = asString(body.jathaDate);

    const travelStartDate = asString(body.travelStartDate);
    const travelEndDate = asString(body.travelEndDate);

    const notes = asString(body.notes);

    const confirm = asYesNo(body.confirm);
    const ferry = asYesNo(body.ferry);
    const remarks = asString(body.remarks);

    if (!customerId)
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });

    if (!customerName)
      return NextResponse.json(
        { error: "Customer name missing" },
        { status: 400 }
      );

    if (!jathaDateId)
      return NextResponse.json(
        { error: "Jatha date required" },
        { status: 400 }
      );

    if (!jathaDate)
      return NextResponse.json(
        { error: "Jatha date value missing" },
        { status: 400 }
      );

    if (!mode)
      return NextResponse.json({ error: "Mode is required" }, { status: 400 });

    if (mode !== "Train") {
      bookingReqDelhiBeas = "";
      bookingReqBeasDelhi = "";
      ticketDelhiBeas = "";
      ticketBeasDelhi = "";
    }

    if (mode === "Train") {
      if (!bookingReqDelhiBeas) {
        return NextResponse.json(
          { error: "Booking REQ (Delhi–Beas) required" },
          { status: 400 }
        );
      }
      if (!bookingReqBeasDelhi) {
        return NextResponse.json(
          { error: "Booking REQ (Beas–Delhi) required" },
          { status: 400 }
        );
      }

      if (bookingReqDelhiBeas === "No") ticketDelhiBeas = "";
      if (bookingReqBeasDelhi === "No") ticketBeasDelhi = "";
    }

    if (!payment)
      return NextResponse.json(
        { error: "Payment required" },
        { status: 400 }
      );

    if (!travelStartDate)
      return NextResponse.json(
        { error: "Travel start date required" },
        { status: 400 }
      );

    if (!travelEndDate)
      return NextResponse.json(
        { error: "Travel end date required" },
        { status: 400 }
      );

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

      confirm,
      ferry,
      remarks,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const result = await db.collection(COLLECTION).insertOne(doc);
      return NextResponse.json(
        { ok: true, id: result.insertedId.toString() },
        { status: 201 }
      );
    } catch (err: any) {
      if (err?.code === 11000) {
        const msg = String(err?.message || "");
        if (msg.includes("uniq_ticket_delhi_beas")) {
          return NextResponse.json(
            { error: "Ticket (Delhi–Beas) is already assigned to someone else." },
            { status: 409 }
          );
        }
        if (msg.includes("uniq_ticket_beas_delhi")) {
          return NextResponse.json(
            { error: "Ticket (Beas–Delhi) is already assigned to someone else." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          {
            error:
              "This customer is already added for the selected Jatha Date (duplicate not allowed).",
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (e: any) {
    console.error("POST /nominal-roll/parantha error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
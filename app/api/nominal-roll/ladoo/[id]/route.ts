import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

const COLLECTION = "nominalRollLadoo";

function extractObjectId(raw: string) {
  const decoded = decodeURIComponent(String(raw || "")).trim();
  const match = decoded.match(/[a-fA-F0-9]{24}/);
  return match?.[0] || null;
}

function asString(v: any) {
  return String(v ?? "").trim();
}

function isNonEmptyTicket(v: string) {
  return !!(v && v.trim());
}

function normalizeNameKey(v: any) {
  return String(v || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function escapeRegExp(v: string) {
  return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Ensure indexes exist (idempotent)
async function ensureIndexes(db: any) {
  // ✅ duplicate protection by same NAME + same JATHA DATE
  await db.collection(COLLECTION).createIndex(
    { customerNameKey: 1, jathaDateId: 1 },
    {
      unique: true,
      name: "uniq_customername_jathadate",
      partialFilterExpression: {
        customerNameKey: { $type: "string", $ne: "" },
        jathaDateId: { $type: "string", $ne: "" },
      },
    }
  );

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

// Ticket locking check for UPDATE (exclude current _id)
async function assertTicketFreeForUpdate(
  db: any,
  field: "ticketDelhiBeas" | "ticketBeasDelhi",
  ticketId: string,
  currentId: ObjectId
) {
  const t = asString(ticketId);
  if (!isNonEmptyTicket(t)) return;

  const existing = await db.collection(COLLECTION).findOne({
    [field]: t,
    _id: { $ne: currentId },
  });

  if (existing) throw new Error(`TICKET_TAKEN:${field}`);
}

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id: rawId } = await ctx.params;
    const id = extractObjectId(rawId);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = await getDb();

    // ✅ IMPORTANT: do NOT break edit if indexes fail due to existing duplicates
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (PUT) - likely duplicates exist:", e?.message || e);
    }

    const body = await req.json();

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

    // Calling tab fields
    const confirm = asString(body.confirm);
    const ferry = asString(body.ferry);
    const remarks = asString(body.remarks);

    if (!jathaDateId) return NextResponse.json({ error: "Jatha date required" }, { status: 400 });
    if (!jathaDate) return NextResponse.json({ error: "Jatha date value missing" }, { status: 400 });

    if (!mode) return NextResponse.json({ error: "Mode is required" }, { status: 400 });

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
      if (!bookingReqDelhiBeas) {
        return NextResponse.json({ error: "REQ (Delhi–Beas) required" }, { status: 400 });
      }
      if (!bookingReqBeasDelhi) {
        return NextResponse.json({ error: "REQ (Beas–Delhi) required" }, { status: 400 });
      }

      // ✅ if booking is No, clear ticket for that side
      if (bookingReqDelhiBeas !== "Yes") ticketDelhiBeas = "";
      if (bookingReqBeasDelhi !== "Yes") ticketBeasDelhi = "";
    }

    if (!payment) return NextResponse.json({ error: "Payment required" }, { status: 400 });
    if (!travelStartDate) return NextResponse.json({ error: "Travel start date required" }, { status: 400 });
    if (!travelEndDate) return NextResponse.json({ error: "Travel end date required" }, { status: 400 });

    const oid = new ObjectId(id);

    // ✅ fetch current row for duplicate-name check
    const current = await db.collection(COLLECTION).findOne({ _id: oid });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const currentName = String(current.customerName || "").trim();
    const customerNameKey = normalizeNameKey(currentName);

    // ✅ duplicate prevention by SAME NAME + SAME JATHA DATE, excluding current row
    const existingDuplicate = await db.collection(COLLECTION).findOne({
      _id: { $ne: oid },
      jathaDateId,
      $or: [
        { customerNameKey },
        {
          customerName: {
            $regex: `^${escapeRegExp(currentName)}$`,
            $options: "i",
          },
        },
      ],
    });

    if (existingDuplicate) {
      return NextResponse.json(
        { error: "This customer name is already added for the selected Jatha Date (duplicate not allowed)." },
        { status: 409 }
      );
    }

    // ✅ Ticket locking (exclude this record)
    if (mode === "Train") {
      await assertTicketFreeForUpdate(db, "ticketDelhiBeas", ticketDelhiBeas, oid);
      await assertTicketFreeForUpdate(db, "ticketBeasDelhi", ticketBeasDelhi, oid);
    }

    const update = {
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

      // Calling tab fields - save permanently in DB
      confirm,
      ferry,
      remarks,

      // ✅ keep normalized key aligned for old rows that may not have it
      customerNameKey,

      updatedAt: new Date(),
    };

    try {
      const result = await db.collection(COLLECTION).updateOne({ _id: oid }, { $set: update });

      if (result.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      if (err?.code === 11000) {
        const msg = String(err?.message || "");
        if (msg.includes("uniq_ticket_delhi_beas")) {
          return NextResponse.json({ error: "Ticket (Delhi–Beas) is already assigned to someone else." }, { status: 409 });
        }
        if (msg.includes("uniq_ticket_beas_delhi")) {
          return NextResponse.json({ error: "Ticket (Beas–Delhi) is already assigned to someone else." }, { status: 409 });
        }
        if (msg.includes("uniq_customername_jathadate")) {
          return NextResponse.json(
            { error: "This customer name is already added for the selected Jatha Date (duplicate not allowed)." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Duplicate record not allowed." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (e: any) {
    if (String(e?.message || "").startsWith("TICKET_TAKEN:")) {
      const which = String(e.message).split(":")[1];
      return NextResponse.json(
        {
          error:
            which === "ticketDelhiBeas"
              ? "Ticket (Delhi–Beas) is already assigned to someone else."
              : "Ticket (Beas–Delhi) is already assigned to someone else.",
        },
        { status: 409 }
      );
    }

    console.error("PUT /nominal-roll/ladoo/[id] error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    const { id: rawId } = await ctx.params;
    const id = extractObjectId(rawId);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = await getDb();

    // ✅ IMPORTANT: do NOT break delete if indexes fail due to existing duplicates
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (DELETE) - likely duplicates exist:", e?.message || e);
    }

    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /nominal-roll/ladoo/[id] error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
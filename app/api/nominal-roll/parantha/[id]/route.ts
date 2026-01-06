import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

const COLLECTION = "nominalRollParantha";

function extractObjectId(raw: string) {
  const match = String(raw || "").match(/[a-fA-F0-9]{24}/);
  return match?.[0] || null;
}

function asString(v: any) {
  return String(v ?? "").trim();
}

function isNonEmptyTicket(v: string) {
  return !!(v && v.trim());
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
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const db = await getDb();
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (PUT parantha):", e?.message || e);
    }

    const body = await req.json();

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

    if (!jathaDateId) return NextResponse.json({ error: "Jatha date required" }, { status: 400 });
    if (!jathaDate) return NextResponse.json({ error: "Jatha date value missing" }, { status: 400 });

    if (!mode) return NextResponse.json({ error: "Mode is required" }, { status: 400 });

    if (mode !== "Train") {
      bookingReqDelhiBeas = "";
      bookingReqBeasDelhi = "";
      ticketDelhiBeas = "";
      ticketBeasDelhi = "";
    }

    if (mode === "Train") {
      if (!bookingReqDelhiBeas) return NextResponse.json({ error: "REQ (Delhi–Beas) required" }, { status: 400 });
      if (!bookingReqBeasDelhi) return NextResponse.json({ error: "REQ (Beas–Delhi) required" }, { status: 400 });
    }

    if (!payment) return NextResponse.json({ error: "Payment required" }, { status: 400 });
    if (!travelStartDate) return NextResponse.json({ error: "Travel start date required" }, { status: 400 });
    if (!travelEndDate) return NextResponse.json({ error: "Travel end date required" }, { status: 400 });

    const oid = new ObjectId(id);

    if (mode === "Train") {
      await assertTicketFreeForUpdate(db, "ticketDelhiBeas", ticketDelhiBeas, oid);
      await assertTicketFreeForUpdate(db, "ticketBeasDelhi", ticketBeasDelhi, oid);
    }

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
        return NextResponse.json({ error: "This customer is already added for the selected Jatha Date (duplicate not allowed)." }, { status: 409 });
      }
      throw err;
    }
  } catch (e: any) {
    if (String(e?.message || "").startsWith("TICKET_TAKEN:")) {
      const which = String(e.message).split(":")[1];
      return NextResponse.json(
        { error: which === "ticketDelhiBeas" ? "Ticket (Delhi–Beas) is already assigned to someone else." : "Ticket (Beas–Delhi) is already assigned to someone else." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    const { id: rawId } = await ctx.params;
    const id = extractObjectId(rawId);
    if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const db = await getDb();
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (DELETE parantha):", e?.message || e);
    }

    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

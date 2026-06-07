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

function asUpperString(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function asYesNo(v: any): "" | "Yes" | "No" {
  const s = String(v ?? "").trim();
  return s === "Yes" || s === "No" ? s : "";
}

// ✅ NEW: Payment Mode dropdown value
function asPaymentMode(v: any): "" | "Cash" | "Online" {
  const s = String(v ?? "").trim();
  return s === "Cash" || s === "Online" ? s : "";
}

// ✅ NEW: Paid To dropdown value
function asPaidTo(
  v: any
): "" | "Munish" | "Sagar" | "Gurjeet" | "Pulkit" | "Anjali" | "Jyoti" {
  const s = String(v ?? "").trim();
  return ["Munish", "Sagar", "Gurjeet", "Pulkit", "Anjali", "Jyoti"].includes(s)
    ? (s as any)
    : "";
}

async function ensureIndexes(db: any) {
  await db.collection(COLLECTION).createIndex(
    { customerId: 1, jathaDateId: 1 },
    { unique: true, name: "uniq_customer_jathadate" }
  );

  // ✅ NEW: helps searching/filtering Bus Group / Friend Group
  await db.collection(COLLECTION).createIndex(
    { busGroup: 1 },
    {
      name: "idx_bus_group",
      partialFilterExpression: {
        busGroup: { $type: "string", $ne: "" },
      },
    }
  );
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

    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (PUT parantha):", e?.message || e);
    }

    const body = await req.json();
    const oid = new ObjectId(id);

    const existing = await db.collection(COLLECTION).findOne({ _id: oid });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const hasOwn = (key: string) =>
      Object.prototype.hasOwnProperty.call(body, key);

    const mode = asString(body.mode);
    const payment = asString(body.payment);

    // ✅ NEW FIELDS
    // Preserve existing values if this route is called from an older page/API payload
    // that does not send paymentMode or paidTo.
    const paymentMode = hasOwn("paymentMode")
      ? asPaymentMode(body.paymentMode)
      : asPaymentMode(existing.paymentMode);

    const paidTo = hasOwn("paidTo")
      ? asPaidTo(body.paidTo)
      : asPaidTo(existing.paidTo);

    // ✅ NEW: Bus/Friend group marker
    // Preserve existing group if older code does not send busGroup.
    const busGroup = hasOwn("busGroup")
      ? asUpperString(body.busGroup)
      : asUpperString(existing.busGroup);

    const jathaDateId = asString(body.jathaDateId);
    const jathaDate = asString(body.jathaDate);

    const travelStartDate = asString(body.travelStartDate);
    const travelEndDate = asString(body.travelEndDate);

    const notes = asString(body.notes);

    const confirm = hasOwn("confirm")
      ? asYesNo(body.confirm)
      : asYesNo(existing.confirm);

    const ferry = hasOwn("ferry")
      ? asYesNo(body.ferry)
      : asYesNo(existing.ferry);

    const remarks = hasOwn("remarks")
      ? asString(body.remarks)
      : asString(existing.remarks);

    if (!jathaDateId) {
      return NextResponse.json({ error: "Jatha date required" }, { status: 400 });
    }

    if (!jathaDate) {
      return NextResponse.json(
        { error: "Jatha date value missing" },
        { status: 400 }
      );
    }

    if (!mode) {
      return NextResponse.json({ error: "Mode is required" }, { status: 400 });
    }

    const update: any = {
      mode,
      payment,

      // ✅ NEW FIELDS
      paymentMode,
      paidTo,

      // ✅ NEW: Bus/Friend group marker
      busGroup,

      jathaDateId,
      jathaDate: new Date(jathaDate),
      notes,
      confirm,
      ferry,
      remarks,
      updatedAt: new Date(),
    };

    if (travelStartDate) update.travelStartDate = new Date(travelStartDate);
    if (travelEndDate) update.travelEndDate = new Date(travelEndDate);

    try {
      const result = await db.collection(COLLECTION).updateOne(
        { _id: oid },
        { $set: update }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true });
    } catch (err: any) {
      if (err?.code === 11000) {
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
    console.error("PUT /nominal-roll/parantha/[id] error:", e);

    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
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

    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (DELETE parantha):", e?.message || e);
    }

    const result = await db.collection(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /nominal-roll/parantha/[id] error:", e);

    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

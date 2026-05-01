import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../lib/mongodb";

const COLLECTION = "nominalRollBhati";

function extractObjectId(raw: string) {
  const match = String(raw || "").match(/[a-fA-F0-9]{24}/);
  return match?.[0] || null;
}

function asString(v: any) {
  return String(v ?? "").trim();
}

// ✅ NEW
function asYesNo(v: any): "" | "Yes" | "No" {
  const s = String(v ?? "").trim();
  return s === "Yes" || s === "No" ? s : "";
}

async function ensureIndexes(db: any) {
  await db.collection(COLLECTION).createIndex(
    { customerId: 1, jathaDateId: 1 },
    { unique: true, name: "uniq_customer_jathadate" }
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
      console.error("ensureIndexes failed (PUT bhati):", e?.message || e);
    }

    const oid = new ObjectId(id);
    const existing = await db.collection(COLLECTION).findOne({ _id: oid });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();

    const hasOwn = (key: string) =>
      Object.prototype.hasOwnProperty.call(body, key);

    const mode = asString(body.mode);
    const payment = asString(body.payment);

    const jathaDateId = asString(body.jathaDateId);
    const jathaDate = asString(body.jathaDate);

    const notes = asString(body.notes);

    // ✅ Preserve Calling tab fields if Nominal/Reports tab does not send them
    const confirm = hasOwn("confirm")
      ? asYesNo(body.confirm)
      : asYesNo(existing.confirm);

    const ferry = hasOwn("ferry")
      ? asYesNo(body.ferry)
      : asYesNo(existing.ferry);

    const remarks = hasOwn("remarks")
      ? asString(body.remarks)
      : asString(existing.remarks);

    /* ---------- validations ---------- */

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

    // ✅ payment optional
    // ✅ no travel dates for bhati

    /* ---------- update payload ---------- */

    const update = {
      mode,
      payment,

      jathaDateId,
      jathaDate: new Date(jathaDate),

      notes,

      // ✅ SAVED FIELDS - preserved if missing in request body
      confirm,
      ferry,
      remarks,

      updatedAt: new Date(),
    };

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
    console.error("PUT /nominal-roll/bhati/[id] error:", e);

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
      console.error("ensureIndexes failed (DELETE bhati):", e?.message || e);
    }

    const result = await db.collection(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /nominal-roll/bhati/[id] error:", e);

    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

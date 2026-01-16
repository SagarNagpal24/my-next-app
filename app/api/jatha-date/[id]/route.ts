import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "jathaDates";

function toObjectId(raw: string) {
  const decoded = decodeURIComponent(String(raw || "")).trim();
  const match = decoded.match(/[a-fA-F0-9]{24}/);
  const hex = (match?.[0] ?? decoded).trim();

  try {
    return new ObjectId(hex);
  } catch {
    return null;
  }
}

function toISO10(v: any) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function dateToISO10(v: any) {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);

  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// ✅ IMPORTANT: params is a Promise in your Next.js version
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const oid = toObjectId(id);

    if (!oid) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();

    const category = String(body.category || "").trim();

    // ✅ accept new fields, fallback to travelDate
    const jathaStartDate = toISO10(body.jathaStartDate ?? body.travelDate);
    const jathaEndDate = toISO10(body.jathaEndDate ?? body.travelDate);

    const notes = String(body.notes || "").trim();

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!jathaStartDate) {
      return NextResponse.json({ error: "Jatha start date is required" }, { status: 400 });
    }
    if (!jathaEndDate) {
      return NextResponse.json({ error: "Jatha end date is required" }, { status: 400 });
    }
    if (jathaEndDate < jathaStartDate) {
      return NextResponse.json(
        { error: "Jatha end date cannot be before start date" },
        { status: 400 }
      );
    }

    const update = {
      category,

      // ✅ new fields
      jathaStartDate, // "YYYY-MM-DD"
      jathaEndDate,   // "YYYY-MM-DD"

      // ✅ backward compatibility
      travelDate: new Date(jathaStartDate),

      notes,
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).updateOne(
      { _id: oid },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const oid = toObjectId(id);

    if (!oid) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: oid });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

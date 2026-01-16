import { NextResponse } from "next/server";
import { getDb } from "../../lib/mongodb";

const COLLECTION = "jathaDates";

function toISO10(v: any) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function dateToISO10(v: any) {
  // supports Date or string
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return "";
  // if it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // try parse
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get("category") || "").trim();

    const filter: any = {};
    if (category) filter.category = category;

    const db = await getDb();
    const items = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ jathaStartDate: -1, travelDate: -1, createdAt: -1 })
      .limit(500)
      .toArray();

    // ✅ Backward compatible:
    // - old docs stored travelDate as Date
    // - new docs store jathaStartDate/jathaEndDate as "YYYY-MM-DD"
    const safe = items.map((x: any) => {
      const start = dateToISO10(x.jathaStartDate ?? x.travelDate);
      const end = dateToISO10(x.jathaEndDate ?? x.travelDate);

      return {
        ...x,
        _id: x._id.toString(),

        // ✅ new fields for UI
        jathaStartDate: start,
        jathaEndDate: end,

        // ✅ keep old field for older pages (as YYYY-MM-DD string)
        travelDate: start,
      };
    });

    return NextResponse.json({ items: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const category = String(body.category || "").trim();

    // ✅ accept new fields; fallback to travelDate if old UI still sends it
    const jathaStartDate = toISO10(body.jathaStartDate ?? body.travelDate);
    const jathaEndDate = toISO10(body.jathaEndDate ?? body.travelDate);

    const notes = String(body.notes || "").trim();

    if (!category) return NextResponse.json({ error: "Category is required" }, { status: 400 });
    if (!jathaStartDate) return NextResponse.json({ error: "Jatha start date is required" }, { status: 400 });
    if (!jathaEndDate) return NextResponse.json({ error: "Jatha end date is required" }, { status: 400 });
    if (jathaEndDate < jathaStartDate) {
      return NextResponse.json({ error: "Jatha end date cannot be before start date" }, { status: 400 });
    }

    // ✅ Store start/end as strings (YYYY-MM-DD) for consistency with UI
    // ✅ Also store travelDate as Date (backward compatibility with any old code)
    const doc = {
      category,
      jathaStartDate, // "YYYY-MM-DD"
      jathaEndDate, // "YYYY-MM-DD"

      // old field kept for compatibility
      travelDate: new Date(jathaStartDate),

      notes,
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

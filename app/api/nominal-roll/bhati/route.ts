import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "nominalRollBhati";

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

async function ensureIndexes(db: any) {
  await db.collection(COLLECTION).createIndex(
    { customerId: 1, jathaDateId: 1 },
    { unique: true, name: "uniq_customer_jathadate" }
  );
}

export async function GET() {
  try {
    const db = await getDb();
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (GET bhati):", e?.message || e);
    }

    const items = await db.collection(COLLECTION).find({}).sort({ createdAt: -1 }).limit(1000).toArray();

    const safe = items.map((x: any) => ({
      ...x,
      _id: x._id.toString(),
      jathaDate: toYMD(x.jathaDate),

      // ✅ NEW
      department: String(x.department || ""),
      sangat: String(x.sangat || ""),

      payment: String(x.payment || ""), // optional
      notes: String(x.notes || ""),
    }));

    return NextResponse.json({ items: safe });
  } catch (e: any) {
    console.error("GET /nominal-roll/bhati error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getDb();
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (POST bhati):", e?.message || e);
    }

    const body = await req.json().catch(() => ({}));

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

    // ✅ NEW: department + sangat snapshot
    const department = String(body.department || "").trim();
    const sangat = String(body.sangat || "").trim(); // "Yes" | "No" | ""

    // user fields
    const mode = String(body.mode || "").trim(); // should be Bus/Self from UI
    const payment = String(body.payment || "").trim(); // optional

    const jathaDateId = String(body.jathaDateId || "").trim();
    const jathaDate = String(body.jathaDate || "").trim();

    const notes = String(body.notes || "").trim();

    if (!customerId) return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    if (!customerName) return NextResponse.json({ error: "Customer name missing" }, { status: 400 });

    if (!jathaDateId) return NextResponse.json({ error: "Jatha date required" }, { status: 400 });
    if (!jathaDate) return NextResponse.json({ error: "Jatha date value missing" }, { status: 400 });

    if (!mode) return NextResponse.json({ error: "Mode is required" }, { status: 400 });

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
      payment,

      jathaDateId,
      jathaDate: new Date(jathaDate),

      notes,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const result = await db.collection(COLLECTION).insertOne(doc);
      return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
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
    console.error("POST /nominal-roll/bhati error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

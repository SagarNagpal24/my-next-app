import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/mongodb";

const COLLECTION = "customers";

function toNum(v: any) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const gender = (searchParams.get("gender") || "").trim();
    const ageMin = toNum(searchParams.get("ageMin"));
    const ageMax = toNum(searchParams.get("ageMax"));
    const medFrom = (searchParams.get("medFrom") || "").trim();
    const medTo = (searchParams.get("medTo") || "").trim();

    // ✅ NEW: limit support (for export all)
    const limitRaw = toNum(searchParams.get("limit"));
    const limit = Math.min(Math.max(limitRaw ?? 200, 1), 10000); // max 10k for safety

    const filter: any = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { adhaarNumber: { $regex: q, $options: "i" } },
        { badgeNo: { $regex: q, $options: "i" } },
      ];
    }

    if (gender) filter.gender = gender;

    if (ageMin !== undefined || ageMax !== undefined) {
      filter.age = {};
      if (ageMin !== undefined) filter.age.$gte = ageMin;
      if (ageMax !== undefined) filter.age.$lte = ageMax;
    }

    if (medFrom || medTo) {
      filter.medicalDate = {};
      if (medFrom) filter.medicalDate.$gte = new Date(medFrom);
      if (medTo) filter.medicalDate.$lte = new Date(medTo);
    }

    const db = await getDb();
    const items = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // ✅ ensure _id is string
    const safeItems = items.map((x: any) => ({
      ...x,
      _id: x._id?.toString?.() ?? String(x._id),
    }));

    return NextResponse.json({ items: safeItems });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const doc = {
      name,
      badgeNo: String(body.badgeNo || "").trim(),
      fatherOrHusbandName: String(body.fatherOrHusbandName || "").trim(),
      gender: String(body.gender || "").trim(),
      age: body.age === "" || body.age === null || body.age === undefined ? null : Number(body.age),
      address: String(body.address || "").trim(),
      mobile: String(body.mobile || "").trim(),
      adhaarNumber: String(body.adhaarNumber || "").trim(),
      emergencyNumber: String(body.emergencyNumber || "").trim(),
      medicalDate: body.medicalDate ? new Date(String(body.medicalDate)) : null,
      notes: String(body.notes || "").trim(),
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

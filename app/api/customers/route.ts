import { NextResponse } from "next/server";
import { getDb } from "../../lib/mongodb";

const COLLECTION = "customers";

function toNum(v: any) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D/g, "");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const gender = (searchParams.get("gender") || "").trim();
    const blacklisted = (searchParams.get("blacklisted") || "").trim(); // ✅ NEW
    const ageMin = toNum(searchParams.get("ageMin"));
    const ageMax = toNum(searchParams.get("ageMax"));
    const medFrom = (searchParams.get("medFrom") || "").trim();
    const medTo = (searchParams.get("medTo") || "").trim();

    // ✅ NEW: limit support (needed for Export All)
    const limitRaw = toNum(searchParams.get("limit"));
    const limit = Math.min(Math.max(limitRaw ?? 200, 1), 10000);

    const filter: any = {};

    // search across multiple fields
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { adhaarNumber: { $regex: q, $options: "i" } },
        { badgeNo: { $regex: q, $options: "i" } },
      ];
    }

    if (gender) filter.gender = gender;

    // ✅ NEW: blacklisted filter
    if (blacklisted) filter.blacklisted = blacklisted;

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
    const items = await db.collection(COLLECTION).find(filter).sort({ createdAt: -1 }).limit(limit).toArray();

    // ✅ convert _id to string
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
    const badgeNo = String(body.badgeNo || "").trim();
    const adhaarNumber = digitsOnly(body.adhaarNumber || "").slice(0, 12);

    const fatherOrHusbandName = String(body.fatherOrHusbandName || "").trim();
    const gender = String(body.gender || "").trim(); // expected M/F/Other
    const address = String(body.address || "").trim();
    const mobile = digitsOnly(body.mobile || "");
    const blacklisted = String(body.blacklisted || "No").trim();

    const age = body.age === "" || body.age === null || body.age === undefined ? null : Number(body.age);

    // ✅ REQUIRED fields
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!fatherOrHusbandName) return NextResponse.json({ error: "Father/Husband Name is required" }, { status: 400 });
    if (!gender) return NextResponse.json({ error: "Gender is required" }, { status: 400 });
    if (!address) return NextResponse.json({ error: "Address is required" }, { status: 400 });
    if (!mobile) return NextResponse.json({ error: "Mobile is required" }, { status: 400 });

    if (age === null || Number.isNaN(age) || age <= 0) {
      return NextResponse.json({ error: "Age is required and must be valid" }, { status: 400 });
    }

    // ✅ Badge OR Aadhaar required
    if (!badgeNo && !adhaarNumber) {
      return NextResponse.json({ error: "Either Badge No or Aadhaar must be filled" }, { status: 400 });
    }

    // ✅ Aadhaar must be 12 digits if provided
    if (adhaarNumber && adhaarNumber.length !== 12) {
      return NextResponse.json({ error: "Aadhaar must be exactly 12 digits (if provided)" }, { status: 400 });
    }

    // ✅ Gender allowed values
    if (!["M", "F", "Other"].includes(gender)) {
      return NextResponse.json({ error: "Gender must be M, F, or Other" }, { status: 400 });
    }

    // ✅ Blacklisted allowed values
    if (blacklisted && !["Yes", "No"].includes(blacklisted)) {
      return NextResponse.json({ error: "Blacklisted must be Yes or No" }, { status: 400 });
    }

    const medicalDate = body.medicalDate ? new Date(String(body.medicalDate)) : null;
    if (body.medicalDate && (medicalDate === null || Number.isNaN(medicalDate.getTime()))) {
      return NextResponse.json({ error: "Invalid medical date" }, { status: 400 });
    }

    const doc = {
      name,
      badgeNo,
      fatherOrHusbandName,
      gender,
      age,
      address,
      mobile,
      adhaarNumber: adhaarNumber || "",
      blacklisted: blacklisted || "No",
      emergencyNumber: digitsOnly(body.emergencyNumber || ""),
      medicalDate,
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

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb"; // keep your current working relative path

const COLLECTION = "customers";

type Department =
  | ""
  | "Security"
  | "FR"
  | "Pandal"
  | "SHK"
  | "Canteen"
  | "BAV"
  | "Traffic"
  | "Sangat";

const DEPARTMENT_OPTIONS: Exclude<Department, "">[] = [
  "Security",
  "FR",
  "Pandal",
  "SHK",
  "Canteen",
  "BAV",
  "Traffic",
  "Sangat",
];

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D/g, "");
}

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

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const oid = toObjectId(id);
    if (!oid) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const body = await req.json();

    const name = String(body.name || "").trim();
    const badgeNo = String(body.badgeNo || "").trim();
    const adhaarNumber = digitsOnly(body.adhaarNumber || "").slice(0, 12);

    const fatherOrHusbandName = String(body.fatherOrHusbandName || "").trim();
    const gender = String(body.gender || "").trim(); // M/F/Other
    const address = String(body.address || "").trim();
    const mobile = digitsOnly(body.mobile || "");
    const blacklisted = String(body.blacklisted || "No").trim();

    // ✅ NEW: Department
    const department = String(body.department || "").trim();

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

    // ✅ Department validation (optional)
    if (department && !DEPARTMENT_OPTIONS.includes(department as any)) {
      return NextResponse.json(
        { error: `Department must be one of: ${DEPARTMENT_OPTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const mdRaw = String(body.medicalDate || "").trim();
    const medicalDate = mdRaw ? new Date(mdRaw) : null;
    if (mdRaw && Number.isNaN(medicalDate!.getTime())) {
      return NextResponse.json({ error: "Invalid medical date" }, { status: 400 });
    }

    const update: any = {
      name,
      badgeNo,
      fatherOrHusbandName,
      gender,
      age,
      address,
      mobile,
      adhaarNumber: adhaarNumber || "",
      department: department || "", // ✅ NEW
      blacklisted: blacklisted || "No",
      emergencyNumber: digitsOnly(body.emergencyNumber || ""),
      medicalDate,
      notes: String(body.notes || "").trim(),
      updatedAt: new Date(),
    };

    delete update._id;

    const db = await getDb();
    const result = await db.collection(COLLECTION).updateOne({ _id: oid }, { $set: update });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PUT error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const oid = toObjectId(id);
    if (!oid) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: oid });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

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
  | "HRT"
  | "Baal-Satsang"
  | "Coupon"
  | "MNT"
  | "Office"
  | "Sewa-Collection"
  | "Water"
  | "Sewa-Samiti"
  | "Medical"
  | "VIP Block"
  | "Langar";

const DEPARTMENT_OPTIONS: Exclude<Department, "">[] = [
  "Security",
  "FR",
  "Pandal",
  "SHK",
  "Canteen",
  "BAV",
  "Traffic",
  "HRT",
  "Baal-Satsang",
  "Coupon",
  "MNT",
  "Office",
  "Sewa-Collection",
  "Water",
  "Sewa-Samiti",
  "Medical",
  "VIP Block",
  "Langar",
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

// ✅ Parse YYYY-MM-DD DOB safely (store as Date at UTC midnight)
function parseDob(dobYmd: any): Date | null {
  const s = String(dobYmd ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// ✅ Age from DOB (full years)
function calcAgeFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();

  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;

  return age;
}

// ✅ image validation (same as POST route)
type ImgData = {
  dataUrl: string;
  filename?: string;
  mime: string;
  size: number;
};

function isValidImgData(x: any) {
  if (!x) return true; // allow null/undefined
  if (typeof x !== "object") return false;
  if (typeof x.dataUrl !== "string") return false;
  if (typeof x.mime !== "string") return false;
  if (typeof x.size !== "number") return false;

  if (!["image/webp", "image/jpeg"].includes(x.mime)) return false;
  if (!x.dataUrl.startsWith("data:image/")) return false;
  if (x.size > 1_200_000) return false;

  if (x.filename !== undefined && typeof x.filename !== "string") return false;
  return true;
}

function pickImg(x: any): ImgData | null {
  if (!x) return null;
  return {
    dataUrl: String(x.dataUrl || ""),
    filename: x.filename ? String(x.filename) : undefined,
    mime: String(x.mime || ""),
    size: Number(x.size || 0),
  };
}

// ✅ ensure unique indexes for badgeNo + adhaarNumber (only when non-empty)
async function ensureIndexes(db: any) {
  const col = db.collection(COLLECTION);

  await col.createIndex(
    { badgeNo: 1 },
    {
      unique: true,
      name: "uniq_badgeNo",
      partialFilterExpression: { badgeNo: { $type: "string", $ne: "" } },
    }
  );

  await col.createIndex(
    { adhaarNumber: 1 },
    {
      unique: true,
      name: "uniq_adhaarNumber",
      partialFilterExpression: { adhaarNumber: { $type: "string", $ne: "" } },
    }
  );
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const oid = toObjectId(id);
    if (!oid)
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const body = await req.json();

    const name = String(body.name || "").trim();
    const badgeNo = String(body.badgeNo || "").trim();
    const adhaarNumber = digitsOnly(body.adhaarNumber || "").slice(0, 12);

    const fatherOrHusbandName = String(body.fatherOrHusbandName || "").trim();
    const gender = String(body.gender || "").trim(); // M/F/Other
    const address = String(body.address || "").trim();
    const mobile = digitsOnly(body.mobile || "");
    const blacklisted = String(body.blacklisted || "No").trim();

    const department = String(body.department || "").trim();

    // ✅ DOB handling (optional)
    const hasDob = Object.prototype.hasOwnProperty.call(body, "dob");
    const dob =
      hasDob && String(body.dob || "").trim() === ""
        ? null
        : hasDob
        ? parseDob(body.dob)
        : undefined;

    const legacyAge =
      body.age === "" || body.age === null || body.age === undefined
        ? null
        : Number(body.age);

    // ✅ REQUIRED fields
    if (!name)
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!fatherOrHusbandName)
      return NextResponse.json(
        { error: "Father/Husband Name is required" },
        { status: 400 }
      );
    if (!gender)
      return NextResponse.json(
        { error: "Gender is required" },
        { status: 400 }
      );
    if (!address)
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    if (!mobile)
      return NextResponse.json(
        { error: "Mobile is required" },
        { status: 400 }
      );

    if (!badgeNo && !adhaarNumber) {
      return NextResponse.json(
        { error: "Either Badge No or Aadhaar must be filled" },
        { status: 400 }
      );
    }

    if (adhaarNumber && adhaarNumber.length !== 12) {
      return NextResponse.json(
        { error: "Aadhaar must be exactly 12 digits (if provided)" },
        { status: 400 }
      );
    }

    if (!["M", "F", "Other"].includes(gender)) {
      return NextResponse.json(
        { error: "Gender must be M, F, or Other" },
        { status: 400 }
      );
    }

    if (blacklisted && !["Yes", "No"].includes(blacklisted)) {
      return NextResponse.json(
        { error: "Blacklisted must be Yes or No" },
        { status: 400 }
      );
    }

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

    const hasPassport = Object.prototype.hasOwnProperty.call(body, "passportPhoto");
    const hasAadhaarFront = Object.prototype.hasOwnProperty.call(body, "aadhaarFrontPhoto");
    const hasAadhaarBack = Object.prototype.hasOwnProperty.call(body, "aadhaarBackPhoto");
    const hasMedical = Object.prototype.hasOwnProperty.call(body, "medicalPhoto");

    if (hasPassport && !isValidImgData(body.passportPhoto)) {
      return NextResponse.json({ error: "Invalid passport photo payload" }, { status: 400 });
    }
    if (hasAadhaarFront && !isValidImgData(body.aadhaarFrontPhoto)) {
      return NextResponse.json({ error: "Invalid Aadhaar front photo payload" }, { status: 400 });
    }
    if (hasAadhaarBack && !isValidImgData(body.aadhaarBackPhoto)) {
      return NextResponse.json({ error: "Invalid Aadhaar back photo payload" }, { status: 400 });
    }
    if (hasMedical && !isValidImgData(body.medicalPhoto)) {
      return NextResponse.json({ error: "Invalid medical photo payload" }, { status: 400 });
    }

    const db = await getDb();
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (customers PUT):", e?.message || e);
    }

    const col = db.collection(COLLECTION);

    // ✅ Pre-check duplicates (exclude current doc)
    if (badgeNo) {
      const existing = await col.findOne(
        { badgeNo, _id: { $ne: oid } },
        { projection: { _id: 1 } }
      );
      if (existing) {
        return NextResponse.json(
          { error: "Badge No already exists in database." },
          { status: 409 }
        );
      }
    }

    if (adhaarNumber) {
      const existing = await col.findOne(
        { adhaarNumber, _id: { $ne: oid } },
        { projection: { _id: 1 } }
      );
      if (existing) {
        return NextResponse.json(
          { error: "Aadhaar already exists in database." },
          { status: 409 }
        );
      }
    }

    // ✅ Compute age if DOB provided, else if age provided, validate and set.
    let ageToSet: number | undefined = undefined;

    if (dob instanceof Date) {
      const computed = calcAgeFromDob(dob);
      if (computed <= 0 || computed > 120) {
        return NextResponse.json(
          { error: "Age must be 1–120 (based on DOB)." },
          { status: 400 }
        );
      }
      ageToSet = computed;
    } else if (hasDob && dob === null) {
      // DOB cleared => require age
      if (legacyAge === null || Number.isNaN(legacyAge) || legacyAge <= 0 || legacyAge > 120) {
        return NextResponse.json(
          { error: "Age is required (DOB cleared). Provide Age 1–120." },
          { status: 400 }
        );
      }
      ageToSet = legacyAge;
    } else if (legacyAge !== null && !Number.isNaN(legacyAge)) {
      if (legacyAge <= 0 || legacyAge > 120) {
        return NextResponse.json({ error: "Age must be 1–120." }, { status: 400 });
      }
      ageToSet = legacyAge;
    }

    const update: any = {
      name,
      badgeNo,
      fatherOrHusbandName,
      gender,
      address,
      mobile,
      adhaarNumber: adhaarNumber || "",
      department: department || "",
      blacklisted: blacklisted || "No",
      emergencyNumber: digitsOnly(body.emergencyNumber || ""),
      medicalDate,
      notes: String(body.notes || "").trim(),
      updatedAt: new Date(),
    };

    if (ageToSet !== undefined) update.age = ageToSet;

    if (hasDob) {
      if (dob === null) update.dob = null;
      else if (dob instanceof Date) update.dob = dob;
      else return NextResponse.json({ error: "Invalid DOB (use YYYY-MM-DD)" }, { status: 400 });
    }

    if (hasPassport) update.passportPhoto = pickImg(body.passportPhoto);
    if (hasAadhaarFront) update.aadhaarFrontPhoto = pickImg(body.aadhaarFrontPhoto);
    if (hasAadhaarBack) update.aadhaarBackPhoto = pickImg(body.aadhaarBackPhoto);
    if (hasMedical) update.medicalPhoto = pickImg(body.medicalPhoto);

    delete update._id;

    const result = await col.updateOne({ _id: oid }, { $set: update });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PUT error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const oid = toObjectId(id);
    if (!oid)
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: oid });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

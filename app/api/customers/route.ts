import { NextResponse } from "next/server";
import { getDb } from "../../lib/mongodb";

const COLLECTION = "customers";

// ✅ UPDATED: Department dropdown values (same as UI)
const DEPARTMENTS = [
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
  
] as const;

function toNum(v: any) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D/g, "");
}

function normDept(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return DEPARTMENTS.includes(s as any) ? s : "";
}

// ✅ image validation for compressed dataUrl payload
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

  // allow only webp/jpeg payload from your compressor
  if (!["image/webp", "image/jpeg"].includes(x.mime)) return false;

  // must be a dataURL
  if (!x.dataUrl.startsWith("data:image/")) return false;

  // small-ish cap (prevents huge base64 saving in DB)
  // 1.2MB compressed is already too big for your use case
  if (x.size > 1_200_000) return false;

  // optional filename ok
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

// ✅ Ensure unique indexes for badgeNo + adhaarNumber (only when non-empty)
// NOTE: if your DB already contains duplicates, createIndex will FAIL.
// We still do a manual pre-check (below) so duplicates cannot be inserted.
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const gender = (searchParams.get("gender") || "").trim();
    const blacklisted = (searchParams.get("blacklisted") || "").trim();
    const department = (searchParams.get("department") || "").trim();
    const ageMin = toNum(searchParams.get("ageMin"));
    const ageMax = toNum(searchParams.get("ageMax"));
    const medFrom = (searchParams.get("medFrom") || "").trim();
    const medTo = (searchParams.get("medTo") || "").trim();

    // ✅ limit support (needed for Export All)
    const limitRaw = toNum(searchParams.get("limit"));
    const limit = Math.min(Math.max(limitRaw ?? 200, 1), 10000);

    const filter: any = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { adhaarNumber: { $regex: q, $options: "i" } },
        { badgeNo: { $regex: q, $options: "i" } },
        { department: { $regex: q, $options: "i" } },
      ];
    }

    if (gender) filter.gender = gender;
    if (blacklisted) filter.blacklisted = blacklisted;

    // ✅ department filter (exact match)
    if (department) filter.department = department;

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

    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (customers GET):", e?.message || e);
    }

    const items = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const safeItems = items.map((x: any) => ({
      ...x,
      _id: x._id?.toString?.() ?? String(x._id),
    }));

    return NextResponse.json({ items: safeItems, departments: DEPARTMENTS });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const badgeNo = String(body.badgeNo || "").trim();
    const adhaarNumber = digitsOnly(body.adhaarNumber || "").slice(0, 12);

    const fatherOrHusbandName = String(body.fatherOrHusbandName || "").trim();
    const gender = String(body.gender || "").trim();
    const address = String(body.address || "").trim();
    const mobile = digitsOnly(body.mobile || "");
    const blacklisted = String(body.blacklisted || "No").trim();

    const department = normDept(body.department || "");

    const age =
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

    if (age === null || Number.isNaN(age) || age <= 0) {
      return NextResponse.json(
        { error: "Age is required and must be valid" },
        { status: 400 }
      );
    }

    // ✅ Badge OR Aadhaar required
    if (!badgeNo && !adhaarNumber) {
      return NextResponse.json(
        { error: "Either Badge No or Aadhaar must be filled" },
        { status: 400 }
      );
    }

    // ✅ Aadhaar must be 12 digits if provided
    if (adhaarNumber && adhaarNumber.length !== 12) {
      return NextResponse.json(
        { error: "Aadhaar must be exactly 12 digits (if provided)" },
        { status: 400 }
      );
    }

    // ✅ Gender allowed values
    if (!["M", "F", "Other"].includes(gender)) {
      return NextResponse.json(
        { error: "Gender must be M, F, or Other" },
        { status: 400 }
      );
    }

    // ✅ Blacklisted allowed values
    if (blacklisted && !["Yes", "No"].includes(blacklisted)) {
      return NextResponse.json(
        { error: "Blacklisted must be Yes or No" },
        { status: 400 }
      );
    }

    // ✅ Department allowed values (if provided)
    const rawDept = String(body.department || "").trim();
    if (rawDept && !department) {
      return NextResponse.json(
        { error: `Department must be one of: ${DEPARTMENTS.join(", ")}` },
        { status: 400 }
      );
    }

    const medicalDate = body.medicalDate ? new Date(String(body.medicalDate)) : null;
    if (body.medicalDate && (medicalDate === null || Number.isNaN(medicalDate.getTime()))) {
      return NextResponse.json({ error: "Invalid medical date" }, { status: 400 });
    }

    // ✅ validate image payloads (compressed from UI)
    const passportPhoto = body.passportPhoto ?? null;
    const aadhaarFrontPhoto = body.aadhaarFrontPhoto ?? null;
    const aadhaarBackPhoto = body.aadhaarBackPhoto ?? null;
    const medicalPhoto = body.medicalPhoto ?? null;

    if (!isValidImgData(passportPhoto))
      return NextResponse.json({ error: "Invalid passport photo payload" }, { status: 400 });
    if (!isValidImgData(aadhaarFrontPhoto))
      return NextResponse.json({ error: "Invalid Aadhaar front photo payload" }, { status: 400 });
    if (!isValidImgData(aadhaarBackPhoto))
      return NextResponse.json({ error: "Invalid Aadhaar back photo payload" }, { status: 400 });
    if (!isValidImgData(medicalPhoto))
      return NextResponse.json({ error: "Invalid medical photo payload" }, { status: 400 });

    const db = await getDb();

    // ✅ try to ensure indexes (may fail if DB already has duplicates)
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (customers POST):", e?.message || e);
    }

    // ✅ NEW: manual uniqueness check (works even if indexes failed due to existing duplicates)
    // (Also makes error message immediate and clear)
    const col = db.collection(COLLECTION);

    if (badgeNo) {
      const existsBadge = await col.findOne(
        { badgeNo },
        { projection: { _id: 1 } }
      );
      if (existsBadge) {
        return NextResponse.json({ error: "Badge No already exists." }, { status: 409 });
      }
    }

    if (adhaarNumber) {
      const existsAadhaar = await col.findOne(
        { adhaarNumber },
        { projection: { _id: 1 } }
      );
      if (existsAadhaar) {
        return NextResponse.json({ error: "Aadhaar already exists." }, { status: 409 });
      }
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
      department: department || "",
      blacklisted: blacklisted || "No",
      emergencyNumber: digitsOnly(body.emergencyNumber || ""),
      medicalDate,
      notes: String(body.notes || "").trim(),

      // ✅ store compressed images (dataUrl + meta)
      passportPhoto: pickImg(passportPhoto),
      aadhaarFrontPhoto: pickImg(aadhaarFrontPhoto),
      aadhaarBackPhoto: pickImg(aadhaarBackPhoto),
      medicalPhoto: pickImg(medicalPhoto),

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const result = await col.insertOne(doc);

      return NextResponse.json(
        { ok: true, id: result.insertedId.toString() },
        { status: 201 }
      );
    } catch (err: any) {
      // ✅ duplicate badge/aadhaar handling (in case of concurrency when index exists)
      if (err?.code === 11000) {
        const msg =
          err?.keyPattern?.badgeNo
            ? "Badge No already exists."
            : err?.keyPattern?.adhaarNumber
            ? "Aadhaar already exists."
            : "Badge No / Aadhaar already exists.";

        return NextResponse.json({ error: msg }, { status: 409 });
      }

      throw err;
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

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
 
  "Medical",
  "VIP Block",
  "Langar",
  "Guest-House",
  "English-Satsang",
  "Painting"

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

function escapeRegex(s: string) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * ✅ Normalize date input to YYYY-MM-DD string.
 * Supports:
 * - "YYYY-MM-DD"
 * - "DD/MM/YYYY"
 * - Date object
 * - ISO strings like "2025-02-06T00:00:00.000Z"
 * - Mongo Extended JSON: {$date: "..."} or {$date: {$numberLong:"..."}}
 */
function toYMD(v: any) {
  if (!v) return "";

  try {
    // Mongo Extended JSON
    const d1 = (v as any)?.$date;
    if (d1) {
      if (typeof d1 === "string") {
        const dt = new Date(d1);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
      if (typeof d1 === "number") {
        const dt = new Date(d1);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
      if (typeof d1 === "object" && (d1 as any)?.$numberLong) {
        const n = Number(String((d1 as any).$numberLong));
        const dt = new Date(n);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
    }
  } catch {
    // ignore
  }

  // Date object
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    return v.toISOString().slice(0, 10);
  }

  const s = String(v ?? "").trim();
  if (!s) return "";

  // Already YYYY-MM-DD or YYYY-MM-DDTHH:mm...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback parse
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return "";
}

// ✅ Parse DOB safely (store as Date at UTC midnight)
function parseDob(dobLike: any): Date | null {
  const ymd = toYMD(dobLike);
  if (!ymd) return null;

  // Must be YYYY-MM-DD at this point
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;

  const d = new Date(ymd + "T00:00:00.000Z");
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

function dobToYmd(dob: any) {
  if (!dob) return "";
  return toYMD(dob);
}

// ✅ Build inclusive day range [start, nextDay) for YYYY-MM-DD
function ymdToUtcRange(ymd: string): { start: Date; end: Date } | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const start = new Date(ymd + "T00:00:00.000Z");
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
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

  // size cap to protect DB/server
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const qRaw = (searchParams.get("q") || "").trim();
    const gender = (searchParams.get("gender") || "").trim();
    const blacklisted = (searchParams.get("blacklisted") || "").trim();
    const department = (searchParams.get("department") || "").trim();
    const ageMin = toNum(searchParams.get("ageMin"));
    const ageMax = toNum(searchParams.get("ageMax"));
    const medFromRaw = (searchParams.get("medFrom") || "").trim();
    const medToRaw = (searchParams.get("medTo") || "").trim();

    // ✅ limit support (needed for Export All)
    const limitRaw = toNum(searchParams.get("limit"));
    const limit = Math.min(Math.max(limitRaw ?? 200, 1), 10000);

    const filter: any = {};

    if (qRaw) {
      // ✅ safer regex (prevents regex injection + weird crashes on special chars)
      const q = escapeRegex(qRaw);
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { adhaarNumber: { $regex: q, $options: "i" } },
        { badgeNo: { $regex: q, $options: "i" } },
        { department: { $regex: q, $options: "i" } },
      ];

      // ✅ If q is a date (YYYY-MM-DD), also match DOB/MedicalDate for that day
      if (/^\d{4}-\d{2}-\d{2}$/.test(qRaw)) {
        const r = ymdToUtcRange(qRaw);
        if (r) {
          filter.$or.push({ dob: { $gte: r.start, $lt: r.end } });
          filter.$or.push({ medicalDate: { $gte: r.start, $lt: r.end } });
        }
      }
    }

    if (gender) filter.gender = gender;
    if (blacklisted) filter.blacklisted = blacklisted;

    if (department) filter.department = department;

    // NOTE: ageMin/ageMax still filter on stored age for now (compat).
    // If you want ageMin/ageMax to be based on DOB too, we can switch to an aggregation pipeline.
    if (ageMin !== undefined || ageMax !== undefined) {
      filter.age = {};
      if (ageMin !== undefined) filter.age.$gte = ageMin;
      if (ageMax !== undefined) filter.age.$lte = ageMax;
    }

    // ✅ Medical date filter (inclusive by day for YYYY-MM-DD)
    if (medFromRaw || medToRaw) {
      const fromYmd = toYMD(medFromRaw);
      const toYmd = toYMD(medToRaw);

      filter.medicalDate = {};

      if (fromYmd) {
        const r = ymdToUtcRange(fromYmd);
        if (r) filter.medicalDate.$gte = r.start;
      }
      if (toYmd) {
        const r = ymdToUtcRange(toYmd);
        if (r) filter.medicalDate.$lt = r.end; // end-exclusive => includes whole toYmd day
      }

      // If user passed something but it didn't parse, avoid crashing:
      if (Object.keys(filter.medicalDate).length === 0) delete filter.medicalDate;
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

    // ✅ ALWAYS compute age from DOB when DOB exists (so age auto-updates every year)
    // ✅ ALWAYS return DOB as YYYY-MM-DD (string) so UI reliably shows it
    // ✅ ALSO normalize medicalDate to YYYY-MM-DD (string) or null
    const safeItems = items.map((x: any) => {
      const dobYmd = dobToYmd(x.dob);
      let age = x.age;

      if (dobYmd) {
        const dob = new Date(dobYmd + "T00:00:00.000Z");
        if (!Number.isNaN(dob.getTime())) {
          age = calcAgeFromDob(dob);
        }
      }

      const medicalYmd = toYMD(x.medicalDate);
      const medicalOut = medicalYmd ? medicalYmd : (x.medicalDate ? String(x.medicalDate) : null);

      return {
        ...x,
        _id: x._id?.toString?.() ?? String(x._id),
        dob: dobYmd || null,
        age, // ✅ returned age is dynamic (computed from dob if present)
        medicalDate: medicalYmd || (medicalOut ? String(medicalOut).slice(0, 10) : null),
      };
    });

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

    // ✅ DOB (preferred). Accepts DD/MM/YYYY too.
    const dob = parseDob(body.dob ?? body.dateOfBirth ?? "");
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

    let age: number | null = null;
    if (dob) age = calcAgeFromDob(dob);
    else age = legacyAge;

    if (age === null || Number.isNaN(age) || age <= 0 || age > 120) {
      return NextResponse.json(
        { error: "Age is required and must be valid (use DOB or Age 1–120)" },
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

    const rawDept = String(body.department || "").trim();
    if (rawDept && !department) {
      return NextResponse.json(
        { error: `Department must be one of: ${DEPARTMENTS.join(", ")}` },
        { status: 400 }
      );
    }

    const medicalDateYmd = toYMD(body.medicalDate);
    const medicalDate = medicalDateYmd ? new Date(medicalDateYmd + "T00:00:00.000Z") : null;

    if (body.medicalDate && !medicalDateYmd) {
      return NextResponse.json(
        { error: "Invalid medical date" },
        { status: 400 }
      );
    }

    const passportPhoto = body.passportPhoto ?? null;
    const aadhaarFrontPhoto = body.aadhaarFrontPhoto ?? null;
    const aadhaarBackPhoto = body.aadhaarBackPhoto ?? null;
    const medicalPhoto = body.medicalPhoto ?? null;

    if (!isValidImgData(passportPhoto))
      return NextResponse.json(
        { error: "Invalid passport photo payload" },
        { status: 400 }
      );
    if (!isValidImgData(aadhaarFrontPhoto))
      return NextResponse.json(
        { error: "Invalid Aadhaar front photo payload" },
        { status: 400 }
      );
    if (!isValidImgData(aadhaarBackPhoto))
      return NextResponse.json(
        { error: "Invalid Aadhaar back photo payload" },
        { status: 400 }
      );
    if (!isValidImgData(medicalPhoto))
      return NextResponse.json(
        { error: "Invalid medical photo payload" },
        { status: 400 }
      );

    const db = await getDb();
    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (customers POST):", e?.message || e);
    }

    const col = db.collection(COLLECTION);

    // ✅ Pre-check duplicates (friendly error instead of 11000)
    if (badgeNo) {
      const existing = await col.findOne({ badgeNo }, { projection: { _id: 1 } });
      if (existing) {
        return NextResponse.json(
          { error: "Badge No already exists in database." },
          { status: 409 }
        );
      }
    }

    if (adhaarNumber) {
      const existing = await col.findOne(
        { adhaarNumber },
        { projection: { _id: 1 } }
      );
      if (existing) {
        return NextResponse.json(
          { error: "Aadhaar already exists in database." },
          { status: 409 }
        );
      }
    }

    const doc = {
      name,
      badgeNo,
      fatherOrHusbandName,
      gender,
      age, // keep for existing pages
      dob: dob ?? null, // ✅ stored consistently (Date or null)
      address,
      mobile,
      adhaarNumber: adhaarNumber || "",
      department: department || "",
      blacklisted: blacklisted || "No",
      emergencyNumber: digitsOnly(body.emergencyNumber || ""),
      medicalDate,
      notes: String(body.notes || "").trim(),

      passportPhoto: pickImg(passportPhoto),
      aadhaarFrontPhoto: pickImg(aadhaarFrontPhoto),
      aadhaarBackPhoto: pickImg(aadhaarBackPhoto),
      medicalPhoto: pickImg(medicalPhoto),

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const result = await col.insertOne(doc);

      // ✅ IMPORTANT: return full created record so UI shows DOB immediately
      const created = await col.findOne({ _id: result.insertedId });

      const dobYmd = dobToYmd(created?.dob);
      let computedAge = created?.age;

      if (dobYmd) {
        const d = new Date(dobYmd + "T00:00:00.000Z");
        if (!Number.isNaN(d.getTime())) computedAge = calcAgeFromDob(d);
      }

      const medYmd = toYMD(created?.medicalDate);

      return NextResponse.json(
        {
          ok: true,
          item: {
            ...(created || {}),
            _id: result.insertedId.toString(),
            dob: dobYmd || null,
            age: computedAge,
            medicalDate: medYmd || null,
          },
          departments: DEPARTMENTS,
        },
        { status: 201 }
      );
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json(
          { error: "Duplicate Badge/Aadhaar detected while saving." },
          { status: 409 }
        );
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

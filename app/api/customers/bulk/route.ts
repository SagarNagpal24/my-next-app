import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/mongodb";
import * as XLSX from "xlsx";

const COLLECTION = "customers";

// ✅ UPDATED: Department list (same as UI + other APIs)
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
  | "Langar"
  | "Guest-House";

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
  "Guest-House",
];

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D/g, "");
}

function toUpperTrim(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function hasSpaceOrHyphen(v: any) {
  return /[\s-]/.test(String(v ?? ""));
}

function normKey(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function pick(row: any, keys: string[]) {
  for (const k of keys) {
    const nk = normKey(k);

    if (row[k] !== undefined && row[k] !== null) return row[k];

    for (const rk of Object.keys(row)) {
      if (normKey(rk) === nk) return row[rk];
    }
  }
  return "";
}

// ✅ Normalize any parsed Date to UTC midnight (date-only)
function normalizeToUtcMidnight(d: Date): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  return new Date(Date.UTC(y, m, day));
}

// ✅ Excel date / text date parser (always normalized to UTC midnight)
function parseExcelDate(v: any): Date | null {
  if (v === null || v === undefined || v === "") return null;

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return normalizeToUtcMidnight(v);
  }

  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
    if (Number.isNaN(dt.getTime())) return null;
    return normalizeToUtcMidnight(dt);
  }

  const s = String(v).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const dt = new Date(s + "T00:00:00.000Z");
    if (Number.isNaN(dt.getTime())) return null;
    return normalizeToUtcMidnight(dt);
  }

  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return normalizeToUtcMidnight(dt);
}

// ✅ DOB parser: accept Excel date, JS Date, or YYYY-MM-DD text
function parseDobExcel(v: any): Date | null {
  return parseExcelDate(v);
}

// ✅ Age from DOB (full years)
function calcAgeFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();

  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;

  return age;
}

type RowErr = { row: number; field: string; message: string };

function validateRow(clean: any, rowNumber: number) {
  const errors: RowErr[] = [];

  const name = String(clean.name || "").trim();
  const badgeNo = String(clean.badgeNo || "").trim();
  const aadhaar = digitsOnly(clean.adhaarNumber || "");
  const father = String(clean.fatherOrHusbandName || "").trim();
  const gender = String(clean.gender || "").trim();
  const address = String(clean.address || "").trim();
  const mobile = digitsOnly(clean.mobile || "");
  const blacklisted = String(clean.blacklisted || "No").trim();

  const dob = clean.dob as Date | null;
  const ageVal = clean.age;

  const department = String(clean.department || "").trim();

  if (!name)
    errors.push({ row: rowNumber, field: "Name", message: "Name is required." });
  if (!father)
    errors.push({
      row: rowNumber,
      field: "Father/Husband Name",
      message: "Father/Husband Name is required.",
    });
  if (!gender)
    errors.push({
      row: rowNumber,
      field: "Gender",
      message: "Gender is required.",
    });
  if (!address)
    errors.push({
      row: rowNumber,
      field: "Address",
      message: "Address is required.",
    });
  if (!mobile)
    errors.push({
      row: rowNumber,
      field: "Mobile",
      message: "Mobile is required.",
    });

  let computedAge: number | null = null;

  if (dob instanceof Date) {
    computedAge = calcAgeFromDob(dob);
    if (computedAge <= 0 || computedAge > 120) {
      errors.push({
        row: rowNumber,
        field: "DOB",
        message: "DOB results in invalid age (must be 1–120).",
      });
    }
  } else {
    if (
      ageVal === "" ||
      ageVal === null ||
      ageVal === undefined ||
      Number.isNaN(Number(ageVal))
    ) {
      errors.push({
        row: rowNumber,
        field: "Age/DOB",
        message: "Either Date of Birth (DOB) or Age is required.",
      });
    } else if (Number(ageVal) <= 0 || Number(ageVal) > 120) {
      errors.push({
        row: rowNumber,
        field: "Age",
        message: "Age must be a valid number (1–120).",
      });
    }
  }

  if (!badgeNo && !aadhaar) {
    errors.push({
      row: rowNumber,
      field: "Badge/Aadhaar",
      message: "Either Badge No or Aadhaar must be filled.",
    });
  }

  // ✅ NEW: no spaces or hyphen in badge
  if (badgeNo && hasSpaceOrHyphen(clean.badgeNo)) {
    errors.push({
      row: rowNumber,
      field: "Badge No",
      message: "No spacing or - is allowed in Badge No.",
    });
  }

  // ✅ Badge last 4 characters must be numeric (if badge is provided)
  if (badgeNo) {
    const last4 = badgeNo.slice(-4);
    if (!/^\d{4}$/.test(last4)) {
      errors.push({
        row: rowNumber,
        field: "Badge No",
        message: "Last 4 digits of Badge No must be numeric (4 digits).",
      });
    }
  }

  // ✅ NEW: no spaces or hyphen in aadhaar
  if (String(clean.adhaarNumber || "").trim() && hasSpaceOrHyphen(clean.adhaarNumber)) {
    errors.push({
      row: rowNumber,
      field: "Aadhaar",
      message: "No spacing or - is allowed in Aadhaar.",
    });
  }

  if (aadhaar && aadhaar.length !== 12) {
    errors.push({
      row: rowNumber,
      field: "Aadhaar",
      message: "Aadhaar must be exactly 12 digits (if provided).",
    });
  }

  if (gender && !["M", "F", "Other"].includes(gender)) {
    errors.push({
      row: rowNumber,
      field: "Gender",
      message: "Gender must be M, F, or Other.",
    });
  }

  if (blacklisted && !["Yes", "No"].includes(blacklisted)) {
    errors.push({
      row: rowNumber,
      field: "Blacklisted",
      message: "Blacklisted must be Yes or No.",
    });
  }

  if (department && !DEPARTMENT_OPTIONS.includes(department as any)) {
    errors.push({
      row: rowNumber,
      field: "Department",
      message: `Department must be one of: ${DEPARTMENT_OPTIONS.join(", ")}.`,
    });
  }

  return errors;
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

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Please upload an Excel file." },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file)
      return NextResponse.json({ error: "File is required." }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames?.[0];
    if (!sheetName)
      return NextResponse.json(
        { error: "No sheet found in Excel." },
        { status: 400 }
      );

    const ws = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rows.length)
      return NextResponse.json(
        { error: "Excel file is empty." },
        { status: 400 }
      );

    const toInsert: any[] = [];
    const allErrors: RowErr[] = [];

    const badgeFirstRow = new Map<string, number>();
    const aadhaarFirstRow = new Map<string, number>();
    const badgeToRows = new Map<string, number[]>();
    const aadhaarToRows = new Map<string, number[]>();

    rows.forEach((r, idx) => {
      const rowNumber = idx + 2;

      const rawAadhaarPicked = pick(r, [
        "Adhaar Number",
        "Aadhaar Number",
        "Aadhaar",
        "Aadhar",
        "Aadhar Number",
      ]);

      let aadhaarPicked = digitsOnly(rawAadhaarPicked).slice(0, 12);

      let blacklistedPicked = toUpperTrim(
        pick(r, [
          "Blacklisted",
          "Black Listed",
          "Blacklist",
          "Black list",
          "Blacklisted (Yes/No)",
        ])
      );

      const blkDigits = digitsOnly(blacklistedPicked);
      if (!aadhaarPicked && blkDigits.length === 12) {
        aadhaarPicked = blkDigits;
        blacklistedPicked = "NO";
      }

      if (!blacklistedPicked && ["YES", "NO"].includes(String(aadhaarPicked))) {
        blacklistedPicked = String(aadhaarPicked);
        aadhaarPicked = "";
      }

      const departmentPicked = toUpperTrim(
        pick(r, ["Department", "Dept", "Dept.", "Team", "Seva", "Duty"])
      );

      const dobRaw = pick(r, [
        "DOB",
        "Date of Birth",
        "Date Of Birth",
        "Birth Date",
        "Birthdate",
        "D.O.B",
      ]);
      const dobParsed = parseDobExcel(dobRaw);

      const rawBadgeNo = pick(r, ["Badge No", "Badge"]);
      const rawName = pick(r, ["Name"]);
      const rawFatherName = pick(r, [
        "Father’s / Husband’s Name",
        "Father/Husband Name",
        "Father Husband Name",
        "Father Name",
        "Husband Name",
      ]);
      const rawGender = pick(r, ["Gender"]);
      const rawAddress = pick(r, ["Address"]);
      const rawMobile = pick(r, ["Mobile", "Phone"]);
      const rawEmergency = pick(r, ["Emergency Number", "Emergency"]);
      const rawNotes = pick(r, ["Notes"]);

      const clean = {
        name: toUpperTrim(rawName),
        badgeNo: toUpperTrim(rawBadgeNo),
        fatherOrHusbandName: toUpperTrim(rawFatherName),
        gender: toUpperTrim(rawGender),
        age: pick(r, ["Age"]),
        dob: dobParsed,
        address: toUpperTrim(rawAddress),
        mobile: digitsOnly(rawMobile),
        adhaarNumber: aadhaarPicked,
        department: departmentPicked,
        blacklisted: (blacklistedPicked || "NO") as string,
        emergencyNumber: digitsOnly(rawEmergency),
        medicalDateRaw: pick(r, ["Medical Date"]),
        notes: toUpperTrim(rawNotes),

        passportPhoto: null,
        aadhaarFrontPhoto: null,
        aadhaarBackPhoto: null,
        medicalPhoto: null,

        // raw values only for validation
        _rawBadgeNo: String(rawBadgeNo ?? ""),
        _rawAadhaar: String(rawAadhaarPicked ?? ""),
      };

      if (
        dobRaw !== null &&
        dobRaw !== undefined &&
        String(dobRaw).trim() !== "" &&
        !dobParsed
      ) {
        allErrors.push({
          row: rowNumber,
          field: "DOB",
          message: "Invalid DOB. Use a valid date (Excel date or YYYY-MM-DD).",
        });
        return;
      }

      const errs = validateRow(
        {
          ...clean,
          adhaarNumber: clean.adhaarNumber,
          age: clean.age,
          department: clean.department,
          dob: clean.dob,
          badgeNo: clean.badgeNo,
          blacklisted:
            clean.blacklisted === "YES"
              ? "Yes"
              : clean.blacklisted === "NO"
              ? "No"
              : clean.blacklisted,
          _rawBadgeNo: clean._rawBadgeNo,
          _rawAadhaar: clean._rawAadhaar,
        },
        rowNumber
      );

      const b = String(clean.badgeNo || "").trim();
      const a = digitsOnly(clean.adhaarNumber || "");

      if (b) {
        if (badgeFirstRow.has(b)) {
          errs.push({
            row: rowNumber,
            field: "Badge No",
            message: `Duplicate Badge No in Excel (already in row ${badgeFirstRow.get(
              b
            )}).`,
          });
        } else {
          badgeFirstRow.set(b, rowNumber);
        }
        badgeToRows.set(b, [...(badgeToRows.get(b) || []), rowNumber]);
      }

      if (a) {
        if (aadhaarFirstRow.has(a)) {
          errs.push({
            row: rowNumber,
            field: "Aadhaar",
            message: `Duplicate Aadhaar in Excel (already in row ${aadhaarFirstRow.get(
              a
            )}).`,
          });
        } else {
          aadhaarFirstRow.set(a, rowNumber);
        }
        aadhaarToRows.set(a, [...(aadhaarToRows.get(a) || []), rowNumber]);
      }

      const md = parseExcelDate(clean.medicalDateRaw);
      if (clean.medicalDateRaw && String(clean.medicalDateRaw).trim() !== "" && !md) {
        errs.push({
          row: rowNumber,
          field: "Medical Date",
          message: "Invalid Medical Date.",
        });
      }

      if (errs.length) {
        allErrors.push(...errs);
        return;
      }

      const finalAge =
        clean.dob instanceof Date ? calcAgeFromDob(clean.dob) : Number(clean.age);

      toInsert.push({
        name: clean.name,
        badgeNo: clean.badgeNo || "",
        fatherOrHusbandName: clean.fatherOrHusbandName,
        gender: clean.gender,
        age: finalAge,
        dob: clean.dob ?? null,
        address: clean.address,
        mobile: clean.mobile,
        adhaarNumber: clean.adhaarNumber || "",
        department: clean.department || "",
        blacklisted:
          clean.blacklisted === "YES"
            ? "Yes"
            : clean.blacklisted === "NO"
            ? "No"
            : clean.blacklisted || "No",
        emergencyNumber: clean.emergencyNumber || "",
        medicalDate: md ? md : null,
        notes: clean.notes || "",

        passportPhoto: null,
        aadhaarFrontPhoto: null,
        aadhaarBackPhoto: null,
        medicalPhoto: null,

        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    if (allErrors.length) {
      return NextResponse.json(
        {
          error: "Validation failed. Fix the errors and upload again.",
          errors: allErrors.slice(0, 500),
          totalErrors: allErrors.length,
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    try {
      await ensureIndexes(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (bulk customers):", e?.message || e);
    }

    const col = db.collection(COLLECTION);

    const badgeList = Array.from(badgeToRows.keys());
    const aadhaarList = Array.from(aadhaarToRows.keys());

    const dupErrors: RowErr[] = [];

    if (badgeList.length) {
      const existingBadges = await col
        .find({ badgeNo: { $in: badgeList } }, { projection: { badgeNo: 1 } })
        .toArray();

      for (const x of existingBadges) {
        const b = String((x as any).badgeNo || "").trim().toUpperCase();
        const rowsForB = badgeToRows.get(b) || [];
        for (const rn of rowsForB) {
          dupErrors.push({
            row: rn,
            field: "Badge No",
            message: "Badge No already exists in database.",
          });
        }
      }
    }

    if (aadhaarList.length) {
      const existingAadhaar = await col
        .find(
          { adhaarNumber: { $in: aadhaarList } },
          { projection: { adhaarNumber: 1 } }
        )
        .toArray();

      for (const x of existingAadhaar) {
        const a = String((x as any).adhaarNumber || "").trim();
        const rowsForA = aadhaarToRows.get(a) || [];
        for (const rn of rowsForA) {
          dupErrors.push({
            row: rn,
            field: "Aadhaar",
            message: "Aadhaar already exists in database.",
          });
        }
      }
    }

    if (dupErrors.length) {
      return NextResponse.json(
        {
          error: "Duplicate Badge/Aadhaar found in database. Fix and upload again.",
          errors: dupErrors.slice(0, 500),
          totalErrors: dupErrors.length,
        },
        { status: 409 }
      );
    }

    try {
      const result = await col.insertMany(toInsert, { ordered: true });

      return NextResponse.json(
        { ok: true, inserted: result.insertedCount },
        { status: 201 }
      );
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json(
          {
            error: "Duplicate Badge/Aadhaar detected while saving. Please try again.",
          },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (e: any) {
    console.error("Bulk upload error:", e?.message || e, e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
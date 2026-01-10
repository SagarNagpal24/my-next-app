import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/mongodb";
import * as XLSX from "xlsx";

const COLLECTION = "customers";

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D/g, "");
}

function normKey(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function pick(row: any, keys: string[]) {
  for (const k of keys) {
    const nk = normKey(k);

    // direct hit
    if (row[k] !== undefined && row[k] !== null) return row[k];

    // normalized match
    for (const rk of Object.keys(row)) {
      if (normKey(rk) === nk) return row[rk];
    }
  }
  return "";
}

function parseExcelDate(v: any): Date | null {
  if (v === null || v === undefined || v === "") return null;

  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;

  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  const s = String(v).trim();
  if (!s) return null;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
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
  const ageVal = clean.age;

  // ✅ Mandatory fields
  if (!name) errors.push({ row: rowNumber, field: "Name", message: "Name is required." });
  if (!father) errors.push({ row: rowNumber, field: "Father/Husband Name", message: "Father/Husband Name is required." });
  if (!gender) errors.push({ row: rowNumber, field: "Gender", message: "Gender is required." });
  if (!address) errors.push({ row: rowNumber, field: "Address", message: "Address is required." });
  if (!mobile) errors.push({ row: rowNumber, field: "Mobile", message: "Mobile is required." });

  // ✅ Age mandatory + valid
  if (ageVal === "" || ageVal === null || ageVal === undefined || Number.isNaN(Number(ageVal))) {
    errors.push({ row: rowNumber, field: "Age", message: "Age is required." });
  } else if (Number(ageVal) <= 0) {
    errors.push({ row: rowNumber, field: "Age", message: "Age must be a valid number." });
  }

  // ✅ Badge OR Aadhaar mandatory
  if (!badgeNo && !aadhaar) {
    errors.push({ row: rowNumber, field: "Badge/Aadhaar", message: "Either Badge No or Aadhaar must be filled." });
  }

  // ✅ Aadhaar must be 12 digits if present
  if (aadhaar && aadhaar.length !== 12) {
    errors.push({ row: rowNumber, field: "Aadhaar", message: "Aadhaar must be exactly 12 digits (if provided)." });
  }

  // ✅ Gender allowed values
  if (gender && !["M", "F", "Other"].includes(gender)) {
    errors.push({ row: rowNumber, field: "Gender", message: "Gender must be M, F, or Other." });
  }

  // ✅ Blacklisted allowed values
  if (blacklisted && !["Yes", "No"].includes(blacklisted)) {
    errors.push({ row: rowNumber, field: "Blacklisted", message: "Blacklisted must be Yes or No." });
  }

  return errors;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Please upload an Excel file." }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "File is required." }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames?.[0];
    if (!sheetName) return NextResponse.json({ error: "No sheet found in Excel." }, { status: 400 });

    const ws = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rows.length) return NextResponse.json({ error: "Excel file is empty." }, { status: 400 });

    const toInsert: any[] = [];
    const allErrors: RowErr[] = [];

    rows.forEach((r, idx) => {
      const rowNumber = idx + 2; // header row is 1

      // ✅ header-safe picks (includes common variants)
      let aadhaarPicked = digitsOnly(pick(r, ["Adhaar Number", "Aadhaar Number", "Aadhaar", "Aadhar", "Aadhar Number"])).slice(0, 12);
      let blacklistedPicked = String(
        pick(r, ["Blacklisted", "Black Listed", "Blacklist", "Black list", "Blacklisted (Yes/No)"])
      ).trim();

      // ✅ DEFENSIVE FIX (prevents your screenshot issue):
      // If blacklisted column mistakenly contains Aadhaar (12 digits) and Aadhaar column is empty
      const blkDigits = digitsOnly(blacklistedPicked);
      if (!aadhaarPicked && blkDigits.length === 12) {
        aadhaarPicked = blkDigits;
        blacklistedPicked = "No";
      }

      // If Aadhaar column accidentally has Yes/No and blacklisted is empty, swap
      if (!blacklistedPicked && ["Yes", "No"].includes(String(aadhaarPicked))) {
        blacklistedPicked = String(aadhaarPicked);
        aadhaarPicked = "";
      }

      const clean = {
        name: String(pick(r, ["Name"])).trim(),
        badgeNo: String(pick(r, ["Badge No", "Badge"])).trim(),
        fatherOrHusbandName: String(
          pick(r, ["Father’s / Husband’s Name", "Father/Husband Name", "Father Husband Name", "Father Name", "Husband Name"])
        ).trim(),
        gender: String(pick(r, ["Gender"])).trim(),
        age: pick(r, ["Age"]),
        address: String(pick(r, ["Address"])).trim(),
        mobile: digitsOnly(pick(r, ["Mobile", "Phone"])),
        adhaarNumber: aadhaarPicked,
        blacklisted: (blacklistedPicked || "No") as "Yes" | "No" | string,
        emergencyNumber: digitsOnly(pick(r, ["Emergency Number", "Emergency"])),
        medicalDateRaw: pick(r, ["Medical Date"]),
        notes: String(pick(r, ["Notes"])).trim(),
      };

      const errs = validateRow(
        { ...clean, adhaarNumber: clean.adhaarNumber, age: clean.age },
        rowNumber
      );

      const md = parseExcelDate(clean.medicalDateRaw);
      if (clean.medicalDateRaw && !md) {
        errs.push({ row: rowNumber, field: "Medical Date", message: "Invalid Medical Date." });
      }

      if (errs.length) {
        allErrors.push(...errs);
        return;
      }

      toInsert.push({
        name: clean.name,
        badgeNo: clean.badgeNo || "",
        fatherOrHusbandName: clean.fatherOrHusbandName,
        gender: clean.gender,
        age: Number(clean.age),
        address: clean.address,
        mobile: clean.mobile,
        adhaarNumber: clean.adhaarNumber || "",
        blacklisted: clean.blacklisted || "No",
        emergencyNumber: clean.emergencyNumber || "",
        medicalDate: md ? md : null,
        notes: clean.notes || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // ✅ ALL OR NOTHING
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
    const result = await db.collection(COLLECTION).insertMany(toInsert, { ordered: true });

    return NextResponse.json({ ok: true, inserted: result.insertedCount }, { status: 201 });
  } catch (e: any) {
    console.error("Bulk upload error:", e?.message || e, e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

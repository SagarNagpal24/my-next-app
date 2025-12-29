import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "customers";

function cleanStr(v: any) {
  return String(v ?? "").trim();
}

function toISODate(value: any): Date | null {
  if (!value) return null;

  // If Excel date number
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }

  // If string like "YYYY-MM-DD"
  const s = cleanStr(value);
  if (!s) return null;
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Excel file is required (field name: file)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: "array" });

    const sheetName = wb.SheetNames[0];
    if (!sheetName) return NextResponse.json({ error: "No sheet found in Excel" }, { status: 400 });

    const ws = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rows.length) {
      return NextResponse.json({ error: "Excel has no data rows" }, { status: 400 });
    }

    // Expect these columns (matching the sample)
    const required = ["Name"];
    for (const r of required) {
      if (!(r in rows[0])) {
        return NextResponse.json({ error: `Missing column "${r}". Download sample and use same headers.` }, { status: 400 });
      }
    }

    const docs = rows
      .map((r) => {
        const name = cleanStr(r["Name"]);
        if (!name) return null;

        const ageRaw = cleanStr(r["Age"]);
        const age = ageRaw ? Number(ageRaw) : null;

        return {
          name,
          badgeNo: cleanStr(r["Badge No"]),
          fatherOrHusbandName: cleanStr(r["Father’s / Husband’s Name"]),
          gender: cleanStr(r["Gender"]),
          age: Number.isFinite(age as number) ? age : null,
          address: cleanStr(r["Address"]),
          mobile: cleanStr(r["Mobile"]),
          adhaarNumber: cleanStr(r["Adhaar Number"]),
          emergencyNumber: cleanStr(r["Emergency Number"]),
          medicalDate: toISODate(r["Medical Date"]),
          notes: cleanStr(r["Notes"]),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      })
      .filter(Boolean) as any[];

    if (!docs.length) {
      return NextResponse.json({ error: "No valid rows found (Name is required)." }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION).insertMany(docs);

    return NextResponse.json({
      ok: true,
      inserted: result.insertedCount,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bulk upload failed" }, { status: 500 });
  }
}

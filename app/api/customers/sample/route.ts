import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  // ✅ Keep these in sync with bulk + customers routes
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
    "Sangat",
  ];

  const GENDERS = ["M", "F", "Other"];
  const YES_NO = ["Yes", "No"];

  // ✅ Column headers MUST match bulk validation (pick() keys)
  const headers = [
    "Name",
    "Badge No",
    "Adhaar Number",
    "Father’s / Husband’s Name",
    "Gender",
    "Age",
    "Address",
    "Mobile",
    "Department",
    "Blacklisted",
    "Emergency Number",
    "Medical Date",
    "Notes",

    // ✅ NOTE (IMPORTANT):
    // Bulk Excel does NOT support photo columns.
    // Photos are uploaded from Add/Edit UI only.
  ];

  // ✅ Example row – valid
  const exampleRow = [
    "Ravi Kumar",
    "B123",
    "123456789012",
    "Suresh Kumar",
    "M",
    32,
    "Patel Nagar, Delhi",
    "9876543210",
    "Security",
    "No",
    "9812345678",
    "2025-12-29",
    "Sample note",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  // ✅ Add dropdowns in Excel via Data Validation
  const maxRows = 2000;

  const colIndex = (headerName: string) => headers.indexOf(headerName); // 0-based
  const toColLetter = (n: number) => {
    let s = "";
    let x = n + 1;
    while (x > 0) {
      const r = (x - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  };

  const makeRange = (headerName: string) => {
    const idx = colIndex(headerName);
    const col = toColLetter(idx);
    return `${col}2:${col}${maxRows}`;
  };

  // XLSX supports worksheet data validations with "ws['!dataValidation']"
  (ws as any)["!dataValidation"] = [
    {
      sqref: makeRange("Gender"),
      type: "list",
      allowBlank: true,
      showInputMessage: true,
      showErrorMessage: true,
      errorTitle: "Invalid Gender",
      error: `Allowed: ${GENDERS.join(", ")}`,
      formula1: `"${GENDERS.join(",")}"`,
    },
    {
      sqref: makeRange("Department"),
      type: "list",
      allowBlank: true,
      showInputMessage: true,
      showErrorMessage: true,
      errorTitle: "Invalid Department",
      error: `Allowed: ${DEPARTMENTS.join(", ")}`,
      formula1: `"${DEPARTMENTS.join(",")}"`,
    },
    {
      sqref: makeRange("Blacklisted"),
      type: "list",
      allowBlank: true,
      showInputMessage: true,
      showErrorMessage: true,
      errorTitle: "Invalid Blacklisted",
      error: `Allowed: ${YES_NO.join(", ")}`,
      formula1: `"${YES_NO.join(",")}"`,
    },
  ];

  // ✅ Optional: reference sheet
  const wsLists = XLSX.utils.aoa_to_sheet([
    ["Allowed Values"],
    ["Gender", ...GENDERS],
    ["Department", ...DEPARTMENTS],
    ["Blacklisted", ...YES_NO],
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sangat");
  XLSX.utils.book_append_sheet(wb, wsLists, "Lists");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sangat_sample.xlsx"`,
    },
  });
}

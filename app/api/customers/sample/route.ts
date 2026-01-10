import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  // ✅ Column headers MUST exactly match bulk validation
  const headers = [
    "Name",
    "Badge No",
    "Adhaar Number",
    "Father’s / Husband’s Name",
    "Gender",
    "Age",
    "Address",
    "Mobile",
    "Blacklisted",
    "Emergency Number",
    "Medical Date",
    "Notes",
  ];

  // ✅ Example row – fully valid as per rules
  const exampleRow = [
    "Ravi Kumar",          // Name (required)
    "B123",                // Badge No (OR Aadhaar)
    "123456789012",        // Aadhaar (OR Badge)
    "Suresh Kumar",        // Father/Husband Name (required)
    "M",                   // Gender (M / F / Other only)
    32,                    // Age (required, > 0)
    "Patel Nagar, Delhi",  // Address (required)
    "9876543210",          // Mobile (required, digits only)
    "No",                  // Blacklisted (Yes / No)
    "9812345678",          // Emergency Number (optional)
    "2025-12-29",          // Medical Date (YYYY-MM-DD)
    "Sample note",         // Notes
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="customers_sample.xlsx"`,
    },
  });
}

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  // Column headers exactly as you want in Excel
  const headers = [
    "Name",
    "Badge No",
    "Father’s / Husband’s Name",
    "Gender",
    "Age",
    "Address",
    "Mobile",
    "Adhaar Number",
    "Emergency Number",
    "Medical Date",
    "Notes",
  ];

  // Add 1 example row (optional)
  const exampleRow = [
    "Ravi Kumar",
    "B123",
    "Suresh Kumar",
    "Male",
    32,
    "Patel Nagar",
    "+919876543210",
    "123412341234",
    "+919812345678",
    "2025-12-29",
    "Sample note",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Jatha");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Sangat_sample.xlsx"`,
    },
  });
}

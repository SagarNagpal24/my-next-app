import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "trainData";

function cleanSeat(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function toISODate10(v: any) {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  if (!s) return "";
  return s.slice(0, 10);
}

function toNumRequired(v: any) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type RowErr = { row: number; field: string; message: string };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!rows.length) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const errors: RowErr[] = [];
    const docs: any[] = [];

    rows.forEach((r: any, idx: number) => {
      const rowNumber = idx + 2; // excel data row (header=1)

      const name = String(r.name ?? "").trim();
      const age = toNumRequired(r.age);
      const gender = String(r.gender ?? "").trim();

      const seatNumber = cleanSeat(r.seatNumber);
      const pnrNumber = String(r.pnrNumber ?? "").trim();

      const trainName = String(r.trainName ?? "").trim();
      const route = String(r.route ?? "").trim();
      const trainTime = String(r.trainTime ?? "").trim();
      const boardingStation = String(r.boardingStation ?? "").trim();

      const travelDate = toISODate10(r.travelDate);
      const fare = toNumRequired(r.fare);

      // REQUIRED validations
      if (!name) errors.push({ row: rowNumber, field: "Name", message: "Name is required." });

      if (age === null || age <= 0) {
        errors.push({ row: rowNumber, field: "Age", message: "Age is required and must be a valid number." });
      }

      if (!gender) errors.push({ row: rowNumber, field: "Gender", message: "Gender is required." });
      if (gender && !["M", "F", "Other"].includes(gender)) {
        errors.push({ row: rowNumber, field: "Gender", message: "Gender must be M, F, or Other." });
      }

      if (!seatNumber) errors.push({ row: rowNumber, field: "Seat Number", message: "Seat Number is required." });
      if (seatNumber && !/^[A-Za-z]\d{1,3}$/.test(seatNumber)) {
        errors.push({ row: rowNumber, field: "Seat Number", message: "Seat format invalid (example: A1, B12)." });
      }

      if (!pnrNumber) errors.push({ row: rowNumber, field: "PNR", message: "PNR is required." });

      if (!trainName) errors.push({ row: rowNumber, field: "Train Name", message: "Train Name is required." });
      if (!route) errors.push({ row: rowNumber, field: "Route", message: "Route is required." });
      if (!trainTime) errors.push({ row: rowNumber, field: "Train Time", message: "Train Time is required." });
      if (!boardingStation) errors.push({ row: rowNumber, field: "Boarding Station", message: "Boarding Station is required." });

      if (!travelDate) errors.push({ row: rowNumber, field: "Travel Date", message: "Travel Date is required." });
      if (travelDate) {
        const d = new Date(travelDate);
        if (Number.isNaN(d.getTime())) {
          errors.push({ row: rowNumber, field: "Travel Date", message: "Invalid Travel Date." });
        }
      }

      if (fare === null || fare < 0) {
        errors.push({ row: rowNumber, field: "Fare", message: "Fare is required and must be a valid number." });
      }

      // if this row has any errors, skip doc build
      const hasRowErrors = errors.some((e) => e.row === rowNumber);
      if (hasRowErrors) return;

      docs.push({
        name,
        age,
        gender,
        seatNumber,
        pnrNumber,
        trainName,
        route,
        trainTime,
        boardingStation,
        travelDate, // "YYYY-MM-DD"
        fare,       // number
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // ALL-OR-NOTHING
    if (errors.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Validation failed. Fix the errors and upload again.",
          errors: errors.slice(0, 500),
          totalErrors: errors.length,
          insertedCount: 0,
        },
        { status: 400 }
      );
    }

    // Insert
    const db = await getDb();

    try {
      const result = await db.collection(COLLECTION).insertMany(docs, { ordered: true });
      return NextResponse.json(
        {
          ok: true,
          insertedCount: result.insertedCount,
          message: "Successfully uploaded all the data.",
        },
        { status: 201 }
      );
    } catch (mongoErr: any) {
      // give readable error (duplicate key etc.)
      return NextResponse.json(
        {
          ok: false,
          error: mongoErr?.message || "Mongo insert failed",
        },
        { status: 500 }
      );
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

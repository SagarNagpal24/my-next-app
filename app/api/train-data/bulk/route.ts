import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "trainData";

// keep existing behavior intent, but normalize for duplicate-safe storage/check
function cleanSeat(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function toISODate10(v: any) {
  if (v === undefined || v === null) return "";
  // Excel serial date support (e.g., 46052)
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return "";
  // numeric string serial
  const n = Number(s);
  if (Number.isFinite(n) && /^[0-9]+(\.[0-9]+)?$/.test(s)) return toISODate10(n);
  return s.slice(0, 10);
}

function toNumRequired(v: any) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toTrainTime(v: any) {
  if (v === undefined || v === null) return "";
  // Excel time fraction support (e.g., 0.4166667)
  if (typeof v === "number" && Number.isFinite(v)) {
    const totalMinutes = Math.round(v * 24 * 60);
    const hh = Math.floor(totalMinutes / 60) % 24;
    const mm = totalMinutes % 60;
    return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  }
  const s = String(v).trim();
  if (!s) return "";
  const n = Number(s);
  if (Number.isFinite(n) && /^[0-9]+(\.[0-9]+)?$/.test(s)) return toTrainTime(n);
  return s; // already "HH:MM" or "06:40 AM"
}

function makeDuplicateKey(seatNumber: any, travelDate: any) {
  return `${cleanSeat(seatNumber)}__${toISODate10(travelDate)}`;
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

    // duplicate check inside uploaded file
    const seenRowByKey = new Map<string, number>();

    rows.forEach((r: any, idx: number) => {
      const rowNumber = idx + 2; // excel data row (header=1)

      const name = String(r.name ?? "").trim();
      const age = toNumRequired(r.age);
      const gender = String(r.gender ?? "").trim();

      const seatNumber = cleanSeat(r.seatNumber);
      const pnrNumber = String(r.pnrNumber ?? "").trim();

      const trainName = String(r.trainName ?? "").trim();
      const route = String(r.route ?? "").trim();
      const trainTime = toTrainTime(r.trainTime);
      const boardingStation = String(r.boardingStation ?? "").trim();

      const travelDate = toISODate10(r.travelDate);
      const fare = toNumRequired(r.fare);

      if (!name) errors.push({ row: rowNumber, field: "Name", message: "Name is required." });

      if (age === null || age <= 0) {
        errors.push({
          row: rowNumber,
          field: "Age",
          message: "Age is required and must be a valid number.",
        });
      }

      if (!gender) errors.push({ row: rowNumber, field: "Gender", message: "Gender is required." });
      if (gender && !["M", "F", "Other"].includes(gender)) {
        errors.push({ row: rowNumber, field: "Gender", message: "Gender must be M, F, or Other." });
      }

      if (!seatNumber) errors.push({ row: rowNumber, field: "Seat Number", message: "Seat Number is required." });
      if (!pnrNumber) errors.push({ row: rowNumber, field: "PNR", message: "PNR is required." });

      if (!trainName) errors.push({ row: rowNumber, field: "Train Name", message: "Train Name is required." });
      if (!route) errors.push({ row: rowNumber, field: "Route", message: "Route is required." });
      if (!trainTime) errors.push({ row: rowNumber, field: "Train Time", message: "Train Time is required." });
      if (!boardingStation) {
        errors.push({ row: rowNumber, field: "Boarding Station", message: "Boarding Station is required." });
      }

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

      // duplicate within same uploaded file
      if (seatNumber && travelDate) {
        const dupKey = makeDuplicateKey(seatNumber, travelDate);
        const firstSeenAt = seenRowByKey.get(dupKey);
        if (firstSeenAt) {
          errors.push({
            row: rowNumber,
            field: "Duplicate",
            message: `Duplicate row found in file. Same Seat Number and Travel Date already appears at row ${firstSeenAt}.`,
          });
        } else {
          seenRowByKey.set(dupKey, rowNumber);
        }
      }

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
        travelDate,
        fare,
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

    const db = await getDb();

    // duplicate check against existing DB records
    if (docs.length) {
      const orFilters = docs.map((d) => ({
        seatNumber: d.seatNumber,
        travelDate: d.travelDate,
      }));

      const existing = await db
        .collection(COLLECTION)
        .find({ $or: orFilters })
        .project({ seatNumber: 1, travelDate: 1 })
        .toArray();

      if (existing.length) {
        const existingSet = new Set(
          existing.map((x: any) => makeDuplicateKey(x.seatNumber, x.travelDate))
        );

        docs.forEach((d, idx) => {
          const rowNumber = idx + 2;
          const key = makeDuplicateKey(d.seatNumber, d.travelDate);
          if (existingSet.has(key)) {
            errors.push({
              row: rowNumber,
              field: "Duplicate",
              message: "Duplicate record already exists with same Seat Number and Travel Date.",
            });
          }
        });
      }
    }

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
      if (mongoErr?.code === 11000) {
        return NextResponse.json(
          {
            ok: false,
            error: "Duplicate record not allowed. Same Seat Number and Travel Date already exists.",
          },
          { status: 409 }
        );
      }

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
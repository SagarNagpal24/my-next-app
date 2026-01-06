import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "trainData";

function cleanSeat(v: any) {
  return String(v || "").trim().toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const docs: any[] = [];
    const errors: any[] = [];

    rows.forEach((r: any, idx: number) => {
      const name = String(r.name || "").trim();
      const age = r.age === "" || r.age === null || r.age === undefined ? null : Number(r.age);
      const gender = String(r.gender || "").trim();
      const seatNumber = cleanSeat(r.seatNumber);
      const pnrNumber = String(r.pnrNumber || "").trim();
      const trainName = String(r.trainName || "").trim();
      const route = String(r.route || "").trim();
      const trainTime = String(r.trainTime || "").trim();
      const boardingStation = String(r.boardingStation || "").trim();

      if (!name) return errors.push({ row: idx + 2, error: "Name required" });
      if (age !== null && Number.isNaN(age)) return errors.push({ row: idx + 2, error: "Invalid age" });
      if (!seatNumber) return errors.push({ row: idx + 2, error: "Seat required" });
      if (!/^[A-Za-z]\d{1,3}$/.test(seatNumber)) return errors.push({ row: idx + 2, error: "Seat format invalid (A1, B12)" });
      if (!pnrNumber) return errors.push({ row: idx + 2, error: "PNR required" });
      if (!trainName) return errors.push({ row: idx + 2, error: "Train name required" });
      if (!route) return errors.push({ row: idx + 2, error: "Route required" });
      if (!boardingStation) return errors.push({ row: idx + 2, error: "Boarding required" });

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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    if (docs.length === 0) {
      return NextResponse.json({ ok: false, insertedCount: 0, errors }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION).insertMany(docs, { ordered: false });

    return NextResponse.json({
      ok: true,
      insertedCount: result.insertedCount,
      errors,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

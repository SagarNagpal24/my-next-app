import { NextResponse } from "next/server";
import { getDb } from "../../lib/mongodb";

const COLLECTION = "trainData";

function toNum(v: any) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function toNumNullable(v: any) {
  // returns number | null
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toISODate10(v: any) {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  if (!s) return "";
  return s.slice(0, 10);
}

function normalizeGender(g: string) {
  const s = (g || "").trim();
  if (!s) return "";
  if (s === "M" || s === "F" || s === "Other") return s;
  if (/^male$/i.test(s)) return "M";
  if (/^female$/i.test(s)) return "F";
  if (/^other$/i.test(s)) return "Other";
  return s; // keep as-is (will be validated)
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const name = (searchParams.get("name") || "").trim();
    const seatNumber = (searchParams.get("seatNumber") || "").trim().toUpperCase();
    const pnrNumber = (searchParams.get("pnrNumber") || "").trim();
    const trainName = (searchParams.get("trainName") || "").trim();
    const route = (searchParams.get("route") || "").trim();
    const boardingStation = (searchParams.get("boardingStation") || "").trim();
    const gender = normalizeGender(searchParams.get("gender") || "");
    const travelDate = toISODate10(searchParams.get("travelDate"));

    // optional fare filters
    const fareMin = toNum(searchParams.get("fareMin"));
    const fareMax = toNum(searchParams.get("fareMax"));

    const limitRaw = toNum(searchParams.get("limit"));
    const limit = Math.min(Math.max(limitRaw ?? 500, 1), 10000);

    const filter: any = {};

    if (name) filter.name = { $regex: name, $options: "i" };
    if (seatNumber) filter.seatNumber = { $regex: `^${seatNumber}`, $options: "i" };
    if (pnrNumber) filter.pnrNumber = { $regex: pnrNumber, $options: "i" };
    if (trainName) filter.trainName = trainName;
    if (route) filter.route = route;
    if (boardingStation) filter.boardingStation = boardingStation;
    if (gender) filter.gender = gender;
    if (travelDate) filter.travelDate = travelDate;

    // fare range (note: rows with missing fare won't match range — that's expected)
    if (fareMin !== undefined || fareMax !== undefined) {
      filter.fare = {};
      if (fareMin !== undefined) filter.fare.$gte = fareMin;
      if (fareMax !== undefined) filter.fare.$lte = fareMax;
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { seatNumber: { $regex: q, $options: "i" } },
        { pnrNumber: { $regex: q, $options: "i" } },
        { trainName: { $regex: q, $options: "i" } },
        { route: { $regex: q, $options: "i" } },
        { boardingStation: { $regex: q, $options: "i" } },
        { travelDate: { $regex: q, $options: "i" } },
      ];
    }

    const db = await getDb();
    const items = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const safe = items.map((x: any) => ({
      ...x,
      _id: x._id.toString(),
    }));

    return NextResponse.json({ items: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const age = toNumNullable(body.age);
    const gender = normalizeGender(String(body.gender || ""));

    const seatNumber = String(body.seatNumber || "").trim().toUpperCase();
    const pnrNumber = String(body.pnrNumber || "").trim();

    const trainName = String(body.trainName || "").trim();
    const route = String(body.route || "").trim();
    const trainTime = String(body.trainTime || "").trim();
    const boardingStation = String(body.boardingStation || "").trim();

    const travelDate = toISODate10(body.travelDate);

    // ✅ fare is now OPTIONAL (backward-compatible)
    // store null if missing
    const fare = toNumNullable(body.fare);

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    if (age === null || age <= 0) {
      return NextResponse.json({ error: "Age is required and must be a valid number" }, { status: 400 });
    }

    if (!gender) return NextResponse.json({ error: "Gender is required" }, { status: 400 });
    if (!["M", "F", "Other"].includes(gender)) {
      return NextResponse.json({ error: "Gender must be M, F, or Other" }, { status: 400 });
    }

    if (!seatNumber) return NextResponse.json({ error: "Seat number is required" }, { status: 400 });
    if (!/^[A-Za-z]\d{1,3}$/.test(seatNumber)) {
      return NextResponse.json({ error: "Invalid seat number format (example: A1, B12)" }, { status: 400 });
    }

    if (!pnrNumber) return NextResponse.json({ error: "PNR is required" }, { status: 400 });
    if (!trainName) return NextResponse.json({ error: "Train name is required" }, { status: 400 });
    if (!route) return NextResponse.json({ error: "Route is required" }, { status: 400 });
    if (!trainTime) return NextResponse.json({ error: "Train time is required" }, { status: 400 });
    if (!boardingStation) return NextResponse.json({ error: "Boarding station is required" }, { status: 400 });
    if (!travelDate) return NextResponse.json({ error: "Travel date is required" }, { status: 400 });

    // ✅ If you still want to validate fare when provided:
    if (fare !== null && fare < 0) {
      return NextResponse.json({ error: "Fare must be a valid non-negative number" }, { status: 400 });
    }

    const doc = {
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
      fare, // number | null
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).insertOne(doc);

    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

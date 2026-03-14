import { NextResponse } from "next/server";
import { getDb } from "../../lib/mongodb";

const COLLECTION = "trainData";

function toNum(v: any) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function toNumNullable(v: any) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cleanStr(v: any) {
  return String(v ?? "").trim();
}

function normalizeSeat(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Excel serial date or string -> YYYY-MM-DD
function toISODate10(v: any) {
  if (v === undefined || v === null) return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }
  const s = cleanStr(v);
  if (!s) return "";
  const n = Number(s);
  if (Number.isFinite(n) && /^[0-9]+(\.[0-9]+)?$/.test(s)) return toISODate10(n);
  return s.slice(0, 10);
}

// Excel time fraction -> HH:MM, else keep string
function toTrainTime(v: any) {
  if (v === undefined || v === null) return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    const totalMinutes = Math.round(v * 24 * 60);
    const hh = Math.floor(totalMinutes / 60) % 24;
    const mm = totalMinutes % 60;
    return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  }
  const s = cleanStr(v);
  if (!s) return "";
  const n = Number(s);
  if (Number.isFinite(n) && /^[0-9]+(\.[0-9]+)?$/.test(s)) return toTrainTime(n);
  return s;
}

function normalizeGender(g: string) {
  const s = (g || "").trim();
  if (!s) return "";
  if (s === "M" || s === "F" || s === "Other") return s;
  if (/^male$/i.test(s)) return "M";
  if (/^female$/i.test(s)) return "F";
  if (/^other$/i.test(s)) return "Other";
  return s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const q = cleanStr(searchParams.get("q"));
    const name = cleanStr(searchParams.get("name"));
    const seatNumber = cleanStr(searchParams.get("seatNumber"));
    const pnrNumber = cleanStr(searchParams.get("pnrNumber"));
    const trainName = cleanStr(searchParams.get("trainName"));
    const route = cleanStr(searchParams.get("route"));
    const boardingStation = cleanStr(searchParams.get("boardingStation"));
    const gender = normalizeGender(cleanStr(searchParams.get("gender")));

    const travelDate = toISODate10(searchParams.get("travelDate"));
    const travelDateFrom = toISODate10(searchParams.get("travelDateFrom"));
    const travelDateTo = toISODate10(searchParams.get("travelDateTo"));

    const fareMin = toNum(searchParams.get("fareMin"));
    const fareMax = toNum(searchParams.get("fareMax"));

    const limitRaw = toNum(searchParams.get("limit"));
    const limit = Math.min(Math.max(limitRaw ?? 500, 1), 10000);

    const filter: any = {};

    if (name) filter.name = { $regex: escapeRegex(name), $options: "i" };
    if (seatNumber) filter.seatNumber = { $regex: escapeRegex(seatNumber), $options: "i" };
    if (pnrNumber) filter.pnrNumber = { $regex: escapeRegex(pnrNumber), $options: "i" };
    if (trainName) filter.trainName = { $regex: escapeRegex(trainName), $options: "i" };
    if (route) filter.route = route;
    if (boardingStation) filter.boardingStation = { $regex: escapeRegex(boardingStation), $options: "i" };
    if (gender) filter.gender = gender;

    if (travelDate) {
      filter.travelDate = travelDate;
    } else if (travelDateFrom || travelDateTo) {
      filter.travelDate = {};
      if (travelDateFrom) filter.travelDate.$gte = travelDateFrom;
      if (travelDateTo) filter.travelDate.$lte = travelDateTo;
    }

    if (fareMin !== undefined || fareMax !== undefined) {
      filter.fare = {};
      if (fareMin !== undefined) filter.fare.$gte = fareMin;
      if (fareMax !== undefined) filter.fare.$lte = fareMax;
    }

    if (q) {
      const safeQ = escapeRegex(q);
      filter.$or = [
        { name: { $regex: safeQ, $options: "i" } },
        { seatNumber: { $regex: safeQ, $options: "i" } },
        { pnrNumber: { $regex: safeQ, $options: "i" } },
        { trainName: { $regex: safeQ, $options: "i" } },
        { route: { $regex: safeQ, $options: "i" } },
        { boardingStation: { $regex: safeQ, $options: "i" } },
        { travelDate: { $regex: safeQ, $options: "i" } },
      ];
    }

    const db = await getDb();
    const items = await db.collection(COLLECTION).find(filter).sort({ createdAt: -1 }).limit(limit).toArray();

    const safe = items.map((x: any) => ({
      ...x,
      _id: x._id.toString(),
      seatNumber: normalizeSeat(x.seatNumber),
      travelDate: toISODate10(x.travelDate),
      trainTime: toTrainTime(x.trainTime),
    }));

    return NextResponse.json({ items: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = cleanStr(body.name);
    const age = toNumNullable(body.age);
    const gender = normalizeGender(cleanStr(body.gender));
    const seatNumber = normalizeSeat(body.seatNumber);
    const pnrNumber = cleanStr(body.pnrNumber);
    const trainName = cleanStr(body.trainName);
    const route = cleanStr(body.route);
    const trainTime = toTrainTime(body.trainTime);
    const boardingStation = cleanStr(body.boardingStation);
    const travelDate = toISODate10(body.travelDate);
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
    if (!pnrNumber) return NextResponse.json({ error: "PNR is required" }, { status: 400 });
    if (!trainName) return NextResponse.json({ error: "Train name is required" }, { status: 400 });
    if (!route) return NextResponse.json({ error: "Route is required" }, { status: 400 });
    if (!trainTime) return NextResponse.json({ error: "Train time is required" }, { status: 400 });
    if (!boardingStation) return NextResponse.json({ error: "Boarding station is required" }, { status: 400 });
    if (!travelDate) return NextResponse.json({ error: "Travel date is required" }, { status: 400 });

    if (fare !== null && fare < 0) {
      return NextResponse.json({ error: "Fare must be a valid non-negative number" }, { status: 400 });
    }

    const db = await getDb();

    const existing = await db.collection(COLLECTION).findOne({
      seatNumber,
      travelDate,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Duplicate record not allowed. Same Seat Number and Travel Date already exists." },
        { status: 409 }
      );
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
      fare,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTION).insertOne(doc);

    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json(
        { error: "Duplicate record not allowed. Same Seat Number and Travel Date already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "trainData";

function extractObjectId(raw: string) {
  const match = String(raw || "").match(/[a-fA-F0-9]{24}/);
  return match?.[0] || null;
}

function cleanStr(v: any) {
  return String(v ?? "").trim();
}

// ✅ Excel serial date (e.g., 46052) or string -> YYYY-MM-DD
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

// ✅ Excel time fraction (e.g., 0.4166667) -> HH:MM, else keep string
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

function toNumRequired(v: any) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id: rawId } = await ctx.params;
    const id = extractObjectId(rawId);
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const name = cleanStr(body.name);
    const age = toNumRequired(body.age);
    const gender = cleanStr(body.gender);

    // ✅ No seat rules; store any string
    const seatNumber = cleanStr(body.seatNumber);
    const pnrNumber = cleanStr(body.pnrNumber);

    // ✅ Free text fields
    const trainName = cleanStr(body.trainName);
    const route = cleanStr(body.route);
    const trainTime = toTrainTime(body.trainTime); // supports numeric excel time too
    const boardingStation = cleanStr(body.boardingStation);

    const travelDate = toISODate10(body.travelDate);

    // ✅ fare
    const fare = toNumRequired(body.fare);

    // ✅ REQUIRED VALIDATIONS (removed seat-format validation)
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    if (age === null || age <= 0) {
      return NextResponse.json({ error: "Age is required and must be a valid number" }, { status: 400 });
    }

    if (!gender) return NextResponse.json({ error: "Gender is required" }, { status: 400 });
    if (!["M", "F", "Other"].includes(gender)) {
      return NextResponse.json({ error: "Gender must be M, F, or Other" }, { status: 400 });
    }

    if (!seatNumber) return NextResponse.json({ error: "Seat number is required" }, { status: 400 });
    // ❌ removed: /^[A-Za-z]\d{1,3}$/ rule

    if (!pnrNumber) return NextResponse.json({ error: "PNR is required" }, { status: 400 });
    if (!trainName) return NextResponse.json({ error: "Train name is required" }, { status: 400 });
    if (!route) return NextResponse.json({ error: "Route is required" }, { status: 400 });

    if (!trainTime) return NextResponse.json({ error: "Train time is required" }, { status: 400 });
    if (!boardingStation) return NextResponse.json({ error: "Boarding station is required" }, { status: 400 });

    if (!travelDate) return NextResponse.json({ error: "Travel date is required" }, { status: 400 });
    const d = new Date(travelDate);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid Travel date" }, { status: 400 });
    }

    if (fare === null || fare < 0) {
      return NextResponse.json({ error: "Fare is required and must be a valid number" }, { status: 400 });
    }

    const update = {
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
      fare,
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: update });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    const { id: rawId } = await ctx.params;
    const id = extractObjectId(rawId);
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

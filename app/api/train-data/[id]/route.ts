import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "trainData";

function extractObjectId(raw: string) {
  const match = String(raw || "").match(/[a-fA-F0-9]{24}/);
  return match?.[0] || null;
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

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id: rawId } = await ctx.params;
    const id = extractObjectId(rawId);
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();

    const name = String(body.name || "").trim();
    const age = toNumRequired(body.age);
    const gender = String(body.gender || "").trim();

    const seatNumber = String(body.seatNumber || "").trim().toUpperCase();
    const pnrNumber = String(body.pnrNumber || "").trim();

    const trainName = String(body.trainName || "").trim();
    const route = String(body.route || "").trim();
    const trainTime = String(body.trainTime || "").trim();
    const boardingStation = String(body.boardingStation || "").trim();

    const travelDate = toISODate10(body.travelDate);

    // ✅ NEW: fare
    const fare = toNumRequired(body.fare);

    // ✅ ALL REQUIRED VALIDATIONS
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

    // ✅ required now (you wanted all fields required)
    if (!trainTime) return NextResponse.json({ error: "Train time is required" }, { status: 400 });

    if (!boardingStation) return NextResponse.json({ error: "Boarding station is required" }, { status: 400 });

    if (!travelDate) return NextResponse.json({ error: "Travel date is required" }, { status: 400 });

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
      fare, // ✅ IMPORTANT: saved on edit
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db
      .collection(COLLECTION)
      .updateOne({ _id: new ObjectId(id) }, { $set: update });

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

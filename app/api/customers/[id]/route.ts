import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb"; // <-- keep this relative path in your project

const COLLECTION = "customers";

function extractObjectId(raw: string) {
  const match = String(raw || "").match(/[a-fA-F0-9]{24}/);
  return match?.[0] || null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = extractObjectId(params.id);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
    }

    const body = await req.json();

    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const update: any = {
      name,
      badgeNo: String(body.badgeNo || "").trim(),
      fatherOrHusbandName: String(body.fatherOrHusbandName || "").trim(),
      gender: String(body.gender || "").trim(),
      age: body.age === "" || body.age === null || body.age === undefined ? null : Number(body.age),
      address: String(body.address || "").trim(),
      mobile: String(body.mobile || "").trim(),
      adhaarNumber: String(body.adhaarNumber || "").trim(),
      emergencyNumber: String(body.emergencyNumber || "").trim(),
      medicalDate: body.medicalDate ? new Date(String(body.medicalDate)) : null,
      notes: String(body.notes || "").trim(),
      updatedAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection(COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = extractObjectId(params.id);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

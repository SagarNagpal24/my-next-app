import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb"; // keep your current working relative path

const COLLECTION = "customers";

function toObjectId(raw: string) {
  const decoded = decodeURIComponent(String(raw || "")).trim();
  const match = decoded.match(/[a-fA-F0-9]{24}/);
  const hex = (match?.[0] ?? decoded).trim();

  try {
    return new ObjectId(hex);
  } catch {
    return null;
  }
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // ✅ params is Promise
) {
  try {
    const { id } = await ctx.params; // ✅ unwrap params
    console.log("PUT params.id =", id);

    const oid = toObjectId(id);
    if (!oid) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const body = await req.json();

    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const md = String(body.medicalDate || "").trim();

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
      medicalDate: md ? new Date(md) : null,
      notes: String(body.notes || "").trim(),
      updatedAt: new Date(),
    };

    delete update._id;

    const db = await getDb();
    const result = await db.collection(COLLECTION).updateOne({ _id: oid }, { $set: update });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("PUT error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // ✅ params is Promise
) {
  try {
    const { id } = await ctx.params; // ✅ unwrap params
    console.log("DELETE params.id =", id);

    const oid = toObjectId(id);
    if (!oid) return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });

    const db = await getDb();
    const result = await db.collection(COLLECTION).deleteOne({ _id: oid });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

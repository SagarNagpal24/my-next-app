import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { getDb } from "../../../lib/mongodb";

const LISTS = "followupLists";

function sessionEmail(session: any) {
  return String(session?.user?.email || "").toLowerCase().trim();
}

function listMeta(x: any) {
  return {
    _id: x._id.toString(),
    name: String(x.name || ""),
    count: Number(x.count || (Array.isArray(x.customerIds) ? x.customerIds.length : 0)),
    createdBy: String(x.createdBy || ""),
    createdAt: x.createdAt ? new Date(x.createdAt).toISOString() : "",
    updatedAt: x.updatedAt ? new Date(x.updatedAt).toISOString() : "",
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = await getDb();
    const items = await db
      .collection(LISTS)
      .find({}, { projection: { customerIds: 0 } })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({ items: items.map(listMeta) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const rawIds = Array.isArray(body?.customerIds) ? body.customerIds : [];

    if (!name) {
      return NextResponse.json({ error: "List name is required" }, { status: 400 });
    }
    if (name.length > 80) {
      return NextResponse.json(
        { error: "List name must be 80 characters or less" },
        { status: 400 }
      );
    }

    const customerIds = Array.from(
      new Set(rawIds.map((x: any) => String(x || "").trim()).filter(Boolean))
    );

    if (customerIds.length === 0) {
      return NextResponse.json(
        { error: "No customers to save in this list" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const col = db.collection(LISTS);

    const existing = await col.findOne(
      { name },
      { projection: { _id: 1 } }
    );
    if (existing) {
      return NextResponse.json(
        { error: "A list with this name already exists" },
        { status: 409 }
      );
    }

    const now = new Date();
    const doc = {
      name,
      customerIds,
      count: customerIds.length,
      createdBy: sessionEmail(session),
      createdAt: now,
      updatedAt: now,
    };

    const result = await col.insertOne(doc);

    return NextResponse.json(
      { ok: true, item: listMeta({ ...doc, _id: result.insertedId }) },
      { status: 201 }
    );
  } catch (e: any) {
    if (e?.code === 11000) {
      return NextResponse.json(
        { error: "A list with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

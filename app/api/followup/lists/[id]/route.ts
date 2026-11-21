import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/authOptions";
import { getDb } from "../../../../lib/mongodb";

const LISTS = "followupLists";
const ENTRIES = "followupEntries";
const HISTORY = "followupHistory";

function toObjectId(raw: string) {
  try {
    return new ObjectId(String(raw || "").trim());
  } catch {
    return null;
  }
}

function mapEntry(x: any) {
  return {
    customerId: String(x.customerId || ""),
    assignedTo: String(x.assignedTo || ""),
    followupRemarks: String(x.followupRemarks || ""),
    remarksHistory: Array.isArray(x.remarksHistory)
      ? x.remarksHistory.map((h: any) => ({
          text: String(h?.text || ""),
          createdAt: h?.createdAt ? new Date(h.createdAt).toISOString() : "",
        }))
      : [],
    updatedBy: String(x.updatedBy || ""),
    updatedAt: x.updatedAt ? new Date(x.updatedAt).toISOString() : "",
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const oid = toObjectId(id);
    if (!oid) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

    const db = await getDb();
    const list = await db.collection(LISTS).findOne({ _id: oid });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const listId = oid.toString();
    const role = String((session as any)?.role || "user");
    const email = String(session?.user?.email || "").toLowerCase().trim();

    let entries: any[];
    let customerIds: string[];

    if (role === "admin") {
      entries = await db.collection(ENTRIES).find({ listId }).toArray();
      customerIds = (list.customerIds || []).map((x: any) => String(x));
    } else {
      // Non-admins only see the customers assigned to them within this list.
      entries = email
        ? await db.collection(ENTRIES).find({ listId, assignedTo: email }).toArray()
        : [];
      customerIds = entries.map((e: any) => String(e.customerId));
    }

    return NextResponse.json({
      list: {
        _id: listId,
        name: String(list.name || ""),
        count: Number(list.count || (list.customerIds || []).length),
        createdBy: String(list.createdBy || ""),
        createdAt: list.createdAt ? new Date(list.createdAt).toISOString() : "",
        updatedAt: list.updatedAt ? new Date(list.updatedAt).toISOString() : "",
      },
      customerIds,
      entries: entries.map(mapEntry),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (String((session as any)?.role || "user") !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const oid = toObjectId(id);
    if (!oid) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (name.length > 80) {
      return NextResponse.json({ error: "Name must be 80 characters or less" }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection(LISTS);

    const dup = await col.findOne({ name, _id: { $ne: oid } }, { projection: { _id: 1 } });
    if (dup) {
      return NextResponse.json({ error: "A list with this name already exists" }, { status: 409 });
    }

    const result = await col.updateOne(
      { _id: oid },
      { $set: { name, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    await db.collection(HISTORY).updateMany(
      { listId: oid.toString() },
      { $set: { listName: name } }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (String((session as any)?.role || "user") !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const oid = toObjectId(id);
    if (!oid) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

    const db = await getDb();
    const listId = oid.toString();

    const result = await db.collection(LISTS).deleteOne({ _id: oid });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    await Promise.all([
      db.collection(ENTRIES).deleteMany({ listId }),
      db.collection(HISTORY).deleteMany({ listId }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

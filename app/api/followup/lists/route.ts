import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { getDb } from "../../../lib/mongodb";

const LISTS = "followupLists";
const ENTRIES = "followupEntries";

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
    const role = String((session as any)?.role || "user");
    const email = sessionEmail(session);

    let filter: any = {};
    let assignedCounts: Map<string, number> | null = null;

    // Non-admins only see lists in which they have at least one assigned customer.
    if (role !== "admin") {
      if (!email) return NextResponse.json({ items: [] });

      const assignments = await db
        .collection(ENTRIES)
        .find({ assignedTo: email }, { projection: { listId: 1 } })
        .toArray();

      assignedCounts = new Map<string, number>();
      for (const a of assignments) {
        const id = String((a as any).listId || "");
        if (!id) continue;
        assignedCounts.set(id, (assignedCounts.get(id) || 0) + 1);
      }

      const listIds = Array.from(new Set(assignedCounts.keys()))
        .map((id) => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ObjectId[];

      if (listIds.length === 0) return NextResponse.json({ items: [] });

      filter = { _id: { $in: listIds } };
    }

    const items = await db
      .collection(LISTS)
      .find(filter, { projection: { customerIds: 0 } })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({
      items: items.map((x: any) => {
        const meta = listMeta(x);
        if (assignedCounts) {
          meta.count = assignedCounts.get(String(x._id)) || 0;
        }
        return meta;
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (String((session as any)?.role || "user") !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

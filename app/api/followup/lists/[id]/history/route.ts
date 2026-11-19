import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/authOptions";
import { getDb } from "../../../../../lib/mongodb";

const HISTORY = "followupHistory";

function toObjectId(raw: string) {
  try {
    return new ObjectId(String(raw || "").trim());
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const oid = toObjectId(id);
    if (!oid) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const customerId = String(searchParams.get("customerId") || "").trim();

    const filter: any = { listId: oid.toString() };
    if (customerId) filter.customerId = customerId;

    const db = await getDb();
    const items = await db
      .collection(HISTORY)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    return NextResponse.json({
      items: items.map((x: any) => ({
        _id: x._id?.toString?.() ?? String(x._id),
        listId: String(x.listId || ""),
        listName: String(x.listName || ""),
        customerId: String(x.customerId || ""),
        customerName: String(x.customerName || ""),
        type: String(x.type || ""),
        assignedTo: String(x.assignedTo || ""),
        previousAssignedTo: String(x.previousAssignedTo || ""),
        remark: String(x.remark || ""),
        previousStatus: String(x.previousStatus || ""),
        createdBy: String(x.createdBy || ""),
        createdAt: x.createdAt ? new Date(x.createdAt).toISOString() : "",
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

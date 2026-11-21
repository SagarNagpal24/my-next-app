import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/authOptions";
import { getDb } from "../../../../../lib/mongodb";

const LISTS = "followupLists";
const ENTRIES = "followupEntries";
const HISTORY = "followupHistory";

let indexesReady: Promise<void> | null = null;

async function ensureIndexes(db: any) {
  await db
    .collection(ENTRIES)
    .createIndex({ listId: 1, customerId: 1 }, { unique: true, name: "uniq_list_customer" });
  await db
    .collection(HISTORY)
    .createIndex({ listId: 1, customerId: 1, createdAt: -1 }, { name: "list_customer_created" });
}

async function ensureIndexesOnce(db: any) {
  if (!indexesReady) {
    indexesReady = ensureIndexes(db).catch((e) => {
      indexesReady = null;
      throw e;
    });
  }
  return indexesReady;
}

function toObjectId(raw: string) {
  try {
    return new ObjectId(String(raw || "").trim());
  } catch {
    return null;
  }
}

function cleanHistory(raw: any): { text: string; createdAt: Date }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((h: any) => {
      const text = String(h?.text || "").trim();
      if (!text) return null;
      const parsed = h?.createdAt ? new Date(h.createdAt) : new Date();
      return { text, createdAt: Number.isNaN(parsed.getTime()) ? new Date() : parsed };
    })
    .filter(Boolean) as { text: string; createdAt: Date }[];
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

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const oid = toObjectId(id);
    if (!oid) return NextResponse.json({ error: "Invalid list id" }, { status: 400 });

    const db = await getDb();
    try {
      await ensureIndexesOnce(db);
    } catch (e: any) {
      console.error("ensureIndexes failed (followup entries):", e?.message || e);
    }

    const list = await db.collection(LISTS).findOne({ _id: oid });
    if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

    const listId = oid.toString();
    const listName = String(list.name || "");
    const email = String(session?.user?.email || "").toLowerCase().trim();
    const isAdmin = String((session as any)?.role || "user") === "admin";

    const body = await req.json().catch(() => ({}));
    const now = new Date();

    // ---- Bulk assignment mode: { customerIds: [...], assignedTo: "..." } ----
    if (Array.isArray(body?.customerIds)) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const ids = Array.from(
        new Set<string>(
          (body.customerIds as any[])
            .map((x) => String(x || "").trim())
            .filter(Boolean)
        )
      );
      if (ids.length === 0) {
        return NextResponse.json({ error: "No customers selected" }, { status: 400 });
      }

      const assignedTo = String(body?.assignedTo ?? "").trim();
      const entCol = db.collection(ENTRIES);
      const existing = await entCol.find({ listId, customerId: { $in: ids } }).toArray();
      const existingMap = new Map<string, any>(
        existing.map((e: any) => [String(e.customerId), e])
      );

      const logs: any[] = [];
      const ops: any[] = [];

      for (const customerId of ids) {
        const prev = existingMap.get(customerId);
        const prevAssigned = String(prev?.assignedTo || "");

        if (prevAssigned !== assignedTo) {
          logs.push({
            listId,
            listName,
            customerId,
            customerName: String(prev?.customerName || ""),
            type: "assign",
            assignedTo,
            previousAssignedTo: prevAssigned,
            createdBy: email,
            createdAt: now,
          });
        }

        ops.push({
          updateOne: {
            filter: { listId, customerId },
            update: {
              $set: { assignedTo, updatedBy: email, updatedAt: now },
              $setOnInsert: {
                listId,
                customerId,
                followupRemarks: String(prev?.followupRemarks || ""),
                remarksHistory: Array.isArray(prev?.remarksHistory) ? prev.remarksHistory : [],
                createdAt: now,
              },
            },
            upsert: true,
          },
        });
      }

      if (ops.length) await entCol.bulkWrite(ops, { ordered: false });
      if (logs.length) await db.collection(HISTORY).insertMany(logs);

      return NextResponse.json({ ok: true, updated: ops.length, historyAdded: logs.length });
    }

    // ---- Per-customer update mode: { updates: [ { customerId, assignedTo, followupRemarks, newRemark, remarksHistory } ] } ----
    const updates = Array.isArray(body?.updates) ? body.updates : [];
    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const entCol = db.collection(ENTRIES);
    const results: any[] = [];
    const logs: any[] = [];

    for (const raw of updates) {
      const customerId = String(raw?.customerId || "").trim();
      if (!customerId) continue;

      const prev = await entCol.findOne({ listId, customerId });

      // Non-admins can only modify customers assigned to them in this list.
      if (!isAdmin && String(prev?.assignedTo || "") !== email) continue;

      const prevAssigned = String(prev?.assignedTo || "");
      const prevStatus = String(prev?.followupRemarks || "");

      const hasAssigned =
        isAdmin && Object.prototype.hasOwnProperty.call(raw, "assignedTo");
      const hasStatus = Object.prototype.hasOwnProperty.call(raw, "followupRemarks");
      const assignedTo = hasAssigned
        ? String(raw.assignedTo || "").trim()
        : prevAssigned;
      const followupRemarks = hasStatus
        ? String(raw.followupRemarks || "")
        : prevStatus;

      let remarksHistory: { text: string; createdAt: Date }[];

      if (Object.prototype.hasOwnProperty.call(raw, "remarksHistory")) {
        remarksHistory = cleanHistory(raw.remarksHistory);
      } else if (Array.isArray(prev?.remarksHistory)) {
        remarksHistory = prev.remarksHistory.map((h: any) => ({
          text: String(h?.text || ""),
          createdAt: h?.createdAt ? new Date(h.createdAt) : new Date(),
        }));
      } else {
        remarksHistory = [];
      }

      const newRemark = String(raw?.newRemark || "").trim();
      if (newRemark) {
        remarksHistory.push({ text: newRemark, createdAt: now });
        logs.push({
          listId,
          listName,
          customerId,
          customerName: String(raw?.customerName || ""),
          type: "remark",
          remark: newRemark,
          createdBy: email,
          createdAt: now,
        });
      }

      if (hasAssigned && assignedTo !== prevAssigned) {
        logs.push({
          listId,
          listName,
          customerId,
          customerName: String(raw?.customerName || ""),
          type: "assign",
          assignedTo,
          previousAssignedTo: prevAssigned,
          createdBy: email,
          createdAt: now,
        });
      }

      if (hasStatus && followupRemarks !== prevStatus) {
        logs.push({
          listId,
          listName,
          customerId,
          customerName: String(raw?.customerName || ""),
          type: "status",
          remark: followupRemarks,
          previousStatus: prevStatus,
          createdBy: email,
          createdAt: now,
        });
      }

      await entCol.updateOne(
        { listId, customerId },
        {
          $set: {
            assignedTo,
            followupRemarks,
            remarksHistory,
            updatedBy: email,
            updatedAt: now,
          },
          $setOnInsert: { listId, customerId, createdAt: now },
        },
        { upsert: true }
      );

      results.push({ customerId, assignedTo, followupRemarks, remarksHistory });
    }

    if (logs.length) await db.collection(HISTORY).insertMany(logs);

    return NextResponse.json({
      ok: true,
      updated: results.length,
      entries: results.map((r) =>
        mapEntry({
          ...r,
          updatedBy: email,
          updatedAt: now,
        })
      ),
    });
  } catch (e: any) {
    console.error("POST followup entries error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

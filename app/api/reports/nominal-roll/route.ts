import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const MAP: Record<string, string> = {
  ladoo: "nominalRollLadoo",
  parantha: "nominalRollParantha",
  bhati: "nominalRollBhati",
};

function asStr(v: any) {
  return String(v ?? "").trim();
}

function toNum(v: any) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function toDateStart(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}
function toDateEnd(ymd: string) {
  return new Date(`${ymd}T23:59:59.999Z`);
}

function toYMD(v: any) {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  try {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {}
  return "";
}

function genderRegex(g: string) {
  const x = asStr(g).toLowerCase();
  // Accepts: M/Male, F/Female, Other
  if (!x) return null;

  if (x === "m" || x === "male") return /^(m|male)$/i;
  if (x === "f" || x === "female") return /^(f|female)$/i;
  if (x === "other" || x === "o") return /^(other|o)$/i;

  // fallback: exact-ish match
  return new RegExp(`^${x}$`, "i");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const categoryRaw = asStr(searchParams.get("category")).toLowerCase();
    const COLLECTION = MAP[categoryRaw];
    if (!COLLECTION) {
      return NextResponse.json({ error: "Invalid category. Use ladoo|parantha|bhati" }, { status: 400 });
    }

    const q = asStr(searchParams.get("q"));
    const name = asStr(searchParams.get("name"));
    const badgeNo = asStr(searchParams.get("badgeNo"));
    const gender = asStr(searchParams.get("gender"));

    const jathaFrom = asStr(searchParams.get("jathaFrom"));
    const jathaTo = asStr(searchParams.get("jathaTo"));

    const travelFrom = asStr(searchParams.get("travelFrom"));
    const travelTo = asStr(searchParams.get("travelTo"));

    const limitRaw = toNum(searchParams.get("limit"));
    const limit = Math.min(Math.max(limitRaw ?? 1000, 1), 10000);

    const filter: any = {};

    if (name) filter.customerName = { $regex: name, $options: "i" };
    if (badgeNo) filter.badgeNo = { $regex: badgeNo, $options: "i" };

    // ✅ FIX: gender normalized matching (Male/Female vs M/F)
    if (gender) {
      const rx = genderRegex(gender);
      if (rx) filter.gender = { $regex: rx };
    }

    if (q) {
      filter.$or = [
        { customerName: { $regex: q, $options: "i" } },
        { badgeNo: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { adhaarNumber: { $regex: q, $options: "i" } },
      ];
    }

    if (jathaFrom || jathaTo) {
      const range: any = {};
      if (jathaFrom) range.$gte = toDateStart(jathaFrom);
      if (jathaTo) range.$lte = toDateEnd(jathaTo);
      filter.jathaDate = range;
    }

    // Travel date range:
    // - Ladoo/Parantha: filter on travelStartDate/travelEndDate
    // - Bhati: apply on jathaDate
    if (travelFrom || travelTo) {
      if (categoryRaw === "bhati") {
        const range: any = {};
        if (travelFrom) range.$gte = toDateStart(travelFrom);
        if (travelTo) range.$lte = toDateEnd(travelTo);
        filter.jathaDate = filter.jathaDate ? { ...filter.jathaDate, ...range } : range;
      } else {
        const and: any[] = [];
        if (travelFrom) and.push({ travelStartDate: { $gte: toDateStart(travelFrom) } });
        if (travelTo) and.push({ travelEndDate: { $lte: toDateEnd(travelTo) } });
        if (and.length) filter.$and = (filter.$and || []).concat(and);
      }
    }

    const db = await getDb();
    const items = await db
      .collection(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const safe = items.map((x: any) => ({
      ...x,
      _id: x._id.toString(),
      jathaDate: toYMD(x.jathaDate),
      travelStartDate: toYMD(x.travelStartDate),
      travelEndDate: toYMD(x.travelEndDate),
      createdAt: x.createdAt ? new Date(x.createdAt).toISOString() : null,
      updatedAt: x.updatedAt ? new Date(x.updatedAt).toISOString() : null,
    }));

    return NextResponse.json({ items: safe });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

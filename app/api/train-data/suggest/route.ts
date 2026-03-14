import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "trainData";

function cleanStr(v: any) {
  return String(v ?? "").trim();
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Excel time fraction (e.g., 0.4166667) -> HH:MM, else keep string
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = cleanStr(searchParams.get("q"));

    if (!q) return NextResponse.json({ suggestions: [] });

    const safeQ = escapeRegex(q);
    const db = await getDb();

    const docs = await db
      .collection(COLLECTION)
      .find(
        {
          $or: [
            { name: { $regex: safeQ, $options: "i" } },
            { seatNumber: { $regex: safeQ, $options: "i" } },
            { trainName: { $regex: safeQ, $options: "i" } },
            { boardingStation: { $regex: safeQ, $options: "i" } },
            { route: { $regex: safeQ, $options: "i" } },
            { pnrNumber: { $regex: safeQ, $options: "i" } },
            { trainTime: { $regex: safeQ, $options: "i" } },
          ],
        },
        {
          projection: {
            name: 1,
            seatNumber: 1,
            trainName: 1,
            boardingStation: 1,
            route: 1,
            pnrNumber: 1,
            trainTime: 1,
          },
        }
      )
      .limit(10)
      .toArray();

    const suggestions = docs
      .map((d: any) => {
        const parts = [
          d.name && `Name: ${d.name}`,
          d.seatNumber && `Seat: ${d.seatNumber}`,
          d.pnrNumber && `PNR: ${d.pnrNumber}`,
          d.trainName && `Train: ${d.trainName}`,
          d.route && `Route: ${d.route}`,
          d.boardingStation && `Boarding: ${d.boardingStation}`,
          d.trainTime && `Time: ${toTrainTime(d.trainTime)}`,
        ].filter(Boolean);
        return parts.join(" • ");
      })
      .filter(Boolean);

    return NextResponse.json({ suggestions: Array.from(new Set(suggestions)) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
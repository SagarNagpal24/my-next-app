import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "trainData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) return NextResponse.json({ suggestions: [] });

    const db = await getDb();

    const docs = await db
      .collection(COLLECTION)
      .find(
        {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { seatNumber: { $regex: q, $options: "i" } },
            { trainName: { $regex: q, $options: "i" } },
            { boardingStation: { $regex: q, $options: "i" } },
            { route: { $regex: q, $options: "i" } },
            { pnrNumber: { $regex: q, $options: "i" } },
          ],
        },
        { projection: { name: 1, seatNumber: 1, trainName: 1, boardingStation: 1, route: 1, pnrNumber: 1 } }
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
        ].filter(Boolean);
        return parts.join(" • ");
      })
      .filter(Boolean);

    return NextResponse.json({ suggestions: Array.from(new Set(suggestions)) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

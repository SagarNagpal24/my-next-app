import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "customers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    const db = await getDb();

    // Match across fields (name/mobile/aadhaar/badge)
    const filter: any = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { adhaarNumber: { $regex: q, $options: "i" } },
        { badgeNo: { $regex: q, $options: "i" } },
      ],
    };

    const docs = await db
      .collection(COLLECTION)
      .find(filter, {
        projection: { name: 1, mobile: 1, adhaarNumber: 1, badgeNo: 1 },
      })
      .limit(10)
      .toArray();

    // Make readable suggestions
    const suggestions = docs
      .map((d: any) => {
        const name = (d.name || "").trim();
        const badge = (d.badgeNo || "").trim();
        const mobile = (d.mobile || "").trim();
        const aadhaar = (d.adhaarNumber || "").trim();

        const right = [badge && `Badge: ${badge}`, mobile && `Mob: ${mobile}`, aadhaar && `Aadhaar: ${aadhaar}`]
          .filter(Boolean)
          .join(" • ");

        return right ? `${name} (${right})` : name;
      })
      .filter(Boolean);

    // Unique only
    const uniq = Array.from(new Set(suggestions));

    return NextResponse.json({ suggestions: uniq });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

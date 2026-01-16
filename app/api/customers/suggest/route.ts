import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "customers";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const qRaw = (searchParams.get("q") || "").trim();

    if (!qRaw || qRaw.length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    // ✅ safer regex (prevents regex injection + weird crashes on special chars)
    const q = escapeRegex(qRaw);

    const db = await getDb();

    // ✅ include department in search + projection
    const filter: any = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { adhaarNumber: { $regex: q, $options: "i" } },
        { badgeNo: { $regex: q, $options: "i" } },
        { department: { $regex: q, $options: "i" } }, // ✅ NEW
      ],
    };

    const docs = await db
      .collection(COLLECTION)
      .find(filter, {
        projection: {
          name: 1,
          mobile: 1,
          adhaarNumber: 1,
          badgeNo: 1,
          department: 1, // ✅ NEW
        },
      })
      .limit(10)
      .toArray();

    // ✅ Make readable suggestions (includes Department if present)
    const suggestions = docs
      .map((d: any) => {
        const name = String(d.name || "").trim();
        const badge = String(d.badgeNo || "").trim();
        const mobile = String(d.mobile || "").trim();
        const aadhaar = String(d.adhaarNumber || "").trim();
        const dept = String(d.department || "").trim();

        const right = [
          dept && `Dept: ${dept}`, // ✅ NEW
          badge && `Badge: ${badge}`,
          mobile && `Mob: ${mobile}`,
          aadhaar && `Aadhaar: ${aadhaar}`,
        ]
          .filter(Boolean)
          .join(" • ");

        return right ? `${name} (${right})` : name;
      })
      .filter(Boolean);

    // Unique only
    const uniq = Array.from(new Set(suggestions));

    return NextResponse.json({ suggestions: uniq });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

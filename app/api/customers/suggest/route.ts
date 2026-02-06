import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const COLLECTION = "customers";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toYmdAny(v: any): string {
  if (!v) return "";
  try {
    const d1 = v?.$date;
    if (d1) {
      if (typeof d1 === "string") {
        const dt = new Date(d1);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
      if (typeof d1 === "number") {
        const dt = new Date(d1);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
      if (typeof d1 === "object" && d1?.$numberLong) {
        const n = Number(String(d1.$numberLong));
        const dt = new Date(n);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
    }

    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);

    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const dt = new Date(s);
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    }

    if (typeof v === "number") {
      const dt = new Date(v);
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    }

    const dt = new Date(String(v));
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  } catch {
    // ignore
  }
  return "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const qRaw = (searchParams.get("q") || "").trim();

    if (!qRaw || qRaw.length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    const db = await getDb();

    // ✅ If user types a date (YYYY-MM-DD), also search DOB/MedicalDate by date range
    const isYmd = /^\d{4}-\d{2}-\d{2}$/.test(qRaw);
    const dateOr: any[] = [];
    if (isYmd) {
      const start = new Date(qRaw + "T00:00:00.000Z");
      const end = new Date(qRaw + "T00:00:00.000Z");
      end.setUTCDate(end.getUTCDate() + 1);

      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        dateOr.push({ dob: { $gte: start, $lt: end } });
        dateOr.push({ medicalDate: { $gte: start, $lt: end } });
      }
    }

    // ✅ safer regex (prevents regex injection + weird crashes on special chars)
    const q = escapeRegex(qRaw);

    // ✅ include department in search (+ date fields when applicable)
    const filter: any = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { mobile: { $regex: q, $options: "i" } },
        { adhaarNumber: { $regex: q, $options: "i" } },
        { badgeNo: { $regex: q, $options: "i" } },
        { department: { $regex: q, $options: "i" } },
        ...dateOr,
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
          department: 1,

          // ✅ NEW: show DOB + medical date in suggestion (differentiate clearly)
          dob: 1,
          medicalDate: 1,

          // ✅ also know if photos exist (no need to return base64 here)
          passportPhoto: 1,
          aadhaarFrontPhoto: 1,
          aadhaarBackPhoto: 1,
          medicalPhoto: 1,
        },
      })
      .limit(10)
      .toArray();

    // ✅ Make readable suggestions (includes Department + DOB/MedicalDate + photo badges)
    const suggestions = docs
      .map((d: any) => {
        const name = String(d.name || "").trim();
        if (!name) return "";

        const badge = String(d.badgeNo || "").trim();
        const mobile = String(d.mobile || "").trim();
        const aadhaar = String(d.adhaarNumber || "").trim();
        const dept = String(d.department || "").trim();

        const dob = toYmdAny(d.dob);
        const med = toYmdAny(d.medicalDate);

        const hasPassport = !!d.passportPhoto?.dataUrl;
        const hasAF = !!d.aadhaarFrontPhoto?.dataUrl;
        const hasAB = !!d.aadhaarBackPhoto?.dataUrl;
        const hasMed = !!d.medicalPhoto?.dataUrl;

        const photoBits = [
          hasPassport && "PP",
          hasAF && "AF",
          hasAB && "AB",
          hasMed && "MED",
        ].filter(Boolean);

        const right = [
          dept && `Dept: ${dept}`,
          badge && `Badge: ${badge}`,
          mobile && `Mob: ${mobile}`,
          aadhaar && `Aadhaar: ${aadhaar}`,
          dob && `DOB: ${dob}`,
          med && `Medical: ${med}`,
          photoBits.length ? `Photos: ${photoBits.join(",")}` : "",
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

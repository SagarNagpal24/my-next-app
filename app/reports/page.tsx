"use client";

import React from "react";

type Category = "ladoo" | "parantha" | "bhati";
type GenderFilter = "Male" | "Female" | "Other" | "";

type YesNo = "Yes" | "No" | "";

// ✅ keep in sync with nominal-roll page
const DEPARTMENT_OPTIONS = [
  "Security",
  "FR",
  "Pandal",
  "SHK",
  "Canteen",
  "BAV",
  "Traffic",
  "HRT",
  "Baal-Satsang",
  "Coupon",
  "MNT",
  "Office",
  "Sewa-Collection",
  "Water",
  "Sewa-Samiti",
  "Medical",
  "VIP Block",
  "Langar",
  "Guest-House",
  
] as const;

type JathaDate = {
  _id: string;
  category?: string;
  jathaStartDate?: string; // YYYY-MM-DD
  jathaEndDate?: string; // YYYY-MM-DD
  travelDate?: string; // old field
  notes?: string;
};

type ReportRow = {
  _id: string;

  // customer snapshot
  customerId?: string;
  customerName?: string;
  badgeNo?: string;
  fatherOrHusbandName?: string;
  gender?: string;
  age?: number | null;
  address?: string;
  mobile?: string;
  adhaarNumber?: string;

  mode?: string;

  // ✅ in nominal-roll: these exist, but some reports payloads may not include both
  department?: string;
  sangat?: YesNo;

  bookingReqDelhiBeas?: string;
  bookingReqBeasDelhi?: string;

  // may be string id OR object OR old text
  ticketDelhiBeas?: any;
  ticketBeasDelhi?: any;

  payment?: string;

  // reports may return either jathaDateId or only jathaDate (start date)
  jathaDateId?: string;
  jathaDate?: string; // usually start date string (YYYY-MM-DD)

  travelStartDate?: string; // YYYY-MM-DD
  travelEndDate?: string; // YYYY-MM-DD

  notes?: string;

  createdAt?: string;
  updatedAt?: string;
};

type TrainTicketRow = {
  _id: string;
  name?: string;
  age?: number | null;
  gender?: string;

  seatNumber?: string;
  pnrNumber?: string;

  trainName?: string;
  trainTime?: string;
  boardingStation?: string;
  route?: string;
  travelDate?: string;

  fare?: number | string | null;
};

function inputCls() {
  return "app-input app-input-sm";
}

function normalizeRoute(route: any): "DLI-BEAS" | "BEAS-DLI" | "" {
  const raw = String(route ?? "").trim();
  if (!raw) return "";
  // normalize dashes/spacing/underscores
  const s = raw
    .toUpperCase()
    .replace(/[–—]/g, "-")
    .replace(/_/g, "-")
    .replace(/\s+/g, "")
    .replace(/--+/g, "-");

  // common variations
  if (s.includes("DLIBEAS") || s === "DLI-BEAS") return "DLI-BEAS";
  if (s.includes("BEASDLI") || s === "BEAS-DLI") return "BEAS-DLI";

  // last resort: contains both tokens
  if (s.includes("DLI") && s.includes("BEAS")) {
    return s.indexOf("DLI") < s.indexOf("BEAS") ? "DLI-BEAS" : "BEAS-DLI";
  }
  return "";
}

function extractId(x: any): string {
  if (!x) return "";
  if (typeof x === "string") {
    const s = x.trim();
    const m = s.match(/[a-fA-F0-9]{24}/);
    return (m ? m[0] : s);
  }
  if (typeof x === "number") return String(x).trim();

  // Mongo Extended JSON: { $oid: "..." }
  if (typeof x === "object" && x.$oid) return String(x.$oid).trim();

  // Common wrappers: { _id: ... } or { id: ... } or { value: ... }
  if (typeof x === "object") {
    // Common keys
    if (x._id !== undefined) return extractId(x._id);
    if (x.id !== undefined) return extractId(x.id);
    if (x.value !== undefined) return extractId(x.value);

    // Extra keys seen in some payloads
    if (x.oid !== undefined) return extractId(x.oid);
    if (x.$id !== undefined) return extractId(x.$id);
    if (x.ticketId !== undefined) return extractId(x.ticketId);
    if (x.ticket_id !== undefined) return extractId(x.ticket_id);
  }

  // last resort: try to extract any ObjectId-like token from stringified payload
  try {
    const raw = typeof x === "string" ? x : JSON.stringify(x);
    const m = String(raw || "").match(/[a-fA-F0-9]{24}/);
    if (m) return m[0];
  } catch {}
  return String(x).trim();
}

function normalizeId(x: any) {
  return extractId(x);
}


function isObjectIdLike(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(String(v || "").trim());
}

function escapeHtml(s: any) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toYMD(v: any) {
  return String(v || "").slice(0, 10);
}

/** ✅ date format: 02-Feb-2026 */
function formatDDMonYYYY(v: any) {
  const s = String(v || "").slice(0, 10);
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-GB", { month: "short" }); // Feb
  const yyyy = d.getFullYear();
  return `${dd}-${mon}-${yyyy}`;
}

/** ✅ normalize stored gender values: M/F/Male/Female/Other */
function normGender(g: any): "male" | "female" | "other" | "unknown" {
  const x = String(g ?? "").trim().toLowerCase();
  if (!x) return "unknown";
  if (x === "m" || x === "male") return "male";
  if (x === "f" || x === "female") return "female";
  if (x === "other" || x === "o") return "other";
  return "unknown";
}

function paymentToNumber(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const m = s.replaceAll(",", "").match(/-?\d+(\.\d+)?/);
  if (!m) return 0;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : 0;
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** ✅ show train ticket label with Age/Sex + Fare */
function makeTicketLabel(t: TrainTicketRow) {
  const date = String(t.travelDate || "").slice(0, 10);
  const pnr = String(t.pnrNumber || "").trim();
  const seat = String(t.seatNumber || "").trim();

  const pname = String(t.name || "").trim();
  const pAge = t.age ?? "";
  const pGender = String(t.gender || "").trim();

  const train = String(t.trainName || "").trim();
  const time = String(t.trainTime || "").trim();
  const boarding = String(t.boardingStation || "").trim();

  const fareNum = toNumberOrNull(t.fare);
  const fare = fareNum !== null ? `Fare:${fareNum}` : "";

  const pax = [pname, [pAge !== "" ? String(pAge) : "", pGender].filter(Boolean).join(" / ")]
    .filter(Boolean)
    .join(" • ");

  const parts = [
    date ? formatDDMonYYYY(date) : "",
    pnr ? `PNR:${pnr}` : "",
    seat ? `Seat:${seat}` : "",
    pax ? pax : "",
    train ? train : "",
    time ? time : "",
    boarding ? `(${boarding})` : "",
    fare ? fare : "",
  ].filter(Boolean);

  return parts.join(" • ");
}

async function exportToExcel(rows: any[], filename: string) {
  const XLSX = await import("xlsx");

  const header = [
    "S.NO",
    "NAME",
    "FATHER/HUSBAND",
    "GENDER",
    "AGE",
    "MOBILE",
    "AADHAAR",
    "ADDRESS",
    "BADGE",
    "MODE",
    "DEPARTMENT",
    "SANGAT",
    "REQ D-B",
    "REQ B-D",
    "TICKET D-B",
    "TICKET B-D",
    "FARE TOTAL",
    "PENDING",
    "PAYMENT",
    "JATHA DATE",
    "TRAVEL START",
    "TRAVEL END",
    "NOTES",
    "CREATED AT",
    "UPDATED AT",
  ];

  const upper = (v: any) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "number") return v;
    return String(v).toUpperCase();
  };

  const aoa: any[][] = [header.map((h) => String(h).toUpperCase())];
  rows.forEach((r: any, idx: number) => {
    aoa.push([
      idx + 1,
      upper(r.customerName || ""),
      upper(r.fatherOrHusbandName || ""),
      upper(r.gender || ""),
      r.age ?? "",
      upper(r.mobile || ""),
      upper(r.adhaarNumber || ""),
      upper(r.address || ""),
      upper(r.badgeNo || ""),
      upper(r.mode || ""),
      upper(r.department || ""),
      upper(r.sangat || ""),
      upper(r.bookingReqDelhiBeas || ""),
      upper(r.bookingReqBeasDelhi || ""),
      upper(r.ticketDelhiBeas || ""),
      upper(r.ticketBeasDelhi || ""),
      r.fareTotal ?? 0,
      r.pending ?? 0,
      r.payment ? Number(r.payment) || r.payment : 0,
      upper(r.jathaDate || ""),
      upper(r.travelStartDate || ""),
      upper(r.travelEndDate || ""),
      upper(r.notes || ""),
      upper(r.createdAt || ""),
      upper(r.updatedAt || ""),
    ]);
  });


  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "REPORTS");
  XLSX.writeFile(wb, filename);
}

export default function ReportsPage() {
  const [tab, setTab] = React.useState<Category>("ladoo");

  // filters
  const [q, setQ] = React.useState("");
  const [name, setName] = React.useState("");
  const [badgeNo, setBadgeNo] = React.useState("");
  const [gender, setGender] = React.useState<GenderFilter>("");

  const [department, setDepartment] = React.useState<string>("");
  const [sangat, setSangat] = React.useState<YesNo>("");
  const [mode, setMode] = React.useState<string>("");

  const [reqDB, setReqDB] = React.useState<YesNo>("");
  const [reqBD, setReqBD] = React.useState<YesNo>("");

  const [jathaFrom, setJathaFrom] = React.useState("");
  const [jathaTo, setJathaTo] = React.useState("");

  const [travelFrom, setTravelFrom] = React.useState("");
  const [travelTo, setTravelTo] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [rawItems, setRawItems] = React.useState<ReportRow[]>([]);
  const [exporting, setExporting] = React.useState<"filtered" | "all" | null>(null);

  const [deptOpen, setDeptOpen] = React.useState(false);
  const [printing, setPrinting] = React.useState(false);

  // jatha dates (for mismatch grouping + start/end display)
  const [jathaDates, setJathaDates] = React.useState<JathaDate[]>([]);
  const [loadingJathaDates, setLoadingJathaDates] = React.useState(false);

  // mismatch toggle
  const [showMismatchOnly, setShowMismatchOnly] = React.useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState<ReportRow | null>(null);
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Train ticket label maps (to show full ticket info instead of id)
  const [trainDliBeas, setTrainDliBeas] = React.useState<TrainTicketRow[]>([]);
  const [trainBeasDli, setTrainBeasDli] = React.useState<TrainTicketRow[]>([]);
  const [allTickets, setAllTickets] = React.useState<TrainTicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = React.useState(true);

  // ✅ Load reports rows from server (same endpoint used by export)
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("category", tab);
      params.set("limit", "10000");
      const res = await fetch(`/api/reports/nominal-roll?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      const items: ReportRow[] =
        Array.isArray(data) ? data :
        Array.isArray(data.items) ? data.items :
        Array.isArray(data.data) ? data.data :
        Array.isArray(data.rows) ? data.rows :
        Array.isArray(data.tickets) ? data.tickets :
        Array.isArray(data?.data?.items) ? data.data.items :
        [];

      setRawItems(items || []);
    } catch (e) {
      console.error(e);
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);



  const ticketLabelMap = React.useMemo(() => {
    // ✅ Build from ALL tickets (do not depend on route field being present)
    const m = new Map<string, string>();
    for (const t of allTickets) {
      const id = extractId(t._id);
      if (id) m.set(id, makeTicketLabel(t));
    }
    return m;
  }, [allTickets]);

  const ticketFareMap = React.useMemo(() => {
    // ✅ Build from ALL tickets (do not depend on route field being present)
    const m = new Map<string, number>();
    for (const t of allTickets) {
      const n = toNumberOrNull((t as any).fare);
      const id = extractId(t._id);
      if (id && n !== null) m.set(id, n);
    }
    return m;
  }, [allTickets]);

  function normalizeTicketId(v: any): string {
    return extractId(v);
  }

  /** ✅ show full label if id exists, else show object label, else show text fallback */
  function renderTicket(v?: any) {
    if (!v) return "-";
    if (typeof v === "object") {
      // sometimes reports returns the embedded ticket doc
      const id = normalizeTicketId(v);
      if (id && ticketLabelMap.get(id)) return ticketLabelMap.get(id)!;
      // try to label from object fields
      try {
        const t: TrainTicketRow = {
          _id: id || "",
          travelDate: String(v.travelDate || v.travel_date || "").slice(0, 10),
          pnrNumber: v.pnrNumber || v.pnr || "",
          seatNumber: v.seatNumber || v.seat || "",
          name: v.name || "",
          age: v.age ?? null,
          gender: v.gender || "",
          trainName: v.trainName || v.train || "",
          trainTime: v.trainTime || v.time || "",
          boardingStation: v.boardingStation || v.boarding || "",
          route: v.route || "",
          fare: v.fare ?? null,
        };
        const lbl = makeTicketLabel(t);
        return lbl || (id || "-");
      } catch {
        return id || "-";
      }
    }

    const s = String(v || "").trim();
    if (!s) return "-";
    if (isObjectIdLike(s)) return ticketLabelMap.get(s) || "-";
    return s;
  }

  function ticketFare(v?: any): number {
    const id = normalizeTicketId(v);
    if (!id) return 0;
    return ticketFareMap.get(id) ?? 0;
  }

  // jatha date range for a row (prefer id, fallback to start date match)
  function jathaRangeForRow(r: ReportRow): { start: string; end: string } {
    const id = String(r.jathaDateId || "").trim();
    if (id) {
      const j = jathaDates.find((x) => String(x._id) === id);
      if (j) {
        const start = toYMD(j.jathaStartDate || j.travelDate || "");
        const end = toYMD(j.jathaEndDate || j.travelDate || j.jathaStartDate || "");
        return { start, end };
      }
    }

    const startKey = toYMD(r.jathaDate);
    if (startKey) {
      const j = jathaDates.find((x) => toYMD(x.jathaStartDate || x.travelDate) === startKey);
      if (j) {
        const start = toYMD(j.jathaStartDate || j.travelDate || "");
        const end = toYMD(j.jathaEndDate || j.travelDate || j.jathaStartDate || "");
        return { start, end };
      }
      // if no match, treat row.jathaDate as start and end same
      return { start: startKey, end: startKey };
    }

    return { start: "", end: "" };
  }

  function isMismatch(r: ReportRow) {
    const jr = jathaRangeForRow(r);
    const ts = toYMD(r.travelStartDate || "");
    const te = toYMD(r.travelEndDate || "");
    // mismatch if we have jatha range + travel range but they don't match
    if (jr.start && ts && jr.start !== ts) return true;
    if (jr.end && te && jr.end !== te) return true;
    return false;
  }

  // ✅ Full client-side filtering (supports new columns, and consistent gender filtering)
  const filteredItems = React.useMemo(() => {
    let list = rawItems;

    // gender (normalized)
    if (gender) {
      const want = gender === "Male" ? "male" : gender === "Female" ? "female" : gender === "Other" ? "other" : "unknown";
      list = list.filter((r) => normGender(r.gender) === want);
    }

    // department (exact match)
    if (department.trim()) {
      const d = department.trim().toLowerCase();
      list = list.filter((r) => String(r.department || "").trim().toLowerCase() === d);
    }

    // sangat
    if (sangat) {
      list = list.filter((r) => String(r.sangat || "").trim() === sangat);
    }

    // mode
    if (mode.trim()) {
      const m = mode.trim().toLowerCase();
      list = list.filter((r) => String(r.mode || "").trim().toLowerCase() === m);
    }

    // req filters
    if (reqDB) list = list.filter((r) => String(r.bookingReqDelhiBeas || "").trim() === reqDB);
    if (reqBD) list = list.filter((r) => String(r.bookingReqBeasDelhi || "").trim() === reqBD);

    // quick search q (includes tickets, dept, etc.)
    const qq = q.trim().toLowerCase();
    if (qq) {
      list = list.filter((r) => {
        const jr = jathaRangeForRow(r);
        const hay = [
          r.customerName,
          r.fatherOrHusbandName,
          r.gender,
          r.age ?? "",
          r.address,
          r.mobile,
          r.adhaarNumber,
          r.badgeNo,
          r.mode,
          r.department,
          r.sangat,
          r.bookingReqDelhiBeas,
          r.bookingReqBeasDelhi,
          renderTicket(r.ticketDelhiBeas),
          renderTicket(r.ticketBeasDelhi),
          r.payment,
          jr.start,
          jr.end,
          r.travelStartDate,
          r.travelEndDate,
          r.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(qq);
      });
    }

    // name filter
    if (name.trim()) {
      const n = name.trim().toLowerCase();
      list = list.filter((r) => String(r.customerName || "").toLowerCase().includes(n));
    }

    // badge filter
    if (badgeNo.trim()) {
      const b = badgeNo.trim().toLowerCase();
      list = list.filter((r) => String(r.badgeNo || "").toLowerCase().includes(b));
    }

    // date filters (jatha start/end)
    if (jathaFrom) {
      const f = jathaFrom;
      list = list.filter((r) => {
        const jr = jathaRangeForRow(r);
        const key = jr.start || toYMD(r.jathaDate);
        return key >= f;
      });
    }
    if (jathaTo) {
      const t = jathaTo;
      list = list.filter((r) => {
        const jr = jathaRangeForRow(r);
        const key = jr.end || jr.start || toYMD(r.jathaDate);
        return key <= t;
      });
    }

    // travel filters
    if (travelFrom) {
      const f = travelFrom;
      list = list.filter((r) => toYMD(r.travelStartDate || r.jathaDate) >= f);
    }
    if (travelTo) {
      const t = travelTo;
      list = list.filter((r) => toYMD(r.travelEndDate || r.jathaDate) <= t);
    }

    return list;
  }, [
    rawItems,
    q,
    name,
    badgeNo,
    gender,
    department,
    sangat,
    mode,
    reqDB,
    reqBD,
    jathaFrom,
    jathaTo,
    travelFrom,
    travelTo,
    ticketLabelMap,
    jathaDates,
  ]);

  const items = React.useMemo(() => {
    if (!showMismatchOnly) return filteredItems;
    return filteredItems.filter((r) => isMismatch(r));
  }, [filteredItems, showMismatchOnly, jathaDates]);

  type DeptSummaryRow = {
    dept: string;
    sewadars: number;
    sangat: number;
    total: number;
    bus: number;
    train: number;
    self: number;
  };

  const deptSummary = React.useMemo<DeptSummaryRow[]>(() => {
    const map = new Map<string, DeptSummaryRow>();

    function normDept(v: any) {
      const s = String(v || "").trim();
      return s ? s.toUpperCase() : "";
    }

    function keyForRow(r: any) {
      const sangat = String(r.sangat || "").trim().toLowerCase();
      const dept = normDept(r.department);
      if ((sangat === "yes") && !dept) return "SANGAT";
      return dept || "UNKNOWN";
    }

    function getOrCreate(k: string) {
      if (!map.has(k)) {
        map.set(k, { dept: k, sewadars: 0, sangat: 0, total: 0, bus: 0, train: 0, self: 0 });
      }
      return map.get(k)!;
    }

    for (const r of items) {
      const sangat = String(r.sangat || "").trim().toLowerCase(); // yes/no/blank
      const deptKey = keyForRow(r);
      const row = getOrCreate(deptKey);

      // travel mode counts
      const mode = String(r.mode || "").trim().toLowerCase();
      if (mode === "bus") row.bus += 1;
      else if (mode === "train") row.train += 1;
      else if (mode === "self") row.self += 1;

      // sewadars vs sangat counts
      if (sangat === "yes") {
        row.sangat += 1;
      } else {
        // blank or "no"
        row.sewadars += 1;
      }
    }

    // totals + sort (keep UNKNOWN last)
    const out = Array.from(map.values()).map((x) => ({ ...x, total: x.sewadars + x.sangat }));
    out.sort((a, b) => {
      if (a.dept === "UNKNOWN") return 1;
      if (b.dept === "UNKNOWN") return -1;
      if (a.dept === "SANGAT") return 1;
      if (b.dept === "SANGAT") return -1;
      return a.dept.localeCompare(b.dept);
    });

    return out;
  }, [items]);

  const deptTotals = React.useMemo(() => {
    return deptSummary.reduce(
      (acc, r) => {
        acc.sewadars += r.sewadars;
        acc.sangat += r.sangat;
        acc.total += r.total;
        acc.bus += r.bus;
        acc.train += r.train;
        acc.self += r.self;
        return acc;
      },
      { sewadars: 0, sangat: 0, total: 0, bus: 0, train: 0, self: 0 }
    );
  }, [deptSummary]);

  async function onExportDeptSummary() {
    try {
      const XLSX = await import("xlsx");
      const rows = deptSummary.map((r, idx) => ({
        "S NO": idx + 1,
        DEPTT: r.dept,
        SEWADAR: r.sewadars,
        SANGAT: r.sangat,
        TOTAL: r.total,
        BUS: r.bus,
        "TRAIN": r.train,
        "SELF": r.self,
      }));

      // add totals row
      rows.push({
        "S NO": "",
        DEPTT: "TOTAL",
        SEWADAR: deptTotals.sewadars,
        SANGAT: deptTotals.sangat,
        TOTAL: deptTotals.total,
        BUS: deptTotals.bus,
        "TRAIN": deptTotals.train,
        "SELF": deptTotals.self,
      } as any);

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DEPT_REPORT");

      const fname = `DEPT_REPORT_${String(tab || "all").toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fname);
    } catch (e) {
      console.error(e);
      alert("Failed to export Dept Report");
    }
  }

  // mismatch groups
  const mismatchGroups = React.useMemo(() => {
    const groups = new Map<string, { key: string; jrStart: string; jrEnd: string; trStart: string; trEnd: string; rows: ReportRow[] }>();
    for (const r of items) {
      if (!isMismatch(r)) continue;
      const jr = jathaRangeForRow(r);
      const trStart = toYMD(r.travelStartDate || "");
      const trEnd = toYMD(r.travelEndDate || "");
      const key = `${jr.start || "-"}|${trStart || "-"}|${jr.end || "-"}|${trEnd || "-"}`;
      if (!groups.has(key)) {
        groups.set(key, { key, jrStart: jr.start, jrEnd: jr.end, trStart, trEnd, rows: [] });
      }
      groups.get(key)!.rows.push(r);
    }
    return Array.from(groups.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [items, showMismatchOnly, jathaDates]);

  // Load train tickets once (for readable labels)
  async function loadTrainTickets() {
    setLoadingTickets(true);
    try {
      // ✅ Robust: try multiple common response shapes and fallback endpoints.
      const endpoints = [
        `/api/train-data?limit=10000`,
        `/api/train-data?limit=20000`,
        `/api/train-data`,
        `/api/train-data?all=1`,
        `/api/train-data?route=${encodeURIComponent("DLI-BEAS")}&limit=10000`,
        `/api/train-data?route=${encodeURIComponent("BEAS-DLI")}&limit=10000`,
      ];

      async function fetchOne(url: string): Promise<any[]> {
        try {
          const res = await fetch(url, { cache: "no-store" });
          // if non-2xx, treat as empty
          if (!res.ok) return [];
          const d = await res.json().catch(() => ({}));

          // common shapes: {items}, {data}, {tickets}, array, {data:{items}}
          const arr =
            Array.isArray(d?.items) ? d.items :
            Array.isArray(d?.data) ? d.data :
            Array.isArray(d?.tickets) ? d.tickets :
            Array.isArray(d?.rows) ? d.rows :
            Array.isArray(d?.data?.items) ? d.data.items :
            Array.isArray(d) ? d :
            [];
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [];
        }
      }

      let rawItems: any[] = [];
      for (const url of endpoints) {
        const got = await fetchOne(url);
        if (got.length > 0) { rawItems = got; break; }
      }

      // If we fetched per-route, we might only have one direction; merge both.
      // If the first successful endpoint was per-route, the later endpoint calls won't run,
      // so do a second fetch for the other route when needed.
      if (rawItems.length > 0) {
        const hasRouteKey = rawItems.some((x: any) => String(x?.route || "").includes("DLI") || String(x?.route || "").includes("BEAS"));
        // no-op; just keep.
      } else {
        // last attempt: fetch both routes and merge
        const [a, b] = await Promise.all([
          fetchOne(`/api/train-data?route=${encodeURIComponent("DLI-BEAS")}&limit=10000`),
          fetchOne(`/api/train-data?route=${encodeURIComponent("BEAS-DLI")}&limit=10000`),
        ]);
        rawItems = [...a, ...b];
      }

      // De-duplicate by extracted _id
      const seen = new Set<string>();
      const all: TrainTicketRow[] = [];
      for (const x of rawItems) {
        const id = extractId(x);
        if (!id) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        all.push({
          ...x,
          _id: id,
          travelDate: String(x.travelDate || x.travel_date || "").slice(0, 10),
          name: x.name || "",
          age: x.age === null || x.age === undefined || x.age === "" ? null : Number(x.age),
          gender: String(x.gender || "").trim(),
          seatNumber: String(x.seatNumber || x.seat || "").trim(),
          pnrNumber: String(x.pnrNumber || x.pnr || "").trim(),
          trainName: String(x.trainName || "").trim(),
          trainTime: String(x.trainTime || "").trim(),
          boardingStation: String(x.boardingStation || "").trim(),
          route: String(x.route || "").trim(),
          fare: x.fare,
        });
      }

      setAllTickets(all);

      // split by route like nominal-roll (after normalizing)
      setTrainDliBeas(all.filter((t) => normalizeRoute(t.route) === "DLI-BEAS"));
      setTrainBeasDli(all.filter((t) => normalizeRoute(t.route) === "BEAS-DLI"));
    } finally {
      setLoadingTickets(false);
    }
  }

  
  async function loadJathaDates() {
    setLoadingJathaDates(true);
    try {
      const cat = String(tab || "").trim();
      const endpoints = [
        `/api/jatha-date?category=${encodeURIComponent(cat)}`,
        `/api/jatha-dates?category=${encodeURIComponent(cat)}`,
        `/api/jatha-date?category=${encodeURIComponent(cat)}&limit=5000`,
        `/api/jatha-dates?category=${encodeURIComponent(cat)}&limit=5000`,
        `/api/jatha-date`,
        `/api/jatha-dates`,
      ];

      function extractArray(payload: any): any[] {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(payload.rows)) return payload.rows;
        if (Array.isArray(payload.data)) return payload.data;
        if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
        if (Array.isArray(payload.jathaDates)) return payload.jathaDates;
        return [];
      }

      async function fetchOne(url: string): Promise<any[]> {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return [];
          const d = await res.json().catch(() => ({}));
          return extractArray(d);
        } catch {
          return [];
        }
      }

      let all: any[] = [];
      for (const url of endpoints) {
        const got = await fetchOne(url);
        if (got.length) {
          all = got;
          break;
        }
      }

      const normalized: JathaDate[] = all.map((j: any) => {
        const id = extractId(j);
        const start =
          String(j.jathaStartDate || j.startDate || j.travelDate || j.date || "").slice(0, 10);
        const end =
          String(j.jathaEndDate || j.endDate || j.travelDate || j.date || "").slice(0, 10) || start;
        return {
          _id: id || String(j._id || ""),
          category: j.category,
          jathaStartDate: start,
          jathaEndDate: end,
          travelDate: String(j.travelDate || "").slice(0, 10),
          notes: j.notes,
        };
      });

      setJathaDates(normalized);
    } finally {
      setLoadingJathaDates(false);
    }
  }

React.useEffect(() => {
    loadTrainTickets();
  }, []);


  React.useEffect(() => {
    load();
    loadJathaDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function clearFilters() {
    setQ("");
    setName("");
    setBadgeNo("");
    setGender("");
    setDepartment("");
    setSangat("");
    setMode("");
    setReqDB("");
    setReqBD("");
    setJathaFrom("");
    setJathaTo("");
    setTravelFrom("");
    setTravelTo("");
  }

  // ✅ Summary counts + payment sum (based on FILTERED items)
  const summary = React.useMemo(() => {
    let male = 0;
    let female = 0;
    let other = 0;
    let paymentSum = 0;
    let fareSum = 0;
    let pendingSum = 0;

    for (const r of items) {
      const g = normGender(r.gender);
      if (g === "male") male++;
      else if (g === "female") female++;
      else if (g === "other") other++;

      const pay = paymentToNumber(r.payment);
      const fareTotal = ticketFare(r.ticketDelhiBeas) + ticketFare(r.ticketBeasDelhi);
      const pending = Math.max(0, fareTotal - pay);

      paymentSum += pay;
      fareSum += fareTotal;
      pendingSum += pending;
    }

    return { total: items.length, male, female, other, paymentSum, fareSum, pendingSum };
  }, [items, ticketFareMap]);

  function rowComputed(r: ReportRow) {
    const jr = jathaRangeForRow(r);
    const fareTotal = ticketFare(r.ticketDelhiBeas) + ticketFare(r.ticketBeasDelhi);
    const pay = paymentToNumber(r.payment);
    const pending = Math.max(0, fareTotal - pay);

    return {
      jathaStartDate: jr.start,
      jathaEndDate: jr.end,
      fareTotal,
      pending,
    };
  }

  // Export with labels + computed values
  function rowsForExport(rows: ReportRow[]) {
    return rows.map((r) => {
      const c = rowComputed(r);
      return {
        ...r,
        ticketDelhiBeas: renderTicket(r.ticketDelhiBeas),
        ticketBeasDelhi: renderTicket(r.ticketBeasDelhi),
        fareTotal: c.fareTotal,
        pending: c.pending,
        jathaDate: `${formatDDMonYYYY(c.jathaStartDate) || "-"} → ${formatDDMonYYYY(c.jathaEndDate) || "-"}`,
        travelStartDate: formatDDMonYYYY(r.travelStartDate),
        travelEndDate: formatDDMonYYYY(r.travelEndDate),
        createdAt: formatDDMonYYYY(r.createdAt),
        updatedAt: formatDDMonYYYY(r.updatedAt),
      };
    });
  }

  async function onExportFiltered() {
    setExporting("filtered");
    try {
      await exportToExcel(
        rowsForExport(items),
        `${tab.toUpperCase()}_REPORTS_FILTERED_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } finally {
      setExporting(null);
    }
  }

  async function onExportAll() {
    setExporting("all");
    try {
      const params = new URLSearchParams();
      params.set("category", tab);
      params.set("limit", "10000");
      const res = await fetch(`/api/reports/nominal-roll?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const all: ReportRow[] = Array.isArray(data.items) ? data.items : [];

      const allWithLabels = rowsForExport(all);
      await exportToExcel(allWithLabels, `${tab.toUpperCase()}_REPORTS_ALL_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(null);
    }
  }

  // -------- PRINT TICKETS (6 per A4 page, multi-page) --------
  function buildTicketsHtml(rows: ReportRow[]) {
    const chunkSize = 4;
    const pages: string[] = [];

    const cardsForChunk = (chunk: ReportRow[], offset: number) =>
      chunk
        .map((r, idx) => {
          const sn = offset + idx + 1;

          const name = escapeHtml(r.customerName || "-");
          const badge = escapeHtml(r.badgeNo || "-");
          const mobile = escapeHtml(r.mobile || "-");
          const modeStr = escapeHtml(r.mode || "-");
          const dept = escapeHtml(r.department || "-");
          const sangatStr = escapeHtml(r.sangat || "-");

          const c = rowComputed(r);
          const jdStart = escapeHtml(formatDDMonYYYY(c.jathaStartDate) || "-");
          const jdEnd = escapeHtml(formatDDMonYYYY(c.jathaEndDate) || "-");
          const start = escapeHtml(formatDDMonYYYY(r.travelStartDate) || "-");
          const end = escapeHtml(formatDDMonYYYY(r.travelEndDate) || "-");

          const tDB = escapeHtml(renderTicket(r.ticketDelhiBeas));
          const tBD = escapeHtml(renderTicket(r.ticketBeasDelhi));

          return `
            <div class="ticket">
              <div class="head">
                <div class="title">Nominal Ticket</div>
                <div class="sn">#${sn}</div>
              </div>

              <div class="row"><span class="label">Name:</span><span class="value">${name}</span></div>
              <div class="row"><span class="label">Mobile:</span><span class="value">${mobile}</span></div>
              <div class="row"><span class="label">Badge:</span><span class="value">${badge}</span></div>
              <div class="row"><span class="label">Mode:</span><span class="value">${modeStr}</span></div>
              <div class="row"><span class="label">Dept:</span><span class="value">${dept}</span></div>
              <div class="row"><span class="label">Sangat:</span><span class="value">${sangatStr}</span></div>

              <div class="sep"></div>

              <div class="row"><span class="label">Jatha:</span><span class="value">${jdStart} → ${jdEnd}</span></div>
              <div class="row"><span class="label">Travel:</span><span class="value">${start} → ${end}</span></div>

              <div class="sep"></div>

              <div class="subhead">Ticket Details</div>

              <div class="row2">
                <div class="col">
                  <div class="coltitle">Delhi → Beas</div>
                  <div class="tickettext">${tDB}</div>
                </div>
                <div class="col">
                  <div class="coltitle">Beas → Delhi</div>
                  <div class="tickettext">${tBD}</div>
                </div>
              </div>

              <div class="contact">
                Contact:<br> Gurjeet Kaur - 9999934357  <br> Pulkit Sethi - 9871331688
              </div>
            </div>
          `;
        })
        .join("");

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const cards = cardsForChunk(chunk, i);

      const emptyCount = chunkSize - chunk.length;
      const empties = Array.from({ length: emptyCount }, () => `<div class="ticket ticket-empty"></div>`).join("");

      pages.push(`
        <div class="page">
          <div class="grid">
            ${cards}
            ${empties}
          </div>
        </div>
      `);
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Tickets</title>
        <style>
          @page { size: A4; margin: 10mm; }
          html, body { margin:0; padding:0; font-family: Arial, sans-serif; color:#111; }

          .page {
            width: 190mm;
            height: 277mm;
            box-sizing: border-box;
            page-break-after: always;
          }
          .page:last-child { page-break-after: auto; }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 7mm;
            width: 100%;
            height: 100%;
          }

          .ticket {
            border: 1.2px solid #111;
            border-radius: 10px;
            padding: 5mm;
            box-sizing: border-box;
            display:flex;
            flex-direction:column;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .ticket-empty { border: 0; }

          .head { display:flex; justify-content:space-between; align-items:center; margin-bottom: 3mm; }
          .title { font-size: 13pt; font-weight: 800; }
          .sn { font-size: 11pt; font-weight: 800; }

          .row {
            display:flex;
            gap: 8px;
            margin: 1.2mm 0;
            font-size: 10.8pt;
            line-height: 1.15;
          }
          .label { width: 34%; font-weight: 800; }
          .value { width: 66%; font-weight: 650; }

          .sep { margin: 3mm 0; border-top: 1px dashed #999; }

          .subhead { font-size: 11pt; font-weight: 800; margin-bottom: 2mm; }

          .row2 { display:flex; gap: 8mm; }
          .col { width: 50%; }
          .coltitle { font-size: 10.5pt; font-weight: 800; margin-bottom: 1mm; }
          .tickettext { font-size: 10pt; font-weight: 650; line-height: 1.2; word-break: break-word; }

          .contact{
            margin-top:auto;
            padding-top: 2mm;
            font-size: 8pt;
            font-weight: 800;
            color: #353434ff;
            text-align: left;
          }
        </style>
      </head>
      <body>
        ${pages.join("")}
      </body>
      </html>
    `;
  }

  async function onPrintTickets() {
    if (!items.length) {
      alert("No data to print (current filtered list is empty).");
      return;
    }

    setPrinting(true);
    try {
      const w = window.open("", "_blank");
      if (!w) {
        alert("Popup blocked. Please allow popups for printing.");
        return;
      }
      w.document.open();
      w.document.write(buildTicketsHtml(items)); // ✅ print filtered items
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 350);
    } finally {
      setPrinting(false);
    }
  }

  function openEdit(r: ReportRow) {
    setEditRow({ ...r });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editRow) return;
    setSavingEdit(true);
    try {
      // ✅ Ensure we always send a single Jatha Date (jathaDateId) like nominal-roll page
      let effectiveJathaDateId = String(editRow.jathaDateId || "").trim();
      if (!effectiveJathaDateId) {
        const jr = jathaRangeForRow(editRow);
        const startKey = jr.start || toYMD(editRow.jathaDate || "");
        const match = startKey
          ? jathaDates.find((j) => toYMD(j.jathaStartDate || j.travelDate) === startKey)
          : undefined;
        if (match?._id) effectiveJathaDateId = String(match._id);
      }

      const jrForPayload = jathaRangeForRow(editRow);
      const payload: any = {
        department: editRow.department || "",
        sangat: editRow.sangat || "",
        mode: editRow.mode || "",
        bookingReqDelhiBeas: editRow.bookingReqDelhiBeas || "",
        bookingReqBeasDelhi: editRow.bookingReqBeasDelhi || "",
        ticketDelhiBeas: normalizeTicketId(editRow.ticketDelhiBeas) || "",
        ticketBeasDelhi: normalizeTicketId(editRow.ticketBeasDelhi) || "",
        payment: editRow.payment || "",
        jathaDateId: effectiveJathaDateId || "",
        jathaDate: jrForPayload.start || toYMD(editRow.jathaDate) || "",
        travelStartDate: toYMD(editRow.travelStartDate) || "",
        travelEndDate: toYMD(editRow.travelEndDate) || "",
        notes: editRow.notes || "",
      };

      const res = await fetch(`/api/nominal-roll/${tab}/${encodeURIComponent(editRow._id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Failed to update.");
        return;
      }

      // refresh from server to keep reports consistent
      await load();
      setEditOpen(false);
      setEditRow(null);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="app-page w-full max-w-none">
      <div className="app-card app-card-pad w-full max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Reports</h1>
            <p className="app-subtitle">
              View Nominal Roll data for Ladoo / Parantha / Bhati with filters and Excel export.
              {loadingTickets ? " (Loading ticket labels...)" : ""}
              {loadingJathaDates ? " (Loading jatha dates...)" : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onExportFiltered} disabled={exporting !== null} className="app-btn app-btn-secondary h-10 px-4">
              {exporting === "filtered" ? "Exporting..." : "Export Filtered"}
            </button>
            <button onClick={onExportAll} disabled={exporting !== null} className="app-btn app-btn-secondary h-10 px-4">
              {exporting === "all" ? "Exporting..." : "Export All"}
            </button>

            <button onClick={() => setDeptOpen(true)} className="app-btn app-btn-secondary h-10 px-4">
              Dept Report
            </button>

            <button
              onClick={onPrintTickets}
              disabled={printing}
              className="app-btn app-btn-primary h-10 px-4"
              title="Print current filtered results (6 tickets per A4 page)"
            >
              {printing ? "Preparing..." : "Print Tickets"}
            </button>

            <button
              onClick={() => setShowMismatchOnly((v) => !v)}
              className={["app-btn h-10 px-4", showMismatchOnly ? "app-btn-primary" : "app-btn-secondary"].join(" ")}
              title="Show only records where Jatha Start/End does not match Travel Start/End"
            >
              {showMismatchOnly ? "Show All Dates" : "Show Mismatched Dates"}
            </button>

            <button
              onClick={loadTrainTickets}
              disabled={loadingTickets}
              className="app-btn app-btn-secondary h-10 px-4"
              title="Reload Train Data to refresh ticket labels"
            >
              {loadingTickets ? "Refreshing Tickets..." : "Refresh Tickets"}
            </button>
          </div>
        </div>

        {/* Subtabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {(["ladoo", "parantha", "bhati"] as Category[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                "h-10 rounded-xl px-4 text-sm font-semibold border",
                tab === t
                  ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                  : "bg-white text-black border-black/10 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-white dark:border-white/10 dark:hover:bg-white/5",
              ].join(" ")}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <div className="app-label">Quick Search (All Columns)</div>
            <input className={inputCls()} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type anything..." />
          </div>

          <div>
            <div className="app-label">Name</div>
            <input className={inputCls()} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name contains..." />
          </div>

          <div>
            <div className="app-label">Badge No</div>
            <input className={inputCls()} value={badgeNo} onChange={(e) => setBadgeNo(e.target.value)} placeholder="Badge contains..." />
          </div>

          <div>
            <div className="app-label">Mode</div>
            <select className={inputCls()} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">All</option>
              <option value="Train">Train</option>
              <option value="Bus">Bus</option>
              <option value="Self">Self</option>
            </select>
          </div>

          <div>
            <div className="app-label">Department</div>
            <select className={inputCls()} value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">All</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="app-label">Sangat</div>
            <select className={inputCls()} value={sangat} onChange={(e) => setSangat(e.target.value as any)}>
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <div className="app-label">Gender</div>
            <select className={inputCls()} value={gender} onChange={(e) => setGender(e.target.value as any)}>
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">(Works for values: M/F/Male/Female)</div>
          </div>

          <div>
            <div className="app-label">REQ D-B</div>
            <select className={inputCls()} value={reqDB} onChange={(e) => setReqDB(e.target.value as any)}>
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <div className="app-label">REQ B-D</div>
            <select className={inputCls()} value={reqBD} onChange={(e) => setReqBD(e.target.value as any)}>
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <div className="app-label">Jatha Date From</div>
            <input type="date" className={inputCls()} value={jathaFrom} onChange={(e) => setJathaFrom(e.target.value)} />
          </div>

          <div>
            <div className="app-label">Jatha Date To</div>
            <input type="date" className={inputCls()} value={jathaTo} onChange={(e) => setJathaTo(e.target.value)} />
          </div>

          <div>
            <div className="app-label">Travel From</div>
            <input type="date" className={inputCls()} value={travelFrom} onChange={(e) => setTravelFrom(e.target.value)} />
          </div>

          <div>
            <div className="app-label">Travel To</div>
            <input type="date" className={inputCls()} value={travelTo} onChange={(e) => setTravelTo(e.target.value)} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" className="app-btn app-btn-secondary h-10 px-4" onClick={clearFilters}>
            Clear Filters
          </button>
          <button type="button" className="app-btn app-btn-primary h-10 px-4" onClick={load}>
            Refresh From Server
          </button>
        </div>

        {/* SUMMARY */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-zinc-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-black/30">
          <div>
            <span className="font-semibold">Total:</span> {summary.total}
          </div>
          <div>
            <span className="font-semibold">Male:</span> {summary.male}
          </div>
          <div>
            <span className="font-semibold">Female:</span> {summary.female}
          </div>
          <div className="text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-inherit">Other:</span> {summary.other}
          </div>
          <div className="ml-auto flex flex-wrap gap-3">
            <div>
              <span className="font-semibold">Fare Sum:</span> {summary.fareSum}
            </div>
            <div>
              <span className="font-semibold">Pending Sum:</span> {summary.pendingSum}
            </div>
            <div>
              <span className="font-semibold">Payment Sum:</span> {summary.paymentSum}
            </div>
          </div>
        </div>

        {/* MISMATCH GROUPS */}
        {showMismatchOnly && (
          <div className="mt-4 rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">Mismatch Groups</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Grouped by (Jatha Start/End) vs (Travel Start/End)
              </div>
            </div>

            {mismatchGroups.length === 0 ? (
              <div className="mt-2 text-zinc-600 dark:text-zinc-400">No mismatches found in current filtered list.</div>
            ) : (
              <div className="mt-3 space-y-3">
                {mismatchGroups.map((g) => (
                  <div key={g.key} className="rounded-xl border border-black/10 p-3 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold">
                        Jatha: {formatDDMonYYYY(g.jrStart) || "-"} → {formatDDMonYYYY(g.jrEnd) || "-"} | Travel:{" "}
                        {formatDDMonYYYY(g.trStart) || "-"} → {formatDDMonYYYY(g.trEnd) || "-"}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">Count: {g.rows.length}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div className="w-full overflow-x-auto mt-4">
          <table className="min-w-[2800px] table-fixed border-collapse text-xs">
            <thead className="thead">
              <tr>
                <th className="th w-14 px-2 py-2">S.No</th>
                <th className="th w-36 px-2 py-2">Actions</th>

                <th className="th w-48 px-2 py-2">Name</th>
                <th className="th w-48 px-2 py-2">Father/Husband</th>
                <th className="th w-24 px-2 py-2">Gender</th>
                <th className="th w-16 px-2 py-2">Age</th>
                <th className="th w-32 px-2 py-2">Mobile</th>
                <th className="th w-36 px-2 py-2">Aadhaar</th>
                <th className="th w-72 px-2 py-2">Address</th>
                <th className="th w-28 px-2 py-2">Badge</th>

                <th className="th w-20 px-2 py-2">Mode</th>
                <th className="th w-40 px-2 py-2">Department</th>
                <th className="th w-20 px-2 py-2">Sangat</th>

                <th className="th w-20 px-2 py-2">REQ D-B</th>
                <th className="th w-20 px-2 py-2">REQ B-D</th>

                <th className="th w-[520px] px-2 py-2">Ticket D-B</th>
                <th className="th w-[520px] px-2 py-2">Ticket B-D</th>

                <th className="th w-24 px-2 py-2">Fare Total</th>
                <th className="th w-24 px-2 py-2">Pending</th>
                <th className="th w-32 px-2 py-2">Payment</th>

                <th className="th w-44 px-2 py-2">Jatha Date</th>
                <th className="th w-28 px-2 py-2">Travel Start</th>
                <th className="th w-28 px-2 py-2">Travel End</th>

                <th className="th w-64 px-2 py-2">Notes</th>
                <th className="th w-32 px-2 py-2">Created</th>
                <th className="th w-32 px-2 py-2">Updated</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={26}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={26}>
                    No records found.
                  </td>
                </tr>
              ) : (
                items.map((r, i) => {
                  const c = rowComputed(r);
                  const pay = paymentToNumber(r.payment);
                  const pending = c.pending;

                  return (
                    <tr key={r._id} className={["row", i % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                      <td className="td px-2 py-2">{i + 1}</td>

                      <td className="td px-2 py-2">
                        <div className="flex items-center gap-2">
                          <button className="app-btn app-btn-secondary h-8 px-3" onClick={() => openEdit(r)}>
                            Edit
                          </button>
                          {isMismatch(r) && (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                              Mismatch
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="td px-2 py-2 font-medium whitespace-normal break-words">{r.customerName || "-"}</td>
                      <td className="td px-2 py-2 whitespace-normal break-words">{r.fatherOrHusbandName || "-"}</td>
                      <td className="td px-2 py-2">{r.gender || "-"}</td>
                      <td className="td px-2 py-2">{r.age ?? "-"}</td>
                      <td className="td px-2 py-2">{r.mobile || "-"}</td>
                      <td className="td px-2 py-2">{r.adhaarNumber || "-"}</td>
                      <td className="td px-2 py-2 whitespace-normal break-words">{r.address || "-"}</td>
                      <td className="td px-2 py-2">{r.badgeNo || "-"}</td>

                      <td className="td px-2 py-2">{r.mode || "-"}</td>
                      <td className="td px-2 py-2 whitespace-normal break-words">{r.department || "-"}</td>
                      <td className="td px-2 py-2">{r.sangat || "-"}</td>

                      <td className="td px-2 py-2">{r.bookingReqDelhiBeas || "-"}</td>
                      <td className="td px-2 py-2">{r.bookingReqBeasDelhi || "-"}</td>

                      <td className="td px-2 py-2 whitespace-normal break-words">{renderTicket(r.ticketDelhiBeas)}</td>
                      <td className="td px-2 py-2 whitespace-normal break-words">{renderTicket(r.ticketBeasDelhi)}</td>

                      <td className="td px-2 py-2">{c.fareTotal || "-"}</td>
                      <td className="td px-2 py-2">{pending || "-"}</td>
                      <td className="td px-2 py-2">{pay || "-"}</td>

                      <td className="td px-2 py-2 whitespace-nowrap">{(formatDDMonYYYY(c.jathaStartDate) || "-") + " → " + (formatDDMonYYYY(c.jathaEndDate) || "-")}</td>
                      <td className="td px-2 py-2 whitespace-nowrap">{formatDDMonYYYY(toYMD(r.travelStartDate)) || "-"}</td>
                      <td className="td px-2 py-2 whitespace-nowrap">{formatDDMonYYYY(toYMD(r.travelEndDate)) || "-"}</td>

                      <td className="td px-2 py-2 whitespace-normal break-words">{r.notes || "-"}</td>
                      <td className="td px-2 py-2 whitespace-nowrap">{formatDDMonYYYY(toYMD(r.createdAt)) || "-"}</td>
                      <td className="td px-2 py-2 whitespace-nowrap">{formatDDMonYYYY(toYMD(r.updatedAt)) || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      
      {/* DEPT SUMMARY MODAL */}
      {deptOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeptOpen(false);
          }}
        >
          <div className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Department Summary</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Counts are based on current filtered results.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={onExportDeptSummary} className="app-btn app-btn-secondary h-9 px-4">
                  Export Excel
                </button>
                <button onClick={() => setDeptOpen(false)} className="app-btn app-btn-primary h-9 px-4">
                  Close
                </button>
              </div>
            </div>

            <div className="mt-3 max-h-[70vh] overflow-auto rounded-xl border border-black/10 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-zinc-950">
                  <tr className="border-b border-black/10 dark:border-white/10">
                    <th className="px-3 py-2 text-left">S NO</th>
                    <th className="px-3 py-2 text-left">DEPTT</th>
                    <th className="px-3 py-2 text-right">SEWADAR</th>
                    <th className="px-3 py-2 text-right">SANGAT</th>
                    <th className="px-3 py-2 text-right">TOTAL</th>
                    <th className="px-3 py-2 text-right">BUS</th>
                    <th className="px-3 py-2 text-right">TRAIN</th>
                    <th className="px-3 py-2 text-right">SELF</th>
                  </tr>
                </thead>
                <tbody>
                  {deptSummary.map((r, idx) => (
                    <tr key={r.dept} className="border-b border-black/5 dark:border-white/5">
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{r.dept}</td>
                      <td className="px-3 py-2 text-right">{r.sewadars}</td>
                      <td className="px-3 py-2 text-right">{r.sangat}</td>
                      <td className="px-3 py-2 text-right font-semibold">{r.total}</td>
                      <td className="px-3 py-2 text-right">{r.bus}</td>
                      <td className="px-3 py-2 text-right">{r.train}</td>
                      <td className="px-3 py-2 text-right">{r.self}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-black/10 dark:border-white/10 font-semibold">
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right">{deptTotals.sewadars}</td>
                    <td className="px-3 py-2 text-right">{deptTotals.sangat}</td>
                    <td className="px-3 py-2 text-right">{deptTotals.total}</td>
                    <td className="px-3 py-2 text-right">{deptTotals.bus}</td>
                    <td className="px-3 py-2 text-right">{deptTotals.train}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

{/* EDIT MODAL (scroll only inside modal) */}
      {editOpen && editRow && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false);
          }}
        >
          <div className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-950">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Edit Report Row</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Only updates nominal-roll data fields (mode/department/sangat/req/tickets/payment/travel/notes).
                </div>
              </div>
              <button className="app-btn app-btn-secondary h-9 px-4" onClick={() => setEditOpen(false)}>
                Close
              </button>
            </div>

            <div className="mt-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="app-label">Mode</div>
                  <select
                    className={inputCls()}
                    value={editRow.mode || ""}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, mode: e.target.value } : p))}
                  >
                    <option value="">Select</option>
                    <option value="Train">Train</option>
                    <option value="Bus">Bus</option>
                    <option value="Self">Self</option>
                  </select>
                </div>

                <div>
                  <div className="app-label">Department</div>
                  <select
                    className={inputCls()}
                    value={editRow.department || ""}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, department: e.target.value } : p))}
                  >
                    <option value="">Select</option>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="app-label">Sangat</div>
                  <select
                    className={inputCls()}
                    value={editRow.sangat || ""}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, sangat: e.target.value as any } : p))}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <div className="app-label">REQ D-B</div>
                  <select
                    className={inputCls()}
                    value={editRow.bookingReqDelhiBeas || ""}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, bookingReqDelhiBeas: e.target.value } : p))}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <div className="app-label">REQ B-D</div>
                  <select
                    className={inputCls()}
                    value={editRow.bookingReqBeasDelhi || ""}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, bookingReqBeasDelhi: e.target.value } : p))}
                  >
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div>
                  <div className="app-label">Payment</div>
                  <input
                    className={inputCls()}
                    value={editRow.payment || ""}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, payment: e.target.value } : p))}
                    placeholder="e.g. 300"
                  />
                </div>

                <div>
                  <div className="app-label">Jatha Date</div>
                  <select
                    className={inputCls()}
                    value={editRow.jathaDateId || ""}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, jathaDateId: e.target.value } : p))}
                  >
                    <option value="">Select</option>
                    {jathaDates.map((j) => {
                      const start = toYMD(j.jathaStartDate || j.travelDate || "");
                      const end = toYMD(j.jathaEndDate || j.travelDate || j.jathaStartDate || "");
                      const label = `${formatDDMonYYYY(start) || "-"} → ${formatDDMonYYYY(end) || "-"}`;
                      return (
                        <option key={j._id} value={j._id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                    Required for update (same as Nominal Roll).
                  </div>
                </div>

                <div>
                  <div className="app-label">Ticket (Delhi-Beas)</div>
                  <input
                    className={inputCls()}
                    value={normalizeTicketId(editRow.ticketDelhiBeas)}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, ticketDelhiBeas: e.target.value } : p))}
                    placeholder="Ticket ID"
                  />
                  <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">{renderTicket(editRow.ticketDelhiBeas)}</div>
                </div>

                <div>
                  <div className="app-label">Ticket (Beas-Delhi)</div>
                  <input
                    className={inputCls()}
                    value={normalizeTicketId(editRow.ticketBeasDelhi)}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, ticketBeasDelhi: e.target.value } : p))}
                    placeholder="Ticket ID"
                  />
                  <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">{renderTicket(editRow.ticketBeasDelhi)}</div>
                </div>

                <div>
                  <div className="app-label">Travel Start Date</div>
                  <input
                    type="date"
                    className={inputCls()}
                    value={toYMD(editRow.travelStartDate)}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, travelStartDate: e.target.value } : p))}
                  />
                </div>

                <div>
                  <div className="app-label">Travel End Date</div>
                  <input
                    type="date"
                    className={inputCls()}
                    value={toYMD(editRow.travelEndDate)}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, travelEndDate: e.target.value } : p))}
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="app-label">Notes</div>
                  <textarea
                    className={inputCls()}
                    style={{ minHeight: 90 }}
                    value={editRow.notes || ""}
                    onChange={(e) => setEditRow((p) => (p ? { ...p, notes: e.target.value } : p))}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="app-btn app-btn-secondary h-10 px-4" onClick={() => setEditOpen(false)} disabled={savingEdit}>
                Cancel
              </button>
              <button className="app-btn app-btn-primary h-10 px-4" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
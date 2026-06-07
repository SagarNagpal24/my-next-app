"use client";

import React from "react";

type YesNo = "Yes" | "No" | "";
type Mode = "Train" | "Bus" | "Self" |"Travel Only (Bus)"| ""
type PaymentMode = "" | "Cash" | "Online";
type PaidTo = "" | "Munish" | "Sagar" | "Gurjeet" | "Pulkit" | "Anjali" | "Jyoti";

const PAYMENT_MODE_OPTIONS: Exclude<PaymentMode, "">[] = ["Cash", "Online"];
const PAID_TO_OPTIONS: Exclude<PaidTo, "">[] = ["Munish", "Sagar", "Gurjeet", "Pulkit", "Anjali", "Jyoti"];

// ✅ Train routes (we normalize from train-data)
type RouteType = "DLI-BEAS" | "BEAS-DLI";

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
  "English-Satsang",
  "Painting"

  
] as const;

type Customer = {
  _id: string;
  name: string;
  badgeNo?: string;
  fatherOrHusbandName?: string;
  gender?: string;
  age?: number | null;
  address?: string;
  mobile?: string;
  adhaarNumber?: string;
  department?: string;

  // ✅ exclude from suggestions if Yes
  blacklisted?: string;
};

type JathaDate = {
  _id: string;
  category?: string;

  // ✅ new API fields
  jathaStartDate?: string; // YYYY-MM-DD
  jathaEndDate?: string; // YYYY-MM-DD

  // ✅ backward compatible old field
  travelDate?: string; // YYYY-MM-DD

  notes?: string;
};

// ✅ Train data row (for ticket dropdown)
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

type NominalLadooRow = {
  _id: string;

  customerId: string;
  customerName: string;
  badgeNo?: string;
  fatherOrHusbandName?: string;
  gender?: string;
  age?: number | null;
  address?: string;
  mobile?: string;
  adhaarNumber?: string;

  department?: string;
  sangat?: YesNo;

  mode: Mode | string;

  bookingReqDelhiBeas: YesNo;
  bookingReqBeasDelhi: YesNo;

  ticketDelhiBeas: string;
  ticketBeasDelhi: string;

  payment: string;
  paymentMode?: PaymentMode | string;
  paidTo?: PaidTo | string;

  // ✅ Bus/Friend group marker: same value means keep these people in same bus
  busGroup?: string;

  jathaDateId: string;
  jathaDate: string;

  travelStartDate: string;
  travelEndDate: string;
  notes: string;

  createdAt?: string;
  updatedAt?: string;

  __groupFirstId?: string;
  __groupLastId?: string;
  __groupRowIds?: string[];
  __groupLabel?: string;
  __needDB?: boolean;
  __needBD?: boolean;
  __firstRow?: NominalLadooRow;
  __lastRow?: NominalLadooRow;
};

type PendingTicketGroupRow = NominalLadooRow & {
  __groupFirstId: string;
  __groupLastId: string;
  __groupRowIds: string[];
  __groupLabel: string;
  __needDB: boolean;
  __needBD: boolean;
  __firstRow: NominalLadooRow;
  __lastRow: NominalLadooRow;
};

function normalizeId(x: any) {
  return (typeof x?._id === "string" ? x._id : x?._id?.toString?.() || String(x?._id)).trim();
}

function inputCls() {
  return "app-input app-input-sm";
}

function normalizeBusGroup(v: any) {
  return String(v || "").trim().toUpperCase();
}

function groupNumberFromLabel(label: string) {
  const m = normalizeBusGroup(label).match(/^GROUP-(\d+)$/);
  return m ? Number(m[1]) : 0;
}

function makeGroupLabel(n: number) {
  return `GROUP-${n}`;
}

function normalizeRoute(v: any): RouteType | "" {
  let s = String(v ?? "").trim().toUpperCase();
  if (!s) return "";

  s = s
    .replace(/[–—]/g, "-")
    .replace(/[_/\\]/g, "-")
    .replace(/\s+/g, "")
    .replace(/-+/g, "-");

  if (s === "DLIBEAS" || s === "DLI-BEAS" || s === "DELHIBEAS" || s === "DELHI-BEAS") return "DLI-BEAS";
  if (s === "BEASDLI" || s === "BEAS-DLI" || s === "BEASDELHI" || s === "BEAS-DELHI") return "BEAS-DLI";
  return "";
}

function parseMoneyFromText(v: any): number | null {
  const s = String(v ?? "").replace(/,/g, " ").trim();
  if (!s) return null;
  const m = s.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function iso10(v: any) {
  return String(v || "").slice(0, 10);
}

function ymdMonthKey(ymd: string) {
  const s = iso10(ymd);
  if (!s) return 0;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return 0;
  return y * 100 + m; // YYYYMM
}

function endOfMonthISO(ymd: string) {
  const s = iso10(ymd);
  if (!s) return "";
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return "";
  // JS Date month is 0-indexed; passing m gives next month, day 0 => last day of previous month
  const last = new Date(y, m, 0);
  const mm = String(last.getMonth() + 1).padStart(2, "0");
  const dd = String(last.getDate()).padStart(2, "0");
  return `${last.getFullYear()}-${mm}-${dd}`;
}

function ordinal(n: number) {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatPrettyDate(ymd?: string) {
  const d = iso10(ymd);
  if (!d) return "-";
  const dt = new Date(d + "T00:00:00");
  const day = dt.getDate();
  const mon = dt.toLocaleString("en-IN", { month: "short" });
  const yr = dt.getFullYear();
  return `${day}${ordinal(day)} ${mon} ${yr}`;
}

function fmtRangeLabel(startYMD: string, endYMD: string) {
  const start = iso10(startYMD);
  const end = iso10(endYMD);

  if (!start && !end) return "";
  if (start && !end) return formatPrettyDate(start);
  if (!start && end) return formatPrettyDate(end);

  const ds = new Date(start + "T00:00:00");
  const de = new Date(end + "T00:00:00");
  const sDay = ds.getDate();
  const eDay = de.getDate();
  const sMon = ds.toLocaleString("en-IN", { month: "short" });
  const eMon = de.toLocaleString("en-IN", { month: "short" });
  const eYr = de.getFullYear();

  if (ds.getFullYear() === de.getFullYear() && ds.getMonth() === de.getMonth()) {
    return `${sDay}${ordinal(sDay)} - ${eDay}${ordinal(eDay)} ${eMon} ${eYr}`;
  }

  // Otherwise: "2nd Feb - 9th Mar 2026"
  return `${sDay}${ordinal(sDay)} ${sMon} - ${eDay}${ordinal(eDay)} ${eMon} ${eYr}`;
}

// ✅ label includes Age/Sex + Fare
function makeTicketLabel(t: TrainTicketRow) {
  const date = iso10(t.travelDate);
  const pnr = String(t.pnrNumber || "").trim();
  const seat = String(t.seatNumber || "").trim();
  const name = String(t.name || "").trim();
  const train = String(t.trainName || "").trim();
  const time = String(t.trainTime || "").trim();
  const boarding = String(t.boardingStation || "").trim();
  const age = t.age ?? "";
  const sex = String(t.gender || "").trim();

  const fareNum = toNumberOrNull(t.fare);
  const fare = fareNum !== null ? `Fare:${fareNum}` : "";

  const parts = [
    date || "---- -- --",
    name ? name : "",
    age !== "" || sex ? `${age !== "" ? age : "-"} / ${sex || "-"}` : "",
    seat ? `Seat:${seat}` : "",
    pnr ? `PNR:${pnr}` : "",
    train ? train : "",
    time ? time : "",
    boarding ? `(${boarding})` : "",
    fare ? fare : "",
  ].filter(Boolean);

  return parts.join(" • ");
}

// ✅ NEW: ticket quick search matcher (works for 40-5000 tickets)
function ticketMatches(t: TrainTicketRow, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [
    t.travelDate,
    t.name,
    t.gender,
    String(t.age ?? ""),
    t.seatNumber,
    t.pnrNumber,
    t.trainName,
    t.trainTime,
    t.boardingStation,
    t.route,
    String(t.fare ?? ""),
    makeTicketLabel(t),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return hay.includes(s);
}

function cleanQ(q: string) {
  return String(q || "").trim();
}

function tokenize(q: string) {
  return cleanQ(q)
    .split(/[\s,;|/]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function looksLikeStationToken(qLower: string) {
  const s = qLower.replace(/\s+/g, " ").trim();
  return s.includes("newdelhi") || s.includes("new delhi") || s.includes("olddelhi") || s.includes("old delhi") || s.includes("ndls") || s.includes("dli");
}

function normalizeNameForMatch(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ✅ SMART Quick Assign:
// Priority order requested by you:
// 1) same travel date as Travel Start Date (strongest)
// 2) same name as customer (next)
// 3) same route + boarding station (route is inherent by list; boarding station prioritized using search tokens)
// Also: exact seat/PNR match still wins.
function findSmartTicketId(params: {
  list: TrainTicketRow[];
  searchText: string;
  travelStartDate: string;
  customerName: string;
  expectedRoute?: RouteType | "";
  // Optional: in case you want return-date consideration later
  travelEndDate?: string;
}): string {
  const { list, searchText, travelStartDate, customerName, expectedRoute, travelEndDate } = params;
  const q = cleanQ(searchText);
  const qLower = q.toLowerCase();
  const tokens = tokenize(q).map((x) => x.toLowerCase());
  const start = iso10(travelStartDate);
  const end = iso10(travelEndDate || "");

  if (!list.length) return "";

  // 0) exact seat match by full query
  if (qLower) {
    const exactSeat = list.find((t) => String(t.seatNumber || "").trim().toLowerCase() === qLower);
    if (exactSeat?._id) return exactSeat._id;

    // 0b) exact PNR match by full query
    const exactPnr = list.find((t) => String(t.pnrNumber || "").trim().toLowerCase() === qLower);
    if (exactPnr?._id) return exactPnr._id;

    // 0c) token exact seat/pnr match
    for (const tok of tokens) {
      const seatTok = list.find((t) => String(t.seatNumber || "").trim().toLowerCase() === tok);
      if (seatTok?._id) return seatTok._id;
      const pnrTok = list.find((t) => String(t.pnrNumber || "").trim().toLowerCase() === tok);
      if (pnrTok?._id) return pnrTok._id;
    }
  }

  const custNorm = normalizeNameForMatch(customerName);
  const custWords = custNorm.split(" ").filter(Boolean);

  // station preference inferred from search box (since we don't store boarding station in nominal roll)
  const stationPreferred =
    qLower.includes("new delhi") || qLower.includes("newdelhi") || qLower.includes("ndls")
      ? "new delhi"
      : qLower.includes("old delhi") || qLower.includes("olddelhi") || qLower.includes("dli")
      ? "old delhi"
      : "";

  // Score each candidate
  let bestId = "";
  let bestScore = -1;

  for (const t of list) {
    let score = 0;

    // 1) Travel date match with Travel Start Date (highest)
    const tDate = iso10(t.travelDate);
    if (start && tDate && tDate === start) score += 120;

    // (extra) If start not matching but end matches, small bonus (helps return-side cases)
    if (end && tDate && tDate === end) score += 40;

    // 2) Name match with customer (next)
    const tNameNorm = normalizeNameForMatch(String(t.name || ""));
    if (custNorm && tNameNorm) {
      // strong: full normalized contains
      if (tNameNorm === custNorm) score += 80;
      else {
        // partial: many words match
        let hit = 0;
        for (const w of custWords) if (w.length >= 3 && tNameNorm.includes(w)) hit++;
        if (hit >= 2) score += 55;
        else if (hit === 1) score += 30;
      }
    }

    // 3) Route + boarding station
    const tRoute = normalizeRoute(t.route);
    if (expectedRoute && tRoute && tRoute === expectedRoute) score += 25;

    const b = String(t.boardingStation || "").trim().toLowerCase();
    if (stationPreferred && b) {
      if (b.replace(/\s+/g, " ").includes(stationPreferred)) score += 30;
    } else if (looksLikeStationToken(qLower) && b) {
      // If they typed any station-ish token but didn't clearly specify, still reward contains
      if (ticketMatches(t, q)) score += 10;
    }

    // Bonus: if user typed something and ticket matches it
    if (qLower && ticketMatches(t, q)) score += 12;

    // Minor: seat/PNR contains any token
    if (tokens.length) {
      const seat = String(t.seatNumber || "").toLowerCase();
      const pnr = String(t.pnrNumber || "").toLowerCase();
      const train = String(t.trainName || "").toLowerCase();
      let tokHits = 0;
      for (const tok of tokens) {
        if (tok.length < 2) continue;
        if (seat && seat.includes(tok)) tokHits += 2;
        if (pnr && pnr.includes(tok)) tokHits += 2;
        if (train && train.includes(tok)) tokHits += 1;
      }
      score += Math.min(10, tokHits);
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = t._id;
    }
  }

  // If user typed something and bestScore is too low, require at least some match
  if (qLower) {
    const best = list.find((x) => x._id === bestId);
    if (!best) return "";
    const passes = ticketMatches(best, q) || String(best.seatNumber || "").toLowerCase() === qLower || String(best.pnrNumber || "").toLowerCase() === qLower;
    if (!passes) return "";
  }

  return bestId || "";
}

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ParanthaNominalRollPage() {
  const [tab, setTab] = React.useState<"ladoo" | "unassigned" | "pending">("ladoo");

  // ✅ Department filter for search suggestions
  const [deptFilter, setDeptFilter] = React.useState<string>("");

  // customer search
  const [search, setSearch] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<Customer[]>([]);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchTimerRef = React.useRef<any>(null);

  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  // jatha dates dropdown (Parantha)
  const [jathaDates, setJathaDates] = React.useState<JathaDate[]>([]);
  const [loadingJatha, setLoadingJatha] = React.useState(true);

  // train tickets
  const [allTickets, setAllTickets] = React.useState<TrainTicketRow[]>([]);
  const [trainDliBeas, setTrainDliBeas] = React.useState<TrainTicketRow[]>([]);
  const [trainBeasDli, setTrainBeasDli] = React.useState<TrainTicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = React.useState(true);

  // ✅ mismatch toggle (JATHA vs TRAVEL)
  const [showMismatchOnly, setShowMismatchOnly] = React.useState(false);

  // create form
  const [mode, setMode] = React.useState<Mode>("");
  const [department, setDepartment] = React.useState("");
  const [sangat, setSangat] = React.useState<YesNo>("");

  // ✅ Jatha multi-select via dropdown checkboxes
  const [jathaDateIds, setJathaDateIds] = React.useState<string[]>([]);
  const [createJathaOpen, setCreateJathaOpen] = React.useState(false);

  const [bookingDelhiBeas, setBookingDelhiBeas] = React.useState<YesNo>("");
  const [bookingBeasDelhi, setBookingBeasDelhi] = React.useState<YesNo>("");

  const [ticketDelhiBeas, setTicketDelhiBeas] = React.useState("");
  const [ticketBeasDelhi, setTicketBeasDelhi] = React.useState("");

  // ✅ Ticket search fields (Create)
  const [ticketSearchDB, setTicketSearchDB] = React.useState("");
  const [ticketSearchBD, setTicketSearchBD] = React.useState("");

  const [payment, setPayment] = React.useState("");
  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>("");
  const [paidTo, setPaidTo] = React.useState<PaidTo>("");

  // ✅ Same Bus / Friend Group marker
  const [busGroup, setBusGroup] = React.useState("");

  const [travelStartDate, setTravelStartDate] = React.useState("");
  const [travelEndDate, setTravelEndDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // ✅ track manual edits (so auto-fill happens by default, but user can change later)
  const [startTouched, setStartTouched] = React.useState(false);
  const [endTouched, setEndTouched] = React.useState(false);

  // list + edit
  const [items, setItems] = React.useState<NominalLadooRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<NominalLadooRow | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editJathaDateIds, setEditJathaDateIds] = React.useState<string[]>([]);
  const [editJathaOpen, setEditJathaOpen] = React.useState(false);

  // ✅ Ticket search fields (Edit)
  const [editTicketSearchDB, setEditTicketSearchDB] = React.useState("");
  const [editTicketSearchBD, setEditTicketSearchBD] = React.useState("");

  // ✅ Table filter/search states
  const [tableQ, setTableQ] = React.useState("");
  const [tableDept, setTableDept] = React.useState<string>("");
  const [tableMode, setTableMode] = React.useState<Mode | "">("");
  const [tableSangat, setTableSangat] = React.useState<YesNo>("");
  const [tableReqDB, setTableReqDB] = React.useState<YesNo>("");
    const [tableReqBD, setTableReqBD] = React.useState<YesNo>("");

  // ✅ NEW: extra table filters
  const [tableJathaId, setTableJathaId] = React.useState<string>("");
  const [tableStartFrom, setTableStartFrom] = React.useState<string>("");
  const [tableStartTo, setTableStartTo] = React.useState<string>("");
  const [tableEndFrom, setTableEndFrom] = React.useState<string>("");
  const [tableEndTo, setTableEndTo] = React.useState<string>("");

  // ✅ NEW: show only upto last Jatha month by default
  const [showFullData, setShowFullData] = React.useState(false);
  const createJathaRef = React.useRef<HTMLDivElement | null>(null);
  const editJathaRef = React.useRef<HTMLDivElement | null>(null);

  const isTrainMode = mode === "Train";
  const isEditTrainMode = String(editing?.mode || "") === "Train";

  // ✅ show/hide blocks (hide booking+tickets for Bus/Self)
  const showBookingAndTicketsCreate = isTrainMode;
  const showBookingAndTicketsEdit = isEditTrainMode;

  const allowDelhiBeasTicket = isTrainMode && bookingDelhiBeas === "Yes";
  const allowBeasDelhiTicket = isTrainMode && bookingBeasDelhi === "Yes";

  const allowEditDelhiBeasTicket = isEditTrainMode && editing?.bookingReqDelhiBeas === "Yes";
  const allowEditBeasDelhiTicket = isEditTrainMode && editing?.bookingReqBeasDelhi === "Yes";

  // ✅ when customer selected, prefill department (still editable)
  React.useEffect(() => {
    setDepartment(String(selectedCustomer?.department || "").trim());
  }, [selectedCustomer?._id]);

  // ✅ close edit if user switches tab
  React.useEffect(() => {
    if (tab !== "ladoo") {
      setEditing(null);
      setEditJathaDateIds([]);
      setEditJathaOpen(false);
    }
  }, [tab]);

  // ✅ reset edit ticket search when opening edit modal
  React.useEffect(() => {
    setEditTicketSearchDB("");
    setEditTicketSearchBD("");
  }, [editing?._id]);


  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (createJathaRef.current && !createJathaRef.current.contains(e.target as Node)) {
        setCreateJathaOpen(false);
      }
      if (editJathaRef.current && !editJathaRef.current.contains(e.target as Node)) {
        setEditJathaOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ✅ Auto-suggest while typing (debounced) + department filtering + exclude blacklisted
  React.useEffect(() => {
    const q = search.trim();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!q) {
      setResults([]);
      setSearchOpen(false);
      return;
    }

    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        let list: Customer[] = (data.items || []).map((x: any) => ({
          _id: normalizeId(x),
          name: x.name || "",
          badgeNo: x.badgeNo || "",
          fatherOrHusbandName: x.fatherOrHusbandName || "",
          gender: x.gender || "",
          age: x.age ?? null,
          address: x.address || "",
          mobile: x.mobile || "",
          adhaarNumber: x.adhaarNumber || "",
          department: x.department || "",
          blacklisted: String(x.blacklisted || "").trim(),
        }));

        // ✅ remove blacklisted
        list = list.filter((c) => String(c.blacklisted || "").toLowerCase() !== "yes");

        const df = String(deptFilter || "").trim();
        if (df) list = list.filter((c) => String(c.department || "").trim() === df);

        setResults(list);
        setSearchOpen(true);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(searchTimerRef.current);
  }, [search, deptFilter]);

  // ✅ assignment maps
  const ticketAssignedToNameMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of items) {
      const a = String(r.ticketDelhiBeas || "").trim();
      const b = String(r.ticketBeasDelhi || "").trim();
      const name = String(r.customerName || "").trim();
      if (a) m.set(a, name);
      if (b) m.set(b, name);
    }
    return m;
  }, [items]);


  const busGroupCountMap = React.useMemo(() => {
    const map = new Map<string, number>();

    for (const r of items) {
      const g = normalizeBusGroup(r.busGroup);
      if (!g) continue;
      map.set(g, (map.get(g) || 0) + 1);
    }

    return map;
  }, [items]);

  const busGroupOptions = React.useMemo(() => {
    const used = Array.from(busGroupCountMap.keys()).sort((a, b) => {
      const an = groupNumberFromLabel(a);
      const bn = groupNumberFromLabel(b);

      if (an && bn) return an - bn;
      if (an) return -1;
      if (bn) return 1;

      return a.localeCompare(b);
    });

    let next = 1;
    const unused: string[] = [];

    while (unused.length < 5) {
      const label = makeGroupLabel(next);
      if (!busGroupCountMap.has(label)) unused.push(label);
      next++;
    }

    return [...used, ...unused];
  }, [busGroupCountMap]);

  function busGroupOptionLabel(group: string) {
    const g = normalizeBusGroup(group);
    const count = busGroupCountMap.get(g) || 0;
    return count > 0 ? `${g} (${count})` : `${g} (new)`;
  }

  function busGroupSelectCls(value: string) {
    const count = busGroupCountMap.get(normalizeBusGroup(value)) || 0;

    if (count > 0) {
      return `${inputCls()} border-amber-300 bg-amber-50 font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200`;
    }

    return `${inputCls()} border-emerald-300 bg-emerald-50 font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200`;
  }

  const usedDelhiBeasTicketIds = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of items) {
      const id = String(r.ticketDelhiBeas || "").trim();
      if (id) s.add(id);
    }
    return s;
  }, [items]);

  const usedBeasDelhiTicketIds = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of items) {
      const id = String(r.ticketBeasDelhi || "").trim();
      if (id) s.add(id);
    }
    return s;
  }, [items]);

  const unassignedTrainDliBeas = React.useMemo(
    () => trainDliBeas.filter((t) => !usedDelhiBeasTicketIds.has(t._id)),
    [trainDliBeas, usedDelhiBeasTicketIds]
  );
  const assignedTrainDliBeas = React.useMemo(
    () => trainDliBeas.filter((t) => usedDelhiBeasTicketIds.has(t._id)),
    [trainDliBeas, usedDelhiBeasTicketIds]
  );

  const unassignedTrainBeasDli = React.useMemo(
    () => trainBeasDli.filter((t) => !usedBeasDelhiTicketIds.has(t._id)),
    [trainBeasDli, usedBeasDelhiTicketIds]
  );
  const assignedTrainBeasDli = React.useMemo(
    () => trainBeasDli.filter((t) => usedBeasDelhiTicketIds.has(t._id)),
    [trainBeasDli, usedBeasDelhiTicketIds]
  );

  const editTrainDliBeas = React.useMemo(() => {
    const current = String(editing?.ticketDelhiBeas || "").trim();
    return trainDliBeas.map((t) => ({
      ...t,
      __disabled: t._id !== current && usedDelhiBeasTicketIds.has(t._id),
    })) as any[];
  }, [trainDliBeas, usedDelhiBeasTicketIds, editing?.ticketDelhiBeas]);

  const editTrainBeasDli = React.useMemo(() => {
    const current = String(editing?.ticketBeasDelhi || "").trim();
    return trainBeasDli.map((t) => ({
      ...t,
      __disabled: t._id !== current && usedBeasDelhiTicketIds.has(t._id),
    })) as any[];
  }, [trainBeasDli, usedBeasDelhiTicketIds, editing?.ticketBeasDelhi]);

  const editSelectableDliBeas = React.useMemo(() => (editTrainDliBeas as any[]).filter((t) => !t.__disabled), [editTrainDliBeas]);
  const editSelectableBeasDli = React.useMemo(() => (editTrainBeasDli as any[]).filter((t) => !t.__disabled), [editTrainBeasDli]);

  // ✅ filtered lists for easier mapping (Create) + cap
  const unassignedTrainDliBeasFiltered = React.useMemo(() => {
    const start = iso10(travelStartDate);
    const list = unassignedTrainDliBeas.filter(
      (t) => (!start || iso10(t.travelDate) === start) && ticketMatches(t, ticketSearchDB)
    );
    return list.slice(0, 400);
  }, [unassignedTrainDliBeas, ticketSearchDB, travelStartDate]);

  const unassignedTrainBeasDliFiltered = React.useMemo(() => {
    const end = iso10(travelEndDate);
    const list = unassignedTrainBeasDli.filter(
      (t) => (!end || iso10(t.travelDate) === end) && ticketMatches(t, ticketSearchBD)
    );
    return list.slice(0, 400);
  }, [unassignedTrainBeasDli, ticketSearchBD, travelEndDate]);

  const assignedTrainDliBeasFiltered = React.useMemo(() => {
    const list = assignedTrainDliBeas.filter((t) => ticketMatches(t, ticketSearchDB));
    return list.slice(0, 200);
  }, [assignedTrainDliBeas, ticketSearchDB]);

  const assignedTrainBeasDliFiltered = React.useMemo(() => {
    const list = assignedTrainBeasDli.filter((t) => ticketMatches(t, ticketSearchBD));
    return list.slice(0, 200);
  }, [assignedTrainBeasDli, ticketSearchBD]);

  // ✅ filtered lists for easier mapping (Edit) + cap
  const editTrainDliBeasFiltered = React.useMemo(() => {
    const start = iso10(editing?.travelStartDate);
    const current = String(editing?.ticketDelhiBeas || "").trim();
    const list = editTrainDliBeas.filter(
      (t: any) =>
        ((current && t._id === current) || !t.__disabled) &&
        (!start || iso10(t.travelDate) === start) &&
        ticketMatches(t, editTicketSearchDB)
    );
    return list.slice(0, 600);
  }, [editTrainDliBeas, editTicketSearchDB, editing?.travelStartDate, editing?.ticketDelhiBeas]);

  const editTrainBeasDliFiltered = React.useMemo(() => {
    const end = iso10(editing?.travelEndDate);
    const current = String(editing?.ticketBeasDelhi || "").trim();
    const list = editTrainBeasDli.filter(
      (t: any) =>
        ((current && t._id === current) || !t.__disabled) &&
        (!end || iso10(t.travelDate) === end) &&
        ticketMatches(t, editTicketSearchBD)
    );
    return list.slice(0, 600);
  }, [editTrainBeasDli, editTicketSearchBD, editing?.travelEndDate, editing?.ticketBeasDelhi]);

  // Ticket map + labels
  const ticketById = React.useMemo(() => {
    const m = new Map<string, TrainTicketRow>();
    for (const t of allTickets) m.set(t._id, t);
    return m;
  }, [allTickets]);

  const ticketLabelMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const t of allTickets) m.set(t._id, makeTicketLabel(t));
    return m;
  }, [allTickets]);

  function renderTicketValue(v: string) {
    const s = String(v || "").trim();
    if (!s) return "-";
    return ticketLabelMap.get(s) || s;
  }

  // ✅ alias used by added export/print blocks (keep compatibility)
  function renderTicketLabel(v: any) {
    return renderTicketValue(String(v || ""));
  }

  // ✅ fare lookup for ticket id/object (0 if not found)
  function ticketFare(v: any): number {
    const id = String(v && typeof v === "object" ? (v._id ?? v.id ?? v.value ?? v.$oid ?? "") : v || "").trim();
    if (!id) return 0;
    const fare = toNumberOrNull(ticketById.get(id as any)?.fare);
    return fare ?? 0;
  }


  function getFareForRow(r: NominalLadooRow): number | null {
    if (String(r.mode) !== "Train") return null;

    const a = String(r.ticketDelhiBeas || "").trim();
    const b = String(r.ticketBeasDelhi || "").trim();

    const fa = a ? toNumberOrNull(ticketById.get(a)?.fare) : null;
    const fb = b ? toNumberOrNull(ticketById.get(b)?.fare) : null;

    if (fa === null && fb === null) return null;
    return (fa || 0) + (fb || 0);
  }

  function getPaidForRow(r: NominalLadooRow): number | null {
    return parseMoneyFromText(r.payment);
  }

  function getPendingForRow(r: NominalLadooRow): number | null {
    const fare = getFareForRow(r);
    if (fare === null) return null;
    const paid = getPaidForRow(r) ?? 0;
    const pending = fare - paid;
    return Number.isFinite(pending) ? Math.max(0, pending) : null;
  }

  // ✅ When mode is NOT Train, clear booking/ticket fields in create form
  React.useEffect(() => {
    if (!isTrainMode) {
      setBookingDelhiBeas("");
      setBookingBeasDelhi("");
      setTicketDelhiBeas("");
      setTicketBeasDelhi("");
      setTicketSearchDB("");
      setTicketSearchBD("");
    }
  }, [isTrainMode]);

  // ✅ If booking is NO, clear corresponding ticket in create form
  React.useEffect(() => {
    if (bookingDelhiBeas === "No") setTicketDelhiBeas("");
  }, [bookingDelhiBeas]);
  React.useEffect(() => {
    if (bookingBeasDelhi === "No") setTicketBeasDelhi("");
  }, [bookingBeasDelhi]);

  // ✅ When edit mode is NOT Train, clear booking/ticket fields in edit modal
  React.useEffect(() => {
    if (!editing) return;
    if (!isEditTrainMode) {
      setEditing((prev) =>
        prev
          ? {
              ...prev,
              bookingReqDelhiBeas: "",
              bookingReqBeasDelhi: "",
              ticketDelhiBeas: "",
              ticketBeasDelhi: "",
            }
          : prev
      );
    }
  }, [editing?._id, isEditTrainMode]);

  // ✅ If booking is NO, clear corresponding ticket in edit modal
  React.useEffect(() => {
    if (!editing) return;
    if (editing.bookingReqDelhiBeas === "No" && String(editing.ticketDelhiBeas || "").trim()) {
      setEditing({ ...editing, ticketDelhiBeas: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.bookingReqDelhiBeas]);

  React.useEffect(() => {
    if (!editing) return;
    if (editing.bookingReqBeasDelhi === "No" && String(editing.ticketBeasDelhi || "").trim()) {
      setEditing({ ...editing, ticketBeasDelhi: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.bookingReqBeasDelhi]);

  // ✅ Ticket date vs travelStartDate validation (Delhi–Beas only)
  function confirmIfDelhiBeasDateMismatch(params: { travelStartDate: string; ticketId: string; allow: boolean }): boolean {
    const { travelStartDate, ticketId, allow } = params;
    if (!allow) return true;
    const start = iso10(travelStartDate);
    if (!start || !ticketId) return true;

    const t = ticketById.get(String(ticketId).trim());
    const ticketDate = iso10(t?.travelDate);
    if (!ticketDate) return true;

    if (start !== ticketDate) {
      return window.confirm(
        `Travel Start Date (${start}) does NOT match Delhi–Beas ticket Travel Date (${ticketDate}).\n\nPress OK to IGNORE this mismatch (exception) and continue.\nPress Cancel to go back and fix.`
      );
    }
    return true;
  }

  // ✅ Travel end date > start date validation with ignore option
  function confirmIfEndBeforeStart(start: string, end: string): boolean {
    const s = iso10(start);
    const e = iso10(end);
    if (!s || !e) return true;

    if (e <= s) {
      return window.confirm(
        `Travel End Date (${e}) is not greater than Travel Start Date (${s}).\n\nPress OK to IGNORE (exception) and continue.\nPress Cancel to go back and fix.`
      );
    }
    return true;
  }

  function getJathaStart(d: JathaDate) {
    return iso10(d.jathaStartDate ?? d.travelDate);
  }
  function getJathaEnd(d: JathaDate) {
    return iso10(d.jathaEndDate ?? d.travelDate);
  }

  // ✅ label map for table (same label as dropdown)
  const jathaLabelById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const d of jathaDates) {
      const js = getJathaStart(d);
      const je = getJathaEnd(d);
      m.set(d._id, fmtRangeLabel(js, je));
    }
    return m;
  }, [jathaDates]);


  function selectedJathaLabel(ids: string[]) {
    const valid = Array.from(new Set(ids.map((x) => String(x).trim()).filter(Boolean)));
    if (!valid.length) return "Select Jatha date(s)";
    if (valid.length === 1) return jathaLabelById.get(valid[0]) || "1 selected";
    return `${valid.length} selected`;
  }

  // ✅ Default list window: show data only up to the month of the LAST Jatha (by end date)
  const visibleCutoffISO = React.useMemo(() => {
    if (!jathaDates.length) return "";
    let bestKey = 0;
    let bestEnd = "";
    for (const d of jathaDates) {
      const end = getJathaEnd(d);
      const k = ymdMonthKey(end);
      if (k > bestKey) {
        bestKey = k;
        bestEnd = end;
      }
    }
    return bestEnd ? endOfMonthISO(bestEnd) : "";
  }, [jathaDates]);

  function formatJathaLabelFromRow(row: { jathaDateId?: string; jathaDate?: string }) {
    const id = String(row.jathaDateId || "").trim();
    if (id && jathaLabelById.has(id)) return jathaLabelById.get(id)!;
    const s = iso10(row.jathaDate);
    return s || "-";
  }

  // ✅ default auto-fill travel dates when JathaDate selected (single select: first selected)
  React.useEffect(() => {
    const firstId = jathaDateIds[0] || "";
    const jd = jathaDates.find((x) => x._id === firstId);
    if (!jd) return;

    const js = getJathaStart(jd);
    const je = getJathaEnd(jd);

    if (!startTouched || !travelStartDate) setTravelStartDate(js);
    if (!endTouched || !travelEndDate) setTravelEndDate(je);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jathaDateIds.join("|"), jathaDates]);

  async function loadJathaDates() {
    setLoadingJatha(true);
    try {
      const res = await fetch("/api/jatha-date?category=Parantha", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const list: JathaDate[] = (data.items || []).map((x: any) => ({
        ...x,
        _id: normalizeId(x),
        jathaStartDate: iso10(x.jathaStartDate ?? x.travelDate),
        jathaEndDate: iso10(x.jathaEndDate ?? x.travelDate),
        travelDate: iso10(x.travelDate),
        notes: x.notes || "",
      }));
      setJathaDates(list);
    } finally {
      setLoadingJatha(false);
    }
  }

  async function loadTrainTickets() {
    setLoadingTickets(true);
    try {
      const res = await fetch(`/api/train-data?limit=10000`, { cache: "no-store" });
      const d = await res.json().catch(() => ({}));
      const rawItems = Array.isArray(d?.items) ? d.items : [];

      const list: TrainTicketRow[] = rawItems.map((x: any) => ({
        ...x,
        _id: normalizeId(x),
        age: x.age === null || x.age === undefined || x.age === "" ? null : Number(x.age),
        gender: String(x.gender || "").trim(),
        travelDate: String(x.travelDate || "").slice(0, 10),
        route: String(x.route || "").trim(),
        fare: x.fare === null || x.fare === undefined || x.fare === "" ? null : x.fare,
      }));

      setAllTickets(list);

      const dli = list.filter((t) => normalizeRoute(t.route) === "DLI-BEAS");
      const beas = list.filter((t) => normalizeRoute(t.route) === "BEAS-DLI");

      setTrainDliBeas(dli);
      setTrainBeasDli(beas);
    } finally {
      setLoadingTickets(false);
    }
  }

  async function loadNominal() {
    setLoading(true);
    try {
      const res = await fetch("/api/nominal-roll/parantha", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      setItems(
        (data.items || []).map((x: any) => ({
          ...x,
          _id: normalizeId(x),
          customerId: String(x.customerId || "").trim(),
          jathaDateId: String(x.jathaDateId || "").trim(),
          jathaDate: String(x.jathaDate || "").slice(0, 10),
          travelStartDate: String(x.travelStartDate || "").slice(0, 10),
          travelEndDate: String(x.travelEndDate || "").slice(0, 10),
          ticketDelhiBeas: String(x.ticketDelhiBeas || ""),
          ticketBeasDelhi: String(x.ticketBeasDelhi || ""),
          paymentMode: String(x.paymentMode || "").trim(),
          paidTo: String(x.paidTo || "").trim(),
          busGroup: String(x.busGroup || "").trim(),
          department: String(x.department || "").trim(),
          sangat: String(x.sangat || "").trim() as any,
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadJathaDates();
    loadTrainTickets();
    loadNominal();
  }, []);

  async function doCustomerSearch() {
    const q = search.trim();
    if (!q) return;

    setSearching(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      let list: Customer[] = (data.items || []).map((x: any) => ({
        _id: normalizeId(x),
        name: x.name || "",
        badgeNo: x.badgeNo || "",
        fatherOrHusbandName: x.fatherOrHusbandName || "",
        gender: x.gender || "",
        age: x.age ?? null,
        address: x.address || "",
        mobile: x.mobile || "",
        adhaarNumber: x.adhaarNumber || "",
        department: x.department || "",
        blacklisted: String(x.blacklisted || "").trim(),
      }));

      list = list.filter((c) => String(c.blacklisted || "").toLowerCase() !== "yes");

      const df = String(deptFilter || "").trim();
      if (df) list = list.filter((c) => String(c.department || "").trim() === df);

      setResults(list);
      setSearchOpen(true);
    } finally {
      setSearching(false);
    }
  }

  function resetForm() {
    setSelectedCustomer(null);
    setResults([]);
    setSearch("");
    setSearchOpen(false);

    setMode("");
    setDepartment("");
    setSangat("");

    setJathaDateIds([]);
    setCreateJathaOpen(false);

    setBookingDelhiBeas("");
    setBookingBeasDelhi("");

    setTicketDelhiBeas("");
    setTicketBeasDelhi("");

    setTicketSearchDB("");
    setTicketSearchBD("");

    setPayment("");
    setPaymentMode("");
    setPaidTo("");
    setBusGroup("");
    setTravelStartDate("");
    setTravelEndDate("");
    setNotes("");

    setStartTouched(false);
    setEndTouched(false);
  }

    function isDuplicateNominal(args: {
    customerName: string;
    jathaDateId: string;
    excludeId?: string;
  }) {
    const name = String(args.customerName || "").trim().toLowerCase();
    const jathaId = String(args.jathaDateId || "").trim();
    const excludeId = String(args.excludeId || "").trim();

    return items.some((r) => {
      if (excludeId && String(r._id || "").trim() === excludeId) return false;
      return (
        String(r.customerName || "").trim().toLowerCase() === name &&
        String(r.jathaDateId || "").trim() === jathaId
      );
    });
  }

  function openEditRow(r: NominalLadooRow) {
    setEditing({
      ...r,
      travelStartDate: iso10(r.travelStartDate),
      travelEndDate: iso10(r.travelEndDate),
      department: String(r.department || "").trim(),
      sangat: (String(r.sangat || "").trim() as any) || "",
      paymentMode: String(r.paymentMode || "").trim(),
      paidTo: String(r.paidTo || "").trim(),
      busGroup: String(r.busGroup || "").trim(),
    });
    setEditJathaDateIds(r.jathaDateId ? [String(r.jathaDateId).trim()] : []);
    setEditJathaOpen(false);
  }

function validateCreate(selectedIds: string[]) {
    if (!selectedCustomer?._id) return "Please search and select a customer first.";
    if (!selectedIds.length) return "Jatha date is required (select at least 1).";
    if (!mode) return "Mode is required.";

    // ✅ Multi save + Train tickets can conflict with unique ticket constraints
    // ✅ Booking can be Yes and tickets can be assigned later (allowed).
    if (selectedIds.length > 1 && mode === "Train") {
      const anyTicket = !!String(ticketDelhiBeas || "").trim() || !!String(ticketBeasDelhi || "").trim();
      if (anyTicket) {
        return "For multiple Jatha dates at once, Train ticket assignment is not allowed (tickets are unique). Please keep tickets empty and assign later via Edit.";
      }
    }

    if (mode === "Train") {
      if (!bookingDelhiBeas) return "Booking REQ (Delhi–Beas) is required.";
      if (!bookingBeasDelhi) return "Booking REQ (Beas–Delhi) is required.";
      // ✅ tickets not mandatory
    }

    if (!payment.trim()) return "Payment is required.";
    if (!travelStartDate) return "Travel start date is required.";
    if (!travelEndDate) return "Travel end date is required.";
    return "";
  }

  async function onCreate(e: React.FormEvent) {
  e.preventDefault();

  const selectedIds = Array.from(new Set(jathaDateIds.map((x) => String(x).trim()).filter(Boolean)));
  const err = validateCreate(selectedIds);
  if (err) return alert(err);

  const okDates = confirmIfEndBeforeStart(travelStartDate, travelEndDate);
  if (!okDates) return;

  const okMismatch = confirmIfDelhiBeasDateMismatch({
    travelStartDate,
    ticketId: ticketDelhiBeas,
    allow: mode === "Train" && bookingDelhiBeas === "Yes" && !!String(ticketDelhiBeas || "").trim(),
  });
  if (!okMismatch) return;

  for (const oneId of selectedIds) {
    if (
      isDuplicateNominal({
        customerName: selectedCustomer!.name,
        jathaDateId: oneId,
      })
    ) {
      const label = jathaLabelById.get(oneId) || oneId;
      return alert(`Duplicate not allowed. Same customer and Jatha Date (${label}) already exist.`);
    }
  }

  setSaving(true);
  try {
    for (const oneId of selectedIds) {
      const jd = jathaDates.find((x) => x._id === oneId);
      const jStart = jd ? getJathaStart(jd) : "";

      const payload = {
        customerId: selectedCustomer!._id,
        customerName: selectedCustomer!.name,
        badgeNo: selectedCustomer!.badgeNo || "",
        fatherOrHusbandName: selectedCustomer!.fatherOrHusbandName || "",
        gender: selectedCustomer!.gender || "",
        age: selectedCustomer!.age ?? null,
        address: selectedCustomer!.address || "",
        mobile: selectedCustomer!.mobile || "",
        adhaarNumber: selectedCustomer!.adhaarNumber || "",

        department: department.trim(),
        sangat: sangat || "",

        mode,

        bookingReqDelhiBeas: mode === "Train" ? bookingDelhiBeas : "",
        bookingReqBeasDelhi: mode === "Train" ? bookingBeasDelhi : "",

        ticketDelhiBeas: mode === "Train" && bookingDelhiBeas === "Yes" ? String(ticketDelhiBeas || "").trim() : "",
        ticketBeasDelhi: mode === "Train" && bookingBeasDelhi === "Yes" ? String(ticketBeasDelhi || "").trim() : "",

        payment: payment.trim(),
        paymentMode,
        paidTo,
        busGroup: busGroup.trim(),

        jathaDateId: oneId,
        jathaDate: jStart || "",

        travelStartDate,
        travelEndDate,
        notes: notes.trim(),
      };

      const res = await fetch("/api/nominal-roll/parantha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const label = jathaLabelById.get(oneId) || jStart || oneId;
        alert(`Create failed for Jatha (${label}) [${res.status}]. ${data?.error || "Error"}`);
        return;
      }
    }

    resetForm();
    await loadNominal();
    alert("✅ Data has been successfully added to Nominal Roll.");
  } finally {
    setSaving(false);
  }
}

  async function onDelete(id: string) {
    const realId = encodeURIComponent(String(id).trim());
    if (!confirm("Delete this record?")) return;

    const res = await fetch(`/api/nominal-roll/parantha/${realId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(`Delete failed (${res.status}). ${data?.error || "Error"}`);
      return;
    }

    await loadNominal();
  }

 async function onSaveEdit(e: React.FormEvent) {
  e.preventDefault();
  if (!editing) return;

  const selectedIds = Array.from(new Set(editJathaDateIds.map((x) => String(x).trim()).filter(Boolean)));
  if (!selectedIds.length) return alert("Jatha date is required.");
  if (!editing.mode) return alert("Mode is required.");

  if (String(editing.mode) === "Train") {
    if (!editing.bookingReqDelhiBeas) return alert("Booking REQ (Delhi–Beas) is required.");
    if (!editing.bookingReqBeasDelhi) return alert("Booking REQ (Beas–Delhi) is required.");
  }

  if (!editing.payment.trim()) return alert("Payment is required.");
  if (!editing.travelStartDate) return alert("Travel start date is required.");
  if (!editing.travelEndDate) return alert("Travel end date is required.");

  const okDates = confirmIfEndBeforeStart(editing.travelStartDate, editing.travelEndDate);
  if (!okDates) return;

  const okMismatch = confirmIfDelhiBeasDateMismatch({
    travelStartDate: editing.travelStartDate,
    ticketId: String(editing.ticketDelhiBeas || ""),
    allow:
      String(editing.mode) === "Train" &&
      editing.bookingReqDelhiBeas === "Yes" &&
      !!String(editing.ticketDelhiBeas || "").trim(),
  });
  if (!okMismatch) return;

  for (let i = 0; i < selectedIds.length; i++) {
    const oneId = selectedIds[i];
    const dup = isDuplicateNominal({
      customerName: editing.customerName,
      jathaDateId: oneId,
      excludeId: i === 0 ? editing._id : "",
    });
    if (dup) {
      const label = jathaLabelById.get(oneId) || oneId;
      return alert(`Duplicate not allowed. Same customer and Jatha Date (${label}) already exist.`);
    }
  }

  const realId = encodeURIComponent(String(editing._id).trim());
  setSaving(true);
  try {
    const firstId = selectedIds[0];
    const jd = jathaDates.find((x) => x._id === firstId);
    const jStart = jd ? getJathaStart(jd) : "";

    const res = await fetch(`/api/nominal-roll/parantha/${realId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        department: String(editing.department || "").trim(),
        sangat: String(editing.sangat || "").trim(),
        mode: editing.mode,
        bookingReqDelhiBeas: String(editing.mode) === "Train" ? editing.bookingReqDelhiBeas : "",
        bookingReqBeasDelhi: String(editing.mode) === "Train" ? editing.bookingReqBeasDelhi : "",
        ticketDelhiBeas:
          String(editing.mode) === "Train" && editing.bookingReqDelhiBeas === "Yes"
            ? String(editing.ticketDelhiBeas || "").trim()
            : "",
        ticketBeasDelhi:
          String(editing.mode) === "Train" && editing.bookingReqBeasDelhi === "Yes"
            ? String(editing.ticketBeasDelhi || "").trim()
            : "",
        payment: editing.payment.trim(),
        paymentMode: String(editing.paymentMode || "").trim(),
        paidTo: String(editing.paidTo || "").trim(),
        busGroup: String(editing.busGroup || "").trim(),
        jathaDateId: firstId,
        jathaDate: jStart || "",
        travelStartDate: String(editing.travelStartDate).slice(0, 10),
        travelEndDate: String(editing.travelEndDate).slice(0, 10),
        notes: (editing.notes || "").trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Update failed (${res.status}). ${data?.error || "Error"}`);
      return;
    }

    if (selectedIds.length > 1) {
      for (const extraId of selectedIds.slice(1)) {
        const extraJd = jathaDates.find((x) => x._id === extraId);
        const extraJStart = extraJd ? getJathaStart(extraJd) : "";

        const payload = {
          customerId: editing.customerId,
          customerName: editing.customerName,
          badgeNo: editing.badgeNo || "",
          fatherOrHusbandName: editing.fatherOrHusbandName || "",
          gender: editing.gender || "",
          age: editing.age ?? null,
          address: editing.address || "",
          mobile: editing.mobile || "",
          adhaarNumber: editing.adhaarNumber || "",
          department: String(editing.department || "").trim(),
          sangat: String(editing.sangat || "").trim(),
          mode: editing.mode,
          bookingReqDelhiBeas: "",
          bookingReqBeasDelhi: "",
          ticketDelhiBeas: "",
          ticketBeasDelhi: "",
          payment: editing.payment.trim(),
          paymentMode: String(editing.paymentMode || "").trim(),
          paidTo: String(editing.paidTo || "").trim(),
          busGroup: String(editing.busGroup || "").trim(),
          jathaDateId: extraId,
          jathaDate: extraJStart || "",
          travelStartDate: String(editing.travelStartDate).slice(0, 10),
          travelEndDate: String(editing.travelEndDate).slice(0, 10),
          notes: (editing.notes || "").trim(),
        };

        const extraRes = await fetch("/api/nominal-roll/parantha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const extraData = await extraRes.json().catch(() => ({}));
        if (!extraRes.ok) {
          alert(`Extra save failed (${extraRes.status}). ${extraData?.error || "Error"}`);
          return;
        }
      }
    }

    setEditing(null);
    setEditJathaDateIds([]);
    setEditJathaOpen(false);
    await loadNominal();
    alert("✅ Changes have been successfully saved.");
  } finally {
    setSaving(false);
  }
}

  function areRowsContinuous(prev: NominalLadooRow, next: NominalLadooRow) {
    const prevEnd = iso10(prev.travelEndDate);
    const nextStart = iso10(next.travelStartDate);
    if (!prevEnd || !nextStart) return false;
    return prevEnd === nextStart;
  }

  function buildPendingGroupLabel(group: NominalLadooRow[]) {
    const first = group[0];
    const last = group[group.length - 1];
    if (!first || !last) return "-";
    return fmtRangeLabel(iso10(first.travelStartDate), iso10(last.travelEndDate));
  }

 const pendingTicketItems = React.useMemo(() => {
  const raw = items
    .filter((r) => String(r.mode) === "Train")
    .slice()
    .sort((a, b) => {
      const an = String(a.customerName || "").trim().toLowerCase();
      const bn = String(b.customerName || "").trim().toLowerCase();
      if (an !== bn) return an.localeCompare(bn);

      const as = iso10(a.travelStartDate);
      const bs = iso10(b.travelStartDate);
      if (as !== bs) return as.localeCompare(bs);

      return iso10(a.travelEndDate).localeCompare(iso10(b.travelEndDate));
    });

  // ✅ REMOVE EXACT DUPLICATES FIRST
  const deduped: NominalLadooRow[] = [];
  const seen = new Set<string>();

  for (const r of raw) {
    const key = [
      String(r.customerName || "").trim().toLowerCase(),
      iso10(r.travelStartDate),
      iso10(r.travelEndDate),
    ].join("__");

    if (seen.has(key)) continue;

    seen.add(key);
    deduped.push(r);
  }

  const groups: PendingTicketGroupRow[] = [];
  let i = 0;

  while (i < deduped.length) {
    const base = deduped[i];
    const chain: NominalLadooRow[] = [base];
    let j = i + 1;

    while (j < deduped.length) {
      const prev = chain[chain.length - 1];
      const next = deduped[j];

      const sameName =
        String(prev.customerName || "").trim().toLowerCase() ===
        String(next.customerName || "").trim().toLowerCase();

      if (!sameName || !areRowsContinuous(prev, next)) break;

      chain.push(next);
      j++;
    }

    const first = chain[0];
    const last = chain[chain.length - 1];

    const needDB =
      String(first.bookingReqDelhiBeas || "") === "Yes" &&
      !String(first.ticketDelhiBeas || "").trim();

    const needBD =
      String(last.bookingReqBeasDelhi || "") === "Yes" &&
      !String(last.ticketBeasDelhi || "").trim();

    if (needDB || needBD) {
      groups.push({
        ...first,
        travelStartDate: iso10(first.travelStartDate),
        travelEndDate: iso10(last.travelEndDate),
        __groupFirstId: String(first._id || "").trim(),
        __groupLastId: String(last._id || "").trim(),
        __groupRowIds: chain.map((x) => String(x._id || "").trim()),
        __groupLabel: buildPendingGroupLabel(chain),
        __needDB: needDB,
        __needBD: needBD,
        __firstRow: first,
        __lastRow: last,
      });
    }

    i = j;
  }

  return groups;
}, [items]);

  // ==============================
  // ✅ Pending inline assign + bulk
  // ==============================
  type PendingRowState = { qDB: string; qBD: string; pickDB: string; pickBD: string; saving?: boolean };

  const [pendingState, setPendingState] = React.useState<Record<string, PendingRowState>>({});
  const [pendingSelectedIds, setPendingSelectedIds] = React.useState<Set<string>>(new Set());
  const [pendingBulkBusy, setPendingBulkBusy] = React.useState(false);

  function getPendingState(id: string): PendingRowState {
    return pendingState[id] || { qDB: "", qBD: "", pickDB: "", pickBD: "" };
  }

  function patchPendingState(id: string, patch: Partial<PendingRowState>) {
    setPendingState((prev) => ({ ...prev, [id]: { ...getPendingState(id), ...patch } }));
  }

  const pendingSummary = React.useMemo(() => {
    let fare = 0;
    let paid = 0;
    let pending = 0;
    let fareKnownCount = 0;

    for (const r of pendingTicketItems) {
      const f = getFareForRow(r);
      const p = getPaidForRow(r) ?? 0;
      paid += p;
      if (typeof f === "number") {
        fare += f;
        fareKnownCount++;
        const pe = Math.max(0, f - p);
        pending += pe;
      }
    }

    return {
      count: pendingTicketItems.length,
      fareKnownCount,
      fare,
      paid,
      pending,
    };
  }, [pendingTicketItems, ticketById]);

  async function savePendingRowTickets(row: PendingTicketGroupRow, nextDB: string, nextBD: string) {
    const firstRow = row.__firstRow || row;
    const lastRow = row.__lastRow || row;
    const firstId = String(firstRow._id || "").trim();
    const lastId = String(lastRow._id || "").trim();
    if (!firstId) return;

    const needDB = !!row.__needDB;
    const needBD = !!row.__needBD;

    const db = needDB ? String(nextDB || "").trim() : String(firstRow.ticketDelhiBeas || "").trim();
    const bd = needBD ? String(nextBD || "").trim() : String(lastRow.ticketBeasDelhi || "").trim();

    if (needDB && !db && needBD && !bd) {
      alert("Pick at least one ticket (Delhi–Beas and/or Beas–Delhi) before saving.");
      return;
    }

    const okMismatch = confirmIfDelhiBeasDateMismatch({
      travelStartDate: row.travelStartDate,
      ticketId: db,
      allow: String(firstRow.mode) === "Train" && firstRow.bookingReqDelhiBeas === "Yes" && !!db,
    });
    if (!okMismatch) return;

    patchPendingState(firstId, { saving: true });
    try {
      const saveOne = async (target: NominalLadooRow, patch: { ticketDelhiBeas?: string; ticketBeasDelhi?: string }) => {
        const realId = encodeURIComponent(String(target._id || "").trim());
        const jd = jathaDates.find((x) => x._id === target.jathaDateId);
        const jStart = jd ? getJathaStart(jd) : "";

        const res = await fetch(`/api/nominal-roll/parantha/${realId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department: String(target.department || "").trim(),
            sangat: String(target.sangat || "").trim(),
            mode: target.mode,
            bookingReqDelhiBeas: String(target.mode) === "Train" ? target.bookingReqDelhiBeas : "",
            bookingReqBeasDelhi: String(target.mode) === "Train" ? target.bookingReqBeasDelhi : "",
            ticketDelhiBeas:
              String(target.mode) === "Train" && target.bookingReqDelhiBeas === "Yes"
                ? String(patch.ticketDelhiBeas ?? target.ticketDelhiBeas ?? "").trim()
                : "",
            ticketBeasDelhi:
              String(target.mode) === "Train" && target.bookingReqBeasDelhi === "Yes"
                ? String(patch.ticketBeasDelhi ?? target.ticketBeasDelhi ?? "").trim()
                : "",
            payment: String(target.payment || "").trim(),
            paymentMode: String(target.paymentMode || "").trim(),
            paidTo: String(target.paidTo || "").trim(),
            busGroup: String(target.busGroup || "").trim(),
            jathaDateId: target.jathaDateId,
            jathaDate: jStart || "",
            travelStartDate: iso10(target.travelStartDate),
            travelEndDate: iso10(target.travelEndDate),
            notes: String(target.notes || "").trim(),
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Save failed (${res.status})`);
        }
      };

      if (firstId === lastId) {
        await saveOne(firstRow, { ticketDelhiBeas: db, ticketBeasDelhi: bd });
      } else {
        if (needDB || db) {
          await saveOne(firstRow, { ticketDelhiBeas: db });
        }
        if (needBD || bd) {
          await saveOne(lastRow, { ticketBeasDelhi: bd });
        }
      }

      alert("✅ Ticket assignment saved successfully.");

      patchPendingState(firstId, { pickDB: "", pickBD: "" });
      await loadNominal();
    } catch (err: any) {
      alert(err?.message || "Save failed.");
    } finally {
      patchPendingState(firstId, { saving: false });
    }
  }

  function bulkSmartAssign(rows: PendingTicketGroupRow[]) {
    for (const r of rows) {
      const id = String(r._id || "").trim();
      if (!id) continue;

      const st = getPendingState(id);

      const needDB = !!r.__needDB;
      const needBD = !!r.__needBD;

      const qDB = st.qDB || `${r.customerName || ""} ${iso10(r.travelStartDate)}`.trim();
      const qBD = st.qBD || `${r.customerName || ""} ${iso10(r.travelEndDate)}`.trim();

      let pickDB = st.pickDB;
      let pickBD = st.pickBD;

      if (needDB && !pickDB) {
        pickDB = findSmartTicketId({
          list: unassignedTrainDliBeas.filter((t) => !iso10(r.travelStartDate) || iso10(t.travelDate) === iso10(r.travelStartDate)),
          searchText: qDB,
          travelStartDate: r.travelStartDate,
          travelEndDate: r.travelEndDate,
          customerName: r.customerName || "",
          expectedRoute: "DLI-BEAS",
        });
      }

      if (needBD && !pickBD) {
        pickBD = findSmartTicketId({
          list: unassignedTrainBeasDli.filter((t) => !iso10(r.travelEndDate) || iso10(t.travelDate) === iso10(r.travelEndDate)),
          searchText: qBD,
          travelStartDate: r.travelEndDate,
          travelEndDate: r.travelEndDate,
          customerName: r.customerName || "",
          expectedRoute: "BEAS-DLI",
        });
      }

      patchPendingState(id, { qDB, qBD, pickDB, pickBD });
    }
  }

  async function bulkSaveSelected(rows: PendingTicketGroupRow[]) {
    setPendingBulkBusy(true);
    try {
      for (const r of rows) {
        const id = String(r._id || "").trim();
        if (!id) continue;
        const st = getPendingState(id);

        const needDB = !!r.__needDB;
        const needBD = !!r.__needBD;

        const nextDB = needDB ? String(st.pickDB || "").trim() : "";
        const nextBD = needBD ? String(st.pickBD || "").trim() : "";

        // skip rows with nothing selected
        if ((needDB && !nextDB) && (needBD && !nextBD)) continue;

        await savePendingRowTickets(r, nextDB, nextBD);
      }
    } finally {
      setPendingBulkBusy(false);
    }
  }
  // ✅ Table filtering
  const filteredItems = React.useMemo(() => {
    const q = tableQ.trim().toLowerCase();

    return items.filter((r) => {
      if (tableDept && String(r.department || "").trim() !== tableDept) return false;
      if (tableMode && String(r.mode || "").trim() !== tableMode) return false;
      if (tableSangat && String(r.sangat || "").trim() !== tableSangat) return false;
      if (tableReqDB && String(r.bookingReqDelhiBeas || "").trim() !== tableReqDB) return false;
      if (tableReqBD && String(r.bookingReqBeasDelhi || "").trim() !== tableReqBD) return false;

      // ✅ NEW: Jatha date filter
      if (tableJathaId && String(r.jathaDateId || "").trim() !== tableJathaId) return false;

      // ✅ NEW: date range filters
      const st = iso10(r.travelStartDate);
      const en = iso10(r.travelEndDate);

      if (tableStartFrom && st && st < iso10(tableStartFrom)) return false;
      if (tableStartTo && st && st > iso10(tableStartTo)) return false;

      if (tableEndFrom && en && en < iso10(tableEndFrom)) return false;
      if (tableEndTo && en && en > iso10(tableEndTo)) return false;

      // ✅ NEW: default visibility window (hide future months)
      if (!showFullData && visibleCutoffISO) {
        const jd = iso10(r.jathaDate);
        if (jd && jd > visibleCutoffISO) return false;
      }

      if (!q) return true;

      const hay = [
        r.customerName,
        r.mobile,
        r.adhaarNumber,
        r.badgeNo,
        r.department,
        r.sangat,
        r.mode,
        r.paymentMode,
        r.paidTo,
        r.busGroup,
        r.bookingReqDelhiBeas,
        r.bookingReqBeasDelhi,
        r.ticketDelhiBeas,
        r.ticketBeasDelhi,
        renderTicketValue(r.ticketDelhiBeas),
        renderTicketValue(r.ticketBeasDelhi),
        r.notes,
        formatJathaLabelFromRow(r),
        r.travelStartDate,
        r.travelEndDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [items, tableQ, tableDept, tableMode, tableSangat, tableReqDB, tableReqBD, tableJathaId, tableStartFrom, tableStartTo, tableEndFrom, tableEndTo, showFullData, visibleCutoffISO, ticketLabelMap, jathaLabelById]);

  // ✅ Jatha range resolver (same logic as Reports)
  function jathaRangeForRow(r: NominalLadooRow): { start: string; end: string } {
    const id = String((r as any).jathaDateId || "").trim();
    if (id) {
      const jd = jathaDates.find((d) => String(d._id) === id);
      if (jd) {
        const s = String(jd.jathaStartDate || jd.travelDate || r.jathaDate || "").slice(0, 10);
        const e = String(jd.jathaEndDate || jd.travelDate || r.jathaDate || "").slice(0, 10);
        return { start: s || "-", end: e || "-" };
      }
    }
    const s = String((r as any).jathaDate || "").slice(0, 10);
    return { start: s || "-", end: s || "-" };
  }

  // ✅ mismatch between Jatha Start/End and Travel Start/End
  function isMismatchRow(r: NominalLadooRow) {
    const jr = jathaRangeForRow(r);
    const ts = String(r.travelStartDate || "").slice(0, 10);
    const te = String(r.travelEndDate || "").slice(0, 10);
    if (!ts || !te || !jr.start || !jr.end) return false;
    return jr.start !== ts || jr.end !== te;
  }

  // ✅ current view rows (filtered + optional mismatch)
  const viewItems = React.useMemo(() => {
    if (!showMismatchOnly) return filteredItems;
    return filteredItems.filter((r) => isMismatchRow(r));
  }, [filteredItems, showMismatchOnly, jathaDates]);

  // 🧾 Export XLSX (ALL CAPS) - supports Export All and Export Filtered
  async function exportXlsxAllCaps(rows: NominalLadooRow[], fileBase: string) {
    const XLSX = await import("xlsx");
    const upper = (v: any) => String(v ?? "").toUpperCase();

    // ✅ columns in same order as table (adjust if you change table order)
    const data = rows.map((r, idx) => {
      const jr = jathaRangeForRow(r);
      const fareDB = ticketFare(r.ticketDelhiBeas);
      const fareBD = ticketFare(r.ticketBeasDelhi);
      const fareTotal = Number(fareDB + fareBD) || 0;
      const paid = Number(String(r.payment || "0")) || 0;
      const pending = Math.max(0, fareTotal - paid);

      return {
        "S.NO": upper(idx + 1),
        "NAME": upper(r.customerName || ""),
        "DEPARTMENT": upper(r.department || ""),
        "SANGAT": upper(r.sangat || ""),
        "FATHER/HUSBAND": upper(r.fatherOrHusbandName || ""),
        "GENDER": upper(r.gender || ""),
        "AGE": upper(r.age ?? ""),
        "MOBILE": upper(r.mobile || ""),
        "AADHAAR": upper(r.adhaarNumber || ""),
        "ADDRESS": upper(r.address || ""),
        "BADGE": upper(r.badgeNo || ""),
        "MODE": upper(r.mode || ""),
        "REQ D-B": upper(r.bookingReqDelhiBeas || ""),
        "REQ B-D": upper(r.bookingReqBeasDelhi || ""),
        "TICKET D-B": upper(renderTicketLabel(r.ticketDelhiBeas)),
        "TICKET B-D": upper(renderTicketLabel(r.ticketBeasDelhi)),
        "FARE TOTAL": upper(fareTotal),
        "PENDING": upper(pending),
        "PAYMENT": upper(paid),
        "PAYMENT MODE": upper(r.paymentMode || ""),
        "PAID TO": upper(r.paidTo || ""),
        "BUS GROUP": upper(r.busGroup || ""),
        "JATHA DATE": upper(`${jr.start} -> ${jr.end}`),
        "TRAVEL START": upper(String(r.travelStartDate || "").slice(0, 10)),
        "TRAVEL END": upper(String(r.travelEndDate || "").slice(0, 10)),
        "NOTES": upper(r.notes || ""),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NOMINAL_ROLL");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${fileBase}_${stamp}.xlsx`);
  }

  // 🖨️ Print Tickets: 6 cards per A4 (2 columns x 3 rows) + multi page
  function printTicketCards(rows: NominalLadooRow[]) {
    const upper = (v: any) => String(v ?? "").toUpperCase();
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;

    const style = `
      <style>
        @page { size: A4; margin: 10mm; }
        body { font-family: Arial, sans-serif; }
        .page { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; page-break-after: always; }
        .card { border: 1px solid #000; padding: 6mm; min-height: 85mm; box-sizing: border-box; }
        .h { font-size: 18px; font-weight: 800; margin-bottom: 4mm; }
        .row { font-size: 14px; margin: 1.5mm 0; }
        .small { font-size: 12px; }
      </style>
    `;

    function cardHtml(r: NominalLadooRow) {
      const fareDB = ticketFare(r.ticketDelhiBeas);
      const fareBD = ticketFare(r.ticketBeasDelhi);
      const fareTotal = Number(fareDB + fareBD) || 0;
      const paid = Number(String(r.payment || "0")) || 0;
      const pending = Math.max(0, fareTotal - paid);

      const jr = jathaRangeForRow(r);
      return `
        <div class="card">
          <div class="h">${upper(r.customerName || "")}</div>
          <div class="row">BADGE: <b>${upper(r.badgeNo || "-")}</b> &nbsp; DEPT: <b>${upper(r.department || "-")}</b></div>
          <div class="row">MODE: <b>${upper(r.mode || "-")}</b> &nbsp; SANGAT: <b>${upper(r.sangat || "-")}</b></div>
          <div class="row small">JATHA: <b>${upper(jr.start)} -> ${upper(jr.end)}</b></div>
          <div class="row small">TRAVEL: <b>${upper(r.travelStartDate)} -> ${upper(r.travelEndDate)}</b></div>
          <div class="row small">TICKET D-B: ${upper(renderTicketLabel(r.ticketDelhiBeas))}</div>
          <div class="row small">TICKET B-D: ${upper(renderTicketLabel(r.ticketBeasDelhi))}</div>
          <div class="row">FARE: <b>${upper(fareTotal)}</b> &nbsp; PAID: <b>${upper(paid)}</b> &nbsp; PENDING: <b>${upper(pending)}</b></div>\n          <div class="row small">PAYMENT MODE: <b>${upper(r.paymentMode || "-")}</b> &nbsp; PAID TO: <b>${upper(r.paidTo || "-")}</b></div>
          <div class="row small">BUS GROUP: <b>${upper(r.busGroup || "-")}</b></div>
        </div>
      `;
    }

    let html = `<html><head><title>PRINT TICKETS</title>${style}</head><body>`;
    for (let i = 0; i < rows.length; i += 6) {
      html += `<div class="page">`;
      rows.slice(i, i + 6).forEach((r) => (html += cardHtml(r)));
      html += `</div>`;
    }
    html += `</body></html>`;

    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }


  return (
    <div>
      <datalist id="deptList">
        {DEPARTMENT_OPTIONS.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <h2 className="text-lg font-semibold">Parantha</h2>
      <p className="app-subtitle mt-1">Search Sangat → select → fill details → save.</p>

      {/* Tabs */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={["app-btn h-9 px-4", tab === "ladoo" ? "app-btn-primary" : "app-btn-secondary"].join(" ")}
          onClick={() => setTab("ladoo")}
        >
          Nominal
        </button>

        <button
          type="button"
          className={["app-btn h-9 px-4", tab === "unassigned" ? "app-btn-primary" : "app-btn-secondary"].join(" ")}
          onClick={() => setTab("unassigned")}
        >
          Unassigned Tickets
        </button>

        <button
          type="button"
          className={["app-btn h-9 px-4", tab === "pending" ? "app-btn-primary" : "app-btn-secondary"].join(" ")}
          onClick={() => setTab("pending")}
        >
          Pending Ticket Booking ({pendingTicketItems.length})
        </button>
      </div>

      {/* ✅ Pending tab */}
      {tab === "pending" && (
        <div className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-lg font-semibold">Pending Ticket Booking</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Inline assign + bulk assign for entries where Booking REQ = Yes but Ticket is not assigned yet (Delhi–Beas and/or Beas–Delhi).
              </div>

              <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold">Summary:</span> Rows: <span className="font-semibold">{pendingSummary.count}</span> • Fare Known Rows: <span className="font-semibold">{pendingSummary.fareKnownCount}</span> • Total Fare (known): <span className="font-semibold">{pendingSummary.fare}</span> • Paid: <span className="font-semibold">{pendingSummary.paid}</span> • Pending (known): <span className="font-semibold">{pendingSummary.pending}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
  type="button"
  className="app-btn app-btn-secondary h-9 px-3 text-xs"
  onClick={() => {
    const rows = pendingTicketItems.map((r, i) => {
      const needDB = !!r.__needDB;
      const needBD = !!r.__needBD;

      const pendingSide = [
        needDB ? "Delhi–Beas" : "",
        needBD ? "Beas–Delhi" : "",
      ]
        .filter(Boolean)
        .join(" + ");

      const fare = getFareForRow(r);
      const paid = getPaidForRow(r);
      const pending = getPendingForRow(r);

      return {
        "S.No": i + 1,
        Name: r.customerName || "",
        Mobile: r.mobile || "",
        Aadhaar: r.adhaarNumber || "",
        Badge: r.badgeNo || "",
        Department: r.department || "",
        "Jatha Date": (r as any).__groupLabel || formatJathaLabelFromRow(r),
        "Travel Start": formatPrettyDate(r.travelStartDate),
        "Travel End": formatPrettyDate(r.travelEndDate),
        "REQ D-B": r.bookingReqDelhiBeas || "",
        "Ticket D-B": renderTicketValue(r.ticketDelhiBeas),
        "REQ B-D": r.bookingReqBeasDelhi || "",
        "Ticket B-D": renderTicketValue(r.ticketBeasDelhi),
        Fare: fare === null ? "" : fare,
        Paid: paid === null ? "" : paid,
        "Payment Mode": r.paymentMode || "",
        "Paid To": r.paidTo || "",
        "Bus Group": r.busGroup || "",
        Pending: pending === null ? "" : pending,
        "Pending Side": pendingSide,
        Notes: r.notes || "",
      };
    });

    if (!rows.length) {
      alert("No pending records to export.");
      return;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`pending-ticket-booking-${stamp}.csv`, rows);
  }}
>
  Export to Excel (CSV)
</button>

<button
  type="button"
  className="app-btn app-btn-secondary h-9 px-3 text-xs"
  onClick={() => setShowMismatchOnly((v) => !v)}
>
  {showMismatchOnly ? "Show All" : "Show Mismatched Tickets"}
</button>

<button
  type="button"
  className="app-btn app-btn-secondary h-9 px-3 text-xs"
  onClick={() => printTicketCards(viewItems)}
>
  Print Tickets (Current View)
</button>

<button
  type="button"
  className="app-btn app-btn-secondary h-9 px-3 text-xs"
  onClick={() => exportXlsxAllCaps(items, "NOMINAL_ROLL_ALL")}
>
  Export All (XLSX)
</button>

<button
  type="button"
  className="app-btn app-btn-secondary h-9 px-3 text-xs"
  onClick={() => exportXlsxAllCaps(viewItems, "NOMINAL_ROLL_FILTERED")}
>
  Export Filtered (XLSX)
</button>

<button
  type="button"
  className="app-btn app-btn-secondary h-9 px-3 text-xs"
  onClick={loadNominal}
  disabled={loading}
>
  {loading ? "Refreshing..." : "Refresh List"}
</button>

            </div>
          </div>

          {/* Bulk actions */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 bg-zinc-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/30">
            <div>
              Selected: <span className="font-semibold">{pendingSelectedIds.size}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="app-btn app-btn-secondary h-9 px-3 text-xs"
                onClick={() => setPendingSelectedIds(new Set(pendingTicketItems.map((x) => String(x._id))))}
                disabled={pendingTicketItems.length === 0}
              >
                Select All
              </button>
              <button type="button" className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={() => setPendingSelectedIds(new Set())}>
                Clear
              </button>
              <button
                type="button"
                className="app-btn app-btn-primary h-9 px-3 text-xs"
                onClick={() => {
                  const rows = pendingTicketItems.filter((x) => pendingSelectedIds.has(String(x._id)));
                  if (!rows.length) return alert("Select rows first.");
                  bulkSmartAssign(rows);
                }}
                disabled={loadingTickets || pendingSelectedIds.size === 0}
              >
                Bulk Smart Assign
              </button>
              <button
                type="button"
                className="app-btn app-btn-primary h-9 px-3 text-xs"
                onClick={async () => {
                  const rows = pendingTicketItems.filter((x) => pendingSelectedIds.has(String(x._id)));
                  if (!rows.length) return alert("Select rows first.");
                  await bulkSaveSelected(rows);
                }}
                disabled={loadingTickets || pendingSelectedIds.size === 0 || pendingBulkBusy}
              >
                {pendingBulkBusy ? "Saving..." : "Bulk Save Selected"}
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-xl border border-black/5 dark:border-white/10">
            <table className="table">
              <thead className="thead">
                <tr>
                  {[
                    "Sel",
                    "S.No",
                    "Name",
                    "Jatha Date",
                    "Start",
                    "End",
                    "Need D-B",
                    "Assign D-B (inline)",
                    "Need B-D",
                    "Assign B-D (inline)",
                    "Save",
                  ].map((h) => (
                    <th key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {pendingTicketItems.length === 0 ? (
                  <tr>
                    <td className="td text-zinc-600 dark:text-zinc-400" colSpan={11}>
                      No pending ticket bookings 🎉
                    </td>
                  </tr>
                ) : (
                  pendingTicketItems.map((r, idx) => {
                    const id = String(r._id || "").trim();
                    const st = getPendingState(id);

                    const needDB = !!r.__needDB;
                    const needBD = !!r.__needBD;

                    const candDB = unassignedTrainDliBeas
                      .filter((t) => (!iso10(r.travelStartDate) || iso10(t.travelDate) === iso10(r.travelStartDate)) && ticketMatches(t, st.qDB))
                      .slice(0, 200);
                    const candBD = unassignedTrainBeasDli
                      .filter((t) => (!iso10(r.travelEndDate) || iso10(t.travelDate) === iso10(r.travelEndDate)) && ticketMatches(t, st.qBD))
                      .slice(0, 200);

                    return (
                      <tr key={r._id} className={[["row", idx % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")].join(" ")}>
                        <td className="td">
                          <input
                            type="checkbox"
                            checked={pendingSelectedIds.has(id)}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setPendingSelectedIds((prev) => {
                                const n = new Set(prev);
                                if (on) n.add(id);
                                else n.delete(id);
                                return n;
                              });
                            }}
                          />
                        </td>
                        <td className="td">{idx + 1}</td>
                        <td className="td font-medium">
                          <div>{r.customerName || "-"}</div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">{r.mobile || "-"} • {r.department || "-"}</div>
                        </td>
                        <td className="td">{r.__groupLabel || formatJathaLabelFromRow(r)}</td>
                        <td className="td">{formatPrettyDate(r.travelStartDate)}</td>
                        <td className="td">{formatPrettyDate(r.travelEndDate)}</td>

                        <td className="td">{needDB ? "Yes" : "No"}</td>
                        <td className="td">
                          {!needDB ? (
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">Already assigned</span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  className={inputCls()}
                                  value={st.qDB}
                                  onChange={(e) => patchPendingState(id, { qDB: e.target.value })}
                                  placeholder="Seat/PNR/Train/Date/New Delhi..."
                                  disabled={!!st.saving || loadingTickets}
                                />
                                <button
                                  type="button"
                                  className="app-btn app-btn-secondary h-9 px-3 text-xs"
                                  onClick={() => {
                                    const q = st.qDB || `${r.customerName || ""} ${iso10(r.travelStartDate)}`.trim();
                                    const pick = findSmartTicketId({
                                      list: unassignedTrainDliBeasFiltered,
                                      searchText: q,
                                      travelStartDate: r.travelStartDate,
                                      travelEndDate: r.travelEndDate,
                                      customerName: r.customerName || "",
                                      expectedRoute: "DLI-BEAS",
                                    });
                                    if (!pick) return alert("No good Delhi–Beas match found. Try Seat/PNR/Train/Date/New Delhi/Old Delhi.");
                                    patchPendingState(id, { qDB: q, pickDB: pick });
                                  }}
                                  disabled={!!st.saving || loadingTickets}
                                >
                                  Suggest
                                </button>
                              </div>

                              <select
                                className={inputCls()}
                                value={st.pickDB}
                                onChange={(e) => patchPendingState(id, { pickDB: e.target.value })}
                                disabled={!!st.saving || loadingTickets}
                              >
                                <option value="">Select ticket</option>
                                {candDB.map((t) => (
                                  <option key={t._id} value={t._id}>
                                    {makeTicketLabel(t)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>

                        <td className="td">{needBD ? "Yes" : "No"}</td>
                        <td className="td">
                          {!needBD ? (
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">Already assigned</span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  className={inputCls()}
                                  value={st.qBD}
                                  onChange={(e) => patchPendingState(id, { qBD: e.target.value })}
                                  placeholder="Seat/PNR/Train/Date/New Delhi..."
                                  disabled={!!st.saving || loadingTickets}
                                />
                                <button
                                  type="button"
                                  className="app-btn app-btn-secondary h-9 px-3 text-xs"
                                  onClick={() => {
                                    const q = st.qBD || `${r.customerName || ""} ${iso10(r.travelEndDate)}`.trim();
                                    const pick = findSmartTicketId({
                                      list: candBD,
                                      searchText: q,
                                      travelStartDate: r.travelEndDate,
                                      travelEndDate: r.travelEndDate,
                                      customerName: r.customerName || "",
                                      expectedRoute: "BEAS-DLI",
                                    });
                                    if (!pick) return alert("No good Beas–Delhi match found. Try Seat/PNR/Train/Date/New Delhi/Old Delhi.");
                                    patchPendingState(id, { qBD: q, pickBD: pick });
                                  }}
                                  disabled={!!st.saving || loadingTickets}
                                >
                                  Suggest
                                </button>
                              </div>

                              <select
                                className={inputCls()}
                                value={st.pickBD}
                                onChange={(e) => patchPendingState(id, { pickBD: e.target.value })}
                                disabled={!!st.saving || loadingTickets}
                              >
                                <option value="">Select ticket</option>
                                {candBD.map((t) => (
                                  <option key={t._id} value={t._id}>
                                    {makeTicketLabel(t)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>

                        <td className="td">
                          <button
                            type="button"
                            className="app-btn app-btn-primary h-9 px-3 text-xs"
                            onClick={async () => {
                              await savePendingRowTickets(r, st.pickDB, st.pickBD);
                            }}
                            disabled={!!st.saving || loadingTickets}
                          >
                            {st.saving ? "Saving..." : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unassigned tab */}
      {tab === "unassigned" && (
        <div className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-lg font-semibold">Unassigned Tickets</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Tickets not assigned to any nominal roll entry.</div>
            </div>

            <button type="button" className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={loadTrainTickets} disabled={loadingTickets}>
              {loadingTickets ? "Refreshing..." : "Refresh Tickets"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-black/5 p-3 dark:border-white/10">
              <div className="mb-2 text-sm font-semibold">Delhi → Beas (Unassigned)</div>
              {unassignedTrainDliBeas.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">No unassigned tickets.</div>
              ) : (
                <div className="max-h-[520px] overflow-auto text-sm">
                  {unassignedTrainDliBeas.map((t) => (
                    <div key={t._id} className="rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-white/5">
                      {makeTicketLabel(t)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-black/5 p-3 dark:border-white/10">
              <div className="mb-2 text-sm font-semibold">Beas → Delhi (Unassigned)</div>
              {unassignedTrainBeasDli.length === 0 ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">No unassigned tickets.</div>
              ) : (
                <div className="max-h-[520px] overflow-auto text-sm">
                  {unassignedTrainBeasDli.map((t) => (
                    <div key={t._id} className="rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-white/5">
                      {makeTicketLabel(t)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Parantha tab */}
      {tab === "ladoo" && (
        <>
          <form onSubmit={onCreate} className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left: Search + Dept filter + Selected */}
              <div className="lg:col-span-5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="app-label">Search Sangat (Name / Mobile / Aadhaar)</div>
                    <div className="flex gap-2">
                      <input
                        className={inputCls()}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Type name / mobile / aadhaar"
                        onFocus={() => {
                          if (results.length) setSearchOpen(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setSearchOpen(false), 150);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            doCustomerSearch();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={doCustomerSearch}
                        disabled={searching || !search.trim()}
                        className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60"
                      >
                        {searching ? "..." : "Search"}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="app-label">Filter Department (Optional)</div>
                    <select className={inputCls()} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                      <option value="">All Departments</option>
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {searchOpen && (
                  <div className="mt-2 rounded-xl border border-black/5 bg-white p-2 text-sm dark:border-white/10 dark:bg-zinc-950">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                      <span>Suggestions</span>
                      {deptFilter ? <span className="font-normal">Dept: {deptFilter}</span> : null}
                    </div>

                    <div className="max-h-56 overflow-auto">
                      {results.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">{searching ? "Searching..." : "No matches."}</div>
                      ) : (
                        results.map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setResults([]);
                              setSearchOpen(false);
                            }}
                            className={[
                              "w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-white/5",
                              selectedCustomer?._id === c._id ? "bg-zinc-50 dark:bg-white/5" : "",
                            ].join(" ")}
                          >
                            <div className="font-semibold">{c.name}</div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              Mobile: {c.mobile || "-"} • Aadhaar: {c.adhaarNumber || "-"} • Badge: {c.badgeNo || "-"} • Dept: {c.department || "-"}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-xl border border-black/5 bg-zinc-50 p-3 text-sm dark:border-white/10 dark:bg-black/30">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Selected Data</div>
                  <div className="mt-1">
                    <div className="font-semibold">{selectedCustomer?.name || "-"}</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Father/Husband: {selectedCustomer?.fatherOrHusbandName || "-"} • Gender/Age:{" "}
                      {(selectedCustomer?.gender || "-") + " / " + (selectedCustomer?.age ?? "-")}
                    </div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Badge: {selectedCustomer?.badgeNo || "-"} • Dept: {selectedCustomer?.department || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Main controls */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="lg:col-span-3 sm:col-span-2" ref={createJathaRef}>
                    <div className="app-label">Jatha Date(s) *</div>
                    <button
                      type="button"
                      className={[inputCls(), "flex w-full items-center justify-between"].join(" ")}
                      onClick={() => setCreateJathaOpen((v) => !v)}
                      disabled={loadingJatha}
                    >
                      <span>{loadingJatha ? "Loading..." : selectedJathaLabel(jathaDateIds)}</span>
                      <span>{createJathaOpen ? "▲" : "▼"}</span>
                    </button>

                    {createJathaOpen && !loadingJatha && (
                      <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-black/5 bg-white p-2 dark:border-white/10 dark:bg-zinc-950">
                        {jathaDates.length === 0 ? (
                          <div className="px-2 py-2 text-sm text-zinc-600 dark:text-zinc-400">No Jatha dates found.</div>
                        ) : (
                          jathaDates.map((d) => {
                            const js = getJathaStart(d);
                            const je = getJathaEnd(d);
                            const checked = jathaDateIds.includes(d._id);
                            return (
                              <label
                                key={d._id}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-white/5"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const on = e.target.checked;
                                    setJathaDateIds((prev) => {
                                      const s = new Set(prev);
                                      if (on) s.add(d._id);
                                      else s.delete(d._id);
                                      return Array.from(s);
                                    });
                                    setStartTouched(false);
                                    setEndTouched(false);
                                  }}
                                />
                                <span className="text-sm">{fmtRangeLabel(js, je)}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      Selected: <span className="font-semibold">{jathaDateIds.length}</span>
                    </div>
                  </div>

                  <div>
                    <div className="app-label">Mode *</div>
                    <select className={inputCls()} value={mode} onChange={(e) => setMode(e.target.value as any)}>
                      <option value="">Select</option>
                      <option value="Train">Train</option>
                       <option value="Special Train">Special Train</option>
                      <option value="Bus">Bus</option>
                      <option value="Self">Self</option>
                         
                         <option value="Bus (Delhi to Beas)">Bus (Delhi to Beas)</option>
                           <option value="Bus (Beas to Delhi)">Bus (Beas to Delhi)</option>
                      <option value="Travel Only (Bus- Both Sides)">Travel Only (Bus- Both Sides)</option>
                       <option value="Travel Only (Bus- Delhi to Beas)">Travel Only (Bus- Delhi to Beas)</option>
                       <option value="Travel Only (Bus- Beas to Delhi)">Travel Only (Bus- Beas to Delhi)</option>
                       
                    </select>
                  </div>

                  <div>
                    <div className="app-label">Department</div>
                    <input
                      className={inputCls()}
                      list="deptList"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Select or type department"
                    />
                  </div>

                  <div>
                    <div className="app-label">Sangat</div>
                    <select className={inputCls()} value={sangat} onChange={(e) => setSangat(e.target.value as any)}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <div className="app-label">Payment *</div>
                    <input className={inputCls()} value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="e.g., 500 / Paid 500" />
                  </div>

                  <div>
                    <div className="app-label">Payment Mode</div>
                    <select className={inputCls()} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
                      <option value="">Select</option>
                      {PAYMENT_MODE_OPTIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="app-label">Paid To</div>
                    <select className={inputCls()} value={paidTo} onChange={(e) => setPaidTo(e.target.value as PaidTo)}>
                      <option value="">Select</option>
                      {PAID_TO_OPTIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="app-label">Bus Group / Friend Group</div>
                    <select
                      className={busGroup ? busGroupSelectCls(busGroup) : inputCls()}
                      value={busGroup}
                      onChange={(e) => setBusGroup(e.target.value)}
                    >
                      <option value="">No Group</option>
                      {busGroupOptions.map((g) => {
                        const count = busGroupCountMap.get(g) || 0;
                        return (
                          <option key={g} value={g}>
                            {busGroupOptionLabel(g)}
                          </option>
                        );
                      })}
                    </select>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                        Used group = amber
                      </span>
                      <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                        New group = green
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                      Same group name means these people should be placed in one bus only. Used groups show count, and next 5 unused groups are shown automatically.
                    </div>
                  </div>

                  <div>
                    <div className="app-label">Travel Start Date *</div>
                    <input
                      type="date"
                      className={inputCls()}
                      value={travelStartDate}
                      onChange={(e) => {
                        setTravelStartDate(e.target.value);
                        setStartTouched(true);
                      }}
                    />
                  </div>

                  <div>
                    <div className="app-label">Travel End Date *</div>
                    <input
                      type="date"
                      className={inputCls()}
                      value={travelEndDate}
                      onChange={(e) => {
                        setTravelEndDate(e.target.value);
                        setEndTouched(true);
                      }}
                    />
                  </div>

                  {/* ✅ if mode != Train, hide booking + tickets blocks */}
                  {showBookingAndTicketsCreate && (
                    <>
                      <div>
                        <div className="app-label">Booking REQ (Delhi–Beas) *</div>
                        <select className={inputCls()} value={bookingDelhiBeas} onChange={(e) => setBookingDelhiBeas(e.target.value as any)}>
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div>
                        <div className="app-label">Booking REQ (Beas–Delhi) *</div>
                        <select className={inputCls()} value={bookingBeasDelhi} onChange={(e) => setBookingBeasDelhi(e.target.value as any)}>
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {/* Delhi–Beas */}
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="app-label">Ticket (Delhi–Beas) (Optional)</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                  onClick={() => {
                                    const id = findSmartTicketId({
                                      list: unassignedTrainDliBeas,
                                      searchText: ticketSearchDB,
                                      travelStartDate,
                                      travelEndDate,
                                      customerName: selectedCustomer?.name || "",
                                      expectedRoute: "DLI-BEAS",
                                    });
                                    if (!id) {
                                      return alert(
                                        "No good unassigned Delhi–Beas match found.\n\nTry typing Seat / PNR / Train / Date / New Delhi / Old Delhi in the ticket search box."
                                      );
                                    }
                                    setTicketDelhiBeas(id);
                                  }}
                                  disabled={!allowDelhiBeasTicket || loadingTickets}
                                  title="Smart quick assign: prefers same Start Date, same Name, and boarding station tokens"
                                >
                                  Quick Assign
                                </button>

                                <button
                                  type="button"
                                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                  onClick={() => setTicketSearchDB("")}
                                  disabled={!ticketSearchDB}
                                >
                                  Clear Search
                                </button>
                              </div>
                            </div>

                            <input
                              className={inputCls()}
                              value={ticketSearchDB}
                              onChange={(e) => setTicketSearchDB(e.target.value)}
                              placeholder="Search by seat / PNR / train / date / New Delhi / Old Delhi..."
                              disabled={!allowDelhiBeasTicket || loadingTickets}
                            />

                            <select
                              className={inputCls()}
                              value={ticketDelhiBeas}
                              onChange={(e) => setTicketDelhiBeas(e.target.value)}
                              disabled={!allowDelhiBeasTicket || loadingTickets}
                            >
                              <option value="">
                                {bookingDelhiBeas !== "Yes" ? "Booking = No" : loadingTickets ? "Loading..." : "Select ticket (or leave empty)"}
                              </option>

                              {allowDelhiBeasTicket && unassignedTrainDliBeasFiltered.length > 0 && (
                                <optgroup label={`Unassigned Tickets (showing ${unassignedTrainDliBeasFiltered.length})`}>
                                  {unassignedTrainDliBeasFiltered.map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {makeTicketLabel(t)}
                                    </option>
                                  ))}
                                </optgroup>
                              )}

                             
                            </select>
                          </div>

                          {/* Beas–Delhi */}
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="app-label">Ticket (Beas–Delhi) (Optional)</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                  onClick={() => {
                                    const id = findSmartTicketId({
                                      list: unassignedTrainBeasDliFiltered,
                                      searchText: ticketSearchBD,
                                      travelStartDate: travelEndDate,
                                      travelEndDate,
                                      customerName: selectedCustomer?.name || "",
                                      expectedRoute: "BEAS-DLI",
                                    });
                                    if (!id) {
                                      return alert(
                                        "No good unassigned Beas–Delhi match found.\n\nTry typing Seat / PNR / Train / Date / New Delhi / Old Delhi in the ticket search box."
                                      );
                                    }
                                    setTicketBeasDelhi(id);
                                  }}
                                  disabled={!allowBeasDelhiTicket || loadingTickets}
                                  title="Smart quick assign: prefers same Start Date, same Name, and boarding station tokens"
                                >
                                  Quick Assign
                                </button>

                                <button
                                  type="button"
                                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                  onClick={() => setTicketSearchBD("")}
                                  disabled={!ticketSearchBD}
                                >
                                  Clear Search
                                </button>
                              </div>
                            </div>

                            <input
                              className={inputCls()}
                              value={ticketSearchBD}
                              onChange={(e) => setTicketSearchBD(e.target.value)}
                              placeholder="Search by seat / PNR / train / date / New Delhi / Old Delhi..."
                              disabled={!allowBeasDelhiTicket || loadingTickets}
                            />

                            <select
                              className={inputCls()}
                              value={ticketBeasDelhi}
                              onChange={(e) => setTicketBeasDelhi(e.target.value)}
                              disabled={!allowBeasDelhiTicket || loadingTickets}
                            >
                              <option value="">
                                {bookingBeasDelhi !== "Yes" ? "Booking = No" : loadingTickets ? "Loading..." : "Select ticket (or leave empty)"}
                              </option>

                              {allowBeasDelhiTicket && unassignedTrainBeasDliFiltered.length > 0 && (
                                <optgroup label={`Unassigned Tickets (showing ${unassignedTrainBeasDliFiltered.length})`}>
                                  {unassignedTrainBeasDliFiltered.map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {makeTicketLabel(t)}
                                    </option>
                                  ))}
                                </optgroup>
                              )}

                             
                            </select>
                          </div>

                          <div className="sm:col-span-2 flex items-center justify-end">
                            <button type="button" className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={loadTrainTickets} disabled={loadingTickets}>
                              {loadingTickets ? "Refreshing..." : "Refresh Tickets"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="app-label">Notes</div>
              <textarea className="app-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button type="submit" disabled={saving} className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60">
                {saving ? "Saving..." : jathaDateIds.length > 1 ? "Save (All Selected Jatha Dates)" : "Save"}
              </button>
              <button type="button" onClick={resetForm} className="app-btn app-btn-secondary h-10 px-4">
                Clear
              </button>
            </div>
          </form>

          {/* ✅ Table Search/Filters */}
          <div className="mt-6 rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-8">
              <div className="lg:col-span-2">
                <div className="app-label">Search in table</div>
                <input className={inputCls()} value={tableQ} onChange={(e) => setTableQ(e.target.value)} placeholder="Type name / mobile / aadhaar / ticket / dept..." />
              </div>

              <div>
                <div className="app-label">Department</div>
                <select className={inputCls()} value={tableDept} onChange={(e) => setTableDept(e.target.value)}>
                  <option value="">All</option>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="app-label">Mode</div>
                <select className={inputCls()} value={tableMode} onChange={(e) => setTableMode(e.target.value as any)}>
                  <option value="">All</option>
                  <option value="Train">Train</option>
                  <option value="Special Train">Special Train</option>
                  <option value="Bus">Bus</option>
                  <option value="Self">Self</option>
                         
                         <option value="Bus (Delhi to Beas)">Bus (Delhi to Beas)</option>
                           <option value="Bus (Beas to Delhi)">Bus (Beas to Delhi)</option>
                  <option value="Travel Only (Bus- Both Sides)">Travel Only (Bus- Both Sides)</option>
                       <option value="Travel Only (Bus- Delhi to Beas)">Travel Only (Bus- Delhi to Beas)</option>
                       <option value="Travel Only (Bus- Beas to Delhi)">Travel Only (Bus- Beas to Delhi)</option>
                </select>
              </div>

              <div>
                <div className="app-label">Sangat</div>
                <select className={inputCls()} value={tableSangat} onChange={(e) => setTableSangat(e.target.value as any)}>
                  <option value="">All</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <div className="app-label">REQ D-B</div>
                <select className={inputCls()} value={tableReqDB} onChange={(e) => setTableReqDB(e.target.value as any)}>
                  <option value="">All</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <div className="app-label">REQ B-D</div>
                <select className={inputCls()} value={tableReqBD} onChange={(e) => setTableReqBD(e.target.value as any)}>
                  <option value="">All</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <div className="app-label">Jatha Date</div>
                <select className={inputCls()} value={tableJathaId} onChange={(e) => setTableJathaId(e.target.value)}>
                  <option value="">All</option>
                  {jathaDates.map((d) => {
                    const js = getJathaStart(d);
                    const je = getJathaEnd(d);
                    return (
                      <option key={d._id} value={d._id}>
                        {fmtRangeLabel(js, je)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="lg:col-span-2">
                <div className="app-label">Travel Start (From - To)</div>
                <div className="flex gap-2">
                  <input type="date" className={inputCls()} value={tableStartFrom} onChange={(e) => setTableStartFrom(e.target.value)} />
                  <input type="date" className={inputCls()} value={tableStartTo} onChange={(e) => setTableStartTo(e.target.value)} />
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="app-label">Travel End (From - To)</div>
                <div className="flex gap-2">
                  <input type="date" className={inputCls()} value={tableEndFrom} onChange={(e) => setTableEndFrom(e.target.value)} />
                  <input type="date" className={inputCls()} value={tableEndTo} onChange={(e) => setTableEndTo(e.target.value)} />
                </div>
              </div>

            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Showing <span className="font-semibold">{filteredItems.length}</span> of <span className="font-semibold">{items.length}</span>
              </div>

              
              <div className="flex flex-wrap items-center gap-2">
                {visibleCutoffISO && !showFullData ? (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    Showing upto: <span className="font-semibold">{visibleCutoffISO}</span>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="app-btn app-btn-secondary h-9 px-4 text-xs"
                  onClick={() => setShowFullData((v) => !v)}
                >
                  {showFullData ? "Show Current Months Only" : "Show Full Data"}
                </button>
              </div>


              <button
                type="button"
                className="app-btn app-btn-secondary h-9 px-4 text-xs"
                onClick={() => {
                  setTableQ("");
                  setTableDept("");
                  setTableMode("");
                  setTableSangat("");
                  setTableReqDB("");
                  setTableReqBD("");
                  setTableJathaId("");
                  setTableStartFrom("");
                  setTableStartTo("");
                  setTableEndFrom("");
                  setTableEndTo("");
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-shell mt-4">
            <table className="table">
              <thead className="thead">
                <tr>
                  {[
                    "S.No",
                    "Name",
                    "Department",
                    "Sangat",
                    "Father/Husband",
                    "Gender/Age",
                    "Address",
                    "Mobile",
                    "Badge",
                    "Mode",
                    "REQ D-B",
                    "REQ B-D",
                    "Ticket D-B",
                    "Ticket B-D",
                    "Fare",
                    "Paid",
                    "Payment Mode",
                    "Paid To",
                    "Bus Group",
                    "Pending",
                    "Jatha Date",
                    "Start",
                    "End",
                    "Notes",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {loading ? (
                  <tr>
                    <td className="td text-zinc-600 dark:text-zinc-400" colSpan={25}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td className="td text-zinc-600 dark:text-zinc-400" colSpan={25}>
                      No records found.
                    </td>
                  </tr>
                ) : (
                  viewItems.map((r, idx) => {
                    const fare = getFareForRow(r);
                    const paid = getPaidForRow(r);
                    const pending = getPendingForRow(r);

                    return (
                      <tr
                        key={r._id}
                        className={["row cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5", idx % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}
                        onClick={() => openEditRow(r)}
                      >
                        <td className="td">{idx + 1}</td>
                        <td className="td font-medium">{r.customerName || "-"}</td>
                        <td className="td">{r.department || "-"}</td>
                        <td className="td">{r.sangat || "-"}</td>
                        <td className="td">{r.fatherOrHusbandName || "-"}</td>
                        <td className="td">{`${r.gender || "-"} / ${r.age ?? "-"}`}</td>
                        <td className="td">{r.address || "-"}</td>
                        <td className="td">{r.mobile || "-"}</td>
                        <td className="td">{r.badgeNo || "-"}</td>

                        <td className="td">{r.mode || "-"}</td>
                        <td className="td">{r.bookingReqDelhiBeas || "-"}</td>
                        <td className="td">{r.bookingReqBeasDelhi || "-"}</td>

                        <td className="td whitespace-normal">{renderTicketValue(r.ticketDelhiBeas)}</td>
                        <td className="td whitespace-normal">{renderTicketValue(r.ticketBeasDelhi)}</td>

                        <td className="td">{fare === null ? "-" : fare}</td>
                        <td className="td">{paid === null ? "-" : paid}</td>
                        <td className="td">{r.paymentMode || "-"}</td>
                        <td className="td">{r.paidTo || "-"}</td>
                        <td className="td font-semibold text-amber-700 dark:text-amber-300">{r.busGroup || "-"}</td>
                        <td className="td font-semibold">{pending === null ? "-" : pending}</td>

                        <td className="td">{r.__groupLabel || formatJathaLabelFromRow(r)}</td>

                        <td className="td">{formatPrettyDate(r.travelStartDate)}</td>
                        <td className="td">{formatPrettyDate(r.travelEndDate)}</td>
                        <td className="td">{r.notes || "-"}</td>

                        <td className="td">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(r._id);
                              }}
                              className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Modal */}
          {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Edit (Parantha Nominal Roll)</h3>
                  <button
                    type="button"
                    onClick={() => { setEditing(null); setEditJathaDateIds([]); setEditJathaOpen(false); }}
                    className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 text-sm">
                  <div className="font-semibold">
                    {editing.customerName}{" "}
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      (Mobile: {editing.mobile || "-"} • Aadhaar: {editing.adhaarNumber || "-"} • Badge: {editing.badgeNo || "-"} • Dept: {editing.department || "-"})
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  Fare: <span className="font-semibold">{getFareForRow(editing) ?? "-"}</span> • Paid:{" "}
                  <span className="font-semibold">{getPaidForRow(editing) ?? "-"}</span> • Pending:{" "}
                  <span className="font-semibold">{getPendingForRow(editing) ?? "-"}</span>
                </div>

                <form onSubmit={onSaveEdit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="lg:col-span-3 sm:col-span-2" ref={editJathaRef}>
                    <div className="app-label">Jatha Date(s) *</div>
                    <button
                      type="button"
                      className={[inputCls(), "flex w-full items-center justify-between"].join(" ")}
                      onClick={() => setEditJathaOpen((v) => !v)}
                    >
                      <span>{selectedJathaLabel(editJathaDateIds)}</span>
                      <span>{editJathaOpen ? "▲" : "▼"}</span>
                    </button>

                    {editJathaOpen && (
                      <div className="mt-2 max-h-56 overflow-auto rounded-xl border border-black/5 bg-white p-2 dark:border-white/10 dark:bg-zinc-950">
                        {jathaDates.map((d) => {
                          const js = getJathaStart(d);
                          const je = getJathaEnd(d);
                          const checked = editJathaDateIds.includes(d._id);
                          return (
                            <label
                              key={d._id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-white/5"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const on = e.target.checked;
                                  setEditJathaDateIds((prev) => {
                                    const s = new Set(prev);
                                    if (on) s.add(d._id);
                                    else s.delete(d._id);
                                    return Array.from(s);
                                  });
                                }}
                              />
                              <span className="text-sm">{fmtRangeLabel(js, je)}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="app-label">Mode *</div>
                    <select className={inputCls()} value={String(editing.mode || "")} onChange={(e) => setEditing({ ...editing, mode: e.target.value as any })}>
                      <option value="">Select</option>
                      <option value="Train">Train</option>
                      <option value="Special Train">Special Train</option>
                      <option value="Bus">Bus</option>
                      <option value="Self">Self</option>
                             
                         <option value="Bus (Delhi to Beas)">Bus (Delhi to Beas)</option>
                           <option value="Bus (Beas to Delhi)">Bus (Beas to Delhi)</option>
                       <option value="Travel Only (Bus- Both Sides)">Travel Only (Bus- Both Sides)</option>
                       <option value="Travel Only (Bus- Delhi to Beas)">Travel Only (Bus- Delhi to Beas)</option>
                       <option value="Travel Only (Bus- Beas to Delhi)">Travel Only (Bus- Beas to Delhi)</option>
                    </select>
                  </div>

                  <div>
                    <div className="app-label">Department</div>
                    <input
                      className={inputCls()}
                      list="deptList"
                      value={String(editing.department || "")}
                      onChange={(e) => setEditing((prev) => (prev ? { ...prev, department: e.target.value } : prev))}
                      placeholder="Select or type department"
                    />
                  </div>

                  <div>
                    <div className="app-label">Sangat</div>
                    <select className={inputCls()} value={(editing.sangat as any) || ""} onChange={(e) => setEditing({ ...editing, sangat: e.target.value as any })}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <div className="app-label">Payment *</div>
                    <input className={inputCls()} value={editing.payment} onChange={(e) => setEditing({ ...editing, payment: e.target.value })} />
                  </div>

                  <div>
                    <div className="app-label">Payment Mode</div>
                    <select
                      className={inputCls()}
                      value={String(editing.paymentMode || "")}
                      onChange={(e) => setEditing({ ...editing, paymentMode: e.target.value })}
                    >
                      <option value="">Select</option>
                      {PAYMENT_MODE_OPTIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="app-label">Paid To</div>
                    <select
                      className={inputCls()}
                      value={String(editing.paidTo || "")}
                      onChange={(e) => setEditing({ ...editing, paidTo: e.target.value })}
                    >
                      <option value="">Select</option>
                      {PAID_TO_OPTIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="app-label">Bus Group / Friend Group</div>
                    <select
                      className={editing.busGroup ? busGroupSelectCls(String(editing.busGroup || "")) : inputCls()}
                      value={String(editing.busGroup || "")}
                      onChange={(e) => setEditing({ ...editing, busGroup: e.target.value })}
                    >
                      <option value="">No Group</option>
                      {busGroupOptions.map((g) => (
                        <option key={g} value={g}>
                          {busGroupOptionLabel(g)}
                        </option>
                      ))}
                    </select>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                        Used group = amber
                      </span>
                      <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                        New group = green
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                      Same group name means these people should be placed in one bus only. Used groups show count, and next 5 unused groups are shown automatically.
                    </div>
                  </div>

                  <div>
                    <div className="app-label">Start *</div>
                    <input type="date" className={inputCls()} value={editing.travelStartDate} onChange={(e) => setEditing({ ...editing, travelStartDate: e.target.value })} />
                  </div>

                  <div>
                    <div className="app-label">End *</div>
                    <input type="date" className={inputCls()} value={editing.travelEndDate} onChange={(e) => setEditing({ ...editing, travelEndDate: e.target.value })} />
                  </div>

                  {/* ✅ if mode != Train, hide booking + tickets blocks */}
                  {showBookingAndTicketsEdit && (
                    <>
                      <div>
                        <div className="app-label">REQ (Delhi–Beas) *</div>
                        <select className={inputCls()} value={editing.bookingReqDelhiBeas} onChange={(e) => setEditing({ ...editing, bookingReqDelhiBeas: e.target.value as any })}>
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div>
                        <div className="app-label">REQ (Beas–Delhi) *</div>
                        <select className={inputCls()} value={editing.bookingReqBeasDelhi} onChange={(e) => setEditing({ ...editing, bookingReqBeasDelhi: e.target.value as any })}>
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div className="lg:col-span-3 sm:col-span-2">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {/* Edit Delhi–Beas */}
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="app-label">Ticket (Delhi–Beas) (Optional)</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                  onClick={() => {
                                    const id = findSmartTicketId({
                                      list: editTrainDliBeasFiltered as any,
                                      searchText: editTicketSearchDB,
                                      travelStartDate: editing.travelStartDate,
                                      travelEndDate: editing.travelEndDate,
                                      customerName: editing.customerName || "",
                                      expectedRoute: "DLI-BEAS",
                                    });
                                    if (!id) return alert("No good selectable Delhi–Beas match found. Try Seat/PNR/Train/Date/New Delhi/Old Delhi in the search box.");
                                    setEditing({ ...editing, ticketDelhiBeas: id });
                                  }}
                                  disabled={!allowEditDelhiBeasTicket || loadingTickets}
                                  title="Smart quick assign: prefers same Start Date, same Name, and boarding station tokens"
                                >
                                  Quick Assign
                                </button>

                                <button
                                  type="button"
                                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                  onClick={() => setEditTicketSearchDB("")}
                                  disabled={!editTicketSearchDB}
                                >
                                  Clear Search
                                </button>
                              </div>
                            </div>

                            <input
                              className={inputCls()}
                              value={editTicketSearchDB}
                              onChange={(e) => setEditTicketSearchDB(e.target.value)}
                              placeholder="Search by seat / PNR / train / date / New Delhi / Old Delhi..."
                              disabled={!allowEditDelhiBeasTicket || loadingTickets}
                            />

                            <select
                              className={inputCls()}
                              value={String(editing.ticketDelhiBeas || "")}
                              onChange={(e) => setEditing({ ...editing, ticketDelhiBeas: e.target.value })}
                              disabled={!allowEditDelhiBeasTicket || loadingTickets}
                            >
                              <option value="">
                                {editing.bookingReqDelhiBeas !== "Yes" ? "Booking = No" : loadingTickets ? "Loading..." : "Select ticket (or leave empty)"}
                              </option>
                              {allowEditDelhiBeasTicket &&
                                editTrainDliBeasFiltered.map((t: any) => (
                                  <option key={t._id} value={t._id} disabled={!!t.__disabled}>
                                    {makeTicketLabel(t)}
                                    {t.__disabled ? ` • Assigned to: ${ticketAssignedToNameMap.get(t._id) || "Someone"}` : ""}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* Edit Beas–Delhi */}
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="app-label">Ticket (Beas–Delhi) (Optional)</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                  onClick={() => {
                                    const id = findSmartTicketId({
                                      list: editTrainBeasDliFiltered as any,
                                      searchText: editTicketSearchBD,
                                      travelStartDate: editing.travelEndDate,
                                      travelEndDate: editing.travelEndDate,
                                      customerName: editing.customerName || "",
                                      expectedRoute: "BEAS-DLI",
                                    });
                                    if (!id) return alert("No good selectable Beas–Delhi match found. Try Seat/PNR/Train/Date/New Delhi/Old Delhi in the search box.");
                                    setEditing({ ...editing, ticketBeasDelhi: id });
                                  }}
                                  disabled={!allowEditBeasDelhiTicket || loadingTickets}
                                  title="Smart quick assign: prefers same Start Date, same Name, and boarding station tokens"
                                >
                                  Quick Assign
                                </button>

                                <button
                                  type="button"
                                  className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                  onClick={() => setEditTicketSearchBD("")}
                                  disabled={!editTicketSearchBD}
                                >
                                  Clear Search
                                </button>
                              </div>
                            </div>

                            <input
                              className={inputCls()}
                              value={editTicketSearchBD}
                              onChange={(e) => setEditTicketSearchBD(e.target.value)}
                              placeholder="Search by seat / PNR / train / date / New Delhi / Old Delhi..."
                              disabled={!allowEditBeasDelhiTicket || loadingTickets}
                            />

                            <select
                              className={inputCls()}
                              value={String(editing.ticketBeasDelhi || "")}
                              onChange={(e) => setEditing({ ...editing, ticketBeasDelhi: e.target.value })}
                              disabled={!allowEditBeasDelhiTicket || loadingTickets}
                            >
                              <option value="">
                                {editing.bookingReqBeasDelhi !== "Yes" ? "Booking = No" : loadingTickets ? "Loading..." : "Select ticket (or leave empty)"}
                              </option>
                              {allowEditBeasDelhiTicket &&
                                editTrainBeasDliFiltered.map((t: any) => (
                                  <option key={t._id} value={t._id} disabled={!!t.__disabled}>
                                    {makeTicketLabel(t)}
                                    {t.__disabled ? ` • Assigned to: ${ticketAssignedToNameMap.get(t._id) || "Someone"}` : ""}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2 flex items-center justify-end">
                            <button type="button" className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={loadTrainTickets} disabled={loadingTickets}>
                              {loadingTickets ? "Refreshing..." : "Refresh Tickets"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2 lg:col-span-3">
                    <div className="app-label">Notes</div>
                    <textarea className="app-textarea" rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                  </div>

                  <div className="sm:col-span-2 lg:col-span-3 mt-2 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => { setEditing(null); setEditJathaDateIds([]); setEditJathaOpen(false); }} className="app-btn app-btn-secondary h-10 px-4">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving} className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60">
                      {saving ? "Saving..." : editJathaDateIds.length > 1 ? "Save All Selected" : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

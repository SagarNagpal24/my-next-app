"use client";

import React from "react";

type YesNo = "Yes" | "No" | "";
type Mode = "Train" | "Bus" | "Self" | "";

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
  "Sangat",
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

  // ✅ Sangat
  sangat?: YesNo;

  mode: Mode | string;

  bookingReqDelhiBeas: YesNo;
  bookingReqBeasDelhi: YesNo;

  ticketDelhiBeas: string;
  ticketBeasDelhi: string;

  payment: string;

  jathaDateId: string;
  jathaDate: string; // we store START date as string (YYYY-MM-DD)

  travelStartDate: string; // YYYY-MM-DD
  travelEndDate: string; // YYYY-MM-DD
  notes: string;

  createdAt?: string;
  updatedAt?: string;
};

function normalizeId(x: any) {
  return (typeof x?._id === "string" ? x._id : x?._id?.toString?.() || String(x?._id)).trim();
}

function inputCls() {
  return "app-input app-input-sm";
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

function fmtRangeLabel(startYMD: string, endYMD: string) {
  const start = iso10(startYMD);
  const end = iso10(endYMD);

  if (!start && !end) return "";
  if (start && !end) return start;
  if (!start && end) return end;

  // e.g. "2 Feb - 9 Feb 2026"
  const ds = new Date(start + "T00:00:00");
  const de = new Date(end + "T00:00:00");
  const sDay = ds.getDate();
  const eDay = de.getDate();
  const sMon = ds.toLocaleString("en-IN", { month: "short" });
  const eMon = de.toLocaleString("en-IN", { month: "short" });
  const eYr = de.getFullYear();

  // If same month/year: "2 - 9 Feb 2026"
  if (ds.getFullYear() === de.getFullYear() && ds.getMonth() === de.getMonth()) {
    return `${sDay} - ${eDay} ${eMon} ${eYr}`;
  }

  // Otherwise: "2 Feb - 9 Mar 2026"
  return `${sDay} ${sMon} - ${eDay} ${eMon} ${eYr}`;
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

export default function LadooNominalRollPage() {
  const [tab, setTab] = React.useState<"ladoo" | "unassigned">("ladoo");

  // ✅ Department filter for search suggestions
  const [deptFilter, setDeptFilter] = React.useState<string>("");

  // customer search
  const [search, setSearch] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<Customer[]>([]);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchTimerRef = React.useRef<any>(null);

  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  // jatha dates dropdown (Ladoo)
  const [jathaDates, setJathaDates] = React.useState<JathaDate[]>([]);
  const [loadingJatha, setLoadingJatha] = React.useState(true);

  // train tickets
  const [allTickets, setAllTickets] = React.useState<TrainTicketRow[]>([]);
  const [trainDliBeas, setTrainDliBeas] = React.useState<TrainTicketRow[]>([]);
  const [trainBeasDli, setTrainBeasDli] = React.useState<TrainTicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = React.useState(true);

  // create form
  const [mode, setMode] = React.useState<Mode>("");
  const [department, setDepartment] = React.useState("");
  const [sangat, setSangat] = React.useState<YesNo>("");

  // ✅ MULTI JATHA SAVE
  const [multiJatha, setMultiJatha] = React.useState(false);
  const [jathaDateIds, setJathaDateIds] = React.useState<string[]>([]); // ✅ multi selected ids

  const [bookingDelhiBeas, setBookingDelhiBeas] = React.useState<YesNo>("");
  const [bookingBeasDelhi, setBookingBeasDelhi] = React.useState<YesNo>("");

  const [ticketDelhiBeas, setTicketDelhiBeas] = React.useState("");
  const [ticketBeasDelhi, setTicketBeasDelhi] = React.useState("");

  const [payment, setPayment] = React.useState("");
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

  // ✅ Table filter/search states
  const [tableQ, setTableQ] = React.useState("");
  const [tableDept, setTableDept] = React.useState<string>("");
  const [tableMode, setTableMode] = React.useState<Mode | "">("");
  const [tableSangat, setTableSangat] = React.useState<YesNo>("");
  const [tableReqDB, setTableReqDB] = React.useState<YesNo>("");
  const [tableReqBD, setTableReqBD] = React.useState<YesNo>("");

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
    if (tab !== "ladoo") setEditing(null);
  }, [tab]);

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
      const res = await fetch("/api/jatha-date?category=Ladoo", { cache: "no-store" });
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
      const res = await fetch("/api/nominal-roll/ladoo", { cache: "no-store" });
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

    setMultiJatha(false);
    setJathaDateIds([]);

    setBookingDelhiBeas("");
    setBookingBeasDelhi("");

    setTicketDelhiBeas("");
    setTicketBeasDelhi("");

    setPayment("");
    setTravelStartDate("");
    setTravelEndDate("");
    setNotes("");

    setStartTouched(false);
    setEndTouched(false);
  }

  function validateCreate(selectedIds: string[]) {
    if (!selectedCustomer?._id) return "Please search and select a customer first.";
    if (!selectedIds.length) return "Jatha date is required (select at least 1).";
    if (!mode) return "Mode is required.";

    // ⚠️ Multi save + Train tickets can conflict with unique ticket constraints
    if (selectedIds.length > 1 && mode === "Train") {
      const anyTicket = !!String(ticketDelhiBeas || "").trim() || !!String(ticketBeasDelhi || "").trim();
      const anyBookingYes = bookingDelhiBeas === "Yes" || bookingBeasDelhi === "Yes";
      if (anyBookingYes || anyTicket) {
        return "For multiple Jatha dates at once, Train ticket assignment is not allowed (tickets are unique). Please use single Jatha date for Train bookings, or choose Bus/Self, or set both bookings = No and keep tickets empty.";
      }
    }

    if (mode === "Train") {
      if (!bookingDelhiBeas) return "Booking REQ (Delhi–Beas) is required.";
      if (!bookingBeasDelhi) return "Booking REQ (Beas–Delhi) is required.";

      if (bookingDelhiBeas === "Yes" && !ticketDelhiBeas) return "Select Ticket (Delhi–Beas) because booking is Yes.";
      if (bookingBeasDelhi === "Yes" && !ticketBeasDelhi) return "Select Ticket (Beas–Delhi) because booking is Yes.";
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

    // ✅ end > start check with ignore option
    const okDates = confirmIfEndBeforeStart(travelStartDate, travelEndDate);
    if (!okDates) return;

    // ✅ mismatch check (Delhi–Beas only)
    const okMismatch = confirmIfDelhiBeasDateMismatch({
      travelStartDate,
      ticketId: ticketDelhiBeas,
      allow: mode === "Train" && bookingDelhiBeas === "Yes",
    });
    if (!okMismatch) return;

    setSaving(true);
    try {
      // ✅ create in all selected jatha dates (1..N)
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

          ticketDelhiBeas: mode === "Train" && bookingDelhiBeas === "Yes" ? ticketDelhiBeas : "",
          ticketBeasDelhi: mode === "Train" && bookingBeasDelhi === "Yes" ? ticketBeasDelhi : "",

          payment: payment.trim(),

          jathaDateId: oneId,
          jathaDate: jStart || "",

          travelStartDate,
          travelEndDate,
          notes: notes.trim(),
        };

        const res = await fetch("/api/nominal-roll/ladoo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          // if multi-save, stop at first failure and show which jatha failed
          const label = jathaLabelById.get(oneId) || jStart || oneId;
          alert(`Create failed for Jatha (${label}) [${res.status}]. ${data?.error || "Error"}`);
          return;
        }
      }

      resetForm();
      await loadNominal();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    const realId = encodeURIComponent(String(id).trim());
    if (!confirm("Delete this record?")) return;

    const res = await fetch(`/api/nominal-roll/ladoo/${realId}`, { method: "DELETE" });
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

    if (!editing.jathaDateId) return alert("Jatha date is required.");
    if (!editing.mode) return alert("Mode is required.");

    if (String(editing.mode) === "Train") {
      if (!editing.bookingReqDelhiBeas) return alert("Booking REQ (Delhi–Beas) is required.");
      if (!editing.bookingReqBeasDelhi) return alert("Booking REQ (Beas–Delhi) is required.");

      if (editing.bookingReqDelhiBeas === "Yes" && !String(editing.ticketDelhiBeas || "").trim())
        return alert("Select Ticket (Delhi–Beas) because booking is Yes.");
      if (editing.bookingReqBeasDelhi === "Yes" && !String(editing.ticketBeasDelhi || "").trim())
        return alert("Select Ticket (Beas–Delhi) because booking is Yes.");
    }

    if (!editing.payment.trim()) return alert("Payment is required.");
    if (!editing.travelStartDate) return alert("Travel start date is required.");
    if (!editing.travelEndDate) return alert("Travel end date is required.");

    const okDates = confirmIfEndBeforeStart(editing.travelStartDate, editing.travelEndDate);
    if (!okDates) return;

    const okMismatch = confirmIfDelhiBeasDateMismatch({
      travelStartDate: editing.travelStartDate,
      ticketId: String(editing.ticketDelhiBeas || ""),
      allow: String(editing.mode) === "Train" && editing.bookingReqDelhiBeas === "Yes",
    });
    if (!okMismatch) return;

    const realId = encodeURIComponent(String(editing._id).trim());
    const jd = jathaDates.find((x) => x._id === editing.jathaDateId);
    const jStart = jd ? getJathaStart(jd) : "";

    setSaving(true);
    try {
      const res = await fetch(`/api/nominal-roll/ladoo/${realId}`, {
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

          jathaDateId: editing.jathaDateId,
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

      setEditing(null);
      await loadNominal();
    } finally {
      setSaving(false);
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

      if (!q) return true;

      const hay = [
        r.customerName,
        r.mobile,
        r.adhaarNumber,
        r.badgeNo,
        r.department,
        r.sangat,
        r.mode,
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
  }, [items, tableQ, tableDept, tableMode, tableSangat, tableReqDB, tableReqBD, ticketLabelMap, jathaLabelById]);

  return (
    <div>
      <datalist id="deptList">
        {DEPARTMENT_OPTIONS.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <h2 className="text-lg font-semibold">Ladoo</h2>
      <p className="app-subtitle mt-1">Search customer → select → fill details → save.</p>

      {/* Tabs */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={["app-btn h-9 px-4", tab === "ladoo" ? "app-btn-primary" : "app-btn-secondary"].join(" ")}
          onClick={() => setTab("ladoo")}
        >
          Ladoo
        </button>
        <button
          type="button"
          className={["app-btn h-9 px-4", tab === "unassigned" ? "app-btn-primary" : "app-btn-secondary"].join(" ")}
          onClick={() => setTab("unassigned")}
        >
          Unassigned Tickets
        </button>
      </div>

      {/* Unassigned tab */}
      {tab === "unassigned" && (
        <div className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-lg font-semibold">Unassigned Tickets</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Tickets not assigned to any nominal roll entry.</div>
            </div>

            <button
              type="button"
              className="app-btn app-btn-secondary h-9 px-3 text-xs"
              onClick={loadTrainTickets}
              disabled={loadingTickets}
            >
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

      {/* Ladoo tab */}
      {tab === "ladoo" && (
        <>
          <form onSubmit={onCreate} className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
            {/* ✅ Professional layout: single responsive grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left: Search + Dept filter + Selected */}
              <div className="lg:col-span-5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="app-label">Search Customer (Name / Mobile / Aadhaar)</div>
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
                        <div className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                          {searching ? "Searching..." : "No matches."}
                        </div>
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
                              Mobile: {c.mobile || "-"} • Aadhaar: {c.adhaarNumber || "-"} • Badge: {c.badgeNo || "-"} • Dept:{" "}
                              {c.department || "-"}
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
                  </div>
                </div>
              </div>

              {/* Right: Main controls */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {/* ✅ Multi-jatha toggle */}
                  <div className="lg:col-span-3 sm:col-span-2">
                    <div className="flex items-center justify-between rounded-xl border border-black/5 bg-zinc-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-black/30">
                      <div>
                        <div className="font-semibold">Save for multiple Jatha dates</div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">Select 1..N dates and save in one click.</div>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={multiJatha}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setMultiJatha(v);
                            setJathaDateIds([]);
                            setStartTouched(false);
                            setEndTouched(false);
                          }}
                        />
                        <span className="text-sm font-semibold">Multi</span>
                      </label>
                    </div>
                  </div>

                  {/* ✅ Jatha date selection */}
                  {!multiJatha ? (
                    <div>
                      <div className="app-label">Jatha Date (Ladoo) *</div>
                      <select
                        className={inputCls()}
                        value={jathaDateIds[0] || ""}
                        onChange={(e) => {
                          setJathaDateIds(e.target.value ? [e.target.value] : []);
                          setStartTouched(false);
                          setEndTouched(false);
                        }}
                        disabled={loadingJatha}
                      >
                        <option value="">{loadingJatha ? "Loading..." : "Select date range"}</option>
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
                  ) : (
                    <div className="lg:col-span-3 sm:col-span-2">
                      <div className="app-label">Jatha Dates (Multi-select) *</div>
                      <div className="max-h-44 overflow-auto rounded-xl border border-black/5 bg-white p-2 dark:border-white/10 dark:bg-zinc-950">
                        {loadingJatha ? (
                          <div className="px-2 py-2 text-sm text-zinc-600 dark:text-zinc-400">Loading...</div>
                        ) : jathaDates.length === 0 ? (
                          <div className="px-2 py-2 text-sm text-zinc-600 dark:text-zinc-400">No Jatha dates found.</div>
                        ) : (
                          jathaDates.map((d) => {
                            const js = getJathaStart(d);
                            const je = getJathaEnd(d);
                            const label = fmtRangeLabel(js, je);
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
                                <span className="text-sm">{label}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        Selected: <span className="font-semibold">{jathaDateIds.length}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="app-label">Mode *</div>
                    <select className={inputCls()} value={mode} onChange={(e) => setMode(e.target.value as any)}>
                      <option value="">Select</option>
                      <option value="Train">Train</option>
                      <option value="Bus">Bus</option>
                      <option value="Self">Self</option>
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

                  {/* ✅ Start/End dates aligned with others */}
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
                          <div>
                            <div className="app-label">Ticket (Delhi–Beas)</div>
                            <select
                              className={inputCls()}
                              value={ticketDelhiBeas}
                              onChange={(e) => setTicketDelhiBeas(e.target.value)}
                              disabled={!allowDelhiBeasTicket || loadingTickets}
                            >
                              <option value="">
                                {bookingDelhiBeas !== "Yes" ? "Booking = No" : loadingTickets ? "Loading..." : "Select ticket"}
                              </option>

                              {allowDelhiBeasTicket && unassignedTrainDliBeas.length > 0 && (
                                <optgroup label="Unassigned Tickets">
                                  {unassignedTrainDliBeas.map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {makeTicketLabel(t)}
                                    </option>
                                  ))}
                                </optgroup>
                              )}

                              {allowDelhiBeasTicket && assignedTrainDliBeas.length > 0 && (
                                <optgroup label="Assigned Tickets (Not Selectable)">
                                  {assignedTrainDliBeas.map((t) => (
                                    <option key={t._id} value={t._id} disabled>
                                      {makeTicketLabel(t)} • Assigned to: {ticketAssignedToNameMap.get(t._id) || "Someone"}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>

                          <div>
                            <div className="app-label">Ticket (Beas–Delhi)</div>
                            <select
                              className={inputCls()}
                              value={ticketBeasDelhi}
                              onChange={(e) => setTicketBeasDelhi(e.target.value)}
                              disabled={!allowBeasDelhiTicket || loadingTickets}
                            >
                              <option value="">
                                {bookingBeasDelhi !== "Yes" ? "Booking = No" : loadingTickets ? "Loading..." : "Select ticket"}
                              </option>

                              {allowBeasDelhiTicket && unassignedTrainBeasDli.length > 0 && (
                                <optgroup label="Unassigned Tickets">
                                  {unassignedTrainBeasDli.map((t) => (
                                    <option key={t._id} value={t._id}>
                                      {makeTicketLabel(t)}
                                    </option>
                                  ))}
                                </optgroup>
                              )}

                              {allowBeasDelhiTicket && assignedTrainBeasDli.length > 0 && (
                                <optgroup label="Assigned Tickets (Not Selectable)">
                                  {assignedTrainBeasDli.map((t) => (
                                    <option key={t._id} value={t._id} disabled>
                                      {makeTicketLabel(t)} • Assigned to: {ticketAssignedToNameMap.get(t._id) || "Someone"}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>

                          <div className="sm:col-span-2 flex items-center justify-end">
                            <button
                              type="button"
                              className="app-btn app-btn-secondary h-9 px-3 text-xs"
                              onClick={loadTrainTickets}
                              disabled={loadingTickets}
                            >
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
                {saving ? "Saving..." : multiJatha ? "Save (All Selected Jatha Dates)" : "Save"}
              </button>
              <button type="button" onClick={resetForm} className="app-btn app-btn-secondary h-10 px-4">
                Clear
              </button>
            </div>
          </form>

          {/* ✅ Table Search/Filters */}
          <div className="mt-6 rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <div className="app-label">Search in table</div>
                <input
                  className={inputCls()}
                  value={tableQ}
                  onChange={(e) => setTableQ(e.target.value)}
                  placeholder="Type name / mobile / aadhaar / ticket / dept..."
                />
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
                  <option value="Bus">Bus</option>
                  <option value="Self">Self</option>
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
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Showing <span className="font-semibold">{filteredItems.length}</span> of <span className="font-semibold">{items.length}</span>
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
                    <td className="td text-zinc-600 dark:text-zinc-400" colSpan={22}>
                      Loading...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td className="td text-zinc-600 dark:text-zinc-400" colSpan={22}>
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((r, idx) => {
                    const fare = getFareForRow(r);
                    const paid = getPaidForRow(r);
                    const pending = getPendingForRow(r);

                    return (
                      <tr key={r._id} className={["row", idx % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
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
                        <td className="td font-semibold">{pending === null ? "-" : pending}</td>

                        {/* ✅ show same label as dropdown */}
                        <td className="td">{formatJathaLabelFromRow(r)}</td>

                        <td className="td">{r.travelStartDate || "-"}</td>
                        <td className="td">{r.travelEndDate || "-"}</td>
                        <td className="td">{r.notes || "-"}</td>

                        <td className="td">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="app-btn app-btn-secondary h-9 px-3 text-xs"
                              onClick={() =>
                                setEditing({
                                  ...r,
                                  travelStartDate: iso10(r.travelStartDate),
                                  travelEndDate: iso10(r.travelEndDate),
                                  department: String(r.department || "").trim(),
                                  sangat: (String(r.sangat || "").trim() as any) || "",
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(r._id)}
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
              <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Edit (Ladoo Nominal Roll)</h3>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-2 text-sm">
                  <div className="font-semibold">
                    {editing.customerName}{" "}
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      (Mobile: {editing.mobile || "-"} • Aadhaar: {editing.adhaarNumber || "-"} • Badge: {editing.badgeNo || "-"})
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  Fare: <span className="font-semibold">{getFareForRow(editing) ?? "-"}</span> • Paid:{" "}
                  <span className="font-semibold">{getPaidForRow(editing) ?? "-"}</span> • Pending:{" "}
                  <span className="font-semibold">{getPendingForRow(editing) ?? "-"}</span>
                </div>

                <form onSubmit={onSaveEdit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <div className="app-label">Jatha Date *</div>
                    <select className={inputCls()} value={editing.jathaDateId} onChange={(e) => setEditing({ ...editing, jathaDateId: e.target.value })}>
                      <option value="">Select date range</option>
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

                  <div>
                    <div className="app-label">Mode *</div>
                    <select className={inputCls()} value={String(editing.mode || "")} onChange={(e) => setEditing({ ...editing, mode: e.target.value as any })}>
                      <option value="">Select</option>
                      <option value="Train">Train</option>
                      <option value="Bus">Bus</option>
                      <option value="Self">Self</option>
                    </select>
                  </div>

                  <div>
                    <div className="app-label">Department</div>
                    <input
                      className={inputCls()}
                      list="deptList"
                      value={String(editing.department || "")}
                      onChange={(e) => setEditing({ ...editing, department: e.target.value })}
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
                          <div>
                            <div className="app-label">Ticket (Delhi–Beas)</div>
                            <select
                              className={inputCls()}
                              value={String(editing.ticketDelhiBeas || "")}
                              onChange={(e) => setEditing({ ...editing, ticketDelhiBeas: e.target.value })}
                              disabled={!allowEditDelhiBeasTicket || loadingTickets}
                            >
                              <option value="">
                                {editing.bookingReqDelhiBeas !== "Yes" ? "Booking = No" : loadingTickets ? "Loading..." : "Select ticket"}
                              </option>
                              {allowEditDelhiBeasTicket &&
                                editTrainDliBeas.map((t: any) => (
                                  <option key={t._id} value={t._id} disabled={!!t.__disabled}>
                                    {makeTicketLabel(t)}
                                    {t.__disabled ? ` • Assigned to: ${ticketAssignedToNameMap.get(t._id) || "Someone"}` : ""}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div>
                            <div className="app-label">Ticket (Beas–Delhi)</div>
                            <select
                              className={inputCls()}
                              value={String(editing.ticketBeasDelhi || "")}
                              onChange={(e) => setEditing({ ...editing, ticketBeasDelhi: e.target.value })}
                              disabled={!allowEditBeasDelhiTicket || loadingTickets}
                            >
                              <option value="">
                                {editing.bookingReqBeasDelhi !== "Yes" ? "Booking = No" : loadingTickets ? "Loading..." : "Select ticket"}
                              </option>
                              {allowEditBeasDelhiTicket &&
                                editTrainBeasDli.map((t: any) => (
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
                    <button type="button" onClick={() => setEditing(null)} className="app-btn app-btn-secondary h-10 px-4">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving} className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60">
                      {saving ? "Saving..." : "Save Changes"}
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

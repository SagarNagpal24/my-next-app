"use client";

import React from "react";
import * as XLSX from "xlsx";

type CallingCategory = "ladoo" | "parantha" | "bhati";
type YesNo = "" | "Yes" | "No";
type FrequencyFilter = "" | "new" | "repeat" | "frequent" | "very-frequent";
type FrequencySort = "" | "highest" | "lowest";

type JathaDate = {
  _id: string;
  category?: string;
  jathaStartDate?: string;
  jathaEndDate?: string;
  travelDate?: string;
  notes?: string;
};

type ReportRow = {
  _id: string;

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
  department?: string;
  sangat?: YesNo;

  bookingReqDelhiBeas?: string;
  bookingReqBeasDelhi?: string;

  ticketDelhiBeas?: any;
  ticketBeasDelhi?: any;

  payment?: string;

  jathaDateId?: string;
  jathaDate?: string;

  travelStartDate?: string;
  travelEndDate?: string;

  notes?: string;

  createdAt?: string;
  updatedAt?: string;

  confirm?: YesNo;
  ferry?: YesNo;
  remarks?: string;
};

type CallingRow = ReportRow & {
  sourceType: CallingCategory;
  sourceLabel: "Ladoo" | "Parantha" | "Bhati";
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

type TravellerSummary = {
  travellerKey: string;
  ladooCount: number;
  paranthaCount: number;
  bhatiCount: number;
  totalCount: number;
  firstTravelDate: string;
  lastTravelDate: string;
  recentDates: string[];
};

function inputCls() {
  return "app-input app-input-sm";
}

function extractId(x: any): string {
  if (!x) return "";

  if (typeof x === "string") {
    const s = x.trim();
    const m = s.match(/[a-fA-F0-9]{24}/);
    return m ? m[0] : s;
  }

  if (typeof x === "number") return String(x).trim();
  if (typeof x === "object" && x.$oid) return String(x.$oid).trim();

  if (typeof x === "object") {
    if (x._id !== undefined) return extractId(x._id);
    if (x.id !== undefined) return extractId(x.id);
    if (x.value !== undefined) return extractId(x.value);
    if (x.oid !== undefined) return extractId(x.oid);
    if (x.$id !== undefined) return extractId(x.$id);
    if (x.ticketId !== undefined) return extractId(x.ticketId);
    if (x.ticket_id !== undefined) return extractId(x.ticket_id);
  }

  try {
    const raw = typeof x === "string" ? x : JSON.stringify(x);
    const m = String(raw || "").match(/[a-fA-F0-9]{24}/);
    if (m) return m[0];
  } catch {}

  return String(x).trim();
}

function normalizeTicketId(v: any): string {
  return extractId(v);
}

function toYMD(v: any) {
  return String(v || "").slice(0, 10);
}

function formatDDMonYYYY(v: any) {
  const s = String(v || "").slice(0, 10);
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const dd = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-GB", { month: "short" });
  const yyyy = d.getFullYear();
  return `${dd}-${mon}-${yyyy}`;
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function paymentToNumber(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const m = s.replaceAll(",", "").match(/-?\d+(\.\d+)?/);
  if (!m) return 0;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : 0;
}

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

function getItemsFromResponse(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.tickets)) return data.tickets;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

function normalizeText(v: any) {
  return String(v || "").trim().toLowerCase();
}

function sortUniqueDates(dates: string[]) {
  return Array.from(new Set(dates.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function getTravellerTag(totalCount: number) {
  if (totalCount >= 7) return "Very Frequent";
  if (totalCount >= 4) return "Frequent";
  if (totalCount >= 2) return "Repeat";
  return "New";
}

function frequencyBadgeCls(totalCount: number) {
  if (totalCount >= 7) {
    return "inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300";
  }
  if (totalCount >= 4) {
    return "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300";
  }
  if (totalCount >= 2) {
    return "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300";
  }
  return "inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300";
}

export default function CallingPage() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<CallingRow[]>([]);
  const [allJathaDates, setAllJathaDates] = React.useState<JathaDate[]>([]);
  const [allTickets, setAllTickets] = React.useState<TrainTicketRow[]>([]);

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"" | CallingCategory>("");
  const [jathaDateFilter, setJathaDateFilter] = React.useState("");
  const [confirmFilter, setConfirmFilter] = React.useState<YesNo>("");
  const [ferryFilter, setFerryFilter] = React.useState<YesNo>("");
  const [frequencyFilter, setFrequencyFilter] = React.useState<FrequencyFilter>("");
  const [frequencySort, setFrequencySort] = React.useState<FrequencySort>("");

  const [draftMap, setDraftMap] = React.useState<Record<string, CallingRow>>({});
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [savingKeys, setSavingKeys] = React.useState<string[]>([]);

  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsRowKey, setDetailsRowKey] = React.useState("");

  function rowKey(row: CallingRow) {
    return `${row.sourceType}_${row._id}`;
  }

  function stopRowClick(
    e: React.MouseEvent<
      HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLTextAreaElement
    >
  ) {
    e.stopPropagation();
  }

  function getBaseRowByKey(key: string): CallingRow | undefined {
    return rows.find((r) => rowKey(r) === key);
  }

  async function loadCategory(category: CallingCategory): Promise<CallingRow[]> {
    const params = new URLSearchParams();
    params.set("category", category);
    params.set("limit", "10000");

    const res = await fetch(`/api/reports/nominal-roll?${params.toString()}`, {
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    const items = getItemsFromResponse(data) as ReportRow[];

    return (items || []).map((r: any) => ({
      ...r,
      _id: String(r._id || ""),
      sourceType: category,
      sourceLabel:
        category === "ladoo"
          ? "Ladoo"
          : category === "parantha"
          ? "Parantha"
          : "Bhati",
      confirm: r.confirm === "Yes" || r.confirm === "No" ? r.confirm : "",
      ferry: r.ferry === "Yes" || r.ferry === "No" ? r.ferry : "",
      remarks: String(r.remarks || ""),
    }));
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [ladoo, parantha, bhati] = await Promise.all([
        loadCategory("ladoo"),
        loadCategory("parantha"),
        loadCategory("bhati"),
      ]);

      const merged = [...ladoo, ...parantha, ...bhati];

      merged.sort((a, b) => {
        const aj = String(a.jathaDateId || a.jathaDate || "");
        const bj = String(b.jathaDateId || b.jathaDate || "");
        if (aj !== bj) return aj.localeCompare(bj);

        const at = String(a.sourceLabel || "");
        const bt = String(b.sourceLabel || "");
        if (at !== bt) return at.localeCompare(bt);

        return String(a.customerName || "").localeCompare(String(b.customerName || ""));
      });

      setRows(merged);
      setDraftMap({});
      setSelectedKeys([]);
      setDetailsOpen(false);
      setDetailsRowKey("");
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadJathaDates() {
    try {
      const endpoints = ["/api/jatha-date", "/api/jatha-dates"];

      let all: any[] = [];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) continue;
          const data = await res.json().catch(() => ({}));
          const arr = getItemsFromResponse(data);
          if (arr.length) {
            all = arr;
            break;
          }
        } catch {}
      }

      const normalized: JathaDate[] = all.map((j: any) => {
        const id = extractId(j);
        const start = String(
          j.jathaStartDate || j.startDate || j.travelDate || j.date || ""
        ).slice(0, 10);
        const end =
          String(j.jathaEndDate || j.endDate || j.travelDate || j.date || "").slice(0, 10) ||
          start;

        return {
          _id: id || String(j._id || ""),
          category: String(j.category || "").trim().toLowerCase(),
          jathaStartDate: start,
          jathaEndDate: end,
          travelDate: String(j.travelDate || "").slice(0, 10),
          notes: j.notes,
        };
      });

      setAllJathaDates(normalized);
    } catch (e) {
      console.error("Failed to load jatha dates", e);
      setAllJathaDates([]);
    }
  }

  async function loadTrainTickets() {
    try {
      const endpoints = [
        "/api/train-data?limit=10000",
        "/api/train-data?limit=20000",
        "/api/train-data",
        "/api/train-data?all=1",
        `/api/train-data?route=${encodeURIComponent("DLI-BEAS")}&limit=10000`,
        `/api/train-data?route=${encodeURIComponent("BEAS-DLI")}&limit=10000`,
      ];

      async function fetchOne(url: string): Promise<any[]> {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return [];
          const data = await res.json().catch(() => ({}));
          return getItemsFromResponse(data);
        } catch {
          return [];
        }
      }

      let rawItems: any[] = [];
      for (const url of endpoints) {
        const arr = await fetchOne(url);
        if (arr.length > 0) {
          rawItems = arr;
          break;
        }
      }

      if (rawItems.length === 0) {
        const [a, b] = await Promise.all([
          fetchOne(`/api/train-data?route=${encodeURIComponent("DLI-BEAS")}&limit=10000`),
          fetchOne(`/api/train-data?route=${encodeURIComponent("BEAS-DLI")}&limit=10000`),
        ]);
        rawItems = [...a, ...b];
      }

      const seen = new Set<string>();
      const normalized: TrainTicketRow[] = [];

      for (const x of rawItems) {
        const id = extractId(x);
        if (!id || seen.has(id)) continue;
        seen.add(id);

        normalized.push({
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

      setAllTickets(normalized);
    } catch (e) {
      console.error("Failed to load train tickets", e);
      setAllTickets([]);
    }
  }

  React.useEffect(() => {
    loadAll();
    loadJathaDates();
    loadTrainTickets();
  }, []);

  React.useEffect(() => {
    setJathaDateFilter("");
  }, [typeFilter]);

  const ticketLabelMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const t of allTickets) {
      const id = extractId(t._id);
      if (id) map.set(id, makeTicketLabel(t));
    }
    return map;
  }, [allTickets]);

  const ticketFareMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const t of allTickets) {
      const id = extractId(t._id);
      const fare = toNumberOrNull(t.fare);
      if (id && fare !== null) map.set(id, fare);
    }
    return map;
  }, [allTickets]);

  function renderTicket(v?: any) {
    if (!v) return "-";

    if (typeof v === "object") {
      const id = extractId(v);
      if (id && ticketLabelMap.get(id)) return ticketLabelMap.get(id)!;

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
        return makeTicketLabel(t) || (id || "-");
      } catch {
        return id || "-";
      }
    }

    const s = String(v || "").trim();
    if (!s) return "-";
    return ticketLabelMap.get(s) || s;
  }

  function ticketFare(v?: any): number {
    const id = extractId(v);
    if (!id) return 0;
    return ticketFareMap.get(id) ?? 0;
  }

  function getJathaRange(row: CallingRow) {
    const id = String(row.jathaDateId || "").trim();

    if (id) {
      const j = allJathaDates.find((x) => String(x._id) === id);
      if (j) {
        const start = toYMD(j.jathaStartDate || j.travelDate || "");
        const end = toYMD(j.jathaEndDate || j.travelDate || j.jathaStartDate || "");
        return { start, end };
      }
    }

    const startKey = toYMD(row.jathaDate || "");
    if (startKey) {
      const j = allJathaDates.find(
        (x) => toYMD(x.jathaStartDate || x.travelDate || "") === startKey
      );
      if (j) {
        const start = toYMD(j.jathaStartDate || j.travelDate || "");
        const end = toYMD(j.jathaEndDate || j.travelDate || j.jathaStartDate || "");
        return { start, end };
      }
      return { start: startKey, end: startKey };
    }

    return { start: "", end: "" };
  }

  function getJathaLabel(row: CallingRow) {
    const jr = getJathaRange(row);
    return `${formatDDMonYYYY(jr.start) || "-"} → ${formatDDMonYYYY(jr.end) || "-"}`;
  }

  function rowComputed(row: CallingRow) {
    const jr = getJathaRange(row);
    const fareTotal = ticketFare(row.ticketDelhiBeas) + ticketFare(row.ticketBeasDelhi);
    const pay = paymentToNumber(row.payment);
    const pending = Math.max(0, fareTotal - pay);

    return {
      jathaStartDate: jr.start,
      jathaEndDate: jr.end,
      fareTotal,
      pending,
    };
  }

  function getTravellerKey(row: CallingRow) {
    const mobile = normalizeText(row.mobile);
    if (mobile) return `m:${mobile}`;

    const aadhaar = normalizeText(row.adhaarNumber);
    if (aadhaar) return `a:${aadhaar}`;

    const customerId = normalizeText(row.customerId);
    if (customerId) return `c:${customerId}`;

    const name = normalizeText(row.customerName);
    const father = normalizeText(row.fatherOrHusbandName);
    const age = String(row.age ?? "").trim();

    return `n:${name}|f:${father}|age:${age}`;
  }

  const travellerSummaryMap = React.useMemo(() => {
    const map = new Map<string, TravellerSummary & { allDates: string[] }>();

    for (const row of rows) {
      const travellerKey = getTravellerKey(row);
      const jatha = getJathaRange(row);
      const tripDate =
        jatha.start ||
        toYMD(row.travelStartDate || "") ||
        toYMD(row.travelEndDate || "") ||
        toYMD(row.jathaDate || "");

      if (!map.has(travellerKey)) {
        map.set(travellerKey, {
          travellerKey,
          ladooCount: 0,
          paranthaCount: 0,
          bhatiCount: 0,
          totalCount: 0,
          firstTravelDate: "",
          lastTravelDate: "",
          recentDates: [],
          allDates: [],
        });
      }

      const item = map.get(travellerKey)!;

      if (row.sourceType === "ladoo") item.ladooCount += 1;
      if (row.sourceType === "parantha") item.paranthaCount += 1;
      if (row.sourceType === "bhati") item.bhatiCount += 1;

      item.totalCount += 1;

      if (tripDate) item.allDates.push(tripDate);
    }

    const finalMap = new Map<string, TravellerSummary>();

    for (const [key, value] of map.entries()) {
      const sortedDates = sortUniqueDates(value.allDates);
      finalMap.set(key, {
        travellerKey: value.travellerKey,
        ladooCount: value.ladooCount,
        paranthaCount: value.paranthaCount,
        bhatiCount: value.bhatiCount,
        totalCount: value.totalCount,
        firstTravelDate: sortedDates[0] || "",
        lastTravelDate: sortedDates[sortedDates.length - 1] || "",
        recentDates: sortedDates.slice(-5).reverse(),
      });
    }

    return finalMap;
  }, [rows, allJathaDates]);

  function getSummaryForRow(row: CallingRow) {
    return travellerSummaryMap.get(getTravellerKey(row));
  }

  function matchesFrequency(totalCount: number) {
    if (!frequencyFilter) return true;
    if (frequencyFilter === "new") return totalCount === 1;
    if (frequencyFilter === "repeat") return totalCount >= 2 && totalCount <= 3;
    if (frequencyFilter === "frequent") return totalCount >= 4 && totalCount <= 6;
    if (frequencyFilter === "very-frequent") return totalCount >= 7;
    return true;
  }

  const jathaDateOptions = React.useMemo(() => {
    const list = typeFilter
      ? allJathaDates.filter(
          (j) => String(j.category || "").trim().toLowerCase() === typeFilter
        )
      : allJathaDates;

    return list.sort((a, b) =>
      String(a.jathaStartDate || a.travelDate || "").localeCompare(
        String(b.jathaStartDate || b.travelDate || "")
      )
    );
  }, [allJathaDates, typeFilter]);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();

    const next = rows.filter((r) => {
      const jr = getJathaRange(r);
      const freq = travellerSummaryMap.get(getTravellerKey(r));
      const totalCount = freq?.totalCount || 1;
      const frequencyTag = getTravellerTag(totalCount);

      const matchesSearch =
        !q ||
        [
          r.customerName,
          r.fatherOrHusbandName,
          r.mobile,
          r.badgeNo,
          r.address,
          r.department,
          r.notes,
          r.remarks,
          r.mode,
          r.sangat,
          r.gender,
          r.adhaarNumber,
          renderTicket(r.ticketDelhiBeas),
          renderTicket(r.ticketBeasDelhi),
          jr.start,
          jr.end,
          String(freq?.ladooCount ?? ""),
          String(freq?.paranthaCount ?? ""),
          String(freq?.bhatiCount ?? ""),
          String(freq?.totalCount ?? ""),
          frequencyTag,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesType = !typeFilter || r.sourceType === typeFilter;

      const matchesJatha =
        !jathaDateFilter ||
        String(r.jathaDateId || "").trim() === jathaDateFilter ||
        jr.start === jathaDateFilter;

      const matchesConfirm = !confirmFilter || String(r.confirm || "") === confirmFilter;
      const matchesFerry = !ferryFilter || String(r.ferry || "") === ferryFilter;
      const matchesFreq = matchesFrequency(totalCount);

      return (
        matchesSearch &&
        matchesType &&
        matchesJatha &&
        matchesConfirm &&
        matchesFerry &&
        matchesFreq
      );
    });

    if (!frequencySort) return next;

    return [...next].sort((a, b) => {
      const aCount = travellerSummaryMap.get(getTravellerKey(a))?.totalCount || 1;
      const bCount = travellerSummaryMap.get(getTravellerKey(b))?.totalCount || 1;

      if (frequencySort === "highest") {
        if (bCount !== aCount) return bCount - aCount;
      } else {
        if (aCount !== bCount) return aCount - bCount;
      }

      return String(a.customerName || "").localeCompare(String(b.customerName || ""));
    });
  }, [
    rows,
    search,
    typeFilter,
    jathaDateFilter,
    confirmFilter,
    ferryFilter,
    frequencyFilter,
    frequencySort,
    allJathaDates,
    ticketLabelMap,
    travellerSummaryMap,
  ]);

  const visibleKeys = React.useMemo(() => filteredRows.map((r) => rowKey(r)), [filteredRows]);

  const allVisibleSelected =
    visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.includes(k));

  const travellerStats = React.useMemo(() => {
    const uniqueKeys = new Set<string>();
    let newCount = 0;
    let repeatCount = 0;
    let frequentCount = 0;
    let veryFrequentCount = 0;

    for (const row of filteredRows) {
      const key = getTravellerKey(row);
      if (uniqueKeys.has(key)) continue;
      uniqueKeys.add(key);

      const totalCount = travellerSummaryMap.get(key)?.totalCount || 1;

      if (totalCount >= 7) veryFrequentCount += 1;
      else if (totalCount >= 4) frequentCount += 1;
      else if (totalCount >= 2) repeatCount += 1;
      else newCount += 1;
    }

    return {
      uniqueTravellers: uniqueKeys.size,
      newCount,
      repeatCount,
      frequentCount,
      veryFrequentCount,
    };
  }, [filteredRows, travellerSummaryMap]);

  function toggleRowSelection(key: string) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  }

  function toggleSelectAllVisible() {
    setSelectedKeys((prev) => {
      if (allVisibleSelected) {
        return prev.filter((k) => !visibleKeys.includes(k));
      }
      return Array.from(new Set([...prev, ...visibleKeys]));
    });
  }

  function getRowDraft(row: CallingRow): CallingRow {
    return draftMap[rowKey(row)] || row;
  }

  function updateDraft(row: CallingRow, patch: Partial<CallingRow>) {
    const key = rowKey(row);
    setDraftMap((prev) => ({
      ...prev,
      [key]: {
        ...getRowDraft(row),
        ...patch,
      },
    }));
  }

  function isDirty(row: CallingRow) {
    const key = rowKey(row);
    const draft = draftMap[key];
    if (!draft) return false;

    return (
      String(draft.confirm || "") !== String(row.confirm || "") ||
      String(draft.ferry || "") !== String(row.ferry || "") ||
      String(draft.remarks || "") !== String(row.remarks || "") ||
      String(normalizeTicketId(draft.ticketDelhiBeas) || "") !==
        String(normalizeTicketId(row.ticketDelhiBeas) || "") ||
      String(normalizeTicketId(draft.ticketBeasDelhi) || "") !==
        String(normalizeTicketId(row.ticketBeasDelhi) || "")
    );
  }

  function buildSavePayload(row: CallingRow) {
    const draft = getRowDraft(row);

    return {
      mode: String(draft.mode || ""),
      payment: String(draft.payment || ""),
      jathaDateId: String(draft.jathaDateId || ""),
      jathaDate: toYMD(draft.jathaDate || getJathaRange(draft).start || ""),
      notes: String(draft.notes || ""),

      department: String(draft.department || ""),
      sangat: String(draft.sangat || ""),
      bookingReqDelhiBeas: String(draft.bookingReqDelhiBeas || ""),
      bookingReqBeasDelhi: String(draft.bookingReqBeasDelhi || ""),
      ticketDelhiBeas: normalizeTicketId(draft.ticketDelhiBeas) || "",
      ticketBeasDelhi: normalizeTicketId(draft.ticketBeasDelhi) || "",
      travelStartDate: toYMD(draft.travelStartDate || ""),
      travelEndDate: toYMD(draft.travelEndDate || ""),

      confirm: draft.confirm || "",
      ferry: draft.ferry || "",
      remarks: String(draft.remarks || ""),
    };
  }

  async function saveOneRow(row: CallingRow) {
    const key = rowKey(row);
    const draft = getRowDraft(row);

    try {
      setSavingKeys((prev) => [...prev, key]);

      const payload = buildSavePayload(row);

      const res = await fetch(
        `/api/nominal-roll/${draft.sourceType}/${encodeURIComponent(draft._id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || data?.message || "Failed to save row");
        return;
      }

      setRows((prev) =>
        prev.map((r) =>
          rowKey(r) === key
            ? {
                ...r,
                confirm: draft.confirm || "",
                ferry: draft.ferry || "",
                remarks: draft.remarks || "",
                ticketDelhiBeas: normalizeTicketId(draft.ticketDelhiBeas) || "",
                ticketBeasDelhi: normalizeTicketId(draft.ticketBeasDelhi) || "",
              }
            : r
        )
      );

      setDraftMap((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      if (detailsRowKey === key) {
        setDetailsOpen(false);
        setDetailsRowKey("");
      }

      alert("Data saved successfully");
    } finally {
      setSavingKeys((prev) => prev.filter((x) => x !== key));
    }
  }

  function applyBulkConfirm(value: YesNo) {
    setDraftMap((prev) => {
      const next = { ...prev };
      for (const row of filteredRows) {
        const key = rowKey(row);
        if (!selectedKeys.includes(key)) continue;
        next[key] = {
          ...getRowDraft(row),
          confirm: value,
        };
      }
      return next;
    });
  }

  function applyBulkFerry(value: YesNo) {
    setDraftMap((prev) => {
      const next = { ...prev };
      for (const row of filteredRows) {
        const key = rowKey(row);
        if (!selectedKeys.includes(key)) continue;
        next[key] = {
          ...getRowDraft(row),
          ferry: value,
        };
      }
      return next;
    });
  }

  function clearSelectedCallingFields() {
    setDraftMap((prev) => {
      const next = { ...prev };
      for (const row of filteredRows) {
        const key = rowKey(row);
        if (!selectedKeys.includes(key)) continue;
        next[key] = {
          ...getRowDraft(row),
          confirm: "",
          ferry: "",
          remarks: "",
        };
      }
      return next;
    });
  }

  async function saveSelectedRows() {
    const selectedRows = filteredRows.filter((r) => selectedKeys.includes(rowKey(r)));

    for (const row of selectedRows) {
      if (isDirty(row)) {
        await saveOneRow(row);
      }
    }
  }

  function openDetails(row: CallingRow) {
    const key = rowKey(row);
    setDetailsRowKey(key);
    setDetailsOpen(true);
    if (!draftMap[key]) {
      setDraftMap((prev) => ({
        ...prev,
        [key]: { ...row },
      }));
    }
  }

  const modalBaseRow = detailsRowKey ? getBaseRowByKey(detailsRowKey) : undefined;
  const modalDraft = modalBaseRow ? getRowDraft(modalBaseRow) : null;
  const modalSaving = detailsRowKey ? savingKeys.includes(detailsRowKey) : false;
  const modalSummary = modalDraft ? getSummaryForRow(modalDraft) : null;

  function exportExcel() {
    const exportRows = filteredRows.map((r, index) => {
      const draft = getRowDraft(r);
      const c = rowComputed(draft);
      const pay = paymentToNumber(draft.payment);
      const freq = getSummaryForRow(draft);
      const totalCount = freq?.totalCount || 1;

      return {
        "S.NO": index + 1,
       
        "NAME": draft.customerName || "",
        "FATHER/HUSBAND": draft.fatherOrHusbandName || "",
        "GENDER": draft.gender || "",
        "AGE": draft.age ?? "",
        "MOBILE": draft.mobile || "",
        "ADDRESS": draft.address || "",
        "BADGE": draft.badgeNo || "",
         "MODE": draft.mode || "",
          "DEPARTMENT": draft.department || "",
        "SANGAT": draft.sangat || "",
         "TYPE": draft.sourceLabel || "",
        "AADHAAR": draft.adhaarNumber || "",
        "LADOO COUNT": freq?.ladooCount || 0,
        "PARANTHA COUNT": freq?.paranthaCount || 0,
        "BHATI COUNT": freq?.bhatiCount || 0,
        "TOTAL COUNT": totalCount,
        "FREQUENCY TAG": getTravellerTag(totalCount),
        "LAST TRAVEL": formatDDMonYYYY(freq?.lastTravelDate),
       
       
        "REQ D-B": draft.bookingReqDelhiBeas || "",
        "REQ B-D": draft.bookingReqBeasDelhi || "",
        "TICKET D-B": renderTicket(draft.ticketDelhiBeas),
        "TICKET B-D": renderTicket(draft.ticketBeasDelhi),
        "FARE TOTAL": c.fareTotal,
        "PENDING": c.pending,
        "PAYMENT": pay || 0,
        "JATHA DATE": getJathaLabel(draft),
        "TRAVEL START": formatDDMonYYYY(draft.travelStartDate),
        "TRAVEL END": formatDDMonYYYY(draft.travelEndDate),
        "NOTES": draft.notes || "",
        "CONFIRM": draft.confirm || "",
        "FERRY": draft.ferry || "",
        "REMARKS": draft.remarks || "",
        "CREATED AT": formatDDMonYYYY(draft.createdAt),
        "UPDATED AT": formatDDMonYYYY(draft.updatedAt),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CALLING");
    XLSX.writeFile(
      wb,
      `CALLING_${(typeFilter || "all").toUpperCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

  return (
    <div className="app-page w-full max-w-none">
      <div className="app-card app-card-pad w-full max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Calling</h1>
            <p className="app-subtitle">
              Row click opens edit modal. Confirm and Ferry stay inline with bulk save support.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportExcel} className="app-btn app-btn-secondary h-10 px-4">
              Export Excel
            </button>
            <button onClick={loadAll} className="app-btn app-btn-primary h-10 px-4">
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">Unique Travellers</div>
            <div className="mt-1 text-xl font-semibold">{travellerStats.uniqueTravellers}</div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">New</div>
            <div className="mt-1 text-xl font-semibold">{travellerStats.newCount}</div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">Repeat</div>
            <div className="mt-1 text-xl font-semibold">{travellerStats.repeatCount}</div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">Frequent</div>
            <div className="mt-1 text-xl font-semibold">{travellerStats.frequentCount}</div>
          </div>
          <div className="rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">Very Frequent</div>
            <div className="mt-1 text-xl font-semibold">{travellerStats.veryFrequentCount}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div>
            <div className="app-label">Search</div>
            <input
              className={inputCls()}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type anything..."
            />
          </div>

          <div>
            <div className="app-label">Type</div>
            <select
              className={inputCls()}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "" | CallingCategory)}
            >
              <option value="">All</option>
              <option value="ladoo">Ladoo</option>
              <option value="parantha">Parantha</option>
              <option value="bhati">Bhati</option>
            </select>
          </div>

          <div>
            <div className="app-label">Jatha Date</div>
            <select
              className={inputCls()}
              value={jathaDateFilter}
              onChange={(e) => setJathaDateFilter(e.target.value)}
            >
              <option value="">All</option>
              {jathaDateOptions.map((j) => {
                const start = toYMD(j.jathaStartDate || j.travelDate || "");
                const end = toYMD(j.jathaEndDate || j.travelDate || j.jathaStartDate || "");
                const label = `${formatDDMonYYYY(start) || "-"} → ${formatDDMonYYYY(end) || "-"}`;

                return (
                  <option key={j._id} value={j._id || start}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <div className="app-label">Confirm</div>
            <select
              className={inputCls()}
              value={confirmFilter}
              onChange={(e) => setConfirmFilter(e.target.value as YesNo)}
            >
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <div className="app-label">Ferry</div>
            <select
              className={inputCls()}
              value={ferryFilter}
              onChange={(e) => setFerryFilter(e.target.value as YesNo)}
            >
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <div className="app-label">Traveller Frequency</div>
            <select
              className={inputCls()}
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value as FrequencyFilter)}
            >
              <option value="">All</option>
              <option value="new">New (1)</option>
              <option value="repeat">Repeat (2-3)</option>
              <option value="frequent">Frequent (4-6)</option>
              <option value="very-frequent">Very Frequent (7+)</option>
            </select>
          </div>

          <div>
            <div className="app-label">Sort By Trips</div>
            <select
              className={inputCls()}
              value={frequencySort}
              onChange={(e) => setFrequencySort(e.target.value as FrequencySort)}
            >
              <option value="">Default</option>
              <option value="highest">Highest First</option>
              <option value="lowest">Lowest First</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Total Records: <span className="font-semibold">{filteredRows.length}</span>
          </div>

          <button
            type="button"
            className="app-btn app-btn-secondary h-10 px-4"
            onClick={() => {
              setSearch("");
              setTypeFilter("");
              setJathaDateFilter("");
              setConfirmFilter("");
              setFerryFilter("");
              setFrequencyFilter("");
              setFrequencySort("");
              setSelectedKeys([]);
            }}
          >
            Clear Filters
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10">
          <div className="text-sm font-medium">Selected: {selectedKeys.length}</div>

          <button
            type="button"
            className="app-btn app-btn-secondary h-9 px-3"
            onClick={() => applyBulkConfirm("Yes")}
            disabled={selectedKeys.length === 0}
          >
            Confirm Yes
          </button>

          <button
            type="button"
            className="app-btn app-btn-secondary h-9 px-3"
            onClick={() => applyBulkConfirm("No")}
            disabled={selectedKeys.length === 0}
          >
            Confirm No
          </button>

          <button
            type="button"
            className="app-btn app-btn-secondary h-9 px-3"
            onClick={() => applyBulkFerry("Yes")}
            disabled={selectedKeys.length === 0}
          >
            Ferry Yes
          </button>

          <button
            type="button"
            className="app-btn app-btn-secondary h-9 px-3"
            onClick={() => applyBulkFerry("No")}
            disabled={selectedKeys.length === 0}
          >
            Ferry No
          </button>

          <button
            type="button"
            className="app-btn app-btn-secondary h-9 px-3"
            onClick={clearSelectedCallingFields}
            disabled={selectedKeys.length === 0}
          >
            Clear Selected
          </button>

          <button
            type="button"
            className="app-btn app-btn-primary h-9 px-3"
            onClick={saveSelectedRows}
            disabled={selectedKeys.length === 0}
          >
            Save Selected
          </button>
        </div>

        <div className="w-full overflow-x-auto mt-4">
          <table className="min-w-[3400px] table-fixed border-collapse text-xs">
            <thead className="thead">
              <tr>
                <th className="th w-12 px-2 py-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onClick={stopRowClick}
                    onChange={toggleSelectAllVisible}
                  />
                </th>
                <th className="th w-14 px-2 py-2">S.No</th>
                <th className="th w-28 px-2 py-2">Type</th>
                <th className="th w-56 px-2 py-2">Name</th>
                <th className="th w-32 px-2 py-2">Tag</th>
                <th className="th w-24 px-2 py-2">Ladoo</th>
                <th className="th w-24 px-2 py-2">Parantha</th>
                <th className="th w-24 px-2 py-2">Bhati</th>
                <th className="th w-24 px-2 py-2">Total</th>
                <th className="th w-32 px-2 py-2">Last Travel</th>
                <th className="th w-48 px-2 py-2">Father/Husband</th>
                <th className="th w-24 px-2 py-2">Gender</th>
                <th className="th w-16 px-2 py-2">Age</th>
                <th className="th w-32 px-2 py-2">Mobile</th>
                <th className="th w-72 px-2 py-2">Address</th>
                <th className="th w-28 px-2 py-2">Badge</th>
                <th className="th w-36 px-2 py-2">Aadhaar</th>
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
                <th className="th w-24 px-2 py-2">Confirm</th>
                <th className="th w-24 px-2 py-2">Ferry</th>
                <th className="th w-64 px-2 py-2">Remarks</th>
                <th className="th w-28 px-2 py-2">Save</th>
                <th className="th w-32 px-2 py-2">Created</th>
                <th className="th w-32 px-2 py-2">Updated</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={37}>
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={37}>
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => {
                  const key = rowKey(r);
                  const draft = getRowDraft(r);
                  const saving = savingKeys.includes(key);
                  const dirty = isDirty(r);
                  const c = rowComputed(draft);
                  const pay = paymentToNumber(draft.payment);
                  const summary = getSummaryForRow(draft);
                  const totalCount = summary?.totalCount || 1;

                  return (
                    <tr
                      key={key}
                      className={[
                        "row cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5",
                        i % 2 === 0 ? "row-alt" : "row-alt2",
                      ].join(" ")}
                      onClick={() => openDetails(r)}
                      title="Click row to edit"
                    >
                      <td className="td px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(key)}
                          onClick={stopRowClick}
                          onChange={() => toggleRowSelection(key)}
                        />
                      </td>

                      <td className="td px-2 py-2">{i + 1}</td>
                      <td className="td px-2 py-2">{draft.sourceLabel || "-"}</td>

                      <td className="td px-2 py-2 whitespace-normal break-words font-medium">
                        <div>{draft.customerName || "-"}</div>
                        <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          L:{summary?.ladooCount || 0} | P:{summary?.paranthaCount || 0} | B:
                          {summary?.bhatiCount || 0} | T:{totalCount}
                        </div>
                      </td>

                      <td className="td px-2 py-2">
                        <span className={frequencyBadgeCls(totalCount)}>
                          {getTravellerTag(totalCount)}
                        </span>
                      </td>

                      <td className="td px-2 py-2 text-center">{summary?.ladooCount || 0}</td>
                      <td className="td px-2 py-2 text-center">{summary?.paranthaCount || 0}</td>
                      <td className="td px-2 py-2 text-center">{summary?.bhatiCount || 0}</td>
                      <td className="td px-2 py-2 text-center font-semibold">{totalCount}</td>
                      <td className="td px-2 py-2 whitespace-nowrap">
                        {formatDDMonYYYY(summary?.lastTravelDate) || "-"}
                      </td>

                      <td className="td px-2 py-2 whitespace-normal break-words">
                        {draft.fatherOrHusbandName || "-"}
                      </td>
                      <td className="td px-2 py-2">{draft.gender || "-"}</td>
                      <td className="td px-2 py-2">{draft.age ?? "-"}</td>
                      <td className="td px-2 py-2">{draft.mobile || "-"}</td>
                      <td className="td px-2 py-2 whitespace-normal break-words">
                        {draft.address || "-"}
                      </td>
                      <td className="td px-2 py-2">{draft.badgeNo || "-"}</td>
                      <td className="td px-2 py-2">{draft.adhaarNumber || "-"}</td>
                      <td className="td px-2 py-2">{draft.mode || "-"}</td>
                      <td className="td px-2 py-2 whitespace-normal break-words">
                        {draft.department || "-"}
                      </td>
                      <td className="td px-2 py-2">{draft.sangat || "-"}</td>
                      <td className="td px-2 py-2">{draft.bookingReqDelhiBeas || "-"}</td>
                      <td className="td px-2 py-2">{draft.bookingReqBeasDelhi || "-"}</td>
                      <td className="td px-2 py-2 whitespace-normal break-words">
                        {renderTicket(draft.ticketDelhiBeas)}
                      </td>
                      <td className="td px-2 py-2 whitespace-normal break-words">
                        {renderTicket(draft.ticketBeasDelhi)}
                      </td>
                      <td className="td px-2 py-2">{c.fareTotal || "-"}</td>
                      <td className="td px-2 py-2">{c.pending || "-"}</td>
                      <td className="td px-2 py-2">{pay || "-"}</td>
                      <td className="td px-2 py-2 whitespace-nowrap">{getJathaLabel(draft)}</td>
                      <td className="td px-2 py-2 whitespace-nowrap">
                        {formatDDMonYYYY(draft.travelStartDate) || "-"}
                      </td>
                      <td className="td px-2 py-2 whitespace-nowrap">
                        {formatDDMonYYYY(draft.travelEndDate) || "-"}
                      </td>
                      <td className="td px-2 py-2 whitespace-normal break-words">
                        {draft.notes || "-"}
                      </td>

                      <td className="td px-2 py-2">
                        <select
                          className={inputCls()}
                          value={draft.confirm || ""}
                          onClick={stopRowClick}
                          onChange={(e) => updateDraft(r, { confirm: e.target.value as YesNo })}
                        >
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>

                      <td className="td px-2 py-2">
                        <select
                          className={inputCls()}
                          value={draft.ferry || ""}
                          onClick={stopRowClick}
                          onChange={(e) => updateDraft(r, { ferry: e.target.value as YesNo })}
                        >
                          <option value="">Select</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>

                      <td className="td px-2 py-2 whitespace-normal break-words">
                        {draft.remarks || "-"}
                      </td>

                      <td className="td px-2 py-2">
                        <button
                          type="button"
                          className="app-btn app-btn-secondary h-9 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveOneRow(r);
                          }}
                          disabled={!dirty || saving}
                        >
                          {saving ? "Saving..." : dirty ? "Save" : "Saved"}
                        </button>
                      </td>

                      <td className="td px-2 py-2 whitespace-nowrap">
                        {formatDDMonYYYY(draft.createdAt) || "-"}
                      </td>
                      <td className="td px-2 py-2 whitespace-nowrap">
                        {formatDDMonYYYY(draft.updatedAt) || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailsOpen && modalBaseRow && modalDraft && (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) {
        setDetailsOpen(false);
        setDetailsRowKey("");
      }
    }}
  >
    <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <div className="text-lg font-semibold">Edit Row</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Confirm and Ferry can be edited here too.
          </div>
        </div>

        <button
          className="app-btn app-btn-secondary h-9 px-4"
          onClick={() => {
            setDetailsOpen(false);
            setDetailsRowKey("");
          }}
        >
          Close
        </button>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2">
        {modalSummary && (
          <div className="rounded-2xl border border-black/10 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Traveller History</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Frequency summary across Ladoo, Parantha and Bhati.
                </div>
              </div>

              <span className={frequencyBadgeCls(modalSummary.totalCount)}>
                {getTravellerTag(modalSummary.totalCount)}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Ladoo</div>
                <div className="mt-1 text-lg font-semibold">{modalSummary.ladooCount}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Parantha</div>
                <div className="mt-1 text-lg font-semibold">{modalSummary.paranthaCount}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Bhati</div>
                <div className="mt-1 text-lg font-semibold">{modalSummary.bhatiCount}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Total</div>
                <div className="mt-1 text-lg font-semibold">{modalSummary.totalCount}</div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">First Travel</div>
                <div className="mt-1 text-sm font-semibold">
                  {formatDDMonYYYY(modalSummary.firstTravelDate) || "-"}
                </div>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Last Travel</div>
                <div className="mt-1 text-sm font-semibold">
                  {formatDDMonYYYY(modalSummary.lastTravelDate) || "-"}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Recent Travel Dates
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {modalSummary.recentDates.length ? (
                  modalSummary.recentDates.map((d) => (
                    <span
                      key={d}
                      className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] dark:border-white/10 dark:bg-zinc-900"
                    >
                      {formatDDMonYYYY(d)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">No travel history found</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="app-label">Type</div>
            <input className={inputCls()} value={modalDraft.sourceLabel || ""} disabled />
          </div>

          <div>
            <div className="app-label">Name</div>
            <input className={inputCls()} value={modalDraft.customerName || ""} disabled />
          </div>

          <div>
            <div className="app-label">Mobile</div>
            <input className={inputCls()} value={modalDraft.mobile || ""} disabled />
          </div>

          <div>
            <div className="app-label">Badge</div>
            <input className={inputCls()} value={modalDraft.badgeNo || ""} disabled />
          </div>

          <div>
            <div className="app-label">Confirm</div>
            <select
              className={inputCls()}
              value={modalDraft.confirm || ""}
              onChange={(e) => updateDraft(modalBaseRow, { confirm: e.target.value as YesNo })}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <div className="app-label">Ferry</div>
            <select
              className={inputCls()}
              value={modalDraft.ferry || ""}
              onChange={(e) => updateDraft(modalBaseRow, { ferry: e.target.value as YesNo })}
            >
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="app-label">Remarks</div>
            <textarea
              className={inputCls()}
              style={{ minHeight: 100 }}
              value={modalDraft.remarks || ""}
              onChange={(e) => updateDraft(modalBaseRow, { remarks: e.target.value })}
              placeholder="Enter remarks"
            />
          </div>

          <div>
            <div className="app-label">Ticket (Delhi-Beas)</div>
            <div className="flex gap-2">
              <input
                className={inputCls()}
                value={normalizeTicketId(modalDraft.ticketDelhiBeas)}
                onChange={(e) =>
                  updateDraft(modalBaseRow, { ticketDelhiBeas: e.target.value })
                }
                placeholder="Ticket ID"
              />
              <button
                type="button"
                className="app-btn app-btn-secondary h-10 px-3"
                onClick={() => updateDraft(modalBaseRow, { ticketDelhiBeas: "" })}
              >
                Clear
              </button>
            </div>
            <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
              {renderTicket(modalDraft.ticketDelhiBeas)}
            </div>
          </div>

          <div>
            <div className="app-label">Ticket (Beas-Delhi)</div>
            <div className="flex gap-2">
              <input
                className={inputCls()}
                value={normalizeTicketId(modalDraft.ticketBeasDelhi)}
                onChange={(e) =>
                  updateDraft(modalBaseRow, { ticketBeasDelhi: e.target.value })
                }
                placeholder="Ticket ID"
              />
              <button
                type="button"
                className="app-btn app-btn-secondary h-10 px-3"
                onClick={() => updateDraft(modalBaseRow, { ticketBeasDelhi: "" })}
              >
                Clear
              </button>
            </div>
            <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
              {renderTicket(modalDraft.ticketBeasDelhi)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 shrink-0">
        <button
          className="app-btn app-btn-secondary h-10 px-4"
          onClick={() => {
            setDetailsOpen(false);
            setDetailsRowKey("");
          }}
          disabled={modalSaving}
        >
          Cancel
        </button>

        <button
          className="app-btn app-btn-primary h-10 px-4"
          onClick={() => saveOneRow(modalBaseRow)}
          disabled={modalSaving}
        >
          {modalSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
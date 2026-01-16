"use client";

import React from "react";

type Gender = "M" | "F" | "Other" | "";
type TrainName =
  | ""
  | "Shan-e-Punjab Express"
  | "Pathankot Express"
  | "Shatabdi Express"
  | "Jallianwala Bagh Express";
type RouteType = "" | "DELHI-BEAS" | "BEAS-DELHI";
type BoardingStation = "" | "New Delhi" | "Old Delhi";

type RowErr = { row: number; field: string; message: string };

type TrainRow = {
  _id: string;
  name: string;
  age: number; // REQUIRED
  gender: Gender | string; // REQUIRED
  seatNumber: string; // REQUIRED
  pnrNumber: string; // REQUIRED
  trainName: TrainName | string; // REQUIRED
  route: RouteType | string; // REQUIRED
  trainTime: string; // REQUIRED
  boardingStation: BoardingStation | string; // REQUIRED
  travelDate: string | null; // REQUIRED
  fare: number; // ✅ REQUIRED
  createdAt?: string | null;
};

type FormState = {
  name: string;
  age: string;
  gender: Gender;
  seatNumber: string;
  pnrNumber: string;
  trainName: TrainName;
  route: RouteType;
  trainTime: string;
  boardingStation: BoardingStation;
  travelDate: string;
  fare: string; // keep string for input, convert to number
};

const TRAIN_OPTIONS: TrainName[] = [
  "Shan-e-Punjab Express",
  "Pathankot Express",
  "Shatabdi Express",
  "Jallianwala Bagh Express",
];
const ROUTE_OPTIONS: RouteType[] = ["DELHI-BEAS", "BEAS-DELHI"];
const BOARDING_OPTIONS: BoardingStation[] = ["New Delhi", "Old Delhi"];
const TRAIN_TIME_OPTIONS: string[] = [
  "06:40 AM",
  "08:10 AM",
  "07:15 AM",
  "03:40 PM",
  "10:00 AM",
  "05:20 PM",
];

function normalizeId(raw: any): string {
  const candidate =
    typeof raw === "string"
      ? raw
      : raw?.$oid
      ? raw.$oid
      : raw?.toString?.()
      ? raw.toString()
      : "";
  const s = String(candidate).trim();
  const match = s.match(/[a-fA-F0-9]{24}/);
  return (match?.[0] || "").trim();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(d?: string | null) {
  if (!d) return "";
  return String(d).slice(0, 10);
}

function escapeHtml(s: any) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toNumStrict(v: any) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function normalizeKey(k: string) {
  return String(k || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function pickAny(row: any, keys: string[]) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  const nkSet = new Set(keys.map(normalizeKey));
  for (const rk of Object.keys(row || {})) {
    if (nkSet.has(normalizeKey(rk))) {
      const v = row[rk];
      if (v !== undefined && v !== null && v !== "") return v;
    }
  }
  return "";
}

function validateSingle(payload: FormState): string | null {
  const name = payload.name.trim();
  const age = toNumStrict(payload.age);
  const fare = toNumStrict(payload.fare);

  if (!name) return "Name is required.";
  if (age === null || age <= 0) return "Age is required and must be a valid number.";
  if (!payload.gender) return "Gender is required.";
  if (!payload.seatNumber.trim()) return "Seat Number is required.";
  if (!payload.pnrNumber.trim()) return "PNR is required.";
  if (!payload.trainName) return "Train Name is required.";
  if (!payload.route) return "Route is required.";
  if (!payload.trainTime.trim()) return "Train Time is required.";
  if (!payload.boardingStation) return "Boarding Station is required.";
  if (!payload.travelDate) return "Travel Date is required.";
  if (fare === null || fare < 0) return "Fare is required and must be a valid number.";

  // allowed checks
  if (!["M", "F", "Other"].includes(payload.gender)) return "Gender must be M, F, or Other.";
  if (!TRAIN_OPTIONS.includes(payload.trainName)) return "Train Name is invalid.";
  if (!ROUTE_OPTIONS.includes(payload.route)) return "Route is invalid.";
  if (!BOARDING_OPTIONS.includes(payload.boardingStation)) return "Boarding Station is invalid.";
  if (!TRAIN_TIME_OPTIONS.includes(payload.trainTime)) return "Train Time is invalid.";

  return null;
}

function validateExcelRow(clean: any, rowNumber: number): RowErr[] {
  const errs: RowErr[] = [];

  const name = String(clean.name || "").trim();
  const age = toNumStrict(clean.age);
  const gender = String(clean.gender || "").trim();
  const seatNumber = String(clean.seatNumber || "").trim();
  const pnrNumber = String(clean.pnrNumber || "").trim();
  const trainName = String(clean.trainName || "").trim();
  const route = String(clean.route || "").trim();
  const trainTime = String(clean.trainTime || "").trim();
  const boardingStation = String(clean.boardingStation || "").trim();
  const travelDate = String(clean.travelDate || "").trim();
  const fare = toNumStrict(clean.fare);

  if (!name) errs.push({ row: rowNumber, field: "Name", message: "Name is required." });
  if (age === null || age <= 0) errs.push({ row: rowNumber, field: "Age", message: "Age is required and must be a valid number." });
  if (!gender) errs.push({ row: rowNumber, field: "Gender", message: "Gender is required." });
  if (!seatNumber) errs.push({ row: rowNumber, field: "Seat Number", message: "Seat Number is required." });
  if (!pnrNumber) errs.push({ row: rowNumber, field: "PNR", message: "PNR is required." });
  if (!trainName) errs.push({ row: rowNumber, field: "Train Name", message: "Train Name is required." });
  if (!route) errs.push({ row: rowNumber, field: "Route", message: "Route is required." });
  if (!trainTime) errs.push({ row: rowNumber, field: "Train Time", message: "Train Time is required." });
  if (!boardingStation) errs.push({ row: rowNumber, field: "Boarding Station", message: "Boarding Station is required." });
  if (!travelDate) errs.push({ row: rowNumber, field: "Travel Date", message: "Travel Date is required." });
  if (fare === null || fare < 0) errs.push({ row: rowNumber, field: "Fare", message: "Fare is required and must be a valid number." });

  // allowed values
  if (gender && !["M", "F", "Other"].includes(gender)) errs.push({ row: rowNumber, field: "Gender", message: "Gender must be M, F, or Other." });
  if (trainName && !TRAIN_OPTIONS.includes(trainName as any)) errs.push({ row: rowNumber, field: "Train Name", message: "Invalid Train Name." });
  if (route && !ROUTE_OPTIONS.includes(route as any)) errs.push({ row: rowNumber, field: "Route", message: "Invalid Route." });
  if (boardingStation && !BOARDING_OPTIONS.includes(boardingStation as any)) errs.push({ row: rowNumber, field: "Boarding Station", message: "Invalid Boarding Station." });
  if (trainTime && !TRAIN_TIME_OPTIONS.includes(trainTime)) errs.push({ row: rowNumber, field: "Train Time", message: "Invalid Train Time." });

  // travelDate format check
  if (travelDate) {
    const d = new Date(travelDate);
    if (Number.isNaN(d.getTime())) errs.push({ row: rowNumber, field: "Travel Date", message: "Invalid Travel Date." });
  }

  return errs;
}

export default function TrainDataPage() {
  const [items, setItems] = React.useState<TrainRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // ✅ Form (all required)
  const [form, setForm] = React.useState<FormState>({
    name: "",
    age: "",
    gender: "",
    seatNumber: "",
    pnrNumber: "",
    trainName: "",
    route: "",
    trainTime: "",
    boardingStation: "",
    travelDate: todayISO(),
    fare: "",
  });

  // edit
  const [editing, setEditing] = React.useState<TrainRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  // selection
  const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>({});

  // filters + search
  const [q, setQ] = React.useState("");
  const [fTrain, setFTrain] = React.useState<TrainName>("");
  const [fRoute, setFRoute] = React.useState<RouteType>("");
  const [fBoarding, setFBoarding] = React.useState<BoardingStation>("");
  const [fGender, setFGender] = React.useState<Gender>("");
  const [fTravelDate, setFTravelDate] = React.useState("");

  // suggestions
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [sugOpen, setSugOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const sugBoxRef = React.useRef<HTMLDivElement | null>(null);

  // pagination
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  // export/print/bulk
  const [exporting, setExporting] = React.useState<"filtered" | "all" | null>(null);
  const [printing, setPrinting] = React.useState(false);
  const [bulkLoading, setBulkLoading] = React.useState(false);

  // ✅ Bulk UI report (ALL OR NOTHING)
  const [bulkStatus, setBulkStatus] = React.useState<{ type: "idle" | "ok" | "err"; msg: string }>({
    type: "idle",
    msg: "",
  });
  const [bulkErrors, setBulkErrors] = React.useState<RowErr[]>([]);
  const [bulkTotalErrors, setBulkTotalErrors] = React.useState(0);

  // ✅ NEW: allow user to close report (errors OR success)
  const [showBulkReport, setShowBulkReport] = React.useState(true);

  // ✅ NEW: file clear support
  const bulkInputRef = React.useRef<HTMLInputElement | null>(null);

  function resetForm() {
    setForm({
      name: "",
      age: "",
      gender: "",
      seatNumber: "",
      pnrNumber: "",
      trainName: "",
      route: "",
      trainTime: "",
      boardingStation: "",
      travelDate: todayISO(),
      fare: "",
    });
  }

  async function load(resetPage = true) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (fTrain) params.set("trainName", fTrain);
      if (fRoute) params.set("route", fRoute);
      if (fBoarding) params.set("boardingStation", fBoarding);
      if (fGender) params.set("gender", fGender);
      if (fTravelDate) params.set("travelDate", fTravelDate);

      const res = await fetch(`/api/train-data?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      const safe: TrainRow[] = (data.items || [])
        .map((x: any) => ({ ...x, _id: normalizeId(x._id) }))
        .filter((x: any) => /^[a-fA-F0-9]{24}$/.test(x._id));

      setItems(safe);

      if (resetPage) setPage(1);

      setSelectedIds((prev) => {
        const next: Record<string, boolean> = {};
        for (const r of safe) if (prev[r._id]) next[r._id] = true;
        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // suggestions debounce
  React.useEffect(() => {
    const term = q.trim();
    setHighlightIndex(-1);

    if (!term) {
      setSuggestions([]);
      setSugOpen(false);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/train-data/suggest?q=${encodeURIComponent(term)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setSugOpen(list.length > 0);
      } catch {
        // ignore
      }
    }, 200);

    return () => window.clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!sugBoxRef.current) return;
      if (!sugBoxRef.current.contains(e.target as Node)) {
        setSugOpen(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickSuggestion(s: string) {
    setQ(s);
    setSugOpen(false);
    setHighlightIndex(-1);
    load(true);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!sugOpen || suggestions.length === 0) {
      if (e.key === "Enter") load(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = highlightIndex >= 0 ? suggestions[highlightIndex] : suggestions[0];
      pickSuggestion(chosen);
    } else if (e.key === "Escape") {
      setSugOpen(false);
      setHighlightIndex(-1);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    const errMsg = validateSingle(form);
    if (errMsg) {
      alert(errMsg);
      return;
    }

    const payload = {
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      seatNumber: form.seatNumber.trim().toUpperCase(),
      pnrNumber: form.pnrNumber.trim(),
      trainName: form.trainName,
      route: form.route,
      trainTime: form.trainTime.trim(),
      boardingStation: form.boardingStation,
      travelDate: String(form.travelDate || "").slice(0, 10),
      fare: Number(form.fare),
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/train-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = await res.text().catch(() => "");
      if (!res.ok) {
        alert(`Save failed (${res.status}). ${txt}`);
        return;
      }

      resetForm();
      await load(true);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    const realId = normalizeId(id);
    if (!/^[a-fA-F0-9]{24}$/.test(realId)) {
      alert(`Invalid id: "${String(id)}"`);
      return;
    }

    if (!confirm("Delete this record?")) return;

    const res = await fetch(`/api/train-data/${realId}`, { method: "DELETE" });
    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      alert(`Delete failed (${res.status}). ${txt}`);
      return;
    }
    await load(false);
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const realId = normalizeId(editing._id);
    if (!/^[a-fA-F0-9]{24}$/.test(realId)) {
      alert(`Invalid id: "${String(editing._id)}"`);
      return;
    }

    // ✅ all required in edit
    const editCheck: FormState = {
      name: String(editing.name || ""),
      age: String(editing.age ?? ""),
      gender: (editing.gender as any) || "",
      seatNumber: String(editing.seatNumber || ""),
      pnrNumber: String(editing.pnrNumber || ""),
      trainName: (editing.trainName as any) || "",
      route: (editing.route as any) || "",
      trainTime: String(editing.trainTime || ""),
      boardingStation: (editing.boardingStation as any) || "",
      travelDate: String(editing.travelDate || "").slice(0, 10),
      fare: String((editing as any).fare ?? ""),
    };
    const errMsg = validateSingle(editCheck);
    if (errMsg) {
      alert(errMsg);
      return;
    }

    const payload = {
      name: String(editing.name || "").trim(),
      age: Number(editing.age),
      gender: String(editing.gender || "").trim(),
      seatNumber: String(editing.seatNumber || "").trim().toUpperCase(),
      pnrNumber: String(editing.pnrNumber || "").trim(),
      trainName: String(editing.trainName || "").trim(),
      route: String(editing.route || "").trim(),
      trainTime: String(editing.trainTime || "").trim(),
      boardingStation: String(editing.boardingStation || "").trim(),
      travelDate: String(editing.travelDate || "").slice(0, 10),
      fare: Number((editing as any).fare),
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/train-data/${realId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = await res.text().catch(() => "");
      if (!res.ok) {
        alert(`Update failed (${res.status}). ${txt}`);
        return;
      }

      setEditing(null);
      await load(false);
    } finally {
      setSaving(false);
    }
  }

  // pagination
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = items.slice(startIndex, endIndex);

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => ({ ...prev, [id]: checked }));
  }
  function toggleAllOnPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = { ...prev };
      for (const r of pageItems) next[r._id] = checked;
      return next;
    });
  }
  const allCheckedOnPage = pageItems.length > 0 && pageItems.every((r) => selectedIds[r._id]);

  function selectedRows(): TrainRow[] {
    const sel = items.filter((r) => selectedIds[r._id]);
    return sel.length ? sel : items;
  }

  // excel export
  async function exportToExcel(rows: TrainRow[], filename: string) {
    const XLSX = await import("xlsx");

    const header = [
      "S.No",
      "Name",
      "Age",
      "Gender",
      "Seat Number",
      "PNR",
      "Train",
      "Route",
      "Train Time",
      "Boarding Station",
      "Travel Date",
      "Fare",
    ];
    const aoa: any[][] = [header];

    rows.forEach((r, idx) => {
      aoa.push([
        idx + 1,
        r.name || "",
        r.age ?? "",
        r.gender || "",
        r.seatNumber || "",
        r.pnrNumber || "",
        r.trainName || "",
        r.route || "",
        r.trainTime || "",
        r.boardingStation || "",
        r.travelDate ? String(r.travelDate).slice(0, 10) : "",
        (r as any).fare ?? "",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TrainData");
    XLSX.writeFile(wb, filename);
  }

  async function onExportFiltered() {
    setExporting("filtered");
    try {
      await exportToExcel(items, `train_data_filtered_${todayISO()}.xlsx`);
    } finally {
      setExporting(null);
    }
  }

  async function onExportAll() {
    setExporting("all");
    try {
      const res = await fetch(`/api/train-data?limit=10000`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      const safe: TrainRow[] = (data.items || [])
        .map((x: any) => ({ ...x, _id: normalizeId(x._id) }))
        .filter((x: any) => /^[a-fA-F0-9]{24}$/.test(x._id));

      await exportToExcel(safe, `train_data_all_${todayISO()}.xlsx`);
    } finally {
      setExporting(null);
    }
  }

  // ---------- MULTI-PAGE PRINT (6 per A4 page) ----------
  function buildTicketsMultiPageHtml(rows: TrainRow[]) {
    const chunkSize = 6;
    const pages: string[] = [];

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      const cards = chunk
        .map((p, idx) => {
          const sn = i + idx + 1;
          const dateStr = p.travelDate ? String(p.travelDate).slice(0, 10) : todayISO();

          return `
            <div class="ticket">
              <div class="head">
                <div class="title">Train Ticket</div>
                <div class="sn">#${sn}</div>
              </div>

              <div class="row"><span class="label">Name:</span><span class="value">${escapeHtml(p.name)}</span></div>
              
              <div class="row"><span class="label">Seat:</span><span class="value">${escapeHtml(p.seatNumber || "-")}</span></div>
              <div class="row"><span class="label">PNR:</span><span class="value">${escapeHtml(p.pnrNumber || "-")}</span></div>
              <div class="row"><span class="label">Train:</span><span class="value">${escapeHtml(p.trainName || "-")}</span></div>
              <div class="row"><span class="label">Route:</span><span class="value">${escapeHtml(p.route || "-")}</span></div>
              <div class="row"><span class="label">Time:</span><span class="value">${escapeHtml(p.trainTime || "-")}</span></div>
              <div class="row"><span class="label">Boarding:</span><span class="value">${escapeHtml(p.boardingStation || "-")}</span></div>
              <div class="row"><span class="label">Fare:</span><span class="value">${escapeHtml((p as any).fare ?? "-")}</span></div>

              <div class="foot"><span>Travel Date: ${escapeHtml(dateStr)}</span></div>
            </div>
          `;
        })
        .join("");

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
  @page { size: A4; margin: 8mm; }

  html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; }

  .page { width: 194mm; height: 281mm; box-sizing: border-box; page-break-after: always; }
  .page:last-child { page-break-after: auto; }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    gap: 6mm;
    width: 100%;
    height: 100%;
  }

  .ticket {
    border: 1.2px solid #111;
    border-radius: 8px;
    padding: 5mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .ticket-empty { border: 0; }

  .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5mm; }
  .title { font-size: 14pt; font-weight: 800; }
  .sn { font-size: 10.5pt; font-weight: 700; }

  .row { display: flex; gap: 6px; margin: 1.6mm 0; font-size: 11pt; line-height: 1.15; }
  .label { width: 40%; font-weight: 700; }
  .value { width: 60%; font-weight: 600; }

  .foot { margin-top: auto; border-top: 1px dashed #999; padding-top: 2mm; font-size: 10.5pt; font-weight: 700; }
</style>
      </head>
      <body>
        ${pages.join("")}
      </body>
      </html>
    `;
  }

  async function onPrintTickets() {
    const rows = selectedRows();
    if (!rows.length) {
      alert("No data to print.");
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
      w.document.write(buildTicketsMultiPageHtml(rows));
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 350);
    } finally {
      setPrinting(false);
    }
  }

  // sample excel download
  async function downloadSampleExcel() {
    const XLSX = await import("xlsx");

    const header = [
      "name",
      "age",
      "gender",
      "seatNumber",
      "pnrNumber",
      "trainName",
      "route",
      "trainTime",
      "boardingStation",
      "travelDate",
      "fare",
    ];
    const example = [
      "Sagar",
      30,
      "M",
      "A1",
      "1234567890",
      "Shan-e-Punjab Express",
      "DELHI-BEAS",
      "06:40 AM",
      "New Delhi",
      todayISO(),
      250,
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, `train_data_sample_${todayISO()}.xlsx`);
  }

  function clearSelectedBulkFile() {
    if (bulkInputRef.current) bulkInputRef.current.value = "";
    setShowBulkReport(true);
    setBulkStatus({ type: "idle", msg: "" });
    setBulkErrors([]);
    setBulkTotalErrors(0);
  }

  // ✅ Bulk upload: validate ALL rows first, show report, upload ONLY when no errors
  async function onBulkUpload(file: File) {
    // open the report panel for new attempt
    setShowBulkReport(true);

    setBulkStatus({ type: "idle", msg: "" });
    setBulkErrors([]);
    setBulkTotalErrors(0);

    setBulkLoading(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];

      if (!rows.length) {
        setBulkStatus({ type: "err", msg: "Excel file is empty." });
        return;
      }

      // normalize headers
      const normalized = rows.map((r) => ({
        name: pickAny(r, ["name", "Name"]),
        age: pickAny(r, ["age", "Age"]),
        gender: pickAny(r, ["gender", "Gender"]),
        seatNumber: pickAny(r, ["seatNumber", "Seat Number", "seat", "Seat"]),
        pnrNumber: pickAny(r, ["pnrNumber", "PNR", "pnr"]),
        trainName: pickAny(r, ["trainName", "Train", "train"]),
        route: pickAny(r, ["route", "Route"]),
        trainTime: pickAny(r, ["trainTime", "Train Time"]),
        boardingStation: pickAny(r, ["boardingStation", "Boarding Station", "boarding", "Boarding"]),
        travelDate: pickAny(r, ["travelDate", "Travel Date", "date"]),
        fare: pickAny(r, ["fare", "Fare"]),
      }));

      // ✅ Validate ALL rows locally (NO upload if any errors)
      const errs: RowErr[] = [];
      normalized.forEach((r, idx) => {
        const rowNumber = idx + 2; // header is row 1
        errs.push(...validateExcelRow(r, rowNumber));
      });

      if (errs.length) {
        setBulkErrors(errs);
        setBulkTotalErrors(errs.length);
        setBulkStatus({ type: "err", msg: "Validation failed. Fix the errors below and upload again." });
        return; // ✅ STOP - nothing uploaded
      }

      // ✅ Now upload (backend should still validate)
      const res = await fetch(`/api/train-data/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: normalized }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const list: RowErr[] = Array.isArray(json?.errors) ? json.errors : [];
        setBulkErrors(list);
        setBulkTotalErrors(Number(json?.totalErrors || list.length || 0));
        setBulkStatus({ type: "err", msg: json?.error || "Bulk upload failed." });
        return;
      }

      // ✅ SUCCESS MESSAGE ON SCREEN
      const inserted = Number(json?.insertedCount ?? json?.inserted ?? 0);
      setBulkStatus({
        type: "ok",
        msg: inserted > 0 ? `Successfully uploaded all the data. Inserted ${inserted} records.` : "Successfully uploaded all the data.",
      });
      setBulkErrors([]);
      setBulkTotalErrors(0);

      // optional: clear file input after success
      if (bulkInputRef.current) bulkInputRef.current.value = "";

      await load(true);
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="app-page w-full max-w-none">
      <div className="app-card app-card-pad w-full max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Train Data</h1>
            <p className="app-subtitle">
              Add records, bulk upload via Excel (all-or-nothing), search/filter with suggestions, export, and print A4 tickets (6 per page, multi-page).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={downloadSampleExcel} className="app-btn app-btn-secondary h-10 px-4">
              Download Sample Excel
            </button>

            {/* ✅ CLEAR FILE BUTTON + UPLOAD */}
            <button
              type="button"
              onClick={clearSelectedBulkFile}
              className="app-btn app-btn-secondary h-10 px-4"
              disabled={bulkLoading}
              title="Clear selected file"
            >
              Clear Errors
            </button>

            <label className="app-btn app-btn-secondary h-10 px-4 cursor-pointer">
              {bulkLoading ? "Validating..." : "Bulk Upload Excel"}
              <input
                ref={bulkInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  // reopen report for every new selection
                  setShowBulkReport(true);
                  if (f) onBulkUpload(f);
                }}
              />
            </label>

            <button onClick={onExportFiltered} disabled={exporting !== null} className="app-btn app-btn-secondary h-10 px-4">
              {exporting === "filtered" ? "Exporting..." : "Export Filtered"}
            </button>

            <button onClick={onExportAll} disabled={exporting !== null} className="app-btn app-btn-secondary h-10 px-4">
              {exporting === "all" ? "Exporting..." : "Export All"}
            </button>

            <button onClick={onPrintTickets} disabled={printing} className="app-btn app-btn-primary h-10 px-4">
              {printing ? "Preparing..." : "Print Tickets"}
            </button>
          </div>
        </div>

        {/* ✅ Bulk status + error report (closable) */}
        {showBulkReport && bulkStatus.type !== "idle" && (
          <div
            className={[
              "mt-4 rounded-xl border p-3 text-sm relative pr-10",
              bulkStatus.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
            ].join(" ")}
            role="status"
          >
            <button
              type="button"
              onClick={() => setShowBulkReport(false)}
              className="absolute right-2 top-2 h-7 w-7 rounded-lg font-bold hover:bg-black/5 dark:hover:bg-white/10"
              title="Close"
              aria-label="Close"
            >
              ✕
            </button>
            {bulkStatus.msg}
          </div>
        )}

        {showBulkReport && bulkErrors.length > 0 && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 relative pr-10">
            <button
              type="button"
              onClick={() => setShowBulkReport(false)}
              className="absolute right-3 top-3 h-8 w-8 rounded-lg font-bold hover:bg-black/5 dark:hover:bg-white/10"
              title="Close report"
              aria-label="Close report"
            >
              ✕
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">Fix these rows and upload again</div>
              <div className="text-xs opacity-90">
                Total errors: <span className="font-semibold">{bulkTotalErrors || bulkErrors.length}</span>
              </div>
            </div>

            <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-red-200/60 bg-white/60 p-3 text-xs dark:border-red-900/30 dark:bg-black/10">
              <ul className="space-y-1">
                {bulkErrors.slice(0, 200).map((e, idx) => (
                  <li key={idx} className="leading-5">
                    <span className="font-semibold">Row {e.row}</span> — {e.field}: {e.message}
                  </li>
                ))}
              </ul>
              {bulkErrors.length > 200 && <div className="mt-2 font-semibold">Showing first 200 errors…</div>}
            </div>

            <div className="mt-3 text-xs opacity-90">
              Nothing was uploaded because some rows are invalid. Please correct the rows above and upload again.
            </div>
          </div>
        )}

        {/* FORM (all required) */}
        <form onSubmit={onCreate} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className="app-input app-input-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" required />

          <input
            className="app-input app-input-sm"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value.replace(/[^\d]/g, "") })}
            placeholder="Age *"
            inputMode="numeric"
            required
          />

          <select className="app-input app-input-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as any })} required>
            <option value="">Gender *</option>
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="Other">Other</option>
          </select>

          <input className="app-input app-input-sm" value={form.seatNumber} onChange={(e) => setForm({ ...form, seatNumber: e.target.value })} placeholder="Seat Number *" required />

          <input className="app-input app-input-sm" value={form.pnrNumber} onChange={(e) => setForm({ ...form, pnrNumber: e.target.value })} placeholder="PNR *" required />

          <select className="app-input app-input-sm" value={form.trainName} onChange={(e) => setForm({ ...form, trainName: e.target.value as any })} required>
            <option value="">Train Name *</option>
            {TRAIN_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select className="app-input app-input-sm" value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value as any })} required>
            <option value="">Route *</option>
            {ROUTE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select className="app-input app-input-sm" value={form.trainTime} onChange={(e) => setForm({ ...form, trainTime: e.target.value })} required>
            <option value="">Train Time *</option>
            {TRAIN_TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select className="app-input app-input-sm" value={form.boardingStation} onChange={(e) => setForm({ ...form, boardingStation: e.target.value as any })} required>
            <option value="">Boarding Station *</option>
            {BOARDING_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <input type="date" className="app-input app-input-sm" value={form.travelDate} onChange={(e) => setForm({ ...form, travelDate: e.target.value })} required />

          {/* ✅ NEW Fare */}
          <input
            className="app-input app-input-sm"
            value={form.fare}
            onChange={(e) => setForm({ ...form, fare: e.target.value.replace(/[^\d.]/g, "") })}
            placeholder="Fare *"
            inputMode="decimal"
            required
          />

          <div className="sm:col-span-2 lg:col-span-3 mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={resetForm} className="app-btn app-btn-secondary h-10 px-4">
              Reset
            </button>
            <button type="submit" disabled={saving} className="app-btn app-btn-primary h-10 px-4">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>

        {/* FILTERS */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative" ref={sugBoxRef}>
            <div className="app-label">Search (with suggestions)</div>
            <input
              className="app-input app-input-sm"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSugOpen(true);
              }}
              onFocus={() => suggestions.length && setSugOpen(true)}
              onKeyDown={onSearchKeyDown}
              placeholder="Type name/seat/train/route/boarding/pnr..."
            />
            {sugOpen && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-zinc-950">
                {suggestions.map((s, idx) => (
                  <button
                    key={s + idx}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className={[
                      "block w-full px-3 py-2 text-left text-sm",
                      idx === highlightIndex ? "bg-zinc-100 dark:bg-zinc-900/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-900/30",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="app-label">Train</div>
            <select className="app-input app-input-sm" value={fTrain} onChange={(e) => setFTrain(e.target.value as any)}>
              <option value="">All</option>
              {TRAIN_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="app-label">Route</div>
            <select className="app-input app-input-sm" value={fRoute} onChange={(e) => setFRoute(e.target.value as any)}>
              <option value="">All</option>
              {ROUTE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="app-label">Boarding</div>
            <select className="app-input app-input-sm" value={fBoarding} onChange={(e) => setFBoarding(e.target.value as any)}>
              <option value="">All</option>
              {BOARDING_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="app-label">Gender</div>
            <select className="app-input app-input-sm" value={fGender} onChange={(e) => setFGender(e.target.value as any)}>
              <option value="">All</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <div className="app-label">Travel Date</div>
            <input type="date" className="app-input app-input-sm" value={fTravelDate} onChange={(e) => setFTravelDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            className="app-btn app-btn-secondary h-10 px-4"
            onClick={() => {
              setQ("");
              setFTrain("");
              setFRoute("");
              setFBoarding("");
              setFGender("");
              setFTravelDate("");
              load(true);
            }}
            type="button"
          >
            Clear Filters
          </button>

          <button className="app-btn app-btn-primary h-10 px-4" onClick={() => load(true)} type="button">
            Search
          </button>
        </div>

        {/* PAGINATION */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Total: <span className="font-semibold">{total}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Rows:</div>
            <select
              className="app-input app-input-sm h-9"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </button>
            <div className="px-2 text-sm text-zinc-600 dark:text-zinc-400">
              Page <span className="font-semibold">{page}</span> / <span className="font-semibold">{totalPages}</span>
            </div>
            <button className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </button>

            <button className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={() => load(false)} disabled={loading} type="button">
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full overflow-x-auto mt-4">
          <table className="min-w-[1750px] table-fixed border-collapse text-xs">
            <thead className="thead">
              <tr>
                <th className="th w-12 px-2 py-2 text-center">
                  <input type="checkbox" checked={allCheckedOnPage} onChange={(e) => toggleAllOnPage(e.target.checked)} />
                </th>
                <th className="th w-14 px-2 py-2">S.No</th>
                <th className="th w-40 px-2 py-2">Name</th>
                <th className="th w-16 px-2 py-2">Age</th>
                <th className="th w-20 px-2 py-2">Gender</th>
                <th className="th w-24 px-2 py-2">Seat</th>
                <th className="th w-36 px-2 py-2">PNR</th>
                <th className="th w-56 px-2 py-2">Train</th>
                <th className="th w-28 px-2 py-2">Route</th>
                <th className="th w-28 px-2 py-2">Train Time</th>
                <th className="th w-28 px-2 py-2">Boarding</th>
                <th className="th w-28 px-2 py-2">Travel Date</th>
                <th className="th w-20 px-2 py-2">Fare</th>
                <th className="th w-28 px-2 py-2">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={14}>
                    Loading...
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={14}>
                    No records found.
                  </td>
                </tr>
              ) : (
                pageItems.map((r, i) => {
                  const serial = startIndex + i + 1;
                  return (
                    <tr key={r._id} className={["row", i % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                      <td className="td px-2 py-2 text-center">
                        <input type="checkbox" checked={!!selectedIds[r._id]} onChange={(e) => toggleOne(r._id, e.target.checked)} />
                      </td>

                      <td className="td px-2 py-2 text-center font-semibold">
                        <button
                          type="button"
                          className="rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                          title="Click to edit"
                          onClick={() => setEditing({ ...r, travelDate: toDateInputValue(r.travelDate) })}
                        >
                          {serial}
                        </button>
                      </td>

                      <td className="td px-2 py-2 font-medium whitespace-normal break-words">{r.name || "-"}</td>
                      <td className="td px-2 py-2">{r.age ?? "-"}</td>
                      <td className="td px-2 py-2">{r.gender || "-"}</td>
                      <td className="td px-2 py-2 whitespace-nowrap">{r.seatNumber || "-"}</td>
                      <td className="td px-2 py-2 whitespace-normal break-all">{r.pnrNumber || "-"}</td>
                      <td className="td px-2 py-2 whitespace-normal break-words">{r.trainName || "-"}</td>
                      <td className="td px-2 py-2">{r.route || "-"}</td>
                      <td className="td px-2 py-2">{r.trainTime || "-"}</td>
                      <td className="td px-2 py-2">{r.boardingStation || "-"}</td>
                      <td className="td px-2 py-2 whitespace-nowrap">{r.travelDate ? String(r.travelDate).slice(0, 10) : "-"}</td>
                      <td className="td px-2 py-2">{String((r as any).fare ?? "-")}</td>

                      <td className="td px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button className="app-btn app-btn-secondary h-8 px-2 text-[11px]" type="button" onClick={() => setEditing({ ...r, travelDate: toDateInputValue(r.travelDate) })}>
                            Edit
                          </button>
                          <button
                            className="h-8 rounded-xl border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30"
                            type="button"
                            onClick={() => onDelete(r._id)}
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
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Train Data</h3>
              <button onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40">
                ✕
              </button>
            </div>

            <form onSubmit={onSaveEdit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input className="app-input app-input-sm" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name *" required />

              <input
                className="app-input app-input-sm"
                value={editing.age === null || editing.age === undefined ? "" : String(editing.age)}
                onChange={(e) => setEditing({ ...editing, age: e.target.value ? Number(e.target.value) : (null as any) })}
                placeholder="Age *"
                inputMode="numeric"
                required
              />

              <select className="app-input app-input-sm" value={(editing.gender as any) || ""} onChange={(e) => setEditing({ ...editing, gender: e.target.value as any })} required>
                <option value="">Gender *</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Other">Other</option>
              </select>

              <input className="app-input app-input-sm" value={editing.seatNumber || ""} onChange={(e) => setEditing({ ...editing, seatNumber: e.target.value })} placeholder="Seat Number *" required />

              <input className="app-input app-input-sm" value={editing.pnrNumber || ""} onChange={(e) => setEditing({ ...editing, pnrNumber: e.target.value })} placeholder="PNR *" required />

              <select className="app-input app-input-sm" value={(editing.trainName as any) || ""} onChange={(e) => setEditing({ ...editing, trainName: e.target.value as any })} required>
                <option value="">Train Name *</option>
                {TRAIN_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select className="app-input app-input-sm" value={(editing.route as any) || ""} onChange={(e) => setEditing({ ...editing, route: e.target.value as any })} required>
                <option value="">Route *</option>
                {ROUTE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select className="app-input app-input-sm" value={editing.trainTime || ""} onChange={(e) => setEditing({ ...editing, trainTime: e.target.value })} required>
                <option value="">Train Time *</option>
                {TRAIN_TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select className="app-input app-input-sm" value={(editing.boardingStation as any) || ""} onChange={(e) => setEditing({ ...editing, boardingStation: e.target.value as any })} required>
                <option value="">Boarding Station *</option>
                {BOARDING_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <input type="date" className="app-input app-input-sm" value={(editing.travelDate as any) || ""} onChange={(e) => setEditing({ ...editing, travelDate: e.target.value })} required />

              {/* ✅ Fare in edit */}
              <input
                className="app-input app-input-sm"
                value={String((editing as any).fare ?? "")}
                onChange={(e) => setEditing({ ...editing, fare: e.target.value ? Number(e.target.value) : 0 } as any)}
                placeholder="Fare *"
                inputMode="decimal"
                required
              />

              <div className="sm:col-span-2 lg:col-span-3 mt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="app-btn app-btn-secondary h-10 px-4">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="app-btn app-btn-primary h-10 px-4">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

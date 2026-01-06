"use client";

import React from "react";

type Gender = "M" | "F" | "Other" | "";
type TrainName =
  | ""
  | "Shan-e-Punjab Express"
  | "Pathankot Express"
  | "Shatabdi Express"
  | "Jallianwala Bagh Express";
type RouteType = "" | "DLI-BEAS" | "BEAS-DLI";
type BoardingStation = "" | "New Delhi" | "Old Delhi";

type TrainRow = {
  _id: string;
  name: string;
  age?: number | null;
  gender?: Gender | string;
  seatNumber?: string;
  pnrNumber?: string;
  trainName?: TrainName | string;
  route?: RouteType | string;
  trainTime?: string; // dropdown later
  boardingStation?: BoardingStation | string;
  travelDate?: string | null; // YYYY-MM-DD or ISO
  createdAt?: string | null;
};

const TRAIN_OPTIONS: TrainName[] = [
  "Shan-e-Punjab Express",
  "Pathankot Express",
  "Shatabdi Express",
  "Jallianwala Bagh Express",
];
const ROUTE_OPTIONS: RouteType[] = ["DLI-BEAS", "BEAS-DLI"];
const BOARDING_OPTIONS: BoardingStation[] = ["New Delhi", "Old Delhi"];

// You said you will add train time values later:
const TRAIN_TIME_OPTIONS: string[] = []; // e.g. ["06:40 AM","07:10 AM"]

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

export default function TrainDataPage() {
  const [items, setItems] = React.useState<TrainRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // form
  const [form, setForm] = React.useState<Omit<TrainRow, "_id">>({
    name: "",
    age: null,
    gender: "",
    seatNumber: "",
    pnrNumber: "",
    trainName: "",
    route: "",
    trainTime: "",
    boardingStation: "",
    travelDate: todayISO(),
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
  const [fTravelDate, setFTravelDate] = React.useState(""); // YYYY-MM-DD

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

  function resetForm() {
    setForm({
      name: "",
      age: null,
      gender: "",
      seatNumber: "",
      pnrNumber: "",
      trainName: "",
      route: "",
      trainTime: "",
      boardingStation: "",
      travelDate: todayISO(),
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

      // keep selection only for existing ids
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

    const payload = {
      name: String(form.name || "").trim(),
      age: form.age === null || form.age === undefined ? null : Number(form.age),
      gender: String(form.gender || "").trim(),
      seatNumber: String(form.seatNumber || "").trim().toUpperCase(),
      pnrNumber: String(form.pnrNumber || "").trim(),
      trainName: String(form.trainName || "").trim(),
      route: String(form.route || "").trim(),
      trainTime: String(form.trainTime || "").trim(),
      boardingStation: String(form.boardingStation || "").trim(),
      travelDate: String(form.travelDate || "").slice(0, 10),
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

    const payload = {
      name: String(editing.name || "").trim(),
      age: editing.age === null || editing.age === undefined ? null : Number(editing.age),
      gender: String(editing.gender || "").trim(),
      seatNumber: String(editing.seatNumber || "").trim().toUpperCase(),
      pnrNumber: String(editing.pnrNumber || "").trim(),
      trainName: String(editing.trainName || "").trim(),
      route: String(editing.route || "").trim(),
      trainTime: String(editing.trainTime || "").trim(),
      boardingStation: String(editing.boardingStation || "").trim(),
      travelDate: String(editing.travelDate || "").slice(0, 10),
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
              <div class="row"><span class="label">Age/Gender:</span><span class="value">${escapeHtml(p.age ?? "-")} / ${escapeHtml(p.gender || "-")}</span></div>
              <div class="row"><span class="label">Seat:</span><span class="value">${escapeHtml(p.seatNumber || "-")}</span></div>
              <div class="row"><span class="label">PNR:</span><span class="value">${escapeHtml(p.pnrNumber || "-")}</span></div>
              <div class="row"><span class="label">Train:</span><span class="value">${escapeHtml(p.trainName || "-")}</span></div>
              <div class="row"><span class="label">Route:</span><span class="value">${escapeHtml(p.route || "-")}</span></div>
              <div class="row"><span class="label">Time:</span><span class="value">${escapeHtml(p.trainTime || "-")}</span></div>
              <div class="row"><span class="label">Boarding:</span><span class="value">${escapeHtml(p.boardingStation || "-")}</span></div>

              <div class="foot"><span>Travel Date: ${escapeHtml(dateStr)}</span></div>
            </div>
          `;
        })
        .join("");

      // Fill empty cells so grid is always 2x3
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

          html, body { margin:0; padding:0; font-family: Arial, sans-serif; }

          /* Each .page becomes one printed page */
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
            grid-template-rows: 1fr 1fr 1fr;
            gap: 8mm;
            width: 100%;
            height: 100%;
          }

          .ticket {
            border: 1.5px solid #111;
            border-radius: 10px;
            padding: 7mm;
            box-sizing: border-box;

            display:flex;
            flex-direction:column;

            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Empty cell just occupies space, no border */
          .ticket-empty {
            border: 0;
          }

          .head { display:flex; justify-content:space-between; align-items:center; margin-bottom: 4mm; }
          .title { font-size: 16pt; font-weight: 800; }
          .sn { font-size: 12pt; font-weight: 800; }

          .row {
            display:flex;
            gap: 8px;
            margin: 2mm 0;
            font-size: 13pt;
            line-height: 1.15;
          }
          .label { width: 42%; font-weight: 800; }
          .value { width: 58%; font-weight: 650; }

          .foot {
            margin-top: auto;
            border-top: 1px dashed #999;
            padding-top: 3mm;
            font-size: 12pt;
            font-weight: 800;
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
    ];
    const example = [
      "Sagar",
      30,
      "M",
      "A1",
      "1234567890",
      "Shan-e-Punjab Express",
      "DLI-BEAS",
      "",
      "New Delhi",
      todayISO(),
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample");
    XLSX.writeFile(wb, `train_data_sample_${todayISO()}.xlsx`);
  }

  // bulk upload
  async function onBulkUpload(file: File) {
    setBulkLoading(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];

      const normalized = rows.map((r) => ({
        name: r.name ?? r.Name ?? "",
        age: r.age ?? r.Age ?? "",
        gender: r.gender ?? r.Gender ?? "",
        seatNumber: r.seatNumber ?? r["Seat Number"] ?? r.seat ?? "",
        pnrNumber: r.pnrNumber ?? r.PNR ?? r.pnr ?? "",
        trainName: r.trainName ?? r.Train ?? "",
        route: r.route ?? r.Route ?? "",
        trainTime: r.trainTime ?? r["Train Time"] ?? "",
        boardingStation: r.boardingStation ?? r.Boarding ?? r["Boarding Station"] ?? "",
        travelDate: r.travelDate ?? r["Travel Date"] ?? r.date ?? "",
      }));

      const res = await fetch(`/api/train-data/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: normalized }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Bulk upload failed. ${JSON.stringify(json)}`);
        return;
      }

      alert(`Bulk upload done. Inserted: ${json.insertedCount}. Errors: ${json.errors?.length || 0}`);
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
              Add records, bulk upload via Excel, search/filter with suggestions, export, and print A4 tickets (6 per page, multi-page).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={downloadSampleExcel} className="app-btn app-btn-secondary h-10 px-4">
              Download Sample Excel
            </button>

            <label className="app-btn app-btn-secondary h-10 px-4 cursor-pointer">
              {bulkLoading ? "Uploading..." : "Bulk Upload Excel"}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onBulkUpload(f);
                  e.currentTarget.value = "";
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

        {/* FORM */}
        <form onSubmit={onCreate} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className="app-input app-input-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />

          <input
            className="app-input app-input-sm"
            value={form.age === null || form.age === undefined ? "" : String(form.age)}
            onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : null })}
            placeholder="Age"
            inputMode="numeric"
          />

          <select className="app-input app-input-sm" value={(form.gender as any) || ""} onChange={(e) => setForm({ ...form, gender: e.target.value as any })}>
            <option value="">Gender</option>
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="Other">Other</option>
          </select>

          <input className="app-input app-input-sm" value={form.seatNumber || ""} onChange={(e) => setForm({ ...form, seatNumber: e.target.value })} placeholder="Seat Number (A1, B12)" />

          <input className="app-input app-input-sm" value={form.pnrNumber || ""} onChange={(e) => setForm({ ...form, pnrNumber: e.target.value })} placeholder="PNR" />

          <select className="app-input app-input-sm" value={(form.trainName as any) || ""} onChange={(e) => setForm({ ...form, trainName: e.target.value as any })}>
            <option value="">Train Name</option>
            {TRAIN_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select className="app-input app-input-sm" value={(form.route as any) || ""} onChange={(e) => setForm({ ...form, route: e.target.value as any })}>
            <option value="">Route</option>
            {ROUTE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select className="app-input app-input-sm" value={form.trainTime || ""} onChange={(e) => setForm({ ...form, trainTime: e.target.value })}>
            <option value="">Train Time</option>
            {TRAIN_TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select className="app-input app-input-sm" value={(form.boardingStation as any) || ""} onChange={(e) => setForm({ ...form, boardingStation: e.target.value as any })}>
            <option value="">Boarding Station</option>
            {BOARDING_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="app-input app-input-sm"
            value={(form.travelDate as any) || ""}
            onChange={(e) => setForm({ ...form, travelDate: e.target.value })}
            placeholder="Travel Date"
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

        {/* FILTERS + SEARCH WITH SUGGESTIONS */}
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
          <table className="min-w-[1600px] table-fixed border-collapse text-xs">
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
                <th className="th w-28 px-2 py-2">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={13}>
                    Loading...
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={13}>
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

                      <td className="td px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            className="app-btn app-btn-secondary h-8 px-2 text-[11px]"
                            type="button"
                            onClick={() => setEditing({ ...r, travelDate: toDateInputValue(r.travelDate) })}
                          >
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
              <input className="app-input app-input-sm" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" />

              <input
                className="app-input app-input-sm"
                value={editing.age === null || editing.age === undefined ? "" : String(editing.age)}
                onChange={(e) => setEditing({ ...editing, age: e.target.value ? Number(e.target.value) : null })}
                placeholder="Age"
                inputMode="numeric"
              />

              <select className="app-input app-input-sm" value={(editing.gender as any) || ""} onChange={(e) => setEditing({ ...editing, gender: e.target.value as any })}>
                <option value="">Gender</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Other">Other</option>
              </select>

              <input className="app-input app-input-sm" value={editing.seatNumber || ""} onChange={(e) => setEditing({ ...editing, seatNumber: e.target.value })} placeholder="Seat Number (A1, B12)" />

              <input className="app-input app-input-sm" value={editing.pnrNumber || ""} onChange={(e) => setEditing({ ...editing, pnrNumber: e.target.value })} placeholder="PNR" />

              <select className="app-input app-input-sm" value={(editing.trainName as any) || ""} onChange={(e) => setEditing({ ...editing, trainName: e.target.value as any })}>
                <option value="">Train Name</option>
                {TRAIN_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select className="app-input app-input-sm" value={(editing.route as any) || ""} onChange={(e) => setEditing({ ...editing, route: e.target.value as any })}>
                <option value="">Route</option>
                {ROUTE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select className="app-input app-input-sm" value={editing.trainTime || ""} onChange={(e) => setEditing({ ...editing, trainTime: e.target.value })}>
                <option value="">Train Time</option>
                {TRAIN_TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                className="app-input app-input-sm"
                value={(editing.boardingStation as any) || ""}
                onChange={(e) => setEditing({ ...editing, boardingStation: e.target.value as any })}
              >
                <option value="">Boarding Station</option>
                {BOARDING_OPTIONS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className="app-input app-input-sm"
                value={(editing.travelDate as any) || ""}
                onChange={(e) => setEditing({ ...editing, travelDate: e.target.value })}
                placeholder="Travel Date"
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

"use client";

import React from "react";

type Category = "ladoo" | "parantha" | "bhati";
type GenderFilter = "Male" | "Female" | "Other" | "";

type ReportRow = {
  _id: string;

  customerName?: string;
  badgeNo?: string;
  fatherOrHusbandName?: string;
  gender?: string;
  age?: number | null;
  address?: string;
  mobile?: string;
  adhaarNumber?: string;

  mode?: string;

  bookingReqDelhiBeas?: string;
  bookingReqBeasDelhi?: string;
  ticketDelhiBeas?: string; // train-data _id OR old text
  ticketBeasDelhi?: string; // train-data _id OR old text

  payment?: string;

  jathaDate?: string; // YYYY-MM-DD
  travelStartDate?: string; // YYYY-MM-DD
  travelEndDate?: string; // YYYY-MM-DD

  notes?: string;
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
};

function inputCls() {
  return "app-input app-input-sm";
}
function normalizeId(x: any) {
  return (typeof x?._id === "string" ? x._id : x?._id?.toString?.() || String(x?._id)).trim();
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

/** ✅ show train ticket label with Age/Sex also */
function makeTicketLabel(t: TrainTicketRow) {
  const date = String(t.travelDate || "").slice(0, 10);
  const pnr = (t.pnrNumber || "").trim();
  const seat = (t.seatNumber || "").trim();

  const pname = (t.name || "").trim();
  const pAge = t.age ?? "";
  const pGender = (t.gender || "").trim();

  const train = (t.trainName || "").trim();
  const time = (t.trainTime || "").trim();
  const boarding = (t.boardingStation || "").trim();

  const pax = [pname, [pGender, pAge !== "" ? String(pAge) : ""].filter(Boolean).join("/")]
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
  ].filter(Boolean);

  return parts.join(" • ");
}

async function exportToExcel(rows: ReportRow[], filename: string) {
  const XLSX = await import("xlsx");

  const header = [
    "S.No",
    "Name",
    "Father/Husband",
    "Gender",
    "Age",
    "Mobile",
    "Address",
    "Badge",
    "Mode",
    "REQ D-B",
    "REQ B-D",
    "Ticket D-B",
    "Ticket B-D",
    "Payment",
    "Jatha Date",
    "Travel Start",
    "Travel End",
    "Notes",
  ];

  const aoa: any[][] = [header];
  rows.forEach((r, idx) => {
    aoa.push([
      idx + 1,
      r.customerName || "",
      r.fatherOrHusbandName || "",
      r.gender || "",
      r.age ?? "",
      r.mobile || "",
      r.address || "",
      r.badgeNo || "",
      r.mode || "",
      r.bookingReqDelhiBeas || "",
      r.bookingReqBeasDelhi || "",
      r.ticketDelhiBeas || "",
      r.ticketBeasDelhi || "",
      r.payment || "",
      r.jathaDate || "",
      r.travelStartDate || "",
      r.travelEndDate || "",
      r.notes || "",
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reports");
  XLSX.writeFile(wb, filename);
}

export default function ReportsPage() {
  const [tab, setTab] = React.useState<Category>("ladoo");

  // filters
  const [q, setQ] = React.useState("");
  const [name, setName] = React.useState("");
  const [badgeNo, setBadgeNo] = React.useState("");
  const [gender, setGender] = React.useState<GenderFilter>("");

  const [jathaFrom, setJathaFrom] = React.useState("");
  const [jathaTo, setJathaTo] = React.useState("");

  const [travelFrom, setTravelFrom] = React.useState("");
  const [travelTo, setTravelTo] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [rawItems, setRawItems] = React.useState<ReportRow[]>([]);
  const [exporting, setExporting] = React.useState<"filtered" | "all" | null>(null);
  const [printing, setPrinting] = React.useState(false);

  // Train ticket label maps (to show full ticket info instead of id)
  const [trainDliBeas, setTrainDliBeas] = React.useState<TrainTicketRow[]>([]);
  const [trainBeasDli, setTrainBeasDli] = React.useState<TrainTicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = React.useState(true);

  const ticketLabelMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const t of trainDliBeas) m.set(String(t._id), makeTicketLabel(t));
    for (const t of trainBeasDli) m.set(String(t._id), makeTicketLabel(t));
    return m;
  }, [trainDliBeas, trainBeasDli]);

  /** ✅ FIX: show full label if id exists, else show text fallback */
  function renderTicket(v?: string) {
    const s = String(v || "").trim();
    if (!s) return "-";
    if (isObjectIdLike(s)) return ticketLabelMap.get(s) || s; // if label not loaded, show id (better than blank)
    return s;
  }

  // ✅ FIX: Gender filter mismatch -> DO FILTER CLIENT-SIDE (supports M/F/Male/Female)
  const items = React.useMemo(() => {
    if (!gender) return rawItems;

    const want =
      gender === "Male" ? "male" : gender === "Female" ? "female" : gender === "Other" ? "other" : "unknown";

    return rawItems.filter((r) => normGender(r.gender) === want);
  }, [rawItems, gender]);

  // Load train tickets once (for readable labels)
  async function loadTrainTickets() {
    setLoadingTickets(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/train-data?route=${encodeURIComponent("DLI-BEAS")}&limit=10000`, { cache: "no-store" }),
        fetch(`/api/train-data?route=${encodeURIComponent("BEAS-DLI")}&limit=10000`, { cache: "no-store" }),
      ]);

      const [d1, d2] = await Promise.all([res1.json().catch(() => ({})), res2.json().catch(() => ({}))]);

      const list1: TrainTicketRow[] = (d1.items || []).map((x: any) => ({
        ...x,
        _id: normalizeId(x),
        travelDate: String(x.travelDate || "").slice(0, 10),
        name: x.name || "",
        age: x.age ?? null,
        gender: x.gender || "",
        seatNumber: x.seatNumber || "",
        pnrNumber: x.pnrNumber || "",
        trainName: x.trainName || "",
        trainTime: x.trainTime || "",
        boardingStation: x.boardingStation || "",
        route: x.route || "",
      }));

      const list2: TrainTicketRow[] = (d2.items || []).map((x: any) => ({
        ...x,
        _id: normalizeId(x),
        travelDate: String(x.travelDate || "").slice(0, 10),
        name: x.name || "",
        age: x.age ?? null,
        gender: x.gender || "",
        seatNumber: x.seatNumber || "",
        pnrNumber: x.pnrNumber || "",
        trainName: x.trainName || "",
        trainTime: x.trainTime || "",
        boardingStation: x.boardingStation || "",
        route: x.route || "",
      }));

      setTrainDliBeas(list1);
      setTrainBeasDli(list2);
    } finally {
      setLoadingTickets(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("category", tab);

      if (q.trim()) params.set("q", q.trim());
      if (name.trim()) params.set("name", name.trim());
      if (badgeNo.trim()) params.set("badgeNo", badgeNo.trim());

      // ✅ DO NOT send gender to API (backend may be M/F). We filter client-side.
      // if (gender) params.set("gender", gender);

      if (jathaFrom) params.set("jathaFrom", jathaFrom);
      if (jathaTo) params.set("jathaTo", jathaTo);

      if (travelFrom) params.set("travelFrom", travelFrom);
      if (travelTo) params.set("travelTo", travelTo);

      params.set("limit", "10000");

      const res = await fetch(`/api/reports/nominal-roll?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setRawItems(Array.isArray(data.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadTrainTickets();
  }, []);

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function clearFilters() {
    setQ("");
    setName("");
    setBadgeNo("");
    setGender("");
    setJathaFrom("");
    setJathaTo("");
    setTravelFrom("");
    setTravelTo("");
  }

  // ✅ Summary counts after each search result + payment sum (based on FILTERED items)
  const summary = React.useMemo(() => {
    let male = 0;
    let female = 0;
    let other = 0;
    let paymentSum = 0;

    for (const r of items) {
      const g = normGender(r.gender);
      if (g === "male") male++;
      else if (g === "female") female++;
      else if (g === "other") other++;
      paymentSum += paymentToNumber(r.payment);
    }

    return { total: items.length, male, female, other, paymentSum };
  }, [items]);

  // Export with labels (replace ticket ids with readable label)
  function rowsForExport(rows: ReportRow[]) {
    return rows.map((r) => ({
      ...r,
      ticketDelhiBeas: renderTicket(r.ticketDelhiBeas),
      ticketBeasDelhi: renderTicket(r.ticketBeasDelhi),
      jathaDate: formatDDMonYYYY(r.jathaDate),
      travelStartDate: formatDDMonYYYY(r.travelStartDate),
      travelEndDate: formatDDMonYYYY(r.travelEndDate),
    }));
  }

  async function onExportFiltered() {
    setExporting("filtered");
    try {
      await exportToExcel(rowsForExport(items), `${tab}_reports_filtered_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

      // NOTE: export all ignores client-side gender filter (as expected for "All")
      const allWithLabels = rowsForExport(all);

      await exportToExcel(allWithLabels, `${tab}_reports_all_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(null);
    }
  }

  const showTravelCols = tab !== "bhati";

  // -------- PRINT TICKETS (6 per A4 page, multi-page) --------
  function buildTicketsHtml(rows: ReportRow[]) {
    const chunkSize = 6;
    const pages: string[] = [];

    const cardsForChunk = (chunk: ReportRow[], offset: number) =>
      chunk
        .map((r, idx) => {
          const sn = offset + idx + 1;

          const name = escapeHtml(r.customerName || "-");
          const badge = escapeHtml(r.badgeNo || "-");
          const mobile = escapeHtml(r.mobile || "-");
          const gender = escapeHtml(r.gender || "-");
          const age = escapeHtml(r.age ?? "-");
          const father = escapeHtml(r.fatherOrHusbandName || "-");
          const mode = escapeHtml(r.mode || "-");
          const jd = escapeHtml(formatDDMonYYYY(r.jathaDate) || "-");

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
            
              <div class="row"><span class="label">Jatha:</span><span class="value">${jd}</span></div>

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

              <!-- ✅ Small contact line -->
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
            grid-template-rows: 1fr 1fr 1fr;
            gap: 7mm;
            width: 100%;
            height: 100%;
          }

          .ticket {
            border: 1.2px solid #111;
            border-radius: 10px;
            padding: 6mm;
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
            margin: 1.5mm 0;
            font-size: 11pt;
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

          /* ✅ Small contact */
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

  return (
    <div className="app-page w-full max-w-none">
      <div className="app-card app-card-pad w-full max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Reports</h1>
            <p className="app-subtitle">
              View Nominal Roll data for Ladoo / Parantha / Bhati with filters and Excel export.
              {loadingTickets ? " (Loading ticket labels...)" : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onExportFiltered} disabled={exporting !== null} className="app-btn app-btn-secondary h-10 px-4">
              {exporting === "filtered" ? "Exporting..." : "Export Filtered"}
            </button>
            <button onClick={onExportAll} disabled={exporting !== null} className="app-btn app-btn-secondary h-10 px-4">
              {exporting === "all" ? "Exporting..." : "Export All"}
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
            <div className="app-label">Search (Name/Badge/Mobile/Aadhaar)</div>
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
            <div className="app-label">Gender</div>
            <select className={inputCls()} value={gender} onChange={(e) => setGender(e.target.value as any)}>
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              (Works for values: M/F/Male/Female)
            </div>
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
            <div className="app-label">Travel From {tab === "bhati" ? "(uses Jatha Date)" : ""}</div>
            <input type="date" className={inputCls()} value={travelFrom} onChange={(e) => setTravelFrom(e.target.value)} />
          </div>

          <div>
            <div className="app-label">Travel To {tab === "bhati" ? "(uses Jatha Date)" : ""}</div>
            <input type="date" className={inputCls()} value={travelTo} onChange={(e) => setTravelTo(e.target.value)} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button type="button" className="app-btn app-btn-secondary h-10 px-4" onClick={clearFilters}>
            Clear Filters
          </button>
          <button type="button" className="app-btn app-btn-primary h-10 px-4" onClick={load}>
            Search
          </button>
        </div>

        {/* ✅ SUMMARY (Counts + Payment Sum) */}
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
          <div className="ml-auto">
            <span className="font-semibold">Payment Sum:</span> {summary.paymentSum}
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto mt-4">
          <table className="min-w-[1900px] table-fixed border-collapse text-xs">
            <thead className="thead">
              <tr>
                {/* ORDER as requested */}
                <th className="th w-14 px-2 py-2">S.No</th>
                <th className="th w-48 px-2 py-2">Name</th>
                <th className="th w-48 px-2 py-2">Father/Husband</th>
                <th className="th w-24 px-2 py-2">Gender</th>
                <th className="th w-16 px-2 py-2">Age</th>
                <th className="th w-32 px-2 py-2">Mobile</th>
                <th className="th w-72 px-2 py-2">Address</th>
                <th className="th w-28 px-2 py-2">Badge</th>
                <th className="th w-20 px-2 py-2">Mode</th>

                {/* rest */}
                <th className="th w-20 px-2 py-2">REQ D-B</th>
                <th className="th w-20 px-2 py-2">REQ B-D</th>
                <th className="th w-[520px] px-2 py-2">Ticket D-B</th>
                <th className="th w-[520px] px-2 py-2">Ticket B-D</th>
                <th className="th w-32 px-2 py-2">Payment</th>
                <th className="th w-28 px-2 py-2">Jatha Date</th>

                {showTravelCols && <th className="th w-28 px-2 py-2">Start</th>}
                {showTravelCols && <th className="th w-28 px-2 py-2">End</th>}

                <th className="th w-64 px-2 py-2">Notes</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={showTravelCols ? 18 : 16}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="td px-2 py-2 text-zinc-600 dark:text-zinc-400" colSpan={showTravelCols ? 18 : 16}>
                    No records found.
                  </td>
                </tr>
              ) : (
                items.map((r, i) => (
                  <tr key={r._id} className={["row", i % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                    <td className="td px-2 py-2">{i + 1}</td>
                    <td className="td px-2 py-2 font-medium whitespace-normal break-words">{r.customerName || "-"}</td>
                    <td className="td px-2 py-2 whitespace-normal break-words">{r.fatherOrHusbandName || "-"}</td>
                    <td className="td px-2 py-2">{r.gender || "-"}</td>
                    <td className="td px-2 py-2">{r.age ?? "-"}</td>
                    <td className="td px-2 py-2">{r.mobile || "-"}</td>
                    <td className="td px-2 py-2 whitespace-normal break-words">{r.address || "-"}</td>
                    <td className="td px-2 py-2">{r.badgeNo || "-"}</td>
                    <td className="td px-2 py-2">{r.mode || "-"}</td>

                    <td className="td px-2 py-2">{r.bookingReqDelhiBeas || "-"}</td>
                    <td className="td px-2 py-2">{r.bookingReqBeasDelhi || "-"}</td>

                    {/* ✅ now shows full label if ticket id exists */}
                    <td className="td px-2 py-2 whitespace-normal break-words">{renderTicket(r.ticketDelhiBeas)}</td>
                    <td className="td px-2 py-2 whitespace-normal break-words">{renderTicket(r.ticketBeasDelhi)}</td>

                    <td className="td px-2 py-2">{r.payment || "-"}</td>
                    <td className="td px-2 py-2 whitespace-nowrap">{formatDDMonYYYY(toYMD(r.jathaDate)) || "-"}</td>

                    {showTravelCols && (
                      <td className="td px-2 py-2 whitespace-nowrap">{formatDDMonYYYY(toYMD(r.travelStartDate)) || "-"}</td>
                    )}
                    {showTravelCols && (
                      <td className="td px-2 py-2 whitespace-nowrap">{formatDDMonYYYY(toYMD(r.travelEndDate)) || "-"}</td>
                    )}

                    <td className="td px-2 py-2 whitespace-normal break-words">{r.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

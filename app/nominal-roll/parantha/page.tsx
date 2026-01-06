"use client";

import React from "react";

type YesNo = "Yes" | "No" | "";
type Mode = "Train" | "Bus" | "Self" | "";

// Train routes (must match train-data route values)
type RouteType = "DLI-BEAS" | "BEAS-DLI";

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
};

type JathaDate = {
  _id: string;
  travelDate: string; // YYYY-MM-DD
  notes?: string;
};

// Train data row (for ticket dropdown)
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

type NominalParanthaRow = {
  _id: string;

  // snapshot of customer data
  customerId: string;
  customerName: string;
  badgeNo?: string;
  fatherOrHusbandName?: string;
  gender?: string;
  age?: number | null;
  address?: string;
  mobile?: string;
  adhaarNumber?: string;

  // user-fill fields
  mode: Mode | string;

  bookingReqDelhiBeas: YesNo;
  bookingReqBeasDelhi: YesNo;

  // store selected train-data _id
  ticketDelhiBeas: string;
  ticketBeasDelhi: string;

  payment: string;

  jathaDateId: string;
  jathaDate: string; // YYYY-MM-DD

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

function makeTicketLabel(t: TrainTicketRow) {
  const date = String(t.travelDate || "").slice(0, 10);
  const pnr = (t.pnrNumber || "").trim();
  const seat = (t.seatNumber || "").trim();
  const train = (t.trainName || "").trim();
  const time = (t.trainTime || "").trim();
  const boarding = (t.boardingStation || "").trim();

  const ageSex = `${t.age ?? "-"} / ${t.gender || "-"}`;

  const parts = [
    date || "---- -- --",
    seat ? `Seat:${seat}` : "",
    pnr ? `PNR:${pnr}` : "",
    ageSex ? `Age/Sex:${ageSex}` : "",
    train ? train : "",
    time ? time : "",
    boarding ? `(${boarding})` : "",
  ].filter(Boolean);

  return parts.join(" • ");
}

export default function ParanthaNominalRollPage() {
  // customer search
  const [search, setSearch] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  // jatha dates dropdown (Parantha)
  const [jathaDates, setJathaDates] = React.useState<JathaDate[]>([]);
  const [loadingJatha, setLoadingJatha] = React.useState(true);

  // Train tickets dropdown data
  const [trainDliBeas, setTrainDliBeas] = React.useState<TrainTicketRow[]>([]);
  const [trainBeasDli, setTrainBeasDli] = React.useState<TrainTicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = React.useState(true);

  // create form fields
  const [mode, setMode] = React.useState<Mode>("");

  const [bookingDelhiBeas, setBookingDelhiBeas] = React.useState<YesNo>("");
  const [bookingBeasDelhi, setBookingBeasDelhi] = React.useState<YesNo>("");

  const [ticketDelhiBeas, setTicketDelhiBeas] = React.useState("");
  const [ticketBeasDelhi, setTicketBeasDelhi] = React.useState("");

  const [payment, setPayment] = React.useState("");
  const [jathaDateId, setJathaDateId] = React.useState("");
  const [travelStartDate, setTravelStartDate] = React.useState("");
  const [travelEndDate, setTravelEndDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // list + edit
  const [items, setItems] = React.useState<NominalParanthaRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [editing, setEditing] = React.useState<NominalParanthaRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Only Train should allow Booking REQ + Ticket fields
  const isTrainMode = mode === "Train";
  const isEditTrainMode = (editing?.mode || "") === "Train";

  // Build maps so table can show labels instead of raw ids
  const ticketLabelMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const t of trainDliBeas) m.set(t._id, makeTicketLabel(t));
    for (const t of trainBeasDli) m.set(t._id, makeTicketLabel(t));
    return m;
  }, [trainDliBeas, trainBeasDli]);

  function renderTicketValue(v: string) {
    const s = String(v || "").trim();
    if (!s) return "-";
    return ticketLabelMap.get(s) || s;
  }

  // ✅ hide already-assigned tickets from dropdown (based on current items)
  const usedDelhiBeas = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of items) if (r.ticketDelhiBeas) s.add(String(r.ticketDelhiBeas));
    return s;
  }, [items]);

  const usedBeasDelhi = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of items) if (r.ticketBeasDelhi) s.add(String(r.ticketBeasDelhi));
    return s;
  }, [items]);

  // When mode is NOT Train, clear booking/ticket fields in create form
  React.useEffect(() => {
    if (!isTrainMode) {
      setBookingDelhiBeas("");
      setBookingBeasDelhi("");
      setTicketDelhiBeas("");
      setTicketBeasDelhi("");
    }
  }, [isTrainMode]);

  // When edit mode is NOT Train, clear booking/ticket fields in edit modal
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

  async function loadJathaDates() {
    setLoadingJatha(true);
    try {
      const res = await fetch("/api/jatha-date?category=Parantha", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const list = (data.items || []).map((x: any) => ({
        ...x,
        _id: normalizeId(x),
        travelDate: String(x.travelDate || "").slice(0, 10),
      }));
      setJathaDates(list);
    } finally {
      setLoadingJatha(false);
    }
  }

  // Load Train Data as ticket dropdown options (by route)
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
        age: x.age ?? null,
        gender: x.gender || "",
      }));

      const list2: TrainTicketRow[] = (d2.items || []).map((x: any) => ({
        ...x,
        _id: normalizeId(x),
        travelDate: String(x.travelDate || "").slice(0, 10),
        age: x.age ?? null,
        gender: x.gender || "",
      }));

      setTrainDliBeas(list1);
      setTrainBeasDli(list2);
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

      const list = (data.items || []).map((x: any) => ({
        _id: normalizeId(x),
        name: x.name || "",
        badgeNo: x.badgeNo || "",
        fatherOrHusbandName: x.fatherOrHusbandName || "",
        gender: x.gender || "",
        age: x.age ?? null,
        address: x.address || "",
        mobile: x.mobile || "",
        adhaarNumber: x.adhaarNumber || "",
      }));

      setResults(list);
    } finally {
      setSearching(false);
    }
  }

  function resetForm() {
    setSelectedCustomer(null);
    setResults([]);
    setSearch("");

    setMode("");
    setBookingDelhiBeas("");
    setBookingBeasDelhi("");
    setTicketDelhiBeas("");
    setTicketBeasDelhi("");

    setPayment("");
    setJathaDateId("");
    setTravelStartDate("");
    setTravelEndDate("");
    setNotes("");
  }

  function validateCreate() {
    if (!selectedCustomer?._id) return "Please search and select a customer first.";
    if (!jathaDateId) return "Jatha date is required.";
    if (!mode) return "Mode is required.";

    if (mode === "Train") {
      if (!bookingDelhiBeas) return "Booking REQ (Delhi–Beas) is required.";
      if (!bookingBeasDelhi) return "Booking REQ (Beas–Delhi) is required.";
    }

    if (!payment.trim()) return "Payment is required.";
    if (!travelStartDate) return "Travel start date is required.";
    if (!travelEndDate) return "Travel end date is required.";
    return "";
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const err = validateCreate();
    if (err) return alert(err);

    const jd = jathaDates.find((x) => x._id === jathaDateId);

    setSaving(true);
    try {
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

        mode,

        bookingReqDelhiBeas: mode === "Train" ? bookingDelhiBeas : "",
        bookingReqBeasDelhi: mode === "Train" ? bookingBeasDelhi : "",

        ticketDelhiBeas: mode === "Train" ? ticketDelhiBeas : "",
        ticketBeasDelhi: mode === "Train" ? ticketBeasDelhi : "",

        payment: payment.trim(),

        jathaDateId,
        jathaDate: jd?.travelDate || "",

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
        alert(`Create failed (${res.status}). ${data?.error || "Error"}`);
        return;
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

    if (!editing.jathaDateId) return alert("Jatha date is required.");
    if (!editing.mode) return alert("Mode is required.");

    if (String(editing.mode) === "Train") {
      if (!editing.bookingReqDelhiBeas) return alert("Booking REQ (Delhi–Beas) is required.");
      if (!editing.bookingReqBeasDelhi) return alert("Booking REQ (Beas–Delhi) is required.");
    }

    if (!editing.payment.trim()) return alert("Payment is required.");
    if (!editing.travelStartDate) return alert("Travel start date is required.");
    if (!editing.travelEndDate) return alert("Travel end date is required.");

    const realId = encodeURIComponent(String(editing._id).trim());
    const jd = jathaDates.find((x) => x._id === editing.jathaDateId);

    setSaving(true);
    try {
      const res = await fetch(`/api/nominal-roll/parantha/${realId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: editing.mode,

          bookingReqDelhiBeas: String(editing.mode) === "Train" ? editing.bookingReqDelhiBeas : "",
          bookingReqBeasDelhi: String(editing.mode) === "Train" ? editing.bookingReqBeasDelhi : "",

          ticketDelhiBeas: String(editing.mode) === "Train" ? String(editing.ticketDelhiBeas || "").trim() : "",
          ticketBeasDelhi: String(editing.mode) === "Train" ? String(editing.ticketBeasDelhi || "").trim() : "",

          payment: editing.payment.trim(),

          jathaDateId: editing.jathaDateId,
          jathaDate: jd?.travelDate || "",

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

  return (
    <div>
      <h2 className="text-lg font-semibold">Parantha</h2>
      <p className="app-subtitle mt-1">Search customer → select → fill details → save.</p>

      {/* Create Form */}
      <form onSubmit={onCreate} className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Search */}
          <div className="lg:col-span-5">
            <div className="app-label">Search Customer (Name / Mobile / Aadhaar)</div>
            <div className="flex gap-2">
              <input className={inputCls()} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type name / mobile / aadhaar" />
              <button type="button" onClick={doCustomerSearch} disabled={searching || !search.trim()} className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60">
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-2 rounded-xl border border-black/5 bg-white p-2 text-sm dark:border-white/10 dark:bg-zinc-950">
                <div className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">Search Results</div>
                <div className="max-h-56 overflow-auto">
                  {results.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => setSelectedCustomer(c)}
                      className={["w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-white/5", selectedCustomer?._id === c._id ? "bg-zinc-50 dark:bg-white/5" : ""].join(" ")}
                    >
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        Mobile: {c.mobile || "-"} • Aadhaar: {c.adhaarNumber || "-"} • Badge: {c.badgeNo || "-"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 rounded-xl border border-black/5 bg-zinc-50 p-3 text-sm dark:border-white/10 dark:bg-black/30">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Selected Data</div>
              <div className="mt-1">
                <div className="font-semibold">{selectedCustomer?.name || "-"}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Father/Husband: {selectedCustomer?.fatherOrHusbandName || "-"} • Gender/Age: {(selectedCustomer?.gender || "-") + " / " + (selectedCustomer?.age ?? "-")}
                </div>
              </div>
            </div>
          </div>

          {/* Core selections */}
          <div className="lg:col-span-2">
            <div className="app-label">Jatha Date (Parantha) *</div>
            <select className={inputCls()} value={jathaDateId} onChange={(e) => setJathaDateId(e.target.value)} disabled={loadingJatha}>
              <option value="">{loadingJatha ? "Loading..." : "Select date"}</option>
              {jathaDates.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.travelDate}
                </option>
              ))}
            </select>

            <div className="app-label mt-3">Mode *</div>
            <select className={inputCls()} value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="">Select</option>
              <option value="Train">Train</option>
              <option value="Bus">Bus</option>
              <option value="Self">Self</option>
            </select>

            <div className="app-label mt-3">Payment *</div>
            <input className={inputCls()} value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="e.g., Paid / 500 / Pending" />
          </div>

          {/* Booking req */}
          <div className="lg:col-span-2">
            <div className="app-label">Booking REQ (Delhi–Beas) {isTrainMode ? "*" : ""}</div>
            <select className={inputCls()} value={bookingDelhiBeas} onChange={(e) => setBookingDelhiBeas(e.target.value as any)} disabled={!isTrainMode}>
              <option value="">{isTrainMode ? "Select" : "Disabled"}</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>

            <div className="app-label mt-3">Booking REQ (Beas–Delhi) {isTrainMode ? "*" : ""}</div>
            <select className={inputCls()} value={bookingBeasDelhi} onChange={(e) => setBookingBeasDelhi(e.target.value as any)} disabled={!isTrainMode}>
              <option value="">{isTrainMode ? "Select" : "Disabled"}</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Tickets */}
          <div className="lg:col-span-3">
            <div className="app-label">Ticket (Delhi–Beas)</div>
            <select className={inputCls()} value={ticketDelhiBeas} onChange={(e) => setTicketDelhiBeas(e.target.value)} disabled={!isTrainMode || loadingTickets}>
              <option value="">{!isTrainMode ? "Disabled" : loadingTickets ? "Loading..." : "Select ticket"}</option>
              {trainDliBeas
                .filter((t) => !usedDelhiBeas.has(t._id)) // ✅ hide used tickets
                .map((t) => (
                  <option key={t._id} value={t._id}>
                    {makeTicketLabel(t)}
                  </option>
                ))}
            </select>

            <div className="app-label mt-3">Ticket (Beas–Delhi)</div>
            <select className={inputCls()} value={ticketBeasDelhi} onChange={(e) => setTicketBeasDelhi(e.target.value)} disabled={!isTrainMode || loadingTickets}>
              <option value="">{!isTrainMode ? "Disabled" : loadingTickets ? "Loading..." : "Select ticket"}</option>
              {trainBeasDli
                .filter((t) => !usedBeasDelhi.has(t._id)) // ✅ hide used tickets
                .map((t) => (
                  <option key={t._id} value={t._id}>
                    {makeTicketLabel(t)}
                  </option>
                ))}
            </select>

            <div className="mt-2 flex items-center justify-end">
              <button type="button" className="app-btn app-btn-secondary h-9 px-3 text-xs" onClick={loadTrainTickets} disabled={loadingTickets}>
                {loadingTickets ? "Refreshing..." : "Refresh Tickets"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="app-label">Travel Start Date *</div>
            <input type="date" className={inputCls()} value={travelStartDate} onChange={(e) => setTravelStartDate(e.target.value)} />
          </div>
          <div>
            <div className="app-label">Travel End Date *</div>
            <input type="date" className={inputCls()} value={travelEndDate} onChange={(e) => setTravelEndDate(e.target.value)} />
          </div>
        </div>

        <div className="mt-4">
          <div className="app-label">Notes</div>
          <textarea className="app-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button type="submit" disabled={saving} className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60">
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={resetForm} className="app-btn app-btn-secondary h-10 px-4">
            Clear
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="table-shell mt-6">
        <table className="table">
          <thead className="thead">
            <tr>
              {[
                "S.No",
                "Name",
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
                "Payment",
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
                <td className="td text-zinc-600 dark:text-zinc-400" colSpan={18}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="td text-zinc-600 dark:text-zinc-400" colSpan={18}>
                  No records found.
                </td>
              </tr>
            ) : (
              items.map((r, idx) => (
                <tr key={r._id} className={["row", idx % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                  <td className="td">{idx + 1}</td>
                  <td className="td font-medium">{r.customerName || "-"}</td>
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

                  <td className="td">{r.payment}</td>
                  <td className="td">{r.jathaDate || "-"}</td>
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
                            travelStartDate: String(r.travelStartDate || "").slice(0, 10),
                            travelEndDate: String(r.travelEndDate || "").slice(0, 10),
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit (Parantha Nominal Roll)</h3>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40">
                ✕
              </button>
            </div>

            <form onSubmit={onSaveEdit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="app-label">Jatha Date *</div>
                <select className={inputCls()} value={editing.jathaDateId} onChange={(e) => setEditing({ ...editing, jathaDateId: e.target.value })}>
                  <option value="">Select date</option>
                  {jathaDates.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.travelDate}
                    </option>
                  ))}
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
                <div className="app-label">Payment *</div>
                <input className={inputCls()} value={editing.payment} onChange={(e) => setEditing({ ...editing, payment: e.target.value })} />
              </div>

              <div>
                <div className="app-label">REQ (Delhi–Beas) {isEditTrainMode ? "*" : ""}</div>
                <select className={inputCls()} value={editing.bookingReqDelhiBeas} onChange={(e) => setEditing({ ...editing, bookingReqDelhiBeas: e.target.value as any })} disabled={!isEditTrainMode}>
                  <option value="">{isEditTrainMode ? "Select" : "Disabled"}</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <div className="app-label">REQ (Beas–Delhi) {isEditTrainMode ? "*" : ""}</div>
                <select className={inputCls()} value={editing.bookingReqBeasDelhi} onChange={(e) => setEditing({ ...editing, bookingReqBeasDelhi: e.target.value as any })} disabled={!isEditTrainMode}>
                  <option value="">{isEditTrainMode ? "Select" : "Disabled"}</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <div className="app-label">Ticket (Delhi–Beas)</div>
                <select
                  className={inputCls()}
                  value={String(editing.ticketDelhiBeas || "")}
                  onChange={(e) => setEditing({ ...editing, ticketDelhiBeas: e.target.value })}
                  disabled={!isEditTrainMode || loadingTickets}
                >
                  <option value="">{!isEditTrainMode ? "Disabled" : loadingTickets ? "Loading..." : "Select ticket"}</option>
                  {trainDliBeas
                    .filter((t) => !usedDelhiBeas.has(t._id) || t._id === String(editing.ticketDelhiBeas || "")) // allow current ticket
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        {makeTicketLabel(t)}
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
                  disabled={!isEditTrainMode || loadingTickets}
                >
                  <option value="">{!isEditTrainMode ? "Disabled" : loadingTickets ? "Loading..." : "Select ticket"}</option>
                  {trainBeasDli
                    .filter((t) => !usedBeasDelhi.has(t._id) || t._id === String(editing.ticketBeasDelhi || "")) // allow current ticket
                    .map((t) => (
                      <option key={t._id} value={t._id}>
                        {makeTicketLabel(t)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <div className="app-label">Start *</div>
                <input type="date" className={inputCls()} value={editing.travelStartDate} onChange={(e) => setEditing({ ...editing, travelStartDate: e.target.value })} />
              </div>

              <div>
                <div className="app-label">End *</div>
                <input type="date" className={inputCls()} value={editing.travelEndDate} onChange={(e) => setEditing({ ...editing, travelEndDate: e.target.value })} />
              </div>

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
    </div>
  );
}

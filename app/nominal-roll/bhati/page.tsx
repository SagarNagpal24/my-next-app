"use client";

import React from "react";

type Mode = "Bus" | "Self" | "";

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
  sangat?: string;
};

type JathaDate = {
  _id: string;
  travelDate: string; // YYYY-MM-DD
  notes?: string;
};

type NominalBhatiRow = {
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
  sangat?: string;

  mode: Mode | string;

  payment: string; // optional now

  jathaDateId: string;
  jathaDate: string; // YYYY-MM-DD

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

export default function BhatiNominalRollPage() {
  // customer search
  const [search, setSearch] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  // jatha dates dropdown (Bhati)
  const [jathaDates, setJathaDates] = React.useState<JathaDate[]>([]);
  const [loadingJatha, setLoadingJatha] = React.useState(true);

  // create form
  const [mode, setMode] = React.useState<Mode>("");
  const [payment, setPayment] = React.useState(""); // optional
  const [jathaDateId, setJathaDateId] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // ✅ NEW: department + sangat
  const [department, setDepartment] = React.useState("");
  const [sangat, setSangat] = React.useState("");

  // list + edit
  const [items, setItems] = React.useState<NominalBhatiRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [editing, setEditing] = React.useState<NominalBhatiRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  // ✅ Table filters
  const [tableQ, setTableQ] = React.useState("");
  const [tableDept, setTableDept] = React.useState("");
  const [tableMode, setTableMode] = React.useState<Mode | "">("");
  const [tableSangat, setTableSangat] = React.useState("");
  const [tableJathaId, setTableJathaId] = React.useState("");

  const DEPARTMENT_OPTIONS = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((r) => {
      const d = (r.department || "").trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = React.useMemo(() => {
    const q = tableQ.trim().toLowerCase();
    return items.filter((r) => {
      if (tableDept && (r.department || "").trim() !== tableDept) return false;
      if (tableMode && (r.mode || "").trim() !== tableMode) return false;
      if (tableSangat && (r.sangat || "").trim() !== tableSangat) return false;
      if (tableJathaId && (r.jathaDateId || "").trim() !== tableJathaId) return false;
      if (!q) return true;
      const hay = [
        r.customerName, r.fatherOrHusbandName, r.mobile, r.adhaarNumber,
        r.badgeNo, r.department, r.sangat, r.mode, r.payment,
        r.jathaDate, r.notes,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, tableQ, tableDept, tableMode, tableSangat, tableJathaId]);

  async function loadJathaDates() {
    setLoadingJatha(true);
    try {
      const res = await fetch("/api/jatha-date?category=Bhati", { cache: "no-store" });
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

  async function loadNominal() {
    setLoading(true);
    try {
      const res = await fetch("/api/nominal-roll/bhati", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      setItems(
        (data.items || []).map((x: any) => ({
          ...x,
          _id: normalizeId(x),
          customerId: String(x.customerId || "").trim(),
          jathaDateId: String(x.jathaDateId || "").trim(),
          jathaDate: String(x.jathaDate || "").slice(0, 10),
          payment: String(x.payment || ""),
          notes: String(x.notes || ""),
          department: String(x.department || ""),
          sangat: String(x.sangat || ""),
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadJathaDates();
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
        department: x.department || "",
        sangat: x.sangat || "",
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
    setPayment("");
    setJathaDateId("");
    setNotes("");
    setDepartment("");
    setSangat("");
  }

  function validateCreate() {
    if (!selectedCustomer?._id) return "Please search and select a customer first.";
    if (!jathaDateId) return "Jatha date is required.";
    if (!mode) return "Mode is required.";
    // ✅ payment NOT required
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
      department: department.trim(),
      sangat: sangat.trim(),

      mode,
      payment: payment.trim(),

      jathaDateId,
      jathaDate: jd?.travelDate || "",

      notes: notes.trim(),
    };

    const res = await fetch("/api/nominal-roll/bhati", {
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
    alert("✅ Data has been successfully added to Nominal Roll.");
  } finally {
    setSaving(false);
  }
}
  async function onDelete(id: string) {
    const realId = encodeURIComponent(String(id).trim());
    if (!confirm("Delete this record?")) return;

    const res = await fetch(`/api/nominal-roll/bhati/${realId}`, { method: "DELETE" });
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

  const realId = encodeURIComponent(String(editing._id).trim());
  const jd = jathaDates.find((x) => x._id === editing.jathaDateId);

  setSaving(true);
  try {
    const res = await fetch(`/api/nominal-roll/bhati/${realId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: editing.mode,
        payment: String(editing.payment || "").trim(),

        jathaDateId: editing.jathaDateId,
        jathaDate: jd?.travelDate || "",

        department: String(editing.department || "").trim(),
        sangat: String(editing.sangat || "").trim(),

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
    alert("✅ Changes have been successfully saved.");
  } finally {
    setSaving(false);
  }
}
  return (
    <div>
      <h2 className="text-lg font-semibold">Bhati</h2>
      <p className="app-subtitle mt-1">Search Sangat → select → fill details → save.</p>

      {/* Create Form */}
      <form onSubmit={onCreate} className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Search */}
          <div className="lg:col-span-6">
            <div className="app-label">Search Sangat (Name / Mobile / Aadhaar)</div>
            <div className="flex gap-2">
              <input className={inputCls()} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type name / mobile / aadhaar" />
              <button
                type="button"
                onClick={doCustomerSearch}
                disabled={searching || !search.trim()}
                className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60"
              >
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
                     onClick={() => {
  setSelectedCustomer(c);
  setDepartment(c.department || "");
  setSangat(c.sangat || "");
  setSearch(c.name || "");
  setResults([]); // hide suggestions after selection
}}
                      className={[
                        "w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-white/5",
                        selectedCustomer?._id === c._id ? "bg-zinc-50 dark:bg-white/5" : "",
                      ].join(" ")}
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
                  Father/Husband: {selectedCustomer?.fatherOrHusbandName || "-"} • Gender/Age:{" "}
                  {(selectedCustomer?.gender || "-") + " / " + (selectedCustomer?.age ?? "-")}
                  {" "}• Dept: {department || "-"} • Sangat: {sangat || "-"}
                </div>
              </div>
            </div>
          </div>

          {/* Core selections */}
          <div className="lg:col-span-3">
            <div className="app-label">Jatha Date (Bhati) *</div>
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
              <option value="Bus">Bus</option>
              <option value="Self">Self</option>
            </select>

            <div className="app-label mt-3">Payment (optional)</div>
            <input className={inputCls()} value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="Optional" />

            <div className="app-label mt-3">Department</div>
            <input
              className={inputCls()}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Optional"
            />

            <div className="app-label mt-3">Sangat</div>
            <select className={inputCls()} value={sangat} onChange={(e) => setSangat(e.target.value)}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>

          </div>

          <div className="lg:col-span-3">
            <div className="app-label">Notes</div>
            <textarea className="app-textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
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

      {/* Table Filters */}
      <div className="mt-6 rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="app-label">Search in table</div>
            <input
              className="app-input app-input-sm"
              value={tableQ}
              onChange={(e) => setTableQ(e.target.value)}
              placeholder="Type name / mobile / aadhaar / dept..."
            />
          </div>

          <div>
            <div className="app-label">Department</div>
            <select className="app-input app-input-sm" value={tableDept} onChange={(e) => setTableDept(e.target.value)}>
              <option value="">All</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="app-label">Mode</div>
            <select className="app-input app-input-sm" value={tableMode} onChange={(e) => setTableMode(e.target.value as Mode | "")}>
              <option value="">All</option>
              <option value="Bus">Bus</option>
              <option value="Self">Self</option>
            </select>
          </div>

          <div>
            <div className="app-label">Sangat</div>
            <select className="app-input app-input-sm" value={tableSangat} onChange={(e) => setTableSangat(e.target.value)}>
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <div className="app-label">Jatha Date</div>
            <select className="app-input app-input-sm" value={tableJathaId} onChange={(e) => setTableJathaId(e.target.value)}>
              <option value="">All</option>
              {jathaDates.map((d) => (
                <option key={d._id} value={d._id}>{d.travelDate}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-zinc-600 dark:text-zinc-400">
            Showing <span className="font-semibold text-zinc-900 dark:text-white">{filteredItems.length}</span> of <span className="font-semibold text-zinc-900 dark:text-white">{items.length}</span> records
          </div>
          <button
            type="button"
            onClick={() => {
              setTableQ("");
              setTableDept("");
              setTableMode("");
              setTableSangat("");
              setTableJathaId("");
            }}
            className="app-btn app-btn-secondary h-8 px-3 text-xs"
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
              {["S.No", "Name", "Father/Husband", "Gender/Age", "Address", "Mobile", "Badge", "Department", "Sangat", "Mode", "Payment", "Jatha Date", "Notes", "Actions"].map((h) => (
                <th key={h} className="th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {loading ? (
              <tr>
                <td className="td text-zinc-600 dark:text-zinc-400" colSpan={14}>
                  Loading...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td className="td text-zinc-600 dark:text-zinc-400" colSpan={14}>
                  {items.length === 0 ? "No records found." : "No records match your filters."}
                </td>
              </tr>
            ) : (
              filteredItems.map((r, idx) => (
                <tr key={r._id} onClick={() => setEditing({ ...r })} className={["row cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20", idx % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                  <td className="td">{idx + 1}</td>
                  <td className="td font-medium">{r.customerName || "-"}</td>
                  <td className="td">{r.fatherOrHusbandName || "-"}</td>
                  <td className="td">{`${r.gender || "-"} / ${r.age ?? "-"}`}</td>
                  <td className="td">{r.address || "-"}</td>
                  <td className="td">{r.mobile || "-"}</td>
                  <td className="td">{r.badgeNo || "-"}</td>
                  <td className="td">{r.department || "-"}</td>
                  <td className="td">{r.sangat || "-"}</td>
                  <td className="td">{r.mode || "-"}</td>
                  <td className="td">{r.payment || "-"}</td>
                  <td className="td">{r.jathaDate || "-"}</td>
                  <td className="td">{r.notes || "-"}</td>

                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="app-btn app-btn-secondary h-9 px-3 text-xs"
                        onClick={() => setEditing({ ...r })}
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
              <div>
                <h3 className="text-lg font-semibold">Edit — {editing.customerName || "Unknown"}</h3>
                <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                  Badge: {editing.badgeNo || "-"} • Dept: {editing.department || "-"} • Sangat: {editing.sangat || "-"} • Mode: {editing.mode || "-"}
                </div>
              </div>
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
                  <option value="Bus">Bus</option>
                  <option value="Self">Self</option>
                </select>
              </div>

              <div>
                <div className="app-label">Payment (optional)</div>
                <input className={inputCls()} value={editing.payment || ""} onChange={(e) => setEditing({ ...editing, payment: e.target.value })} />
              </div>

              <div>
                <div className="app-label">Department</div>
                <input
                  className={inputCls()}
                  value={editing.department || ""}
                  onChange={(e) => setEditing({ ...editing, department: e.target.value })}
                />
              </div>

              <div>
                <div className="app-label">Sangat</div>
                <select
                  className={inputCls()}
                  value={String(editing.sangat || "")}
                  onChange={(e) => setEditing({ ...editing, sangat: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
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

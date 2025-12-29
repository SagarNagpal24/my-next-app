"use client";

import React from "react";

type TrainRoute = "Delhi-Beas" | "Beas-Delhi" | "";

type TrainRow = {
  _id: string;
  trainName: string;
  seatNumber: string; // e.g., D11
  travelDate: string; // YYYY-MM-DD
  travelRoute: TrainRoute | string;
  createdAt?: string;
  updatedAt?: string;
};

function inputCls() {
  return "app-input app-input-sm";
}

function normalizeId(x: any) {
  return (typeof x?._id === "string" ? x._id : x?._id?.toString?.() || String(x?._id)).trim();
}

export default function TrainDataPage() {
  const [items, setItems] = React.useState<TrainRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // form state
  const [trainName, setTrainName] = React.useState("");
  const [seatNumber, setSeatNumber] = React.useState("");
  const [travelDate, setTravelDate] = React.useState("");
  const [travelRoute, setTravelRoute] = React.useState<TrainRoute>("");

  // edit state
  const [editing, setEditing] = React.useState<TrainRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  // optional search
  const [q, setQ] = React.useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/train-data?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      setItems(
        (data.items || []).map((x: any) => ({
          ...x,
          _id: normalizeId(x),
          travelDate: x?.travelDate ? String(x.travelDate).slice(0, 10) : "",
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearForm() {
    setTrainName("");
    setSeatNumber("");
    setTravelDate("");
    setTravelRoute("");
  }

  function validateForm() {
    if (!trainName.trim()) return "Train name is required.";
    if (!seatNumber.trim()) return "Seat number is required.";
    // simple seat format like D11 / S2 / A1 etc.
    if (!/^[A-Za-z]\d{1,3}$/.test(seatNumber.trim())) return "Seat number must look like D11 / A1 / S2.";
    if (!travelDate) return "Travel date is required.";
    if (!travelRoute) return "Travel route is required.";
    return "";
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    const err = validateForm();
    if (err) return alert(err);

    setSaving(true);
    try {
      const res = await fetch("/api/train-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainName: trainName.trim(),
          seatNumber: seatNumber.trim().toUpperCase(),
          travelDate,
          travelRoute,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Create failed (${res.status}). ${data?.error || "Error"}`);
        return;
      }

      clearForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    const realId = encodeURIComponent(String(id).trim());
    if (!confirm("Delete this record?")) return;

    const res = await fetch(`/api/train-data/${realId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(`Delete failed (${res.status}). ${data?.error || "Error"}`);
      return;
    }

    await load();
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const realId = encodeURIComponent(String(editing._id).trim());

    if (!editing.trainName?.trim()) return alert("Train name is required.");
    if (!editing.seatNumber?.trim()) return alert("Seat number is required.");
    if (!/^[A-Za-z]\d{1,3}$/.test(editing.seatNumber.trim())) return alert("Seat number must look like D11 / A1 / S2.");
    if (!editing.travelDate) return alert("Travel date is required.");
    if (!editing.travelRoute) return alert("Travel route is required.");

    setSaving(true);
    try {
      const res = await fetch(`/api/train-data/${realId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainName: editing.trainName.trim(),
          seatNumber: editing.seatNumber.trim().toUpperCase(),
          travelDate: String(editing.travelDate).slice(0, 10),
          travelRoute: editing.travelRoute,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Update failed (${res.status}). ${data?.error || "Error"}`);
        return;
      }

      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-page">
      <div className="app-card app-card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="app-title">Train Data</h1>
            <p className="app-subtitle">Add train & seat details. Edit and delete records here only.</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="app-input app-input-sm w-[220px]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search train / seat / route"
            />
            <button onClick={load} className="app-btn app-btn-primary h-10 px-4">
              Search
            </button>
            <button
              onClick={() => {
                setQ("");
                setTimeout(load, 0);
              }}
              className="app-btn app-btn-secondary h-10 px-4"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Create Form */}
        <form onSubmit={createItem} className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="app-label">Train Name *</div>
              <input className={inputCls()} value={trainName} onChange={(e) => setTrainName(e.target.value)} placeholder="e.g., Punjab Mail" />
            </div>

            <div>
              <div className="app-label">Seat Number *</div>
              <input
                className={inputCls()}
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                placeholder="e.g., D11"
              />
            </div>

            <div>
              <div className="app-label">Travel Date *</div>
              <input type="date" className={inputCls()} value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
            </div>

            <div>
              <div className="app-label">Travel Route *</div>
              <select className={inputCls()} value={travelRoute} onChange={(e) => setTravelRoute(e.target.value as TrainRoute)}>
                <option value="">Select</option>
                <option value="Delhi-Beas">Delhi-Beas</option>
                <option value="Beas-Delhi">Beas-Delhi</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={saving} className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60">
              {saving ? "Saving..." : "Add Train Data"}
            </button>
            <button type="button" onClick={clearForm} className="app-btn app-btn-secondary h-10 px-4">
              Clear
            </button>
          </div>
        </form>

        {/* Table */}
        <div className="table-shell">
          <table className="table">
            <thead className="thead">
              <tr>
                {["Train Name", "Seat", "Travel Date", "Route", "Actions"].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="td text-zinc-600 dark:text-zinc-400" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="td text-zinc-600 dark:text-zinc-400" colSpan={5}>
                    No records found.
                  </td>
                </tr>
              ) : (
                items.map((r, i) => (
                  <tr key={r._id} className={["row", i % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                    <td className="td font-medium">{r.trainName || "-"}</td>
                    <td className="td">{r.seatNumber || "-"}</td>
                    <td className="td">{r.travelDate || "-"}</td>
                    <td className="td">{r.travelRoute || "-"}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <button
                          className="app-btn app-btn-secondary h-9 px-3 text-xs"
                          onClick={() =>
                            setEditing({
                              ...r,
                              travelDate: String(r.travelDate || "").slice(0, 10),
                            })
                          }
                          type="button"
                        >
                          Edit
                        </button>

                        <button
                          className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30"
                          onClick={() => onDelete(r._id)}
                          type="button"
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
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Train Data</h3>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                type="button"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSaveEdit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="app-label">Train Name *</div>
                <input className={inputCls()} value={editing.trainName} onChange={(e) => setEditing({ ...editing, trainName: e.target.value })} />
              </div>

              <div>
                <div className="app-label">Seat Number *</div>
                <input className={inputCls()} value={editing.seatNumber} onChange={(e) => setEditing({ ...editing, seatNumber: e.target.value })} />
              </div>

              <div>
                <div className="app-label">Travel Date *</div>
                <input type="date" className={inputCls()} value={editing.travelDate || ""} onChange={(e) => setEditing({ ...editing, travelDate: e.target.value })} />
              </div>

              <div>
                <div className="app-label">Travel Route *</div>
                <select className={inputCls()} value={String(editing.travelRoute || "")} onChange={(e) => setEditing({ ...editing, travelRoute: e.target.value as any })}>
                  <option value="">Select</option>
                  <option value="Delhi-Beas">Delhi-Beas</option>
                  <option value="Beas-Delhi">Beas-Delhi</option>
                </select>
              </div>

              <div className="sm:col-span-2 mt-2 flex items-center justify-end gap-2">
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

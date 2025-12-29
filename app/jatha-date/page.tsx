"use client";

import React from "react";

type Category = "Ladoo" | "Parantha" | "Bhati" | "";

type JathaDateRow = {
  _id: string;
  category: Category | string;
  travelDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

function normalizeId(x: any) {
  return (typeof x?._id === "string" ? x._id : x?._id?.toString?.() || String(x?._id)).trim();
}

function inputCls() {
  return "app-input app-input-sm";
}

export default function JathaDatePage() {
  const [items, setItems] = React.useState<JathaDateRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // filters
  const [filterCategory, setFilterCategory] = React.useState<Category>("");

  // create form
  const [category, setCategory] = React.useState<Category>("");
  const [travelDate, setTravelDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // edit modal
  const [editing, setEditing] = React.useState<JathaDateRow | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set("category", filterCategory);

      const res = await fetch(`/api/jatha-date?${params.toString()}`, { cache: "no-store" });
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
    setCategory("");
    setTravelDate("");
    setNotes("");
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();

    if (!category) return alert("Category is required.");
    if (!travelDate) return alert("Travel date is required.");

    setSaving(true);
    try {
      const res = await fetch("/api/jatha-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          travelDate,
          notes,
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
    if (!confirm("Delete this travel date?")) return;

    const res = await fetch(`/api/jatha-date/${realId}`, { method: "DELETE" });
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

    if (!editing.category) return alert("Category is required.");
    if (!editing.travelDate) return alert("Travel date is required.");

    const realId = encodeURIComponent(String(editing._id).trim());

    setSaving(true);
    try {
      const res = await fetch(`/api/jatha-date/${realId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editing.category,
          travelDate: String(editing.travelDate).slice(0, 10),
          notes: editing.notes || "",
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
            <h1 className="app-title">Jatha Date</h1>
            <p className="app-subtitle">
              Add travel dates for Ladoo / Parantha / Bhati. Later these dates will appear in the respective dropdowns.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="app-input app-input-sm w-[170px]"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as Category)}
            >
              <option value="">All</option>
              <option value="Ladoo">Ladoo</option>
              <option value="Parantha">Parantha</option>
              <option value="Bhati">Bhati</option>
            </select>

            <button onClick={load} className="app-btn app-btn-primary h-10 px-4">
              Filter
            </button>

            <button
              onClick={() => {
                setFilterCategory("");
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
              <div className="app-label">Category *</div>
              <select className={inputCls()} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                <option value="">Select</option>
                <option value="Ladoo">Ladoo</option>
                <option value="Parantha">Parantha</option>
                <option value="Bhati">Bhati</option>
              </select>
            </div>

            <div>
              <div className="app-label">Travel Date *</div>
              <input type="date" className={inputCls()} value={travelDate} onChange={(e) => setTravelDate(e.target.value)} />
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <div className="app-label">Notes</div>
              <input className={inputCls()} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={saving} className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60">
              {saving ? "Saving..." : "Add Date"}
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
                {["Category", "Travel Date", "Notes", "Actions"].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td className="td text-zinc-600 dark:text-zinc-400" colSpan={4}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="td text-zinc-600 dark:text-zinc-400" colSpan={4}>
                    No dates found.
                  </td>
                </tr>
              ) : (
                items.map((r, i) => (
                  <tr key={r._id} className={["row", i % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                    <td className="td font-medium">{r.category}</td>
                    <td className="td">{r.travelDate}</td>
                    <td className="td">{r.notes || "-"}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="app-btn app-btn-secondary h-9 px-3 text-xs"
                          onClick={() =>
                            setEditing({
                              ...r,
                              travelDate: String(r.travelDate || "").slice(0, 10),
                            })
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30"
                          onClick={() => onDelete(r._id)}
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
              <h3 className="text-lg font-semibold">Edit Travel Date</h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSaveEdit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="app-label">Category *</div>
                <select
                  className={inputCls()}
                  value={String(editing.category || "")}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value as any })}
                >
                  <option value="">Select</option>
                  <option value="Ladoo">Ladoo</option>
                  <option value="Parantha">Parantha</option>
                  <option value="Bhati">Bhati</option>
                </select>
              </div>

              <div>
                <div className="app-label">Travel Date *</div>
                <input
                  type="date"
                  className={inputCls()}
                  value={editing.travelDate || ""}
                  onChange={(e) => setEditing({ ...editing, travelDate: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="app-label">Notes</div>
                <input
                  className={inputCls()}
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
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

"use client";

import React from "react";

type Category = "Ladoo" | "Parantha" | "Bhati" | "";

type JathaDateRow = {
  _id: string;
  category: Category | string;

  // ✅ renamed meaning: start date
  jathaStartDate: string; // YYYY-MM-DD

  // ✅ new: end date
  jathaEndDate: string; // YYYY-MM-DD

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

function iso10(v: any) {
  return v ? String(v).slice(0, 10) : "";
}

export default function JathaDatePage() {
  const [items, setItems] = React.useState<JathaDateRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // filters
  const [filterCategory, setFilterCategory] = React.useState<Category>("");

  // create form
  const [category, setCategory] = React.useState<Category>("");
  const [jathaStartDate, setJathaStartDate] = React.useState("");
  const [jathaEndDate, setJathaEndDate] = React.useState("");
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
          category: x.category || "",
          jathaStartDate: iso10(x.jathaStartDate ?? x.travelDate),
          jathaEndDate: iso10(x.jathaEndDate ?? x.travelDate), // fallback: same as start
          notes: x.notes || "",
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

  // ✅ category-wise grouping + counts
  const grouped = React.useMemo(() => {
    const g: Record<string, JathaDateRow[]> = {};
    for (const it of items) {
      const key = String(it.category || "Unknown");
      if (!g[key]) g[key] = [];
      g[key].push(it);
    }
    // sort each group: latest start date first
    Object.values(g).forEach((arr) =>
      arr.sort((a, b) => (String(b.jathaStartDate || "")).localeCompare(String(a.jathaStartDate || "")))
    );
    return g;
  }, [items]);

  const categoryOrder = ["Ladoo", "Parantha", "Bhati"];
  const orderedKeys = React.useMemo(() => {
    const keys = Object.keys(grouped);
    keys.sort((a, b) => {
      const ia = categoryOrder.indexOf(a);
      const ib = categoryOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return keys;
  }, [grouped]);

  const totalCount = items.length;

  function clearForm() {
    setCategory("");
    setJathaStartDate("");
    setJathaEndDate("");
    setNotes("");
  }

  async function createItem(e: React.FormEvent) {
    e.preventDefault();

    if (!category) return alert("Category is required.");
    if (!jathaStartDate) return alert("Jatha start date is required.");
    if (!jathaEndDate) return alert("Jatha end date is required.");
    if (jathaEndDate < jathaStartDate) return alert("Jatha end date cannot be before start date.");

    setSaving(true);
    try {
      const res = await fetch("/api/jatha-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          jathaStartDate,
          jathaEndDate,
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
    if (!confirm("Delete this jatha date?")) return;

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
    if (!editing.jathaStartDate) return alert("Jatha start date is required.");
    if (!editing.jathaEndDate) return alert("Jatha end date is required.");
    if (editing.jathaEndDate < editing.jathaStartDate) return alert("Jatha end date cannot be before start date.");

    const realId = encodeURIComponent(String(editing._id).trim());

    setSaving(true);
    try {
      const res = await fetch(`/api/jatha-date/${realId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editing.category,
          jathaStartDate: iso10(editing.jathaStartDate),
          jathaEndDate: iso10(editing.jathaEndDate),
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
              Add jatha start/end dates for Ladoo / Parantha / Bhati. Later these dates will appear in the respective dropdowns.
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
              <div className="app-label">Jatha Start Date *</div>
              <input type="date" className={inputCls()} value={jathaStartDate} onChange={(e) => setJathaStartDate(e.target.value)} />
            </div>

            <div>
              <div className="app-label">Jatha End Date *</div>
              <input type="date" className={inputCls()} value={jathaEndDate} onChange={(e) => setJathaEndDate(e.target.value)} />
            </div>

            <div className="lg:col-span-1 sm:col-span-2">
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

        {/* ✅ Category Summary */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Total</div>
            <div className="mt-1 text-2xl font-bold">{totalCount}</div>
          </div>

          {["Ladoo", "Parantha", "Bhati"].map((c) => (
            <div key={c} className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{c}</div>
              <div className="mt-1 text-2xl font-bold">{grouped[c]?.length ?? 0}</div>
            </div>
          ))}
        </div>

        {/* ✅ Category-wise Tables */}
        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="rounded-2xl border border-black/5 p-4 text-zinc-600 dark:border-white/10 dark:text-zinc-400">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-black/5 p-4 text-zinc-600 dark:border-white/10 dark:text-zinc-400">
              No dates found.
            </div>
          ) : (
            orderedKeys.map((cat) => {
              const rows = grouped[cat] || [];
              if (rows.length === 0) return null;

              return (
                <div key={cat} className="rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-zinc-950">
                  <div className="flex items-center justify-between gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
                    <div className="text-sm font-semibold">
                      {cat} <span className="text-xs text-zinc-600 dark:text-zinc-400">({rows.length})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFilterCategory(cat as any);
                        setTimeout(load, 0);
                      }}
                      className="app-btn app-btn-secondary h-8 px-3 text-xs"
                    >
                      View Only {cat}
                    </button>
                  </div>

                  <div className="table-shell">
                    <table className="table">
                      <thead className="thead">
                        <tr>
                          {["Jatha Start Date", "Jatha End Date", "Notes", "Actions"].map((h) => (
                            <th key={h} className="th">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-black/5 dark:divide-white/10">
                        {rows.map((r, i) => (
                          <tr key={r._id} className={["row", i % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                            <td className="td">{r.jathaStartDate}</td>
                            <td className="td">{r.jathaEndDate}</td>
                            <td className="td">{r.notes || "-"}</td>
                            <td className="td">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="app-btn app-btn-secondary h-9 px-3 text-xs"
                                  onClick={() =>
                                    setEditing({
                                      ...r,
                                      jathaStartDate: iso10(r.jathaStartDate),
                                      jathaEndDate: iso10(r.jathaEndDate),
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Jatha Dates</h3>
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
                <div className="app-label">Jatha Start Date *</div>
                <input
                  type="date"
                  className={inputCls()}
                  value={editing.jathaStartDate || ""}
                  onChange={(e) => setEditing({ ...editing, jathaStartDate: e.target.value })}
                />
              </div>

              <div>
                <div className="app-label">Jatha End Date *</div>
                <input
                  type="date"
                  className={inputCls()}
                  value={editing.jathaEndDate || ""}
                  onChange={(e) => setEditing({ ...editing, jathaEndDate: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="app-label">Notes</div>
                <input className={inputCls()} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
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

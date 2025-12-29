"use client";

import React from "react";

type Gender = "Male" | "Female" | "Other" | "";

type Customer = {
  _id: string;
  name: string;
  badgeNo?: string;
  fatherOrHusbandName?: string;
  gender?: Gender | string;
  age?: number | null;
  address?: string;
  mobile?: string;
  adhaarNumber?: string;
  emergencyNumber?: string;
  medicalDate?: string | null; // serialized ISO string
  notes?: string;
};

function fmtDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "-";
  }
}

function toDateInputValue(d?: string | null) {
  if (!d) return "";
  return String(d).slice(0, 10);
}

export default function CustomersPage() {
  const [items, setItems] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);

  // search / filters
  const [q, setQ] = React.useState("");
  const [gender, setGender] = React.useState<Gender>("");
  const [ageMin, setAgeMin] = React.useState("");
  const [ageMax, setAgeMax] = React.useState("");
  const [medFrom, setMedFrom] = React.useState("");
  const [medTo, setMedTo] = React.useState("");

  // edit modal
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (gender) params.set("gender", gender);
      if (ageMin) params.set("ageMin", ageMin);
      if (ageMax) params.set("ageMax", ageMax);
      if (medFrom) params.set("medFrom", medFrom);
      if (medTo) params.set("medTo", medTo);

      const res = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      // ✅ IMPORTANT: always force _id to a usable, trimmed string
      setItems(
        (data.items || []).map((x: any) => ({
          ...x,
          _id: (typeof x._id === "string" ? x._id : x._id?.toString?.() || String(x._id)).trim(),
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

  function clearFilters() {
    setQ("");
    setGender("");
    setAgeMin("");
    setAgeMax("");
    setMedFrom("");
    setMedTo("");
  }

  async function onDelete(id: string) {
    const realId = encodeURIComponent(String(id).trim());
    if (!confirm("Delete this record?")) return;

    const res = await fetch(`/api/customers/${realId}`, { method: "DELETE" });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Delete failed (${res.status}). ${msg}`);
      return;
    }

    await load();
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const realId = encodeURIComponent(String(editing._id).trim());

    if (!editing.name?.trim()) {
      alert("Name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...editing,
        medicalDate: editing.medicalDate ? String(editing.medicalDate).slice(0, 10) : "",
      };

      const res = await fetch(`/api/customers/${realId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        alert(`Update failed (${res.status}). ${msg}`);
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
            <h1 className="text-xl font-semibold">Customers</h1>
            <p className="app-subtitle">Search, filter, edit and delete records.</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={clearFilters} className="app-btn app-btn-secondary h-10 px-4">
              Clear
            </button>
            <button onClick={load} className="app-btn app-btn-primary h-10 px-4">
              Search
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div>
            <div className="app-label">Search</div>
            <input
              className="app-input app-input-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name / Mobile / Aadhaar / Badge"
            />
          </div>

          <div>
            <div className="app-label">Gender</div>
            <select className="app-input app-input-sm" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <div className="app-label">Age Min</div>
            <input className="app-input app-input-sm" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} inputMode="numeric" />
          </div>

          <div>
            <div className="app-label">Age Max</div>
            <input className="app-input app-input-sm" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} inputMode="numeric" />
          </div>

          <div>
            <div className="app-label">Medical From</div>
            <input type="date" className="app-input app-input-sm" value={medFrom} onChange={(e) => setMedFrom(e.target.value)} />
          </div>

          <div>
            <div className="app-label">Medical To</div>
            <input type="date" className="app-input app-input-sm" value={medTo} onChange={(e) => setMedTo(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="table-shell">
          <table className="table">
            <thead className="thead">
              <tr>
                {[
                  "Name",
                  "Badge No",
                  "Father/Husband",
                  "Gender",
                  "Age",
                  "Address",
                  "Mobile",
                  "Aadhaar",
                  "Emergency",
                  "Medical Date",
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
                  <td className="td text-zinc-600 dark:text-zinc-400" colSpan={12}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="td text-zinc-600 dark:text-zinc-400" colSpan={12}>
                    No records found.
                  </td>
                </tr>
              ) : (
                items.map((c, i) => (
                  <tr key={c._id} className={["row", i % 2 === 0 ? "row-alt" : "row-alt2"].join(" ")}>
                    <td className="td font-medium">{c.name || "-"}</td>
                    <td className="td">{c.badgeNo || "-"}</td>
                    <td className="td">{c.fatherOrHusbandName || "-"}</td>
                    <td className="td">{c.gender || "-"}</td>
                    <td className="td">{c.age ?? "-"}</td>
                    <td className="td">{c.address || "-"}</td>
                    <td className="td">{c.mobile || "-"}</td>
                    <td className="td">{c.adhaarNumber || "-"}</td>
                    <td className="td">{c.emergencyNumber || "-"}</td>
                    <td className="td">{fmtDate(c.medicalDate)}</td>
                    <td className="td">{c.notes || "-"}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setEditing({
                              ...c,
                              medicalDate: toDateInputValue(c.medicalDate),
                            })
                          }
                          className="app-btn app-btn-secondary h-9 px-3 text-xs"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => onDelete(c._id)}
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
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-950">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Customer</h3>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
              >
                ✕
              </button>
            </div>

            <form onSubmit={onSaveEdit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input className="app-input app-input-sm" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Name" />
              <input className="app-input app-input-sm" value={editing.badgeNo || ""} onChange={(e) => setEditing({ ...editing, badgeNo: e.target.value })} placeholder="Badge No" />
              <input className="app-input app-input-sm" value={editing.fatherOrHusbandName || ""} onChange={(e) => setEditing({ ...editing, fatherOrHusbandName: e.target.value })} placeholder="Father/Husband Name" />

              <select className="app-input app-input-sm" value={(editing.gender as any) || ""} onChange={(e) => setEditing({ ...editing, gender: e.target.value as any })}>
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              <input
                className="app-input app-input-sm"
                value={String(editing.age ?? "")}
                onChange={(e) => setEditing({ ...editing, age: e.target.value ? Number(e.target.value) : null })}
                placeholder="Age"
                inputMode="numeric"
              />

              <input className="app-input app-input-sm" value={editing.mobile || ""} onChange={(e) => setEditing({ ...editing, mobile: e.target.value })} placeholder="Mobile" />
              <input
                className="app-input app-input-sm"
                value={editing.adhaarNumber || ""}
                onChange={(e) => setEditing({ ...editing, adhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                placeholder="Aadhaar (12 digits)"
              />
              <input className="app-input app-input-sm" value={editing.emergencyNumber || ""} onChange={(e) => setEditing({ ...editing, emergencyNumber: e.target.value })} placeholder="Emergency Number" />
              <input type="date" className="app-input app-input-sm" value={(editing.medicalDate as any) || ""} onChange={(e) => setEditing({ ...editing, medicalDate: e.target.value })} />

              <input className="app-input app-input-sm sm:col-span-2 lg:col-span-3" value={editing.address || ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} placeholder="Address" />
              <textarea className="app-textarea sm:col-span-2 lg:col-span-3" rows={4} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Notes" />

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

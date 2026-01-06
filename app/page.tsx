"use client";

import React from "react";

type Gender = "Male" | "Female" | "Other" | "";

type FormState = {
  name: string;
  badgeNo: string;
  fatherOrHusbandName: string;
  gender: Gender;
  age: string;
  address: string;
  mobile: string;
  adhaarNumber: string;
  emergencyNumber: string;
  medicalDate: string; // YYYY-MM-DD
  notes: string;
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{label}</span>
        {error && <span className="text-xs font-medium text-red-600 dark:text-red-400">{error}</span>}
      </div>
      {children}
    </label>
  );
}

export default function Home() {
  const [form, setForm] = React.useState<FormState>({
    name: "",
    badgeNo: "",
    fatherOrHusbandName: "",
    gender: "",
    age: "",
    address: "",
    mobile: "",
    adhaarNumber: "",
    emergencyNumber: "",
    medicalDate: "",
    notes: "",
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: "idle" | "ok" | "err"; msg: string }>({
    type: "idle",
    msg: "",
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => {
      const copy = { ...p };
      delete copy[key as string];
      return copy;
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required.";

    if (form.age && !/^\d+$/.test(form.age)) e.age = "Age must be a number.";
    if (form.age) {
      const n = Number(form.age);
      if (Number.isNaN(n) || n < 0 || n > 120) e.age = "Age must be 0–120.";
    }

    if (form.adhaarNumber && !/^\d{12}$/.test(form.adhaarNumber)) e.adhaarNumber = "Aadhaar must be 12 digits.";
    if (form.mobile && !/^\+?\d{7,15}$/.test(form.mobile)) e.mobile = "Mobile must be 7–15 digits.";
    if (form.emergencyNumber && !/^\+?\d{7,15}$/.test(form.emergencyNumber))
      e.emergencyNumber = "Emergency must be 7–15 digits.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "idle", msg: "" });

    if (!validate()) {
      setStatus({ type: "err", msg: "Please fix the highlighted errors." });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          age: form.age ? Number(form.age) : "",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ type: "err", msg: data?.error || "Failed to save." });
        return;
      }

      setStatus({ type: "ok", msg: "Customer saved successfully." });

      setForm({
        name: "",
        badgeNo: "",
        fatherOrHusbandName: "",
        gender: "",
        age: "",
        address: "",
        mobile: "",
        adhaarNumber: "",
        emergencyNumber: "",
        medicalDate: "",
        notes: "",
      });
      setErrors({});
    } catch (err: any) {
      setStatus({ type: "err", msg: err?.message || "Network error." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-page">
      <div className="app-card app-card-pad">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="app-title">Add Sangat</h1>
            <p className="app-subtitle">Enter details and save the record.</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="app-chip">Required: Name</span>
            <span className="app-chip">Aadhaar: 12 digits</span>
          </div>
        </div>

        {status.type !== "idle" && (
          <div
            className={[
              "mt-5 rounded-xl border p-3 text-sm",
              status.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
            ].join(" ")}
            role="status"
          >
            {status.msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6">
          <div className="rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Basic Details</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Name, badge and family info</div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Name *" error={errors.name}>
                <input
                  className={`app-input ${errors.name ? "border-red-400 focus:border-red-500" : ""}`}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Full name"
                />
              </Field>

              <Field label="Badge No">
                <input className="app-input" value={form.badgeNo} onChange={(e) => setField("badgeNo", e.target.value)} />
              </Field>

              <Field label="Father’s / Husband’s Name">
                <input className="app-input" value={form.fatherOrHusbandName} onChange={(e) => setField("fatherOrHusbandName", e.target.value)} />
              </Field>

              <Field label="Gender">
                <select className="app-input" value={form.gender} onChange={(e) => setField("gender", e.target.value as Gender)}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field label="Age" error={errors.age}>
                <input
                  className={`app-input ${errors.age ? "border-red-400 focus:border-red-500" : ""}`}
                  value={form.age}
                  onChange={(e) => setField("age", e.target.value)}
                  inputMode="numeric"
                />
              </Field>

              <Field label="Medical Date">
                <input type="date" className="app-input" value={form.medicalDate} onChange={(e) => setField("medicalDate", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Contact</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Phone numbers and Aadhaar</div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Mobile" error={errors.mobile}>
                <input
                  className={`app-input ${errors.mobile ? "border-red-400 focus:border-red-500" : ""}`}
                  value={form.mobile}
                  onChange={(e) => setField("mobile", e.target.value)}
                />
              </Field>

              <Field label="Emergency Number" error={errors.emergencyNumber}>
                <input
                  className={`app-input ${errors.emergencyNumber ? "border-red-400 focus:border-red-500" : ""}`}
                  value={form.emergencyNumber}
                  onChange={(e) => setField("emergencyNumber", e.target.value)}
                />
              </Field>

              <Field label="Adhaar Number" error={errors.adhaarNumber}>
                <input
                  className={`app-input ${errors.adhaarNumber ? "border-red-400 focus:border-red-500" : ""}`}
                  value={form.adhaarNumber}
                  onChange={(e) => setField("adhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  inputMode="numeric"
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Additional Information</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Address and notes</div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Field label="Address">
                  <input className="app-input" value={form.address} onChange={(e) => setField("address", e.target.value)} />
                </Field>
              </div>

              <div className="lg:col-span-3">
                <Field label="Notes">
                  <textarea className="app-textarea" rows={4} value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setForm({
                  name: "",
                  badgeNo: "",
                  fatherOrHusbandName: "",
                  gender: "",
                  age: "",
                  address: "",
                  mobile: "",
                  adhaarNumber: "",
                  emergencyNumber: "",
                  medicalDate: "",
                  notes: "",
                });
                setErrors({});
                setStatus({ type: "idle", msg: "" });
              }}
              className="app-btn app-btn-secondary"
            >
              Clear
            </button>

            <button type="submit" disabled={saving} className="app-btn app-btn-primary">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

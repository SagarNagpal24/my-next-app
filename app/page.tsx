"use client";

import React from "react";

type Gender = "M" | "F" | "Other" | "";
type Blacklisted = "Yes" | "No" | "";

// ✅ UPDATED Department options (added all you listed)
type Department =
  | ""
  | "Security"
  | "FR"
  | "Pandal"
  | "SHK"
  | "Canteen"
  | "BAV"
  | "Traffic"
  | "HRT"
  | "Baal-Satsang"
  | "Coupon"
  | "MNT"
  | "Office"
  | "Sewa-Collection"
  | "Water"
  | "Sewa-Samiti"
  | "Medical"
   | "VIP Block"
   | "Langar";

const DEPARTMENT_OPTIONS: Exclude<Department, "">[] = [
  "Security",
  "FR",
  "Pandal",
  "SHK",
  "Canteen",
  "BAV",
  "Traffic",
  "HRT",
  "Baal-Satsang",
  "Coupon",
  "MNT",
  "Office",
  "Sewa-Collection",
  "Water",
  "Sewa-Samiti",
 "Medical",
  "VIP Block",
  "Langar"
];

// ✅ Image payload (compressed)
type ImgData = {
  /** data URL like: data:image/webp;base64,... */
  dataUrl: string;
  /** original filename (optional) */
  filename?: string;
  /** mime of compressed output (image/webp or image/jpeg) */
  mime: string;
  /** bytes of compressed blob */
  size: number;
} | null;

type FormState = {
  name: string;

  badgeNo: string; // one of badge/aadhaar required
  adhaarNumber: string; // digits only (max 12)

  fatherOrHusbandName: string; // required
  gender: Gender; // required
  age: string; // required number

  address: string; // required
  mobile: string; // required digits

  // ✅ Department
  department: Department;

  blacklisted: Blacklisted;

  emergencyNumber: string;
  medicalDate: string; // YYYY-MM-DD
  notes: string;

  // ✅ NEW: Photos (compressed client-side)
  passportPhoto: ImgData; // passport size photo
  aadhaarFrontPhoto: ImgData;
  aadhaarBackPhoto: ImgData;
  medicalPhoto: ImgData;
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
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {label}
        </span>
        {error && (
          <span className="text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

function digitsOnly(s: string) {
  return (s || "").replace(/\D/g, "");
}

function formatBytes(bytes: number) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v = v / 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Compress image in-browser using canvas:
 * - Resize to fit within maxW x maxH
 * - Convert to WebP (if supported) else JPEG
 * - Quality controls size a lot
 */
async function compressImageToDataUrl(
  file: File,
  opts: { maxW: number; maxH: number; quality: number }
): Promise<ImgData> {
  if (!file) return null;

  // ✅ allow all common image formats (mime can be unreliable for HEIC/HEIF)
  const name = (file.name || "").toLowerCase();
  const looksLikeImage =
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|bmp|gif|tif|tiff|heic|heif)$/i.test(name);

  if (!looksLikeImage) {
    throw new Error("Please upload an image file.");
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Unable to read image (format not supported in this browser)."));
    i.src = URL.createObjectURL(file);
  });

  const { maxW, maxH, quality } = opts;
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const scale = Math.min(maxW / srcW, maxH / srcH, 1);
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, outW, outH);

  try {
    URL.revokeObjectURL((img as any).src);
  } catch {}

  const supportsWebp = (() => {
    try {
      return canvas.toDataURL("image/webp").startsWith("data:image/webp");
    } catch {
      return false;
    }
  })();

  const mime = supportsWebp ? "image/webp" : "image/jpeg";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error("Failed to compress image."));
        else resolve(b);
      },
      mime,
      quality
    );
  });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to encode image."));
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl,
    filename: file.name,
    mime,
    size: blob.size,
  };
}

export default function Home() {
  const [form, setForm] = React.useState<FormState>({
    name: "",
    badgeNo: "",
    adhaarNumber: "",

    fatherOrHusbandName: "",
    gender: "",
    age: "",

    address: "",
    mobile: "",

    department: "",

    blacklisted: "No",

    emergencyNumber: "",
    medicalDate: "",
    notes: "",

    passportPhoto: null,
    aadhaarFrontPhoto: null,
    aadhaarBackPhoto: null,
    medicalPhoto: null,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<{
    type: "idle" | "ok" | "err";
    msg: string;
  }>({ type: "idle", msg: "" });

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
    if (!form.fatherOrHusbandName.trim())
      e.fatherOrHusbandName = "Father/Husband Name is required.";
    if (!form.gender) e.gender = "Gender is required.";
    if (!form.address.trim()) e.address = "Address is required.";

    const mobileDigits = digitsOnly(form.mobile);
    if (!mobileDigits) e.mobile = "Mobile is required.";

    if (!form.age.trim()) e.age = "Age is required.";
    else if (!/^\d+$/.test(form.age.trim())) e.age = "Age must be a number.";
    else {
      const n = Number(form.age);
      if (Number.isNaN(n) || n <= 0 || n > 120) e.age = "Age must be 1–120.";
    }

    const badge = form.badgeNo.trim();
    const aadhaar = digitsOnly(form.adhaarNumber);
    if (!badge && !aadhaar) {
      e.badgeNo = "Either Badge No or Aadhaar is required.";
      e.adhaarNumber = "Either Aadhaar or Badge No is required.";
    }

    if (aadhaar && aadhaar.length !== 12)
      e.adhaarNumber = "Aadhaar must be exactly 12 digits (if provided).";

    const emergencyDigits = digitsOnly(form.emergencyNumber);
    if (emergencyDigits && emergencyDigits.length < 7)
      e.emergencyNumber = "Emergency number looks too short.";

    if (form.blacklisted && !["Yes", "No"].includes(form.blacklisted))
      e.blacklisted = "Blacklisted must be Yes or No.";

    // if (!form.department) e.department = "Department is required.";
    if (form.department && !DEPARTMENT_OPTIONS.includes(form.department as any))
      e.department = "Invalid Department.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleImagePick(
    key: "passportPhoto" | "aadhaarFrontPhoto" | "aadhaarBackPhoto" | "medicalPhoto",
    file: File | null
  ) {
    setStatus({ type: "idle", msg: "" });

    if (!file) {
      setField(key, null as any);
      return;
    }

    try {
      let opts = { maxW: 900, maxH: 900, quality: 0.6 };
      if (key === "passportPhoto") opts = { maxW: 600, maxH: 600, quality: 0.6 };
      if (key === "aadhaarFrontPhoto" || key === "aadhaarBackPhoto")
        opts = { maxW: 1200, maxH: 800, quality: 0.6 };
      if (key === "medicalPhoto") opts = { maxW: 900, maxH: 900, quality: 0.6 };

      const compressed = await compressImageToDataUrl(file, opts);

      // If still big, try once more at lower quality
      if (compressed && compressed.size > 300 * 1024) {
        const compressed2 = await compressImageToDataUrl(file, {
          ...opts,
          quality: Math.max(0.45, opts.quality - 0.15),
        });
        setField(key, compressed2 as any);
      } else {
        setField(key, compressed as any);
      }
    } catch (err: any) {
      setErrors((p) => ({
        ...p,
        [key]: err?.message || "Invalid image file.",
      }));
      setStatus({ type: "err", msg: err?.message || "Invalid image file." });
    }
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
      const payload = {
        name: form.name.trim(),
        badgeNo: form.badgeNo.trim(),
        fatherOrHusbandName: form.fatherOrHusbandName.trim(),
        gender: form.gender,
        age: Number(form.age),
        address: form.address.trim(),
        mobile: digitsOnly(form.mobile),
        adhaarNumber: digitsOnly(form.adhaarNumber).slice(0, 12),
        department: form.department,
        blacklisted: form.blacklisted || "No",
        emergencyNumber: digitsOnly(form.emergencyNumber),
        medicalDate: form.medicalDate ? form.medicalDate : null,
        notes: form.notes.trim(),

        // ✅ images
        passportPhoto: form.passportPhoto,
        aadhaarFrontPhoto: form.aadhaarFrontPhoto,
        aadhaarBackPhoto: form.aadhaarBackPhoto,
        medicalPhoto: form.medicalPhoto,
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        adhaarNumber: "",
        fatherOrHusbandName: "",
        gender: "",
        age: "",
        address: "",
        mobile: "",
        department: "",
        blacklisted: "No",
        emergencyNumber: "",
        medicalDate: "",
        notes: "",
        passportPhoto: null,
        aadhaarFrontPhoto: null,
        aadhaarBackPhoto: null,
        medicalPhoto: null,
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="app-chip">
              Required: Name, Age, Gender, Mobile, Father/Husband, Address
            </span>
            <span className="app-chip">Badge or Aadhaar required</span>
           
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
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Identity and family info
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Name *" error={errors.name}>
                <input
                  className={`app-input ${
                    errors.name ? "border-red-400 focus:border-red-500" : ""
                  }`}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Full name"
                  required
                />
              </Field>

              <Field label="Badge No" error={errors.badgeNo}>
                <input
                  className={`app-input ${
                    errors.badgeNo ? "border-red-400 focus:border-red-500" : ""
                  }`}
                  value={form.badgeNo}
                  onChange={(e) => setField("badgeNo", e.target.value)}
                  placeholder="Badge No"
                />
              </Field>

              <Field label="Aadhaar" error={errors.adhaarNumber}>
                <input
                  className={`app-input ${
                    errors.adhaarNumber
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  value={form.adhaarNumber}
                  onChange={(e) =>
                    setField("adhaarNumber", digitsOnly(e.target.value).slice(0, 12))
                  }
                  inputMode="numeric"
                  placeholder="Aadhaar"
                />
              </Field>

              <Field
                label="Father’s / Husband’s Name *"
                error={errors.fatherOrHusbandName}
              >
                <input
                  className={`app-input ${
                    errors.fatherOrHusbandName
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  value={form.fatherOrHusbandName}
                  onChange={(e) =>
                    setField("fatherOrHusbandName", e.target.value)
                  }
                  placeholder="Father/Husband Name"
                  required
                />
              </Field>

              <Field label="Gender *" error={errors.gender}>
                <select
                  className={`app-input ${
                    errors.gender ? "border-red-400 focus:border-red-500" : ""
                  }`}
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value as Gender)}
                  required
                >
                  <option value="">Select</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field label="Age *" error={errors.age}>
                <input
                  className={`app-input ${
                    errors.age ? "border-red-400 focus:border-red-500" : ""
                  }`}
                  value={form.age}
                  onChange={(e) => setField("age", digitsOnly(e.target.value))}
                  inputMode="numeric"
                  placeholder="Age"
                  required
                />
              </Field>

              {/* ✅ UPDATED Department */}
              <Field label="Department" error={errors.department}>
                <select
                  className={`app-input ${
                    errors.department
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  value={form.department}
                  onChange={(e) =>
                    setField("department", e.target.value as Department)
                  }
                 
                >
                  <option value="">Select</option>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Blacklisted" error={errors.blacklisted}>
                <select
                  className={`app-input ${
                    errors.blacklisted
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  value={form.blacklisted}
                  onChange={(e) =>
                    setField("blacklisted", e.target.value as Blacklisted)
                  }
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </Field>

              <Field label="Medical Date">
                <input
                  type="date"
                  className="app-input"
                  value={form.medicalDate}
                  onChange={(e) => setField("medicalDate", e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
              Note: Fill <span className="font-semibold">either</span> Badge No
              or Aadhaar (one is mandatory).
            </div>
          </div>

          {/* ✅ NEW: Photos section */}
          <div className="mt-5 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Photos</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Supports all common formats. Images are auto-compressed to reduce server memory.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Passport Photo" error={errors.passportPhoto}>
                <input
                  type="file"
                  accept="image/*"
                  className="app-input"
                  onChange={(e) =>
                    handleImagePick("passportPhoto", e.target.files?.[0] || null)
                  }
                />
                {form.passportPhoto && (
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Saved: {formatBytes(form.passportPhoto.size)} ({form.passportPhoto.mime})
                  </div>
                )}
              </Field>

              <Field label="Aadhaar Front" error={errors.aadhaarFrontPhoto}>
                <input
                  type="file"
                  accept="image/*"
                  className="app-input"
                  onChange={(e) =>
                    handleImagePick("aadhaarFrontPhoto", e.target.files?.[0] || null)
                  }
                />
                {form.aadhaarFrontPhoto && (
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Saved: {formatBytes(form.aadhaarFrontPhoto.size)} ({form.aadhaarFrontPhoto.mime})
                  </div>
                )}
              </Field>

              <Field label="Aadhaar Back" error={errors.aadhaarBackPhoto}>
                <input
                  type="file"
                  accept="image/*"
                  className="app-input"
                  onChange={(e) =>
                    handleImagePick("aadhaarBackPhoto", e.target.files?.[0] || null)
                  }
                />
                {form.aadhaarBackPhoto && (
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Saved: {formatBytes(form.aadhaarBackPhoto.size)} ({form.aadhaarBackPhoto.mime})
                  </div>
                )}
              </Field>

              <Field label="Medical Photo" error={errors.medicalPhoto}>
                <input
                  type="file"
                  accept="image/*"
                  className="app-input"
                  onChange={(e) =>
                    handleImagePick("medicalPhoto", e.target.files?.[0] || null)
                  }
                />
                {form.medicalPhoto && (
                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Saved: {formatBytes(form.medicalPhoto.size)} ({form.medicalPhoto.mime})
                  </div>
                )}
              </Field>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Contact</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Phone numbers
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Mobile *" error={errors.mobile}>
                <input
                  className={`app-input ${
                    errors.mobile ? "border-red-400 focus:border-red-500" : ""
                  }`}
                  value={form.mobile}
                  onChange={(e) => setField("mobile", digitsOnly(e.target.value))}
                  inputMode="numeric"
                  placeholder="Mobile"
                  required
                />
              </Field>

              <Field label="Emergency Number" error={errors.emergencyNumber}>
                <input
                  className={`app-input ${
                    errors.emergencyNumber
                      ? "border-red-400 focus:border-red-500"
                      : ""
                  }`}
                  value={form.emergencyNumber}
                  onChange={(e) =>
                    setField("emergencyNumber", digitsOnly(e.target.value))
                  }
                  inputMode="numeric"
                  placeholder="Emergency Number"
                />
              </Field>

              <Field label="Address *" error={errors.address}>
                <input
                  className={`app-input ${
                    errors.address ? "border-red-400 focus:border-red-500" : ""
                  }`}
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Address"
                  required
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold">Additional Information</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Notes
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-3">
                <Field label="Notes">
                  <textarea
                    className="app-textarea"
                    rows={4}
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                  />
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
                  adhaarNumber: "",
                  fatherOrHusbandName: "",
                  gender: "",
                  age: "",
                  address: "",
                  mobile: "",
                  department: "",
                  blacklisted: "No",
                  emergencyNumber: "",
                  medicalDate: "",
                  notes: "",
                  passportPhoto: null,
                  aadhaarFrontPhoto: null,
                  aadhaarBackPhoto: null,
                  medicalPhoto: null,
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

"use client";

import React from "react";

type Gender = "M" | "F" | "Other" | "";
type Blacklisted = "Yes" | "No" | "";

// ✅ UPDATED Department options (aligned with API)
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
  | "Langar"
  | "Guest-House";

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
  "Langar",
  "Guest-House",
];

// ✅ Image payload (compressed)
type ImgData = {
  dataUrl: string; // base64 compressed image data URL
  filename?: string;
  mime: string;
  size: number; // bytes (approx)
} | null;

type Customer = {
  _id: string;
  name: string;

  badgeNo?: string;
  fatherOrHusbandName?: string;
  gender?: Gender | string;

  // ✅ DOB + Age (Age is still stored for compatibility; DOB makes age auto-increment)
  dob?: string | null; // YYYY-MM-DD
  age?: number | null;

  address?: string;
  mobile?: string;
  adhaarNumber?: string;

  department?: Department | string;

  blacklisted?: Blacklisted | string;

  emergencyNumber?: string;
  medicalDate?: string | null;
  notes?: string;

  // ✅ image fields from backend
  passportPhoto?: ImgData;
  aadhaarFrontPhoto?: ImgData;
  aadhaarBackPhoto?: ImgData;
  medicalPhoto?: ImgData;
};

// ✅ Robust date normalizers (handles string | Date | Mongo Extended JSON)
function toYmdAny(v: any): string {
  if (!v) return "";
  try {
    // Mongo Extended JSON patterns
    const d1 = v?.$date;
    if (d1) {
      if (typeof d1 === "string") {
        const dt = new Date(d1);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
      if (typeof d1 === "number") {
        const dt = new Date(d1);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
      if (typeof d1 === "object" && d1?.$numberLong) {
        const n = Number(String(d1.$numberLong));
        const dt = new Date(n);
        if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      }
    }

    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);

    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return "";
      // If already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // ISO or other date-like string
      const dt = new Date(s);
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
      // sometimes backend returns "YYYY-MM-DDT..." without timezone
      if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    }

    // timestamp number
    if (typeof v === "number") {
      const dt = new Date(v);
      if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
    }

    // last resort: try Date(v)
    const dt = new Date(String(v));
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  } catch {
    // ignore
  }
  return "";
}

function fmtDate(d?: any) {
  const ymd = toYmdAny(d);
  if (!ymd) return "-";
  try {
    // Render in user's locale; input is date-only so add Z to avoid timezone shift in display
    const dt = new Date(ymd + "T00:00:00.000Z");
    return Number.isNaN(dt.getTime()) ? "-" : dt.toLocaleDateString();
  } catch {
    return "-";
  }
}

// ✅ DOB pretty format: "23rd feb 1995" (lowercase month)
function fmtDobPretty(d?: any) {
  const ymd = toYmdAny(d);
  if (!ymd) return "-";
  try {
    const dt = new Date(ymd + "T00:00:00.000Z");
    if (Number.isNaN(dt.getTime())) return "-";

    const day = dt.getUTCDate();
    const year = dt.getUTCFullYear();
    const months = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const month = months[dt.getUTCMonth()] || "";

    const mod100 = day % 100;
    const suffix =
      mod100 >= 11 && mod100 <= 13
        ? "th"
        : day % 10 === 1
        ? "st"
        : day % 10 === 2
        ? "nd"
        : day % 10 === 3
        ? "rd"
        : "th";

    return `${day}${suffix} ${month} ${year}`;
  } catch {
    return "-";
  }
}

function toDateInputValue(d?: any) {
  return toYmdAny(d);
}

// ✅ Strong id normalizer
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

function fmtExcelDate(d?: any) {
  return toYmdAny(d);
}

function digitsOnly(s: string) {
  return (s || "").replace(/\D/g, "");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </div>
      {children}
    </label>
  );
}

// ✅ DOB helpers (UTC-safe)
function parseDobYmd(dobYmd: any): Date | null {
  const s = String(dobYmd ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function calcAgeFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

// --- UI helpers for images ---
function formatBytes(bytes?: number) {
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

function safeImgSrc(img?: ImgData) {
  if (!img?.dataUrl) return "";
  return img.dataUrl;
}

/**
 * Compress image file in-browser using canvas.
 * - Resizes to maxW/maxH (keeps aspect ratio)
 * - Encodes to JPEG/WebP for smaller size
 */
async function fileToCompressedImgData(
  file: File,
  opts?: { maxW?: number; maxH?: number; quality?: number }
): Promise<ImgData> {
  const maxW = opts?.maxW ?? 900;
  const maxH = opts?.maxH ?? 900;
  const quality = opts?.quality ?? 0.75;

  // Read file into Image
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(new Error("Failed to read image"));
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Invalid image file"));
    im.src = dataUrl;
  });

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  // Compute new size (contain)
  let w = iw;
  let h = ih;
  const wr = maxW / w;
  const hr = maxH / h;
  const r = Math.min(1, wr, hr);
  w = Math.max(1, Math.round(w * r));
  h = Math.max(1, Math.round(h * r));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0, w, h);

  // Prefer webp if browser supports, else jpeg
  const mimeCandidate = "image/webp";
  const testWebp = canvas.toDataURL(mimeCandidate).startsWith("data:image/webp");
  const outMime = testWebp ? "image/webp" : "image/jpeg";

  const outDataUrl = canvas.toDataURL(outMime, quality);

  // Approx byte size from base64
  const base64 = outDataUrl.split(",")[1] || "";
  const approxBytes = Math.floor((base64.length * 3) / 4);

  return {
    dataUrl: outDataUrl,
    filename: file.name,
    mime: outMime,
    size: approxBytes,
  };
}

function validateCustomerInput(c: Customer) {
  const name = (c.name || "").trim();
  const badge = (c.badgeNo || "").trim();
  const aadhaar = digitsOnly(c.adhaarNumber || "").trim();
  const fh = (c.fatherOrHusbandName || "").trim();
  const addr = (c.address || "").trim();
  const mob = digitsOnly(c.mobile || "").trim();
  const gender = (c.gender as any) || "";

  // ✅ prefer DOB if present
  const dobStr = String(c.dob || "").trim();
  const dob = dobStr ? parseDobYmd(dobStr) : null;

  // fallback legacy age
  const ageVal = c.age;

  if (!name) return { ok: false, msg: "Name is required." };

  // ✅ One of Badge or Aadhaar must be filled
  if (!badge && !aadhaar) {
    return {
      ok: false,
      msg: "Please fill either Badge No or Aadhaar (one is mandatory).",
    };
  }

  // ✅ Mandatory fields
  if (!fh) return { ok: false, msg: "Father/Husband Name is mandatory." };
  if (!addr) return { ok: false, msg: "Address is mandatory." };
  if (!gender) return { ok: false, msg: "Gender is mandatory." };

  // ✅ DOB/age rules
  let age: number | null = null;
  if (dob) age = calcAgeFromDob(dob);
  else if (dobStr && !dob) return { ok: false, msg: "DOB must be a valid date (YYYY-MM-DD)." };
  else if (ageVal === null || ageVal === undefined || Number.isNaN(Number(ageVal)))
    return { ok: false, msg: "DOB or Age is mandatory." };
  else age = Number(ageVal);

  if (age === null || Number.isNaN(age) || age <= 0 || age > 120)
    return { ok: false, msg: "Age must be valid (1–120). Use DOB for auto age." };

  if (!mob) return { ok: false, msg: "Mobile is mandatory." };

  // ✅ 10 digit rule
  if (mob && mob.length !== 10) return { ok: false, msg: "Mobile must be exactly 10 digits." };

  if (aadhaar && aadhaar.length !== 12)
    return { ok: false, msg: "Aadhaar must be 12 digits (if provided)." };

  // ✅ Department (optional, but validate if present)
  if (c.department && c.department !== "" && !DEPARTMENT_OPTIONS.includes(c.department as any)) {
    return { ok: false, msg: "Invalid Department." };
  }

  return { ok: true as const, msg: "" };
}

export default function CustomersPage() {
  const [items, setItems] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);

  // search / filters
  const [q, setQ] = React.useState("");
  const [gender, setGender] = React.useState<Gender>("");
  const [department, setDepartment] = React.useState<Department>("");
  const [blacklisted, setBlacklisted] = React.useState<Blacklisted>("");
  const [ageMin, setAgeMin] = React.useState("");
  const [ageMax, setAgeMax] = React.useState("");
  const [medFrom, setMedFrom] = React.useState("");
  const [medTo, setMedTo] = React.useState("");

  // ✅ autocomplete
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [sugOpen, setSugOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const sugBoxRef = React.useRef<HTMLDivElement | null>(null);

  // pagination
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  // edit modal
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [saving, setSaving] = React.useState(false);

  // export
  const [exporting, setExporting] = React.useState<"filtered" | "all" | null>(null);

  // ✅ image preview modal
  const [imgPreview, setImgPreview] = React.useState<{ title: string; src: string } | null>(null);

  // ✅ upload state inside edit modal
  const [imgUploading, setImgUploading] = React.useState<{
    passport?: boolean;
    aadhaarFront?: boolean;
    aadhaarBack?: boolean;
    medical?: boolean;
  }>({});

  const columns = [
    { label: "S.No", width: "w-12" },
    { label: "Name", width: "w-32" },
    { label: "Badge No", width: "w-20" },
    { label: "Aadhaar", width: "w-28" },
    { label: "Father/Husband", width: "w-36" },
    { label: "Gender", width: "w-16" },
    { label: "DOB", width: "w-24" },
    { label: "Age", width: "w-12" },
    { label: "Department", width: "w-24" },
    { label: "Address", width: "w-48" },
    { label: "Mobile", width: "w-28" },
    { label: "Blacklisted", width: "w-20" },
    { label: "Emergency", width: "w-28" },
    { label: "Medical Date", width: "w-24" },

    // ✅ image columns
    { label: "Passport", width: "w-24" },
    { label: "Aadhaar Front", width: "w-28" },
    { label: "Aadhaar Back", width: "w-28" },
    { label: "Medical Photo", width: "w-28" },

    { label: "Notes", width: "w-40" },
    { label: "Actions", width: "w-28" },
  ];

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (gender) params.set("gender", gender);
      if (department) params.set("department", department);
      if (blacklisted) params.set("blacklisted", blacklisted);
      if (ageMin) params.set("ageMin", ageMin);
      if (ageMax) params.set("ageMax", ageMax);
      if (medFrom) params.set("medFrom", medFrom);
      if (medTo) params.set("medTo", medTo);

      const res = await fetch(`/api/customers?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      const safe: Customer[] = (data.items || [])
        .map((x: any) => {
          const _id = normalizeId(x._id);

          // ✅ normalize date fields for UI display/edit
          const dob = toYmdAny(x.dob) || null;
          const medicalDate = toYmdAny(x.medicalDate) || null;

          return {
            ...x,
            _id,
            dob,
            medicalDate,
          };
        })
        .filter((x: any) => /^[a-fA-F0-9]{24}$/.test(x._id));

      setItems(safe);
      setPage(1);
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
    setDepartment("");
    setBlacklisted("");
    setAgeMin("");
    setAgeMax("");
    setMedFrom("");
    setMedTo("");
    setPage(1);
    setSuggestions([]);
    setSugOpen(false);
    setHighlightIndex(-1);
  }

  async function onDelete(id: string) {
    const realId = normalizeId(id);
    if (!/^[a-fA-F0-9]{24}$/.test(realId)) {
      alert(`Invalid id in UI: "${String(id)}"`);
      return;
    }
    if (!confirm("Delete this record?")) return;

    const res = await fetch(`/api/customers/${realId}`, { method: "DELETE" });
    const txt = await res.text().catch(() => "");
    if (!res.ok) {
      alert(`Delete failed (${res.status}). ${txt}`);
      return;
    }
    await load();
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const realId = normalizeId(editing._id);
    if (!/^[a-fA-F0-9]{24}$/.test(realId)) {
      alert(`Invalid id in edit: "${String(editing._id)}"`);
      return;
    }

    const v = validateCustomerInput(editing);
    if (!v.ok) {
      alert(v.msg);
      return;
    }

    setSaving(true);
    try {
      const { _id, ...rest } = editing;

      const payload = {
        ...rest,
        dob: rest.dob ? String(rest.dob).slice(0, 10) : null,
        adhaarNumber: rest.adhaarNumber ? digitsOnly(String(rest.adhaarNumber)).slice(0, 12) : "",
        mobile: rest.mobile ? digitsOnly(String(rest.mobile)).slice(0, 10) : "",
        emergencyNumber: rest.emergencyNumber ? digitsOnly(String(rest.emergencyNumber)) : "",
        medicalDate: rest.medicalDate ? String(rest.medicalDate).slice(0, 10) : null,
        blacklisted: (rest.blacklisted as any) || "No",
        department: (rest.department as any) || "",

        // ✅ images can be edited now
        passportPhoto: rest.passportPhoto || null,
        aadhaarFrontPhoto: rest.aadhaarFrontPhoto || null,
        aadhaarBackPhoto: rest.aadhaarBackPhoto || null,
        medicalPhoto: rest.medicalPhoto || null,
      };

      const res = await fetch(`/api/customers/${realId}`, {
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
      await load();
    } finally {
      setSaving(false);
    }
  }

  // --------- Export helpers ----------
  async function exportCustomersToExcel(rows: Customer[], filename: string) {
    const XLSX = await import("xlsx");

    const header = [
      "S.No",
      "Name",
      "Badge No",
      "Aadhaar",
      "Father/Husband",
      "Gender",
      "DOB",
      "Age",
      "Department",
      "Address",
      "Mobile",
      "Blacklisted",
      "Emergency",
      "Medical Date",

      // ✅ export as Yes/No flags
      "Passport Photo",
      "Aadhaar Front Photo",
      "Aadhaar Back Photo",
      "Medical Photo",

      "Notes",
    ];

    const aoa: any[][] = [header];
    rows.forEach((c, idx) => {
      aoa.push([
        idx + 1,
        c.name || "",
        c.badgeNo || "",
        c.adhaarNumber || "",
        c.fatherOrHusbandName || "",
        c.gender || "",
        c.dob ? String(c.dob).slice(0, 10) : "",
        c.age ?? "",
        (c.department as any) || "",
        c.address || "",
        c.mobile || "",
        (c.blacklisted as any) || "No",
        c.emergencyNumber || "",
        fmtExcelDate(c.medicalDate),

        c.passportPhoto?.dataUrl ? "Yes" : "No",
        c.aadhaarFrontPhoto?.dataUrl ? "Yes" : "No",
        c.aadhaarBackPhoto?.dataUrl ? "Yes" : "No",
        c.medicalPhoto?.dataUrl ? "Yes" : "No",

        c.notes || "",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, filename);
  }

  async function onExportFiltered() {
    try {
      setExporting("filtered");
      await exportCustomersToExcel(
        items,
        `customers_filtered_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e: any) {
      alert(e?.message || "Export failed");
    } finally {
      setExporting(null);
    }
  }

  async function onExportAll() {
    try {
      setExporting("all");
      const res = await fetch(`/api/customers?limit=10000`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      const safe: Customer[] = (data.items || [])
        .map((x: any) => ({
          ...x,
          _id: normalizeId(x._id),
          dob: toYmdAny(x.dob) || null,
          medicalDate: toYmdAny(x.medicalDate) || null,
        }))
        .filter((x: any) => /^[a-fA-F0-9]{24}$/.test(x._id));

      await exportCustomersToExcel(
        safe,
        `customers_all_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e: any) {
      alert(e?.message || "Export failed");
    } finally {
      setExporting(null);
    }
  }

  // ---------- Pagination derived values ----------
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = items.slice(startIndex, endIndex);

  function getPageButtons() {
    const maxButtons = 7;
    if (totalPages <= maxButtons)
      return Array.from({ length: totalPages }, (_, i) => i + 1);

    const left = Math.max(1, page - 2);
    const right = Math.min(totalPages, page + 2);

    const pages = new Set<number>([1, totalPages, page]);
    for (let p = left; p <= right; p++) pages.add(p);

    return Array.from(pages).sort((a, b) => a - b);
  }
  const pageButtons = getPageButtons();

  // ---------- Autocomplete (debounced) ----------
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
        const res = await fetch(
          `/api/customers/suggest?q=${encodeURIComponent(term)}`,
          { cache: "no-store" }
        );
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

  // close suggestions on outside click
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
    load();
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!sugOpen || suggestions.length === 0) {
      if (e.key === "Enter") load();
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
      const chosen =
        highlightIndex >= 0 ? suggestions[highlightIndex] : suggestions[0];
      pickSuggestion(chosen);
    } else if (e.key === "Escape") {
      setSugOpen(false);
      setHighlightIndex(-1);
    }
  }

  function ImgCell({ title, img }: { title: string; img?: ImgData }) {
    const src = safeImgSrc(img);
    if (!src) return <span className="text-zinc-500">-</span>;

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setImgPreview({ title, src })}
          className="h-8 w-8 overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
          title="Click to preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={title} className="h-full w-full object-cover" />
        </button>
        <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
          {formatBytes(img?.size)}
        </span>
      </div>
    );
  }

  async function onPickEditImage(
    kind: "passport" | "aadhaarFront" | "aadhaarBack" | "medical",
    file: File | null
  ) {
    if (!editing) return;
    if (!file) return;

    // basic file type guard
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    setImgUploading((s) => ({ ...s, [kind]: true }));
    try {
      const imgData = await fileToCompressedImgData(file, {
        maxW: 900,
        maxH: 900,
        quality: 0.75,
      });

      setEditing((prev) => {
        if (!prev) return prev;
        const patch: Partial<Customer> = {};
        if (kind === "passport") patch.passportPhoto = imgData;
        if (kind === "aadhaarFront") patch.aadhaarFrontPhoto = imgData;
        if (kind === "aadhaarBack") patch.aadhaarBackPhoto = imgData;
        if (kind === "medical") patch.medicalPhoto = imgData;
        return { ...prev, ...patch };
      });
    } catch (e: any) {
      alert(e?.message || "Failed to process image.");
    } finally {
      setImgUploading((s) => ({ ...s, [kind]: false }));
    }
  }

  function clearEditImage(kind: "passport" | "aadhaarFront" | "aadhaarBack" | "medical") {
    if (!editing) return;
    setEditing((prev) => {
      if (!prev) return prev;
      const patch: Partial<Customer> = {};
      if (kind === "passport") patch.passportPhoto = null;
      if (kind === "aadhaarFront") patch.aadhaarFrontPhoto = null;
      if (kind === "aadhaarBack") patch.aadhaarBackPhoto = null;
      if (kind === "medical") patch.medicalPhoto = null;
      return { ...prev, ...patch };
    });
  }

  // computed age for edit modal display
  const editDob = editing?.dob ? parseDobYmd(editing.dob) : null;
  const editComputedAge = editDob ? calcAgeFromDob(editDob) : (editing?.age ?? null);

  return (
    <div className="app-page w-full max-w-none">
      <div className="app-card app-card-pad w-full max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Sangat Data</h1>
            <p className="app-subtitle">Search, filter, edit and delete records.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                clearFilters();
                load();
              }}
              className="app-btn app-btn-secondary h-10 px-4"
            >
              Clear
            </button>

            <button onClick={load} className="app-btn app-btn-primary h-10 px-4">
              Search
            </button>

            <button
              onClick={onExportFiltered}
              disabled={exporting !== null || items.length === 0}
              className="app-btn app-btn-secondary h-10 px-4"
            >
              {exporting === "filtered" ? "Exporting..." : "Export Filtered"}
            </button>

            <button
              onClick={onExportAll}
              disabled={exporting !== null}
              className="app-btn app-btn-secondary h-10 px-4"
            >
              {exporting === "all" ? "Exporting..." : "Export All"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {/* Search with suggestions */}
          <div className="relative" ref={sugBoxRef}>
            <div className="app-label">Search</div>
            <input
              className="app-input app-input-sm"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setSugOpen(true);
              }}
              onFocus={() => suggestions.length && setSugOpen(true)}
              onKeyDown={onSearchKeyDown}
              placeholder="Name / Mobile / Aadhaar / Badge / Dept"
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
                      idx === highlightIndex
                        ? "bg-zinc-100 dark:bg-zinc-900/40"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-900/30",
                    ].join(" ")}
                    title="Click to search"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="app-label">Gender</div>
            <select
              className="app-input app-input-sm"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
            >
              <option value="">All</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Department filter */}
          <div>
            <div className="app-label">Department</div>
            <select
              className="app-input app-input-sm"
              value={department}
              onChange={(e) => setDepartment(e.target.value as Department)}
            >
              <option value="">All</option>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="app-label">Blacklisted</div>
            <select
              className="app-input app-input-sm"
              value={blacklisted}
              onChange={(e) => setBlacklisted(e.target.value as Blacklisted)}
            >
              <option value="">All</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div>
            <div className="app-label">Age Min</div>
            <input
              className="app-input app-input-sm"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <div>
            <div className="app-label">Age Max</div>
            <input
              className="app-input app-input-sm"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <div>
            <div className="app-label">Medical From</div>
            <input
              type="date"
              className="app-input app-input-sm"
              value={medFrom}
              onChange={(e) => setMedFrom(e.target.value)}
            />
          </div>

          <div>
            <div className="app-label">Medical To</div>
            <input
              type="date"
              className="app-input app-input-sm"
              value={medTo}
              onChange={(e) => setMedTo(e.target.value)}
            />
          </div>
        </div>

        {/* Pagination bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Showing{" "}
            <span className="font-semibold">
              {total === 0 ? 0 : startIndex + 1}
            </span>
            –<span className="font-semibold">{Math.min(endIndex, total)}</span>{" "}
            of <span className="font-semibold">{total}</span>
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

            <button
              className="app-btn app-btn-secondary h-9 px-3 text-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>

            <div className="flex items-center gap-1">
              {pageButtons.map((p, idx) => {
                const prev = pageButtons[idx - 1];
                const showDots = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showDots && <span className="px-1 text-zinc-400">…</span>}
                    <button
                      className={[
                        "h-9 rounded-xl px-3 text-xs font-semibold",
                        p === page
                          ? "bg-black text-white dark:bg-white dark:text-black"
                          : "border border-black/10 bg-white hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/40",
                      ].join(" ")}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <button
              className="app-btn app-btn-secondary h-9 px-3 text-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto mt-4">
          <table className="min-w-[2400px] table-fixed border-collapse text-xs">
            <thead className="thead">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.label}
                    className={`th ${c.width} whitespace-normal break-words px-2 py-2`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td
                    className="td text-zinc-600 dark:text-zinc-400 whitespace-normal break-words px-2 py-2"
                    colSpan={columns.length}
                  >
                    Loading...
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td
                    className="td text-zinc-600 dark:text-zinc-400 whitespace-normal break-words px-2 py-2"
                    colSpan={columns.length}
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                pageItems.map((c, i) => {
                  const serial = (page - 1) * pageSize + i + 1;

                  return (
                    <tr
                      key={c._id}
                      className={[
                        "row",
                        i % 2 === 0 ? "row-alt" : "row-alt2",
                      ].join(" ")}
                    >
                      {/* S.No */}
                      <td className="td whitespace-nowrap px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              ...c,
                              dob: toDateInputValue(c.dob) || "",
                              medicalDate: toDateInputValue(c.medicalDate) || "",
                              blacklisted: (c.blacklisted as any) || "No",
                              department: (c.department as any) || "",
                            })
                          }
                          className="rounded-lg px-2 py-1 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                          title="Click to edit"
                        >
                          {serial}
                        </button>
                      </td>

                      {/* Name */}
                      <td className="td whitespace-normal break-words px-2 py-2 font-medium">
                        {c.name || "-"}
                      </td>

                      {/* Badge No */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {c.badgeNo || "-"}
                      </td>

                      {/* Aadhaar */}
                      <td className="td whitespace-normal break-all px-2 py-2">
                        {c.adhaarNumber || "-"}
                      </td>

                      {/* Father/Husband */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {c.fatherOrHusbandName || "-"}
                      </td>

                      {/* Gender */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {(c.gender as any) || "-"}
                      </td>

                      {/* DOB */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {fmtDobPretty(c.dob)}
                      </td>

                      {/* Age */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {c.age ?? "-"}
                      </td>

                      {/* Department */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {(c.department as any) || "-"}
                      </td>

                      {/* Address */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {c.address || "-"}
                      </td>

                      {/* Mobile */}
                      <td className="td whitespace-normal break-all px-2 py-2">
                        {c.mobile || "-"}
                      </td>

                      {/* Blacklisted */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {(c.blacklisted as any) || "No"}
                      </td>

                      {/* Emergency */}
                      <td className="td whitespace-normal break-all px-2 py-2">
                        {c.emergencyNumber || "-"}
                      </td>

                      {/* Medical Date */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {fmtDate(c.medicalDate)}
                      </td>

                      {/* Images */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        <ImgCell
                          title={`${c.name || "Passport"} - Passport`}
                          img={c.passportPhoto}
                        />
                      </td>

                      <td className="td whitespace-normal break-words px-2 py-2">
                        <ImgCell
                          title={`${c.name || "Aadhaar Front"} - Aadhaar Front`}
                          img={c.aadhaarFrontPhoto}
                        />
                      </td>

                      <td className="td whitespace-normal break-words px-2 py-2">
                        <ImgCell
                          title={`${c.name || "Aadhaar Back"} - Aadhaar Back`}
                          img={c.aadhaarBackPhoto}
                        />
                      </td>

                      <td className="td whitespace-normal break-words px-2 py-2">
                        <ImgCell
                          title={`${c.name || "Medical"} - Medical`}
                          img={c.medicalPhoto}
                        />
                      </td>

                      {/* Notes */}
                      <td className="td whitespace-normal break-words px-2 py-2">
                        {c.notes || "-"}
                      </td>

                      {/* Actions */}
                      <td className="td whitespace-nowrap px-2 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setEditing({
                                ...c,
                                dob: toDateInputValue(c.dob) || "",
                                medicalDate: toDateInputValue(c.medicalDate) || "",
                                blacklisted: (c.blacklisted as any) || "No",
                                department: (c.department as any) || "",
                              })
                            }
                            className="app-btn app-btn-secondary h-8 px-2 text-[11px]"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => onDelete(c._id)}
                            className="h-8 rounded-xl border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200 dark:hover:bg-red-900/30"
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

      {/* ✅ Image Preview Modal */}
      {imgPreview && (
        <div className="fixed inset-0 z-[60] bg-black/60 p-4 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-4 shadow-lg dark:bg-zinc-950 my-6">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{imgPreview.title}</div>
              <button
                onClick={() => setImgPreview(null)}
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgPreview.src}
                alt={imgPreview.title}
                className="h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (✅ now includes DOB + auto Age) */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-950 my-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Customer</h3>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={onSaveEdit}
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <input
                className="app-input app-input-sm"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Name"
                required
              />

              <input
                className="app-input app-input-sm"
                value={editing.badgeNo || ""}
                onChange={(e) =>
                  setEditing({ ...editing, badgeNo: e.target.value })
                }
                placeholder="Badge No"
              />

              <input
                className="app-input app-input-sm"
                value={editing.adhaarNumber || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    adhaarNumber: digitsOnly(e.target.value).slice(0, 12),
                  })
                }
                placeholder="Aadhaar"
                inputMode="numeric"
              />

              <input
                className="app-input app-input-sm"
                value={editing.fatherOrHusbandName || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    fatherOrHusbandName: e.target.value,
                  })
                }
                placeholder="Father/Husband Name"
                required
              />

              <select
                className="app-input app-input-sm"
                value={(editing.gender as any) || ""}
                onChange={(e) =>
                  setEditing({ ...editing, gender: e.target.value as any })
                }
                required
              >
                <option value="">Gender</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="Other">Other</option>
              </select>

              {/* ✅ DOB input (preferred) */}
              <input
                type="date"
                className="app-input app-input-sm"
                value={editing.dob ? String(editing.dob).slice(0, 10) : ""}
                onChange={(e) => {
                  const dobYmd = e.target.value;
                  const d = dobYmd ? parseDobYmd(dobYmd) : null;
                  const age = d ? calcAgeFromDob(d) : editing.age ?? null;
                  setEditing({ ...editing, dob: dobYmd, age });
                }}
                placeholder="DOB"
              />

              {/* ✅ Age stays for compatibility, but auto when DOB is present */}
              <input
                className="app-input app-input-sm"
                value={String(editing.dob ? (editComputedAge ?? "") : (editing.age ?? ""))}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    age: Number(digitsOnly(e.target.value || "")) || null,
                  })
                }
                placeholder="Age"
                inputMode="numeric"
                disabled={!!editing.dob}
                title={editing.dob ? "Age is auto-calculated from DOB" : "Enter Age (or set DOB)"}
                required={!editing.dob}
              />

              <select
                className="app-input app-input-sm"
                value={(editing.department as any) || ""}
                onChange={(e) =>
                  setEditing({ ...editing, department: e.target.value as any })
                }
              >
                <option value="">Department</option>
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <input
                className="app-input app-input-sm"
                value={editing.mobile || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    mobile: digitsOnly(e.target.value).slice(0, 10),
                  })
                }
                placeholder="Mobile (10 digits)"
                inputMode="numeric"
                required
              />

              <select
                className="app-input app-input-sm"
                value={(editing.blacklisted as any) || "No"}
                onChange={(e) =>
                  setEditing({ ...editing, blacklisted: e.target.value as any })
                }
              >
                <option value="No">Blacklisted: No</option>
                <option value="Yes">Blacklisted: Yes</option>
              </select>

              <input
                className="app-input app-input-sm"
                value={editing.emergencyNumber || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    emergencyNumber: digitsOnly(e.target.value),
                  })
                }
                placeholder="Emergency Number"
                inputMode="numeric"
              />

              <Field label="Medical Date">
                <input
                  type="date"
                  className="app-input app-input-sm"
                  value={(editing.medicalDate as any) || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, medicalDate: e.target.value })
                  }
                />
              </Field>

              <input
                className="app-input app-input-sm sm:col-span-2 lg:col-span-3"
                value={editing.address || ""}
                onChange={(e) =>
                  setEditing({ ...editing, address: e.target.value })
                }
                placeholder="Address"
                required
              />

              <textarea
                className="app-textarea sm:col-span-2 lg:col-span-3"
                rows={4}
                value={editing.notes || ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                placeholder="Notes"
              />

              {/* ✅ Photo Upload section */}
              <div className="sm:col-span-2 lg:col-span-3 mt-2 rounded-2xl border border-black/5 p-4 dark:border-white/10">
                <div className="text-sm font-semibold mb-3">Photos</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Passport */}
                  <div className="rounded-xl border border-black/5 p-3 dark:border-white/10">
                    <div className="text-xs font-semibold mb-2">Passport Photo</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
                        onClick={() => {
                          const src = safeImgSrc(editing.passportPhoto);
                          if (src) setImgPreview({ title: `${editing.name} - Passport`, src });
                        }}
                        title="Preview"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            safeImgSrc(editing.passportPhoto) ||
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23eee'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='12'%3ENo%20Photo%3C/text%3E%3C/svg%3E"
                          }
                          alt="Passport"
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-xs"
                          onChange={(e) => onPickEditImage("passport", e.target.files?.[0] || null)}
                          disabled={!!imgUploading.passport}
                        />
                        <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                          {editing.passportPhoto ? `Selected: ${formatBytes(editing.passportPhoto.size)}` : "No image"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => clearEditImage("passport")}
                        className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Aadhaar Front */}
                  <div className="rounded-xl border border-black/5 p-3 dark:border-white/10">
                    <div className="text-xs font-semibold mb-2">Aadhaar Front</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
                        onClick={() => {
                          const src = safeImgSrc(editing.aadhaarFrontPhoto);
                          if (src) setImgPreview({ title: `${editing.name} - Aadhaar Front`, src });
                        }}
                        title="Preview"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            safeImgSrc(editing.aadhaarFrontPhoto) ||
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23eee'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='12'%3ENo%20Photo%3C/text%3E%3C/svg%3E"
                          }
                          alt="Aadhaar Front"
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-xs"
                          onChange={(e) => onPickEditImage("aadhaarFront", e.target.files?.[0] || null)}
                          disabled={!!imgUploading.aadhaarFront}
                        />
                        <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                          {editing.aadhaarFrontPhoto ? `Selected: ${formatBytes(editing.aadhaarFrontPhoto.size)}` : "No image"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => clearEditImage("aadhaarFront")}
                        className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Aadhaar Back */}
                  <div className="rounded-xl border border-black/5 p-3 dark:border-white/10">
                    <div className="text-xs font-semibold mb-2">Aadhaar Back</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
                        onClick={() => {
                          const src = safeImgSrc(editing.aadhaarBackPhoto);
                          if (src) setImgPreview({ title: `${editing.name} - Aadhaar Back`, src });
                        }}
                        title="Preview"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            safeImgSrc(editing.aadhaarBackPhoto) ||
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23eee'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='12'%3ENo%20Photo%3C/text%3E%3C/svg%3E"
                          }
                          alt="Aadhaar Back"
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-xs"
                          onChange={(e) => onPickEditImage("aadhaarBack", e.target.files?.[0] || null)}
                          disabled={!!imgUploading.aadhaarBack}
                        />
                        <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                          {editing.aadhaarBackPhoto ? `Selected: ${formatBytes(editing.aadhaarBackPhoto.size)}` : "No image"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => clearEditImage("aadhaarBack")}
                        className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Medical */}
                  <div className="rounded-xl border border-black/5 p-3 dark:border-white/10">
                    <div className="text-xs font-semibold mb-2">Medical Photo</div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950"
                        onClick={() => {
                          const src = safeImgSrc(editing.medicalPhoto);
                          if (src) setImgPreview({ title: `${editing.name} - Medical`, src });
                        }}
                        title="Preview"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            safeImgSrc(editing.medicalPhoto) ||
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23eee'/%3E%3Ctext x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='12'%3ENo%20Photo%3C/text%3E%3C/svg%3E"
                          }
                          alt="Medical"
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-xs"
                          onChange={(e) => onPickEditImage("medical", e.target.files?.[0] || null)}
                          disabled={!!imgUploading.medical}
                        />
                        <div className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                          {editing.medicalPhoto ? `Selected: ${formatBytes(editing.medicalPhoto.size)}` : "No image"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => clearEditImage("medical")}
                        className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                  Supported: JPG/JPEG, PNG, WEBP (any <code>image/*</code>). Images are auto-compressed before saving.
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="app-btn app-btn-secondary h-10 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="app-btn app-btn-primary h-10 px-4"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>

            <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Note: Either <span className="font-semibold">Badge No</span> or{" "}
              <span className="font-semibold">Aadhaar</span> must be filled. Mobile must be{" "}
              <span className="font-semibold">10 digits</span>. If DOB is set, Age is auto-calculated.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

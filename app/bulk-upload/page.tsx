"use client";

import React from "react";

type RowErr = { row: number; field: string; message: string };

export default function BulkUploadPage() {
  const [bulkFile, setBulkFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: "idle" | "ok" | "err"; msg: string }>({
    type: "idle",
    msg: "",
  });

  // ✅ show detailed row errors from backend
  const [errors, setErrors] = React.useState<RowErr[]>([]);
  const [totalErrors, setTotalErrors] = React.useState<number>(0);

  // ✅ NEW: reset file input (so user can pick another file after clearing)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  function downloadSample() {
    window.location.href = "/api/customers/sample";
  }

  function clearSelectedFile() {
    setBulkFile(null);
    setStatus({ type: "idle", msg: "" });
    setErrors([]);
    setTotalErrors(0);
    if (fileInputRef.current) fileInputRef.current.value = ""; // ✅ important
  }

  async function uploadBulk() {
    if (!bulkFile) {
      setStatus({ type: "err", msg: "Please choose an Excel file first." });
      return;
    }

    setUploading(true);
    setStatus({ type: "idle", msg: "" });
    setErrors([]);
    setTotalErrors(0);

    try {
      const fd = new FormData();
      fd.append("file", bulkFile);

      const res = await fetch("/api/customers/bulk", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const list: RowErr[] = Array.isArray(data?.errors) ? data.errors : [];
        setErrors(list);
        setTotalErrors(Number(data?.totalErrors || list.length || 0));
        setStatus({ type: "err", msg: data?.error || "Upload failed." });
        return;
      }

      clearSelectedFile(); // ✅ clears file + input value
      setStatus({ type: "ok", msg: `Uploaded successfully! Inserted ${data.inserted} records.` });
      
    } catch (e: any) {
      setStatus({ type: "err", msg: e?.message || "Network error." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="app-page">
      <div className="app-card app-card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="app-title">Bulk Upload</h1>
            <p className="app-subtitle">Download the sample Excel file, fill it with sangat data, then upload.</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={downloadSample} className="app-btn app-btn-secondary h-10 px-4">
              Download Sample
            </button>

            <button
              onClick={uploadBulk}
              disabled={uploading}
              className="app-btn app-btn-primary h-10 px-4 disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="app-label">Select Excel file</div>

              {/* ✅ NEW: Clear button before choose file */}
              <div className="flex items-center gap-2">
               

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="app-input app-input-sm pt-2 flex-1"
                  onChange={(e) => {
                    setBulkFile(e.target.files?.[0] || null);
                    setStatus({ type: "idle", msg: "" });
                    setErrors([]);
                    setTotalErrors(0);
                  }}
                />
                 <button
                  type="button"
                  onClick={clearSelectedFile}
                  disabled={uploading || (!bulkFile && !errors.length && status.type === "idle")}
                  className="app-btn app-btn-secondary h-10 px-4 disabled:opacity-60"
                  title="Clear selected file"
                >
                  Clear File
                </button>
              </div>

              {bulkFile && (
                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                  Selected: <span className="font-semibold">{bulkFile.name}</span>
                </div>
              )}

              {/* rules text */}
              <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                <div>Tip: Use the exact column headers from the sample file.</div>
                <div className="font-medium">Required: Name, Father/Husband Name, Gender, Age, Address, Mobile</div>
                <div className="font-medium">
                  Also required: Either Badge No <span className="font-semibold">or</span> Aadhaar (one must be filled).
                </div>
                <div className="font-medium">Blacklisted supports: Yes / No (default is No)</div>
              </div>
            </div>

            <div className="flex items-end">
              {status.type !== "idle" && (
                <div
                  className={[
                    "w-full rounded-xl border p-3 text-sm",
                    status.type === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200",
                  ].join(" ")}
                  role="status"
                >
                  {status.msg}
                </div>
              )}
            </div>
          </div>

          {/* Detailed row errors */}
          {errors.length > 0 && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">Fix these rows and upload again</div>
                <div className="text-xs opacity-90">
                  Total errors: <span className="font-semibold">{totalErrors || errors.length}</span>
                </div>
              </div>

              <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-red-200/60 bg-white/60 p-3 text-xs dark:border-red-900/30 dark:bg-black/10">
                <ul className="space-y-1">
                  {errors.slice(0, 200).map((e, idx) => (
                    <li key={idx} className="leading-5">
                      <span className="font-semibold">Row {e.row}</span> — {e.field}: {e.message}
                    </li>
                  ))}
                </ul>
                {errors.length > 200 && <div className="mt-2 font-semibold">Showing first 200 errors…</div>}
              </div>

              <div className="mt-3 text-xs opacity-90">
                Nothing was uploaded because some rows are invalid. Please correct the rows above and upload again.
              </div>
            </div>
          )}
        </div>

        {/* Accepted columns */}
        <div className="mt-6 rounded-2xl border border-black/5 p-4 text-sm text-zinc-700 dark:border-white/10 dark:text-zinc-200 sm:p-5">
          <div className="font-semibold">Accepted Columns</div>
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Name *",
              "Badge No (or Aadhaar) *",
              "Adhaar Number (or Badge No) *",
              "Father’s / Husband’s Name *",
              "Gender * (M / F / Other)",
              "Age *",
              "Address *",
              "Mobile *",
              "Blacklisted (Yes/No)",
              "Emergency Number",
              "Medical Date",
              "Notes",
            ].map((c) => (
              <div
                key={c}
                className="rounded-lg border border-black/5 bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-950"
              >
                {c}
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
            * Mandatory columns. For identity, you must fill <span className="font-semibold">either</span> Badge No or
            Aadhaar.
          </div>
        </div>
      </div>
    </div>
  );
}

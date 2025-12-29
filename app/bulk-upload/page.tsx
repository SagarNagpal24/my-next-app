"use client";

import React from "react";

export default function BulkUploadPage() {
  const [bulkFile, setBulkFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: "idle" | "ok" | "err"; msg: string }>({
    type: "idle",
    msg: "",
  });

  function downloadSample() {
    window.location.href = "/api/customers/sample";
  }

  async function uploadBulk() {
    if (!bulkFile) {
      setStatus({ type: "err", msg: "Please choose an Excel file first." });
      return;
    }

    setUploading(true);
    setStatus({ type: "idle", msg: "" });

    try {
      const fd = new FormData();
      fd.append("file", bulkFile);

      const res = await fetch("/api/customers/bulk", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ type: "err", msg: data?.error || "Upload failed." });
        return;
      }

      setStatus({ type: "ok", msg: `Uploaded successfully! Inserted ${data.inserted} records.` });
      setBulkFile(null);
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
            <p className="app-subtitle">
              Download the sample Excel file, fill it with customer data, then upload.
            </p>
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
              <input
                type="file"
                accept=".xlsx,.xls"
                className="app-input app-input-sm pt-2"
                onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
              />
              {bulkFile && (
                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                  Selected: <span className="font-semibold">{bulkFile.name}</span>
                </div>
              )}

              <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                Tip: Use the exact column headers from the sample file. “Name” is required.
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
        </div>

        <div className="mt-6 rounded-2xl border border-black/5 p-4 text-sm text-zinc-700 dark:border-white/10 dark:text-zinc-200 sm:p-5">
          <div className="font-semibold">Accepted Columns</div>
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Name",
              "Badge No",
              "Father’s / Husband’s Name",
              "Gender",
              "Age",
              "Address",
              "Mobile",
              "Adhaar Number",
              "Emergency Number",
              "Medical Date",
              "Notes",
            ].map((c) => (
              <div key={c} className="rounded-lg border border-black/5 bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-950">
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

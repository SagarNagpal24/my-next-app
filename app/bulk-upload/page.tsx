"use client";

import React from "react";

type RowErr = { row: number; field: string; message: string };

export default function BulkUploadPage() {
  const [bulkFile, setBulkFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const [status, setStatus] = React.useState<{
    type: "idle" | "ok" | "err";
    msg: string;
  }>({ type: "idle", msg: "" });

  const [errors, setErrors] = React.useState<RowErr[]>([]);
  const [totalErrors, setTotalErrors] = React.useState(0);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  function downloadSample() {
    window.location.href = "/api/customers/sample";
  }

  function clearSelectedFile() {
    setBulkFile(null);
    setErrors([]);
    setTotalErrors(0);
    setStatus({ type: "idle", msg: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadBulk() {
    if (!bulkFile) {
      setStatus({ type: "err", msg: "Please choose an Excel file first." });
      return;
    }

    setUploading(true);
    setErrors([]);
    setTotalErrors(0);
    setStatus({ type: "idle", msg: "" });

    try {
      const fd = new FormData();
      fd.append("file", bulkFile);

      const res = await fetch("/api/customers/bulk", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const list: RowErr[] = Array.isArray(data?.errors) ? data.errors : [];
        setErrors(list);
        setTotalErrors(data?.totalErrors || list.length);
        setStatus({
          type: "err",
          msg:
            data?.error ||
            "Upload failed. Fix the errors (including 10-digit mobile numbers) and try again.",
        });
        return;
      }

      clearSelectedFile();
      setStatus({
        type: "ok",
        msg: "Successfully uploaded all the data.",
      });
    } catch (e: any) {
      setStatus({ type: "err", msg: e?.message || "Network error." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="app-page">
      <div className="app-card app-card-pad">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="app-title">Bulk Upload</h1>
            <p className="app-subtitle">
              Download the sample Excel file, fill it, and upload.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={downloadSample}
              className="app-btn app-btn-secondary h-10 px-4"
            >
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

        {/* File picker */}
        <div className="mt-6 rounded-2xl border border-black/5 p-4 dark:border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="app-label">Select Excel file</div>

              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="app-input app-input-sm pt-2 flex-1"
                  onChange={(e) => {
                    setBulkFile(e.target.files?.[0] || null);
                    setErrors([]);
                    setTotalErrors(0);
                    setStatus({ type: "idle", msg: "" });
                  }}
                />

                <button
                  type="button"
                  onClick={clearSelectedFile}
                  disabled={uploading || (!bulkFile && status.type === "idle")}
                  className="app-btn app-btn-secondary h-10 px-4 disabled:opacity-60"
                >
                  Clear File
                </button>
              </div>

              {bulkFile && (
                <div className="mt-2 text-sm">
                  Selected: <strong>{bulkFile.name}</strong>
                </div>
              )}

              {/* ✅ IMPORTANT RULES */}
              <div className="mt-3 text-xs text-zinc-600 space-y-1">
                <div>
                  Required: Name, Father/Husband, Gender, Age, Address, Mobile
                </div>
                <div>
                  <strong>Mobile must be exactly 10 digits</strong>
                </div>
                <div>
                  Either <strong>Badge No</strong> or{" "}
                  <strong>Aadhaar</strong> required
                </div>
                <div>Blacklisted: Yes / No</div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-end">
              {status.type !== "idle" && (
                <div
                  className={[
                    "w-full rounded-xl border p-3 text-sm",
                    status.type === "ok"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800",
                  ].join(" ")}
                >
                  {status.msg}
                </div>
              )}
            </div>
          </div>

          {/* Error Report */}
          {errors.length > 0 && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
              <div className="flex justify-between items-center">
                <div className="font-semibold">
                  Fix these rows and upload again
                </div>
                <button
                  onClick={() => {
                    setErrors([]);
                    setTotalErrors(0);
                    setStatus({ type: "idle", msg: "" });
                  }}
                  className="text-lg font-bold hover:opacity-70"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-2 text-xs">
                Total errors: <strong>{totalErrors}</strong>
              </div>

              <div className="mt-3 max-h-64 overflow-auto border rounded-lg bg-white p-3 text-xs">
                <ul className="space-y-1">
                  {errors.slice(0, 200).map((e, i) => (
                    <li key={i}>
                      <strong>Row {e.row}</strong> — {e.field}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 text-xs">
                No data was uploaded because some rows are invalid.
              </div>
            </div>
          )}
        </div>

        {/* Accepted Columns */}
        <div className="mt-6 rounded-2xl border p-4 text-sm">
          <div className="font-semibold mb-2">Accepted Columns</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
            {[
              "Name *",
              "Badge No (or Aadhaar) *",
              "Adhaar Number (or Badge No) *",
              "Father’s / Husband’s Name *",
              "Gender (M/F/Other) *",
              "Age *",
              "Address *",
              "Mobile (10 digits) *",
              "Department *",
              "Blacklisted (Yes/No)",
              "Emergency Number",
              "Medical Date",
              "Notes",
            ].map((c) => (
              <div
                key={c}
                className="rounded-lg border bg-white px-3 py-2"
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

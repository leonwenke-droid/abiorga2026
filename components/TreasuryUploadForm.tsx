 "use client";

import { useState } from "react";

export default function TreasuryUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/treasury/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    setLoading(false);
    setMessage(data.message || "Upload abgeschlossen");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      <div>
        <label className="mb-1 block text-xs font-semibold text-cyan-400">
          Excel-Datei (.xlsx)
        </label>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
        />
      </div>
      <button
        type="submit"
        disabled={!file || loading}
        className="btn-primary text-xs"
      >
        {loading ? "Lädt..." : "Kassenstand aktualisieren"}
      </button>
      <p className="text-[11px] text-cyan-400/70">
        Nur das Finanzkomitee darf den Kassenstand per Excel hochladen.
      </p>
      {message && (
        <p className="text-xs text-cyan-400/80">
          {message} – Dashboard aktualisiert sich automatisch.
        </p>
      )}
    </form>
  );
}


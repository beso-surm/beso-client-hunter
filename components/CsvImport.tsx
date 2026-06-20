"use client";

import { useState, useTransition, useRef } from "react";
import {
  previewCsvAction,
  importCsvAction,
  type CsvPreviewRow,
  type CsvPreviewResult,
} from "@/app/actions/import";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

type Step = "upload" | "preview" | "done";

export function CsvImport() {
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<CsvPreviewResult | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleParse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await previewCsvAction(formData);
      if (res.ok && res.data) {
        setPreview(res.data);
        setStep("preview");
      } else {
        setError((res as { ok: false; error: string }).error);
      }
    });
  }

  function handleImport() {
    if (!preview) return;
    const newRows = preview.rows.filter((r) => r.status === "new");
    setError(null);
    startTransition(async () => {
      const res = await importCsvAction(newRows);
      if (res.ok && res.data) {
        setResult(res.data);
        setStep("done");
      } else {
        setError((res as { ok: false; error: string }).error);
      }
    });
  }

  function reset() {
    setStep("upload");
    setPreview(null);
    setResult(null);
    setError(null);
    formRef.current?.reset();
  }

  if (step === "done" && result) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="mt-3 text-xl font-semibold text-emerald-800">
          Import complete
        </h2>
        <p className="mt-1 text-sm text-emerald-700">
          <strong>{result.imported}</strong>{" "}
          {result.imported === 1 ? "lead" : "leads"} imported
          {result.skipped > 0 && (
            <>, <strong>{result.skipped}</strong> skipped (duplicates)</>
          )}
          .
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            Import another file
          </Button>
          <a href="/dashboard">
            <Button>Go to Dashboard</Button>
          </a>
        </div>
      </div>
    );
  }

  if (step === "preview" && preview) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">{preview.new_count} new</Badge>
            {preview.duplicate_count > 0 && (
              <Badge tone="amber">{preview.duplicate_count} duplicate</Badge>
            )}
            {preview.invalid_count > 0 && (
              <Badge tone="red">{preview.invalid_count} invalid</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Review rows below. Only <strong>new</strong> rows will be imported.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  #
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Business
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  City
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Category
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Contacts
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Missing
                </th>
                <th className="px-3 py-2 text-left font-medium text-slate-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preview.rows.map((row) => (
                <PreviewRow key={row.row_num} row={row} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={reset} disabled={isPending}>
            Back
          </Button>
          <Button
            onClick={handleImport}
            disabled={isPending || preview.new_count === 0}
          >
            {isPending ? (
              <Spinner />
            ) : (
              `Import ${preview.new_count} lead${preview.new_count === 1 ? "" : "s"}`
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleParse} className="space-y-5">
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="text-3xl">📥</div>
        <p className="mt-2 text-sm font-medium text-slate-700">
          Upload a CSV file with your leads
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Columns (any order, case-insensitive):{" "}
          <code className="rounded bg-slate-200 px-1">business_name</code>{" "}
          <em>(required)</em>,{" "}
          <code className="rounded bg-slate-200 px-1">city</code>,{" "}
          <code className="rounded bg-slate-200 px-1">category</code>,{" "}
          <code className="rounded bg-slate-200 px-1">website</code>,{" "}
          <code className="rounded bg-slate-200 px-1">instagram</code>,{" "}
          <code className="rounded bg-slate-200 px-1">facebook</code>,{" "}
          <code className="rounded bg-slate-200 px-1">phone</code>,{" "}
          <code className="rounded bg-slate-200 px-1">email</code>,{" "}
          <code className="rounded bg-slate-200 px-1">google_maps</code>,{" "}
          <code className="rounded bg-slate-200 px-1">notes</code>
        </p>
        <input
          type="file"
          name="csv"
          accept=".csv,text/csv"
          required
          className="mt-4 block w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner /> : "Parse CSV"}
        </Button>
      </div>
    </form>
  );
}

function PreviewRow({ row }: { row: CsvPreviewRow }) {
  const contacts: string[] = [];
  if (row.phone) contacts.push("📞");
  if (row.email) contacts.push("✉️");
  if (row.instagram_url) contacts.push("📷");
  if (row.website_url) contacts.push("🌐");

  const rowClass =
    row.status === "invalid"
      ? "bg-red-50"
      : row.status === "duplicate"
        ? "bg-amber-50"
        : "";

  return (
    <tr className={rowClass}>
      <td className="px-3 py-2 text-xs text-slate-400">{row.row_num}</td>
      <td className="px-3 py-2 font-medium text-slate-900">
        {row.business_name || (
          <span className="text-red-500 italic">missing</span>
        )}
      </td>
      <td className="px-3 py-2 text-slate-600">{row.city ?? "—"}</td>
      <td className="px-3 py-2 text-slate-600">{row.category ?? "—"}</td>
      <td className="px-3 py-2 text-base tracking-widest">
        {contacts.length ? contacts.join(" ") : (
          <span className="text-xs text-slate-400">none</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-slate-500">
        {row.missing_contacts.length > 0
          ? row.missing_contacts.join(", ")
          : "—"}
      </td>
      <td className="px-3 py-2">
        {row.status === "new" && <Badge tone="green">New</Badge>}
        {row.status === "duplicate" && <Badge tone="amber">Duplicate</Badge>}
        {row.status === "invalid" && <Badge tone="red">Invalid</Badge>}
      </td>
    </tr>
  );
}

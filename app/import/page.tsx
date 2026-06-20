import { CsvImport } from "@/components/CsvImport";
import { ShieldCheck, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Import leads
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a CSV of real businesses. Duplicates are skipped automatically.
          Unknown contact fields are stored as blank — never invented.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main import area */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <CsvImport />
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Template */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800">
              CSV template
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              All columns optional except{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-700">
                business_name
              </code>
              .
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
              {`business_name,city,\ncategory,website,\ninstagram,facebook,\nphone,email,\ngoogle_maps,notes`}
            </pre>
            <a
              href="data:text/csv;charset=utf-8,business_name,city,category,website,instagram,facebook,phone,email,google_maps,notes%0AExample%20Hotel,Kutaisi,Hotel,https%3A%2F%2Fexample.com,https%3A%2F%2Finstagram.com%2Fexample,,+995555000000,info%40example.com,,Great%20location"
              download="beso-leads-template.csv"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              Download template
            </a>
          </div>

          {/* Safety */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-800">
                Safety notes
              </h3>
            </div>
            <ul className="mt-3 space-y-2">
              {[
                "Missing contacts stay blank — never fabricated",
                "Duplicates (same name + city) are skipped",
                "Max 500 rows per upload",
                `Nothing is sent — leads go to "New" status`,
                "Open a lead to run analysis and draft outreach",
              ].map((note) => (
                <li
                  key={note}
                  className="flex items-start gap-2 text-xs text-slate-500"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

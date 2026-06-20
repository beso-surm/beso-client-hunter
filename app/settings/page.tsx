import { getSettings } from "@/lib/repo";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          This profile shapes how the agent analyzes leads and drafts your
          Georgian outreach.
        </p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}

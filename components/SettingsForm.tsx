"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { CITIES, US_CITIES, CATEGORIES, LANGUAGES, TONES, MARKETS, marketConfig, type Market } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { saveSettingsAction } from "@/app/actions/settings";
import type { MessageLanguage, OutreachTone, Settings } from "@/types";

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    my_name: initial.my_name,
    service_description: initial.service_description,
    market: initial.market,
    preferred_cities: initial.preferred_cities,
    preferred_categories: initial.preferred_categories,
    default_price_min_gel: initial.default_price_min_gel,
    default_price_max_gel: initial.default_price_max_gel,
    tone: initial.tone,
    default_language: initial.default_language,
    signature: initial.signature,
    contact_phone: initial.contact_phone ?? "",
    contact_email: initial.contact_email ?? "",
  });
  const cityList = form.market === "USA" ? US_CITIES : CITIES;
  const currency = marketConfig(form.market as Market).currency;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  function toggle(key: "preferred_cities" | "preferred_categories", value: string) {
    setForm((f) => {
      const has = f[key].includes(value);
      return {
        ...f,
        [key]: has ? f[key].filter((v) => v !== value) : [...f[key], value],
      };
    });
  }

  async function save() {
    setLoading(true);
    setMessage(null);
    const res = await saveSettingsAction(form);
    setLoading(false);
    if (!res.ok) {
      setMessage({ ok: false, text: res.error });
      return;
    }
    setMessage({ ok: true, text: "Settings saved." });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="About you" description="Used in every AI prompt and message draft." />
        <div className="space-y-4 px-5 py-4">
          <div>
            <Label htmlFor="my_name">Your name</Label>
            <Input
              id="my_name"
              value={form.my_name}
              onChange={(e) => setForm({ ...form, my_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="service_description">Service description</Label>
            <Textarea
              id="service_description"
              value={form.service_description}
              onChange={(e) =>
                setForm({ ...form, service_description: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="signature">Message signature</Label>
            <Input
              id="signature"
              value={form.signature}
              onChange={(e) => setForm({ ...form, signature: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Market"
          description="Which country you're hunting clients in. Controls cities, currency, and AI prompts."
        />
        <div className="px-5 py-4">
          <div className="flex gap-2">
            {MARKETS.map((m) => (
              <Chip
                key={m.value}
                active={form.market === m.value}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    market: m.value as Market,
                    preferred_cities: [],
                    default_language: m.defaultLanguage,
                  }))
                }
              >
                {m.label}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Targeting"
          description="Default cities and categories the agent should focus on."
        />
        <div className="space-y-4 px-5 py-4">
          <div>
            <Label>Preferred cities</Label>
            <div className="flex flex-wrap gap-2">
              {cityList.map((c) => (
                <Chip
                  key={c}
                  active={form.preferred_cities.includes(c)}
                  onClick={() => toggle("preferred_cities", c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <Label>Preferred categories</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  active={form.preferred_categories.includes(c)}
                  onClick={() => toggle("preferred_categories", c)}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Pricing & tone"
          description="Defaults the AI uses when suggesting prices and writing messages."
        />
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="min">Default price min ({currency})</Label>
            <Input
              id="min"
              type="number"
              min={0}
              value={form.default_price_min_gel}
              onChange={(e) =>
                setForm({
                  ...form,
                  default_price_min_gel: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="max">Default price max ({currency})</Label>
            <Input
              id="max"
              type="number"
              min={0}
              value={form.default_price_max_gel}
              onChange={(e) =>
                setForm({
                  ...form,
                  default_price_max_gel: Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="tone">Tone</Label>
            <Select
              id="tone"
              value={form.tone}
              onChange={(e) =>
                setForm({ ...form, tone: e.target.value as OutreachTone })
              }
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="lang">Default message language</Label>
            <Select
              id="lang"
              value={form.default_language}
              onChange={(e) =>
                setForm({
                  ...form,
                  default_language: e.target.value as MessageLanguage,
                })
              }
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Your contact details"
          description="Optional — for your own reference."
        />
        <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.contact_phone}
              onChange={(e) =>
                setForm({ ...form, contact_phone: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={form.contact_email}
              onChange={(e) =>
                setForm({ ...form, contact_email: e.target.value })
              }
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {message ? (
          <span
            className={cn(
              "text-sm",
              message.ok ? "text-emerald-600" : "text-red-600",
            )}
          >
            {message.text}
          </span>
        ) : null}
        <Button onClick={save} disabled={loading}>
          {loading ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Save settings"
          )}
        </Button>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
      )}
    >
      {children}
    </button>
  );
}

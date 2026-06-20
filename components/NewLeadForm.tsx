"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { CITIES, CATEGORIES } from "@/lib/constants";
import { createLeadAction } from "@/app/actions/leads";

const initial = {
  business_name: "",
  category: "",
  city: "",
  website_url: "",
  instagram_url: "",
  facebook_url: "",
  phone: "",
  email: "",
  notes: "",
};

export function NewLeadForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof initial>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await createLeadAction(form);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onDone?.();
    if (res.data) router.push(`/leads/${res.data.id}`);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="lead-name">Business name *</Label>
        <Input
          id="lead-name"
          value={form.business_name}
          onChange={(e) => set("business_name", e.target.value)}
          placeholder="e.g. Hotel Argo"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="lead-category">Category</Label>
          <Select
            id="lead-category"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="lead-city">City</Label>
          <Select
            id="lead-city"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
          >
            <option value="">—</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="lead-website">Website URL</Label>
          <Input
            id="lead-website"
            value={form.website_url}
            onChange={(e) => set("website_url", e.target.value)}
            placeholder="https://"
          />
        </div>
        <div>
          <Label htmlFor="lead-ig">Instagram URL</Label>
          <Input
            id="lead-ig"
            value={form.instagram_url}
            onChange={(e) => set("instagram_url", e.target.value)}
            placeholder="https://instagram.com/…"
          />
        </div>
        <div>
          <Label htmlFor="lead-fb">Facebook URL</Label>
          <Input
            id="lead-fb"
            value={form.facebook_url}
            onChange={(e) => set("facebook_url", e.target.value)}
            placeholder="https://facebook.com/…"
          />
        </div>
        <div>
          <Label htmlFor="lead-phone">Phone</Label>
          <Input
            id="lead-phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+995 …"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="lead-email">Email</Label>
        <Input
          id="lead-email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="name@example.com"
        />
      </div>

      <div>
        <Label htmlFor="lead-notes">Notes</Label>
        <Textarea
          id="lead-notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything worth remembering…"
        />
      </div>

      <FieldError>{error}</FieldError>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onDone?.()} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={loading}>
          {loading ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Add lead"
          )}
        </Button>
      </div>
    </div>
  );
}

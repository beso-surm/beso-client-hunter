/**
 * Tool: checkWebsite(url)
 *
 * Fetches a prospect's website (if any) and returns plain facts the analyzer
 * can reason over. Never throws — failures become structured `WebsiteData`.
 */

import "server-only";
import { isHttpUrl } from "@/lib/utils";

export interface WebsiteData {
  checkedUrl: string | null;
  hasWebsite: boolean;
  reachable: boolean;
  statusCode: number | null;
  title: string | null;
  excerpt: string | null;
  error: string | null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function checkWebsite(url: string | null): Promise<WebsiteData> {
  if (!url || !isHttpUrl(url)) {
    return {
      checkedUrl: url,
      hasWebsite: false,
      reachable: false,
      statusCode: null,
      title: null,
      excerpt: null,
      error: url ? "Not a valid http(s) URL" : null,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "BesoClientHunter/1.0 (+lead research)" },
    });

    const ok = res.ok;
    let title: string | null = null;
    let excerpt: string | null = null;

    const contentType = res.headers.get("content-type") ?? "";
    if (ok && contentType.includes("text/html")) {
      const html = (await res.text()).slice(0, 200_000);
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      title = titleMatch ? stripHtml(titleMatch[1]).slice(0, 160) : null;
      excerpt = stripHtml(html).slice(0, 600) || null;
    }

    return {
      checkedUrl: url,
      hasWebsite: true,
      reachable: ok,
      statusCode: res.status,
      title,
      excerpt,
      error: ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timed out"
          : err.message
        : String(err);
    return {
      checkedUrl: url,
      hasWebsite: true, // a URL was on file, it just didn't load
      reachable: false,
      statusCode: null,
      title: null,
      excerpt: null,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

import { type NextRequest, NextResponse } from "next/server";
import { listAllMessages, listLeadsWithAnalysis } from "@/lib/repo";
import { messagesToCSV } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const approvedOnly = sp.get("approved") === "true";

    const [messages, leads] = await Promise.all([
      listAllMessages(approvedOnly ? { approved: true } : undefined),
      listLeadsWithAnalysis({}),
    ]);

    const csv = messagesToCSV(leads, messages);
    const label = approvedOnly ? "approved-drafts" : "all-drafts";
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${label}-${date}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}

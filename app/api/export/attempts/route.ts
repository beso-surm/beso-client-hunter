import { NextResponse } from "next/server";
import { listAllAttempts, listLeadsWithAnalysis } from "@/lib/repo";
import { attemptsToCSV } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [attempts, leads] = await Promise.all([
      listAllAttempts(),
      listLeadsWithAnalysis({}),
    ]);

    const csv = attemptsToCSV(leads, attempts);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contact-history-${date}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}

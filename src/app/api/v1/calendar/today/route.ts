import { NextResponse } from "next/server";
import { resolveDate } from "@/lib/daily-resolver";
import { success, error } from "@/lib/api-response";

export async function GET() {
  try {
    const resolved = resolveDate(new Date());
    if (!resolved) return error("Failed to resolve today's date", 500);

    return success(
      {
        parsha: resolved.parsha,
        parshaDay: resolved.parshaDay,
        tehillimDay: resolved.tehillimDay,
        tanyaKey: resolved.tanyaKey,
        rambam3CycleDay: resolved.rambam3CycleDay,
        rambam1CycleDay: resolved.rambam1CycleDay,
      },
      { gregorian: resolved.gregorian, hebrew: resolved.hebrew }
    );
  } catch (e) {
    console.error("Calendar today error:", e);
    return error("Internal server error", 500);
  }
}

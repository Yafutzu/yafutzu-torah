import { resolveDate } from "@/lib/daily-resolver";
import { success, error } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const resolved = resolveDate(date);
    if (!resolved) return error("Invalid date format. Use YYYY-MM-DD.", 400);

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
    console.error("Calendar date error:", e);
    return error("Internal server error", 500);
  }
}

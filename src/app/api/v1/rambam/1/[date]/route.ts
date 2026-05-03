import { resolveDate, fetchRambam } from "@/lib/daily-resolver";
import { success, error } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const resolved = resolveDate(date);
    if (!resolved) return error("Invalid date format. Use YYYY-MM-DD.", 400);

    const rambam = await fetchRambam(resolved);

    return success(rambam?.oneChapter ?? null, {
      gregorian: resolved.gregorian,
      hebrew: resolved.hebrew,
    });
  } catch (e) {
    console.error("Rambam 1 error:", e);
    return error("Internal server error", 500);
  }
}

import { resolveDate, fetchRambam } from "@/lib/daily-resolver";
import { success, error } from "@/lib/api-response";

export async function GET() {
  try {
    const resolved = resolveDate(new Date());
    if (!resolved) return error("Failed to resolve today's date", 500);

    const rambam = await fetchRambam(resolved);

    return success(rambam, {
      gregorian: resolved.gregorian,
      hebrew: resolved.hebrew,
    });
  } catch (e) {
    console.error("Rambam today error:", e);
    return error("Internal server error", 500);
  }
}

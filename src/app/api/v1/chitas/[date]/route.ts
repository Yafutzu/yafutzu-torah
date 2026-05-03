import { resolveDate, fetchChitas } from "@/lib/daily-resolver";
import { success, error } from "@/lib/api-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const resolved = resolveDate(date);
    if (!resolved) return error("Invalid date format. Use YYYY-MM-DD.", 400);

    const chitas = await fetchChitas(resolved);

    return success(chitas, {
      gregorian: resolved.gregorian,
      hebrew: resolved.hebrew,
    });
  } catch (e) {
    console.error("Chitas date error:", e);
    return error("Internal server error", 500);
  }
}

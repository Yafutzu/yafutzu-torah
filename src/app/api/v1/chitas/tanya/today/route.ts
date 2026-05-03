import { resolveDate } from "@/lib/daily-resolver";
import { connectDB } from "@/lib/db";
import { DailySchedule } from "@/models/daily-schedule.model";
import { Verse } from "@/models/verse.model";
import { success, error } from "@/lib/api-response";

export async function GET() {
  try {
    const resolved = resolveDate(new Date());
    if (!resolved) return error("Failed to resolve today's date", 500);

    await connectDB();

    const schedule = await DailySchedule.findOne({
      type: "chitas-tanya",
      key: resolved.tanyaKey,
    });

    if (!schedule) return error("Tanya schedule not found", 404);

    const verses = [];
    for (const ref of schedule.references) {
      const v = await Verse.find({
        chapterId: ref.chapterId,
        number: { $gte: ref.fromVerse, $lte: ref.toVerse },
      })
        .sort({ number: 1 })
        .select("number text")
        .lean();
      verses.push(...v);
    }

    return success(
      {
        title: schedule.title,
        verses,
      },
      { gregorian: resolved.gregorian, hebrew: resolved.hebrew }
    );
  } catch (e) {
    console.error("Tanya today error:", e);
    return error("Internal server error", 500);
  }
}

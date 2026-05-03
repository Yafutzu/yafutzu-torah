import { NextRequest } from "next/server";
import { searchTorah, isAIAvailable } from "@/lib/ai";
import { success, error } from "@/lib/api-response";

/**
 * GET /api/v1/ai/search?q=what+does+tanya+say+about+joy&lang=en&category=tanya
 */
export async function GET(req: NextRequest) {
  try {
    if (!isAIAvailable()) {
      return error("AI features are not configured on this server", 503);
    }

    const { searchParams } = req.nextUrl;
    const query = searchParams.get("q");
    const lang = (searchParams.get("lang") as "en" | "he") || "en";
    const category = searchParams.get("category") || undefined;

    if (!query) {
      return error('Required: "q" query parameter', 400);
    }

    const result = await searchTorah({ query, category, lang });

    if (!result) {
      return error("AI search failed", 500);
    }

    return success({
      query,
      ...result,
    });
  } catch (e) {
    console.error("AI search error:", e);
    return error("Internal server error", 500);
  }
}

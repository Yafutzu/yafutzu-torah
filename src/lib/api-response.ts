import { NextResponse } from "next/server";
import type { ApiResponse, IHebrewDate } from "@/types";

export function success<T>(
  data: T,
  dateInfo?: { gregorian: string; hebrew: IHebrewDate }
): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = { ok: true, data };
  if (dateInfo) body.date = dateInfo;
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export function error(
  message: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { ok: false, error: message },
    {
      status,
      headers: { "Access-Control-Allow-Origin": "*" },
    }
  );
}

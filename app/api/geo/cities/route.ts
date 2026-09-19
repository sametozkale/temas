import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchCities } from "@/lib/geo";

export const revalidate = 86_400;

const Query = z.object({
  country: z.string().trim().min(1).max(80),
});

export async function GET(request: Request) {
  const parsed = Query.safeParse({
    country: new URL(request.url).searchParams.get("country") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ cities: [] }, { status: 400 });
  }
  try {
    const cities = await fetchCities(parsed.data.country);
    return NextResponse.json({ cities });
  } catch {
    return NextResponse.json({ cities: [] }, { status: 502 });
  }
}

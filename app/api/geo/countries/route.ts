import { NextResponse } from "next/server";

import { fetchCountries } from "@/lib/geo";

export const revalidate = 86_400;

export async function GET() {
  try {
    const countries = await fetchCountries();
    return NextResponse.json({ countries });
  } catch {
    return NextResponse.json({ countries: [] }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { loadProducts } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(loadProducts());
}

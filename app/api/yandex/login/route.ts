import { NextResponse } from "next/server"
import { headers } from "next/headers"

// MOCK-ONLY: авторизация полностью отключена для демо-режима.
// Сразу редиректим на /moderator без реального OAuth.
export async function GET() {
  const h = await headers()
  const host = h.get("x-forwarded-host") || h.get("host")
  const proto = h.get("x-forwarded-proto") || "https"
  const origin = host ? `${proto}://${host}` : "https://localhost:3000"

  return NextResponse.redirect(`${origin}/moderator`)
}

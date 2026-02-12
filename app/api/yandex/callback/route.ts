import { NextRequest, NextResponse } from "next/server"

// MOCK-ONLY: авторизация полностью отключена для демо-режима.
// Сразу редиректим на /moderator с фейковым auth_token.
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const response = NextResponse.redirect(new URL("/moderator", request.url))

  response.cookies.set("auth_token", "mock_token_for_demo", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  response.cookies.set("yandex_oauth_email", "mock@b2b.local", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  return response
}

import { NextResponse } from "next/server"

// MOCK-ONLY: всегда возвращаем authenticated=true без бэкенда
export async function GET() {
  return NextResponse.json({
    authenticated: true,
    user: {
      id: 1,
      email: "mock@b2b.local",
      role: "admin",
      can_access_moderator: true,
      name: "Mock Admin",
    },
  })
}

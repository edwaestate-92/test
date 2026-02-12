import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const _MOCK_ENV =
  process.env.NEXT_PUBLIC_MOCK_MODE ||
  process.env.MOCK_MODE ||
  process.env.B2B_MOCK_MODE ||
  ""

const MOCK_MODE = String(_MOCK_ENV).toLowerCase() === "1" ||
  String(_MOCK_ENV).toLowerCase() === "true"

export async function GET() {
  if (MOCK_MODE) {
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

  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/auth/status`
      const backendResp = await fetch(backendUrl, { cache: "no-store" })
      if (backendResp.ok) {
        const data = await backendResp.json().catch(() => ({ authenticated: false }))
        if (data?.authenticated) {
          return NextResponse.json(data)
        }
      }
      return NextResponse.json({ authenticated: false, user: null })
    }

    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/auth/me`
    const backendResp = await fetch(backendUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!backendResp.ok) {
      return NextResponse.json({ authenticated: false, user: null })
    }

    const data = await backendResp.json().catch(() => ({ authenticated: false }))
    return NextResponse.json(data)
  } catch (error) {
    const detail =
      process.env.NODE_ENV === "development"
        ? (error instanceof Error
            ? { message: error.message, stack: error.stack }
            : { message: String(error) })
        : undefined
    return NextResponse.json({ authenticated: false, user: null, detail })
  }
}

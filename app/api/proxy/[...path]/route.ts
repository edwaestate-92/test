import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

import { readFile } from "fs/promises"
import path from "path"

const API_BASE_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const _MOCK_ENV =
  process.env.NEXT_PUBLIC_MOCK_MODE ||
  process.env.MOCK_MODE ||
  process.env.B2B_MOCK_MODE ||
  ""

const MOCK_MODE = String(_MOCK_ENV).toLowerCase() === "1" ||
  String(_MOCK_ENV).toLowerCase() === "true"

async function readMock(): Promise<any> {
  const p = path.join(process.cwd(), "public", "mock-data.json")
  const raw = await readFile(p, "utf8")
  return JSON.parse(raw)
}

function parseLimitOffset(sp: URLSearchParams): { limit: number; offset: number } {
  const limit = Math.max(1, Math.min(Number(sp.get("limit") || 100) || 100, 1000))
  const offset = Math.max(0, Number(sp.get("offset") || 0) || 0)
  return { limit, offset }
}

function slicePage<T>(items: T[], limit: number, offset: number): T[] {
  return items.slice(offset, offset + limit)
}

function matchesKeyword(obj: any, keyword: string | null): boolean {
  const q = String(keyword || "").trim().toLowerCase()
  if (!q) return true
  try {
    return JSON.stringify(obj).toLowerCase().includes(q)
  } catch {
    return true
  }
}

async function handleMockGET(request: NextRequest, targetPath: string): Promise<NextResponse | null> {
  const sp = request.nextUrl.searchParams
  const mock = await readMock()

  if (targetPath === "/moderator/dashboard-stats") {
    return NextResponse.json(mock?.dashboard_stats || null)
  }

  if (targetPath === "/moderator/suppliers") {
    const { limit, offset } = parseLimitOffset(sp)
    const search = sp.get("search")
    const typeFilter = sp.get("type")
    const list = Array.isArray(mock?.suppliers) ? mock.suppliers : []
    const filtered = list
      .filter((s: any) => (typeFilter ? String(s.type || "") === String(typeFilter) : true))
      .filter((s: any) => matchesKeyword(s, search))
    return NextResponse.json({
      suppliers: slicePage(filtered, limit, offset),
      total: filtered.length,
      limit,
      offset,
    })
  }

  if (targetPath === "/parsing/runs") {
    const { limit, offset } = parseLimitOffset(sp)
    const keyword = sp.get("keyword")
    const list = Array.isArray(mock?.parsing_runs) ? mock.parsing_runs : []
    const filtered = list.filter((r: any) => matchesKeyword(r, keyword))
    return NextResponse.json({
      runs: slicePage(filtered, limit, offset),
      total: filtered.length,
      limit,
      offset,
    })
  }

  if (targetPath.startsWith("/parsing/runs/")) {
    const runId = decodeURIComponent(targetPath.replace("/parsing/runs/", "").split("/")[0] || "")
    const list = Array.isArray(mock?.parsing_runs) ? mock.parsing_runs : []
    const run = list.find((r: any) => String(r.run_id || r.runId || r.run_id || "") === runId || String(r.run_id || "") === runId)
    if (!run) {
      return NextResponse.json({ detail: "Parsing run not found" }, { status: 404 })
    }
    return NextResponse.json(run)
  }

  if (targetPath === "/domains/queue") {
    const { limit, offset } = parseLimitOffset(sp)
    const keyword = sp.get("keyword")
    const parsingRunId = sp.get("parsingRunId")
    const status = sp.get("status")
    const list = Array.isArray(mock?.domains_queue) ? mock.domains_queue : []
    const filtered = list
      .filter((d: any) => (parsingRunId ? String(d.parsingRunId || d.parsing_run_id || "") === String(parsingRunId) : true))
      .filter((d: any) => (status ? String(d.status || "") === String(status) : true))
      .filter((d: any) => matchesKeyword(d, keyword))
    return NextResponse.json({
      entries: slicePage(filtered, limit, offset),
      total: filtered.length,
      limit,
      offset,
    })
  }

  if (targetPath === "/moderator/tasks") {
    const { limit, offset } = parseLimitOffset(sp)
    const list = Array.isArray(mock?.moderator_tasks) ? mock.moderator_tasks : []
    const page = slicePage(list, limit, offset)
    return NextResponse.json(page)
  }

  if (targetPath === "/cabinet/stats") {
    return NextResponse.json(mock?.cabinet_stats || null)
  }

  if (targetPath === "/cabinet/requests") {
    return NextResponse.json(Array.isArray(mock?.cabinet_requests) ? mock.cabinet_requests : [])
  }

  if (targetPath === "/cabinet/messages") {
    return NextResponse.json(Array.isArray(mock?.cabinet_messages) ? mock.cabinet_messages : [])
  }

  if (targetPath === "/moderator/users") {
    return NextResponse.json(Array.isArray(mock?.users) ? mock.users : [])
  }

  if (targetPath === "/learning/statistics") {
    return NextResponse.json({
      total_patterns: 0,
      patterns: [],
      domains_learned: 0,
      last_updated: null,
    })
  }

  if (targetPath === "/learning/learned-summary") {
    return NextResponse.json({
      total_patterns: 0,
      inn_url_patterns: [],
      email_url_patterns: [],
      domains_learned: 0,
      statistics: {
        total_patterns: 0,
        patterns: [],
        domains_learned: 0,
        last_updated: null,
      },
    })
  }

  if (targetPath === "/moderator/current-task") {
    return NextResponse.json({
      task_id: null,
      task_title: null,
      task_created_at: null,
      run_id: null,
      run_status: null,
      run_started_at: null,
      run_finished_at: null,
      run_error_message: null,
      domains: [],
      total_domains: 0,
      pending_count: 0,
      processing_count: 0,
      supplier_count: 0,
      reseller_count: 0,
      moderation_count: 0,
      parser_active: false,
    })
  }

  if (targetPath === "/moderator/unprocessed-runs") {
    const list = Array.isArray(mock?.parsing_runs) ? mock.parsing_runs : []
    const top = list.slice(0, 25).map((r: any) => ({
      run_id: String(r.run_id || r.runId || ""),
      status: String(r.status || ""),
      created_at: r.created_at || r.createdAt || null,
      keyword: String(r.keyword || ""),
      total_domains: Number(r.resultsCount || 0) || 0,
      pending_count: 0,
      processing_count: 0,
      supplier_count: 0,
      reseller_count: 0,
      moderation_count: 0,
      parser_active: false,
    }))
    return NextResponse.json({ runs: top, total: top.length })
  }

  if (targetPath.startsWith("/moderator/run-domains/")) {
    const runId = decodeURIComponent(targetPath.replace("/moderator/run-domains/", "").split("/")[0] || "")
    const list = Array.isArray(mock?.domains_queue) ? mock.domains_queue : []
    const filtered = list.filter((d: any) => String(d.parsingRunId || d.parsing_run_id || "") === String(runId))
    const domains = filtered.slice(0, 200).map((d: any, idx: number) => ({
      id: idx + 1,
      run_id: String(runId),
      domain: String(d.domain || ""),
      status: String(d.status || "pending"),
      reason: null,
      attempted_urls: d.url ? [String(d.url)] : [],
      inn_source_url: null,
      email_source_url: null,
      supplier_id: null,
      checko_ok: false,
      global_requires_moderation: false,
    }))
    return NextResponse.json({ run_id: String(runId), domains, total: domains.length })
  }

  // Fallback: return empty object for any unknown path in mock mode
  // so the proxy never tries to reach the real backend
  console.warn(`[MOCK] Unknown GET path: ${targetPath} — returning empty response`)
  return NextResponse.json({})
}

function applyGroqHeaders(from: Response, to: NextResponse) {
  const passHeaders = [
    "x-groq-used",
    "x-groq-key-source",
    "x-groq-key-source-initial",
    "x-groq-error",
    "x-groq-total-tokens",
    "x-groq-prompt-tokens",
    "x-groq-completion-tokens",
  ]

  for (const key of passHeaders) {
    const v = from.headers.get(key)
    if (v != null) {
      to.headers.set(key, v)
    }
  }
}

function buildProxyHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  }

  const contentType = request.headers.get("content-type")
  if (contentType) {
    headers["Content-Type"] = contentType
  }

  const accept = request.headers.get("accept")
  if (accept) {
    headers["Accept"] = accept
  }

  const token = request.cookies.get("auth_token")?.value
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return headers
}

async function proxyFetch(request: NextRequest, url: string, method: string) {
  const headers = buildProxyHeaders(request)
  const hasBody = method !== "GET" && method !== "HEAD"
  const bodyBytes = hasBody ? await request.arrayBuffer() : null

  if (!hasBody) {
    delete headers["Content-Type"]
  }

  return fetch(url, {
    method,
    headers,
    body: hasBody && bodyBytes && bodyBytes.byteLength > 0 ? bodyBytes : undefined,
  })
}

export async function GET(request: NextRequest, context: { params: Promise<any> }) {
  const { path } = (await context.params) as { path: string[] }
  const targetPath = "/" + path.join("/")
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${API_BASE_URL}${targetPath}${searchParams ? `?${searchParams}` : ""}`

  try {
    if (MOCK_MODE) {
      const mock = await handleMockGET(request, targetPath)
      if (mock) return mock
    }
    const response = await proxyFetch(request, url, "GET")

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    const next = NextResponse.json(data)
    applyGroqHeaders(response, next)
    return next
  } catch (error) {
    console.error("[Proxy] Error:", error)
    return NextResponse.json({ error: "Failed to connect to backend" }, { status: 502 })
  }
}

export async function POST(request: NextRequest, context: { params: Promise<any> }) {
  const { path } = (await context.params) as { path: string[] }
  const targetPath = "/" + path.join("/")
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${API_BASE_URL}${targetPath}${searchParams ? `?${searchParams}` : ""}`

  try {
    if (MOCK_MODE) {
      if (targetPath === "/moderator/users") {
        return NextResponse.json({ ok: true }, { status: 200 })
      }
      return NextResponse.json({ ok: true }, { status: 200 })
    }
    const response = await proxyFetch(request, url, "POST")

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    const next = NextResponse.json(data)
    applyGroqHeaders(response, next)
    return next
  } catch (error) {
    console.error("[Proxy] Error:", error)
    return NextResponse.json({ error: "Failed to connect to backend" }, { status: 502 })
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<any> }) {
  const { path } = (await context.params) as { path: string[] }
  const targetPath = "/" + path.join("/")
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${API_BASE_URL}${targetPath}${searchParams ? `?${searchParams}` : ""}`

  try {
    if (MOCK_MODE) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }
    const response = await proxyFetch(request, url, "PUT")

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    const next = NextResponse.json(data)
    applyGroqHeaders(response, next)
    return next
  } catch (error) {
    console.error("[Proxy] Error:", error)
    return NextResponse.json({ error: "Failed to connect to backend" }, { status: 502 })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<any> }) {
  const { path } = (await context.params) as { path: string[] }
  const targetPath = "/" + path.join("/")
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${API_BASE_URL}${targetPath}${searchParams ? `?${searchParams}` : ""}`

  try {
    if (MOCK_MODE) {
      return new NextResponse(null, { status: 204 })
    }
    const response = await proxyFetch(request, url, "DELETE")

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    const next = NextResponse.json(data)
    applyGroqHeaders(response, next)
    return next
  } catch (error) {
    console.error("[Proxy] Error:", error)
    return NextResponse.json({ error: "Failed to connect to backend" }, { status: 502 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<any> }) {
  const { path } = (await context.params) as { path: string[] }
  const targetPath = "/" + path.join("/")
  const searchParams = request.nextUrl.searchParams.toString()
  const url = `${API_BASE_URL}${targetPath}${searchParams ? `?${searchParams}` : ""}`

  try {
    if (MOCK_MODE) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }
    const response = await proxyFetch(request, url, "PATCH")

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ error: errorText }, { status: response.status })
    }

    const data = await response.json()
    const next = NextResponse.json(data)
    applyGroqHeaders(response, next)
    return next
  } catch (error) {
    console.error("[Proxy] Error:", error)
    return NextResponse.json({ error: "Failed to connect to backend" }, { status: 502 })
  }
}

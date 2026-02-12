import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://127.0.0.1:3000").trim()
const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").trim()
const MODERATOR_EMAIL = (process.env.MODERATOR_EMAIL || "edwatik@yandex.ru").trim()
const FRONTEND_HOST = new URL(FRONTEND_URL).hostname
const FRONTEND_SECURE = new URL(FRONTEND_URL).protocol === "https:"

function normalizeUrl(route) {
  return new URL(route, FRONTEND_URL).toString()
}

function cookieForToken(token) {
  return [
    {
      name: "auth_token",
      value: token,
      domain: FRONTEND_HOST,
      path: "/",
      secure: FRONTEND_SECURE,
      sameSite: "Lax",
    },
  ]
}

async function login(email) {
  const payload = {
    email,
    yandex_access_token: "ui-screenshots",
    yandex_refresh_token: "",
    expires_in: 3600,
  }
  const resp = await fetch(`${BACKEND_URL}/api/auth/yandex-oauth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => "")
    throw new Error(`Auth failed for ${email}: HTTP ${resp.status} ${text}`)
  }
  const data = await resp.json()
  if (!data?.access_token) {
    throw new Error(`Auth failed for ${email}: no access_token`)
  }
  return data.access_token
}

async function fetchLatestRunId(token) {
  const resp = await fetch(`${BACKEND_URL}/parsing/runs?limit=1&order=desc`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  if (!resp.ok) return null
  const data = await resp.json().catch(() => null)
  const first = data?.runs?.[0]
  return first?.runId || first?.run_id || null
}

async function main() {
  const outDir = path.join(process.cwd(), "test-results", "ui-screens")
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  page.setDefaultTimeout(20000)

  await page.goto(normalizeUrl("/login"), { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(outDir, "login.png"), fullPage: true })

  const token = await login(MODERATOR_EMAIL)
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addCookies(cookieForToken(token))
  const authed = await ctx.newPage()
  authed.setDefaultTimeout(20000)

  const runId = await fetchLatestRunId(token)
  const runPath = runId ? `/parsing-runs/${runId}` : "/parsing-runs"

  await authed.goto(normalizeUrl(runPath), { waitUntil: "networkidle" })
  await authed.waitForTimeout(800)
  await authed.screenshot({ path: path.join(outDir, "parsing-run.png"), fullPage: false })

  await authed.close()
  await ctx.close()
  await page.close()
  await browser.close()

  console.log(`Saved screenshots to ${outDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

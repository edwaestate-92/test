import { test, expect } from "@playwright/test"
import { loginByApiAndSetCookie, openBrowserWithCdpFallback } from "./e2e-helpers"

test("parsing-runs: theme toggle persists + search is full width + filters visible", async () => {
  const CDP_URL = process.env.CDP_URL || "http://127.0.0.1:7000"
  const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
  const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000"
  const E2E_EMAIL = process.env.E2E_EMAIL || "edwatik@yandex.ru"

  const { browser, context } = await openBrowserWithCdpFallback(CDP_URL)
  const page = await context.newPage()

  await loginByApiAndSetCookie(page, context, API_BASE_URL, E2E_EMAIL)

  // Find a runId by visiting parsing-runs list and clicking first row.
  await page.goto(`${BASE_URL}/parsing-runs`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(800)
  await expect(page).not.toHaveURL(/\/login/)

  const firstRow = page.locator("main").locator("div").filter({ hasText: "Завершен" }).first()
  await expect(firstRow).toBeVisible({ timeout: 15_000 })
  await firstRow.click()
  await page.waitForURL(/\/parsing-runs\/[a-f0-9-]{36}/, { timeout: 30_000 })

  // Open filters dropdown
  await page.getByRole("button", { name: "Фильтры" }).click()
  await expect(page.getByText("Все домены")).toBeVisible()
  await expect(page.getByText("Поставщики")).toBeVisible()
  await expect(page.getByText("Реселлеры")).toBeVisible()
  await expect(page.getByText("Требуют модерации")).toBeVisible()

  // Search input should be wide (rough heuristic): at least 55% of viewport width.
  const search = page.getByPlaceholder("Поиск по домену...")
  const box = await search.boundingBox()
  expect(box).toBeTruthy()
  const vp = page.viewportSize()
  expect(vp).toBeTruthy()
  if (box && vp) {
    expect(box.width).toBeGreaterThan(vp.width * 0.55)
  }

  // Toggle theme -> should set html.dark and persist after reload
  await page.getByRole("button", { name: "Переключить тему" }).click()
  await page.waitForTimeout(300)
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForTimeout(500)
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.close()
  await browser.close()
})

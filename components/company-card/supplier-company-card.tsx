"use client"

import { useMemo, useState } from "react"
import type { SupplierDTO } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import { toast } from "sonner"

interface SupplierCardProps {
  supplier: SupplierDTO
  onSupplierUpdate?: (updatedSupplier: SupplierDTO) => void
}

type CheckoData = Record<string, any>

type FinancePoint = { year: number; revenue?: number; profit?: number; capital?: number }
type ReliabilityFact = { kind: "positive" | "attention" | "negative"; title: string; description?: string }
type OkvedItem = { code: string; title: string; version?: string }

function formatMoneyRub(value?: number | null): string {
  if (value === null || value === undefined) return "—"
  const absValue = Math.abs(value)
  if (absValue >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} млрд руб.`
  if (absValue >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} млн руб.`
  if (absValue >= 1_000) return `${(value / 1_000).toFixed(2)} тыс. руб.`
  return `${value.toFixed(2)} руб.`
}

function formatDateRu(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("ru-RU")
}

function normalizeUrl(value?: string | null): string | undefined {
  if (!value) return undefined
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  return `https://${value}`
}

function computeYoYPercent(current?: number, previous?: number): string {
  if (current === undefined || previous === undefined || previous === 0) return "—"
  const percent = ((current - previous) / Math.abs(previous)) * 100
  const sign = percent > 0 ? "+" : ""
  return `${sign}${percent.toFixed(1)}%`
}

function formatAxisValue(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} млрд`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} тыс`
  return value.toString()
}

function parseCheckoData(raw?: string | null): CheckoData | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as CheckoData
  } catch {
    return null
  }
}

export function SupplierCompanyCard({ supplier }: SupplierCardProps) {
  const checkoData = useMemo(() => parseCheckoData(supplier.checkoData), [supplier.checkoData])

  const financeSeries = useMemo<FinancePoint[]>(() => {
    const out: FinancePoint[] = []
    const fin = checkoData?._finances
    if (fin && typeof fin === "object") {
      for (const [yearKey, row] of Object.entries(fin)) {
        const y = Number(yearKey)
        if (!Number.isFinite(y)) continue
        const r = row as Record<string, number | undefined>
        out.push({
          year: y,
          revenue: r["2110"],
          profit: r["2400"],
          capital: r["1300"],
        })
      }
    }
    if (out.length === 0 && supplier.financeYear) {
      out.push({
        year: supplier.financeYear,
        revenue: supplier.revenue ?? undefined,
        profit: supplier.profit ?? undefined,
      })
    }
    return out.sort((a, b) => a.year - b.year)
  }, [checkoData, supplier.financeYear, supplier.revenue, supplier.profit])

  const okvedMain = useMemo<OkvedItem | undefined>(() => {
    const o = checkoData?.ОКВЭД
    if (!o) return undefined
    if (Array.isArray(o) && o.length > 0) {
      const first = o[0]
      return { code: String(first?.Код || ""), title: String(first?.Наим || ""), version: first?.Версия ? String(first.Версия) : undefined }
    }
    if (typeof o === "object") {
      return { code: String(o.Код || ""), title: String(o.Наим || ""), version: o.Версия ? String(o.Версия) : undefined }
    }
    return undefined
  }, [checkoData])

  const okvedAdditional = useMemo<OkvedItem[]>(() => {
    const extra = checkoData?.ОКВЭДДоп
    if (!Array.isArray(extra)) return []
    return extra.map((item: any) => ({
      code: String(item?.Код || ""),
      title: String(item?.Наим || ""),
      version: item?.Версия ? String(item.Версия) : undefined,
    }))
  }, [checkoData])

  const reliabilityFacts = useMemo<ReliabilityFact[]>(() => {
    const facts: ReliabilityFact[] = []
    const legalCases = Number(checkoData?._legal?.total || supplier.legalCasesCount || 0)
    const enforcements = Number(checkoData?._enforcements?.count || 0)
    const inspections = Number(checkoData?._inspections?.total || 0)
    const status = String(supplier.companyStatus || checkoData?.Статус?.Наим || "")

    if (status && !status.toLowerCase().includes("ликвид")) {
      facts.push({ kind: "positive", title: `Статус компании: ${status}` })
    }
    if ((supplier.revenue || 0) > 0 || financeSeries.some((x) => (x.revenue || 0) > 0)) {
      facts.push({ kind: "positive", title: "Есть финансовая отчетность" })
    }
    if (legalCases > 30) {
      facts.push({ kind: "attention", title: `Судебные дела: ${legalCases}` })
    }
    if (inspections > 10) {
      facts.push({ kind: "attention", title: `Проверки: ${inspections}` })
    }
    if (enforcements > 0) {
      facts.push({ kind: "negative", title: `Исполнительные производства: ${enforcements}` })
    }
    if (facts.length === 0) {
      facts.push({ kind: "attention", title: "Недостаточно данных для автоматической оценки" })
    }
    return facts
  }, [checkoData, supplier.companyStatus, supplier.legalCasesCount, supplier.revenue, financeSeries])

  const reliabilityScore = useMemo(() => {
    const base = Number(checkoData?.Рейтинг || checkoData?.rating || 0)
    if (base > 0) return Math.min(600, base)
    let score = 300
    for (const f of reliabilityFacts) {
      if (f.kind === "positive") score += 40
      if (f.kind === "attention") score -= 20
      if (f.kind === "negative") score -= 60
    }
    return Math.max(0, Math.min(600, score))
  }, [checkoData, reliabilityFacts])

  const [selectedYear, setSelectedYear] = useState<number>(financeSeries.at(-1)?.year || new Date().getFullYear())
  const [okvedOpen, setOkvedOpen] = useState(false)
  const [okvedSearch, setOkvedSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"positive" | "attention" | "negative">("positive")

  const selectedFinance = financeSeries.find((x) => x.year === selectedYear)
  const prevFinance = financeSeries.find((x) => x.year === selectedYear - 1)

  const categorized = {
    positive: reliabilityFacts.filter((f) => f.kind === "positive"),
    attention: reliabilityFacts.filter((f) => f.kind === "attention"),
    negative: reliabilityFacts.filter((f) => f.kind === "negative"),
  }

  const okvedFiltered = okvedAdditional.filter((x) => {
    const q = okvedSearch.trim().toLowerCase()
    if (!q) return true
    return x.code.toLowerCase().includes(q) || x.title.toLowerCase().includes(q)
  })

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} скопирован`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{supplier.name}</CardTitle>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {supplier.inn && (
                  <span className="inline-flex items-center gap-1">
                    ИНН: {supplier.inn}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(supplier.inn!, "ИНН")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </span>
                )}
                {supplier.ogrn && <span>ОГРН: {supplier.ogrn}</span>}
                {supplier.kpp && <span>КПП: {supplier.kpp}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {supplier.companyStatus && <Badge variant="outline">{supplier.companyStatus}</Badge>}
                {supplier.dataStatus && <Badge variant="outline">{supplier.dataStatus}</Badge>}
                <Badge variant="secondary">{supplier.type}</Badge>
                {supplier.checkoData && <Badge className="bg-indigo-600 text-white">CHECKO</Badge>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {supplier.website && (
                <Button variant="outline" asChild>
                  <a href={normalizeUrl(supplier.website)} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Сайт
                  </a>
                </Button>
              )}
              {supplier.domain && (
                <Button variant="outline" asChild>
                  <a href={normalizeUrl(supplier.domain)} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Домен
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-2 text-sm">
            {supplier.phone && (
              <a href={`tel:${supplier.phone}`} className="inline-flex items-center gap-2 hover:underline">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {supplier.phone}
              </a>
            )}
            {supplier.email && (
              <a href={`mailto:${supplier.email}`} className="inline-flex items-center gap-2 hover:underline">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {supplier.email}
              </a>
            )}
            {(supplier.legalAddress || supplier.address) && <div>Адрес: {supplier.legalAddress || supplier.address}</div>}
            {supplier.registrationDate && <div>Дата регистрации: {formatDateRu(supplier.registrationDate)}</div>}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Оценка надежности</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(reliabilityScore / 600) * 100} className="h-10" />
          <div className="text-center text-xl font-semibold">{reliabilityScore} / 600</div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="positive">Плюсы ({categorized.positive.length})</TabsTrigger>
              <TabsTrigger value="attention">Внимание ({categorized.attention.length})</TabsTrigger>
              <TabsTrigger value="negative">Риски ({categorized.negative.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="positive" className="space-y-2">
              {categorized.positive.map((f, i) => (
                <div key={`p-${i}`} className="flex items-start gap-2 rounded-md border p-3">
                  <Check className="mt-0.5 h-4 w-4 text-green-600" />
                  <span>{f.title}</span>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="attention" className="space-y-2">
              {categorized.attention.map((f, i) => (
                <div key={`a-${i}`} className="flex items-start gap-2 rounded-md border p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
                  <span>{f.title}</span>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="negative" className="space-y-2">
              {categorized.negative.map((f, i) => (
                <div key={`n-${i}`} className="flex items-start gap-2 rounded-md border p-3">
                  <X className="mt-0.5 h-4 w-4 text-red-600" />
                  <span>{f.title}</span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Финансовая отчетность</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {financeSeries.length >= 2 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm text-muted-foreground">Выручка</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={financeSeries.map((x) => ({ year: String(x.year), value: x.revenue || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={formatAxisValue} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="mb-2 text-sm text-muted-foreground">Чистая прибыль</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={financeSeries.map((x) => ({ year: String(x.year), value: x.profit || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={formatAxisValue} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Недостаточно данных для графика (нужно минимум 2 года).</div>
          )}

          {financeSeries.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {financeSeries.map((x) => (
                  <Button key={x.year} variant={selectedYear === x.year ? "default" : "outline"} size="sm" onClick={() => setSelectedYear(x.year)}>
                    {x.year}
                  </Button>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border p-4">
                  <div className="text-sm text-muted-foreground">Выручка</div>
                  <div className="text-lg font-semibold">{formatMoneyRub(selectedFinance?.revenue)}</div>
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    {(selectedFinance?.revenue || 0) >= (prevFinance?.revenue || 0) ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    {computeYoYPercent(selectedFinance?.revenue, prevFinance?.revenue)}
                  </div>
                </div>
                <div className="rounded-md border p-4">
                  <div className="text-sm text-muted-foreground">Чистая прибыль</div>
                  <div className="text-lg font-semibold">{formatMoneyRub(selectedFinance?.profit)}</div>
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    {(selectedFinance?.profit || 0) >= (prevFinance?.profit || 0) ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    {computeYoYPercent(selectedFinance?.profit, prevFinance?.profit)}
                  </div>
                </div>
              </div>
              <Accordion type="single" collapsible>
                <AccordionItem value="all-finance">
                  <AccordionTrigger>Полная таблица по годам</AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Год</TableHead>
                          <TableHead>Выручка</TableHead>
                          <TableHead>Чистая прибыль</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financeSeries.map((x) => (
                          <TableRow key={x.year}>
                            <TableCell>{x.year}</TableCell>
                            <TableCell>{formatMoneyRub(x.revenue)}</TableCell>
                            <TableCell>{formatMoneyRub(x.profit)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Виды деятельности ОКВЭД-2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {okvedMain && (
            <div className="rounded-lg border bg-primary/5 p-4">
              <Badge variant="secondary">Основной</Badge>
              <div className="mt-2 font-mono text-sm">{okvedMain.code}</div>
              <div className="text-sm">{okvedMain.title}</div>
            </div>
          )}
          {okvedAdditional.slice(0, 8).map((x, i) => (
            <div key={`ok-${i}`} className="grid grid-cols-[120px_1fr] gap-4 border-b py-2 text-sm">
              <span className="font-mono text-muted-foreground">{x.code}</span>
              <span>{x.title}</span>
            </div>
          ))}
          {okvedAdditional.length > 8 && (
            <Collapsible open={okvedOpen} onOpenChange={setOkvedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  {okvedOpen ? "Скрыть" : `Все виды деятельности (${okvedAdditional.length})`}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Поиск по коду/названию..." value={okvedSearch} onChange={(e) => setOkvedSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="max-h-80 overflow-y-auto rounded-md border p-2">
                  {okvedFiltered.map((x, i) => (
                    <div key={`okf-${i}`} className="grid grid-cols-[120px_1fr] gap-4 border-b py-2 text-sm last:border-b-0">
                      <span className="font-mono text-muted-foreground">{x.code}</span>
                      <span>{x.title}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


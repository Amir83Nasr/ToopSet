"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PersianInput } from "@/components/ui/persian-input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Wallet,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Minus,
} from "lucide-react"
import { toast } from "sonner"

interface WalletTransaction {
  id: number
  amount: number
  type: "deposit" | "withdrawal" | "refund"
  description: string | null
  created_at: string
}

interface WalletBalanceResponse {
  balance: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
}

function formatAmount(amount: number): string {
  return `${toPersianDigits(new Intl.NumberFormat("fa-IR").format(amount))} تومان`
}

const typeLabels: Record<
  string,
  { label: string; variant: "default" | "destructive" | "secondary" }
> = {
  deposit: { label: "واریز", variant: "default" },
  withdrawal: { label: "برداشت", variant: "destructive" },
  refund: { label: "استرداد", variant: "secondary" },
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const type = typeLabels[tx.type] || { label: tx.type, variant: "secondary" }
  const isPositive = tx.type === "deposit" || tx.type === "refund"

  return (
    <TableRow>
      <TableCell className="text-xs whitespace-nowrap">
        {formatDate(tx.created_at)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <ArrowDownLeft className="size-4 text-green-500" />
          ) : (
            <ArrowUpRight className="size-4 text-red-500" />
          )}
          <span className="font-medium">
            {formatAmount(Math.abs(tx.amount))}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className={isPositive ? "text-green-600" : "text-red-600"}>
          {type.label}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {tx.description || "-"}
      </TableCell>
    </TableRow>
  )
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

function TransactionForm({
  type,
  onSuccess,
}: {
  type: "deposit" | "withdrawal"
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api(`/api/v1/wallet/${type}`, {
        method: "POST",
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: description || undefined,
        }),
      })
      toast.success(
        type === "deposit" ? "واریز موفقیت‌آمیز بود" : "برداشت موفقیت‌آمیز بود"
      )
      setAmount("")
      setDescription("")
      onSuccess()
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : `خطا در ${type === "deposit" ? "واریز" : "برداشت"}`
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="amount">مبلغ (تومان)</Label>
        <PersianInput
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="مثلاً 50000"
          required
          min="1000"
          step="1000"
        />
      </div>
      <div>
        <Label htmlFor="description">توضیح (اختیاری)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="توضیح تراکنش"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "در حال پردازش..." : type === "deposit" ? "واریز" : "برداشت"}
      </Button>
    </form>
  )
}

export default function WalletPage() {
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [balanceRes, txRes] = await Promise.all([
        api<WalletBalanceResponse>("/api/v1/wallet/balance"),
        api<WalletTransaction[]>("/api/v1/wallet/transactions"),
      ])
      setBalance(balanceRes.balance)
      setTransactions(txRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 0)
    return () => clearTimeout(timer)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">کیف پول</h1>
          <p className="text-muted-foreground">موجودی و تراکنش‌های شما</p>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">کیف پول</h1>
          <p className="text-muted-foreground">موجودی و تراکنش‌های شما</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="ml-2 size-4" />
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">کیف پول</h1>
        <p className="text-muted-foreground">موجودی و تراکنش‌های شما</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>موجودی</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-3xl font-bold">
            {balance !== null ? formatAmount(balance) : "-"}
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="ml-1 size-4" />
                  واریز
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>واریز به کیف پول</DialogTitle>
                </DialogHeader>
                <TransactionForm type="deposit" onSuccess={fetchData} />
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Minus className="ml-1 size-4" />
                  برداشت
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>برداشت از کیف پول</DialogTitle>
                </DialogHeader>
                <TransactionForm type="withdrawal" onSuccess={fetchData} />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تاریخچه تراکنش‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Wallet className="mb-4 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">تراکنشی وجود ندارد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead>توضیح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

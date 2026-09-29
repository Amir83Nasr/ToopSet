"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits } from "@/lib/utils"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/ui/pagination"
import { EitaaIcon } from "@/components/ui/messenger-icons"
import { sportLabels } from "@/components/vendors/vendor-shared"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/lib/toast"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import { MobileBackButton } from "@/components/dashboard/mobile-back-button"
import {
  Building2,
  Send,
  SendHorizonalIcon,
  Loader2,
  Plus,
  Trash2,
  MessageSquareText,
} from "lucide-react"

interface VendorChannel {
  id: number
  chat_id: string
  is_active: boolean
}

interface MessagingVendor {
  id: number
  name: string
  sport_types: string[]
  is_active: boolean
  eitaa_enabled: boolean
  channels: VendorChannel[]
}

interface ChannelDraft {
  chat_id: string
  is_active: boolean
}

export default function AdminMessagingPage() {
  const [vendors, setVendors] = useState<MessagingVendor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const limit = usePaginationLimit()

  const [toggleLoading, setToggleLoading] = useState<number | null>(null)

  // Channels dialog state
  const [channelsVendor, setChannelsVendor] = useState<MessagingVendor | null>(
    null
  )
  const [channelDrafts, setChannelDrafts] = useState<ChannelDraft[]>([])
  const [saveLoading, setSaveLoading] = useState(false)

  // Test-send dialog state
  const [testVendor, setTestVendor] = useState<MessagingVendor | null>(null)
  const [testChatId, setTestChatId] = useState("")
  const [testLoading, setTestLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim())
      const res = await api<{ vendors: MessagingVendor[]; total: number }>(
        `/api/v1/admin/messaging/vendors?${params}`
      )
      setVendors(res.vendors)
      setTotal(res.total)
    } catch {
      toast.error("خطا در دریافت لیست پیام‌رسان مجموعه‌ها")
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => fetchVendors(), 0)
    return () => clearTimeout(timer)
  }, [fetchVendors])

  const patchVendor = useCallback(
    (vendorId: number, patch: Partial<MessagingVendor>) => {
      setVendors((prev) =>
        prev.map((v) => (v.id === vendorId ? { ...v, ...patch } : v))
      )
    },
    []
  )

  const handleToggleEnabled = useCallback(
    async (vendor: MessagingVendor) => {
      setToggleLoading(vendor.id)
      try {
        const res = await api<{ vendor_id: number; eitaa_enabled: boolean }>(
          `/api/v1/admin/messaging/vendors/${vendor.id}/enabled`,
          {
            method: "PATCH",
            body: JSON.stringify({ enabled: !vendor.eitaa_enabled }),
          }
        )
        patchVendor(vendor.id, { eitaa_enabled: res.eitaa_enabled })
        toast.success(
          res.eitaa_enabled
            ? "پیام‌رسان این مجموعه فعال شد"
            : "پیام‌رسان این مجموعه غیرفعال شد"
        )
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "خطا در تغییر وضعیت پیام‌رسان"
        )
      } finally {
        setToggleLoading(null)
      }
    },
    [patchVendor]
  )

  const openChannelsDialog = useCallback((vendor: MessagingVendor) => {
    setChannelsVendor(vendor)
    setChannelDrafts(
      vendor.channels.map((c) => ({
        chat_id: c.chat_id,
        is_active: c.is_active,
      }))
    )
  }, [])

  const handleSaveChannels = useCallback(async () => {
    if (!channelsVendor) return
    const cleaned = channelDrafts
      .map((d) => ({ chat_id: d.chat_id.trim(), is_active: d.is_active }))
      .filter((d) => d.chat_id.length > 0)
    const unique = new Set(cleaned.map((d) => d.chat_id))
    if (unique.size !== cleaned.length) {
      toast.error("آدرس کانال تکراری وارد شده است")
      return
    }
    setSaveLoading(true)
    try {
      const res = await api<{ channels: VendorChannel[] }>(
        `/api/v1/admin/messaging/vendors/${channelsVendor.id}/channels`,
        { method: "PUT", body: JSON.stringify({ channels: cleaned }) }
      )
      patchVendor(channelsVendor.id, { channels: res.channels })
      toast.success("کانال‌های این مجموعه ذخیره شد")
      setChannelsVendor(null)
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "خطا در ذخیره کانال‌ها"
      )
    } finally {
      setSaveLoading(false)
    }
  }, [channelsVendor, channelDrafts, patchVendor])

  const handleTestSend = useCallback(async () => {
    if (!testVendor) return
    setTestLoading(true)
    try {
      await api(`/api/v1/admin/messaging/vendors/${testVendor.id}/test-send`, {
        method: "POST",
        body: JSON.stringify({ chat_id: testChatId.trim() }),
      })
      toast.success("پیام تستی با موفقیت ارسال شد")
      setTestVendor(null)
      setTestChatId("")
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "خطا در ارسال پیام تستی"
      )
    } finally {
      setTestLoading(false)
    }
  }, [testVendor, testChatId])

  const activeChannelCount = useCallback(
    (vendor: MessagingVendor) =>
      vendor.channels.filter((c) => c.is_active).length,
    []
  )

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  )

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            پیام‌رسان سانس‌ها
          </h1>
          <p className="text-muted-foreground">
            مدیریت کانال‌های دریافت پیام روزانه سانس‌ها برای هر مجموعه
          </p>
        </div>
        <MobileBackButton />
      </div>

      <DataTableToolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="جستجوی مجموعه..."
        />
      </DataTableToolbar>

      {loading ? (
        <div className="space-y-6">
          {/* Mobile/Tablet Card Skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 border-b bg-muted/30 pb-3">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table Skeleton */}
          <div className="hidden lg:block">
            <Table className="min-w-225 table-fixed">
              <colgroup>
                <col className="w-56" />
                <col className="w-44" />
                <col className="w-32" />
                <col className="w-72" />
                <col className="w-44" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>نام مجموعه</TableHead>
                  <TableHead>ورزش‌ها</TableHead>
                  <TableHead className="text-center">پیام‌رسان</TableHead>
                  <TableHead>کانال‌ها</TableHead>
                  <TableHead className="text-center">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j} className={j > 0 ? "text-center" : ""}>
                        <Skeleton
                          className={j > 0 ? "mx-auto h-4 w-20" : "h-4 w-20"}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <EitaaIcon className="size-8 text-muted-foreground" />
            </div>
            <p className="font-medium">
              {debouncedSearch
                ? "مجموعه‌ای یافت نشد"
                : "هیچ مجموعه‌ای ثبت نشده است"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedSearch
                ? "عبارت دیگری را جستجو کنید"
                : "پس از ثبت مجموعه، کانال‌های پیام‌رسان آن اینجا مدیریت می‌شوند."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Mobile & Tablet: Cards layout */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10 transition-all hover:shadow-md"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 border-b bg-muted/30 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 shrink-0 text-primary" />
                        <h3
                          className="truncate text-base font-semibold text-foreground"
                          title={vendor.name}
                        >
                          {vendor.name}
                        </h3>
                      </div>
                      {!vendor.is_active && (
                        <Badge variant="outline" className="text-xs">
                          مجموعه غیرفعال
                        </Badge>
                      )}
                    </div>
                    <Switch
                      checked={vendor.eitaa_enabled}
                      disabled={toggleLoading === vendor.id}
                      onCheckedChange={() => handleToggleEnabled(vendor)}
                      aria-label="وضعیت پیام‌رسان"
                    />
                  </div>

                  {/* Body */}
                  <div className="space-y-3.5 p-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {vendor.sport_types.map((sport) => (
                        <Badge
                          key={sport}
                          variant="secondary"
                          className="bg-primary/10 text-primary"
                        >
                          {sportLabels[sport] ?? sport}
                        </Badge>
                      ))}
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2.5 text-xs">
                      {vendor.channels.length === 0 ? (
                        <span className="text-muted-foreground">
                          بدون کانال اختصاصی
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          {vendor.channels.slice(0, 2).map((channel) => (
                            <Badge
                              key={channel.id}
                              variant={
                                channel.is_active ? "default" : "outline"
                              }
                              className="max-w-40 truncate font-normal"
                            >
                              {channel.chat_id}
                            </Badge>
                          ))}
                          {vendor.channels.length > 2 && (
                            <Badge variant="secondary">
                              +{toPersianDigits(vendor.channels.length - 2)}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="mt-1.5 text-muted-foreground">
                        {toPersianDigits(activeChannelCount(vendor))} کانال فعال
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openChannelsDialog(vendor)}
                      >
                        <MessageSquareText className="me-1 size-4" />
                        کانال‌ها
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTestVendor(vendor)
                          setTestChatId("")
                        }}
                      >
                        <SendHorizonalIcon className="me-1 size-4" />
                        ارسال تستی
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Table className="min-w-225 table-fixed">
              <colgroup>
                <col className="w-56" />
                <col className="w-44" />
                <col className="w-32" />
                <col className="w-72" />
                <col className="w-44" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>نام مجموعه</TableHead>
                  <TableHead>ورزش‌ها</TableHead>
                  <TableHead className="text-center">پیام‌رسان</TableHead>
                  <TableHead>کانال‌ها</TableHead>
                  <TableHead className="text-center">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{vendor.name}</span>
                      </div>
                      {!vendor.is_active && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          مجموعه غیرفعال
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vendor.sport_types.map((sport) => (
                          <Badge
                            key={sport}
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                          >
                            {sportLabels[sport] ?? sport}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Switch
                              checked={vendor.eitaa_enabled}
                              disabled={toggleLoading === vendor.id}
                              onCheckedChange={() =>
                                handleToggleEnabled(vendor)
                              }
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {vendor.eitaa_enabled
                              ? "ارسال پیام و بروزرسانی سانس‌ها فعال است"
                              : "ارسال پیام و بروزرسانی سانس‌ها غیرفعال است"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {vendor.channels.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          بدون کانال اختصاصی
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          {vendor.channels.slice(0, 2).map((channel) => (
                            <Badge
                              key={channel.id}
                              variant={
                                channel.is_active ? "default" : "outline"
                              }
                              className="max-w-40 truncate font-normal"
                            >
                              {channel.chat_id}
                            </Badge>
                          ))}
                          {vendor.channels.length > 2 && (
                            <Badge variant="secondary">
                              +{toPersianDigits(vendor.channels.length - 2)}
                            </Badge>
                          )}
                        </div>
                      )}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {toPersianDigits(activeChannelCount(vendor))} کانال فعال
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openChannelsDialog(vendor)}
                            >
                              <MessageSquareText className="me-1 size-4" />
                              کانال‌ها
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>مدیریت کانال‌های این مجموعه</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTestVendor(vendor)
                                setTestChatId("")
                              }}
                            >
                              <SendHorizonalIcon className="me-1 size-4" />
                              ارسال تستی
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>ارسال پیام تستی سانس‌ها به یک کانال دلخواه</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* ── Channels management dialog ── */}
      <ResponsiveDialog
        open={channelsVendor !== null}
        onOpenChange={(open) => !open && setChannelsVendor(null)}
      >
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              کانال‌های پیام‌رسان — {channelsVendor?.name}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              آدرس کانال‌هایی که پیام روزانه سانس‌ها و بروزرسانی رزروها برای این
              مجموعه به آن‌ها ارسال می‌شود. در صورت خالی بودن، کانال پیش‌فرض
              سامانه استفاده می‌شود.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {channelDrafts.length === 0 && (
              <div className="rounded-lg border border-dashed py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  هنوز کانالی اضافه نشده است
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  در صورت خالی بودن، پیام‌ها به کانال پیش‌فرض سامانه می‌روند
                </p>
              </div>
            )}
            {channelDrafts.map((draft, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 rounded-lg border bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {toPersianDigits(index + 1)}
                  </span>
                  <span className="flex-1" />
                  <span className="text-xs text-muted-foreground">فعال</span>
                  <Switch
                    checked={draft.is_active}
                    onCheckedChange={(checked) =>
                      setChannelDrafts((prev) =>
                        prev.map((d, i) =>
                          i === index ? { ...d, is_active: checked } : d
                        )
                      )
                    }
                    aria-label={`کانال ${toPersianDigits(index + 1)} فعال`}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setChannelDrafts((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                    <span className="sr-only">حذف کانال</span>
                  </Button>
                </div>
                <Input
                  id={`channel-${index}`}
                  dir="ltr"
                  value={draft.chat_id}
                  onChange={(e) =>
                    setChannelDrafts((prev) =>
                      prev.map((d, i) =>
                        i === index ? { ...d, chat_id: e.target.value } : d
                      )
                    )
                  }
                  placeholder="@channel یا شناسه کانال"
                  className="bg-background"
                />
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setChannelDrafts((prev) => [
                  ...prev,
                  { chat_id: "", is_active: true },
                ])
              }
            >
              <Plus className="me-1 size-4" />
              افزودن کانال
            </Button>
          </div>

          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() => setChannelsVendor(null)}
              disabled={saveLoading}
            >
              انصراف
            </Button>
            <Button onClick={handleSaveChannels} disabled={saveLoading}>
              {saveLoading && <Loader2 className="me-1 size-4 animate-spin" />}
              ذخیره
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ── Test-send dialog ── */}
      <ResponsiveDialog
        open={testVendor !== null}
        onOpenChange={(open) => !open && setTestVendor(null)}
      >
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              ارسال تستی — {testVendor?.name}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              پیام سانس‌های فعلی این مجموعه همین حالا به آدرس کانالی که وارد
              می‌کنید ارسال می‌شود. این پیام فقط برای تست است و بعداً ویرایش
              نمی‌شود.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleTestSend()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="test-chat-id">آدرس کانال تستی</Label>
              <Input
                id="test-chat-id"
                dir="ltr"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="@test_channel"
                required
                autoFocus
              />
            </div>
            <ResponsiveDialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTestVendor(null)}
                disabled={testLoading}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                disabled={testLoading || !testChatId.trim()}
              >
                {testLoading ? (
                  <>
                    <Loader2 className="me-1 size-4 animate-spin" />
                    در حال ارسال...
                  </>
                ) : (
                  <>
                    <Send className="me-1 size-4" />
                    ارسال پیام
                  </>
                )}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toPersianDigits, formatPersianDate } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { usePaginationLimit } from "@/hooks/use-pagination-limit"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  SearchInput,
  DataTableToolbar,
} from "@/components/ui/data-table-toolbar"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
import { TablePagination } from "@/components/ui/pagination"
import { toast } from "@/lib/toast"
import { Loader2, ShieldX, ToggleRight, UserCog, Trash2 } from "lucide-react"
import { MobileBackButton } from "@/components/dashboard/mobile-back-button"

interface AdminUser {
  id: number
  phone: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string | null
}

interface AdminUserListResponse {
  users: AdminUser[]
  total: number
}

const statusOptions = [
  { value: "all", label: "همه وضعیت‌ها" },
  { value: "true", label: "فعال" },
  { value: "false", label: "غیرفعال" },
]

const roleOptions = [
  { value: "user", label: "کاربر" },
  { value: "manager", label: "مدیر مجموعه" },
  { value: "admin", label: "مدیر سیستم" },
]

function formatDate(iso: string): string {
  return formatPersianDate(iso)
}

export default function UsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const limit = usePaginationLimit()

  // Delete user dialog
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Debounce search input — 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(0)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("skip", String(page * limit))
      params.set("limit", String(limit))
      if (search) params.set("search", search)
      if (roleFilter && roleFilter !== "all") params.set("role", roleFilter)
      if (statusFilter && statusFilter !== "all")
        params.set("is_active", statusFilter)

      const res = await api<AdminUserListResponse>(`/api/v1/users?${params}`)
      setUsers(res.users)
      setTotal(res.total)
    } catch {
      // not admin or not authenticated
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, roleFilter, statusFilter])

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 0)
    return () => clearTimeout(timer)
  }, [fetchUsers])

  async function handleRoleChange(userId: number, newRole: string) {
    setUpdatingId(userId)
    try {
      await api(`/api/v1/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      })
      toast.success("نقش کاربر با موفقیت تغییر کرد")
      fetchUsers()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در تغییر نقش"
      toast.error(msg)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleToggleActive(userId: number, currentActive: boolean) {
    setUpdatingId(userId)
    try {
      await api(`/api/v1/users/${userId}/toggle-active`, { method: "PATCH" })
      toast.success(currentActive ? "کاربر غیرفعال شد" : "کاربر فعال شد")
      fetchUsers()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در تغییر وضعیت"
      toast.error(msg)
    } finally {
      setUpdatingId(null)
    }
  }

  const totalPages = Math.ceil(total / limit)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/api/v1/admin/users/${deleteTarget.id}/force`, {
        method: "DELETE",
      })

      // Update local state immediately for better UI response
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setTotal((prev) => prev - 1)

      toast.success("کاربر با موفقیت حذف شد")
      setDeleteTarget(null)

      // Refresh to ensure synchronization with server
      await fetchUsers()
    } catch (err) {
      console.error("Delete error:", err)
      toast.error(err instanceof ApiError ? err.message : "خطا در حذف کاربر")
    } finally {
      setDeleting(false)
    }
  }

  function handleDeleteClick(u: AdminUser) {
    setDeleteTarget(u)
  }

  // ---- Access denied for non-admin users ----
  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
        <ShieldX className="size-16" />
        <p className="text-xl">شما دسترسی به این بخش را ندارید</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مدیریت کاربران</h1>
          <p className="text-muted-foreground">مدیریت نقش و وضعیت کاربران</p>
        </div>
        <MobileBackButton />
      </div>

      {/* Search & filter bar */}
      <DataTableToolbar>
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="جستجوی کاربر..."
        />
        <div className="flex gap-2">
          <div>
            <Select
              value={roleFilter}
              onValueChange={(val) => {
                setRoleFilter(val)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>نقش</SelectLabel>
                  <SelectItem value="all">همه نقش‌ها</SelectItem>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>وضعیت</SelectLabel>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DataTableToolbar>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="me-2 size-5 animate-spin" />
          در حال بارگذاری...
        </div>
      ) : users.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <UserCog className="size-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">کاربری یافت نشد</p>
          </CardContent>
        </Card>
      ) : (
        /* Users table */
        <div>
          <Table className="min-w-250 table-fixed">
            <colgroup>
              <col className="w-44" />
              <col className="w-36" />
              <col className="w-36" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-56" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead className="text-center">تلفن</TableHead>
                <TableHead className="text-center">نقش</TableHead>
                <TableHead className="text-center">وضعیت</TableHead>
                <TableHead className="text-center">تاریخ ثبت‌نام</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-center">
                      <span dir="ltr" className="inline-block">
                        {toPersianDigits(u.phone)}
                      </span>
                    </TableCell>
                    {/* Role change select */}
                    <TableCell className="text-center">
                      <Select
                        value={u.role}
                        onValueChange={(newRole) =>
                          handleRoleChange(u.id, newRole)
                        }
                        disabled={updatingId === u.id}
                      >
                        <SelectTrigger className="mx-auto w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>نقش</SelectLabel>
                            {roleOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* Status badge */}
                    <TableCell className="text-center">
                      <Badge variant={u.is_active ? "default" : "secondary"}>
                        {u.is_active ? "فعال" : "غیرفعال"}
                      </Badge>
                    </TableCell>
                    {/* Registration date */}
                    <TableCell className="text-center text-muted-foreground">
                      {u.created_at ? formatDate(u.created_at) : "-"}
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updatingId === u.id}
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                        >
                          {updatingId === u.id ? (
                            <Loader2 className="me-1 size-4 animate-spin" />
                          ) : (
                            <ToggleRight data-icon="inline-start" />
                          )}
                          {u.is_active ? "غیرفعال کردن" : "فعال کردن"}
                        </Button>
                        {updatingId === u.id || u.id === user?.id ? (
                          ""
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="destructive"
                                size="icon-sm"
                                onClick={() => handleDeleteClick(u)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>حذف کاربر</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <TablePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ResponsiveDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>حذف کاربر</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              آیا از حذف کاربر «{deleteTarget?.full_name}» اطمینان دارید؟ تمام
              اطلاعات مرتبط (مجموعه‌ها، رزروها، نظرات و ...) نیز برای همیشه حذف
              می‌شوند.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "در حال حذف..." : "حذف کاربر"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  )
}

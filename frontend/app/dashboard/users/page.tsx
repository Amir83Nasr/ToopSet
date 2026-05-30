"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api"
import { toEnglishDigits, toPersianDigits } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  ShieldX,
  UserCog,
  Plus,
  Trash2,
} from "lucide-react"

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
  { value: "manager", label: "مدیر زمین" },
  { value: "admin", label: "مدیر سیستم" },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR")
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
  const limit = 20

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createPhone, setCreatePhone] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createRole, setCreateRole] = useState("user")
  const [creating, setCreating] = useState(false)
  const [phoneError, setPhoneError] = useState("")

  // Delete confirmation
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
  }, [page, search, roleFilter, statusFilter])

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim() || !createPhone.trim() || !createPassword.trim()) return

    const normalizedPhone = toEnglishDigits(createPhone.trim())
    if (!/^09\d{9}$/.test(normalizedPhone)) {
      setPhoneError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود")
      return
    }
    setPhoneError("")

    setCreating(true)
    try {
      await api("/api/v1/admin/users", {
        method: "POST",
        body: JSON.stringify({
          full_name: createName,
          phone: normalizedPhone,
          password: createPassword,
          role: createRole,
        }),
      })
      toast.success("کاربر با موفقیت ساخته شد")
      setCreateOpen(false)
      setCreateName("")
      setCreatePhone("")
      setCreatePassword("")
      setCreateRole("user")
      fetchUsers()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ساخت کاربر"
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/api/v1/admin/users/${deleteTarget.id}`, { method: "DELETE" })
      toast.success("کاربر با موفقیت حذف شد")
      setDeleteTarget(null)
      fetchUsers()
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در حذف کاربر"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="ml-1.5 size-4" />
          کاربر جدید
        </Button>
      </div>

      {/* Search & filter bar */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجوی کاربر..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-2">
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
                <SelectItem value="all">همه نقش‌ها</SelectItem>
                {roleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="ml-2 size-5 animate-spin" />
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
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ردیف</TableHead>
                <TableHead>نام</TableHead>
                <TableHead>تلفن</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>تاریخ ثبت‌نام</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u, idx) => {
                return (
                  <TableRow key={u.id}>
                    <TableCell className="text-muted-foreground">
                      {page * limit + idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell dir="ltr" className="text-left">
                      {toPersianDigits(u.phone)}
                    </TableCell>
                    {/* Role change select */}
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(newRole) =>
                          handleRoleChange(u.id, newRole)
                        }
                        disabled={updatingId === u.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {/* Status badge */}
                    <TableCell>
                      <Badge variant={u.is_active ? "default" : "secondary"}>
                        {u.is_active ? "فعال" : "غیرفعال"}
                      </Badge>
                    </TableCell>
                    {/* Registration date */}
                    <TableCell className="text-muted-foreground">
                      {u.created_at ? formatDate(u.created_at) : "-"}
                    </TableCell>
                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={u.is_active ? "outline" : "default"}
                          size="sm"
                          disabled={updatingId === u.id}
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                        >
                          {updatingId === u.id ? (
                            <Loader2 className="ml-1 size-4 animate-spin" />
                          ) : u.is_active ? (
                            <ShieldX className="ml-1 size-4" />
                          ) : (
                            <ShieldCheck className="ml-1 size-4" />
                          )}
                          {u.is_active ? "غیرفعال" : "فعال"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={updatingId === u.id || u.id === user?.id}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                صفحه {page + 1} از {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronRight className="ml-1 size-4" />
                  قبلی
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  بعدی
                  <ChevronLeft className="mr-1 size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open)
        if (!open) { setPhoneError("") }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>کاربر جدید</DialogTitle>
            <DialogDescription>
              اطلاعات کاربر جدید را وارد کنید
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-name" className="text-sm font-medium">
                  نام و نام خانوادگی
                </label>
                <Input
                  id="create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="مثال: کاربر تست"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-phone" className="text-sm font-medium">
                  شماره موبایل
                </label>
                <Input
                  id="create-phone"
                  dir="ltr"
                  value={createPhone}
                  onChange={(e) => {
                    setCreatePhone(e.target.value)
                    if (phoneError) setPhoneError("")
                  }}
                  placeholder="09120000000"
                  aria-invalid={!!phoneError}
                  required
                />
                {phoneError && (
                  <p className="text-sm text-destructive">{phoneError}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-password" className="text-sm font-medium">
                  رمز عبور
                </label>
                <Input
                  id="create-password"
                  type="password"
                  dir="ltr"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="حداقل ۴ کاراکتر"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="create-role" className="text-sm font-medium">
                  نقش
                </label>
                <Select value={createRole} onValueChange={setCreateRole}>
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={creating}>
                {creating ? "در حال ساخت..." : "ساخت کاربر"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف کاربر</DialogTitle>
            <DialogDescription>
              آیا از حذف کاربر «{deleteTarget?.full_name}» اطمینان دارید؟ این
              کاربر به صورت نرم حذف می‌شود و قابل بازیابی است.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

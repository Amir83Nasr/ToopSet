import { z } from "zod"

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const phoneSchema = z
  .string()
  .refine(
    (val) => val.length < 11 || /^09[0-9]{9}$/.test(val),
    "شماره تلفن باید با ۰۹ شروع شود و ۱۱ رقم باشد"
  )

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(4, "رمز عبور باید حداقل ۴ کاراکتر باشد"),
})

export const registerSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(4, "رمز عبور باید حداقل ۴ کاراکتر باشد"),
  full_name: z
    .string()
    .min(1, "نام الزامی است")
    .max(128, "نام حداکثر ۱۲۸ کاراکتر می‌تواند باشد"),
})

// ---------------------------------------------------------------------------
// Court
// ---------------------------------------------------------------------------

export const sportTypes = [
  "volleyball",
  "basketball",
  "futsal",
  "handball",
] as const

export const courtCreateSchema = z.object({
  name: z
    .string()
    .min(1, "نام مجموعه الزامی است")
    .max(256, "نام حداکثر ۲۵۶ کاراکتر می‌تواند باشد"),
  sport_types: z
    .array(z.enum(sportTypes))
    .min(1, "حداقل یک نوع ورزش را انتخاب کنید"),
  address: z
    .string()
    .min(1, "آدرس الزامی است")
    .max(256, "آدرس حداکثر ۲۵۶ کاراکتر می‌تواند باشد"),
  latitude: z.coerce
    .number({ error: "عرض جغرافیایی را وارد کنید" })
    .gte(-90, "عرض جغرافیایی معتبر نیست")
    .lte(90, "عرض جغرافیایی معتبر نیست"),
  longitude: z.coerce
    .number({ error: "طول جغرافیایی را وارد کنید" })
    .gte(-180, "طول جغرافیایی معتبر نیست")
    .lte(180, "طول جغرافیایی معتبر نیست"),
  capacity: z.coerce
    .number({ error: "ظرفیت را وارد کنید" })
    .int("ظرفیت باید عدد صحیح باشد")
    .positive("ظرفیت باید عدد مثبت باشد"),
  amenities: z.record(z.string(), z.unknown()).optional(),
  images: z.array(z.string()).min(3, "حداقل ۳ تصویر از مجموعه الزامی است"),
})

export const courtUpdateSchema = courtCreateSchema.partial()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CourtCreateInput = z.infer<typeof courtCreateSchema>
export type CourtUpdateInput = z.infer<typeof courtUpdateSchema>

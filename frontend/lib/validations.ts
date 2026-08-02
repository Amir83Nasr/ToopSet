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
// Vendor
// ---------------------------------------------------------------------------

export const sportTypes = [
  "volleyball",
  "basketball",
  "futsal",
  "handball",
  "football",
] as const

const vendorFields = {
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
  ball_available: z.boolean().optional(),
  ball_price: z.coerce
    .number()
    .nonnegative("قیمت توپ نمی‌تواند منفی باشد")
    .optional(),
  images: z.array(z.string()).min(3, "حداقل ۳ تصویر از مجموعه الزامی است"),
}

function validateBallConfiguration(
  data: { ball_available?: boolean; ball_price?: number },
  context: z.RefinementCtx
) {
  if (data.ball_available && (!data.ball_price || data.ball_price <= 0)) {
    context.addIssue({
      code: "custom",
      path: ["ball_price"],
      message: "برای مجموعه دارای توپ، هزینه توپ را وارد کنید",
    })
  }
}

export const vendorCreateSchema = z
  .object(vendorFields)
  .superRefine(validateBallConfiguration)

export const vendorUpdateSchema = z
  .object(vendorFields)
  .partial()
  .superRefine(validateBallConfiguration)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// ── OTP ─────────────────────────────────────────────────────────────

export const otpPhoneSchema = z.object({
  phone: phoneSchema,
})

export const verifyOtpSchema = z.object({
  phone: z.string(),
  code: z
    .string()
    .length(6, "کد تأیید باید ۶ رقم باشد")
    .regex(/^\d{6}$/, "کد تأیید نامعتبر است"),
  full_name: z
    .string()
    .min(1, "نام الزامی است")
    .max(128, "نام حداکثر ۱۲۸ کاراکتر می‌تواند باشد")
    .optional(),
})

export type OtpPhoneInput = z.infer<typeof otpPhoneSchema>
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export const contactSchema = z.object({
  name: z
    .string()
    .min(1, "نام الزامی است")
    .max(256, "نام حداکثر ۲۵۶ کاراکتر می‌تواند باشد"),
  email: z
    .string()
    .refine(
      (val) => val === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val),
      "فرمت ایمیل معتبر نیست"
    )
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(1, "شماره تلفن الزامی است")
    .max(32, "شماره تلفن حداکثر ۳۲ کاراکتر می‌تواند باشد"),
  subject: z
    .string()
    .min(1, "موضوع الزامی است")
    .max(512, "موضوع حداکثر ۵۱۲ کاراکتر می‌تواند باشد"),
  message: z.string().min(1, "متن پیام الزامی است"),
})

export type ContactInput = z.infer<typeof contactSchema>

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type VendorCreateInput = z.infer<typeof vendorCreateSchema>
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>

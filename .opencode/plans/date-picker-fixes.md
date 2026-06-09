# بهبود DateRangePicker

## تغییرات

### ۱. `calendar.tsx` - مخفی کردن روزهای ماه‌های مجاور

- خط ۲۴: `showOutsideDays = true` → `showOutsideDays = false`
- فقط روزهای ماه جاری نمایش داده بشن، روزهای ۱-۳ ماه بعد توی هفته آخر ماه قبل نشون داده نشن

### ۲. `date-range-picker.tsx` - پنل بعد از انتخاب باز بسته نشه

- حذف خطوط ۸۹-۹۱ (`setOpen(false)`)
- کاربر با کلیک بیرون از پنل میبنده

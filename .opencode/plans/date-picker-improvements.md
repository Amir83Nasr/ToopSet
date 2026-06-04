# بهبود DatePicker / DateRangePicker

## هدف
- بهبود کامپوننت DateRangePicker
- جایگزینی DatePicker با DateRangePicker در دیالوگ "افزودن زمان" داشبورد
- افزودن DateRangePicker به سایدبار رزرو صفحه عمومی
- تست همه بخش‌ها

## مراحل

### ۱. بهبود DateRangePicker
- فایل: `frontend/components/ui/date-range-picker.tsx`
- رفع withSideEffects
- بهبود UI

### ۲. داشبورد — افزودن زمان با بازه
- فایل: `frontend/app/dashboard/courts/[id]/page.tsx`
- جایگزینی DatePicker + slotDate با DateRangePicker + dateRange
- تغییر handleCreateSlot برای پشتیبانی از بازه تاریخ
- استفاده از POST /api/v1/courts/{id}/slots در حلقه

### ۳. صفحه عمومی — DateRangePicker در سایدبار
- فایل: `frontend/app/courts/[id]/page.tsx`
- افزودن DateRangePicker بالای نوار ۷ روزه
- با انتخاب بازه، به اولین روز بره

### ۴. تست
- بررسی تایپ‌اسکریپت
- بررسی کارکرد DateRangePicker
- بررسی ایجاد سانس با بازه
- بررسی ناوبری تاریخ در صفحه عمومی

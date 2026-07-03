# مستندات ساختار دیتابیس

این سند جدول‌های اصلی PostgreSQL استفاده‌شده در ToopSet را توضیح می‌دهد. مبنای این توضیحات مدل‌های SQLAlchemy در مسیر `backend/app/models` است.

## نمای کلی

دیتابیس حول این حوزه‌ها سازمان‌دهی شده است:

- هویت و دسترسی: `users`, `refresh_tokens`, `bank_cards`
- مجموعه‌ها و زمان‌بندی‌ها: `vendors`, `vendor_images`, `time_slots`
- رزروها و پرداخت‌ها: `bookings`, `payments`, `refunds`, `penalties`
- امور مالی مدیر/ادمین: `settlements`, `settlement_items`, `slot_cancellations`
- تعامل کاربران: `reviews`, `favorites`, `notifications`, `notification_deliveries`
- سیستم/ادمین: `settings`, `logs`, `contact_messages`
- کیف پول: `wallets`, `wallet_transactions`

تمام فیلدهای زمانی، مگر اینکه خلاف آن ذکر شده باشد، از نوع timezone-aware `DateTime(timezone=True)` هستند.

## مقادیر Enum

### `users.role`

- `user`: مشتری عادی
- `manager`: مالک یا مدیر مجموعه
- `admin`: مدیر سیستم

### `bookings.status`

- `pending_payment`: رزرو به‌صورت موقت نگه داشته شده و منتظر پرداخت است.
- `confirmed`: رزرو پرداخت و تایید شده است.
- `pending_cancellation`: لغو رزرو نیازمند فرایند جایگزینی یا رسیدگی است.
- `transferred`: رزرو منتقل یا با رزرو دیگری جایگزین شده است.
- `cancelled`: رزرو لغو شده است.
- `expired`: مهلت پرداخت به پایان رسیده است.

### `bookings.source`

- `online`: توسط مشتری و از طریق جریان عمومی رزرو ساخته شده است.
- `manager_manual`: به‌صورت دستی توسط مدیر ساخته شده است.

### `bookings.settlement_status`

- `not_settled`: در آینده قابل تسویه است، اما هنوز درخواستی ثبت نشده است.
- `settlement_requested`: مدیر درخواست تسویه ثبت کرده است.
- `included_in_settlement`: ادمین درخواست تسویه را تایید کرده و رزرو در تسویه قرار گرفته است.
- `settled`: مبلغ رزرو به مدیر پرداخت شده است.
- `excluded_due_to_refund`: رزرو به دلیل ایجاد بازپرداخت از تسویه خارج شده است.
- `excluded_due_to_cancellation`: رزرو به دلیل لغو یا منقضی شدن از تسویه خارج شده است.

### `time_slots.status`

- `open`: برای رزرو در دسترس است.
- `reserving`: در زمان پرداخت به‌صورت موقت نگه داشته شده است.
- `pending_cancellation`: رزرو شده، اما فرایند جایگزینی/لغو فعال است.
- `reserved`: رزرو شده است.
- `blocked`: توسط مدیر یا ادمین مسدود شده است.
- `disabled`: از چرخه رزرو غیرفعال شده است.
- `closed`: بسته یا غیرقابل دسترس است.

### `time_slots.gender`

- `male`
- `female`

### `payments.status`

- `pending`
- `success`
- `failed`
- `expired`

### `refunds.status` و `settlements.status`

- `pending`: ساخته شده و منتظر اقدام ادمین است.
- `approved`: توسط ادمین تایید شده است.
- `rejected`: توسط ادمین رد شده است.
- `paid`: پرداخت یا تسویه شده است.

### `refunds.type`

- `user_cancellation`: مشتری یک رزرو را لغو کرده است.
- `manager_cancellation`: مدیر یک سانس/رزرو را لغو کرده است.
- `replaced_after_pending_cancellation`: لغو در انتظار رسیدگی با رزرو جایگزین حل شده و بازپرداخت لازم است.

### `bank_cards.status`

- `pending_confirmation`: کارت استعلام شده، اما هنوز توسط کاربر تایید نشده است.
- `verified`: کارت تایید شده و برای بازپرداخت قابل استفاده است.
- `rejected`: کارت رد شده است.

## جدول‌ها

## `users`

کاربران برنامه شامل مشتری‌ها، مدیرها و ادمین‌ها را نگهداری می‌کند.

رابطه‌های مهم:

- یک کاربر در نقش مدیر می‌تواند مالک چندین `vendors` باشد.
- یک کاربر می‌تواند چندین `bookings`, `reviews`, `penalties`, `notifications`, `refresh_tokens`, `bank_cards` و علاقه‌مندی داشته باشد.
- هر کاربر به‌واسطه یکتایی `wallets.user_id` یک کیف پول دارد.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `full_name` | string(128) | نام نمایشی کاربر. |
| `phone` | string(16), unique, indexed | شناسه ورود و شماره تماس. |
| `password_hash` | string(256) | رمز عبور هش‌شده یا مقدار جایگزین برای حساب‌های فقط OTP. |
| `role` | enum | نقش دسترسی: `user`, `manager`, `admin`. |
| `avatar_url` | string(512), nullable | آدرس تصویر پروفایل. |
| `token_version` | integer | برای نامعتبر کردن توکن‌های دسترسی فعلی پس از اقدامات امنیتی افزایش می‌یابد. |
| `is_active` | boolean | مشخص می‌کند حساب فعال است یا نه. |
| `created_at` | timestamp | زمان ساخت حساب. |

ایندکس‌ها:

- `phone`
- `role`
- `created_at`

## `refresh_tokens`

نشست‌های refresh token را نگهداری می‌کند. Access tokenها کوتاه‌مدت هستند؛ refresh tokenها چرخش پیدا می‌کنند و در این جدول ذخیره می‌شوند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `token_hash` | string(128), unique, indexed | هش refresh token؛ مقدار خام توکن هرگز ذخیره نمی‌شود. |
| `user_id` | FK `users.id` | مالک نشست. |
| `session_id` | string(36), indexed | شناسه منطقی نشست/دستگاه. |
| `issued_at` | timestamp | زمان صدور refresh token. |
| `expires_at` | timestamp, indexed | زمان انقضا. |
| `revoked_at` | timestamp, nullable | زمان لغو؛ مقدار null یعنی هنوز فعال است. |
| `replaced_by` | string(128), nullable | هش یا نشانگر توکن جایگزین هنگام چرخش توکن. |
| `device_info` | string(512), nullable | توضیح کوتاه دستگاه بر اساس user-agent. |
| `ip_address` | string(45), nullable | IP که نشست را ساخته یا استفاده کرده است. |
| `user_agent` | text, nullable | رشته کامل user-agent. |

ایندکس‌ها:

- `token_hash`
- `session_id`
- `expires_at`
- ترکیبی `user_id`, `revoked_at`

## `bank_cards`

کارت‌های بانکی تاییدشده یا در انتظار تایید را برای بازپرداخت نگهداری می‌کند. شماره کارت‌ها رمزنگاری می‌شوند و همچنین نسخه ماسک‌شده و fingerprint برای نمایش و تشخیص تکراری بودن ذخیره می‌شود.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `user_id` | FK `users.id`, indexed | مالک کارت. |
| `encrypted_card_number` | string(512) | شماره کامل کارت به‌صورت رمزنگاری‌شده. |
| `masked_card_number` | string(32) | شماره کارت امن برای نمایش، مثل چند رقم اول/آخر. |
| `card_fingerprint` | string(64), indexed | fingerprint قطعی برای تشخیص کارت تکراری. |
| `holder_name` | string(128), nullable | نام صاحب کارت که در استعلام برگشته یا وارد شده است. |
| `status` | enum, indexed | وضعیت `pending_confirmation`, `verified` یا `rejected`. |
| `verified_at` | timestamp, nullable | زمان تایید کارت. |
| `created_at` | timestamp | زمان ساخت. |
| `updated_at` | timestamp | زمان آخرین به‌روزرسانی. |

قیود:

- یکتای `user_id`, `card_fingerprint`

## `vendors`

مجموعه‌ها یا مکان‌های ورزشی مدیریت‌شده توسط مدیران را نگهداری می‌کند.

رابطه‌های مهم:

- از طریق `manager_id` به `users` متصل است.
- چندین `time_slots`, `vendor_images`, `reviews` و `favorites` دارد.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `manager_id` | FK `users.id`, indexed | کاربر مدیر/مالک. |
| `name` | string(256) | نام مجموعه. |
| `sport_types` | array(string) | ورزش‌های قابل ارائه در مجموعه، مثل فوتسال یا والیبال. |
| `address` | text | آدرس قابل خواندن برای کاربر. |
| `latitude` | float | عرض جغرافیایی روی نقشه. |
| `longitude` | float | طول جغرافیایی روی نقشه. |
| `capacity` | integer | ظرفیت مجموعه/سانس. |
| `amenities` | JSON, nullable | امکانات یا جزئیات مثل پارکینگ، دوش و موارد مشابه. |
| `is_active` | boolean, indexed | وضعیت تایید ادمین/فعال بودن. |
| `average_rating` | float | میانگین امتیاز cache شده برای صفحات جست‌وجو و نمایش. |
| `created_at` | timestamp, indexed | زمان ساخت. |

ایندکس‌ها:

- `manager_id`
- `is_active`
- `created_at`

## `vendor_images`

تصاویر مرتب‌شده گالری هر مجموعه را نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `vendor_id` | FK `vendors.id` | مجموعه مالک تصویر. |
| `url` | string(512) | آدرس عمومی یا مسیر تصویر. |
| `order` | integer | ترتیب نمایش در گالری. |
| `created_at` | timestamp | زمان آپلود/اتصال تصویر. |

## `time_slots`

سانس‌های قابل رزرو مجموعه‌ها را نگهداری می‌کند.

رابطه‌های مهم:

- به `vendors` تعلق دارد.
- می‌تواند یک `booking` داشته باشد.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `vendor_id` | FK `vendors.id`, indexed | مجموعه‌ای که این سانس به آن تعلق دارد. |
| `start_time` | timestamp, indexed | زمان شروع سانس. |
| `end_time` | timestamp | زمان پایان سانس. |
| `base_price` | numeric(10,2) | قیمت سانس بدون گزینه‌های اختیاری. |
| `ball_price` | numeric(10,2) | قیمت اختیاری اجاره توپ. |
| `ball_available` | boolean | مشخص می‌کند اجاره توپ قابل انتخاب است یا نه. |
| `gender` | enum | دسته‌بندی جنسیت سانس: `male` یا `female`. |
| `status` | enum, indexed | وضعیت عملیاتی رزرو. |
| `is_reserved` | boolean | پرچم سریع رزرو که در نمای رزرو/زمان‌بندی استفاده می‌شود. |
| `version` | integer | نسخه optimistic concurrency برای جریان رزرو. |

قیود:

- یکتای `vendor_id`, `start_time`, `end_time`

## `bookings`

رزروهای ثبت‌شده توسط کاربران یا مدیران را نگهداری می‌کند.

رابطه‌های مهم:

- از طریق `user_id` به `users` تعلق دارد.
- از طریق `slot_id` به `time_slots` تعلق دارد.
- می‌تواند از طریق `replaces_booking_id` به یک رزرو دیگر اشاره کند.
- چندین `payments`, `penalties`, `refunds` دارد و یک `review` می‌تواند داشته باشد.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `user_id` | FK `users.id`, indexed | کاربر مشتری. برای رزروهای دستی ساخته‌شده توسط مدیر، بسته به جریان سرویس می‌تواند بیانگر زمینه مدیر/مشتری باشد. |
| `slot_id` | FK `time_slots.id`, indexed | سانس رزروشده. |
| `replaces_booking_id` | FK `bookings.id`, nullable, indexed | رزرو قبلی که با این رزرو جایگزین شده است. |
| `status` | enum, indexed | وضعیت چرخه عمر رزرو. |
| `source` | enum, indexed | نحوه ساخت رزرو: آنلاین/دستی/تکرارشونده. |
| `settlement_status` | enum, indexed | وضعیت تسویه مدیر در جریان‌های مالی. |
| `created_by_manager_id` | FK `users.id`, nullable, indexed | مدیری که رزرو دستی/تکرارشونده را ساخته است. |
| `customer_full_name` | string(128), nullable | نام مشتری برای رزروهای ساخته‌شده توسط مدیر. |
| `customer_phone` | string(16), nullable, indexed | شماره مشتری برای رزروهای ساخته‌شده توسط مدیر. |
| `price_paid` | numeric(10,2) | مبلغ کل قابل پرداخت/پرداخت‌شده برای رزرو. |
| `slot_price` | numeric(10,2), nullable | سهم قیمت سانس. |
| `ball_price` | numeric(10,2) | سهم قیمت اجاره توپ. |
| `with_ball` | boolean | مشخص می‌کند مشتری اجاره توپ را انتخاب کرده است یا نه. |
| `penalty_amount` | numeric(10,2), nullable | جریمه لغو اعمال‌شده روی این رزرو. |
| `participants_count` | smallint | تعداد شرکت‌کنندگان رزرو. |
| `created_at` | timestamp, indexed | زمان ساخت. |
| `updated_at` | timestamp | زمان آخرین به‌روزرسانی. |
| `expires_at` | timestamp, nullable | زمان انقضای نگه‌داشت پرداخت برای رزروهای در انتظار پرداخت. |

## `payments`

تلاش‌ها و رکوردهای پرداخت مربوط به رزروها را نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `booking_id` | FK `bookings.id`, indexed | رزروی که پرداخت برای آن انجام می‌شود. |
| `amount` | numeric(10,2) | مبلغ پرداخت. |
| `gateway_transaction_id` | string(256), nullable | شناسه تراکنش درگاه. |
| `gateway_name` | string(64), nullable | نام درگاه/ارائه‌دهنده پرداخت. |
| `card_number` | string(32), nullable | شماره کارت ماسک‌شده استفاده‌شده در پرداخت، در صورت وجود. |
| `ref_id` | string(64), nullable | شناسه مرجع درگاه. |
| `gateway_fee` | numeric(10,2), nullable | کارمزد/هزینه درگاه. |
| `paid_at` | timestamp, nullable | زمان تکمیل پرداخت موفق. |
| `status` | enum | وضعیت پرداخت. |
| `created_at` | timestamp | زمان ساخت رکورد. |

## `refunds`

رکوردهای بازگرداندن پول بعد از لغو توسط کاربر، لغو توسط مدیر یا جریان‌های جایگزینی را نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `booking_id` | FK `bookings.id`, indexed | رزروی که باعث ایجاد بازپرداخت شده است. |
| `user_id` | FK `users.id`, indexed | کاربری که بازپرداخت را دریافت می‌کند. |
| `vendor_id` | FK `vendors.id`, indexed | مجموعه مرتبط. |
| `slot_id` | FK `time_slots.id`, indexed | سانس مرتبط. |
| `slot_start_time` | timestamp | snapshot زمان شروع سانس هنگام ساخت بازپرداخت. |
| `slot_end_time` | timestamp | snapshot زمان پایان سانس هنگام ساخت بازپرداخت. |
| `original_amount` | numeric(10,2) | مبلغ اصلی رزرو قبل از جریمه‌ها. |
| `slot_price` | numeric(10,2), nullable | snapshot قیمت سانس. |
| `ball_price` | numeric(10,2) | snapshot قیمت اجاره توپ. |
| `total_paid` | numeric(10,2) | کل مبلغ پرداخت‌شده. |
| `penalty_amount` | numeric(10,2) | جریمه کسرشده از بازپرداخت. |
| `refund_amount` | numeric(10,2) | مبلغ قابل بازگشت به کاربر. |
| `reason` | text | دلیل قابل خواندن برای انسان. |
| `type` | enum, indexed | منبع/نوع بازپرداخت. |
| `status` | enum, indexed | وضعیت رسیدگی ادمین. |
| `penalty_charged_to_user` | boolean | مشخص می‌کند جریمه از مشتری دریافت شده است یا نه. |
| `site_bears_penalty` | boolean | مشخص می‌کند پلتفرم جریمه/هزینه را تقبل می‌کند یا نه. |
| `requested_at` | timestamp | زمان ساخت درخواست بازپرداخت. |
| `approved_at` | timestamp, nullable | زمان تایید ادمین. |
| `paid_at` | timestamp, nullable | زمان پرداخت واقعی بازپرداخت. |
| `admin_note` | text, nullable | یادداشت ادمین برای تیم مالی/تاریخچه. |
| `payment_tracking_code` | string(128), nullable | کد رهگیری بانکی/پرداخت. |

قیود:

- یکتای `booking_id`, `type`

## `penalties`

جریمه‌های لغوی را که از کاربران دریافت می‌شود نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `user_id` | FK `users.id`, indexed | کاربری که جریمه برای او ثبت شده است. |
| `booking_id` | FK `bookings.id`, indexed | رزروی که باعث ایجاد جریمه شده است. |
| `amount` | numeric(10,2) | مبلغ جریمه. |
| `reason` | string(128) | دلیل/دسته‌بندی. |
| `created_at` | timestamp | زمان ساخت. |

## `settlements`

درخواست‌های تسویه مدیر برای رزروهای آنلاین تکمیل‌شده را نگهداری می‌کند.

رابطه‌های مهم:

- از طریق `manager_id` به کاربر مدیر تعلق دارد.
- از طریق `vendor_id` به مجموعه تعلق دارد.
- چندین `settlement_items` دارد.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `manager_id` | FK `users.id`, indexed | مدیری که درخواست واریز/تسویه ثبت کرده است. |
| `vendor_id` | FK `vendors.id`, indexed | مجموعه‌ای که رزروهای آن تسویه می‌شوند. |
| `requested_amount` | numeric(10,2) | مبلغ درخواست‌شده توسط مدیر. |
| `approved_amount` | numeric(10,2), nullable | مبلغ تاییدشده توسط ادمین. |
| `bookings_count` | integer | تعداد رزروهای قرارگرفته در تسویه. |
| `period_from` | timestamp, nullable | فیلتر اختیاری شروع بازه. |
| `period_to` | timestamp, nullable | فیلتر اختیاری پایان بازه. |
| `status` | enum, indexed | وضعیت جریان تسویه. |
| `manager_note` | text, nullable | یادداشت مدیر. |
| `admin_note` | text, nullable | یادداشت ادمین. |
| `payment_tracking_code` | string(128), nullable | کد رهگیری بانکی/پرداخت بعد از پرداخت. |
| `requested_at` | timestamp | زمان ساخت درخواست. |
| `approved_at` | timestamp, nullable | زمان تایید ادمین. |
| `paid_at` | timestamp, nullable | زمان تکمیل پرداخت. |

## `settlement_items`

جدول واسطی است که مشخص می‌کند کدام رزروها در یک تسویه قرار گرفته‌اند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `settlement_id` | FK `settlements.id`, indexed | درخواست تسویه والد. |
| `booking_id` | FK `bookings.id`, unique, indexed | رزرو قرارگرفته در تسویه. هر رزرو فقط می‌تواند در یک آیتم تسویه باشد. |
| `amount` | numeric(10,2) | مبلغ این رزرو که در تسویه لحاظ شده است. |

قیود:

- یکتای `booking_id`

## `slot_cancellations`

لغوهای سمت مدیر برای سانس‌ها/رزروها و وضعیت بررسی عملیاتی آن‌ها را نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `slot_id` | FK `time_slots.id`, indexed | سانس لغوشده. |
| `booking_id` | FK `bookings.id`, nullable, indexed | رزرو تحت تاثیر، در صورت وجود. |
| `vendor_id` | FK `vendors.id`, indexed | مجموعه مالک سانس. |
| `manager_id` | FK `users.id`, indexed | مدیری که لغو را انجام داده است. |
| `affected_user_id` | FK `users.id`, nullable, indexed | مشتری تحت تاثیر لغو. |
| `affected_full_name` | string(128), nullable | snapshot نام مشتری تحت تاثیر. |
| `affected_phone` | string(16), nullable | snapshot شماره مشتری تحت تاثیر. |
| `reason` | text, nullable | دلیل مدیر. |
| `release_slot` | boolean | مشخص می‌کند سانس دوباره قابل رزرو شود یا نه. |
| `online_paid_amount` | numeric(10,2), nullable | مبلغ آنلاین پرداخت‌شده توسط کاربر تحت تاثیر. |
| `site_cost_amount` | numeric(10,2) | هزینه‌ای که پلتفرم/سایت تقبل می‌کند. |
| `sms_status` | string(32), nullable | وضعیت ارسال/بررسی SMS. |
| `notification_status` | string(32), nullable | وضعیت ارسال نوتیفیکیشن. |
| `review_status` | string(32) | وضعیت جریان بررسی ادمین. |
| `created_at` | timestamp | زمان ساخت. |

## `reviews`

نظرهای کاربران برای رزروهای تکمیل‌شده و پاسخ‌های مدیر را نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `user_id` | FK `users.id`, indexed | ثبت‌کننده نظر. |
| `vendor_id` | FK `vendors.id`, indexed | مجموعه‌ای که برای آن نظر ثبت شده است. |
| `booking_id` | FK `bookings.id`, unique | رزروی که برای آن نظر ثبت شده است. این قید باعث می‌شود برای هر رزرو فقط یک نظر ثبت شود. |
| `rating` | smallint | مقدار امتیاز. |
| `comment` | text, nullable | متن نظر کاربر. |
| `response` | text, nullable | پاسخ مدیر/مجموعه. |
| `is_reported` | boolean | مشخص می‌کند نظر برای مدیریت محتوا گزارش شده است یا نه. |
| `created_at` | timestamp | زمان ساخت. |

## `favorites`

مجموعه‌های مورد علاقه کاربران را نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `user_id` | FK `users.id`, indexed | کاربری که مجموعه را به علاقه‌مندی‌ها اضافه کرده است. |
| `vendor_id` | FK `vendors.id`, indexed | مجموعه مورد علاقه. |
| `created_at` | timestamp | زمان ساخت. |

قیود:

- یکتای `user_id`, `vendor_id`

## `notifications`

نوتیفیکیشن‌های داخل برنامه که به کاربران نمایش داده می‌شوند را نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `user_id` | FK `users.id`, indexed | دریافت‌کننده نوتیفیکیشن. |
| `type` | string(64) | دسته‌بندی نوتیفیکیشن. |
| `message` | text | متن پیام. |
| `is_read` | boolean | وضعیت خوانده‌شده/خوانده‌نشده. |
| `created_at` | timestamp | زمان ساخت. |

## `notification_deliveries`

تلاش‌های ارسال نوتیفیکیشن از طریق کانال‌هایی مثل SMS یا ارائه‌دهنده‌های آینده را نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `notification_id` | FK `notifications.id`, nullable, indexed | نوتیفیکیشن داخل برنامه مرتبط. |
| `user_id` | FK `users.id`, nullable, indexed | کاربر دریافت‌کننده. |
| `booking_id` | FK `bookings.id`, nullable, indexed | رزرو مرتبط، زمانی که ارسال به یک رزرو خاص مربوط است. |
| `channel` | string(32) | کانال ارسال، مثل SMS. |
| `phone_number` | string(16), nullable | شماره مقصد. |
| `status` | string(32) | وضعیت ارسال مثل pending/sent/failed. |
| `error_message` | text, nullable | دلیل خطا. |
| `attempts` | integer | تعداد تلاش‌های ارسال. |
| `sent_at` | timestamp, nullable | زمان ارسال موفق. |
| `created_at` | timestamp | زمان ساخت. |

## `wallets`

برای هر کاربر یک موجودی کیف پول نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `user_id` | FK `users.id`, unique | مالک کیف پول. |
| `balance` | numeric(10,2) | موجودی فعلی کیف پول. |
| `created_at` | timestamp | زمان ساخت. |
| `updated_at` | timestamp | زمان آخرین به‌روزرسانی موجودی. |

## `wallet_transactions`

ورودی‌های دفتر کل کیف پول را برای واریز، برداشت و بازپرداخت نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `wallet_id` | FK `wallets.id`, indexed | کیف پولی که تغییر می‌کند. |
| `amount` | numeric(10,2) | مبلغ تراکنش. |
| `type` | string(20) | نوع تراکنش، مثل `deposit`, `withdrawal`, `refund`. |
| `description` | text, nullable | توضیح قابل خواندن برای انسان. |
| `created_at` | timestamp | زمان ساخت. |

## `settings`

تنظیمات سیستمی را نگهداری می‌کند که ادمین می‌تواند آن‌ها را ویرایش کند یا endpointهای عمومی/احراز هویت‌شده می‌توانند آن‌ها را بخوانند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `key` | string(128), unique, indexed | کلید تنظیم، مثل `support_phone`, `rules_text`. |
| `value` | text | مقدار تنظیم. بعضی مقدارها رشته JSON هستند. |
| `description` | string(256), nullable | توضیح قابل نمایش برای ادمین. |
| `created_at` | timestamp | زمان ساخت. |
| `updated_at` | timestamp | زمان آخرین به‌روزرسانی. |

## `logs`

لاگ‌های audit، امنیتی و عملیاتی را نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `user_id` | FK `users.id`, nullable | کاربر مرتبط با اقدام، در صورت مشخص بودن. |
| `action` | string(128) | کلید قابل خواندن توسط ماشین برای اقدام. |
| `details` | text, nullable | جزئیات قابل خواندن برای انسان. |
| `severity` | string(16) | سطح اهمیت، با مقدار پیش‌فرض `INFO`. |
| `request_id` | string(64), nullable | شناسه correlation/request. |
| `ip_address` | string(45), nullable | IP مرتبط با اقدام. |
| `user_agent` | text, nullable | user-agent مرتبط با اقدام. |
| `created_at` | timestamp | زمان ثبت لاگ. |

## `contact_messages`

ارسال‌های فرم تماس عمومی را برای بررسی ادمین نگهداری می‌کند.

فیلدها:

| فیلد | نوع | کاربرد |
| --- | --- | --- |
| `id` | integer PK | شناسه اصلی. |
| `name` | string(256) | نام فرستنده. |
| `email` | string(256), nullable | ایمیل فرستنده. |
| `phone` | string(32) | شماره تماس فرستنده. |
| `subject` | string(512) | موضوع پیام. |
| `message` | text | متن پیام. |
| `created_at` | timestamp | زمان ارسال. |

from __future__ import annotations

from collections.abc import Mapping

from fastapi import FastAPI


OperationKey = tuple[str, str]


OPERATION_DESCRIPTIONS: Mapping[OperationKey, str] = {
    ("post", "/api/v1/auth/otp/send"): (
        "Sends a one-time password to the supplied phone number. In development "
        "or mock SMS mode the response includes `dev_code` so QA can complete "
        "OTP verification without reading an external SMS provider."
    ),
    ("post", "/api/v1/auth/otp/verify"): (
        "Verifies an OTP code for login, registration, or password reset. New "
        "phone numbers are registered when `full_name` is provided. On success "
        "the endpoint returns a fresh access token and stores the refresh token "
        "in an HTTP-only cookie."
    ),
    ("post", "/api/v1/auth/login/options"): (
        "Checks whether a phone number belongs to an existing account and "
        "whether that account has a password. Frontends use this to decide "
        "between registration, password login, and OTP flows."
    ),
    ("post", "/api/v1/auth/register"): (
        "Creates a password-based user account with phone number, password, and "
        "full name. The response contains an access token and the refresh token "
        "is persisted as a secure session cookie."
    ),
    ("post", "/api/v1/auth/login"): (
        "Authenticates an existing user with phone number and password. A new "
        "refresh-token session is created with device, IP, and user-agent "
        "metadata for session management."
    ),
    ("post", "/api/v1/auth/refresh"): (
        "Rotates a valid refresh token and returns a new access token. The "
        "refresh token can be supplied in the request body or the configured "
        "HTTP-only refresh cookie; invalid, revoked, or expired sessions return "
        "401."
    ),
    ("get", "/api/v1/auth/me"): (
        "Returns the authenticated user's profile, role, account state, avatar, "
        "and profile fields. Requires a valid bearer access token."
    ),
    ("patch", "/api/v1/auth/profile"): (
        "Updates editable profile fields such as full name, phone, password, and "
        "bank-card related user data. Password changes require a verified "
        "password-reset flow when that policy is active."
    ),
    ("post", "/api/v1/auth/avatar"): (
        "Uploads and replaces the authenticated user's avatar image. The file is "
        "validated for size and extension, the previous avatar file is removed, "
        "and an upload URL is returned."
    ),
    ("delete", "/api/v1/auth/avatar"): (
        "Deletes the authenticated user's current avatar URL and removes the "
        "stored upload file when possible. Returns 204 on success."
    ),
    ("get", "/api/v1/auth/sessions"): (
        "Lists active refresh-token sessions for the current user, including "
        "device and activity metadata used by the account security screen."
    ),
    ("delete", "/api/v1/auth/sessions/{session_id}"): (
        "Revokes one refresh-token session owned by the current user. Use this "
        "to sign out a specific device without affecting other sessions."
    ),
    ("delete", "/api/v1/auth/sessions"): (
        "Revokes every active session for the current user, clears the refresh "
        "cookie, and leaves the user logged out on all devices."
    ),
    ("post", "/api/v1/auth/logout"): (
        "Revokes the current refresh-token session, clears the refresh cookie, "
        "and returns a logout confirmation."
    ),
    ("get", "/api/v1/vendors"): (
        "Returns a paginated list of sports venues. Supports filtering by sport "
        "types, active status, date availability, price range, distance from a "
        "reference location, search text, and sort order."
    ),
    ("post", "/api/v1/vendors"): (
        "Creates a new vendor/venue for the authenticated manager. The vendor is "
        "stored with profile, location, sports, amenities, images, and scheduling "
        "metadata and is typically subject to admin approval."
    ),
    ("get", "/api/v1/vendors/{vendor_id}/reviews"): (
        "Returns paginated public reviews for one vendor, including reviewer and "
        "rating data needed on the vendor detail page."
    ),
    ("get", "/api/v1/vendors/{vendor_id}"): (
        "Returns full public details for a vendor, including sports, address, "
        "location, images, amenities, pricing metadata, rating, and manager-owned "
        "fields visible to the caller."
    ),
    ("patch", "/api/v1/vendors/{vendor_id}"): (
        "Updates a vendor owned by the current manager or accessible to an admin. "
        "Only submitted fields are changed; images and time slots are managed by "
        "their dedicated endpoints."
    ),
    ("delete", "/api/v1/vendors/{vendor_id}"): (
        "Deletes a vendor owned by the current manager. Related cache entries are "
        "invalidated and the endpoint returns 204 on success."
    ),
    ("post", "/api/v1/vendors/{vendor_id}/images"): (
        "Adds an already-uploaded image URL to a vendor's ordered image gallery. "
        "The caller must own the vendor or be an admin."
    ),
    ("delete", "/api/v1/vendors/{vendor_id}/images/{image_id}"): (
        "Removes one image from a vendor gallery and deletes the backing upload "
        "file when it is stored locally. The caller must own the vendor or be an "
        "admin."
    ),
    ("put", "/api/v1/vendors/{vendor_id}/images/reorder"): (
        "Reorders a vendor's image gallery. Send the image IDs in the desired "
        "display order; only images belonging to the vendor are updated."
    ),
    ("get", "/api/v1/vendors/{vendor_id}/slots"): (
        "Lists time slots for a vendor. Public users only receive bookable slots "
        "inside the public visibility window, while managers/admins can inspect "
        "a broader schedule."
    ),
    ("post", "/api/v1/vendors/{vendor_id}/slots"): (
        "Creates a single time slot for a manager-owned vendor, including start "
        "time, end time, base price, gender, and optional ball rental settings."
    ),
    ("post", "/api/v1/vendors/{vendor_id}/slots/generate"): (
        "Bulk-generates recurring time slots for a vendor from a template and "
        "date range. Existing conflict rules are enforced by the scheduling "
        "service."
    ),
    ("patch", "/api/v1/vendors/{vendor_id}/slots/{slot_id}"): (
        "Updates a specific time slot for a manager-owned vendor. Used for price, "
        "time, status, gender, and ball-rental changes."
    ),
    ("delete", "/api/v1/vendors/{vendor_id}/slots/{slot_id}"): (
        "Deletes a specific unneeded time slot for a manager-owned vendor. Slots "
        "with active reservations are protected by service-level validation."
    ),
    ("get", "/api/v1/slots/{slot_id}"): (
        "Returns detailed information for one slot, including vendor information, "
        "price, ball-rental options, reservation status, and timestamps used by "
        "the booking flow."
    ),
    ("get", "/api/v1/bookings"): (
        "Lists bookings owned by the authenticated user. Supports cursor/offset "
        "pagination and optional status filtering."
    ),
    ("post", "/api/v1/bookings"): (
        "Creates a pending online booking for an available future slot. The "
        "service enforces public booking-window limits, slot availability, "
        "participant count, and optional ball rental pricing."
    ),
    ("get", "/api/v1/bookings/completed"): (
        "Lists completed bookings for the authenticated user that are eligible "
        "for review or history display."
    ),
    ("get", "/api/v1/bookings/all"): (
        "Admin endpoint that lists all bookings across the platform. Supports "
        "pagination, search, status filters, and cache headers."
    ),
    ("get", "/api/v1/bookings/{booking_id}"): (
        "Returns one booking owned by the current user, including slot, vendor, "
        "payment, settlement, cancellation, and price details."
    ),
    ("post", "/api/v1/bookings/{booking_id}/pay"): (
        "Marks or initiates payment for a pending booking. On success the booking "
        "becomes confirmed and related admin booking/payment caches are cleared."
    ),
    ("post", "/api/v1/bookings/{booking_id}/cancel"): (
        "Cancels a user's booking after validating the cancellation policy. The "
        "response includes updated booking state and refund/penalty effects when "
        "applicable."
    ),
    ("get", "/api/v1/bookings/{booking_id}/cancellation-terms"): (
        "Previews cancellation eligibility before the user confirms cancellation. "
        "Returns the policy conditions, penalty amount, refund amount, and whether "
        "a verified bank card is required."
    ),
    ("get", "/api/v1/dashboard/stats"): (
        "Returns general dashboard counters for authenticated users, including "
        "platform activity metrics shared across roles."
    ),
    ("get", "/api/v1/dashboard/manager/revenue"): (
        "Returns a date-filterable revenue report for the current manager's "
        "vendors. Admins can also call this endpoint."
    ),
    ("get", "/api/v1/dashboard/admin-stats"): (
        "Returns admin-only platform statistics for an optional date range, such "
        "as users, vendors, bookings, payments, and operational totals."
    ),
    ("get", "/api/v1/dashboard/manager-stats"): (
        "Returns manager dashboard statistics for the current manager's vendors, "
        "bookings, slots, and revenue-related activity."
    ),
    ("get", "/api/v1/dashboard/admin/monthly-recap"): (
        "Returns admin monthly recap data used by the admin dashboard overview "
        "and charts."
    ),
    ("get", "/api/v1/dashboard/admin/charts"): (
        "Returns aggregated chart datasets for the admin dashboard. Data is "
        "cached because it is read-heavy and not transaction-critical."
    ),
    ("get", "/api/v1/dashboard/user-stats"): (
        "Returns user-specific dashboard statistics such as bookings, payments, "
        "reviews, penalties, and current activity."
    ),
    ("get", "/api/v1/reviews/recent"): (
        "Returns the newest public reviews for homepage and discovery sections. "
        "The `limit` query parameter is capped to keep the response lightweight."
    ),
    ("get", "/api/v1/reviews/my"): (
        "Lists reviews written by the authenticated user with pagination support."
    ),
    ("post", "/api/v1/reviews"): (
        "Creates a review for an eligible completed booking. The service validates "
        "ownership, duplicate reviews, rating bounds, and booking eligibility."
    ),
    ("post", "/api/v1/reviews/{review_id}/report"): (
        "Reports a review for moderation. The authenticated user must be allowed "
        "to interact with the review."
    ),
    ("post", "/api/v1/reviews/{review_id}/respond"): (
        "Adds or updates a manager response to a review for one of the manager's "
        "vendors."
    ),
    ("delete", "/api/v1/reviews/{review_id}"): (
        "Deletes a review when the current user has permission to remove it. "
        "Returns 204 on success."
    ),
    ("get", "/api/v1/settings/public/hero-slides"): (
        "Public endpoint that returns login/register hero slide configuration. "
        "The value is read from `login_hero_slides` and safely falls back to an "
        "empty list."
    ),
    ("get", "/api/v1/settings/public/contact"): (
        "Public endpoint that returns support contact settings such as phone, "
        "email, and messenger identifier."
    ),
    ("get", "/api/v1/settings/public/text/{key}"): (
        "Public endpoint for allowed text settings. Only `rules_text` and "
        "`privacy_text` are exposed without authentication."
    ),
    ("get", "/api/v1/settings/{key}"): (
        "Returns one system setting by key for authenticated users. Missing keys "
        "return 404."
    ),
    ("post", "/api/v1/uploads/vendor-image"): (
        "Uploads a temporary vendor image for a manager. The file is validated, "
        "stored under vendor uploads, and a temporary upload token plus absolute "
        "URL are returned."
    ),
    ("get", "/api/v1/users"): (
        "Admin endpoint that lists users with pagination, search, role filter, "
        "and active-status filter. Responses include cache headers."
    ),
    ("get", "/api/v1/users/{user_id}"): (
        "Admin endpoint that returns full details for one user, including role "
        "and administrative profile fields."
    ),
    ("patch", "/api/v1/users/{user_id}/role"): (
        "Admin endpoint that changes a user's role. The service protects invalid "
        "role transitions and logs the change."
    ),
    ("patch", "/api/v1/users/{user_id}/toggle-active"): (
        "Admin endpoint that toggles whether a user account is active. Disabled "
        "accounts cannot continue normal authenticated activity."
    ),
    ("get", "/api/v1/payments/my"): (
        "Lists payments belonging to the authenticated user, including booking, "
        "gateway, vendor, and slot context."
    ),
    ("get", "/api/v1/payments/all"): (
        "Admin endpoint that lists all payments with pagination, search, status "
        "filtering, and cache headers."
    ),
    ("post", "/api/v1/wallet/bank-cards/lookup"): (
        "Looks up and stores a bank-card candidate for the current user before "
        "confirmation. Used to verify the owner information needed for refunds."
    ),
    ("get", "/api/v1/wallet/bank-cards/verified"): (
        "Returns the current user's verified refund bank card, or null when no "
        "card has been confirmed."
    ),
    ("post", "/api/v1/wallet/bank-cards/{card_id}/confirm"): (
        "Confirms a previously looked-up bank card for the current user. This "
        "card is then used for refund and cancellation payout workflows."
    ),
    ("get", "/api/v1/wallet/balance"): (
        "Returns the authenticated user's wallet balance, creating the wallet "
        "record lazily if it does not already exist."
    ),
    ("post", "/api/v1/wallet/deposit"): (
        "Adds a positive amount to the user's wallet and records a deposit "
        "transaction with an optional description."
    ),
    ("post", "/api/v1/wallet/withdraw"): (
        "Deducts a positive amount from the user's wallet when sufficient balance "
        "exists and records a withdrawal transaction."
    ),
    ("get", "/api/v1/wallet/transactions"): (
        "Returns wallet transactions for the authenticated user using simple "
        "`limit` and `offset` pagination."
    ),
    ("get", "/api/v1/notifications"): (
        "Lists notifications for the authenticated user. Supports pagination, "
        "unread-only filtering, text search, and type filtering."
    ),
    ("get", "/api/v1/notifications/unread-count"): (
        "Returns the count of unread notifications for the authenticated user."
    ),
    ("post", "/api/v1/notifications/{notification_id}/read"): (
        "Marks one notification as read after verifying it belongs to the current "
        "user. Returns the updated notification."
    ),
    ("post", "/api/v1/notifications/read-all"): (
        "Marks all notifications for the current user as read and invalidates "
        "notification cache entries."
    ),
    ("get", "/api/v1/penalties"): (
        "Lists penalties assigned to the authenticated user with pagination. "
        "Penalties are typically produced by cancellation policy enforcement."
    ),
    ("post", "/api/v1/contact"): (
        "Public contact form endpoint. Stores a submitted name, email, phone, "
        "subject, and message for admin review; rate-limited to prevent abuse."
    ),
    ("get", "/api/v1/contact/admin"): (
        "Admin endpoint that lists contact messages newest first with offset "
        "pagination and cache headers."
    ),
    ("delete", "/api/v1/contact/admin/{message_id}"): (
        "Admin endpoint that deletes one contact message and invalidates the "
        "contact-message cache. Missing messages are treated as already deleted."
    ),
    ("get", "/api/v1/favorites"): (
        "Lists vendors favorited by the authenticated user with offset pagination."
    ),
    ("get", "/api/v1/favorites/check"): (
        "Checks favorite state for a comma-separated list of vendor IDs. The "
        "legacy `court_ids` query parameter is accepted as an alias."
    ),
    ("post", "/api/v1/favorites/{vendor_id}"): (
        "Adds one vendor to the authenticated user's favorites and returns the "
        "favorite record."
    ),
    ("delete", "/api/v1/favorites/{vendor_id}"): (
        "Removes one vendor from the authenticated user's favorites. Returns 204 "
        "on success."
    ),
    ("get", "/api/v1/manager/bookings"): (
        "Manager endpoint that lists bookings for the manager's vendors. Supports "
        "pagination, vendor filter, date range, status filter, and search over "
        "customer details."
    ),
    ("post", "/api/v1/manager/bookings/manual"): (
        "Creates a single manual booking for a manager-owned slot. This is used "
        "for offline reservations and does not require online payment."
    ),
    ("post", "/api/v1/manager/bookings/recurring"): (
        "Creates repeated long-term manual bookings over a date range for chosen "
        "weekdays and time window. `allow_partial` controls whether available "
        "slots should still be booked when some dates conflict."
    ),
    ("post", "/api/v1/manager/bookings/{booking_id}/cancel"): (
        "Cancels a booking that belongs to one of the manager's vendors. The "
        "request can release the slot back to the schedule and stores the "
        "manager's reason plus notification/SMS review state."
    ),
    ("get", "/api/v1/manager/finance/summary"): (
        "Returns manager finance totals for optional vendor and date filters. "
        "Includes successful online revenue, settled amounts, settlement-request "
        "amounts, eligible completed bookings, and bookings whose slot time has "
        "not arrived yet."
    ),
    ("post", "/api/v1/manager/settlements"): (
        "Creates a settlement request for eligible online bookings of a vendor. "
        "Only confirmed, paid, not-settled bookings whose slot end time has "
        "passed are included."
    ),
    ("get", "/api/v1/manager/settlements"): (
        "Lists settlement requests submitted by the current manager, including "
        "vendor, amount, booking count, status, notes, and payment tracking data."
    ),
    ("get", "/api/v1/manager/slots"): (
        "Lists slots for the manager's vendors with pagination and filters for "
        "vendor, reservation state, and date range. Booking and customer context "
        "is included when a slot is reserved."
    ),
    ("post", "/api/v1/admin/notifications/broadcast"): (
        "Admin endpoint that creates a notification for every user. The response "
        "returns how many user notifications were created."
    ),
    ("get", "/api/v1/admin/logs"): (
        "Admin endpoint that lists audit logs with cursor/offset pagination and "
        "filters for action, user, and date range."
    ),
    ("delete", "/api/v1/admin/logs/clear"): (
        "Admin endpoint that clears all audit logs only when the environment "
        "explicitly allows audit-log deletion. The attempt is logged before the "
        "guard is evaluated."
    ),
    ("delete", "/api/v1/admin/logs/{log_id}"): (
        "Admin endpoint that deletes one audit-log entry only in environments "
        "where audit-log deletion is enabled. The deletion attempt is itself "
        "recorded."
    ),
    ("get", "/api/v1/admin/pending-vendors"): (
        "Admin endpoint that lists inactive vendors waiting for approval, "
        "including manager name, sport types, address, capacity, and creation "
        "time."
    ),
    ("post", "/api/v1/admin/vendors/{vendor_id}/approve"): (
        "Admin endpoint that approves a pending vendor by activating it, "
        "invalidates vendor caches, and writes an audit log entry."
    ),
    ("post", "/api/v1/admin/vendors/{vendor_id}/reject"): (
        "Admin endpoint that rejects a pending vendor by deleting it and its "
        "stored images, then invalidates pending-vendor and vendor caches."
    ),
    ("delete", "/api/v1/admin/vendors/{vendor_id}"): (
        "Admin endpoint that permanently deletes a vendor and its gallery files. "
        "Use only when the venue should be removed from the platform."
    ),
    ("delete", "/api/v1/admin/users/{user_id}"): (
        "Admin endpoint that deletes a user only when dependency checks pass. It "
        "rejects deletion if the user owns vendors or has bookings, reviews, or "
        "penalties that must be handled first."
    ),
    ("delete", "/api/v1/admin/users/{user_id}/force"): (
        "Admin endpoint that force-deletes a user and related records in a "
        "foreign-key-safe order, including owned vendors, slots, bookings, "
        "payments, penalties, reviews, and uploaded files."
    ),
    ("delete", "/api/v1/admin/reviews/{review_id}"): (
        "Admin endpoint that permanently deletes a review regardless of the "
        "regular user/manager ownership rules."
    ),
    ("get", "/api/v1/admin/settings"): (
        "Admin endpoint that lists all system settings ordered by key. Responses "
        "are cached and include an `X-Cache` header."
    ),
    ("put", "/api/v1/admin/settings/{setting_id}"): (
        "Admin endpoint that updates a system setting value, invalidates settings "
        "cache, and writes an audit log with the old and new value."
    ),
    ("post", "/api/v1/admin/settings/seed"): (
        "Admin endpoint that inserts missing default settings such as platform "
        "name, support contact, commission, cancellation policy, rules, privacy, "
        "and login hero slides."
    ),
    ("get", "/api/v1/admin/refunds"): (
        "Admin endpoint that lists refund records with optional status and type "
        "filters. Each item includes user, vendor, slot, amount, penalty, and "
        "payment tracking fields."
    ),
    ("patch", "/api/v1/admin/refunds/{refund_id}"): (
        "Admin endpoint that updates refund status, admin note, and payment "
        "tracking code. Approval and paid timestamps are set automatically when "
        "the corresponding statuses are applied."
    ),
    ("get", "/api/v1/admin/manager-cancellations"): (
        "Admin endpoint that lists slots cancelled by managers, including "
        "affected customer, vendor, manager, reason, release-slot flag, costs, "
        "and notification/SMS review state."
    ),
    ("get", "/api/v1/admin/settlements"): (
        "Admin endpoint that lists all manager settlement requests across the "
        "platform with vendor, manager, amount, booking count, status, notes, and "
        "tracking information."
    ),
    ("patch", "/api/v1/admin/settlements/{settlement_id}"): (
        "Admin endpoint that changes a settlement request status, approved "
        "amount, admin note, and payment tracking code. Booking settlement states "
        "are updated to match approval, payment, or rejection."
    ),
    ("post", "/api/v1/admin/hero-images/upload"): (
        "Admin endpoint that uploads an auth-page hero image into the frontend "
        "public uploads directory and appends the URL to the `login_hero_slides` "
        "setting."
    ),
    ("delete", "/api/v1/admin/settings/{setting_id}/hero-images/{index}"): (
        "Admin endpoint that removes a hero image URL from a setting by list "
        "index and deletes the corresponding local file when possible."
    ),
    ("post", "/api/v1/admin/seed-admin"): (
        "Bootstrap endpoint that creates the first admin user only when bootstrap "
        "mode and the `X-Bootstrap-Secret` header are configured. It is disabled "
        "after an admin exists."
    ),
    ("post", "/api/v1/admin/users/{user_id}/revoke-sessions"): (
        "Admin endpoint that revokes all refresh-token sessions for a target user "
        "and bumps the user's token version so existing access tokens stop being "
        "valid on the next protected request."
    ),
    ("get", "/health"): (
        "Returns service health information for the API and backing dependencies. "
        "This endpoint is intended for uptime checks and deployment probes."
    ),
}


def install_openapi_docs(app: FastAPI) -> None:
    """Inject detailed operation descriptions into the generated OpenAPI schema."""

    original_openapi = app.openapi

    def custom_openapi() -> dict:
        schema = original_openapi()
        for path, methods in schema.get("paths", {}).items():
            for method, operation in methods.items():
                description = OPERATION_DESCRIPTIONS.get((method.lower(), path))
                if description:
                    operation["description"] = description
        return schema

    app.openapi = custom_openapi  # type: ignore[method-assign]

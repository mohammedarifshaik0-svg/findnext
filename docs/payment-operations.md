# FindNext private payment operations

This is the temporary payment flow until FindNext uses a registered business payment provider.

1. A signed-in user chooses LIVE, FLEX, or CARE in **Plans & referrals**. FindNext validates the price in the database, stores the request, and automatically emails the user a branded confirmation.
2. An allowlisted owner signs into FindNext and opens `/admin/billing`. This route is not linked from the public app and returns a not-found page to every non-admin account.
3. For a new request, select **Send payment instructions**. FindNext emails the exact plan, confirmed amount, private UPI destination, request ID, and payment-safety guidance. The personal UPI ID is never rendered in the public app or committed to GitHub.
4. After the payment appears in the owner's own payment app and the amount/reference are verified, select **Payment verified — issue code** and confirm the warning.
5. FindNext creates an account-bound activation code, stores only its SHA-256 hash, and automatically emails the readable code to the request's account address. A request can receive only one code. Codes expire after 14 days and can be redeemed only once.
6. The user enters the code in **Plans & referrals → Activate after payment**. Redemption activates the correct 28-day or annual plan. A qualifying referrer receives 30 extra live days automatically.

If activation-email delivery fails after code creation, the private dashboard displays the recovery code once. Copy it immediately and send it only to the email address on that request. It cannot be retrieved from the database later.

Never approve payment from a screenshot alone. Never paste payment credentials, service-role keys, personal UPI IDs, or activation codes into GitHub or chat.

## Required server-only settings

- `SUPABASE_SERVICE_ROLE_KEY`: used by the protected operations routes. Never prefix it with `NEXT_PUBLIC_`.
- `FINDNEXT_ADMIN_EMAILS`: comma-separated lowercase email addresses allowed to open the private dashboard.
- `RESEND_API_KEY`: sends request, instruction, and activation emails.
- `FINDNEXT_FROM_EMAIL`: defaults to `FindNext <findnext@ignyxx.in>` after domain verification.
- `FINDNEXT_UPI_ID`: private payment destination inserted only into the instruction email.
- `FINDNEXT_ADMIN_SECRET`: optional break-glass bearer token for API-only operations; the web dashboard does not expose or require it.

## Deployment note

After changing any server-only setting, create a fresh production deployment. Existing deployments keep the environment snapshot they were built with.

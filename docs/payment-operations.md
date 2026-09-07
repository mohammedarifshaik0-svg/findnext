# FindNext manual payment operations

This is the temporary payment flow until FindNext uses a registered business payment provider.

1. A signed-in user chooses a plan in **Plans & referrals**. FindNext stores a price-validated `plan_requests` row and opens an email addressed to `findnext@ignyxx.in`.
2. If Resend is configured, the user immediately receives the branded request-received email. Support calls the protected `/api/billing/send-instructions` endpoint with the request ID. It sends the confirmed amount, billing period, private UPI destination and safety warning; without Resend it returns a ready-to-send reply draft. Do not publish a personal UPI ID in the app or repository.
3. After payment is independently verified, find the request ID from the email or the `plan_requests` table.
4. Preferred: call the protected `/api/billing/issue-code` endpoint with the request ID, `paymentVerified: true`, and the `FINDNEXT_ADMIN_SECRET` bearer token. It issues the code and sends the branded activation email when Resend is configured.

   If email delivery is not configured, the endpoint returns an email draft to the authorized operator. As a break-glass fallback, issue the code in the protected Supabase SQL editor:

   ```sql
   select private.issue_activation_code('REQUEST_UUID_HERE');
   ```

5. Email the returned code to the same account address shown on the request. The code is bound to that user, expires after 14 days, and cannot be issued twice for the same request. The database stores only its SHA-256 hash plus delivery status, never the readable code.
6. The user enters it in **Plans & referrals → Activate after payment**. Redemption activates the correct 28-day or annual plan. A qualifying referrer receives 30 extra live days automatically.

Never paste payment credentials, service-role keys, or activation codes into GitHub. The database stores only activation-code hashes.

## Required server-only settings

- `SUPABASE_SERVICE_ROLE_KEY`: used only by the protected code issuer.
- `FINDNEXT_ADMIN_SECRET`: a long random bearer secret for the code issuer.
- `RESEND_API_KEY`: enables the request confirmation and activation emails.
- `FINDNEXT_FROM_EMAIL`: defaults to `FindNext <findnext@ignyxx.in>` after the domain is verified in Resend.
- `FINDNEXT_UPI_ID`: server-only payment destination inserted into the instructions email, never shown on the public site.

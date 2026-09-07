# FindNext manual payment operations

This is the temporary payment flow until FindNext uses a registered business payment provider.

1. A signed-in user chooses a plan in **Plans & referrals**. FindNext stores a price-validated `plan_requests` row and opens an email addressed to `findnext@ignyxx.in`.
2. Support replies with the payment instructions. Do not publish a personal UPI ID in the app or repository.
3. After payment is independently verified, find the request ID from the email or the `plan_requests` table.
4. In the protected Supabase SQL editor, issue the single-use code:

   ```sql
   select private.issue_activation_code('REQUEST_UUID_HERE');
   ```

5. Email the returned code to the same account address shown on the request. The code is bound to that user, expires after 14 days, and cannot be issued twice for the same request.
6. The user enters it in **Plans & referrals → Activate after payment**. Redemption activates the correct 28-day or annual plan. A qualifying referrer receives 30 extra live days automatically.

Never paste payment credentials, service-role keys, or activation codes into GitHub. The database stores only activation-code hashes.

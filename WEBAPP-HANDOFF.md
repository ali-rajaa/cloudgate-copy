# CloudGate web app: what the new website flow needs

For whoever maintains the web app at **my.cloudgate-app.com**. The website
(this repository) now sends visitors into the web app with what they chose.
The website side is built; the parts below happen in the web app and need
building there.

**The flow:** Website → Pricing → Select plan → Log in / Sign up → Payment
or billing details → Dashboard.

**Drawings of the screens:** https://cloud.fixmypcperth.com/prototype/
(source: `prototype/index.html`) shows the trial billing step, the Plus
payment step, the dashboard (free and on a trial) and the upgrade popup,
with the wording each one needs. They are drawings only: nothing there
signs in or takes payment.

## 1. Links the website sends (read these on arrival)

Every Log in, Get started and plan button opens a popup on the website
(Continue with Google, Continue with Apple, or an email address). Each
choice sends the visitor to the web app's root with these parameters:

| Parameter | Values | Meaning |
|---|---|---|
| `mode` | `login`, `signup` | Which the visitor clicked |
| `provider` | `google`, `apple`, `email` | Start that sign-in straight away (Google or Apple popup; email form) |
| `email` | an address | Prefill the email field (only with `provider=email`) |
| `plan` | `plus`, `pro`, `family` | The plan chosen on the pricing page (absent = free 100GB) |
| `billing` | `monthly`, `yearly` | The billing cycle chosen |
| `trial` | `3` | A 3-day free trial was chosen (only ever with `pro` or `family`) |
| `source` | `website` | Came from the website |

Examples:

```
https://my.cloudgate-app.com/?mode=signup&provider=google&plan=pro&billing=yearly&trial=3&source=website
https://my.cloudgate-app.com/?mode=signup&provider=email&email=name%40example.com&plan=plus&billing=monthly&source=website
https://my.cloudgate-app.com/?mode=login&provider=apple&source=website
```

**Today** the web app ignores these and shows its normal sign-in page, so
nothing breaks; visitors just have to pick their plan again in Premium.

**Needed:** keep the parameters through sign-in (store them before the
Google/Apple popup or email step), then:

- no `plan`: go to the dashboard (free 100GB account);
- `plan` without `trial`: go straight to payment for that plan and cycle;
- `plan` with `trial=3`: go to billing setup for that plan's 3-day trial.

## 2. Plans and trials

| Plan | Storage | Trial | Website button |
|---|---|---|---|
| Plus | 250GB | none | **Continue** (pay now) |
| Pro | 500GB | 3 days | **Try free for 3 days** (or "buy now") |
| Family | 1TB | 3 days | **Try free for 3 days** (or "buy now") |

The free 100GB plan is not a pricing card; it is what every account gets.

- **Plus:** take payment straight away, then activate the plan once the
  payment is verified.
- **Pro and Family trial:** collect billing details (a saved payment
  method) **before** the trial starts; start the trial only once they are
  saved; then continue to the dashboard. With Stripe Checkout this is
  `mode: subscription` with `subscription_data.trial_period_days: 3` and
  `payment_method_collection: always`.
- Activate paid plans only after a verified payment (Stripe webhook
  `invoice.paid` / `checkout.session.completed`), and trials only after
  billing setup succeeds. Never on the redirect alone.
- The web app already uses Stripe and has `checkout/success` and
  `checkout/cancel` routes; `checkout/cancel` should send the visitor back
  to the plan they chose.

## 3. What must be shown before they confirm (and on the receipt)

The website shows all of this on the pricing page and in the popup. The
checkout and billing step in the web app must show it again:

- the **trial length** (3 days) and the **date it ends**;
- the **subscription price** and **billing frequency** (monthly / yearly);
- that it **renews automatically** until cancelled;
- the **amount charged after the trial ends**, and when;
- how to **cancel** (and that cancelling before the trial ends means no
  charge).

## 4. Dashboard

- **Storage used** out of the plan's total (e.g. 37.2GB of 100GB), with a
  bar.
- **Current plan** (Free, Plus, Pro, Family), and for a trial: "Trial ends
  13 Nov 2026, then A$X/month".
- An **Upgrade** button (to Premium) on free and lower plans.

## 5. Upgrade popups ("special offers")

In-app popups offering a bigger plan, like Dropbox's: for example when
storage passes 80% or 95%, or when an upload would not fit. Each shows the
plan, its price and billing, and the same trial and renewal terms as above,
with one primary button. Do not show one more than once per session.

## 6. Tracking

The website sends these Google tag events (to the CloudGate Ads tag) when a
visitor acts on the website: `select_plan`, `select_billing`,
`sign_up_start`, `login_start`, `sign_up_continue`, `login_continue`,
`begin_trial`, `begin_checkout`, and `view_promotion` when the website's
one-off "Try Pro free for 3 days" offer is shown (a click on it sends
`select_plan` with `source: offer`). These are intentions, not results.

The results must be reported by the web app, after they really happen:

- **sign_up**: account created (with method);
- **trial_started**: billing set up and trial active (plan, cycle);
- **purchase**: payment verified (plan, cycle, value, currency, transaction
  id), including when a trial converts;
- **upgrade**: plan changed to a bigger one.

Send `purchase` from the success page or, better, server-side from the
Stripe webhook, with the Google Ads conversion labels the owner provides.

## 7. Prices

The website shows the web app's own Stripe prices in Australian dollars,
read from the web app's plan list (`getdetails`) on 13 Nov 2026 and picked
the way the web app picks them (the first price above zero in the
currency). They live in one list in `site/assets/js/auth.js`, `PLANS`.

| Plan | Stripe product | AUD | USD |
|---|---|---|---|
| Plus, monthly | `cg_plus_monthly` | A$6.96 | US$4.99 |
| Plus, yearly | `cg_plus_yearly` | A$41.84 | US$29.99 |
| Pro, monthly | `cg_pro_monthly` | A$9.75 | US$6.99 |
| Pro, yearly | `cg_pro_yearly` | A$55.80 | US$39.99 |
| Family, monthly | `cg_family_monthly` | A$13.94 | US$9.99 |
| Family, yearly | `cg_family_yearly` | A$97.66 | US$69.99 |

The product names match the website's link parameters:
`plan=pro&billing=yearly` → `cg_pro_yearly`, so the web app can open the
right checkout straight from the link.

- **If a price changes in Stripe**, change it in `PLANS` too (and the
  monthly figures in the pricing cards' HTML), or the website and the
  checkout will disagree.
- **Currency:** the web app charges each visitor in their local currency
  (by location, US dollars by default); the website shows Australian
  dollars. A visitor outside Australia sees A$ on the website and their
  own currency at checkout, which the checkout page must state clearly.
- Several products also hold A$0 / US$0 prices; the web app skips them.
  Make sure the trial checkout uses the paid price with
  `trial_period_days: 3`, not a $0 price.
- The `to_…` IDs the owner sent on 13 Nov are not price IDs (those start
  with `price_`); the web app doesn't need them, as it looks prices up by
  product name.

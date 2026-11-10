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

Prices are placeholders on the website until the owner confirms them (one
list in `site/assets/js/auth.js`, `PLANS`). Use the same figures in Stripe.

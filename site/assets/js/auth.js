/* CloudGate: sign-up and pricing flow (owner, 10 Nov 2026).
   Website -> Pricing -> plan -> Log in / Sign up -> payment -> dashboard.

   Prices: the prices of the web app's Stripe products cg_{plan}_{billing}
   in every currency it sells in, in Stripe's minor units (cents; yen as
   is), read from its plan list on 13 Nov 2026 and picked the way the web
   app picks them. Change them here when they change in Stripe. The pages'
   HTML carries the AUD monthly figures for the first paint.

   Which currency: each visitor sees the currency the web app will charge
   them, chosen by the web app's own rule: their country (get.geojs.io, as
   the web app uses) mapped to a currency, used if CloudGate sells in it,
   otherwise US dollars. The time zone gives a first guess at once, so
   prices rarely change after load; a currency picked on the pricing page
   wins over both. */
(function () {
  'use strict';

  var TRIAL_DAYS = 3;
  var PLANS = {
    plus:   { name: 'Plus',   storage: '250GB', trial: false },
    pro:    { name: 'Pro',    storage: '500GB', trial: true },
    family: { name: 'Family', storage: '1TB',   trial: true }
  };
  var PRICES = {
    plus: {
      monthly: { AUD: 696, USD: 499, CAD: 694, EUR: 431, GBP: 369, INR: 47622, PKR: 138497, AED: 1833, SAR: 1873, JPY: 799, CNY: 3357 },
      yearly: { AUD: 4184, USD: 2999, CAD: 4172, EUR: 2588, GBP: 2215, INR: 286208, PKR: 832372, AED: 11015, SAR: 11255, JPY: 4801, CNY: 20174 }
    },
    pro: {
      monthly: { AUD: 975, USD: 699, CAD: 973, EUR: 603, GBP: 516, INR: 66709, PKR: 194007, AED: 2567, SAR: 2623, JPY: 1119, CNY: 4702 },
      yearly: { AUD: 5580, USD: 3999, CAD: 5563, EUR: 3452, GBP: 2954, INR: 381643, PKR: 1109922, AED: 14688, SAR: 15008, JPY: 6401, CNY: 26900 }
    },
    family: {
      monthly: { AUD: 1394, USD: 999, CAD: 1390, EUR: 862, GBP: 738, INR: 95339, PKR: 277272, AED: 3669, SAR: 3749, JPY: 1599, CNY: 6720 },
      yearly: { AUD: 9766, USD: 6999, CAD: 9736, EUR: 6041, GBP: 5170, INR: 667946, PKR: 1942572, AED: 25707, SAR: 26267, JPY: 11204, CNY: 47081 }
    },
    /* Family 5TB (cg_family_monthly_5TB): monthly only, no yearly price. */
    family_5tb: {
      monthly: { AUD: 2092, USD: 1499, CAD: 2086, EUR: 1293, GBP: 1107, INR: 143056, PKR: 416047, AED: 5505, SAR: 5625, JPY: 2399, CNY: 10083 }
    }
  };
  /* The web app's tables (premium page): country -> currency, and the
     currencies Stripe counts without cents. */
  var COUNTRY_CURRENCY = { US: 'USD', GB: 'GBP', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR',
    CA: 'CAD', AU: 'AUD', IN: 'INR', PK: 'PKR', AE: 'AED', SA: 'SAR', JP: 'JPY', CN: 'CNY' };
  var ZERO_DECIMAL = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];
  var FALLBACK = 'USD';
  var CURRENCIES = Object.keys(PRICES.pro.monthly).sort();
  /* Time zone -> country, for the first guess before the lookup answers. */
  var TZ_COUNTRY = {
    'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Dublin': 'IE', 'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE',
    'Europe/Paris': 'FR', 'Europe/Madrid': 'ES', 'Africa/Ceuta': 'ES', 'Atlantic/Canary': 'ES', 'Europe/Rome': 'IT',
    'Europe/Amsterdam': 'NL', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dubai': 'AE',
    'Asia/Riyadh': 'SA', 'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN', 'Asia/Urumqi': 'CN', 'Asia/Chongqing': 'CN', 'PRC': 'CN',
    'America/Toronto': 'CA', 'America/Montreal': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
    'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA',
    'America/Moncton': 'CA', 'America/Whitehorse': 'CA', 'America/Yellowknife': 'CA', 'America/Iqaluit': 'CA',
    'America/Glace_Bay': 'CA', 'America/Goose_Bay': 'CA', 'America/Swift_Current': 'CA', 'America/Dawson_Creek': 'CA',
    'America/Fort_Nelson': 'CA', 'America/Inuvik': 'CA', 'America/Dawson': 'CA', 'America/Creston': 'CA',
    'America/Atikokan': 'CA', 'America/Rankin_Inlet': 'CA', 'America/Resolute': 'CA', 'America/Cambridge_Bay': 'CA'
  };

  /* The web app (my.cloudgate-app.com) signs people in and takes payment.
     These parameters tell it what the visitor chose (WEBAPP-HANDOFF.md):
     mode (login | signup), provider (google | apple | email), email,
     plan (plus | pro | family), billing (monthly | yearly), trial (3),
     currency (e.g. AUD), source=website. Until the web app reads them, it
     opens its normal sign-in page, so every link still works. */
  var WEBAPP = 'https://my.cloudgate-app.com/';

  var doc = document;
  var billing = 'monthly';
  try { if (sessionStorage.getItem('cg-billing') === 'yearly') billing = 'yearly'; } catch (e) {}

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  /* ---------- Currency ---------- */
  function forCountry(cc) {
    var c = cc && COUNTRY_CURRENCY[String(cc).toUpperCase()];
    return c && CURRENCIES.indexOf(c) !== -1 ? c : FALLBACK;
  }
  function tzCountry() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.indexOf('Australia/') === 0) return 'AU';
      return TZ_COUNTRY[tz] || null;
    } catch (e) { return null; }
  }
  var manual = null, country = null;
  try {
    var saved = localStorage.getItem('cg-currency');
    if (saved && CURRENCIES.indexOf(saved) !== -1) manual = saved;
    country = sessionStorage.getItem('cg-country');
  } catch (e) {}
  var currency = manual || forCountry(country || tzCountry());

  function decimals(cur) { return ZERO_DECIMAL.indexOf(cur) !== -1 ? 0 : 2; }
  function money(minor, cur) {
    var d = decimals(cur);
    var major = minor / Math.pow(10, d);
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: cur, minimumFractionDigits: d, maximumFractionDigits: d }).format(major);
    } catch (e) { return cur + ' ' + major.toFixed(d); }
  }
  /* Family comes in 1TB and 5TB (pricing page). 5TB is monthly only, so
     on yearly billing Family is 1TB. Everywhere else Family is 1TB. */
  var familyPick = '5tb';
  function familySize() { return billing === 'yearly' ? '1tb' : familyPick; }
  function sizeFor(el) { return el && el.closest && el.closest('[data-family-card]') ? familySize() : '1tb'; }
  function storageOf(plan, size) { return plan === 'family' && size === '5tb' ? '5TB' : PLANS[plan].storage; }
  function amount(plan, cycle, size) {
    var key = plan === 'family' && size === '5tb' ? 'family_5tb' : plan;
    var p = PRICES[key] && PRICES[key][cycle];
    return p && typeof p[currency] === 'number' ? p[currency] : null;
  }
  function priceText(plan, cycle, size) {
    var a = amount(plan, cycle, size);
    return a == null ? null : money(a, currency);
  }
  /* For Google tag events: the price in whole units. */
  function value(plan, cycle, size) {
    var a = amount(plan, cycle, size);
    return a == null ? undefined : a / Math.pow(10, decimals(currency));
  }
  function perText(cycle) { return cycle === 'yearly' ? '/year' : '/month'; }
  function cycleWord(cycle) { return cycle === 'yearly' ? 'yearly' : 'monthly'; }
  function trialEnd() {
    var d = new Date(); d.setDate(d.getDate() + TRIAL_DAYS);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* What the visitor agrees to, in plain words: trial length, price,
     how often, that it renews, and what is charged after the trial. */
  function termsText(plan, cycle, withTrial, size) {
    var price = priceText(plan, cycle, size) || currency + ' [price]';
    var every = cycle === 'yearly' ? 'year' : 'month';
    if (withTrial) {
      return 'Free for ' + TRIAL_DAYS + ' days, then ' + price + ' per ' + every + ', billed ' + cycleWord(cycle) +
        '. Your payment details are needed to start the trial. Renews automatically until you cancel; ' +
        'cancel before the trial ends and you won’t be charged.';
    }
    return price + ' per ' + every + ', billed ' + cycleWord(cycle) + ' from today. Renews automatically until you cancel.';
  }

  function renderPrices() {
    doc.querySelectorAll('[data-price]').forEach(function (el) {
      var t = priceText(el.getAttribute('data-price'), billing, sizeFor(el));
      el.textContent = t || currency + ' –';
      el.classList.toggle('price-tbd', !t);
      if (!t) el.setAttribute('title', 'Price to come'); else el.removeAttribute('title');
    });
    doc.querySelectorAll('[data-per]').forEach(function (el) { el.textContent = perText(billing); });
    doc.querySelectorAll('[data-terms]').forEach(function (el) {
      var plan = el.getAttribute('data-terms');
      el.textContent = termsText(plan, billing, PLANS[plan].trial, sizeFor(el));
    });
    doc.querySelectorAll('[data-billed-in]').forEach(function (el) { el.textContent = 'Billed in ' + currency; });
    /* Pricing page: the Family card's size choice. */
    var fs = familySize();
    doc.querySelectorAll('[data-family-size]').forEach(function (b) {
      var on = b.getAttribute('data-family-size') === fs;
      var off = b.getAttribute('data-family-size') === '5tb' && billing === 'yearly';
      b.setAttribute('aria-pressed', String(on));
      b.disabled = off;
      var note = b.querySelector('[data-size-note]');
      if (note) note.textContent = off ? 'Monthly only' : note.getAttribute('data-size-note');
    });
    doc.querySelectorAll('[data-family-card]').forEach(function (card) {
      card.querySelectorAll('[data-storage]').forEach(function (el) { el.textContent = fs === '5tb' ? '5TB' : '1TB'; });
      card.querySelectorAll('[data-bar]').forEach(function (el) { el.style.width = fs === '5tb' ? '100%' : '20%'; });
      card.querySelectorAll('[data-5tb-only]').forEach(function (el) { el.hidden = fs !== '5tb'; });
    });
    doc.querySelectorAll('[data-bill-label]').forEach(function (el) {
      el.textContent = billing === 'yearly' ? 'Billed yearly' : 'Billed monthly';
    });
    doc.querySelectorAll('[data-auth="plan"]').forEach(function (a) {
      a.setAttribute('href', webappUrl({ mode: 'signup', plan: a.getAttribute('data-plan'), billing: billing, trial: a.hasAttribute('data-trial'), size: sizeFor(a) }));
    });
    doc.querySelectorAll('[data-currency]').forEach(function (sel) { sel.value = currency; });
    /* An open popup keeps its focus; only its prices and links change. */
    if (modal && !modal.hidden && state.plan) {
      modal.querySelector('[data-auth-plan]').innerHTML = planSummary(state.plan, state.trial, state.size);
      modal.querySelectorAll('[data-provider]').forEach(function (a) {
        a.setAttribute('href', webappUrl({ mode: state.mode, provider: a.getAttribute('data-provider'), plan: state.plan, billing: billing, trial: state.trial, size: state.size }));
      });
    }
    if (offer && !offer.hidden) {
      offer.querySelector('[data-offer-plan]').innerHTML = planSummary('pro', true);
      offer.querySelector('[data-offer-go]').setAttribute('href', webappUrl({ mode: 'signup', plan: 'pro', billing: billing, trial: true }));
    }
  }

  function setCurrency(c) {
    if (CURRENCIES.indexOf(c) === -1 || c === currency) return;
    currency = c;
    renderPrices();
  }

  /* Pricing page: a currency picker, like the web app's. */
  var names = null;
  try { names = new Intl.DisplayNames(['en'], { type: 'currency' }); } catch (e) {}
  doc.querySelectorAll('[data-currency-pick]').forEach(function (box) {
    box.innerHTML = '<label for="cur-pick">Pay in</label><select id="cur-pick" data-currency>' +
      CURRENCIES.map(function (c) {
        var n = names ? names.of(c) : '';
        return '<option value="' + c + '">' + c + (n && n !== c ? ' · ' + n : '') + '</option>';
      }).join('') + '</select>';
    box.hidden = false;
    box.querySelector('select').addEventListener('change', function (e) {
      manual = e.target.value;
      try { localStorage.setItem('cg-currency', manual); } catch (err) {}
      setCurrency(manual);
      track('select_currency', { currency: manual });
    });
  });

  doc.querySelectorAll('[data-family-size]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.disabled) return;
      familyPick = b.getAttribute('data-family-size');
      renderPrices();
      track('select_plan_size', { plan: 'family', size: familyPick });
    });
  });

  doc.querySelectorAll('[data-billing]').forEach(function (input) {
    if (input.value === billing) input.checked = true;
    input.addEventListener('change', function () {
      if (!input.checked) return;
      billing = input.value;
      try { sessionStorage.setItem('cg-billing', billing); } catch (e) {}
      renderPrices();
      track('select_billing', { billing: billing });
    });
  });
  var modal, offer, state = {};
  renderPrices();

  /* The visitor's country, as the web app finds it. Only on pages that
     show prices, once per visit, and never over a currency they picked. */
  if (!manual && !country && doc.querySelector('[data-price]') && window.fetch) {
    fetch('https://get.geojs.io/v1/ip/country.json', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var cc = d && d.country;
        if (!cc || !/^[A-Za-z]{2}$/.test(cc)) return;
        try { sessionStorage.setItem('cg-country', cc.toUpperCase()); } catch (e) {}
        if (!manual) setCurrency(forCountry(cc));
      })
      .catch(function () {});
  }

  function webappUrl(o) {
    var q = new URLSearchParams();
    q.set('mode', o.mode || 'signup');
    if (o.provider) q.set('provider', o.provider);
    if (o.email) q.set('email', o.email);
    if (o.plan) { q.set('plan', o.plan); q.set('billing', o.billing || billing); q.set('currency', currency); }
    if (o.plan === 'family' && o.size === '5tb') q.set('size', '5tb');
    if (o.plan && o.trial && PLANS[o.plan] && PLANS[o.plan].trial) q.set('trial', String(TRIAL_DAYS));
    q.set('source', 'website');
    return WEBAPP + '?' + q.toString();
  }

  /* ---------- The popup ---------- */
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_G = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.25c0-.8-.07-1.56-.2-2.3H12v4.35h5.9a5.05 5.05 0 0 1-2.2 3.3v2.75h3.55c2.08-1.92 3.25-4.74 3.25-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.75c-.98.66-2.24 1.05-3.73 1.05-2.87 0-5.3-1.94-6.17-4.55H2.17v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.83 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.17a11 11 0 0 0 0 9.86l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 11 11 0 0 0 2.17 7.07l3.66 2.84C6.7 7.32 9.13 5.38 12 5.38z"/></svg>';
  var ICON_A = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.34c-.03-2.5 2.04-3.7 2.13-3.76-1.17-1.71-2.98-1.94-3.62-1.97-1.54-.16-3.02.9-3.8.9-.79 0-1.99-.88-3.28-.86-1.68.03-3.24.98-4.1 2.48-1.76 3.05-.45 7.56 1.25 10.03.83 1.2 1.83 2.56 3.13 2.51 1.26-.05 1.73-.81 3.25-.81s1.94.81 3.28.79c1.36-.02 2.22-1.22 3.04-2.44.96-1.4 1.35-2.76 1.37-2.83-.03-.01-2.62-1.01-2.65-4.04z"/><path d="M14.56 5.02c.69-.83 1.16-1.99 1.03-3.14-1 .04-2.2.66-2.92 1.49-.64.73-1.2 1.92-1.05 3.04 1.12.09 2.25-.56 2.94-1.39z"/></svg>';

  var panel, lastFocus;

  function build() {
    modal = doc.createElement('div');
    modal.className = 'auth-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="auth-backdrop" data-auth-close></div>' +
      '<div class="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-sub" tabindex="-1">' +
        '<button class="auth-x" type="button" data-auth-close aria-label="Close">' + ICON_X + '</button>' +
        '<img class="auth-logo" src="/assets/img/cg-mark-128.webp" alt="" width="44" height="44">' +
        '<h2 class="auth-title" id="auth-title"></h2>' +
        '<p class="auth-sub" id="auth-sub"></p>' +
        '<div class="auth-plan" data-auth-plan hidden></div>' +
        '<div class="auth-btns">' +
          '<a class="auth-btn" data-provider="google" href="#">' + ICON_G + '<span>Continue with Google</span></a>' +
          '<a class="auth-btn" data-provider="apple" href="#">' + ICON_A + '<span>Continue with Apple</span></a>' +
        '</div>' +
        '<div class="auth-or">or</div>' +
        '<form class="auth-form" novalidate>' +
          '<label class="sr-only" for="auth-email">Email address</label>' +
          '<input id="auth-email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="Email address" required>' +
          '<button class="btn btn-primary" type="submit">Continue with email</button>' +
        '</form>' +
        '<p class="auth-switch" data-auth-switch></p>' +
        '<p class="auth-legal">By continuing you agree to the <a href="/terms-of-service">Terms</a> and <a href="/privacy-policy">Privacy Policy</a>.</p>' +
        '<p class="auth-apps">Prefer the app? <a href="https://play.google.com/store/apps/details?id=com.cloudgate.cloudstorage&amp;hl=en_AU" target="_blank" rel="noopener">Google Play</a> · <a href="https://apps.apple.com/us/app/cloudgate-cloud-storage-app/id6504859413" target="_blank" rel="noopener">App Store</a></p>' +
      '</div>';
    doc.body.appendChild(modal);
    panel = modal.querySelector('.auth-panel');

    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-auth-close]')) { close(); return; }
      var p = e.target.closest('[data-provider]');
      if (p) {
        track(state.mode === 'login' ? 'login_continue' : 'sign_up_continue', { method: p.getAttribute('data-provider'), plan: state.plan || 'free' });
        if (state.plan) track(state.trial ? 'begin_trial' : 'begin_checkout', { plan: state.plan, size: state.size, billing: billing, currency: currency, value: value(state.plan, billing, state.size) });
      }
      var sw = e.target.closest('[data-auth-mode]');
      if (sw) { e.preventDefault(); open({ mode: sw.getAttribute('data-auth-mode'), plan: state.plan, trial: state.trial, size: state.size }, true); }
    });

    modal.querySelector('.auth-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = modal.querySelector('#auth-email');
      var email = input.value.trim();
      if (!email || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      track(state.mode === 'login' ? 'login_continue' : 'sign_up_continue', { method: 'email', plan: state.plan || 'free' });
      if (state.plan) track(state.trial ? 'begin_trial' : 'begin_checkout', { plan: state.plan, size: state.size, billing: billing, currency: currency, value: value(state.plan, billing, state.size) });
      window.location.href = webappUrl({ mode: state.mode, provider: 'email', email: email, plan: state.plan, billing: billing, trial: state.trial, size: state.size });
    });

    doc.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(panel.querySelectorAll('a[href],button:not([disabled]),input'), function (x) { return x.offsetParent !== null; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === first || doc.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* The plan, what is due today and later, and the terms: trial length
     and end date, price and how often, auto-renewal, how to avoid a charge. */
  function planSummary(plan, withTrial, size) {
    var P = PLANS[plan];
    var price = priceText(plan, billing, size);
    var priceHtml = price ? price : '<span class="price-tbd">' + currency + ' –</span>';
    var per = perText(billing);
    var end = trialEnd();
    var rows = withTrial
      ? '<div><dt>Due today</dt><dd>' + money(0, currency) + '</dd></div>' +
        '<div><dt>From ' + end + '</dt><dd>' + priceHtml + per + '</dd></div>'
      : '<div><dt>Due today</dt><dd>' + priceHtml + '</dd></div>' +
        '<div><dt>Then</dt><dd>' + priceHtml + per + '</dd></div>';
    var tail = withTrial
      ? 'Free for ' + TRIAL_DAYS + ' days, then billed ' + cycleWord(billing) + '. Payment details are needed to start. ' +
        'Renews automatically until you cancel. Cancel before ' + end + ' and you won’t be charged.'
      : 'Billed ' + cycleWord(billing) + ' from today. Renews automatically until you cancel.';
    return '<div class="auth-plan-head"><span>CloudGate ' + P.name + ' · ' + storageOf(plan, size) + '</span>' +
           '<span>Billed ' + cycleWord(billing) + '</span></div>' +
           '<dl>' + rows + '</dl><p>' + tail + '</p>';
  }

  function open(o, keepFocus) {
    if (!modal) build();
    state = { mode: o.mode === 'login' ? 'login' : 'signup', plan: PLANS[o.plan] ? o.plan : null, trial: !!o.trial && !!(PLANS[o.plan] && PLANS[o.plan].trial) };
    state.size = state.plan === 'family' && o.size === '5tb' ? '5tb' : '1tb';
    var title = modal.querySelector('#auth-title');
    var sub = modal.querySelector('#auth-sub');
    var box = modal.querySelector('[data-auth-plan]');
    if (state.plan) {
      var P = PLANS[state.plan];
      var nm = P.name + (state.plan === 'family' && state.size === '5tb' ? ' 5TB' : '');
      title.textContent = state.trial ? 'Try ' + nm + ' free for ' + TRIAL_DAYS + ' days' : 'Get CloudGate ' + nm;
      sub.textContent = state.trial ? 'Log in or sign up to start.' : 'Log in or sign up, then pay.';
      box.innerHTML = planSummary(state.plan, state.trial, state.size);
      box.hidden = false;
    } else {
      title.textContent = state.mode === 'login' ? 'Log in to CloudGate' : 'Get CloudGate';
      sub.textContent = state.mode === 'login' ? 'Welcome back' : 'Sign up free and get 100GB of storage. No card needed.';
      box.hidden = true;
    }
    modal.classList.toggle('auth-modal--plan', !!state.plan);
    modal.querySelectorAll('[data-provider]').forEach(function (a) {
      a.setAttribute('href', webappUrl({ mode: state.mode, provider: a.getAttribute('data-provider'), plan: state.plan, billing: billing, trial: state.trial, size: state.size }));
    });
    modal.querySelector('[data-auth-switch]').innerHTML = state.mode === 'login'
      ? 'New to CloudGate? <button type="button" data-auth-mode="signup">Sign up</button>'
      : 'Already have an account? <button type="button" data-auth-mode="login">Log in</button>';
    if (!keepFocus) lastFocus = doc.activeElement;
    modal.hidden = false;
    doc.body.classList.add('auth-open');
    panel.focus();
  }

  function close() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    doc.body.classList.remove('auth-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* Every [data-auth] link opens the popup: Log in, Get started, plan
     buttons. Without JavaScript they still go straight to the web app. */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-auth]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    var kind = a.getAttribute('data-auth');
    var plan = a.getAttribute('data-plan');
    var trial = a.hasAttribute('data-trial');
    var size = plan === 'family' ? sizeFor(a) : undefined;
    if (kind === 'plan') track('select_plan', { plan: plan, size: size, billing: billing, trial: trial, currency: currency, value: value(plan, billing, size) });
    else track(kind === 'login' ? 'login_start' : 'sign_up_start', {});
    var menu = doc.querySelector('.menu-toggle[aria-expanded="true"]');
    if (menu) menu.click();
    open({ mode: kind === 'login' ? 'login' : 'signup', plan: plan, trial: trial, size: size });
  });

  /* ---------- Special offer: Pro free for 3 days ----------
     One offer, shown at most once per visitor (and never once they have
     opened the sign-in popup), only on pages with plan cards: after 40
     seconds there, or when a desktop pointer heads for the tabs. It shows
     the same terms as the plan cards. ?offer=show shows it straight away
     (for checking it). */
  var OFFER_KEY = 'cg-offer-seen';
  var offerLast, offerDone = false;
  function offerSeen() { try { return localStorage.getItem(OFFER_KEY) === '1'; } catch (e) { return true; } }
  function markOffer() { offerDone = true; try { localStorage.setItem(OFFER_KEY, '1'); } catch (e) {} }

  function buildOffer() {
    offer = doc.createElement('div');
    offer.className = 'auth-modal offer-modal';
    offer.hidden = true;
    offer.innerHTML =
      '<div class="auth-backdrop" data-offer-close></div>' +
      '<div class="auth-panel" role="dialog" aria-modal="true" aria-labelledby="offer-title" aria-describedby="offer-sub" tabindex="-1">' +
        '<button class="auth-x" type="button" data-offer-close aria-label="Close">' + ICON_X + '</button>' +
        '<img class="auth-logo" src="/assets/img/cg-mark-128.webp" alt="" width="44" height="44">' +
        '<h2 class="auth-title" id="offer-title">Try Pro free for ' + TRIAL_DAYS + ' days</h2>' +
        '<p class="auth-sub" id="offer-sub">' + PLANS.pro.storage + ' for your photos, videos and files: five times the free 100GB.</p>' +
        '<div class="auth-plan" data-offer-plan></div>' +
        '<div class="offer-actions">' +
          '<a class="btn btn-primary btn-lg" href="#" data-offer-go>Try free for ' + TRIAL_DAYS + ' days</a>' +
          '<button class="offer-no" type="button" data-offer-close>No thanks</button>' +
        '</div>' +
      '</div>';
    doc.body.appendChild(offer);
    offer.addEventListener('click', function (e) {
      if (e.target.closest('[data-offer-close]')) { closeOffer(true); return; }
      var go = e.target.closest('[data-offer-go]');
      if (go && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0)) {
        e.preventDefault();
        track('select_plan', { plan: 'pro', billing: billing, trial: true, source: 'offer', currency: currency, value: value('pro', billing) });
        closeOffer(false);
        open({ mode: 'signup', plan: 'pro', trial: true });
      }
    });
    doc.addEventListener('keydown', function (e) {
      if (offer.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeOffer(true); return; }
      if (e.key !== 'Tab') return;
      var f = offer.querySelectorAll('.auth-panel a[href],.auth-panel button');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === first || doc.activeElement === offer.querySelector('.auth-panel'))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function showOffer(force) {
    if (!force && (offerDone || offerSeen())) return;
    if (modal && !modal.hidden) return;
    if (doc.querySelector('.menu-toggle[aria-expanded="true"]')) return;
    if (!offer) buildOffer();
    markOffer();
    offer.querySelector('[data-offer-plan]').innerHTML = planSummary('pro', true);
    offer.querySelector('[data-offer-go]').setAttribute('href', webappUrl({ mode: 'signup', plan: 'pro', billing: billing, trial: true }));
    offerLast = doc.activeElement;
    offer.hidden = false;
    doc.body.classList.add('auth-open');
    offer.querySelector('.auth-panel').focus();
    track('view_promotion', { promotion_id: 'pro-trial', plan: 'pro' });
  }

  function closeOffer(returnFocus) {
    if (!offer || offer.hidden) return;
    offer.hidden = true;
    doc.body.classList.remove('auth-open');
    if (returnFocus && offerLast && offerLast.focus) offerLast.focus();
  }

  (function () {
    var force = false;
    try { force = new URLSearchParams(location.search).get('offer') === 'show'; } catch (e) {}
    if (force) { setTimeout(function () { showOffer(true); }, 300); return; }
    if (!doc.querySelector('[data-auth="plan"]') || offerSeen()) return;
    /* Opening the sign-in popup means they are already on their way. */
    doc.addEventListener('click', function (e) { if (e.target.closest('[data-auth]')) offerDone = true; });
    var started = Date.now();
    setTimeout(function () { if (!doc.hidden) showOffer(); }, 40000);
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      doc.addEventListener('mouseout', function (e) {
        if (!e.relatedTarget && e.clientY <= 0 && Date.now() - started > 8000) showOffer();
      });
    }
  })();

  /* /pricing?billing=yearly opens the page on yearly prices. */
  try {
    var qp = new URLSearchParams(location.search);
    if (qp.get('billing') === 'yearly' || qp.get('billing') === 'monthly') {
      billing = qp.get('billing');
      doc.querySelectorAll('[data-billing]').forEach(function (i) { i.checked = i.value === billing; });
      renderPrices();
    }
  } catch (e) {}
})();

/* CloudGate: sign-up and pricing flow (owner, 10 Nov 2026).
   Website -> Pricing -> plan -> Log in / Sign up -> payment -> dashboard.

   PRICES: the one place to set them, in Australian dollars. They are the
   AUD prices of the web app's Stripe products cg_{plan}_{billing} (read
   from its plan list on 13 Nov 2026), so the website shows what the web
   app charges. null would show an amber blank instead. The pages' HTML
   carries the monthly figures too, for the first paint; keep them equal. */
(function () {
  'use strict';

  var CURRENCY = 'A$';
  var TRIAL_DAYS = 3;
  var PLANS = {
    plus:   { name: 'Plus',   storage: '250GB', trial: false, monthly: '6.96',  yearly: '41.84' },
    pro:    { name: 'Pro',    storage: '500GB', trial: true,  monthly: '9.75',  yearly: '55.80' },
    family: { name: 'Family', storage: '1TB',   trial: true,  monthly: '13.94', yearly: '97.66' }
  };

  /* The web app (my.cloudgate-app.com) signs people in and takes payment.
     These parameters tell it what the visitor chose (WEBAPP-HANDOFF.md):
     mode (login | signup), provider (google | apple | email), email,
     plan (plus | pro | family), billing (monthly | yearly), trial (3),
     source=website. Until the web app reads them, it opens its normal
     sign-in page, so every link still works. */
  var WEBAPP = 'https://my.cloudgate-app.com/';

  var doc = document;
  var billing = 'monthly';
  try { if (sessionStorage.getItem('cg-billing') === 'yearly') billing = 'yearly'; } catch (e) {}

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  function priceText(plan, cycle) {
    var p = PLANS[plan][cycle];
    return p == null ? null : CURRENCY + p;
  }
  function perText(cycle) { return cycle === 'yearly' ? '/year' : '/month'; }
  function cycleWord(cycle) { return cycle === 'yearly' ? 'yearly' : 'monthly'; }
  function trialEnd() {
    var d = new Date(); d.setDate(d.getDate() + TRIAL_DAYS);
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* What the visitor agrees to, in plain words: trial length, price,
     how often, that it renews, and what is charged after the trial. */
  function termsText(plan, cycle, withTrial) {
    var price = priceText(plan, cycle) || CURRENCY + '[price]';
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
      var t = priceText(el.getAttribute('data-price'), billing);
      el.textContent = t || CURRENCY + ' –';
      el.classList.toggle('price-tbd', !t);
      if (!t) el.setAttribute('title', 'Price to come'); else el.removeAttribute('title');
    });
    doc.querySelectorAll('[data-per]').forEach(function (el) { el.textContent = perText(billing); });
    doc.querySelectorAll('[data-terms]').forEach(function (el) {
      var plan = el.getAttribute('data-terms');
      el.textContent = termsText(plan, billing, PLANS[plan].trial);
    });
    doc.querySelectorAll('[data-bill-label]').forEach(function (el) {
      el.textContent = billing === 'yearly' ? 'Billed yearly' : 'Billed monthly';
    });
    doc.querySelectorAll('[data-auth="plan"]').forEach(function (a) {
      a.setAttribute('href', webappUrl({ mode: 'signup', plan: a.getAttribute('data-plan'), billing: billing, trial: a.hasAttribute('data-trial') }));
    });
  }

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
  renderPrices();

  function webappUrl(o) {
    var q = new URLSearchParams();
    q.set('mode', o.mode || 'signup');
    if (o.provider) q.set('provider', o.provider);
    if (o.email) q.set('email', o.email);
    if (o.plan) { q.set('plan', o.plan); q.set('billing', o.billing || billing); }
    if (o.plan && o.trial && PLANS[o.plan] && PLANS[o.plan].trial) q.set('trial', String(TRIAL_DAYS));
    q.set('source', 'website');
    return WEBAPP + '?' + q.toString();
  }

  /* ---------- The popup ---------- */
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_G = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.25c0-.8-.07-1.56-.2-2.3H12v4.35h5.9a5.05 5.05 0 0 1-2.2 3.3v2.75h3.55c2.08-1.92 3.25-4.74 3.25-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.75c-.98.66-2.24 1.05-3.73 1.05-2.87 0-5.3-1.94-6.17-4.55H2.17v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.83 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.17a11 11 0 0 0 0 9.86l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 11 11 0 0 0 2.17 7.07l3.66 2.84C6.7 7.32 9.13 5.38 12 5.38z"/></svg>';
  var ICON_A = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.34c-.03-2.5 2.04-3.7 2.13-3.76-1.17-1.71-2.98-1.94-3.62-1.97-1.54-.16-3.02.9-3.8.9-.79 0-1.99-.88-3.28-.86-1.68.03-3.24.98-4.1 2.48-1.76 3.05-.45 7.56 1.25 10.03.83 1.2 1.83 2.56 3.13 2.51 1.26-.05 1.73-.81 3.25-.81s1.94.81 3.28.79c1.36-.02 2.22-1.22 3.04-2.44.96-1.4 1.35-2.76 1.37-2.83-.03-.01-2.62-1.01-2.65-4.04z"/><path d="M14.56 5.02c.69-.83 1.16-1.99 1.03-3.14-1 .04-2.2.66-2.92 1.49-.64.73-1.2 1.92-1.05 3.04 1.12.09 2.25-.56 2.94-1.39z"/></svg>';

  var modal, panel, lastFocus, state = {};

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
        if (state.plan) track(state.trial ? 'begin_trial' : 'begin_checkout', { plan: state.plan, billing: billing });
      }
      var sw = e.target.closest('[data-auth-mode]');
      if (sw) { e.preventDefault(); open({ mode: sw.getAttribute('data-auth-mode'), plan: state.plan, trial: state.trial }, true); }
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
      if (state.plan) track(state.trial ? 'begin_trial' : 'begin_checkout', { plan: state.plan, billing: billing });
      window.location.href = webappUrl({ mode: state.mode, provider: 'email', email: email, plan: state.plan, billing: billing, trial: state.trial });
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
  function planSummary(plan, withTrial) {
    var P = PLANS[plan];
    var price = priceText(plan, billing);
    var priceHtml = price ? price : '<span class="price-tbd">' + CURRENCY + ' –</span>';
    var per = perText(billing);
    var end = trialEnd();
    var rows = withTrial
      ? '<div><dt>Due today</dt><dd>' + CURRENCY + '0.00</dd></div>' +
        '<div><dt>From ' + end + '</dt><dd>' + priceHtml + per + '</dd></div>'
      : '<div><dt>Due today</dt><dd>' + priceHtml + '</dd></div>' +
        '<div><dt>Then</dt><dd>' + priceHtml + per + '</dd></div>';
    var tail = withTrial
      ? 'Free for ' + TRIAL_DAYS + ' days, then billed ' + cycleWord(billing) + '. Payment details are needed to start. ' +
        'Renews automatically until you cancel. Cancel before ' + end + ' and you won’t be charged.'
      : 'Billed ' + cycleWord(billing) + ' from today. Renews automatically until you cancel.';
    return '<div class="auth-plan-head"><span>CloudGate ' + P.name + ' · ' + P.storage + '</span>' +
           '<span>Billed ' + cycleWord(billing) + '</span></div>' +
           '<dl>' + rows + '</dl><p>' + tail + '</p>';
  }

  function open(o, keepFocus) {
    if (!modal) build();
    state = { mode: o.mode === 'login' ? 'login' : 'signup', plan: PLANS[o.plan] ? o.plan : null, trial: !!o.trial && !!(PLANS[o.plan] && PLANS[o.plan].trial) };
    var title = modal.querySelector('#auth-title');
    var sub = modal.querySelector('#auth-sub');
    var box = modal.querySelector('[data-auth-plan]');
    if (state.plan) {
      var P = PLANS[state.plan];
      title.textContent = state.trial ? 'Try ' + P.name + ' free for ' + TRIAL_DAYS + ' days' : 'Get CloudGate ' + P.name;
      sub.textContent = state.trial ? 'Log in or sign up to start.' : 'Log in or sign up, then pay.';
      box.innerHTML = planSummary(state.plan, state.trial);
      box.hidden = false;
    } else {
      title.textContent = state.mode === 'login' ? 'Log in to CloudGate' : 'Get CloudGate';
      sub.textContent = state.mode === 'login' ? 'Welcome back' : 'Sign up free and get 100GB of storage. No card needed.';
      box.hidden = true;
    }
    modal.classList.toggle('auth-modal--plan', !!state.plan);
    modal.querySelectorAll('[data-provider]').forEach(function (a) {
      a.setAttribute('href', webappUrl({ mode: state.mode, provider: a.getAttribute('data-provider'), plan: state.plan, billing: billing, trial: state.trial }));
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
    if (kind === 'plan') track('select_plan', { plan: plan, billing: billing, trial: trial });
    else track(kind === 'login' ? 'login_start' : 'sign_up_start', {});
    var menu = doc.querySelector('.menu-toggle[aria-expanded="true"]');
    if (menu) menu.click();
    open({ mode: kind === 'login' ? 'login' : 'signup', plan: plan, trial: trial });
  });

  /* ---------- Special offer: Pro free for 3 days ----------
     One offer, shown at most once per visitor (and never once they have
     opened the sign-in popup), only on pages with plan cards: after 40
     seconds there, or when a desktop pointer heads for the tabs. It shows
     the same terms as the plan cards. ?offer=show shows it straight away
     (for checking it). */
  var OFFER_KEY = 'cg-offer-seen';
  var offer, offerLast, offerDone = false;
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
        track('select_plan', { plan: 'pro', billing: billing, trial: true, source: 'offer' });
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

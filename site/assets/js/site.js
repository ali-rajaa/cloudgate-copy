/* CloudGate site.js: every shared behaviour in one deferred file.
   Nothing here is needed to read a page; each block no-ops when its
   elements are missing, and the no-JS state of every component is usable. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Header: firm up once content passes beneath ----------
     An IntersectionObserver on a 1px sentinel instead of a scroll listener. */
  var header = doc.getElementById('site-header');
  if (header && 'IntersectionObserver' in window) {
    var sentinel = doc.createElement('div');
    sentinel.className = 'scroll-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    doc.body.insertBefore(sentinel, doc.body.firstChild);
    new IntersectionObserver(function (e) {
      header.classList.toggle('scrolled', !e[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ---------- Primary button: the right first step for the device ----------
     On iPhone/iPad and Android the app is the better start, so buttons marked
     data-cta point at the matching store with a shorter label. Everywhere
     else (and without JavaScript) they keep opening the web app. */
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  if (isIOS || isAndroid) {
    doc.querySelectorAll('[data-cta]').forEach(function (a) {
      var url = isIOS ? a.getAttribute('data-ios') : a.getAttribute('data-android');
      if (!url) return;
      a.href = url;
      var label = a.querySelector('.cta-label');
      if (label && a.getAttribute('data-app-label')) label.textContent = a.getAttribute('data-app-label');
    });
  }

  /* ---------- Mobile menu ---------- */
  var toggle = doc.querySelector('.menu-toggle');
  var menu = doc.getElementById('mobile-menu');
  var backdrop = doc.getElementById('nav-backdrop');
  if (header && toggle && menu) {
    var setMenu = function (open, restoreFocus) {
      header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
      menu.style.setProperty('--menu-h', open ? menu.scrollHeight + 'px' : '0px');
      root.classList.toggle('menu-lock', open);
      if (backdrop) backdrop.hidden = !open;
      if (!open && restoreFocus) toggle.focus();
    };
    toggle.addEventListener('click', function () {
      setMenu(!header.classList.contains('menu-open'));
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    if (backdrop) backdrop.addEventListener('click', function () { setMenu(false); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && header.classList.contains('menu-open')) setMenu(false, true);
    });
    // the menu only exists below the desktop breakpoint
    window.matchMedia('(min-width: 1041px)').addEventListener('change', function (m) {
      if (m.matches) setMenu(false);
    });
  }

  /* ---------- Theme: follows the device, with a one-tap override ----------
     head.html applies a saved choice before first paint. A choice is only
     stored while it differs from the device setting, so picking the device's
     own mode goes back to following it: two states, no separate "Auto". */
  var darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
  var themeBtns = doc.querySelectorAll('[data-theme-toggle]');
  var themeMetas = doc.querySelectorAll('meta[name="theme-color"]');
  if (themeBtns.length) {
    var systemTheme = function () { return darkMQ.matches ? 'dark' : 'light'; };
    var currentTheme = function () { return root.getAttribute('data-theme') || systemTheme(); };
    var syncTheme = function () {
      var dark = currentTheme() === 'dark';
      var chosen = root.hasAttribute('data-theme');
      themeBtns.forEach(function (b) {
        if (b.getAttribute('role') === 'switch') b.setAttribute('aria-checked', dark ? 'true' : 'false');
        else b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      });
      // the browser bar: both tags carry the chosen colour, or their own defaults
      themeMetas.forEach(function (m) {
        var own = /dark/.test(m.getAttribute('media')) ? '#0B0D14' : '#F5F7FE';
        m.setAttribute('content', chosen ? (dark ? '#0B0D14' : '#F5F7FE') : own);
      });
    };
    var setTheme = function (next) {
      var follow = next === systemTheme();
      if (follow) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', next);
      try {
        if (follow) localStorage.removeItem('cg-theme'); else localStorage.setItem('cg-theme', next);
      } catch (e) { /* storage blocked: the choice lasts for this page only */ }
      syncTheme();
    };
    // the same critically damped spring as --spring in site.css
    var SPRING = window.CSS && CSS.supports('transition-timing-function', 'linear(0, 1)')
      ? 'linear(0, 0.0495, 0.1582, 0.2864, 0.4129, 0.5273, 0.6256, 0.7073, 0.7736, 0.8263, 0.8677, 0.8998, 0.9246, 0.9435, 0.9578, 0.9686, 0.9767, 0.9828, 0.9873, 0.9906, 0.9931, 0.995, 0.9963, 0.9973, 1)'
      : 'cubic-bezier(.22,1,.36,1)';
    var revealId = 0; // only the latest reveal clears the class
    themeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var next = currentTheme() === 'dark' ? 'light' : 'dark';
        if (!doc.startViewTransition) { setTheme(next); return; }
        // Reduced motion keeps the browser's default cross-fade: no travel,
        // and no abrupt brightness jump either.
        if (reduceMotion.matches) { doc.startViewTransition(function () { setTheme(next); }); return; }
        // The new theme grows as a circle from the control that was pressed,
        // so the change visibly comes from its source. A second tap mid-reveal
        // finishes this one and starts again from the button: input is never blocked.
        var r = (b.querySelector('.mnav-switch') || b).getBoundingClientRect();
        var x = r.left + r.width / 2, y = r.top + r.height / 2;
        var end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        var id = ++revealId;
        root.classList.add('vt-reveal');
        var t = doc.startViewTransition(function () { setTheme(next); });
        t.ready.then(function () {
          root.animate(
            { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 600, easing: SPRING, pseudoElement: '::view-transition-new(root)' }
          );
        }).catch(function () {});
        t.finished.finally(function () { if (id === revealId) root.classList.remove('vt-reveal'); });
      });
    });
    darkMQ.addEventListener('change', function () {
      if (root.getAttribute('data-theme') === systemTheme()) setTheme(systemTheme());
      else syncTheme();
    });
    syncTheme();
  }

  /* ---------- Scroll reveal ---------- */
  var reveals = doc.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
    // stagger siblings in card rows so a row lands as one gesture
    doc.querySelectorAll('.feat-grid, .why-grid, .steps-row, .plan-strip, .glance, .plans, .plat-grid').forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--stagger', (i * 70) + 'ms'); });
    });
  }

  /* ---------- FAQ accordion: a spring, not a timed curve ----------
     Apple's rule for anything the user can reverse: a critically damped
     spring (damping 1.0, response ~0.36s) that always starts from the
     current on-screen height AND current velocity. Tapping again mid-flight
     just moves the target; the motion turns around smoothly with no stop,
     jump or restart. Each question toggles on its own, so the row you tapped
     never moves out from under you. Reduced motion: an instant change with a
     short cross-fade. */
  var OPEN_RESPONSE = 0.36, CLOSE_RESPONSE = 0.28;   // seconds, Apple's "response"; exits are quicker
  function runSpring(st) {
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.032, (now - last) / 1000); last = now;
      var w = 2 * Math.PI / (st.open ? OPEN_RESPONSE : CLOSE_RESPONSE);   // critically damped: zeta = 1
      var acc = -w * w * (st.x - st.target) - 2 * w * st.v;
      st.v += acc * dt; st.x += st.v * dt;
      var full = st.inner.offsetHeight || 1;
      var prog = Math.max(0, Math.min(1, st.x / full));
      st.ans.style.height = Math.max(0, st.x) + 'px';
      st.inner.style.opacity = Math.min(1, prog * 1.6).toFixed(3);
      st.inner.style.transform = 'translateY(' + ((1 - prog) * -8).toFixed(2) + 'px)';
      if (Math.abs(st.x - st.target) < 0.5 && Math.abs(st.v) < 8) {
        st.raf = 0;
        st.ans.style.height = st.inner.style.opacity = st.inner.style.transform = '';
        st.ans.classList.remove('is-moving');
        if (!st.open) st.ans.classList.remove('is-open');
        return;
      }
      st.raf = requestAnimationFrame(frame);
    }
    st.raf = requestAnimationFrame(frame);
  }
  function setFaq(btn, open) {
    var ans = doc.getElementById(btn.getAttribute('aria-controls'));
    if (!ans) return;
    var inner = ans.firstElementChild;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    var st = ans._spring;
    var visible = ans.classList.contains('is-open') || ans.classList.contains('is-moving');
    if (reduceMotion.matches) {
      if (st && st.raf) cancelAnimationFrame(st.raf);
      ans._spring = null;
      ans.style.height = inner.style.opacity = inner.style.transform = '';
      ans.classList.remove('is-moving');
      ans.classList.toggle('is-open', open);
      if (open && inner.animate) inner.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
      return;
    }
    if (!st) st = ans._spring = { ans: ans, inner: inner, x: visible ? ans.getBoundingClientRect().height : 0, v: 0, raf: 0 };
    st.open = open;
    ans.style.height = Math.max(0, st.x) + 'px'; // pin the current height first: no one-frame flash
    if (!visible) { inner.style.opacity = '0'; }
    ans.classList.add('is-open', 'is-moving');   // display:block so the content can be measured
    st.target = open ? inner.offsetHeight : 0;
    if (!st.raf) runSpring(st);                  // already running: only the target changes
  }
  doc.querySelectorAll('.faq-list').forEach(function (list) {
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('.faq-q');
      if (btn) setFaq(btn, btn.getAttribute('aria-expanded') !== 'true');
    });
  });

  /* ---------- Contents on phones and tablets ----------
     The sidebar contents list is hidden below 1024px, so a copy of it opens
     as a disclosure at the top of the article. Built from the same list, so
     the two can never disagree. */
  var tocList = doc.querySelector('.toc ul, .legal-nav ol');
  var artMain = doc.querySelector('.art-main, .legal-body');
  if (tocList && artMain) {
    var det = doc.createElement('details');
    det.className = 'toc-mobile';
    var sum = doc.createElement('summary');
    sum.textContent = tocList.tagName === 'OL' ? 'Contents' : 'On this page';
    var count = doc.createElement('small');
    count.textContent = tocList.children.length + ' sections';
    sum.appendChild(count);
    det.appendChild(sum);
    var list = tocList.cloneNode(true);
    det.appendChild(list);
    list.addEventListener('click', function (e) { if (e.target.closest('a')) det.open = false; });
    artMain.insertBefore(det, artMain.firstChild);
  }

  /* ---------- Section scrollspy (guide TOC, legal contents, hub nav) ---------- */
  doc.querySelectorAll('.toc, .legal-nav, .about-nav').forEach(function (box) {
    var links = box.querySelectorAll('a[href^="#"]');
    var map = new Map();
    links.forEach(function (l) {
      var el = doc.getElementById(l.getAttribute('href').slice(1));
      if (el) map.set(el, l);
    });
    if (!map.size) return;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('active'); l.removeAttribute('aria-current'); });
        var a = map.get(e.target);
        a.classList.add('active');
        a.setAttribute('aria-current', 'location');
        if (box.scrollHeight > box.clientHeight && a.offsetTop > box.clientHeight - 60) {
          box.scrollTop = a.offsetTop - box.clientHeight / 2;
        }
      });
    }, { rootMargin: '-110px 0px -72% 0px' });
    map.forEach(function (l, el) { spy.observe(el); });
  });

  /* ---------- Sticky jump bar shadow (features) ---------- */
  var jw = doc.getElementById('jump-wrap');
  if (jw) {
    var probe = doc.createElement('div');
    probe.className = 'jump-probe';
    jw.parentNode.insertBefore(probe, jw);
    new IntersectionObserver(function (e) {
      jw.classList.toggle('stuck', !e[0].isIntersecting);
    }, { rootMargin: '-90px 0px 0px 0px' }).observe(probe);
  }

  /* ---------- Horizontal rails: previous / next buttons ----------
     Rails scroll natively (touch, trackpad, keyboard); buttons are an extra. */
  doc.querySelectorAll('.rail-nav').forEach(function (nav) {
    var rail = doc.getElementById(nav.querySelector('.rail-btn').dataset.rail);
    if (!rail) return;
    var btns = nav.querySelectorAll('.rail-btn');
    var update = function () {
      var max = rail.scrollWidth - rail.clientWidth;
      nav.hidden = max < 8;
      btns[0].disabled = rail.scrollLeft < 4;
      btns[1].disabled = rail.scrollLeft > max - 4;
    };
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var card = rail.firstElementChild;
        var step = card ? card.getBoundingClientRect().width + 16 : rail.clientWidth * 0.8;
        rail.scrollBy({ left: step * Number(b.dataset.dir), behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      });
    });
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- 404: show the failed address and seed the guide search ----------
     textContent only: the path is user controlled and never parsed as HTML. */
  var nfAddr = doc.getElementById('nf-addr');
  if (nfAddr) {
    var path = location.pathname;
    if (path && path !== '/' && path !== '/404.html') {
      nfAddr.textContent = 'You tried to open ' + path;
      nfAddr.hidden = false;
      var stop = ['guides', 'guide', 'how', 'to', 'the', 'a', 'an', 'for', 'and', 'of', 'on', 'in', 'is', 'your', 'my', 'html', 'index'];
      var words = path.toLowerCase().replace(/\.[a-z0-9]+$/, '').split(/[^a-z0-9]+/)
        .filter(function (w) { return w.length > 1 && stop.indexOf(w) === -1; });
      var field = doc.getElementById('nf-q');
      if (field && words.length) field.value = words.slice(0, 4).join(' ');
    }
  }

  /* ---------- Features page, phones: "Read more" ----------
     Long feature copy (the feature blocks and the prose sections) keeps
     its first paragraph visible and folds the paragraphs after it behind
     a "Read more" button. The CSS only hides the fold below 768px, so a
     laptop always shows the full text, and without JavaScript nothing is
     folded at all. The text stays in the page either way. */
  var foldId = 0;
  doc.querySelectorAll('.fblock .fb-copy, .split-prose .fb-copy').forEach(function (copy) {
    var first = null;
    for (var c = copy.firstElementChild; c; c = c.nextElementSibling) { if (c.tagName === 'P') { first = c; break; } }
    if (!first) return;
    var rest = [];
    for (var n = first.nextElementSibling; n && n.tagName === 'P'; n = n.nextElementSibling) rest.push(n);
    if (!rest.length) return;
    var more = doc.createElement('div');
    more.className = 'm-more';
    more.id = 'm-more-' + (++foldId);
    first.after(more);
    rest.forEach(function (p) { more.appendChild(p); });
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'm-more-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', more.id);
    btn.textContent = 'Read more';
    more.after(btn);
    btn.addEventListener('click', function () {
      var open = more.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Show less' : 'Read more';
      // folding the text back up can leave the button above the screen
      if (!open && btn.getBoundingClientRect().top < 0) btn.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  });
})();

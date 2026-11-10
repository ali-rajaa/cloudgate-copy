/* Cloud Tips hub: search, category filter, show more, grid/list view.
   State is mirrored to ?q= and ?cat= so a filtered view can be shared,
   and the 404 page search form lands here already filtered. */
  // Search + category filtering
  (function(){
    const search = document.getElementById('tip-search');
    const clearBtn = document.getElementById('search-clear');
    const catRow = document.getElementById('cat-row');
    const grid = document.getElementById('tip-grid');
    const note = document.getElementById('result-note');
    const empty = document.getElementById('no-results');
    const feedback = document.getElementById('search-feedback');
    if(!search || !grid) return;

    const cards = [...grid.querySelectorAll('.tip-card')];
    cards.forEach(c => {
      c.dataset.text = ((c.textContent || '') + ' ' + (c.dataset.kw || ''))
        .toLowerCase().replace(/\s+/g,' ');
    });

    const moreBtn = document.getElementById('more-btn');
    const moreWrap = document.getElementById('more-wrap');
    const LIMIT = 3;

    let activeCat = 'all';
    let expanded = false;

    // reflect search and category in the URL so a filtered view can be shared or bookmarked
    function syncURL(){
      const q = search.value.trim();
      const params = new URLSearchParams();
      if(q) params.set('q', q);
      if(activeCat !== 'all') params.set('cat', activeCat);
      const qs = params.toString();
      history.replaceState(null, '', qs ? '?' + qs + location.hash : location.pathname + location.hash);
    }

    // restore state if someone arrives on a filtered link
    (function restore(){
      const params = new URLSearchParams(location.search);
      const q = params.get('q'), cat = params.get('cat');
      if(q) search.value = q;
      if(cat){
        const btn = catRow.querySelector('.cat-btn[data-filter="' + cat + '"]');
        if(btn){
          catRow.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeCat = cat;
        }
      }
    })();

    function apply(){
      const q = search.value.trim().toLowerCase();
      const filtering = !!q || activeCat !== 'all';

      // which cards match the current search + category
      const matches = cards.filter(c => {
        const okCat = activeCat === 'all' || c.dataset.cat === activeCat;
        const okText = !q || c.dataset.text.includes(q);
        return okCat && okText;
      });

      // while filtering, always reveal every match so nothing hides behind the button
      const showAll = filtering || expanded;

      cards.forEach(c => {
        c.hidden = !matches.includes(c);
        c.classList.remove('is-extra');
      });
      if(!showAll){
        matches.slice(LIMIT).forEach(c => c.classList.add('is-extra'));
      }
      grid.classList.toggle('show-all', showAll);

      // category pill counts reflect the current search, so they never look frozen
      catRow.querySelectorAll('.cat-btn').forEach(btn => {
        const f = btn.dataset.filter;
        const n = cards.filter(c =>
          (f === 'all' || c.dataset.cat === f) && (!q || c.dataset.text.includes(q))
        ).length;
        const badge = btn.querySelector('.count');
        if(badge) badge.textContent = n;
        btn.classList.toggle('empty', n === 0);
        btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
        // a category with no matches should not look selectable
        btn.disabled = n === 0 && !btn.classList.contains('active');
      });

      // immediate feedback beside the search box
      if(feedback){
        feedback.textContent = q
          ? (matches.length === 0
              ? 'No guides match "' + search.value.trim() + '"'
              : matches.length + (matches.length === 1 ? ' guide matches "' : ' guides match "') + search.value.trim() + '"')
          : '';
        feedback.classList.toggle('show', !!q);
      }

      const hidden = Math.max(0, matches.length - LIMIT);
      const needsBtn = !filtering && hidden > 0;
      moreWrap.hidden = !needsBtn;
      if(needsBtn){
        moreBtn.querySelector('.lbl').textContent =
          expanded ? 'Show fewer guides' : 'Show ' + hidden + ' more guide' + (hidden === 1 ? '' : 's');
        moreBtn.classList.toggle('open', expanded);
        moreBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        const hint = document.getElementById('more-hint');
        if(hint) hint.textContent = expanded ? 'Showing every guide' : 'Click below to see more';
      }

      empty.classList.toggle('show', matches.length === 0);
      grid.hidden = matches.length === 0;
      clearBtn.classList.toggle('show', q.length > 0);

      syncURL();

      const shownCount = showAll ? matches.length : Math.min(LIMIT, matches.length);
      note.textContent = (filtering || expanded)
        ? matches.length + (matches.length === 1 ? ' guide' : ' guides')
        : shownCount + ' of ' + matches.length + ' guides';
    }

    if(moreBtn){
      moreBtn.addEventListener('click', () => {
        if(expanded){
          // play the exit animation before collapsing back down
          grid.classList.add('collapsing');
          const top = document.getElementById('all-tips').getBoundingClientRect().top + window.scrollY - 90;
          setTimeout(() => {
            grid.classList.remove('collapsing');
            expanded = false;
            apply();
            if(window.scrollY > top) window.scrollTo({top: top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
          }, 260);
        } else {
          expanded = true;
          apply();
        }
      });
    }

    let t;
    search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 120); });
    search.addEventListener('search', apply);
    // Enter filters in place; without JavaScript the form submits as ?q=
    if(search.form) search.form.addEventListener('submit', e => { e.preventDefault(); apply(); });
    // Escape clears the field, which is what people expect from a search box
    search.addEventListener('keydown', e => {
      if(e.key === 'Escape' && search.value){
        e.preventDefault();
        search.value = '';
        apply();
      }
    });
    clearBtn.addEventListener('click', () => { search.value = ''; search.focus(); apply(); });

    catRow.addEventListener('click', e => {
      const btn = e.target.closest('.cat-btn');
      if(!btn) return;
      catRow.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.filter;
      apply();
    });

    // set the initial collapsed state on load
    apply();
  })();

  // Grid / list view toggle
  (function(){
    const toggle = document.getElementById('view-toggle');
    const grid = document.getElementById('tip-grid');
    if(!toggle || !grid) return;
    toggle.addEventListener('click', e => {
      const btn = e.target.closest('.view-btn');
      if(!btn) return;
      toggle.querySelectorAll('.view-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed','false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed','true');
      grid.classList.toggle('list-view', btn.dataset.view === 'list');
    });
  })();

/* Browse by topic: a segmented control instead of six stacked essays.
   Progressive enhancement: without JavaScript every topic is shown in full
   with the side list of links. With it, one topic at a time; the thumb slides
   to the chosen tab, the panel cross-fades in, arrow keys move between tabs,
   and #hub-... links (including ones shared from elsewhere) open that topic. */
(function(){
  const layout = document.querySelector('.about-layout');
  const nav = layout && layout.querySelector('.about-nav');
  if(!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#hub-"]')];
  const panels = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if(panels.length !== links.length || !panels.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const bar = document.createElement('div');
  bar.className = 'topic-tabs';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Topics');
  const thumb = document.createElement('span');
  thumb.className = 'topic-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  bar.appendChild(thumb);
  const tabs = links.map((a, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'topic-tab';
    b.id = 'tab-' + panels[i].id;
    b.textContent = a.textContent;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].setAttribute('aria-labelledby', b.id);
    bar.appendChild(b);
    return b;
  });
  layout.parentNode.insertBefore(bar, layout);
  layout.classList.add('is-tabbed');

  let current = -1;
  function placeThumb(){
    const t = tabs[current];
    thumb.style.width = t.offsetWidth + 'px';
    thumb.style.transform = 'translateX(' + t.offsetLeft + 'px)';
  }
  function select(i, opts){
    opts = opts || {};
    if(i === current) return;
    current = i;
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
    placeThumb();
    // keep the chosen tab in view inside the scrolling bar without scrolling the page
    const t = tabs[i];
    if(t.offsetLeft < bar.scrollLeft || t.offsetLeft + t.offsetWidth > bar.scrollLeft + bar.clientWidth){
      bar.scrollTo({ left: t.offsetLeft - 24, behavior: reduce.matches ? 'auto' : 'smooth' });
    }
    if(opts.focus) t.focus();
    if(opts.animate && !reduce.matches && panels[i].animate){
      panels[i].animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    if(opts.hash) history.replaceState(null, '', location.pathname + location.search + '#' + panels[i].id);
  }
  bar.addEventListener('click', e => {
    const t = e.target.closest('.topic-tab');
    if(t) select(tabs.indexOf(t), { animate: true, hash: true });
  });
  bar.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' }[e.key];
    if(k === undefined) return;
    e.preventDefault();
    const n = k === 'first' ? 0 : k === 'last' ? tabs.length - 1 : (current + k + tabs.length) % tabs.length;
    select(n, { focus: true, animate: true, hash: true });
  });
  function fromHash(scroll){
    const i = panels.findIndex(p => '#' + p.id === location.hash);
    if(i < 0) return false;
    select(i, { animate: current !== -1 });
    if(scroll) bar.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
    return true;
  }
  if(!fromHash(false)) select(0);
  window.addEventListener('hashchange', () => fromHash(true));
  window.addEventListener('resize', placeThumb);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);
})();

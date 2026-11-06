import { STRINGS, PROJECTS, CONTACT } from "./content.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const motionOK = () => matchMedia("(prefers-reduced-motion: no-preference)").matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ============================== Language ============================== */
let lang = "en";
const t = (k) => STRINGS[lang]?.[k] ?? STRINGS.en[k] ?? k;

function initialLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "en" || q === "fr") return q;
  const saved = store.get("lang");
  if (saved === "en" || saved === "fr") return saved;
  return (navigator.languages?.[0] || navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
}

function applyLang(next, { save = false } = {}) {
  lang = next;
  if (save) store.set("lang", next);
  document.documentElement.lang = next;
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  $$("[data-i18n-ph]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
  const title = document.body.dataset.page === "404" ? `404 — ${t("404.title")}` : t("meta.title");
  document.title = title;
  $('meta[name="description"]')?.setAttribute("content", t("meta.description"));
  const cur = $("[data-flag-current]");
  if (cur) cur.className = `flag ${next === "fr" ? "flag--fr" : "flag--uk"}`;
  const code = $("[data-lang-code]");
  if (code) code.textContent = next.toUpperCase();
  $$("[data-set-lang]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.setLang === next)));
  if ($("#projects")) renderProjects();
  updateWaLink();
}

/* Language menu: popover + invoker command, with fallbacks */
function initLangMenu() {
  const trigger = $("#lang-trigger");
  const menu = $("#lang-menu");
  if (!trigger || !menu) return;
  const items = () => $$("button", menu);
  let enterOnOpen = false;
  let pointerDown = false;

  if (!("popover" in HTMLElement.prototype)) {
    // Very old browsers: simple show/hide
    menu.removeAttribute("popover");
    menu.hidden = true;
    trigger.addEventListener("click", () => {
      menu.hidden = !menu.hidden;
      trigger.setAttribute("aria-expanded", String(!menu.hidden));
    });
  } else if (!("commandForElement" in HTMLButtonElement.prototype)) {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      if (menu.matches(":popover-open")) closeMenu(e.detail !== 0);
      else { enterOnOpen = e.detail === 0; menu.showPopover({ source: trigger }); }
    });
  }

  // Unsupported focusgroup: roles + arrow keys
  const group = $("[focusgroup]", menu);
  if (!("focusGroup" in HTMLElement.prototype) && group) group.setAttribute("role", "menu");

  trigger.addEventListener("pointerdown", () => { pointerDown = true; });
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      enterOnOpen = true;
      if (e.key === "ArrowDown") { e.preventDefault(); if (!menu.matches(":popover-open")) trigger.click(); else items()[0]?.focus(); }
    }
  });

  menu.addEventListener("toggle", (e) => {
    const open = e.newState === "open";
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      if (!CSS.supports("position-area: block-end")) place();
      if (enterOnOpen || !pointerDown) (items().find((b) => b.getAttribute("aria-checked") === "true") || items()[0])?.focus();
    }
    enterOnOpen = false; pointerDown = false;
  });

  function place() {
    const r = trigger.getBoundingClientRect();
    const w = menu.offsetWidth;
    const left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${r.bottom + 8}px`;
    menu.style.margin = "0";
  }
  addEventListener("resize", () => { if (menu.matches?.(":popover-open") && !CSS.supports("position-area: block-end")) place(); });

  function closeMenu(fromPointer) {
    trigger.focus({ focusVisible: !fromPointer });
    if (menu.hidePopover) menu.hidePopover(); else { menu.hidden = true; trigger.setAttribute("aria-expanded", "false"); }
  }

  menu.addEventListener("keydown", (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) && !("focusGroup" in HTMLElement.prototype)) {
      e.preventDefault();
      const n = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : (i + (e.key === "ArrowUp" ? -1 : 1) + list.length) % list.length;
      list[n].focus();
    }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeMenu(false); }
    if (e.key === "Tab" && menu.hidePopover) menu.hidePopover();
  });
  menu.addEventListener("pointermove", (e) => {
    const b = e.target.closest("button");
    if (b && document.activeElement !== b) b.focus({ focusVisible: false });
  });

  $$("[data-set-lang]", menu).forEach((b) =>
    b.addEventListener("click", (e) => {
      applyLang(b.dataset.setLang, { save: true });
      const url = new URL(location.href);
      if (url.searchParams.has("lang")) { url.searchParams.delete("lang"); history.replaceState(null, "", url); }
      setTimeout(() => closeMenu(e.detail !== 0), 160);
    }),
  );
}

/* ============================== Theme ============================== */
const meta = $('meta[name="color-scheme"]');
const sysDark = matchMedia("(prefers-color-scheme: dark)");
const rendered = () => {
  const v = meta.content;
  return v === "dark" || v === "light" ? v : sysDark.matches ? "dark" : "light";
};
function setScheme(stored) {
  meta.content = stored ?? "light dark";
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.content = rendered() === "dark" ? "#000000" : "#fbfbfd";
  });
}
function toggleTheme(origin) {
  const target = rendered() === "dark" ? "light" : "dark";
  const system = sysDark.matches ? "dark" : "light";
  const next = target === system ? null : target; // matching the system = back to "follow system"
  store.set("color-scheme", next);

  const swap = () => setScheme(next);
  if (!document.startViewTransition || !motionOK()) return swap();
  const x = origin?.x ?? innerWidth - 60;
  const y = origin?.y ?? 32;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement.style;
  root.setProperty("--vt-x", `${x}px`);
  root.setProperty("--vt-y", `${y}px`);
  root.setProperty("--vt-r", `${r}px`);
  document.startViewTransition(swap);
}
function initTheme() {
  setScheme(store.get("color-scheme"));
  const btn = $("#theme-toggle");
  btn?.addEventListener("click", (e) => {
    const r = btn.getBoundingClientRect();
    toggleTheme(e.detail ? { x: e.clientX, y: e.clientY } : { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  });
  addEventListener("storage", (e) => {
    if (e.key === "color-scheme") setScheme(e.newValue);
    if (e.key === "lang" && (e.newValue === "en" || e.newValue === "fr")) applyLang(e.newValue);
  });
  sysDark.addEventListener("change", () => setScheme(store.get("color-scheme")));
}

/* ============================== Projects ============================== */
let filter = "all";
const nm = (p) => (lang === "fr" && p.nameFr) || p.name;
const ICON = {
  arrow: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8h10m0 0L9 4m4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ext: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M6 3H3.5A.5.5 0 0 0 3 3.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V10M9 3h4v4m0-4L7 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  gh: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 .2a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.3 1.9.9 2.3.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8a7.4 7.4 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3.1-1.9 3.8-3.6 4 .3.3.6.8.6 1.5v2.2c0 .2.1.5.6.4A8 8 0 0 0 8 .2Z"/></svg>',
  lock: '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  prev: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m10 3-5 5 5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
};

function statusTag(p) {
  const map = { live: ["work.status.live", "live"], wip: ["work.status.wip", "wip"], product: ["work.status.product", ""] };
  const [k, cls] = map[p.status];
  const dot = cls ? `<span class="dot dot--${cls}" aria-hidden="true"></span>` : "";
  return `<span class="tag ${cls ? "tag--status-" + cls : ""}">${dot}${esc(t(k))}</span>`;
}

function artFor(p) {
  if (p.art === "balloons") {
    const balloon = (c1, c2, cls) => `<svg class="${cls}" viewBox="0 0 60 84" aria-hidden="true"><path d="M30 2C14 2 3 14 3 29c0 15 15 27 21 33h12c6-6 21-18 21-33C57 14 46 2 30 2Z" fill="${c1}"/><path d="M30 2c-7 0-12 12-12 27 0 15 4 27 6 33h12c2-6 6-18 6-33C42 14 37 2 30 2Z" fill="${c2}"/><path d="M24 62 26 72h8l2-10" fill="none" stroke="#5a3a22" stroke-width="1.2"/><rect x="25" y="72" width="10" height="8" rx="1.5" fill="#7a4a2a"/></svg>`;
    return `<div class="art art--balloons" aria-hidden="true"><div class="sun"></div><div class="dunes"></div>
      ${balloon("#e63946", "#ffb703", "b1")}${balloon("#2a9d8f", "#e9c46a", "b2")}${balloon("#f4a261", "#fff3e0", "b3")}${balloon("#6d597a", "#e56b6f", "b4")}
      <div class="art__label"><small>Tunisia</small><b>From the sky</b></div></div>`;
  }
  return `<div class="art art--bgm" aria-hidden="true"><div class="ring"></div><div class="word"><b>BGM</b><i>Com Agency</i><small>Communication · Branding · Digital</small></div></div>`;
}

function browser(p, L, { cls = "" } = {}) {
  const url = p.url ? p.domain : p.domain;
  const lockIc = p.url ? ICON.lock : "";
  const view = p.shots.length
    ? p.shots.map((s, i) => `<img src="${s.src}" width="${s.w}" height="${s.h}" alt="${esc(L.alts[i] || nm(p))}" loading="lazy" decoding="async" class="${i === 0 ? "is-on" : ""}">`).join("")
    : artFor(p);
  const dots = p.shots.length > 1
    ? `<div class="dots">${p.shots.map((_, i) => `<button type="button" aria-label="${i + 1} / ${p.shots.length}" ${i === 0 ? 'aria-current="true"' : ""} data-dot="${i}"></button>`).join("")}</div>`
    : "";
  return `<div class="browser ${cls}"><div class="browser__bar"><i></i><i></i><i></i><span class="browser__url">${lockIc}${esc(url)}</span></div><div class="browser__view">${view}${dots}</div></div>`;
}

function linksFor(p, big = false) {
  const out = [];
  if (p.url) out.push(`<a class="btn ${big ? "btn--primary" : "btn--ghost btn--sm"}" href="${p.url}" target="_blank" rel="noopener">${esc(t("work.visit"))} ${ICON.ext}</a>`);
  if (p.repo) out.push(`<a class="btn btn--ghost ${big ? "" : "btn--sm"}" href="${p.repo}" target="_blank" rel="noopener">${ICON.gh} ${esc(t("work.code"))}</a>`);
  if (!p.url && !p.repo) out.push(`<span class="project__note">${ICON.lock} ${esc(t(p.status === "product" ? "work.demo" : "work.private"))}</span>`);
  return out.join("");
}

function renderProjects() {
  const list = $("#projects");
  list.innerHTML = PROJECTS.map((p, idx) => {
    const L = p[lang];
    const show = filter === "all" || p.kind === filter;
    return `<li class="project" id="p-${p.id}" style="--accent:${p.accent}" data-kind="${p.kind}" ${show ? "" : "hidden"}>
      <div class="project__media ${p.mobile ? "" : "no-phone"}">
        ${browser(p, L)}
        ${p.mobile ? `<div class="phone"><img src="${p.mobile.src}" width="${p.mobile.w}" height="${p.mobile.h}" alt="" loading="lazy" decoding="async"></div>` : ""}
      </div>
      <div class="project__info">
        <div class="project__top">${statusTag(p)}<span class="tag">${esc(t("work.kind." + p.kind))}</span><span class="project__n">${String(idx + 1).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")} · ${p.year}</span></div>
        <p class="project__cat">${esc(L.category)}</p>
        <h3 class="project__name">${esc(nm(p))}</h3>
        <p class="project__tagline">${esc(L.tagline)}</p>
        <ul class="project__hl">${L.highlights.slice(0, 3).map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
        <ul class="chips" aria-label="${esc(t("work.stack"))}">${p.stack.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
        <div class="project__actions">
          <button class="btn btn--primary btn--sm" type="button" data-open="${p.id}" aria-haspopup="dialog">${esc(t("work.open"))} ${ICON.arrow}</button>
          ${linksFor(p)}
        </div>
      </div>
    </li>`;
  }).join("");

  for (const k of ["all", "built", "collab"]) {
    const n = k === "all" ? PROJECTS.length : PROJECTS.filter((p) => p.kind === k).length;
    const el = $(`[data-count-for="${k}"]`);
    if (el) el.textContent = n;
  }
  wireProjectCards();
}

function wireProjectCards() {
  $$(".project").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
    const imgs = $$(".browser__view img", card);
    const dots = $$("[data-dot]", card);
    let i = 0, timer;
    const go = (n) => {
      i = (n + imgs.length) % imgs.length;
      imgs.forEach((im, k) => im.classList.toggle("is-on", k === i));
      dots.forEach((d, k) => (k === i ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
    };
    dots.forEach((d) => d.addEventListener("click", () => { go(+d.dataset.dot); }));
    if (imgs.length > 1) {
      card.addEventListener("pointerenter", () => { if (motionOK()) timer = setInterval(() => go(i + 1), 2200); });
      card.addEventListener("pointerleave", () => clearInterval(timer));
    }
  });
}

function initFilters() {
  const btns = $$("[data-filter]");
  btns.forEach((b) => b.addEventListener("click", () => setFilter(b.dataset.filter)));
  $(".filters")?.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const i = btns.findIndex((b) => b.dataset.filter === filter);
    const n = (i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length;
    setFilter(btns[n].dataset.filter);
    btns[n].focus();
  });
  const sync = () => btns.forEach((b) => {
    const on = b.dataset.filter === filter;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  function setFilter(f) {
    filter = f;
    sync();
    const run = () => $$(".project").forEach((li) => {
      const show = f === "all" || li.dataset.kind === f;
      li.hidden = !show;
      li.classList.remove("is-entering");
      if (show) { void li.offsetWidth; li.classList.add("is-entering"); }
    });
    if (document.startViewTransition && motionOK()) document.startViewTransition(run); else run();
  }
  sync();
}

/* Case study dialog */
function openCase(id, opener) {
  const p = PROJECTS.find((x) => x.id === id);
  if (!p) return;
  const L = p[lang];
  const dlg = $("#case");
  const slides = [
    ...(p.shots.length ? p.shots.map((s, i) => `<div class="case__slide"><img src="${s.src}" width="${s.w}" height="${s.h}" alt="${esc(L.alts[i] || nm(p))}" loading="lazy"></div>`) : [`<div class="case__slide">${browser(p, L)}</div>`]),
    ...(p.mobile ? [`<div class="case__slide case__slide--phone"><img src="${p.mobile.src}" width="${p.mobile.w}" height="${p.mobile.h}" alt="${esc(nm(p))} — mobile" loading="lazy"></div>`] : []),
  ];
  const meta = [
    [t("work.year"), esc(p.year)],
    [t("work.type"), esc(L.category)],
    [t("work.status"), statusTag(p)],
    [t("work.role"), esc(L.role)],
    [t("work.stack"), `<ul class="chips">${p.stack.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`],
  ];
  $("#case-body").innerHTML = `
    <div class="case__head"><span class="dot ${p.status === "live" ? "dot--live" : p.status === "wip" ? "dot--wip" : ""}" style="${p.status === "product" ? "background:var(--subtle)" : ""}" aria-hidden="true"></span><h2 id="case-title">${esc(nm(p))}</h2>
      <button class="icon-btn" type="button" data-close aria-label="${esc(t("work.close"))}">${ICON.close}</button></div>
    <div class="case__gallery" aria-label="${esc(t("work.gallery"))}" role="group">
      <div class="case__track" tabindex="0">${slides.join("")}</div>
      ${slides.length > 1 ? `<div class="case__nav"><button type="button" data-step="-1" aria-label="${esc(t("work.prev"))}" disabled>${ICON.prev}</button><button type="button" data-step="1" aria-label="${esc(t("work.next"))}">${ICON.next}</button></div><span class="case__count"><span data-cur>1</span> / ${slides.length}</span>` : ""}
    </div>
    <div class="case__body">
      <div>
        <p class="project__cat">${esc(L.category)}</p>
        <p class="case__title">${esc(nm(p))}</p>
        <p class="case__tagline">${esc(L.tagline)}</p>
        <p class="case__summary">${esc(L.summary)}</p>
        <div class="case__hl"><h3>${esc(t("work.highlights"))}</h3><ol>${L.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ol></div>
      </div>
      <aside class="case__aside">
        <dl class="case__meta">${meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>
        <div class="case__links">${linksFor(p, true)}</div>
        <div class="case__cta"><p>${esc(t("work.contactAbout"))}</p><a class="btn btn--ghost" href="#contact" data-close>${esc(t("work.contactCta"))} ${ICON.arrow}</a></div>
      </aside>
    </div>`;

  const track = $(".case__track", dlg);
  const prev = $('[data-step="-1"]', dlg), next = $('[data-step="1"]', dlg), cur = $("[data-cur]", dlg);
  const idx = () => Math.round(track.scrollLeft / track.clientWidth);
  const upd = () => {
    const i = idx();
    if (cur) cur.textContent = i + 1;
    if (prev) prev.disabled = i <= 0;
    if (next) next.disabled = i >= slides.length - 1;
  };
  track.addEventListener("scroll", upd, { passive: true });
  $$("[data-step]", dlg).forEach((b) => b.addEventListener("click", () => track.scrollTo({ left: (idx() + +b.dataset.step) * track.clientWidth, behavior: motionOK() ? "smooth" : "auto" })));
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next?.click(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev?.click(); }
  });
  $$("[data-close]", dlg).forEach((b) => b.addEventListener("click", () => dlg.close()));
  dlg.onclose = () => { opener?.focus({ focusVisible: false }); if (location.hash === `#${id}`) history.replaceState(null, "", location.pathname + location.search); };
  dlg.showModal();
  $(".case__inner", dlg).scrollTop = 0;
  history.replaceState(null, "", `#${id}`);
}
function initCase() {
  const dlg = $("#case");
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (b) openCase(b.dataset.open, b);
  });
  // click on the backdrop closes
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  const h = location.hash.slice(1);
  if (PROJECTS.some((p) => p.id === h)) {
    requestAnimationFrame(() => { $(`#p-${h}`)?.scrollIntoView(); openCase(h, $(`[data-open="${h}"]`)); });
  }
}

/* ============================== Hero ============================== */
function initHero() {
  const stack = $("[data-parallax]");
  if (stack && matchMedia("(hover: hover)").matches) {
    const hero = $(".hero");
    hero.addEventListener("pointermove", (e) => {
      if (!motionOK()) return;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      stack.style.setProperty("--ry", `${-14 + x * 10}deg`);
      stack.style.setProperty("--rx", `${8 - y * 8}deg`);
    });
    hero.addEventListener("pointerleave", () => { stack.style.removeProperty("--ry"); stack.style.removeProperty("--rx"); });
  }
  // Count-up stats
  if (motionOK()) {
    const nums = $$("[data-count]");
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const end = +en.target.dataset.count, t0 = performance.now(), d = 900;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / d);
        en.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      en.target.textContent = "0";
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
  }
}

/* ============================== Workflow demo ============================== */
function initFlow() {
  const flow = $("#flow");
  if (!flow || !motionOK()) return;
  flow.classList.add("is-ready");
  const run = () => {
    flow.classList.remove("is-running");
    void flow.offsetWidth;
    flow.classList.add("is-running");
  };
  $("#flow-run")?.addEventListener("click", run);
  const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.5 });
  io.observe(flow);
}

/* ============================== Cards spotlight ============================== */
function initSpotlight() {
  $$(".card").forEach((c) => c.addEventListener("pointermove", (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", `${e.clientX - r.left}px`);
    c.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));
}

/* ============================== Nav active section ============================== */
function initActiveNav() {
  const links = $$(".nav__links a");
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    const a = map.get(en.target.id);
    if (a && en.isIntersecting) { links.forEach((l) => l.removeAttribute("aria-current")); a.setAttribute("aria-current", "true"); }
  }), { rootMargin: "-45% 0px -50% 0px" });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

/* ============================== Contact ============================== */
function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("is-on"), 2200);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
  }
  toast(t("contact.copied"));
}

function waMessage() {
  const f = $("#contact-form");
  if (!f) return "";
  const d = new FormData(f);
  const parts = [
    lang === "fr" ? "Bonjour Ahmed," : "Hello Ahmed,",
    d.get("message") || "",
    d.get("name") ? `— ${d.get("name")}` : "",
    d.get("project_type") ? `(${d.get("project_type")})` : "",
  ].filter(Boolean);
  return parts.join("\n");
}
function updateWaLink() {
  const a = $("#f-wa");
  if (a) a.href = `${CONTACT.whatsapp}?text=${encodeURIComponent(waMessage())}`;
}

function initForm() {
  const form = $("#contact-form");
  if (!form) return;
  const ok = $("#f-ok"), fail = $("#f-fail"), btn = $("#f-submit");

  // :user-invalid fallback + aria-invalid sync
  const supportsUI = CSS.supports("selector(:user-invalid)");
  const touched = new WeakSet();
  const fields = $$("input:not([type=hidden]):not(.hp), textarea", form);
  const sync = (el) => {
    const bad = supportsUI ? el.matches(":user-invalid") : touched.has(el) && !el.checkValidity();
    if (!supportsUI || el.checkValidity()) el.classList.toggle("user-invalid-fallback", bad);
    if (el.willValidate && el.type !== "radio") el.setAttribute("aria-invalid", String(bad));
  };
  fields.forEach((el) => {
    el.addEventListener("blur", () => { if (el.value) touched.add(el); sync(el); });
    el.addEventListener("input", () => { sync(el); updateWaLink(); });
  });
  form.addEventListener("change", updateWaLink);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    fail.hidden = true;
    if (!form.checkValidity()) {
      // A submit attempt counts as interaction: flag every invalid field and focus the first one
      fields.forEach((el) => {
        const bad = !el.checkValidity();
        el.classList.toggle("user-invalid-fallback", bad);
        el.setAttribute("aria-invalid", String(bad));
      });
      fields.find((el) => !el.checkValidity())?.focus();
      return;
    }
    if (form._honey?.value) return; // bot
    const data = Object.fromEntries(new FormData(form));
    data._replyto = data.email;
    data.language = lang;
    btn.setAttribute("aria-busy", "true");
    btn.disabled = true;
    $(".btn__label", btn).textContent = t("form.sending");
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${CONTACT.email}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === "false" || json.success === false) throw new Error(json.message || res.status);
      form.hidden = true;
      ok.hidden = false;
      ok.focus();
      form.reset();
    } catch {
      updateWaLink();
      fail.hidden = false;
    } finally {
      btn.removeAttribute("aria-busy");
      btn.disabled = false;
      $(".btn__label", btn).textContent = t("form.send");
    }
  });
  $("#f-again")?.addEventListener("click", () => {
    ok.hidden = true;
    form.hidden = false;
    fields.forEach((el) => { el.removeAttribute("aria-invalid"); el.classList.remove("user-invalid-fallback"); });
    $("#f-name")?.focus();
  });
}

function initContactBits() {
  $$("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(b.dataset.copy)));
  $("#vcard")?.addEventListener("click", () => {
    const v = [
      "BEGIN:VCARD", "VERSION:3.0", "N:Kharroubi;Ahmed;;;", "FN:Ahmed Kharroubi",
      `TITLE:${lang === "fr" ? "Développeur web" : "Web developer"}`,
      `TEL;TYPE=CELL:${CONTACT.phone}`, `EMAIL;TYPE=INTERNET:${CONTACT.email}`,
      `URL:https://ahmedkharroubi.qd.je`, `X-SOCIALPROFILE;TYPE=linkedin:${CONTACT.linkedin}`, "END:VCARD",
    ].join("\r\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([v], { type: "text/vcard" })),
      download: "Ahmed-Kharroubi.vcf",
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  const clock = $("#clock");
  if (clock) {
    const tick = () => {
      const d = new Date();
      clock.textContent = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(d);
      clock.dateTime = d.toISOString();
    };
    tick();
    setInterval(tick, 15000);
  }
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
}

/* ============================== Command palette ============================== */
function initCmd() {
  const dlg = $("#cmd"), input = $("#cmd-input"), list = $("#cmd-list");
  if (!dlg) return;
  const ic = {
    go: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8h10m0 0L9 4m4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    act: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8l1-5.5Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  };
  const goto = (id) => () => document.getElementById(id)?.scrollIntoView({ behavior: motionOK() ? "smooth" : "auto" });
  const items = () => [
    ...[["work", "nav.work"], ["now", "nav.now"], ["services", "nav.services"], ["process", "nav.process"], ["contact", "nav.contact"]]
      .map(([id, k]) => ({ group: t("cmd.nav"), label: t(k), icon: ic.go, run: goto(id) })),
    ...PROJECTS.map((p) => ({ group: t("cmd.nav"), label: `${nm(p)} — ${p[lang].category}`, icon: ic.go, run: () => openCase(p.id, $(`[data-open="${p.id}"]`)) })),
    { group: t("cmd.actions"), label: t("cmd.theme"), icon: ic.act, run: () => toggleTheme() },
    { group: t("cmd.actions"), label: t("cmd.lang"), icon: ic.act, run: () => applyLang(lang === "fr" ? "en" : "fr", { save: true }) },
    { group: t("cmd.actions"), label: t("cmd.copy"), icon: ic.act, run: () => copy(CONTACT.email) },
    { group: t("cmd.actions"), label: t("cmd.wa"), icon: ic.act, run: () => open(CONTACT.whatsapp, "_blank", "noopener") },
    { group: t("cmd.actions"), label: t("cmd.li"), icon: ic.act, run: () => open(CONTACT.linkedin, "_blank", "noopener") },
  ];
  let shown = [], sel = 0;
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const render = () => {
    const q = norm(input.value.trim());
    shown = items().filter((it) => !q || norm(it.label).includes(q));
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    if (!shown.length) { list.innerHTML = `<li class="cmd__empty">${esc(t("cmd.empty"))}</li>`; input.removeAttribute("aria-activedescendant"); return; }
    let g = "";
    list.innerHTML = shown.map((it, i) => {
      const head = it.group !== g ? `<li class="cmd__group" role="presentation">${esc((g = it.group))}</li>` : "";
      return `${head}<li class="cmd__item" role="option" id="cmd-${i}" aria-selected="${i === sel}" data-i="${i}">${it.icon}<span>${esc(it.label)}</span>${i === sel ? `<span class="hint">↵ ${esc(t("cmd.hint"))}</span>` : ""}</li>`;
    }).join("");
    input.setAttribute("aria-activedescendant", `cmd-${sel}`);
    $(`#cmd-${sel}`)?.scrollIntoView({ block: "nearest" });
  };
  const runSel = (i = sel) => { const it = shown[i]; if (!it) return; dlg.close(); setTimeout(it.run, 60); };
  const openCmd = () => { if (dlg.open) return; input.value = ""; sel = 0; render(); dlg.showModal(); input.focus(); };
  $("#cmd-trigger")?.addEventListener("click", openCmd);
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); dlg.open ? dlg.close() : openCmd(); }
  });
  input.addEventListener("input", () => { sel = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); render(); }
    if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); render(); }
    if (e.key === "Enter") { e.preventDefault(); runSel(); }
  });
  list.addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) runSel(+li.dataset.i); });
  list.addEventListener("pointermove", (e) => { const li = e.target.closest("[data-i]"); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; render(); } });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
}

/* ============================== Boot ============================== */
initTheme();
applyLang(initialLang());
initLangMenu();
if ($("#projects")) { initFilters(); initCase(); }
initHero();
initFlow();
initSpotlight();
initActiveNav();
initForm();
initContactBits();
initCmd();

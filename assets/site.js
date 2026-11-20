/* Old Vine Studio site script.
   - Google Analytics 4 loads only when (a) window.OVS_GA_ID (set in /assets/ga-id.js) is a real ID,
     (b) the visitor clicked Accept on the notice, and (c) the browser does not send Global Privacy Control.
   - Events: quote_click, info_click, help_click, demo_call_click, preview_start, package_view, scroll_depth,
     generate_lead (quote form, only reaches GA after consent like every other event).
   - Quote form on /contact/#quote: two steps, builds a mailto to quote@ (no backend; SITE_REVIEW 6.1).
   - Every event is also pushed to window.OVS_EVENTS (local only, for testing; nothing is sent without consent).
   - Safe on every page, including /front-desk/, /preview/ and /unsubscribe/ (no required elements). */
(function () {
  "use strict";
  var KEY = "ovs-consent";
  var PLACEHOLDER = "G-XXXXXXXXXX";
  var gaId = String(window.OVS_GA_ID || "");
  var gaConfigured = /^G-[A-Z0-9]{4,}$/.test(gaId) && gaId !== PLACEHOLDER;
  var gpc = navigator.globalPrivacyControl === true;
  var gaLoaded = false;
  window.OVS_EVENTS = window.OVS_EVENTS || [];

  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function loadGA() {
    if (gaLoaded || !gaConfigured || gpc) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", gaId);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaId);
    document.head.appendChild(s);
  }

  function pageName() {
    var b = document.body;
    return (b && b.getAttribute("data-page")) || document.title.split("|")[0].trim();
  }

  function track(name, params) {
    params = params || {};
    params.page = params.page || pageName();
    params.page_path = location.pathname;
    window.OVS_EVENTS.push({ event: name, params: params });
    if (gaLoaded && typeof window.gtag === "function") window.gtag("event", name, params);
  }
  window.ovsTrack = track;

  /* ---------- consent notice ---------- */
  function injectNoticeStyles() {
    if (document.getElementById("ovs-consent-css")) return;
    var css = "#ovs-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:60;max-width:560px;margin-left:auto;" +
      "background:#152238;color:#EEF1F6;border:1px solid #2A3C5B;border-radius:16px;padding:18px 20px;" +
      "box-shadow:0 24px 60px -24px rgba(0,0,0,.6);font:400 15px/1.5 Inter,system-ui,-apple-system,'Segoe UI',sans-serif}" +
      "#ovs-consent p{margin:0}#ovs-consent a{color:#9BE01E}" +
      "#ovs-consent .row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}" +
      "#ovs-consent button{font:600 15px/1 Inter,system-ui,sans-serif;padding:12px 18px;border-radius:999px;cursor:pointer;border:1px solid #3A4E70;background:transparent;color:#EEF1F6}" +
      "#ovs-consent button.ok{background:#9BE01E;border-color:#9BE01E;color:#17230A}" +
      "@media (max-width:820px){#ovs-consent{left:8px;right:8px;bottom:calc(76px + env(safe-area-inset-bottom,0px));padding:10px 12px;border-radius:14px;" +
      "font-size:13px;line-height:1.35;display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center}" +
      "#ovs-consent .row{display:contents}#ovs-consent button{min-height:40px;padding:8px 12px;font-size:14px}}";
    var st = document.createElement("style");
    st.id = "ovs-consent-css";
    st.textContent = css;
    document.head.appendChild(st);
  }

  function showNotice() {
    if (!gaConfigured || gpc || document.getElementById("ovs-consent")) return;
    injectNoticeStyles();
    var box = document.createElement("div");
    box.id = "ovs-consent";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "Analytics notice");
    box.innerHTML = '<p>Analytics cookies, only with your OK. No ads, never sold. <a href="/privacy/#cookies">Details</a></p>' +
      '<div class="row"><button type="button" class="ok" data-consent="granted">Accept</button><button type="button" data-consent="denied">Decline</button></div>';
    box.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-consent]") : null;
      if (!b) return;
      var v = b.getAttribute("data-consent");
      store(KEY, v);
      box.parentNode.removeChild(box);
      if (v === "granted") loadGA(); else clearGACookies();
    });
    document.body.appendChild(box);
  }

  /* remove Google Analytics cookies (_ga, _ga_<id>) when the visitor declines */
  function clearGACookies() {
    var host = location.hostname.split(".");
    var domains = [""];
    for (var i = 0; i < host.length - 1; i++) domains.push("; domain=." + host.slice(i).join("."));
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (!/^_ga(_|$)|^_gid$|^_gat/.test(name)) return;
      domains.forEach(function (d) { document.cookie = name + "=; Max-Age=0; path=/" + d; });
    });
  }

  window.ovsResetConsent = function () {
    store(KEY, null);
    clearGACookies();
    if (gaLoaded) { location.reload(); return; }
    showNotice();
  };

  /* ---------- theme toggle (shared key with /front-desk/) ---------- */
  function initTheme() {
    var root = document.documentElement;
    var saved = read("ovs-theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
    var btns = document.querySelectorAll("[data-theme-toggle]");
    Array.prototype.forEach.call(btns, function (btn) {
      btn.addEventListener("click", function () {
        var cur = root.getAttribute("data-theme") ||
          (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
        var next = cur === "light" ? "dark" : "light";
        root.setAttribute("data-theme", next);
        store("ovs-theme", next);
      });
    });
  }

  /* ---------- mobile menu ---------- */
  /* ---------- "AI services" dropdown in the desktop header (CSS opens it on hover/focus too) ---------- */
  function initNavDrop() {
    var drop = document.querySelector(".nav-drop");
    if (!drop) return;
    var b = drop.querySelector(".nav-drop-btn");
    function set(open) {
      drop.classList.toggle("open", open);
      b.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) drop.classList.add("dismissed"); else drop.classList.remove("dismissed");
    }
    b.addEventListener("click", function () { set(!drop.classList.contains("open")); });
    document.addEventListener("click", function (e) { if (drop.classList.contains("open") && !drop.contains(e.target)) set(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (drop.classList.contains("open") || drop.matches(":hover")) { var had = drop.contains(document.activeElement); set(false); if (had) b.focus(); }
    });
    drop.addEventListener("mouseleave", function () { drop.classList.remove("dismissed"); });
    drop.addEventListener("focusout", function (e) { if (!drop.contains(e.relatedTarget)) { drop.classList.remove("open"); b.setAttribute("aria-expanded", "false"); } });
  }

  function initMenu() {
    var btn = document.querySelector("[data-menu-toggle]");
    var nav = document.getElementById("site-nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function (e) {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      /* opened from the keyboard (Enter/Space give e.detail 0): the menu sits before this button in the page,
         so move focus to its first link; Esc closes it and returns focus here */
      if (open && e.detail === 0) {
        var first = Array.prototype.filter.call(nav.querySelectorAll("a, button"), function (el) { return el.offsetParent !== null; })[0];
        if (first) first.focus();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); btn.focus(); }
    });
    /* close when tapping outside the menu or picking a link */
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("open")) return;
      if (btn.contains(e.target)) return;
      if (!nav.contains(e.target) || (e.target.closest && e.target.closest("a"))) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- click events ---------- */
  function subjectOf(href) {
    var m = /[?&]subject=([^&]*)/i.exec(href);
    if (!m) return "";
    try { return decodeURIComponent(m[1].replace(/\+/g, " ")); } catch (e) { return m[1]; }
  }
  function initClicks() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      var href = a.getAttribute("href") || "";
      var lower = href.toLowerCase();
      var location_ = a.getAttribute("data-cta") || (a.closest("header") ? "header" : a.closest("footer") ? "footer" : a.closest(".mobile-cta") ? "mobile_bar" : "body");
      if (lower.indexOf("mailto:") === 0) {
        var subj = subjectOf(href);
        var service = a.getAttribute("data-service") || subj.replace(/^(Quote request|Question|Help)\s*-\s*/i, "");
        if (lower.indexOf("mailto:quote@") === 0) track("quote_click", { service: service, subject: subj, cta_location: location_ });
        else if (lower.indexOf("mailto:info@") === 0) track("info_click", { subject: subj, cta_location: location_ });
        else if (lower.indexOf("mailto:help@") === 0) track("help_click", { subject: subj, cta_location: location_ });
      } else if (lower.indexOf("tel:") === 0) {
        track("demo_call_click", { number: href.slice(4), cta_location: location_ });
      } else if (/^(https:\/\/oldvinefrontdesk\.com)?\/preview\/?/.test(href)) {
        track("preview_start", { cta_location: location_ });
      }
    }, true);
  }

  /* ---------- package view ---------- */
  function initPackageView() {
    var els = document.querySelectorAll("[data-track='package-view']");
    if (!els.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          track("package_view", { section: en.target.getAttribute("data-section") || "packages" });
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  /* ---------- scroll depth 50 / 90 ---------- */
  function initScroll() {
    var hit = {};
    var ticking = false;
    function check() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      var pct = (window.scrollY || doc.scrollTop) / max * 100;
      [50, 90].forEach(function (t) { if (pct >= t && !hit[t]) { hit[t] = true; track("scroll_depth", { percent: t }); } });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
  }

  /* ---------- privacy page buttons ---------- */
  function initConsentLinks() {
    var els = document.querySelectorAll("[data-consent-reset]");
    Array.prototype.forEach.call(els, function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); window.ovsResetConsent(); });
    });
    var status = document.getElementById("consent-status");
    if (status) {
      var c = read(KEY);
      status.textContent = !gaConfigured ? "Analytics is not switched on for this site yet."
        : gpc ? "Your browser sends Global Privacy Control, so analytics stays off."
        : c === "granted" ? "You accepted analytics on this browser."
        : c === "denied" ? "You declined analytics on this browser."
        : "You have not made a choice yet, so analytics is off.";
    }
  }

  /* ---------- quote form (/contact/#quote) ---------- */
  function initQuoteForm() {
    var form = document.getElementById("quoteForm");
    if (!form) return;
    var done = document.getElementById("quoteDone");
    var steps = form.querySelectorAll(".qstep");
    var err = form.querySelector(".qerr");
    var to = form.getAttribute("data-to");
    function show(n) {
      Array.prototype.forEach.call(steps, function (st) { st.hidden = st.getAttribute("data-step") !== String(n); });
      err.textContent = "";
    }
    function val(name) { var el = form.elements[name]; return el ? String(el.value || "").trim() : ""; }
    function stage() { var r = form.querySelector("input[name=stage]:checked"); return r ? r.value : ""; }
    function needs() { return Array.prototype.map.call(form.querySelectorAll("input[name=need]:checked"), function (c) { return c.value; }); }
    function tips() {
      var st = stage();
      Array.prototype.forEach.call(form.querySelectorAll(".qtip"), function (t) {
        var k = t.getAttribute("data-tip");
        t.hidden = !((k === "new" && /new/i.test(st)) || (k === "existing" && /open/i.test(st)));
      });
    }
    /* prefill from ?need=, ?service=, ?city= */
    var q = new URLSearchParams(location.search);
    var need = (q.get("need") || "").toLowerCase();
    if (need === "new" || need === "existing") {
      var radio = form.querySelector("input[name=stage][value^='" + (need === "new" ? "Starting" : "Already") + "']");
      if (radio) radio.checked = true;
    }
    var svc = (q.get("service") || "").toLowerCase();
    var map = [[/start-?up|plan|naming|roadmap|research|pricing/, "Business plan or startup help"],
               [/audit|growth/, "Growth Audit ($295)"],
               [/^seo$|local seo/, "Local SEO"], [/^ads$|ad camp/, "Ad campaigns"], [/^design$|graphic/, "Graphic design"],
               [/agent team/, "AI Agent Teams"], [/launch package|^launch$/, "Launch package"], [/brand package/, "Brand package"],
               [/grow package/, "Grow package"], [/^brand$|logo/, "Logo or brand"], [/web/, "Website"],
               [/marketing|social|google/, "Google profile or social"], [/uniform|print|sign|card/, "Cards, uniforms or signs"],
               [/operations|front desk/, "AI Front Desk"], [/care|monthly|management/, "Monthly help"]];
    var boxes = form.querySelectorAll("input[name=need]");
    var tick = function (v) { Array.prototype.forEach.call(boxes, function (c) { if (c.value === v) c.checked = true; }); };
    if (need === "unsure") tick("Not sure yet");
    var exact = null;
    Array.prototype.forEach.call(boxes, function (c) { if (c.value.toLowerCase() === svc) exact = c.value; });
    if (exact) tick(exact);
    else for (var i = 0; svc && i < map.length; i++) { if (map[i][0].test(svc)) { tick(map[i][1]); break; } }
    var item = q.get("item");
    if (item && form.elements.specific) form.elements.specific.value = item.slice(0, 120);
    var city = q.get("city");
    if (city && form.elements.city) {
      Array.prototype.forEach.call(form.elements.city.options, function (o) { if (o.text.toLowerCase() === city.toLowerCase()) o.selected = true; });
    }
    tips();
    show(1);
    if ("IntersectionObserver" in window && document.querySelector(".mobile-cta")) {
      new IntersectionObserver(function (en) { document.body.classList.toggle("form-in-view", en[0].isIntersecting); }, { threshold: 0.05 }).observe(form.parentNode);
    }
    form.addEventListener("change", function (e) { if (e.target.name === "stage") tips(); });
    form.querySelector(".qnext").addEventListener("click", function () {
      if (!stage()) { err.textContent = "Please choose whether you're starting a new business or already open."; return; }
      if (!needs().length) { err.textContent = "Please pick at least one thing you need (or \"Not sure yet\")."; return; }
      show(2);
      var f = document.getElementById("qName"); if (f) f.focus();
    });
    form.querySelector(".qback").addEventListener("click", function () { show(1); });
    var leadSent = false;
    function request() {
      var lines = [
        "Hi Colton,", "",
        "Where I am: " + stage(),
        "What I need: " + needs().join(", "),
        "Target date: " + (val("date") || "-"),
        "Specific service: " + (val("specific") || "-"),
        "Budget: " + (val("budget") || "-"), "",
        "Name: " + val("name"),
        "Business: " + (val("business") || "-"),
        "City: " + val("city"),
        "Email: " + val("email"),
        "Phone: " + (val("phone") || "-"), "",
        "Anything else: " + (val("more") || "-")
      ];
      if (q.get("service")) lines.push("", "Came from: " + q.get("service"));
      if (q.get("item")) lines.push("Item: " + q.get("item"));
      return lines.join("\n");
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!val("name")) { err.textContent = "Please add your name."; form.elements.name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email"))) { err.textContent = "Please add an email address I can reply to."; form.elements.email.focus(); return; }
      var body = request();
      var subject = "Quote request - " + needs().join(", ") + " - " + val("city");
      var href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body.replace(/\n/g, "\r\n"));
      document.getElementById("quoteText").value = body;
      document.getElementById("quoteMail").setAttribute("href", href);
      form.hidden = true;
      done.hidden = false;
      done.focus({ preventScroll: true });
      done.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!leadSent) { leadSent = true; track("generate_lead", { form: "quote", stage: stage(), needs: needs().join(", "), city: val("city") }); }
      window.location.href = href;
    });
    document.getElementById("quoteEdit").addEventListener("click", function () { done.hidden = true; form.hidden = false; show(2); var f = document.getElementById("qName"); if (f) f.focus(); });
    document.getElementById("quoteCopy").addEventListener("click", function () {
      var t = document.getElementById("quoteText"), msg = document.getElementById("quoteCopyMsg");
      var ok = function () { msg.textContent = "Copied. Paste it into an email to " + to + "."; };
      var fail = function () { t.select(); msg.textContent = "Couldn't copy automatically. The text is selected: copy it and email it to " + to + "."; };
      var legacy = function () { var r = false; t.select(); try { r = document.execCommand("copy"); } catch (e) { r = false; } if (r) ok(); else fail(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(ok, legacy);
      else legacy();
    });
  }

  function initPrint() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-print]"), function (b) { b.addEventListener("click", function () { window.print(); }); });
  }

  function init() {
    initTheme();
    initQuoteForm();
    initPrint();
    initMenu();
    initNavDrop();
    initClicks();
    initPackageView();
    initScroll();
    initConsentLinks();
    var c = read(KEY);
    if (c === "granted") loadGA();
    else if (c !== "denied") showNotice();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

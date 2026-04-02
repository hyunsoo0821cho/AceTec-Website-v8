import { c as createComponent } from './astro-component_De_lg6FA.mjs';
import 'piccolore';
import { P as createRenderInstruction, y as maybeRenderHead, a1 as addAttribute, L as renderTemplate, F as Fragment, aY as renderHead, aZ as renderSlot, a_ as defineScriptVars } from './sequence_DNzh4xdL.mjs';
import { s as spreadAttributes, r as renderComponent } from './server_D871Nj9r.mjs';
import 'clsx';
import { v as verifySession, g as getSessionIdFromCookie } from './auth_DGxV5IUQ.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function renderScript(result, id) {
  const inlined = result.inlinedScripts.get(id);
  let content = "";
  if (inlined != null) {
    if (inlined) {
      content = `<script type="module">${inlined}</script>`;
    }
  } else {
    const resolved = await result.resolve(id);
    content = `<script type="module" src="${result.userAssetsBase ? (result.base === "/" ? "" : result.base) + result.userAssetsBase : ""}${resolved}"></script>`;
  }
  return createRenderInstruction({ type: "script", id, content });
}

const $$Header = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Header;
  const { currentPath = "/" } = Astro2.props;
  const navLinks = [
    { href: "/solutions", label: "Solutions" },
    { href: "/applications", label: "Applications" },
    { href: "/about", label: "About" },
    { href: "/history", label: "History" },
    { href: "/contact", label: "Contact" },
    { href: "/login", label: "Login" }
  ];
  return renderTemplate`${maybeRenderHead()}<header class="header" id="mainHeader" data-astro-cid-3ef6ksr2> <a class="site-title" href="/" data-astro-cid-3ef6ksr2>AceTec</a> <nav class="nav-right" aria-label="Main navigation" data-astro-cid-3ef6ksr2> ${navLinks.map(({ href, label }) => renderTemplate`<a${addAttribute(["nav-link", { active: currentPath === href }], "class:list")}${addAttribute(href, "href")}${addAttribute(currentPath === href ? "page" : void 0, "aria-current")} data-astro-cid-3ef6ksr2> ${label} </a>`)} <a class="btn-book" href="/contact" data-astro-cid-3ef6ksr2>Inquiry</a> </nav> <button class="hamburger" id="hamburgerBtn" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu" data-astro-cid-3ef6ksr2> <span data-astro-cid-3ef6ksr2></span><span data-astro-cid-3ef6ksr2></span><span data-astro-cid-3ef6ksr2></span> </button> </header>`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/components/Header.astro", void 0);

const $$MobileMenu = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$MobileMenu;
  const { currentPath = "/" } = Astro2.props;
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/solutions", label: "Solutions" },
    { href: "/applications", label: "Applications" },
    { href: "/about", label: "About" },
    { href: "/history", label: "History" },
    { href: "/contact", label: "Contact" },
    { href: "/login", label: "Login" }
  ];
  return renderTemplate`${maybeRenderHead()}<div class="mobile-menu" id="mobileMenu" role="dialog" aria-label="Mobile navigation" aria-hidden="true" inert data-astro-cid-6aabv5oc> ${navLinks.map(({ href, label }) => renderTemplate`<a${addAttribute(["mob-link", { active: currentPath === href }], "class:list")}${addAttribute(href, "href")} data-astro-cid-6aabv5oc> ${label} </a>`)} <a class="btn-book" href="/contact" data-astro-cid-6aabv5oc>Inquiry</a> </div>`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/components/MobileMenu.astro", void 0);

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Footer;
  let isAdmin = false;
  let d = null;
  try {
    const cookie = Astro2.request.headers.get("cookie");
    isAdmin = !!verifySession(getSessionIdFromCookie(cookie));
    const root = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
    d = JSON.parse(fs.readFileSync(path.join(root, "src", "content", "pages", "footer.json"), "utf-8"));
  } catch {
    d = null;
  }
  function e(p) {
    return isAdmin ? { "data-edit": p } : {};
  }
  return renderTemplate`${maybeRenderHead()}<footer class="site-footer" data-astro-cid-sz7xmlte> <div class="footer-grid" data-astro-cid-sz7xmlte> <div class="footer-col" data-astro-cid-sz7xmlte> <h4 data-astro-cid-sz7xmlte>AceTec</h4> ${d ? renderTemplate`<p${spreadAttributes(e("companyDescription"), void 0, { "class": "astro-sz7xmlte" })} data-astro-cid-sz7xmlte>${d.companyDescription}</p>` : renderTemplate`<p data-astro-cid-sz7xmlte>
Trusted for over 30 years in embedded computing, industrial PCs, and safety-critical systems — serving
            defense, aerospace, railway, and industrial markets.
</p>`} </div> <div class="footer-col" data-astro-cid-sz7xmlte> <h4 data-astro-cid-sz7xmlte>Solutions</h4> <a href="/products/military" data-astro-cid-sz7xmlte>Military &amp; Aerospace</a> <a href="/products/railway" data-astro-cid-sz7xmlte>Rail Transportation</a> <a href="/products/industrial" data-astro-cid-sz7xmlte>Industrial Automation</a> <a href="/products/telecom" data-astro-cid-sz7xmlte>Telecom &amp; Networking</a> <a href="/products/sensor" data-astro-cid-sz7xmlte>Sensor Modeling &amp; Simulation</a> <a href="/products/hpc" data-astro-cid-sz7xmlte>High Performance Computing</a> </div> <div class="footer-col" data-astro-cid-sz7xmlte> <h4 data-astro-cid-sz7xmlte>Company</h4> <a href="/solutions" data-astro-cid-sz7xmlte>Solutions</a> <a href="/applications" data-astro-cid-sz7xmlte>Applications</a> <a href="/about" data-astro-cid-sz7xmlte>About</a> <a href="/history" data-astro-cid-sz7xmlte>History</a> <a href="/contact" data-astro-cid-sz7xmlte>Contact</a> </div> <div class="footer-col" data-astro-cid-sz7xmlte> <h4 data-astro-cid-sz7xmlte>Partners</h4> ${d?.partners ? d.partners.map((p) => renderTemplate`<a${addAttribute(p.url, "href")} target="_blank" rel="noopener" data-astro-cid-sz7xmlte> ${p.name} </a>`) : renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-sz7xmlte": true }, { "default": ($$result2) => renderTemplate` <a href="https://www.abaco.com" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>
Abaco Systems
</a> <a href="https://www.artesyn.com" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>
SMART Embedded Computing
</a> <a href="https://www.onestopsystems.com" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>
OneStopSystems
</a> <a href="https://www.pentek.com" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>
Pentek
</a> <a href="https://www.windriver.com" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>
Wind River
</a> <a href="https://www.oktal-se.fr" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>
OKTAL-SE
</a> <a href="https://www.rti.com" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>
RTI
</a> <a href="https://www.hima.com" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>
HIMA
</a> <a href="https://www.cambridgepixel.com" target="_blank" rel="noopener" data-astro-cid-sz7xmlte>
Cambridge Pixel
</a> ` })}`} </div> <div class="footer-col" data-astro-cid-sz7xmlte> <h4 data-astro-cid-sz7xmlte>Contact</h4> <p data-astro-cid-sz7xmlte> <strong data-astro-cid-sz7xmlte>Seoul HQ</strong><br data-astro-cid-sz7xmlte> <a href="mailto:acetec@acetec-korea.co.kr" data-astro-cid-sz7xmlte>acetec@acetec-korea.co.kr</a><br data-astro-cid-sz7xmlte> <a href="tel:+8224202343" data-astro-cid-sz7xmlte>+82-2-420-2343</a><br data-astro-cid-sz7xmlte>
FAX: +82-2-420-2757
</p> <p data-astro-cid-sz7xmlte> <strong data-astro-cid-sz7xmlte>Daejeon Branch</strong><br data-astro-cid-sz7xmlte>
Rm. 205, Migeon Techno World, 199, Techno 2-ro, Yuseong-gu, Daejeon<br data-astro-cid-sz7xmlte> <a href="tel:+82424712343" data-astro-cid-sz7xmlte>+82-42-471-2343</a><br data-astro-cid-sz7xmlte>
FAX: +82-42-933-2642
</p> </div> </div> <div class="footer-bottom" data-astro-cid-sz7xmlte> ${d?.copyright ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-sz7xmlte": true }, { "default": ($$result2) => renderTemplate`${d.copyright.company} &middot; CEO: ${d.copyright.ceo} &middot; Biz No: ${d.copyright.bizNo}<br data-astro-cid-sz7xmlte>
&copy; ${(/* @__PURE__ */ new Date()).getFullYear()}${d.copyright.company} All rights reserved.
` })}` : renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-sz7xmlte": true }, { "default": ($$result2) => renderTemplate`
AceTec Co., Ltd. &middot; CEO: Jang Jeong Hoon &middot; Biz No: 215-81-68464
<br data-astro-cid-sz7xmlte>
&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} AceTec Co., Ltd. All rights reserved.
` })}`} </div> </footer>`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/components/Footer.astro", void 0);

const $$BackToTop = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<button class="back-to-top" aria-label="Back to top" data-astro-cid-wlspcwf4> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" data-astro-cid-wlspcwf4> <polyline points="18 15 12 9 6 15" data-astro-cid-wlspcwf4></polyline> </svg> </button>`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/components/BackToTop.astro", void 0);

const $$ChatWidget = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div id="chatWidget" class="chat-widget" data-astro-cid-ryytxnzt> <!-- Closed state: floating pill --> <button id="chatPill" class="chat-pill" aria-label="Open AI chat assistant" data-astro-cid-ryytxnzt> <svg class="chat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" data-astro-cid-ryytxnzt> <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" data-astro-cid-ryytxnzt></path> </svg> <span data-astro-cid-ryytxnzt>Ask about our products</span> </button> <!-- Open state: chat panel --> <div id="chatPanel" class="chat-panel" role="dialog" aria-label="AceTec AI Assistant" aria-hidden="true" data-astro-cid-ryytxnzt> <div class="chat-header" data-astro-cid-ryytxnzt> <div class="chat-header-title" data-astro-cid-ryytxnzt> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" data-astro-cid-ryytxnzt> <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" data-astro-cid-ryytxnzt></path> </svg>
AceTec AI Assistant
</div> <button id="chatClose" class="chat-close" aria-label="Close chat" data-astro-cid-ryytxnzt> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" data-astro-cid-ryytxnzt> <line x1="18" y1="6" x2="6" y2="18" data-astro-cid-ryytxnzt></line> <line x1="6" y1="6" x2="18" y2="18" data-astro-cid-ryytxnzt></line> </svg> </button> </div> <div id="chatMessages" class="chat-messages" role="log" aria-live="polite" aria-label="Chat messages" data-astro-cid-ryytxnzt> <div class="chat-msg assistant" data-astro-cid-ryytxnzt> <div class="chat-msg-content" data-astro-cid-ryytxnzt>
Welcome! I'm AceTec's AI assistant. I can help with:
<ul data-astro-cid-ryytxnzt> <li data-astro-cid-ryytxnzt>Product specifications</li> <li data-astro-cid-ryytxnzt>Solution recommendations</li> <li data-astro-cid-ryytxnzt>Company information</li> <li data-astro-cid-ryytxnzt>Contact details</li> </ul> </div> </div> </div> <div class="chat-input-wrap" data-astro-cid-ryytxnzt> <input id="chatInput" type="text" class="chat-input" placeholder="Type your question..." autocomplete="off" maxlength="1000" data-astro-cid-ryytxnzt> <button id="chatSend" class="chat-send" aria-label="Send message" disabled data-astro-cid-ryytxnzt> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" data-astro-cid-ryytxnzt> <line x1="22" y1="2" x2="11" y2="13" data-astro-cid-ryytxnzt></line> <polygon points="22 2 15 22 11 13 2 9 22 2" data-astro-cid-ryytxnzt></polygon> </svg> </button> </div> </div> </div>  <!-- Global styles for dynamically created chat message elements -->  ${renderScript($$result, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/components/ChatWidget.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/components/ChatWidget.astro", void 0);

const $$Base = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Base;
  const {
    title,
    description = "AceTec - Leading provider of embedded computing, industrial PCs, railway safety systems, and defense solutions for mission-critical applications."
  } = Astro2.props;
  const currentPath = Astro2.url.pathname;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><meta name="description"${addAttribute(description, "content")}><meta name="theme-color" content="#0a0a0a"><meta property="og:title"${addAttribute(title, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:type" content="website"><meta name="robots" content="index, follow"><meta name="keywords" content="embedded computing, industrial PC, VPX, VME, HIMA railway, defense solutions, HPC, RTOS, sensor simulation"><link rel="canonical" href="https://www.acetronix.co.kr"><title>${title}</title><link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='12' fill='%230a0a0a'/><text x='50' y='68' text-anchor='middle' font-size='60' font-weight='700' fill='white' font-family='sans-serif'>A</text></svg>"><!-- Fonts self-hosted: see src/styles/fonts.css -->${renderHead()}</head> <body> <a href="#main-content" class="skip-link">Skip to content</a> ${renderComponent($$result, "Header", $$Header, { "currentPath": currentPath })} ${renderComponent($$result, "MobileMenu", $$MobileMenu, { "currentPath": currentPath })} <main id="main-content"> ${renderSlot($$result, $$slots["default"])} </main> ${renderComponent($$result, "Footer", $$Footer, {})} ${renderComponent($$result, "BackToTop", $$BackToTop, {})} ${renderComponent($$result, "ChatWidget", $$ChatWidget, {})} ${renderScript($$result, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/layouts/Base.astro?astro&type=script&index=0&lang.ts")} </body> </html>`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/layouts/Base.astro", void 0);

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$AdminInline = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$AdminInline;
  const { page, isAdmin } = Astro2.props;
  return renderTemplate`${isAdmin && renderTemplate(_a || (_a = __template(["", '<div class="admin-bar" id="adminBar"><div class="admin-bar-inner"><span class="admin-bar-label">Editing: <strong>', `</strong></span><div class="admin-bar-actions"><span class="admin-bar-status" id="adminStatus"></span><button class="admin-btn admin-btn-save" id="adminSave">Save</button><form method="POST" action="/api/auth/logout" style="display:inline;"><button type="submit" class="admin-btn admin-btn-logout">Logout</button></form></div></div></div>
  <input type="file" id="adminImgInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;">

  <style>
    .admin-bar { position:fixed; top:0; left:0; right:0; z-index:99999; background:#1e293b; color:#fff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,.2); }
    .admin-bar-inner { max-width:1400px; margin:0 auto; padding:8px 24px; display:flex; justify-content:space-between; align-items:center; }
    .admin-bar-label { color:#94a3b8; } .admin-bar-label strong { color:#fff; }
    .admin-bar-actions { display:flex; gap:8px; align-items:center; }
    .admin-bar-status { font-size:12px; margin-right:4px; }
    .admin-btn { padding:5px 12px; border:none; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer; text-decoration:none; display:inline-block; color:#fff; }
    .admin-btn-save { background:#2563eb; } .admin-btn-save:hover { background:#1d4ed8; }
    .admin-btn-dash { background:#334155; color:#cbd5e1; } .admin-btn-dash:hover { background:#475569; }
    .admin-btn-logout { background:transparent; color:#94a3b8; border:1px solid #475569; } .admin-btn-logout:hover { color:#fff; border-color:#64748b; }
  </style>

  <script>(function(){`, `
    document.addEventListener('DOMContentLoaded', () => {
      const bar = document.getElementById('adminBar');
      if (!bar) return;
      const barH = bar.offsetHeight;
      document.body.style.paddingTop = barH + 'px';
      const header = document.querySelector('.header, header, #mainHeader');
      if (header) header.style.top = barH + 'px';
      const mm = document.getElementById('mobileMenu');
      if (mm) mm.style.top = barH + 'px';

      // ===== TEXT EDITING =====
      const editables = document.querySelectorAll('[data-edit]');
      editables.forEach(el => {
        el.style.cursor = 'text';
        el.style.transition = 'outline .15s, background .15s';
        el.addEventListener('mouseenter', () => {
          if (!el.isContentEditable) { el.style.outline = '2px dashed #3b82f6'; el.style.outlineOffset = '3px'; }
        });
        el.addEventListener('mouseleave', () => {
          if (!el.isContentEditable) el.style.outline = 'none';
        });
        el.addEventListener('click', (ev) => {
          if (el.isContentEditable) return;
          ev.preventDefault(); ev.stopPropagation();
          el.contentEditable = 'true';
          el.style.outline = '2px solid #2563eb'; el.style.outlineOffset = '3px';
          el.style.background = 'rgba(59,130,246,.06)'; el.style.borderRadius = '4px';
          el.focus();
        });
        el.addEventListener('blur', () => { el.contentEditable = 'false'; el.style.outline = 'none'; el.style.background = ''; });
        el.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { el.contentEditable = 'false'; el.style.outline = 'none'; el.style.background = ''; el.blur(); } });
      });

      // ===== IMAGE EDITING =====
      const imgInput = document.getElementById('adminImgInput');
      let activeImg = null;
      let activePreset = 'product';

      document.querySelectorAll('[data-img]').forEach(imgEl => {
        // Create badge that floats over the image using the image's own position
        const badge = document.createElement('div');
        badge.textContent = '📷 Replace';
        badge.style.cssText = 'position:absolute;bottom:8px;right:8px;background:rgba(37,99,235,.9);color:#fff;font-size:11px;padding:3px 7px;border-radius:4px;z-index:10;opacity:0;transition:opacity .2s;cursor:pointer;pointer-events:none;';

        // Wrap image in a relative container so badge stays on the image
        let wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-block;';

        const imgPos = getComputedStyle(imgEl).position;
        if (imgPos === 'absolute') {
          // Image is absolute (e.g. .p-img with padding-bottom trick) — use parent
          const parent = imgEl.parentElement;
          if (parent) {
            if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
            parent.appendChild(badge);
            wrapper = parent; // reuse existing parent as container
          }
        } else {
          // Normal flow image — wrap it
          imgEl.parentElement?.insertBefore(wrapper, imgEl);
          wrapper.appendChild(imgEl);
          wrapper.appendChild(badge);
        }

        const container = wrapper;

        // Show badge on hover over the container
        container.addEventListener('mouseenter', () => { badge.style.opacity = '1'; badge.style.pointerEvents = 'auto'; });
        container.addEventListener('mouseleave', () => { badge.style.opacity = '0'; badge.style.pointerEvents = 'none'; });

        badge.addEventListener('click', (ev) => {
          ev.preventDefault(); ev.stopPropagation();
          activeImg = imgEl;
          activePreset = imgEl.getAttribute('data-preset') || 'product';
          imgInput.click();
        });
      });

      imgInput?.addEventListener('change', async () => {
        const file = imgInput.files?.[0];
        if (!file || !activeImg) return;
        const status = document.getElementById('adminStatus');
        if (status) { status.textContent = 'Uploading...'; status.style.color = '#fbbf24'; }
        const form = new FormData();
        form.append('image', file);
        form.append('preset', activePreset);
        try {
          const res = await fetch('/api/images/upload', { method: 'POST', body: form });
          const data = await res.json();
          if (!res.ok) { if (status) { status.textContent = data.error; status.style.color = '#f87171'; } return; }
          if (activeImg.tagName === 'IMG') {
            activeImg.src = data.image_path;
          } else {
            // Replace placeholder div with real img
            const newImg = document.createElement('img');
            newImg.src = data.image_path;
            newImg.alt = '';
            newImg.loading = 'lazy';
            newImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';
            newImg.setAttribute('data-img', activeImg.getAttribute('data-img') || '');
            newImg.setAttribute('data-preset', activeImg.getAttribute('data-preset') || 'product');
            activeImg.replaceWith(newImg);
            activeImg = newImg;
          }
          activeImg.setAttribute('data-new-src', data.image_path);
          if (status) { status.textContent = 'Replaced — Save to keep'; status.style.color = '#4ade80'; }
        } catch {
          if (status) { status.textContent = 'Upload failed'; status.style.color = '#f87171'; }
        }
        imgInput.value = '';
      });

      // ===== SAVE =====
      document.getElementById('adminSave')?.addEventListener('click', async () => {
        const status = document.getElementById('adminStatus');
        if (status) { status.textContent = 'Saving...'; status.style.color = '#fbbf24'; }
        const res = await fetch('/api/pages/' + page);
        if (!res.ok) { if (status) { status.textContent = 'Error'; status.style.color = '#f87171'; } return; }
        const data = await res.json();
        editables.forEach(el => {
          const p = el.getAttribute('data-edit');
          if (p) setByPath(data, p, el.innerText.trim());
        });
        document.querySelectorAll('[data-img][data-new-src]').forEach(im => {
          const p = im.getAttribute('data-img');
          const s = im.getAttribute('data-new-src');
          if (p && s) { setByPath(data, p, s); im.removeAttribute('data-new-src'); }
        });
        const saveRes = await fetch('/api/pages/' + page, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (status) {
          if (saveRes.ok) { status.textContent = 'Saved!'; status.style.color = '#4ade80'; setTimeout(() => { status.textContent = ''; }, 2000); }
          else { status.textContent = 'Failed'; status.style.color = '#f87171'; }
        }
      });

      // ===== ADD / DELETE =====
      document.querySelectorAll('[data-admin-add]').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const arrayPath = btn.getAttribute('data-admin-add');
          const template = btn.getAttribute('data-admin-template');
          if (!arrayPath) return;

          const status = document.getElementById('adminStatus');
          if (status) { status.textContent = 'Adding...'; status.style.color = '#fbbf24'; }

          const res = await fetch('/api/pages/' + page);
          if (!res.ok) return;
          const data = await res.json();

          const arr = getByPath(data, arrayPath);
          if (!Array.isArray(arr)) return;

          // Parse template or use sensible default
          const newItem = template ? JSON.parse(template) : { title: 'New Item', description: '' };

          // If new item has empty image, try to pick a random one from existing items
          if (newItem.image === '' && arr.length > 0) {
            const existingImages = arr.map(item => item.image).filter(Boolean);
            if (existingImages.length > 0) {
              newItem.image = existingImages[Math.floor(Math.random() * existingImages.length)];
            }
          }

          const prepend = btn.getAttribute('data-admin-prepend') === 'true';
          if (prepend) { arr.unshift(newItem); } else { arr.push(newItem); }

          const saveRes = await fetch('/api/pages/' + page, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (saveRes.ok) {
            window.location.reload();
          } else if (status) {
            status.textContent = 'Add failed'; status.style.color = '#f87171';
          }
        });
      });

      document.querySelectorAll('[data-admin-delete]').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
          ev.preventDefault(); ev.stopPropagation();
          if (!confirm('Delete this item?')) return;

          const itemPath = btn.getAttribute('data-admin-delete');
          if (!itemPath) return;

          // Parse "solutionCards[2]" → arrayPath="solutionCards", index=2
          const match = itemPath.match(/^(.+)\\[(\\d+)\\]$/);
          if (!match) return;
          const [, arrayPath, indexStr] = match;
          const index = parseInt(indexStr);

          const status = document.getElementById('adminStatus');
          if (status) { status.textContent = 'Deleting...'; status.style.color = '#fbbf24'; }

          const res = await fetch('/api/pages/' + page);
          if (!res.ok) return;
          const data = await res.json();

          const arr = getByPath(data, arrayPath);
          if (!Array.isArray(arr) || index >= arr.length) return;
          arr.splice(index, 1);

          const saveRes = await fetch('/api/pages/' + page, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (saveRes.ok) {
            window.location.reload();
          } else if (status) {
            status.textContent = 'Delete failed'; status.style.color = '#f87171';
          }
        });
      });

      function getByPath(obj, pathStr) {
        const parts = pathStr.replace(/\\[(\\d+)\\]/g, '.$1').split('.');
        let current = obj;
        for (const part of parts) {
          const key = isNaN(part) ? part : parseInt(part);
          current = current[key];
          if (current === undefined) return undefined;
        }
        return current;
      }

      function setByPath(obj, pathStr, value) {
        const parts = pathStr.replace(/\\[(\\d+)\\]/g, '.$1').split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const key = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
          current = current[key];
        }
        const lastKey = isNaN(parts[parts.length - 1]) ? parts[parts.length - 1] : parseInt(parts[parts.length - 1]);
        current[lastKey] = value;
      }
    });
  })();<\/script>`], ["", '<div class="admin-bar" id="adminBar"><div class="admin-bar-inner"><span class="admin-bar-label">Editing: <strong>', `</strong></span><div class="admin-bar-actions"><span class="admin-bar-status" id="adminStatus"></span><button class="admin-btn admin-btn-save" id="adminSave">Save</button><form method="POST" action="/api/auth/logout" style="display:inline;"><button type="submit" class="admin-btn admin-btn-logout">Logout</button></form></div></div></div>
  <input type="file" id="adminImgInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none;">

  <style>
    .admin-bar { position:fixed; top:0; left:0; right:0; z-index:99999; background:#1e293b; color:#fff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,.2); }
    .admin-bar-inner { max-width:1400px; margin:0 auto; padding:8px 24px; display:flex; justify-content:space-between; align-items:center; }
    .admin-bar-label { color:#94a3b8; } .admin-bar-label strong { color:#fff; }
    .admin-bar-actions { display:flex; gap:8px; align-items:center; }
    .admin-bar-status { font-size:12px; margin-right:4px; }
    .admin-btn { padding:5px 12px; border:none; border-radius:4px; font-size:12px; font-weight:600; cursor:pointer; text-decoration:none; display:inline-block; color:#fff; }
    .admin-btn-save { background:#2563eb; } .admin-btn-save:hover { background:#1d4ed8; }
    .admin-btn-dash { background:#334155; color:#cbd5e1; } .admin-btn-dash:hover { background:#475569; }
    .admin-btn-logout { background:transparent; color:#94a3b8; border:1px solid #475569; } .admin-btn-logout:hover { color:#fff; border-color:#64748b; }
  </style>

  <script>(function(){`, `
    document.addEventListener('DOMContentLoaded', () => {
      const bar = document.getElementById('adminBar');
      if (!bar) return;
      const barH = bar.offsetHeight;
      document.body.style.paddingTop = barH + 'px';
      const header = document.querySelector('.header, header, #mainHeader');
      if (header) header.style.top = barH + 'px';
      const mm = document.getElementById('mobileMenu');
      if (mm) mm.style.top = barH + 'px';

      // ===== TEXT EDITING =====
      const editables = document.querySelectorAll('[data-edit]');
      editables.forEach(el => {
        el.style.cursor = 'text';
        el.style.transition = 'outline .15s, background .15s';
        el.addEventListener('mouseenter', () => {
          if (!el.isContentEditable) { el.style.outline = '2px dashed #3b82f6'; el.style.outlineOffset = '3px'; }
        });
        el.addEventListener('mouseleave', () => {
          if (!el.isContentEditable) el.style.outline = 'none';
        });
        el.addEventListener('click', (ev) => {
          if (el.isContentEditable) return;
          ev.preventDefault(); ev.stopPropagation();
          el.contentEditable = 'true';
          el.style.outline = '2px solid #2563eb'; el.style.outlineOffset = '3px';
          el.style.background = 'rgba(59,130,246,.06)'; el.style.borderRadius = '4px';
          el.focus();
        });
        el.addEventListener('blur', () => { el.contentEditable = 'false'; el.style.outline = 'none'; el.style.background = ''; });
        el.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { el.contentEditable = 'false'; el.style.outline = 'none'; el.style.background = ''; el.blur(); } });
      });

      // ===== IMAGE EDITING =====
      const imgInput = document.getElementById('adminImgInput');
      let activeImg = null;
      let activePreset = 'product';

      document.querySelectorAll('[data-img]').forEach(imgEl => {
        // Create badge that floats over the image using the image's own position
        const badge = document.createElement('div');
        badge.textContent = '📷 Replace';
        badge.style.cssText = 'position:absolute;bottom:8px;right:8px;background:rgba(37,99,235,.9);color:#fff;font-size:11px;padding:3px 7px;border-radius:4px;z-index:10;opacity:0;transition:opacity .2s;cursor:pointer;pointer-events:none;';

        // Wrap image in a relative container so badge stays on the image
        let wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-block;';

        const imgPos = getComputedStyle(imgEl).position;
        if (imgPos === 'absolute') {
          // Image is absolute (e.g. .p-img with padding-bottom trick) — use parent
          const parent = imgEl.parentElement;
          if (parent) {
            if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
            parent.appendChild(badge);
            wrapper = parent; // reuse existing parent as container
          }
        } else {
          // Normal flow image — wrap it
          imgEl.parentElement?.insertBefore(wrapper, imgEl);
          wrapper.appendChild(imgEl);
          wrapper.appendChild(badge);
        }

        const container = wrapper;

        // Show badge on hover over the container
        container.addEventListener('mouseenter', () => { badge.style.opacity = '1'; badge.style.pointerEvents = 'auto'; });
        container.addEventListener('mouseleave', () => { badge.style.opacity = '0'; badge.style.pointerEvents = 'none'; });

        badge.addEventListener('click', (ev) => {
          ev.preventDefault(); ev.stopPropagation();
          activeImg = imgEl;
          activePreset = imgEl.getAttribute('data-preset') || 'product';
          imgInput.click();
        });
      });

      imgInput?.addEventListener('change', async () => {
        const file = imgInput.files?.[0];
        if (!file || !activeImg) return;
        const status = document.getElementById('adminStatus');
        if (status) { status.textContent = 'Uploading...'; status.style.color = '#fbbf24'; }
        const form = new FormData();
        form.append('image', file);
        form.append('preset', activePreset);
        try {
          const res = await fetch('/api/images/upload', { method: 'POST', body: form });
          const data = await res.json();
          if (!res.ok) { if (status) { status.textContent = data.error; status.style.color = '#f87171'; } return; }
          if (activeImg.tagName === 'IMG') {
            activeImg.src = data.image_path;
          } else {
            // Replace placeholder div with real img
            const newImg = document.createElement('img');
            newImg.src = data.image_path;
            newImg.alt = '';
            newImg.loading = 'lazy';
            newImg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';
            newImg.setAttribute('data-img', activeImg.getAttribute('data-img') || '');
            newImg.setAttribute('data-preset', activeImg.getAttribute('data-preset') || 'product');
            activeImg.replaceWith(newImg);
            activeImg = newImg;
          }
          activeImg.setAttribute('data-new-src', data.image_path);
          if (status) { status.textContent = 'Replaced — Save to keep'; status.style.color = '#4ade80'; }
        } catch {
          if (status) { status.textContent = 'Upload failed'; status.style.color = '#f87171'; }
        }
        imgInput.value = '';
      });

      // ===== SAVE =====
      document.getElementById('adminSave')?.addEventListener('click', async () => {
        const status = document.getElementById('adminStatus');
        if (status) { status.textContent = 'Saving...'; status.style.color = '#fbbf24'; }
        const res = await fetch('/api/pages/' + page);
        if (!res.ok) { if (status) { status.textContent = 'Error'; status.style.color = '#f87171'; } return; }
        const data = await res.json();
        editables.forEach(el => {
          const p = el.getAttribute('data-edit');
          if (p) setByPath(data, p, el.innerText.trim());
        });
        document.querySelectorAll('[data-img][data-new-src]').forEach(im => {
          const p = im.getAttribute('data-img');
          const s = im.getAttribute('data-new-src');
          if (p && s) { setByPath(data, p, s); im.removeAttribute('data-new-src'); }
        });
        const saveRes = await fetch('/api/pages/' + page, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (status) {
          if (saveRes.ok) { status.textContent = 'Saved!'; status.style.color = '#4ade80'; setTimeout(() => { status.textContent = ''; }, 2000); }
          else { status.textContent = 'Failed'; status.style.color = '#f87171'; }
        }
      });

      // ===== ADD / DELETE =====
      document.querySelectorAll('[data-admin-add]').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
          ev.preventDefault();
          const arrayPath = btn.getAttribute('data-admin-add');
          const template = btn.getAttribute('data-admin-template');
          if (!arrayPath) return;

          const status = document.getElementById('adminStatus');
          if (status) { status.textContent = 'Adding...'; status.style.color = '#fbbf24'; }

          const res = await fetch('/api/pages/' + page);
          if (!res.ok) return;
          const data = await res.json();

          const arr = getByPath(data, arrayPath);
          if (!Array.isArray(arr)) return;

          // Parse template or use sensible default
          const newItem = template ? JSON.parse(template) : { title: 'New Item', description: '' };

          // If new item has empty image, try to pick a random one from existing items
          if (newItem.image === '' && arr.length > 0) {
            const existingImages = arr.map(item => item.image).filter(Boolean);
            if (existingImages.length > 0) {
              newItem.image = existingImages[Math.floor(Math.random() * existingImages.length)];
            }
          }

          const prepend = btn.getAttribute('data-admin-prepend') === 'true';
          if (prepend) { arr.unshift(newItem); } else { arr.push(newItem); }

          const saveRes = await fetch('/api/pages/' + page, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (saveRes.ok) {
            window.location.reload();
          } else if (status) {
            status.textContent = 'Add failed'; status.style.color = '#f87171';
          }
        });
      });

      document.querySelectorAll('[data-admin-delete]').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
          ev.preventDefault(); ev.stopPropagation();
          if (!confirm('Delete this item?')) return;

          const itemPath = btn.getAttribute('data-admin-delete');
          if (!itemPath) return;

          // Parse "solutionCards[2]" → arrayPath="solutionCards", index=2
          const match = itemPath.match(/^(.+)\\\\[(\\\\d+)\\\\]$/);
          if (!match) return;
          const [, arrayPath, indexStr] = match;
          const index = parseInt(indexStr);

          const status = document.getElementById('adminStatus');
          if (status) { status.textContent = 'Deleting...'; status.style.color = '#fbbf24'; }

          const res = await fetch('/api/pages/' + page);
          if (!res.ok) return;
          const data = await res.json();

          const arr = getByPath(data, arrayPath);
          if (!Array.isArray(arr) || index >= arr.length) return;
          arr.splice(index, 1);

          const saveRes = await fetch('/api/pages/' + page, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (saveRes.ok) {
            window.location.reload();
          } else if (status) {
            status.textContent = 'Delete failed'; status.style.color = '#f87171';
          }
        });
      });

      function getByPath(obj, pathStr) {
        const parts = pathStr.replace(/\\\\[(\\\\d+)\\\\]/g, '.$1').split('.');
        let current = obj;
        for (const part of parts) {
          const key = isNaN(part) ? part : parseInt(part);
          current = current[key];
          if (current === undefined) return undefined;
        }
        return current;
      }

      function setByPath(obj, pathStr, value) {
        const parts = pathStr.replace(/\\\\[(\\\\d+)\\\\]/g, '.$1').split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const key = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
          current = current[key];
        }
        const lastKey = isNaN(parts[parts.length - 1]) ? parts[parts.length - 1] : parseInt(parts[parts.length - 1]);
        current[lastKey] = value;
      }
    });
  })();<\/script>`])), maybeRenderHead(), page, defineScriptVars({ page }))}`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/components/AdminInline.astro", void 0);

export { $$Base as $, $$AdminInline as a, renderScript as r };

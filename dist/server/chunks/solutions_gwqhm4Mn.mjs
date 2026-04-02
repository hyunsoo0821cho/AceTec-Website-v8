import { r as renderComponent, s as spreadAttributes } from './server_D871Nj9r.mjs';
import { $ as $$Base, a as $$AdminInline } from './AdminInline_BKfvlk5U.mjs';
import { $ as $$ContactForm } from './ContactForm_YJAqOQ2K.mjs';
import { v as verifySession, g as getSessionIdFromCookie } from './auth_DGxV5IUQ.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { c as createComponent } from './astro-component_De_lg6FA.mjs';
import { L as renderTemplate, y as maybeRenderHead, a1 as addAttribute } from './sequence_DNzh4xdL.mjs';

const prerender = false;
const $$Solutions = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Solutions;
  const cookie = Astro2.request.headers.get("cookie");
  const isAdmin = !!verifySession(getSessionIdFromCookie(cookie));
  const root = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
  const d = JSON.parse(fs.readFileSync(path.join(root, "src", "content", "pages", "solutions.json"), "utf-8"));
  const home = JSON.parse(fs.readFileSync(path.join(root, "src", "content", "pages", "home.json"), "utf-8"));
  const cards = home.solutionCards;
  function e(p) {
    return isAdmin ? { "data-edit": p } : {};
  }
  function img(p, preset) {
    return isAdmin ? { "data-img": p, "data-preset": preset } : {};
  }
  return renderTemplate`${renderComponent($$result, "Base", $$Base, { "title": "Solutions - AceTec", "data-astro-cid-6dt247gv": true }, { "default": ($$result2) => renderTemplate`  ${renderComponent($$result2, "AdminInline", $$AdminInline, { "page": "home", "isAdmin": isAdmin, "data-astro-cid-6dt247gv": true })} ${maybeRenderHead()}<section class="section pt-page" data-astro-cid-6dt247gv> <div class="container" data-astro-cid-6dt247gv> <div class="svc-header-grid" data-astro-cid-6dt247gv> <h1 class="text-6xl" data-astro-cid-6dt247gv>${d.title}</h1> <p class="text-lg" data-astro-cid-6dt247gv>${d.description}</p> </div> <div class="svc-cards" data-astro-cid-6dt247gv> ${cards.map((item, i) => renderTemplate`<a${addAttribute(item.href, "href")} class="s-card" style="position:relative;" data-astro-cid-6dt247gv> ${isAdmin && renderTemplate`<button class="admin-delete-btn"${addAttribute(`solutionCards[${i}]`, "data-admin-delete")} title="Delete" data-astro-cid-6dt247gv>
&times;
</button>`} ${item.image ? renderTemplate`<img${addAttribute(item.image, "src")}${addAttribute(item.title, "alt")} loading="lazy"${spreadAttributes(img(`solutionCards[${i}].image`, "service"), void 0, { "class": "astro-6dt247gv" })} data-astro-cid-6dt247gv>` : renderTemplate`<div class="img-placeholder"${spreadAttributes(img(`solutionCards[${i}].image`, "service"))} data-astro-cid-6dt247gv>
Click to add image
</div>`} <h3${spreadAttributes(e(`solutionCards[${i}].title`), void 0, { "class": "astro-6dt247gv" })} data-astro-cid-6dt247gv>${item.title}</h3> <div class="s-price"${spreadAttributes(e(`solutionCards[${i}].subtitle`))} data-astro-cid-6dt247gv> ${item.subtitle} </div> <p${spreadAttributes(e(`solutionCards[${i}].description`), void 0, { "class": "astro-6dt247gv" })} data-astro-cid-6dt247gv>${item.description}</p> </a>`)} </div> ${isAdmin && renderTemplate`<button class="admin-add-btn" data-admin-add="solutionCards" data-admin-template="{&quot;title&quot;:&quot;New Solution&quot;,&quot;subtitle&quot;:&quot;Description&quot;,&quot;description&quot;:&quot;Details here&quot;,&quot;href&quot;:&quot;/solutions&quot;,&quot;image&quot;:&quot;&quot;}" style="margin-top:16px;" data-astro-cid-6dt247gv>
+ Add Solution
</button>`} </div> </section> <section class="contact-bright section" data-astro-cid-6dt247gv> <div class="container" data-astro-cid-6dt247gv> <div class="contact-grid" data-astro-cid-6dt247gv> <div class="contact-txt" data-astro-cid-6dt247gv> <h2${spreadAttributes(e("quoteCta.title"), void 0, { "class": "astro-6dt247gv" })} data-astro-cid-6dt247gv>${d.quoteCta.title}</h2> <p${spreadAttributes(e("quoteCta.description"), void 0, { "class": "astro-6dt247gv" })} data-astro-cid-6dt247gv>${d.quoteCta.description}</p> </div> ${renderComponent($$result2, "ContactForm", $$ContactForm, { "prefix": "svc", "data-astro-cid-6dt247gv": true })} </div> </div> </section> ` })}`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/solutions.astro", void 0);

const $$file = "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/solutions.astro";
const $$url = "/solutions";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Solutions,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

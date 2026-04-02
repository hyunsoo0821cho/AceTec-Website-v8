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
const $$Contact = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Contact;
  const cookie = Astro2.request.headers.get("cookie");
  const isAdmin = !!verifySession(getSessionIdFromCookie(cookie));
  const root = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
  const d = JSON.parse(fs.readFileSync(path.join(root, "src", "content", "pages", "contact.json"), "utf-8"));
  function e(p) {
    return isAdmin ? { "data-edit": p } : {};
  }
  function img(p, preset) {
    return isAdmin ? { "data-img": p, "data-preset": preset } : {};
  }
  const hq = d.offices[0];
  const branch = d.offices[1];
  return renderTemplate`${renderComponent($$result, "Base", $$Base, { "title": "Contact Us - AceTec", "data-astro-cid-uw5kdbxl": true }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AdminInline", $$AdminInline, { "page": "contact", "isAdmin": isAdmin, "data-astro-cid-uw5kdbxl": true })} ${maybeRenderHead()}<section class="section pt-page" data-astro-cid-uw5kdbxl> <div class="container" data-astro-cid-uw5kdbxl> <div class="contact-page-grid" data-astro-cid-uw5kdbxl> <div data-astro-cid-uw5kdbxl> <h1 class="heading-page"${spreadAttributes(e("title"))} data-astro-cid-uw5kdbxl>${d.title}</h1> <p class="heading-sub-sm"${spreadAttributes(e("subtitle"))} data-astro-cid-uw5kdbxl>${d.subtitle}</p> ${renderComponent($$result2, "ContactForm", $$ContactForm, { "prefix": "ct", "data-astro-cid-uw5kdbxl": true })} <div class="contact-offices" data-astro-cid-uw5kdbxl> <div class="contact-office" data-astro-cid-uw5kdbxl> <h3${spreadAttributes(e("offices[0].name"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${hq.name}</h3> <p${spreadAttributes(e("offices[0].address"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${hq.address}</p> <ul class="contact-info-list" data-astro-cid-uw5kdbxl> <li data-astro-cid-uw5kdbxl><a${addAttribute(`mailto:${hq.email}`, "href")} class="link-underline"${spreadAttributes(e("offices[0].email"))} data-astro-cid-uw5kdbxl>${hq.email}</a></li> <li data-astro-cid-uw5kdbxl> <a${addAttribute(`tel:${hq.tel.replace(/-/g, "")}`, "href")} class="link-underline" data-astro-cid-uw5kdbxl>TEL: <span${spreadAttributes(e("offices[0].tel"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${hq.tel}</span></a> </li> <li data-astro-cid-uw5kdbxl>FAX: <span${spreadAttributes(e("offices[0].fax"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${hq.fax}</span></li> </ul> </div> <div class="contact-office" data-astro-cid-uw5kdbxl> <h3${spreadAttributes(e("offices[1].name"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${branch.name}</h3> <p${spreadAttributes(e("offices[1].address"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${branch.address}</p> <ul class="contact-info-list" data-astro-cid-uw5kdbxl> <li data-astro-cid-uw5kdbxl> <a${addAttribute(`tel:${branch.tel.replace(/-/g, "")}`, "href")} class="link-underline" data-astro-cid-uw5kdbxl>TEL: <span${spreadAttributes(e("offices[1].tel"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${branch.tel}</span></a> </li> <li data-astro-cid-uw5kdbxl>FAX: <span${spreadAttributes(e("offices[1].fax"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${branch.fax}</span></li> </ul> </div> </div> </div> <div data-astro-cid-uw5kdbxl> <div class="overflow-hidden" data-astro-cid-uw5kdbxl> <img src="/images/plans/plan-premium.png" alt="Contact us" class="img-cover" loading="lazy"${spreadAttributes(img("image", "hero"))} data-astro-cid-uw5kdbxl> </div> ${hq.directions && renderTemplate`<div class="contact-directions" data-astro-cid-uw5kdbxl> <h4 data-astro-cid-uw5kdbxl>Directions</h4> <p data-astro-cid-uw5kdbxl> <strong data-astro-cid-uw5kdbxl>Subway:</strong> <span${spreadAttributes(e("offices[0].directions.subway"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${hq.directions.subway}</span> </p> <p data-astro-cid-uw5kdbxl> <strong data-astro-cid-uw5kdbxl>By car:</strong> <span${spreadAttributes(e("offices[0].directions.car"), void 0, { "class": "astro-uw5kdbxl" })} data-astro-cid-uw5kdbxl>${hq.directions.car}</span> </p> </div>`} </div> </div> </div> </section> ` })}`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/contact.astro", void 0);

const $$file = "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/contact.astro";
const $$url = "/contact";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Contact,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

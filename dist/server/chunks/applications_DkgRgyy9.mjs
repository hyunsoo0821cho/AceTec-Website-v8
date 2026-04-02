import { r as renderComponent, s as spreadAttributes } from './server_D871Nj9r.mjs';
import { $ as $$Base, r as renderScript, a as $$AdminInline } from './AdminInline_BKfvlk5U.mjs';
import { v as verifySession, g as getSessionIdFromCookie } from './auth_DGxV5IUQ.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { c as createComponent } from './astro-component_De_lg6FA.mjs';
import { L as renderTemplate, y as maybeRenderHead, a1 as addAttribute } from './sequence_DNzh4xdL.mjs';

const prerender = false;
const $$Applications = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Applications;
  const cookie = Astro2.request.headers.get("cookie");
  const isAdmin = !!verifySession(getSessionIdFromCookie(cookie));
  const root = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
  const d = JSON.parse(fs.readFileSync(path.join(root, "src", "content", "pages", "applications.json"), "utf-8"));
  function e(p) {
    return isAdmin ? { "data-edit": p } : {};
  }
  function img(p, preset) {
    return isAdmin ? { "data-img": p, "data-preset": preset } : {};
  }
  return renderTemplate`${renderComponent($$result, "Base", $$Base, { "title": "Applications - AceTec", "description": d.description, "data-astro-cid-tcdz5dip": true }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "AdminInline", $$AdminInline, { "page": "applications", "isAdmin": isAdmin, "data-astro-cid-tcdz5dip": true })} ${maybeRenderHead()}<div class="course-hero" data-astro-cid-tcdz5dip> <img${addAttribute(d.image, "src")} alt="Applications"${spreadAttributes(img("image", "hero"), void 0, { "class": "astro-tcdz5dip" })} data-astro-cid-tcdz5dip> </div> <div class="course-main" data-astro-cid-tcdz5dip> <h1${spreadAttributes(e("title"), void 0, { "class": "astro-tcdz5dip" })} data-astro-cid-tcdz5dip>${d.title}</h1> <p${spreadAttributes(e("description"), void 0, { "class": "astro-tcdz5dip" })} data-astro-cid-tcdz5dip>${d.description}</p> <a href="/contact" class="btn-primary" data-astro-cid-tcdz5dip>BOOK A CONSULTATION</a> </div> <div class="ch-list" role="region" aria-label="Application areas" data-astro-cid-tcdz5dip> ${d.chapters.map((ch, ci) => renderTemplate`<div class="ch-item" style="position:relative;" data-astro-cid-tcdz5dip> ${isAdmin && renderTemplate`<button class="admin-delete-btn"${addAttribute(`chapters[${ci}]`, "data-admin-delete")} title="Delete chapter" data-astro-cid-tcdz5dip>
&times;
</button>`} <div class="ch-head"${addAttribute(`ch${ci + 1}-head`, "id")} role="button" tabindex="0" aria-expanded="false"${addAttribute(`ch${ci + 1}-body`, "aria-controls")} data-astro-cid-tcdz5dip> <div data-astro-cid-tcdz5dip> <h3${spreadAttributes(e(`chapters[${ci}].title`), void 0, { "class": "astro-tcdz5dip" })} data-astro-cid-tcdz5dip>${ch.title}</h3> <small class="chapter-meta"${spreadAttributes(e(`chapters[${ci}].meta`))} data-astro-cid-tcdz5dip> ${ch.meta} </small> </div> <span class="chev" aria-hidden="true" data-astro-cid-tcdz5dip>
▼
</span> </div> <div class="ch-body"${addAttribute(`ch${ci + 1}-body`, "id")} role="region"${addAttribute(`ch${ci + 1}-head`, "aria-labelledby")} data-astro-cid-tcdz5dip> ${ch.lessons.map((lesson, li) => renderTemplate`<div class="lesson" tabindex="0" role="button" data-action="lesson" style="position:relative;" data-astro-cid-tcdz5dip> ${isAdmin && renderTemplate`<button class="admin-delete-btn"${addAttribute(`chapters[${ci}].lessons[${li}]`, "data-admin-delete")} title="Delete" data-astro-cid-tcdz5dip>
&times;
</button>`} <div data-astro-cid-tcdz5dip> <h4${spreadAttributes(e(`chapters[${ci}].lessons[${li}].title`), void 0, { "class": "astro-tcdz5dip" })} data-astro-cid-tcdz5dip>${lesson.title}</h4> <p${spreadAttributes(e(`chapters[${ci}].lessons[${li}].description`), void 0, { "class": "astro-tcdz5dip" })} data-astro-cid-tcdz5dip>${lesson.description}</p> </div> <span class="lesson-t"${spreadAttributes(e(`chapters[${ci}].lessons[${li}].tag`))} data-astro-cid-tcdz5dip> ${lesson.tag} </span> </div>`)} ${isAdmin && renderTemplate`<button class="admin-add-btn"${addAttribute(`chapters[${ci}].lessons`, "data-admin-add")} data-admin-template="{&quot;title&quot;:&quot;New Application&quot;,&quot;description&quot;:&quot;Description&quot;,&quot;tag&quot;:&quot;Partner&quot;}" style="margin:8px 0;" data-astro-cid-tcdz5dip>
+ Add Application
</button>`} ${ch.sections.map((sec, si) => renderTemplate`<div class="ref-block" data-astro-cid-tcdz5dip> <h5${spreadAttributes(e(`chapters[${ci}].sections[${si}].title`), void 0, { "class": "astro-tcdz5dip" })} data-astro-cid-tcdz5dip>${sec.title}</h5> <ul class="ref-list" data-astro-cid-tcdz5dip> ${sec.items.map((item, ii) => renderTemplate`<li${spreadAttributes(e(`chapters[${ci}].sections[${si}].items[${ii}]`), void 0, { "class": "astro-tcdz5dip" })} data-astro-cid-tcdz5dip>${item}</li>`)} </ul> </div>`)} </div> </div>`)} ${isAdmin && renderTemplate`<button class="admin-add-btn" data-admin-add="chapters" data-admin-template="{&quot;title&quot;:&quot;New Chapter&quot;,&quot;meta&quot;:&quot;Category&quot;,&quot;lessons&quot;:[],&quot;sections&quot;:[]}" style="margin:16px 24px;" data-astro-cid-tcdz5dip>
+ Add Chapter
</button>`} </div> <section class="faq-sec" data-astro-cid-tcdz5dip> <div class="faq-grid" data-astro-cid-tcdz5dip> <h2 data-astro-cid-tcdz5dip>FAQs</h2> <div data-astro-cid-tcdz5dip> <div class="acc" role="region" aria-label="Frequently asked questions" data-astro-cid-tcdz5dip> ${d.faqs.map((faq, fi) => renderTemplate`<div${addAttribute(`acc-item${fi === 0 ? " open" : ""}`, "class")} style="position:relative;" data-astro-cid-tcdz5dip> ${isAdmin && renderTemplate`<button class="admin-delete-btn"${addAttribute(`faqs[${fi}]`, "data-admin-delete")} title="Delete" data-astro-cid-tcdz5dip>
&times;
</button>`} <div class="acc-title"${addAttribute(`faq-q${fi + 1}`, "id")} role="button" tabindex="0"${addAttribute(fi === 0 ? "true" : "false", "aria-expanded")}${addAttribute(`faq-a${fi + 1}`, "aria-controls")} data-astro-cid-tcdz5dip> <span${spreadAttributes(e(`faqs[${fi}].question`), void 0, { "class": "astro-tcdz5dip" })} data-astro-cid-tcdz5dip>${faq.question}</span>${" "} <span class="icon" aria-hidden="true" data-astro-cid-tcdz5dip>
+
</span> </div> <div class="acc-body"${addAttribute(`faq-a${fi + 1}`, "id")} role="region"${addAttribute(`faq-q${fi + 1}`, "aria-labelledby")}${spreadAttributes(e(`faqs[${fi}].answer`))} data-astro-cid-tcdz5dip> ${faq.answer} </div> </div>`)} ${isAdmin && renderTemplate`<button class="admin-add-btn" data-admin-add="faqs" data-admin-template="{&quot;question&quot;:&quot;New Question&quot;,&quot;answer&quot;:&quot;Answer here&quot;}" data-astro-cid-tcdz5dip>
+ Add FAQ
</button>`} </div> </div> </div> </section> ` })}  ${renderScript($$result, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/applications.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/applications.astro", void 0);

const $$file = "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/applications.astro";
const $$url = "/applications";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Applications,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

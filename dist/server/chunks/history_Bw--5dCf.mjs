import { c as createComponent } from './astro-component_De_lg6FA.mjs';
import 'piccolore';
import { y as maybeRenderHead, a1 as addAttribute, L as renderTemplate } from './sequence_DNzh4xdL.mjs';
import { s as spreadAttributes, r as renderComponent } from './server_D871Nj9r.mjs';
import { $ as $$Base, r as renderScript, a as $$AdminInline } from './AdminInline_BKfvlk5U.mjs';
import { v as verifySession, g as getSessionIdFromCookie } from './auth_DGxV5IUQ.mjs';
import 'clsx';
import fs from 'fs';
import path from 'path';

const $$HistoryYearGroup = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$HistoryYearGroup;
  const { year, months, isAdmin = false, periodIndex = 0, yearIndex = 0 } = Astro2.props;
  function e(p) {
    return isAdmin ? { "data-edit": p } : {};
  }
  return renderTemplate`${maybeRenderHead()}<div class="history-year-group"> <h2 class="history-year">${year}</h2> <div class="history-entries"> ${months.map((m, mi) => renderTemplate`<div class="h-month-group"> <div class="h-month">${m.month}</div> <div class="h-month-items"> ${m.entries.map((entry, ei) => renderTemplate`<div class="h-entry" style="position:relative;"> ${isAdmin && renderTemplate`<button class="admin-delete-btn"${addAttribute(`periods[${periodIndex}].years[${yearIndex}].months[${mi}].entries[${ei}]`, "data-admin-delete")} title="Delete" style="top:4px;right:4px;">
&times;
</button>`} <p${spreadAttributes(e(`periods[${periodIndex}].years[${yearIndex}].months[${mi}].entries[${ei}]`))}>${entry}</p> </div>`)} ${isAdmin && renderTemplate`<button class="admin-add-btn"${addAttribute(`periods[${periodIndex}].years[${yearIndex}].months[${mi}].entries`, "data-admin-add")} data-admin-template="&quot;New entry&quot;" style="padding:8px;font-size:12px;margin:4px 0;">
+ Add Entry
</button>`} </div> </div>`)} ${isAdmin && renderTemplate`<button class="admin-add-btn"${addAttribute(`periods[${periodIndex}].years[${yearIndex}].months`, "data-admin-add")} data-admin-template="{&quot;month&quot;:&quot;Jan.&quot;,&quot;entries&quot;:[&quot;New entry&quot;]}" style="padding:8px;font-size:12px;margin:8px 0;">
+ Add Month
</button>`} </div> </div>`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/components/HistoryYearGroup.astro", void 0);

const prerender = false;
const $$History = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$History;
  const cookie = Astro2.request.headers.get("cookie");
  const isAdmin = !!verifySession(getSessionIdFromCookie(cookie));
  const timelinePath = path.join(process.cwd(), "src", "content", "history", "timeline.json");
  const timeline = JSON.parse(fs.readFileSync(timelinePath, "utf-8"));
  return renderTemplate`${renderComponent($$result, "Base", $$Base, { "title": "History & Reference - AceTec", "data-astro-cid-tal57otx": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="pt-page-lg" data-astro-cid-tal57otx> ${renderComponent($$result2, "AdminInline", $$AdminInline, { "page": "history", "isAdmin": isAdmin, "data-astro-cid-tal57otx": true })} <section class="section" data-astro-cid-tal57otx> <div class="container" data-astro-cid-tal57otx> <h1 class="heading-page" data-astro-cid-tal57otx>History &amp; Reference</h1> <p class="heading-sub color-muted" data-astro-cid-tal57otx>
Over 30 years of innovation in embedded computing, defense systems, and industrial technology — from 1994 to
          today.
</p> <div class="history-tabs" role="tablist" aria-label="History timeline periods" data-astro-cid-tal57otx> ${isAdmin && renderTemplate`<button class="admin-add-btn" id="addPeriodBtn" style="padding:8px 16px;font-size:13px;margin-right:8px;width:auto;flex-shrink:0;" data-astro-cid-tal57otx>
+ Add Period
</button>`} ${timeline.periods.map((period, i) => renderTemplate`<button${addAttribute(["history-tab", { active: i === 0 }], "class:list")} role="tab"${addAttribute(i === 0 ? "true" : "false", "aria-selected")}${addAttribute(period.id, "data-tab")} data-astro-cid-tal57otx> ${period.label} </button>`)} </div> ${timeline.periods.map((period, i) => renderTemplate`<div${addAttribute(["history-panel", { active: i === 0 }], "class:list")}${addAttribute(period.id, "id")} role="tabpanel" data-astro-cid-tal57otx> ${period.years.map((y, yi) => renderTemplate`${renderComponent($$result2, "HistoryYearGroup", $$HistoryYearGroup, { "year": y.year, "months": y.months, "isAdmin": isAdmin, "periodIndex": i, "yearIndex": yi, "data-astro-cid-tal57otx": true })}`)} ${isAdmin && renderTemplate`<button class="admin-add-btn"${addAttribute(`periods[${i}].years`, "data-admin-add")} data-admin-prepend="true"${addAttribute(`{"year":${(/* @__PURE__ */ new Date()).getFullYear()},"months":[{"month":"Jan.","entries":["New entry"]}]}`, "data-admin-template")} style="margin:16px 0;" data-astro-cid-tal57otx>
+ Add Year
</button>`} </div>`)} </div> </section> </div> ` })}  <!-- HistoryYearGroup styles (global because component is dynamically rendered) -->  ${renderScript($$result, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/history.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/history.astro", void 0);

const $$file = "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/pages/history.astro";
const $$url = "/history";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$History,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

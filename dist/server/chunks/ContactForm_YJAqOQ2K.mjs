import { c as createComponent } from './astro-component_De_lg6FA.mjs';
import 'piccolore';
import { y as maybeRenderHead, a1 as addAttribute, L as renderTemplate } from './sequence_DNzh4xdL.mjs';
import 'clsx';

const $$ContactForm = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$ContactForm;
  const { prefix } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<form novalidate${addAttribute(prefix, "data-contact-form")}> <p class="fg-heading">Name</p> <div class="f-row"> <div class="fg"> <label${addAttribute(`${prefix}-fname`, "for")}>First Name <span>(required)</span></label> <input type="text"${addAttribute(`${prefix}-fname`, "id")} autocomplete="given-name" required> <div class="field-error">Please enter your first name.</div> </div> <div class="fg"> <label${addAttribute(`${prefix}-lname`, "for")}>Last Name <span>(required)</span></label> <input type="text"${addAttribute(`${prefix}-lname`, "id")} autocomplete="family-name" required> <div class="field-error">Please enter your last name.</div> </div> </div> <div class="fg"> <label${addAttribute(`${prefix}-email`, "for")}>Email <span>(required)</span></label> <input type="email"${addAttribute(`${prefix}-email`, "id")} autocomplete="email" required> <div class="field-error">Please enter a valid email address.</div> </div> <div class="f-check"> <input type="checkbox"${addAttribute(`${prefix}-news`, "id")}> <label${addAttribute(`${prefix}-news`, "for")}>Sign up for news and updates</label> </div> <div class="fg"> <label${addAttribute(`${prefix}-msg`, "for")}>Message <span>(required)</span></label> <textarea${addAttribute(`${prefix}-msg`, "id")} required></textarea> <div class="field-error">Please enter your message.</div> </div> <button type="button" class="btn-primary" data-action="submit" data-original="SUBMIT">SUBMIT</button> </form>`;
}, "/Users/sungsoojang/Desktop/AceTec-Website-v8/src/components/ContactForm.astro", void 0);

export { $$ContactForm as $ };

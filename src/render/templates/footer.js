import { html } from '../html.js';
import { iconUrl } from '../assets.js';
import { slug } from './navigation.js';

const linkList = (links) =>
  html`<ul>
    ${links.map((link) => html`<li><a href="${link.href}">${link.label}</a></li>`)}
  </ul>`;

/** Desktop/tablet footer columns. */
export function renderFooterColumns(groups) {
  return html`${groups.map(
    (group) =>
      html`<div class="footer_menu_item">
        <h2 class="footer_menu_item_head">${group.title}</h2>
        ${linkList(group.links)}
      </div>`,
  )}`;
}

/** Mobile footer: each group is a disclosure (button + region). */
export function renderFooterAccordion(groups) {
  return html`<ul>
    ${groups.map((group) => {
      const panelId = `footer-${slug(group.title)}`;
      return html`<li>
        <button type="button" class="lm" aria-expanded="false" aria-controls="${panelId}" data-accordion>
          ${group.title}
          <img src="${iconUrl('arrow-right.svg')}" alt="" />
        </button>
        <div id="${panelId}" class="ml" hidden>${linkList(group.links)}</div>
      </li>`;
    })}
  </ul>`;
}

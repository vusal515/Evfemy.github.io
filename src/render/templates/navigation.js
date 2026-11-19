import { html } from '../html.js';
import { iconUrl } from '../assets.js';
import { slugify as slug } from '../../js/lib/text.js';
import { routes } from '../../js/lib/routes.js';

/** URLs come from labels, so navigation.json only holds names. */
const categoryHref = (item) => routes.category(slug(item.label));
const subHref = (item, label) => routes.category(slug(item.label), slug(label));

function megaMenu(item) {
  if (!item.columns.length) return '';
  return html`<div class="category_drop_down category_animation">
    <div class="drop_down_container">
      ${item.columns.map(
        (col) =>
          html`<div class="drop_down_item">
            <div class="drop_down_item_list">
              <a href="${subHref(item, col.title)}" class="list_head">${col.title}</a>
              <ul>
                ${col.links.map((link) => html`<li><a href="${subHref(item, link.label)}">${link.label}</a></li>`)}
              </ul>
            </div>
          </div>`,
      )}
    </div>
  </div>`;
}

/** Desktop category bar with hover/focus mega menus. */
export function renderDesktopNav(items) {
  return html`<ul class="header_third_list">
    ${items.map(
      (item) =>
        html`<li>
          <a
            href="${categoryHref(item)}"
            class="category_link"
            ${item.columns.length ? html` aria-haspopup="true"` : ''}
          >
            ${item.highlight ? html`<svg class="icon icon--star" aria-hidden="true" focusable="false"><use href="#i-star"></use></svg> ` : ''}${item.label}
          </a>
          ${megaMenu(item)}
        </li>`,
    )}
  </ul>`;
}

/**
 * Mobile drawer categories. Categories with sub-menus become accordions
 * (button + region); the original site fetched these from a PHP endpoint.
 */
export function renderMobileNav(items) {
  return html`<ul class="menu_categories_list">
    ${items.map((item) => {
      if (!item.columns.length) {
        return html`<li>
          <a href="${categoryHref(item)}" class="menu_category_row">
            <span class="menu_category_name">${item.label}</span>
            <img src="${iconUrl('arrow-right.svg')}" alt="" class="arrow_right" />
          </a>
        </li>`;
      }
      const panelId = `mobile-cat-${slug(item.label)}`;
      return html`<li>
        <button type="button" class="menu_category_row" aria-expanded="false" aria-controls="${panelId}" data-accordion>
          <span class="menu_category_name">${item.label}</span>
          <img src="${iconUrl('arrow-right.svg')}" alt="" class="arrow_right" />
        </button>
        <div id="${panelId}" class="menu_subcategories" hidden>
          <a class="menu_subcategories__all" href="${categoryHref(item)}">Bütün ${item.label} məhsulları</a>
          ${item.columns.map(
            (col) =>
              html`<p class="menu_subcategories__title">${col.title}</p>
                <ul>
                  ${col.links.map((link) => html`<li><a href="${subHref(item, link.label)}">${link.label}</a></li>`)}
                </ul>`,
          )}
        </div>
      </li>`;
    })}
  </ul>`;
}

export { slug };

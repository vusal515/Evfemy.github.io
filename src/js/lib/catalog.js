import { slugify } from './text.js';
import { normalize } from './search.js';

/**
 * Read-only queries over products.json and navigation.json. Pages ask the
 * catalog questions ("what belongs in this category?") instead of filtering
 * arrays themselves, so the rules live in one tested place.
 */

export const SORTS = {
  recommended: { label: 'Tövsiyə olunan', compare: () => 0 },
  'price-asc': { label: 'Qiymət: ucuzdan bahaya', compare: (a, b) => a.price - b.price },
  'price-desc': { label: 'Qiymət: bahadan ucuza', compare: (a, b) => b.price - a.price },
  discount: {
    label: 'Ən çox endirim',
    compare: (a, b) => discountRatio(b) - discountRatio(a),
  },
};

function discountRatio(product) {
  return product.oldPrice ? 1 - product.price / product.oldPrice : 0;
}

export const isInStock = (product) => product.stock > 0;
export const isDiscounted = (product) => Boolean(product.oldPrice && product.oldPrice > product.price);

export function createCatalog(products, navigation) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const categories = navigation.map((item) => ({
    slug: slugify(item.label),
    label: item.label,
    highlight: Boolean(item.highlight),
    groups: item.columns.map((col) => ({
      slug: slugify(col.title),
      title: col.title,
      links: col.links.map((link) => ({ slug: slugify(link.label), label: link.label })),
    })),
  }));
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  /** Products listed under a top-level category: by main category or by tag (Endirim, Yenilər ...). */
  const inCategory = (slug) => products.filter((p) => p.category === slug || p.tags.includes(slug));

  /** A sub slug may name a column ("Bişirmə") or a single link ("Düdüklü Qazan"). */
  const matchesSub = (product, sub) => slugify(product.group) === sub || slugify(product.subcategory) === sub;

  function findSubLabel(category, sub) {
    for (const group of category.groups) {
      if (group.slug === sub) return group.title;
      const link = group.links.find((l) => l.slug === sub);
      if (link) return link.label;
    }
    return null;
  }

  return {
    products,
    navigation,
    categories,
    getProduct: (id) => byId.get(id) ?? null,
    getCategory: (slug) => categoryBySlug.get(slug) ?? null,
    findSubLabel,
    inCategory,
    matchesSub,

    /** Free-text search over product names, groups and subcategories. */
    searchProducts(q) {
      const needle = normalize(q);
      if (needle.length < 2) return [];
      return products.filter((p) =>
        [p.name, p.subcategory, p.group].some((field) => normalize(field).includes(needle)),
      );
    },

    /** Columns of a category that have at least one product, for filter chips. */
    groupsWithProducts(slug) {
      const category = categoryBySlug.get(slug);
      if (!category) return [];
      const list = inCategory(slug);
      return category.groups
        .filter((group, i, all) => all.findIndex((g) => g.slug === group.slug) === i)
        .map((group) => ({ ...group, count: list.filter((p) => slugify(p.group) === group.slug).length }))
        .filter((group) => group.count > 0);
    },

    related(product, limit = 4) {
      const same = products.filter((p) => p.id !== product.id && p.category === product.category);
      const sameGroup = same.filter((p) => p.group === product.group);
      const rest = same.filter((p) => p.group !== product.group);
      return [...sameGroup, ...rest].slice(0, limit);
    },
  };
}

/** Applies the listing controls. Out-of-stock items always go last. */
export function applyListing(products, { sort = 'recommended', discountedOnly = false } = {}) {
  const compare = (SORTS[sort] ?? SORTS.recommended).compare;
  return products
    .filter((p) => !discountedOnly || isDiscounted(p))
    .map((p, index) => ({ p, index }))
    .sort((a, b) => Number(isInStock(b.p)) - Number(isInStock(a.p)) || compare(a.p, b.p) || a.index - b.index)
    .map(({ p }) => p);
}

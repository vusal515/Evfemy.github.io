/**
 * Every internal URL is built here, so templates, search and pages agree on
 * the URL scheme. Links are relative because all pages sit next to each other
 * and the site may be served from a sub-path.
 */
const query = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const routes = {
  home: () => './',
  category: (category, sub) => `category.html${query({ c: category, sub })}`,
  search: (q) => `category.html${query({ q })}`,
  product: (id) => `product.html${query({ id })}`,
  cart: () => 'cart.html',
};

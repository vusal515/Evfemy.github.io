import products from '../../data/products.json';
import navigation from '../../data/navigation.json';
import { createCatalog } from '../lib/catalog.js';
import { createCartStore } from '../cart/store.js';

/**
 * Shared instances for the browser. The catalog is bundled from the same JSON
 * the build validates; the cart persists to localStorage.
 */
export const catalog = createCatalog(products, navigation);
export const cart = createCartStore({ getProduct: catalog.getProduct });

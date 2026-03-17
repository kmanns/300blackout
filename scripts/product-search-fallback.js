import {
  fetchProductData,
  setEndpoint as setPdpEndpoint,
} from '@dropins/storefront-pdp/api.js';
import { CS_FETCH_GRAPHQL } from './commerce.js';

const hydratedProducts = new Map();
let pdpEndpointInitialized = false;

function updateDebugState(nextState) {
  window.__searchFallbackDebug = {
    ...(window.__searchFallbackDebug || {}),
    ...nextState,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeImageUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\//, '//');
}

function ensurePdpEndpoint() {
  if (pdpEndpointInitialized) {
    return;
  }

  setPdpEndpoint(CS_FETCH_GRAPHQL);
  pdpEndpointInitialized = true;
}

export function needsProductCardFallback(product) {
  return Boolean(
    product?.sku
    && (
      !product.name
      || !product.urlKey
      || !product.images?.length
      || (!product.price && !product.priceRange)
    ),
  );
}

function mapFallbackProduct(item, product) {
  const fallbackImages = item.images?.map((image) => ({
    ...image,
    roles: image.roles || ['image'],
    url: normalizeImageUrl(image.url),
  })) || [];

  const finalAmount = item.prices?.final?.amount;
  const regularAmount = item.prices?.regular?.amount;
  const currency = item.prices?.final?.currency || item.prices?.regular?.currency || 'USD';

  const price = typeof finalAmount === 'number' ? {
    final: { amount: { value: finalAmount, currency } },
    regular: {
      amount: {
        value: typeof regularAmount === 'number' ? regularAmount : finalAmount,
        currency,
      },
    },
    roles: [],
  } : product.price;

  return {
    ...product,
    name: item.name || product.name || product.sku || '',
    url: item.url || product.url || '',
    urlKey: item.urlKey || product.urlKey || '',
    images: fallbackImages.length ? fallbackImages : (product.images || []),
    inStock: typeof item.inStock === 'boolean' ? item.inStock : product.inStock,
    __typename: product.__typename || 'SimpleProductView',
    typename: product.typename || 'SimpleProductView',
    price,
    priceRange: product.priceRange,
  };
}

async function fetchFallbackProducts(skus) {
  const uncachedSkus = skus.filter((sku) => !hydratedProducts.has(sku));
  updateDebugState({
    requestedSkus: skus,
    uncachedSkus,
  });

  if (uncachedSkus.length > 0) {
    ensurePdpEndpoint();

    updateDebugState({
      fallbackFetchStarted: true,
      fallbackFetchSkus: uncachedSkus,
    });

    const request = Promise.all(
      uncachedSkus.map(async (sku) => {
        const product = await fetchProductData(sku, { skipTransform: true });
        return [sku, product];
      }),
    ).then((entries) => {
      const itemMap = new Map(entries.filter(([, item]) => item?.sku));
      updateDebugState({
        fallbackFetchStarted: false,
        fallbackFetchReturnedSkus: [...itemMap.keys()],
      });

      uncachedSkus.forEach((sku) => {
        hydratedProducts.set(sku, itemMap.get(sku) || null);
      });

      return itemMap;
    }).catch((error) => {
      updateDebugState({
        fallbackFetchStarted: false,
        fallbackFetchError: error.message,
      });
      console.warn('Failed to hydrate fallback search results', error);
      uncachedSkus.forEach((sku) => {
        hydratedProducts.set(sku, null);
      });
      return new Map();
    });

    uncachedSkus.forEach((sku) => {
      hydratedProducts.set(sku, request.then((itemMap) => itemMap.get(sku) || null));
    });
  }

  const resolvedEntries = await Promise.all(skus.map(async (sku) => {
    const cachedValue = hydratedProducts.get(sku);
    const resolvedValue = cachedValue instanceof Promise ? await cachedValue : cachedValue;
    hydratedProducts.set(sku, resolvedValue || null);
    return [sku, resolvedValue || null];
  }));

  return new Map(resolvedEntries);
}

export async function hydrateProductCard(product) {
  if (!needsProductCardFallback(product)) {
    return product;
  }

  const fallbackMap = await fetchFallbackProducts([product.sku]);
  const fallbackProduct = fallbackMap.get(product.sku);

  if (!fallbackProduct) {
    return product;
  }

  return mapFallbackProduct(fallbackProduct, product);
}

export async function hydrateProductSearchResponse(request, response) {
  const searchItems = response?.data?.productSearch?.items;
  if (!Array.isArray(searchItems) || searchItems.length === 0) {
    return response;
  }

  if (!request?.body?.includes('productSearch')) {
    return response;
  }

  const productsToHydrate = searchItems
    .map(({ productView }) => productView)
    .filter(needsProductCardFallback);

  updateDebugState({
    interceptedSearchSkus: searchItems
      .map(({ productView }) => productView?.sku)
      .filter(Boolean),
    productsNeedingHydration: productsToHydrate.map(({ sku }) => sku),
  });

  if (productsToHydrate.length === 0) {
    return response;
  }

  const fallbackMap = await fetchFallbackProducts(
    [...new Set(productsToHydrate.map(({ sku }) => sku))],
  );

  response.data.productSearch.items = searchItems.map((item) => {
    const product = item.productView;
    const fallbackProduct = fallbackMap.get(product?.sku);

    if (!product || !fallbackProduct) {
      return item;
    }

    return {
      ...item,
      productView: mapFallbackProduct(fallbackProduct, product),
    };
  });

  updateDebugState({
    mergedSkus: response.data.productSearch.items
      .filter(({ productView }) => productView?.name && productView?.urlKey)
      .map(({ productView }) => productView.sku),
  });

  return response;
}

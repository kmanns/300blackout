import { CORE_FETCH_GRAPHQL } from './commerce.js';

const PRODUCT_CARD_FALLBACK_QUERY = `
  query PRODUCT_CARD_FALLBACK($skus: [String!]) {
    products(filter: { sku: { in: $skus } }) {
      items {
        __typename
        sku
        name
        url_key
        small_image {
          url
          label
        }
        stock_status
        price_range {
          minimum_price {
            final_price {
              value
              currency
            }
            regular_price {
              value
              currency
            }
          }
          maximum_price {
            final_price {
              value
              currency
            }
            regular_price {
              value
              currency
            }
          }
        }
      }
    }
  }
`;

const hydratedProducts = new Map();

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

function createAmount(price) {
  if (!price) return undefined;

  return {
    value: price.value ?? 0,
    currency: price.currency ?? 'USD',
  };
}

function mapTypeName(typeName, fallbackTypeName) {
  if (!typeName) return fallbackTypeName;

  if (
    typeName === 'SimpleProduct'
    || typeName === 'VirtualProduct'
    || typeName === 'DownloadableProduct'
  ) {
    return 'SimpleProductView';
  }

  return 'ComplexProductView';
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
  const minFinal = createAmount(item.price_range?.minimum_price?.final_price);
  const minRegular = createAmount(item.price_range?.minimum_price?.regular_price) || minFinal;
  const maxFinal = createAmount(item.price_range?.maximum_price?.final_price) || minFinal;
  const maxRegular = createAmount(item.price_range?.maximum_price?.regular_price)
    || maxFinal
    || minRegular;
  const imageUrl = normalizeImageUrl(item.small_image?.url);
  const imageLabel = item.small_image?.label || item.name || product.sku || '';

  return {
    ...product,
    name: item.name || product.name || product.sku || '',
    url: item.url_key ? `/${item.url_key}` : (product.url || ''),
    urlKey: item.url_key || product.urlKey || '',
    images: imageUrl ? [{
      label: imageLabel,
      roles: ['image'],
      url: imageUrl,
    }] : (product.images || []),
    inStock: item.stock_status ? item.stock_status === 'IN_STOCK' : product.inStock,
    typename: mapTypeName(item.__typename, product.typename),
    price: minFinal ? {
      final: { amount: minFinal },
      regular: { amount: minRegular },
      roles: [],
    } : product.price,
    priceRange: minFinal ? {
      minimum: {
        final: { amount: minFinal },
        regular: { amount: minRegular },
      },
      maximum: {
        final: { amount: maxFinal || minFinal },
        regular: { amount: maxRegular || minRegular },
      },
    } : product.priceRange,
  };
}

async function fetchFallbackProducts(skus) {
  const uncachedSkus = skus.filter((sku) => !hydratedProducts.has(sku));
  updateDebugState({
    requestedSkus: skus,
    uncachedSkus,
  });

  if (uncachedSkus.length > 0) {
    updateDebugState({
      fallbackFetchStarted: true,
      fallbackFetchSkus: uncachedSkus,
    });
    const request = CORE_FETCH_GRAPHQL.fetchGraphQl(PRODUCT_CARD_FALLBACK_QUERY, {
      variables: { skus: uncachedSkus },
      cache: 'no-cache',
    }).then((response) => {
      if (response?.errors?.length) {
        throw new Error(response.errors.map((error) => error.message).join(' '));
      }

      const items = response?.data?.products?.items || [];
      const itemMap = new Map(items.map((item) => [item.sku, item]));
      updateDebugState({
        fallbackFetchStarted: false,
        fallbackFetchReturnedSkus: items.map(({ sku }) => sku),
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

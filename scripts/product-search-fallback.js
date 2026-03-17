import { CS_FETCH_GRAPHQL } from './commerce.js';

const PRODUCT_CARD_FALLBACK_QUERY = `
  query PRODUCT_CARD_FALLBACK($skus: [String]) {
    products(skus: $skus) {
      __typename
      id
      sku
      name
      shortDescription
      metaDescription
      metaKeyword
      metaTitle
      description
      inStock
      addToCartAllowed
      url
      urlKey
      externalId
      images(roles: []) {
        url
        label
        roles
      }
      attributes(roles: []) {
        name
        label
        value
        roles
      }
      ... on SimpleProductView {
        price {
          roles
          regular {
            amount {
              value
              currency
            }
          }
          final {
            amount {
              value
              currency
            }
          }
        }
      }
      ... on ComplexProductView {
        priceRange {
          maximum {
            final {
              amount {
                value
                currency
              }
            }
            regular {
              amount {
                value
                currency
              }
            }
            roles
          }
          minimum {
            final {
              amount {
                value
                currency
              }
            }
            regular {
              amount {
                value
                currency
              }
            }
            roles
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
    url: normalizeImageUrl(image.url),
  })) || [];

  return {
    ...product,
    name: item.name || product.name || product.sku || '',
    url: item.url || product.url || '',
    urlKey: item.urlKey || product.urlKey || '',
    images: fallbackImages.length ? fallbackImages : (product.images || []),
    inStock: typeof item.inStock === 'boolean' ? item.inStock : product.inStock,
    __typename: item.__typename || product.__typename || 'SimpleProductView',
    typename: item.__typename || product.typename || 'SimpleProductView',
    price: item.price || product.price,
    priceRange: item.priceRange || product.priceRange,
  };
}

async function fetchFallbackProducts(skus) {
  const uncachedSkus = skus.filter((sku) => {
    if (!hydratedProducts.has(sku)) {
      return true;
    }

    return hydratedProducts.get(sku) === null;
  });
  updateDebugState({
    requestedSkus: skus,
    uncachedSkus,
  });

  if (uncachedSkus.length > 0) {
    updateDebugState({
      fallbackFetchStarted: true,
      fallbackFetchSkus: uncachedSkus,
    });

    const request = CS_FETCH_GRAPHQL.fetchGraphQl(PRODUCT_CARD_FALLBACK_QUERY, {
      method: 'POST',
      variables: { skus: uncachedSkus },
      cache: 'no-cache',
    }).then((response) => {
      if (response?.errors?.length) {
        throw new Error(response.errors.map((error) => error.message).join(' '));
      }

      const products = response?.data?.products || [];
      const itemMap = new Map(products.filter((item) => item?.sku).map((item) => [item.sku, item]));
      updateDebugState({
        fallbackFetchStarted: false,
        fallbackFetchReturnedSkus: [...itemMap.keys()],
      });

      uncachedSkus.forEach((sku) => {
        const product = itemMap.get(sku);
        if (product) {
          hydratedProducts.set(sku, product);
        } else {
          hydratedProducts.delete(sku);
        }
      });

      return itemMap;
    }).catch((error) => {
      updateDebugState({
        fallbackFetchStarted: false,
        fallbackFetchError: error.message,
      });
      console.warn('Failed to hydrate fallback search results', error);
      uncachedSkus.forEach((sku) => {
        hydratedProducts.delete(sku);
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
    if (resolvedValue) {
      hydratedProducts.set(sku, resolvedValue);
    } else {
      hydratedProducts.delete(sku);
    }
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

import { CS_FETCH_GRAPHQL } from './commerce.js';
import { PRODUCT_SEARCH_OVERRIDES } from './product-search-overrides.js';

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
let metadataEntriesPromise;
const productPageFallbacks = new Map();

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

async function getMetadataEntries() {
  if (!metadataEntriesPromise) {
    metadataEntriesPromise = fetch('/metadata.json', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Metadata request failed: ${response.status}`);
        }

        return response.json();
      })
      .then((payload) => payload?.data?.data || payload?.data || [])
      .catch((error) => {
        updateDebugState({ metadataFallbackError: error.message });
        return [];
      });
  }

  return metadataEntriesPromise;
}

function createAmount(amount, currency = 'USD') {
  if (typeof amount !== 'number') {
    return null;
  }

  return { value: amount, currency };
}

function mapMetadataEntry(entry, sku) {
  if (!entry) {
    return null;
  }

  let jsonLd = null;
  try {
    jsonLd = entry['json-ld'] ? JSON.parse(entry['json-ld']) : null;
  } catch (error) {
    updateDebugState({ metadataJsonLdError: error.message });
  }

  const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers[0] : jsonLd?.offers;
  const amount = createAmount(Number(offers?.price), offers?.priceCurrency || 'USD');
  const url = entry.URL || jsonLd?.url || entry['og:url'] || '';
  const imageUrl = entry['og:image'] || entry['og:image:secure_url'] || jsonLd?.image || '';

  return {
    __typename: 'SimpleProductView',
    sku: entry.sku || sku,
    name: entry.title || entry['og:title'] || jsonLd?.name || sku,
    url,
    urlKey: url.split('/').filter(Boolean).slice(-2, -1)[0] || '',
    images: imageUrl ? [{ url: normalizeImageUrl(imageUrl), label: entry.title || sku, roles: ['image'] }] : [],
    price: amount ? {
      final: { amount },
      regular: { amount },
      roles: [],
    } : null,
  };
}

async function fetchMetadataFallbackProducts(skus) {
  const entries = await getMetadataEntries();
  const entryMap = new Map(
    entries
      .filter((entry) => entry?.sku)
      .map((entry) => [String(entry.sku).toLowerCase(), entry]),
  );

  const products = new Map(skus.map((sku) => [
    sku,
    mapMetadataEntry(entryMap.get(String(sku).toLowerCase()), sku),
  ]));

  updateDebugState({
    metadataFallbackReturnedSkus: [...products.entries()]
      .filter(([, product]) => product?.sku)
      .map(([sku]) => sku),
  });

  return products;
}

function fetchOverrideProducts(skus) {
  const products = new Map(skus.map((sku) => [
    sku,
    PRODUCT_SEARCH_OVERRIDES[String(sku).toLowerCase()] || null,
  ]));

  updateDebugState({
    manualOverrideReturnedSkus: [...products.entries()]
      .filter(([, product]) => product?.sku)
      .map(([sku]) => sku),
  });

  return products;
}

function extractText(documentRef, selector) {
  return documentRef.querySelector(selector)?.getAttribute('content')
    || documentRef.querySelector(selector)?.textContent
    || '';
}

function mapProductPageDocument(doc, sku, path) {
  const jsonLdScript = doc.querySelector('script[type="application/ld+json"]');
  let jsonLd = null;

  try {
    jsonLd = jsonLdScript?.textContent ? JSON.parse(jsonLdScript.textContent) : null;
  } catch (error) {
    updateDebugState({ productPageJsonLdError: error.message });
  }

  const offers = Array.isArray(jsonLd?.offers) ? jsonLd.offers[0] : jsonLd?.offers;
  const amount = createAmount(Number(offers?.price), offers?.priceCurrency || 'USD');
  const title = extractText(doc, 'meta[property="og:title"]') || doc.title;
  const imageUrl = extractText(doc, 'meta[property="og:image"]') || jsonLd?.image || '';
  const canonicalUrl = extractText(doc, 'meta[property="og:url"]') || path;

  if (!title || /page not found/i.test(title)) {
    return null;
  }

  return {
    __typename: 'SimpleProductView',
    sku,
    name: title,
    url: canonicalUrl,
    urlKey: canonicalUrl.split('/').filter(Boolean).slice(-2, -1)[0] || '',
    images: imageUrl ? [{ url: normalizeImageUrl(imageUrl), label: title, roles: ['image'] }] : [],
    price: amount ? {
      final: { amount },
      regular: { amount },
      roles: [],
    } : null,
  };
}

async function fetchProductPageFallbackProducts(skus) {
  const results = await Promise.all(skus.map(async (sku) => {
    if (productPageFallbacks.has(sku)) {
      return [sku, productPageFallbacks.get(sku)];
    }

    const path = `/products/${sku}`;

    try {
      const response = await fetch(path, { cache: 'no-cache' });
      if (!response.ok) {
        productPageFallbacks.set(sku, null);
        return [sku, null];
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const product = mapProductPageDocument(doc, sku, path);
      productPageFallbacks.set(sku, product);
      return [sku, product];
    } catch (error) {
      updateDebugState({ productPageFallbackError: error.message });
      productPageFallbacks.set(sku, null);
      return [sku, null];
    }
  }));

  const products = new Map(results);
  updateDebugState({
    productPageFallbackReturnedSkus: [...products.entries()]
      .filter(([, product]) => product?.sku)
      .map(([sku]) => sku),
  });
  return products;
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
    const cachedValue = hydratedProducts.get(sku);
    return !(cachedValue && !(cachedValue instanceof Promise));
  });
  updateDebugState({
    requestedSkus: skus,
    uncachedSkus,
  });

  if (uncachedSkus.length > 0) {
    const overrideMap = fetchOverrideProducts(uncachedSkus);
    const overrideHits = [...overrideMap.values()].filter(Boolean).length;

    if (overrideHits) {
      uncachedSkus.forEach((sku) => {
        const product = overrideMap.get(sku);
        if (product) {
          hydratedProducts.set(sku, product);
        }
      });

      return new Map(skus.map((sku) => [
        sku,
        hydratedProducts.get(sku) || overrideMap.get(sku) || null,
      ]));
    }

    updateDebugState({
      fallbackFetchStarted: true,
      fallbackFetchSkus: uncachedSkus,
    });

    const request = CS_FETCH_GRAPHQL.fetchGraphQl(PRODUCT_CARD_FALLBACK_QUERY, {
      method: 'POST',
      variables: { skus: uncachedSkus },
      cache: 'no-cache',
    }).then(async (response) => {
      if (response?.errors?.length) {
        throw new Error(response.errors.map((error) => error.message).join(' '));
      }

      const products = response?.data?.products || [];
      const itemMap = new Map(products.filter((item) => item?.sku).map((item) => [item.sku, item]));

      if (!itemMap.size) {
        const metadataMap = await fetchMetadataFallbackProducts(uncachedSkus);
        const metadataHits = [...metadataMap.values()].filter(Boolean).length;

        if (metadataHits) {
          updateDebugState({ fallbackFetchStarted: false });
          return metadataMap;
        }

        return fetchProductPageFallbackProducts(uncachedSkus);
      }

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
    }).catch(async (error) => {
      updateDebugState({
        fallbackFetchStarted: false,
        fallbackFetchError: error.message,
      });
      console.warn('Failed to hydrate fallback search results', error);
      const metadataMap = await fetchMetadataFallbackProducts(uncachedSkus);
      const metadataHits = [...metadataMap.values()].filter(Boolean).length;

      if (metadataHits) {
        updateDebugState({ fallbackFetchStarted: false });
        return metadataMap;
      }

      return fetchProductPageFallbackProducts(uncachedSkus);
    });

    const itemMap = await request;

    return new Map(await Promise.all(skus.map(async (sku) => [
      sku,
      hydratedProducts.get(sku) || itemMap.get(sku) || null,
    ])));
  }

  const resolvedEntries = skus.map((sku) => {
    const cachedValue = hydratedProducts.get(sku);
    return [sku, cachedValue || null];
  });

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

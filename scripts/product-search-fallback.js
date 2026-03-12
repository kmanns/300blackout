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

  if (typeName === 'SimpleProduct' || typeName === 'VirtualProduct' || typeName === 'DownloadableProduct') {
    return 'SimpleProductView';
  }

  return 'ComplexProductView';
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
    urlKey: item.url_key || product.urlKey || '',
    url: item.url_key ? `/${item.url_key}` : (product.url || ''),
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

export async function hydrateProductCard(product) {
  if (!needsProductCardFallback(product)) {
    return product;
  }

  const cachedProduct = hydratedProducts.get(product.sku);
  if (cachedProduct) {
    return cachedProduct;
  }

  const pendingRequest = CORE_FETCH_GRAPHQL.fetchGraphQl(PRODUCT_CARD_FALLBACK_QUERY, {
    variables: { skus: [product.sku] },
    cache: 'no-cache',
  }).then((response) => {
    if (response?.errors?.length) {
      throw new Error(response.errors.map((error) => error.message).join(' '));
    }

    const item = response?.data?.products?.items?.find(({ sku }) => sku === product.sku);
    const hydratedProduct = item ? mapFallbackProduct(item, product) : product;

    hydratedProducts.set(product.sku, hydratedProduct);
    return hydratedProduct;
  }).catch((error) => {
    console.warn(`Failed to hydrate fallback product data for SKU ${product.sku}`, error);
    hydratedProducts.set(product.sku, product);
    return product;
  });

  hydratedProducts.set(product.sku, pendingRequest);
  return pendingRequest;
}

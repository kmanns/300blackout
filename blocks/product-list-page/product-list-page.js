// Product Discovery Dropins
import SearchResults from '@dropins/storefront-product-discovery/containers/SearchResults.js';
import Facets from '@dropins/storefront-product-discovery/containers/Facets.js';
import SortBy from '@dropins/storefront-product-discovery/containers/SortBy.js';
import Pagination from '@dropins/storefront-product-discovery/containers/Pagination.js';
import { render as provider } from '@dropins/storefront-product-discovery/render.js';
import { Button, Icon, provider as UI } from '@dropins/tools/components.js';
import { search } from '@dropins/storefront-product-discovery/api.js';
// Wishlist Dropin
import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';
// Cart Dropin
import * as cartApi from '@dropins/storefront-cart/api.js';
// Event Bus
import { events } from '@dropins/tools/event-bus.js';
// AEM
import { readBlockConfig } from '../../scripts/aem.js';
import { fetchPlaceholders, getProductLink } from '../../scripts/commerce.js';
import { hydrateProductCard, needsProductCardFallback } from '../../scripts/product-search-fallback.js';

// Initializers
import '../../scripts/initializers/search.js';
import '../../scripts/initializers/wishlist.js';

function getImageSource(product, defaultImageProps) {
  return product.images?.[0]?.url || defaultImageProps.src || '';
}

function getProductHref(product) {
  return product.url || getProductLink(product.urlKey, product.sku);
}

function formatCurrency(amount) {
  if (!amount) {
    return '';
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: amount.currency || 'USD',
  }).format(amount.value ?? 0);
}

function renderProductNameSlot(ctx) {
  const anchor = document.createElement('a');
  const updateName = (product) => {
    anchor.href = getProductHref(product);
    anchor.textContent = product.name || product.sku || '';
  };

  updateName(ctx.product);
  ctx.replaceWith(anchor);

  if (needsProductCardFallback(ctx.product)) {
    hydrateProductCard(ctx.product).then(updateName);
  }
}

function renderProductPriceSlot(ctx) {
  const anchor = document.createElement('a');
  const wrapper = document.createElement('div');
  const finalPrice = document.createElement('span');
  const regularPrice = document.createElement('span');

  wrapper.className = 'product-price';
  finalPrice.className = 'regular-price-normal';
  regularPrice.className = 'special-price-crossed';
  anchor.append(wrapper);

  const updatePrice = (product) => {
    const finalAmount = product.price?.final?.amount
      || product.priceRange?.minimum?.final?.amount;
    const regularAmount = product.price?.regular?.amount
      || product.priceRange?.minimum?.regular?.amount;

    anchor.href = getProductHref(product);
    wrapper.replaceChildren();

    if (finalAmount) {
      finalPrice.textContent = formatCurrency(finalAmount);
      wrapper.append(finalPrice);
    }

    if (regularAmount && finalAmount && regularAmount.value > finalAmount.value) {
      regularPrice.textContent = formatCurrency(regularAmount);
      wrapper.append(regularPrice);
    }
  };

  updatePrice(ctx.product);
  ctx.replaceWith(anchor);

  if (needsProductCardFallback(ctx.product)) {
    hydrateProductCard(ctx.product).then(updatePrice);
  }
}

function renderStandardProductImage(ctx) {
  const { defaultImageProps } = ctx;
  const anchorWrapper = document.createElement('a');
  const image = document.createElement('img');
  const updateImage = (product) => {
    const imageSource = getImageSource(product, defaultImageProps);

    anchorWrapper.href = getProductHref(product);
    image.alt = defaultImageProps.alt || product.name || product.sku || '';
    image.title = defaultImageProps.title || product.name || product.sku || '';
    if (defaultImageProps.width) image.width = defaultImageProps.width;
    if (defaultImageProps.height) image.height = defaultImageProps.height;
    if (defaultImageProps.loading) image.loading = defaultImageProps.loading;
    if (defaultImageProps.srcSet) image.srcset = defaultImageProps.srcSet;
    image.className = 'dropin-image';
    if (imageSource) {
      image.src = imageSource;
    } else {
      image.removeAttribute('src');
    }
  };

  updateImage(ctx.product);

  anchorWrapper.append(image);
  ctx.replaceWith(anchorWrapper);

  if (needsProductCardFallback(ctx.product)) {
    hydrateProductCard(ctx.product).then(updateImage);
  }
}

export default async function decorate(block) {
  const labels = await fetchPlaceholders();

  const config = readBlockConfig(block);

  const fragment = document.createRange().createContextualFragment(`
    <div class="search__wrapper">
      <div class="search__result-info"></div>
      <div class="search__view-facets"></div>
      <div class="search__facets"></div>
      <div class="search__product-sort"></div>
      <div class="search__product-list"></div>
      <div class="search__pagination"></div>
    </div>
  `);

  const $resultInfo = fragment.querySelector('.search__result-info');
  const $viewFacets = fragment.querySelector('.search__view-facets');
  const $facets = fragment.querySelector('.search__facets');
  const $productSort = fragment.querySelector('.search__product-sort');
  const $productList = fragment.querySelector('.search__product-list');
  const $pagination = fragment.querySelector('.search__pagination');

  block.innerHTML = '';
  block.appendChild(fragment);

  // Add url path back to the block for enrichment, incase enrichment block is
  // executed after the plp block and block config is not available
  if (config.urlpath) {
    block.dataset.urlpath = config.urlpath;
  }

  // Get variables from the URL
  const urlParams = new URLSearchParams(window.location.search);
  // get all params
  const {
    q,
    page,
    sort,
    filter,
  } = Object.fromEntries(urlParams.entries());

  // Request search based on the page type on block load
  if (config.urlpath) {
    // If it's a category page...
    await search({
      phrase: '', // search all products in the category
      currentPage: page ? Number(page) : 1,
      pageSize: 8,
      sort: sort ? getSortFromParams(sort) : [{ attribute: 'position', direction: 'DESC' }],
      filter: [
        { attribute: 'categoryPath', eq: config.urlpath }, // Add category filter
        { attribute: 'visibility', in: ['Search', 'Catalog, Search'] },
        ...getFilterFromParams(filter),
      ],
    }).catch(() => {
      console.error('Error searching for products');
    });
  } else {
    // If it's a search page...
    await search({
      phrase: q || '',
      currentPage: page ? Number(page) : 1,
      pageSize: 8,
      sort: getSortFromParams(sort),
      filter: [
        { attribute: 'visibility', in: ['Search', 'Catalog, Search'] },
        ...getFilterFromParams(filter),
      ],
    }).catch(() => {
      console.error('Error searching for products');
    });
  }

  const getAddToCartButton = (product) => {
    if (product.typename === 'ComplexProductView') {
      const button = document.createElement('div');
      UI.render(Button, {
        children: labels.Global?.AddProductToCart,
        icon: Icon({ source: 'Cart' }),
        href: getProductHref(product),
        variant: 'primary',
      })(button);
      return button;
    }
    const button = document.createElement('div');
    UI.render(Button, {
      children: labels.Global?.AddProductToCart,
      icon: Icon({ source: 'Cart' }),
      onClick: () => cartApi.addProductsToCart([{ sku: product.sku, quantity: 1 }]),
      variant: 'primary',
    })(button);
    return button;
  };

  await Promise.all([
    // Sort By
    provider.render(SortBy, {})($productSort),

    // Pagination
    provider.render(Pagination, {
      onPageChange: () => {
        // scroll to the top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    })($pagination),

    // View Facets Button
    UI.render(Button, {
      children: labels.Global?.Filters,
      icon: Icon({ source: 'Burger' }),
      variant: 'secondary',
      onClick: () => {
        $facets.classList.toggle('search__facets--visible');
      },
    })($viewFacets),

    // Facets
    provider.render(Facets, {})($facets),
    // Product List
    provider.render(SearchResults, {
      routeProduct: (product) => getProductHref(product),
      slots: {
        ProductImage: (ctx) => {
          renderStandardProductImage(ctx);
        },
        ProductName: renderProductNameSlot,
        ProductPrice: renderProductPriceSlot,
        ProductActions: (ctx) => {
          const actionsWrapper = document.createElement('div');
          actionsWrapper.className = 'product-discovery-product-actions';
          // Add to Cart Button
          const addToCartBtn = getAddToCartButton(ctx.product);
          addToCartBtn.className = 'product-discovery-product-actions__add-to-cart';
          // Wishlist Button
          const $wishlistToggle = document.createElement('div');
          $wishlistToggle.classList.add('product-discovery-product-actions__wishlist-toggle');
          wishlistRender.render(WishlistToggle, {
            product: ctx.product,
            variant: 'tertiary',
          })($wishlistToggle);
          actionsWrapper.appendChild(addToCartBtn);
          actionsWrapper.appendChild($wishlistToggle);
          ctx.replaceWith(actionsWrapper);
        },
      },
    })($productList),
  ]);

  // Listen for search results (event is fired before the block is rendered; eager: true)
  events.on('search/result', (payload) => {
    const totalCount = payload.result?.totalCount || 0;

    block.classList.toggle('product-list-page--empty', totalCount === 0);

    // Results Info
    $resultInfo.innerHTML = payload.request?.phrase
      ? `${totalCount} results found for <strong>"${payload.request.phrase}"</strong>.`
      : `${totalCount} results found.`;

    // Update the view facets button with the number of filters
    if (payload.request.filter.length > 0) {
      $viewFacets.querySelector('button').setAttribute('data-count', payload.request.filter.length);
    } else {
      $viewFacets.querySelector('button').removeAttribute('data-count');
    }
  }, { eager: true });

  // Listen for search results (event is fired after the block is rendered; eager: false)
  events.on('search/result', (payload) => {
    // update URL with new search params
    const url = new URL(window.location.href);

    if (payload.request?.phrase) {
      url.searchParams.set('q', payload.request.phrase);
    }

    if (payload.request?.currentPage) {
      url.searchParams.set('page', payload.request.currentPage);
    }

    if (payload.request?.sort) {
      url.searchParams.set('sort', getParamsFromSort(payload.request.sort));
    }

    if (payload.request?.filter) {
      url.searchParams.set('filter', getParamsFromFilter(payload.request.filter));
    }

    // Update the URL
    window.history.pushState({}, '', url.toString());
  }, { eager: false });
}

function getSortFromParams(sortParam) {
  if (!sortParam) return [];
  return sortParam.split(',').map((item) => {
    const [attribute, direction] = item.split('_');
    return { attribute, direction };
  });
}

function getParamsFromSort(sort) {
  return sort.map((item) => `${item.attribute}_${item.direction}`).join(',');
}

function getFilterFromParams(filterParam) {
  if (!filterParam) return [];

  // Decode the URL-encoded parameter
  const decodedParam = decodeURIComponent(filterParam);
  const results = [];
  const filters = decodedParam.split('|');

  filters.forEach((filter) => {
    if (filter.includes(':')) {
      const [attribute, value] = filter.split(':');
      const commaRegex = /,(?!\s)/;

      if (commaRegex.test(value)) {
        // Handle array values like categories,
        // but allow for commas within an array value (eg. "Catalog, Search")
        results.push({
          attribute,
          in: value.split(commaRegex),
        });
      } else if (value.includes('-')) {
        // Handle range values (like price)
        const [from, to] = value.split('-');
        results.push({
          attribute,
          range: {
            from: Number(from),
            to: Number(to),
          },
        });
      } else {
        // Handle single values (like categories with one value)
        results.push({
          attribute,
          in: [value],
        });
      }
    }
  });

  return results;
}

function getParamsFromFilter(filter) {
  if (!filter || filter.length === 0) return '';

  return filter.map(({ attribute, in: inValues, range }) => {
    if (inValues) {
      return `${attribute}:${inValues.join(',')}`;
    }

    if (range) {
      return `${attribute}:${range.from}-${range.to}`;
    }

    return null;
  }).filter(Boolean).join('|');
}

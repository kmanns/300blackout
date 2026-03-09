import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Parse block configuration from DA.live
 * @param {Element} block - The block element from DA.live
 * @returns {Object} Parsed configuration object
 */
function parseBlockConfig(block) {
  const alignment = block.dataset.alignment || 'center';
  const autoplay = block.dataset.autoplay !== 'false'; // Default true
  const itemsPerView = {
    mobile: parseInt(block.dataset.itemsMobile || '2', 10),
    tablet: parseInt(block.dataset.itemsTablet || '4', 10),
    desktop: parseInt(block.dataset.itemsDesktop || '6', 10),
  };

  const validAlignments = ['left', 'center', 'right'];

  return {
    alignment: validAlignments.includes(alignment) ? alignment : 'center',
    autoplay,
    itemsPerView,
  };
}

/**
 * Updates the carousel position and indicators
 * @param {Element} block - The carousel block element
 * @param {number} slideIndex - Index of the slide group to show
 */
function updateCarousel(block, slideIndex) {
  const track = block.querySelector('.circle-carousel-track');
  const indicators = block.querySelectorAll('.circle-carousel-indicator');
  const items = block.querySelectorAll('.circle-carousel-item');

  if (!track || items.length === 0) return;

  const itemWidth = items[0].offsetWidth;
  const gap = 24; // From CSS var(--spacing-medium)
  const offset = slideIndex * (itemWidth + gap);

  track.style.transform = `translateX(-${offset}px)`;
  block.dataset.currentSlide = slideIndex;

  // Update indicators
  indicators.forEach((indicator, idx) => {
    if (idx === slideIndex) {
      indicator.classList.add('active');
      indicator.querySelector('button').setAttribute('disabled', 'true');
    } else {
      indicator.classList.remove('active');
      indicator.querySelector('button').removeAttribute('disabled');
    }
  });
}

/**
 * Shows a specific slide group with bounds checking
 * @param {Element} block - The carousel block element
 * @param {number} slideIndex - Index of the slide group to show
 */
function showSlide(block, slideIndex) {
  const items = block.querySelectorAll('.circle-carousel-item');
  const config = parseBlockConfig(block);

  // Calculate max slides based on current viewport
  const viewportWidth = window.innerWidth;
  let itemsPerView = config.itemsPerView.desktop;

  if (viewportWidth < 768) {
    itemsPerView = config.itemsPerView.mobile;
  } else if (viewportWidth < 1024) {
    itemsPerView = config.itemsPerView.tablet;
  }

  const maxSlides = Math.max(0, items.length - itemsPerView);

  const realIndex = Math.min(Math.max(slideIndex, 0), maxSlides);

  updateCarousel(block, realIndex);
}

/**
 * Creates navigation controls (prev/next buttons and indicators)
 * @param {Element} block - The carousel block element
 * @param {number} totalItems - Total number of carousel items
 * @returns {Object} Object containing navigation element
 */
function createNavigation(block, totalItems) {
  const nav = document.createElement('div');
  nav.classList.add('circle-carousel-navigation');

  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.classList.add('circle-carousel-nav-btn', 'circle-carousel-prev');
  prevBtn.setAttribute('aria-label', 'Previous items');
  prevBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `;
  prevBtn.addEventListener('click', () => {
    const currentSlide = parseInt(block.dataset.currentSlide || '0', 10);
    showSlide(block, currentSlide - 1);
  });

  // Indicators container
  const indicatorsContainer = document.createElement('div');
  indicatorsContainer.classList.add('circle-carousel-indicators');

  const config = parseBlockConfig(block);
  const itemsPerView = config.itemsPerView.desktop;
  const totalSlides = Math.max(1, totalItems - itemsPerView + 1);

  for (let i = 0; i < totalSlides; i += 1) {
    const indicator = document.createElement('div');
    indicator.classList.add('circle-carousel-indicator');

    const btn = document.createElement('button');
    btn.setAttribute('aria-label', `Go to items ${i + 1}`);
    btn.addEventListener('click', () => showSlide(block, i));

    indicator.appendChild(btn);
    indicatorsContainer.appendChild(indicator);
  }

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.classList.add('circle-carousel-nav-btn', 'circle-carousel-next');
  nextBtn.setAttribute('aria-label', 'Next items');
  nextBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `;
  nextBtn.addEventListener('click', () => {
    const currentSlide = parseInt(block.dataset.currentSlide || '0', 10);
    showSlide(block, currentSlide + 1);
  });

  nav.appendChild(prevBtn);
  nav.appendChild(indicatorsContainer);
  nav.appendChild(nextBtn);

  return { nav };
}

/**
 * Starts automatic carousel progression with hover pause
 * @param {Element} block - The carousel block element
 * @param {number} interval - Time between slides in milliseconds
 */
function startAutoplay(block, interval = 4000) {
  let autoplayInterval = setInterval(() => {
    const currentSlide = parseInt(block.dataset.currentSlide || '0', 10);
    const items = block.querySelectorAll('.circle-carousel-item');
    const config = parseBlockConfig(block);

    const itemsPerView = config.itemsPerView.desktop;
    const maxSlides = Math.max(0, items.length - itemsPerView);

    // Loop back to start
    const nextSlide = currentSlide >= maxSlides ? 0 : currentSlide + 1;
    showSlide(block, nextSlide);
  }, interval);

  // Pause on hover
  block.addEventListener('mouseenter', () => {
    if (autoplayInterval) {
      clearInterval(autoplayInterval);
      autoplayInterval = null;
    }
  });

  // Resume on mouse leave
  block.addEventListener('mouseleave', () => {
    if (!autoplayInterval) {
      autoplayInterval = setInterval(() => {
        const currentSlide = parseInt(block.dataset.currentSlide || '0', 10);
        const items = block.querySelectorAll('.circle-carousel-item');
        const config = parseBlockConfig(block);

        const itemsPerView = config.itemsPerView.desktop;
        const maxSlides = Math.max(0, items.length - itemsPerView);

        const nextSlide = currentSlide >= maxSlides ? 0 : currentSlide + 1;
        showSlide(block, nextSlide);
      }, interval);
    }
  });
}

/**
 * Decorates the circle-carousel block
 * @param {Element} block - The circle-carousel block element
 */
export default function decorate(block) {
  // Parse configuration
  const config = parseBlockConfig(block);

  const rows = [...block.children];

  // Create carousel container
  const container = document.createElement('div');
  container.classList.add('circle-carousel-container');
  container.setAttribute('data-alignment', config.alignment);

  // Create viewport and track
  const viewport = document.createElement('div');
  viewport.classList.add('circle-carousel-viewport');

  const track = document.createElement('div');
  track.classList.add('circle-carousel-track');

  rows.forEach((row, index) => {
    const columns = [...row.children];

    const item = document.createElement('div');
    item.classList.add('circle-carousel-item');
    item.dataset.index = index;

    // Column 0: Circle image
    const circle = document.createElement('div');
    circle.classList.add('circle-carousel-circle');

    const img = columns[0]?.querySelector('img');
    if (img) {
      const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '200' }]);
      circle.appendChild(optimizedPic);
    }

    item.appendChild(circle);

    // Column 1: Linked text (title/category name)
    if (columns[1]) {
      const textDiv = document.createElement('div');
      textDiv.classList.add('circle-carousel-text');

      // Check if there's already a link in the content
      const existingLink = columns[1].querySelector('a');
      if (existingLink) {
        textDiv.appendChild(existingLink);
      } else {
        // Move all content as-is
        while (columns[1].firstElementChild) {
          textDiv.appendChild(columns[1].firstElementChild);
        }
      }

      item.appendChild(textDiv);
    }

    track.appendChild(item);
  });

  viewport.appendChild(track);
  container.appendChild(viewport);

  block.innerHTML = '';
  block.appendChild(container);

  // Add navigation if more items than can be displayed
  if (rows.length > config.itemsPerView.desktop) {
    const { nav } = createNavigation(block, rows.length);
    block.appendChild(nav);

    // Initialize
    showSlide(block, 0);

    // Start autoplay if enabled
    if (config.autoplay) {
      startAutoplay(block);
    }
  } else {
    // Still initialize for proper display
    showSlide(block, 0);
  }

  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const currentSlide = parseInt(block.dataset.currentSlide || '0', 10);
      showSlide(block, currentSlide);
    }, 250);
  });
}

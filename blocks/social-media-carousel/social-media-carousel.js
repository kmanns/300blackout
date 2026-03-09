function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('//')) return '';

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

function getYouTubeId(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      return parsed.pathname.replace('/', '').split('/')[0];
    }

    if (host.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.replace('/shorts/', '').split('/')[0];
      }

      if (parsed.searchParams.get('v')) {
        return parsed.searchParams.get('v');
      }

      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.replace('/embed/', '').split('/')[0];
      }
    }
  } catch {
    return '';
  }

  return '';
}

function detectPlatform(rawUrl, rawPlatform = '') {
  const platform = rawPlatform.toLowerCase().trim();
  const url = sanitizeUrl(rawUrl);
  if (!url) return '';

  if (platform.includes('instagram')) return 'instagram';
  if (platform.includes('youtube') || platform.includes('shorts')) return 'youtube';

  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
  } catch {
    return '';
  }

  return '';
}

function loadInstagramScript() {
  if (window.__socialInstagramEmbedLoaded) return;

  const script = document.createElement('script');
  script.src = 'https://www.instagram.com/embed.js';
  script.async = true;
  script.onload = () => {
    window.__socialInstagramEmbedLoaded = true;
    if (window.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process();
    }
  };

  document.body.append(script);
}

function parseRows(block) {
  return [...block.querySelectorAll(':scope > div')]
    .map((row) => {
      const cells = [...row.querySelectorAll(':scope > div')];
      const firstCell = cells[0];
      const secondCell = cells[1];
      const thirdCell = cells[2];

      const firstUrl = firstCell?.querySelector('a')?.href || '';
      const secondUrl = secondCell?.querySelector('a')?.href || '';

      const rawUrl = secondUrl || firstUrl;
      const rawPlatform = secondUrl ? firstCell?.textContent || '' : '';
      const platform = detectPlatform(rawUrl, rawPlatform);
      const url = sanitizeUrl(rawUrl);

      const captionSource = secondUrl ? thirdCell : secondCell;
      const caption = captionSource?.innerHTML?.trim() || '';

      if (!url || !platform) return null;

      return {
        platform,
        url,
        caption,
      };
    })
    .filter(Boolean);
}

function createInstagramEmbed(url) {
  const container = document.createElement('div');
  container.className = 'social-media-carousel-media';

  const quote = document.createElement('blockquote');
  quote.className = 'instagram-media';
  quote.dataset.instgrmPermalink = url;
  quote.dataset.instgrmVersion = '14';

  const fallback = document.createElement('a');
  fallback.href = url;
  fallback.target = '_blank';
  fallback.rel = 'noopener noreferrer';
  fallback.textContent = 'View Instagram post';

  quote.append(fallback);
  container.append(quote);

  return container;
}

function createYouTubeEmbed(url) {
  const id = getYouTubeId(url);
  if (!id) return null;

  const container = document.createElement('div');
  container.className = 'social-media-carousel-media';

  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
  frame.title = 'YouTube Shorts';
  frame.loading = 'lazy';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allowFullscreen = true;

  container.append(frame);
  return container;
}

function createSlide(item, index) {
  const slide = document.createElement('li');
  slide.className = 'social-media-carousel-slide';
  slide.id = `social-media-slide-${index + 1}`;

  const card = document.createElement('article');
  card.className = 'social-media-carousel-card';

  const platform = document.createElement('p');
  platform.className = 'social-media-carousel-platform';
  platform.textContent = item.platform === 'youtube' ? 'YouTube Shorts' : 'Instagram';

  let media = null;
  if (item.platform === 'youtube') {
    media = createYouTubeEmbed(item.url);
  } else {
    media = createInstagramEmbed(item.url);
  }

  if (!media) return null;

  card.append(platform, media);

  if (item.caption) {
    const caption = document.createElement('div');
    caption.className = 'social-media-carousel-caption';
    caption.innerHTML = item.caption;
    card.append(caption);
  }

  slide.append(card);
  return slide;
}

function updateIndicators(block) {
  const track = block.querySelector('.social-media-carousel-track');
  const slides = [...block.querySelectorAll('.social-media-carousel-slide')];
  const indicators = [...block.querySelectorAll('.social-media-carousel-indicator button')];

  if (!track || !slides.length || !indicators.length) return;

  const { scrollLeft } = track;
  let activeIndex = 0;
  let smallestDistance = Number.POSITIVE_INFINITY;

  slides.forEach((slide, idx) => {
    const distance = Math.abs(slide.offsetLeft - scrollLeft);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      activeIndex = idx;
    }
  });

  indicators.forEach((button, idx) => {
    button.disabled = idx === activeIndex;
  });
}

function scrollToSlide(block, index) {
  const track = block.querySelector('.social-media-carousel-track');
  const slides = [...block.querySelectorAll('.social-media-carousel-slide')];
  const { [index]: target } = slides;

  if (!track || !target) return;

  track.scrollTo({
    left: target.offsetLeft,
    behavior: 'smooth',
  });
}

function bindControls(block) {
  const prev = block.querySelector('.social-media-carousel-prev');
  const next = block.querySelector('.social-media-carousel-next');
  const track = block.querySelector('.social-media-carousel-track');
  const slides = [...block.querySelectorAll('.social-media-carousel-slide')];

  if (!track || slides.length < 2) return;

  let currentIndex = 0;

  prev?.addEventListener('click', () => {
    currentIndex = currentIndex === 0 ? slides.length - 1 : currentIndex - 1;
    scrollToSlide(block, currentIndex);
  });

  next?.addEventListener('click', () => {
    currentIndex = currentIndex === slides.length - 1 ? 0 : currentIndex + 1;
    scrollToSlide(block, currentIndex);
  });

  block.querySelectorAll('.social-media-carousel-indicator button').forEach((button, idx) => {
    button.addEventListener('click', () => {
      currentIndex = idx;
      scrollToSlide(block, idx);
    });
  });

  track.addEventListener('scroll', () => {
    window.requestAnimationFrame(() => updateIndicators(block));
  }, { passive: true });

  updateIndicators(block);
}

export default function decorate(block) {
  const items = parseRows(block);
  block.textContent = '';

  if (!items.length) {
    block.dataset.socialState = 'empty';
    return;
  }

  if (items.some((item) => item.platform === 'instagram')) {
    loadInstagramScript();
  }

  const shell = document.createElement('div');
  shell.className = 'social-media-carousel-shell';

  const controls = document.createElement('div');
  controls.className = 'social-media-carousel-controls';
  controls.innerHTML = '<button type="button" class="social-media-carousel-prev" aria-label="Previous social post">Previous</button><button type="button" class="social-media-carousel-next" aria-label="Next social post">Next</button>';

  const track = document.createElement('ol');
  track.className = 'social-media-carousel-track';

  const indicators = document.createElement('ol');
  indicators.className = 'social-media-carousel-indicators';

  items.forEach((item, index) => {
    const slide = createSlide(item, index);
    if (!slide) return;

    track.append(slide);

    const indicator = document.createElement('li');
    indicator.className = 'social-media-carousel-indicator';
    indicator.innerHTML = `<button type="button" aria-label="Show social slide ${index + 1}"></button>`;
    indicators.append(indicator);
  });

  shell.append(controls, track, indicators);
  block.append(shell);

  bindControls(block);

  if (window.instgrm?.Embeds?.process) {
    window.instgrm.Embeds.process();
  }
}

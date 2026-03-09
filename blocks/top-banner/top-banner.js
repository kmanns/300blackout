const DEFAULTS = {
  mode: 'static',
  mount: 'header',
  mountTarget: 'header .header.block',
  layout: 'split',
  ariaLive: 'off',
  align: 'left',
  variant: 'neutral',
  maxWidth: 'none',
  textSize: 'md',
  textWeight: '500',
  density: 'default',
  contentGap: 'none',
  bgColor: 'neutral',
  textColor: 'dark',
  speed: 'medium',
  direction: 'left',
  pauseOnHover: true,
  loopGap: 'medium',
  source: 'all',
  debug: false,
};

const DATASET_KEYS = Object.freeze({
  mode: 'topbannerMode',
  mount: 'topbannerMount',
  mountTarget: 'topbannerMounttarget',
  layout: 'topbannerLayout',
  ariaLive: 'topbannerArialive',
  align: 'topbannerAlign',
  variant: 'topbannerVariant',
  maxWidth: 'topbannerMaxwidth',
  textSize: 'topbannerTextsize',
  textWeight: 'topbannerTextweight',
  density: 'topbannerDensity',
  contentGap: 'topbannerContentgap',
  bgColor: 'topbannerBgcolor',
  textColor: 'topbannerTextcolor',
  speed: 'topbannerSpeed',
  direction: 'topbannerDirection',
  pauseOnHover: 'topbannerPauseonhover',
  loopGap: 'topbannerLoopgap',
  source: 'topbannerSource',
  debug: 'topbannerDebug',
});

const TYPED_ROW_TYPES = ['message', 'utility', 'ticker-item'];
const REQUIRED_WIDTHS = [360, 390, 414, 480, 768, 1024, 1280, 1440, 1920];

const INSTANCE_STATE = new WeakMap();

const COLOR_MAP = {
  transparent: 'transparent',
  light: 'var(--color-neutral-100)',
  neutral: 'var(--color-neutral-200)',
  dark: 'var(--color-neutral-900)',
  brand: 'var(--color-brand-500)',
  accent: 'var(--color-informational-500)',
  white: 'var(--color-neutral-50)',
  black: '#000',
};

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function debugLog(config, message, details = {}) {
  if (!config.debug) return;
  // eslint-disable-next-line no-console
  console.log(`top-banner: ${message}`, details);
}

function warnInvalidConfig(key, rawValue, fallback) {
  if (!rawValue || !rawValue.toString().trim()) return;
  // eslint-disable-next-line no-console
  console.warn(`top-banner: invalid ${key} "${rawValue}". Using "${fallback}".`);
}

function warnNoOpConfig(key, value, reason) {
  if (!value || !value.toString().trim()) return;
  // eslint-disable-next-line no-console
  console.warn(`top-banner: ${key} "${value}" has no effect. ${reason}`);
}

function hasMeaningfulContent(cell) {
  return Boolean(cell && cell.textContent.trim());
}

function cloneCellContent(cell) {
  const fragment = document.createDocumentFragment();
  if (!cell) return fragment;
  [...cell.childNodes].forEach((node) => {
    fragment.append(node.cloneNode(true));
  });
  return fragment;
}

function normalizeTypedRowType(value) {
  const raw = (value || '').toString().trim().toLowerCase();
  if (raw === 'ticker' || raw === 'tickeritem') return 'ticker-item';
  return TYPED_ROW_TYPES.includes(raw) ? raw : '';
}

function parseRows(block) {
  return [...block.children].map((row) => {
    const cells = [...row.children];
    const type = normalizeTypedRowType(cells[0]?.textContent || '');

    if (type && cells.length > 1) {
      return {
        type,
        left: cells[1] || null,
        center: cells[2] || null,
        right: cells[3] || null,
      };
    }

    return {
      type: 'legacy',
      left: cells[0] || null,
      center: cells[1] || null,
      right: cells[2] || null,
    };
  });
}

function resolveRowGroups(rows) {
  const hasTyped = rows.some((row) => row.type !== 'legacy');
  if (!hasTyped) {
    return {
      hasTyped: false,
      messageRow: rows[0] || { left: null, center: null, right: null },
      utilityRows: [],
      tickerRows: rows,
    };
  }

  const messageRow = rows.find((row) => row.type === 'message')
    || rows.find((row) => row.type === 'legacy')
    || rows[0]
    || { left: null, center: null, right: null };

  const utilityRows = rows.filter((row) => row.type === 'utility');
  const explicitTickerRows = rows.filter((row) => row.type === 'ticker-item');
  const tickerRows = explicitTickerRows.length ? explicitTickerRows : [messageRow, ...utilityRows];

  return {
    hasTyped: true,
    messageRow,
    utilityRows,
    tickerRows,
  };
}

function readConfigValue(block, sectionData, canonicalKey, fallback) {
  const canonicalCandidates = [
    canonicalKey,
    `data${capitalize(canonicalKey)}`,
  ];

  for (let i = 0; i < canonicalCandidates.length; i += 1) {
    const candidate = canonicalCandidates[i];
    const blockValue = block.dataset?.[candidate];
    if (typeof blockValue === 'string' && blockValue.trim()) {
      return {
        value: blockValue,
        source: candidate,
      };
    }

    const sectionValue = sectionData?.[candidate];
    if (typeof sectionValue === 'string' && sectionValue.trim()) {
      return {
        value: sectionValue,
        source: candidate,
      };
    }
  }

  return {
    value: fallback,
    source: '',
  };
}

function normalizeToken(key, rawValue, allowed, fallback) {
  const normalized = (rawValue || '').toString().trim().toLowerCase();
  if (!normalized) return fallback;
  if (allowed.includes(normalized)) return normalized;
  warnInvalidConfig(key, rawValue, fallback);
  return fallback;
}

function normalizeBoolean(key, rawValue, fallback) {
  const normalized = (rawValue || '').toString().trim().toLowerCase();
  if (!normalized) return fallback;
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  warnInvalidConfig(key, rawValue, fallback ? 'true' : 'false');
  return fallback;
}

function normalizeColor(key, rawValue, fallback) {
  const raw = (rawValue || '').toString().trim();
  if (!raw) return fallback;
  const lowered = raw.toLowerCase();
  if (Object.keys(COLOR_MAP).includes(lowered)) return lowered;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
  if (/^rgba?\(/i.test(raw)) return raw;
  warnInvalidConfig(key, rawValue, fallback);
  return fallback;
}

function resolveColorToken(value) {
  const key = (value || '').toString().toLowerCase();
  return COLOR_MAP[key] || value;
}

function normalizeMountTarget(value, fallback) {
  const normalized = (value || '').toString().trim();
  return normalized || fallback;
}

function normalizeConfig(read, rows) {
  const config = {
    mode: normalizeToken('topbanner-mode', read.mode.value, ['static', 'ticker'], DEFAULTS.mode),
    mount: normalizeToken('topbanner-mount', read.mount.value, ['header', 'inline'], DEFAULTS.mount),
    mountTarget: normalizeMountTarget(read.mountTarget.value, DEFAULTS.mountTarget),
    layout: normalizeToken('topbanner-layout', read.layout.value, ['single', 'split', 'multi'], DEFAULTS.layout),
    ariaLive: normalizeToken('topbanner-arialive', read.ariaLive.value, ['off', 'polite'], DEFAULTS.ariaLive),
    align: normalizeToken('topbanner-align', read.align.value, ['left', 'center', 'right'], DEFAULTS.align),
    variant: normalizeToken('topbanner-variant', read.variant.value, ['info', 'promo', 'urgent', 'neutral'], DEFAULTS.variant),
    maxWidth: normalizeToken('topbanner-maxwidth', read.maxWidth.value, ['none', '1200', '1400', '1600'], DEFAULTS.maxWidth),
    textSize: normalizeToken('topbanner-textsize', read.textSize.value, ['sm', 'md', 'lg'], DEFAULTS.textSize),
    textWeight: normalizeToken('topbanner-textweight', read.textWeight.value, ['400', '500', '600', '700'], DEFAULTS.textWeight),
    density: normalizeToken('topbanner-density', read.density.value, ['default', 'compact'], DEFAULTS.density),
    contentGap: normalizeToken('topbanner-contentgap', read.contentGap.value, ['none', 'xsmall', 'small', 'medium', 'large'], DEFAULTS.contentGap),
    bgColor: normalizeColor('topbanner-bgcolor', read.bgColor.value, DEFAULTS.bgColor),
    textColor: normalizeColor('topbanner-textcolor', read.textColor.value, DEFAULTS.textColor),
    speed: normalizeToken('topbanner-speed', read.speed.value, ['slow', 'medium', 'fast'], DEFAULTS.speed),
    direction: normalizeToken('topbanner-direction', read.direction.value, ['left', 'right'], DEFAULTS.direction),
    pauseOnHover: normalizeBoolean('topbanner-pauseonhover', read.pauseOnHover.value, DEFAULTS.pauseOnHover),
    loopGap: normalizeToken('topbanner-loopgap', read.loopGap.value, ['small', 'medium', 'large'], DEFAULTS.loopGap),
    source: normalizeToken('topbanner-source', read.source.value, ['all', 'left', 'left-right'], DEFAULTS.source),
    debug: normalizeBoolean('topbanner-debug', read.debug.value, DEFAULTS.debug),
  };

  if (
    config.mode === 'static'
    && !read.layout.source
    && hasMeaningfulContent(rows.messageRow.center)
  ) {
    config.layout = 'multi';
  }

  if (config.mount === 'inline' && config.contentGap !== 'none') {
    warnNoOpConfig('topbanner-contentgap', config.contentGap, 'content gap applies only when mount is "header".');
  }

  if (config.mode === 'ticker' && read.layout.source && config.layout !== 'single') {
    warnNoOpConfig('topbanner-layout', read.layout.value, 'layout is forced to "single" in ticker mode.');
  }

  return config;
}

function isSafeHref(href) {
  const value = (href || '').toString().trim().toLowerCase();
  if (!value) return true;

  if (['#', '/', './', '../', '?'].some((token) => value.startsWith(token))) return true;
  if (value.startsWith('http://') || value.startsWith('https://')) return true;
  if (value.startsWith('mailto:') || value.startsWith('tel:')) return true;

  const blockedProtocols = [
    String.fromCharCode(106, 97, 118, 97, 115, 99, 114, 105, 112, 116, 58),
    'vbscript:',
    'data:',
  ];

  if (blockedProtocols.some((protocol) => value.startsWith(protocol))) return false;
  return false;
}

function sanitizeLinks(container) {
  if (!container) return;
  const links = container.querySelectorAll('a[href]');
  links.forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!isSafeHref(href)) {
      // eslint-disable-next-line no-console
      console.warn(`top-banner: blocked unsafe href "${href}"`);
      link.setAttribute('href', '#');
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.setAttribute('aria-disabled', 'true');
    }

    if (link.getAttribute('target') === '_blank') {
      const rel = (link.getAttribute('rel') || '').toLowerCase();
      const relTokens = rel.split(/\s+/).filter(Boolean);
      if (!relTokens.includes('noopener')) relTokens.push('noopener');
      if (!relTokens.includes('noreferrer')) relTokens.push('noreferrer');
      link.setAttribute('rel', relTokens.join(' '));
    }
  });
}

function rgbStringToArray(value) {
  const match = (value || '').match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function channelToLinear(channel) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(rgb) {
  if (!rgb) return null;
  const [r, g, b] = rgb.map(channelToLinear);
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function getContrastRatio(foreground, background) {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function warnIfLowContrast(block) {
  const styles = window.getComputedStyle(block);
  const foreground = rgbStringToArray(styles.color);
  const background = rgbStringToArray(styles.backgroundColor);
  const ratio = getContrastRatio(foreground, background);
  if (ratio !== null && ratio < 4.5) {
    // eslint-disable-next-line no-console
    console.warn(`top-banner: potential low contrast (${ratio.toFixed(2)}:1).`);
  }
}

function emitBlockEvent(block, name, detail = {}) {
  block.dispatchEvent(new CustomEvent(`top-banner:${name}`, {
    bubbles: true,
    detail,
  }));
}

function resolveContentGapValue(token) {
  const map = {
    none: '0px',
    xsmall: 'var(--spacing-xsmall)',
    small: 'var(--spacing-small)',
    medium: 'var(--spacing-medium)',
    large: 'var(--spacing-big)',
  };
  return map[token] || map.none;
}

function getHeaderMountedVisibleBanners() {
  return [...document.querySelectorAll('.top-banner[data-topbanner-mount="header"]')]
    .filter((banner) => document.contains(banner));
}

function applyPortableHeaderOffsets(totalHeight, gapToken) {
  const navWrapper = document.querySelector('header .nav-wrapper');
  const main = document.querySelector('main');
  const safeHeight = Math.max(0, Math.round(totalHeight));
  const gapValue = resolveContentGapValue(gapToken);

  if (safeHeight <= 0) {
    document.documentElement.style.removeProperty('--top-banner-height');
    if (navWrapper) navWrapper.style.removeProperty('top');
    if (main) main.style.removeProperty('padding-top');

    return {
      hasNavWrapper: Boolean(navWrapper),
      hasMain: Boolean(main),
      safeHeight,
      cleared: true,
    };
  }

  document.documentElement.style.setProperty('--top-banner-height', `${safeHeight}px`);

  if (navWrapper) {
    navWrapper.style.top = `${safeHeight}px`;
  }

  if (main) {
    main.style.paddingTop = `calc(${safeHeight}px + ${gapValue})`;
  }

  return {
    hasNavWrapper: Boolean(navWrapper),
    hasMain: Boolean(main),
    safeHeight,
    cleared: false,
  };
}

function updateAllHeaderOffsets() {
  const banners = getHeaderMountedVisibleBanners();
  const totalHeight = banners
    .reduce((sum, banner) => sum + Math.max(0, banner.getBoundingClientRect().height), 0);
  const gapToken = banners[0]?.dataset?.topbannerContentgap || DEFAULTS.contentGap;
  return applyPortableHeaderOffsets(totalHeight, gapToken);
}

function mountBannerToHeader(block, mountTarget) {
  if (block.closest('header')) return true;

  const sourceSection = block.closest('.section');
  let target = null;

  try {
    target = document.querySelector(mountTarget);
  } catch {
    target = null;
  }

  target = target
    || document.querySelector('header .header.block')
    || document.querySelector('header .header')
    || document.querySelector('header');

  if (!target) return false;

  const navWrapper = target.querySelector(':scope > .nav-wrapper');
  if (navWrapper) target.insertBefore(block, navWrapper);
  else target.prepend(block);

  if (sourceSection) {
    const remainingBlocks = sourceSection.querySelectorAll('.block');
    if (!remainingBlocks.length) {
      sourceSection.style.display = 'none';
      sourceSection.dataset.topBannerMounted = 'true';
    }
  }

  return true;
}

function ensureNavWrapperObserver(state, config) {
  if (state.navObserver || document.querySelector('header .nav-wrapper')) return;
  const observeTarget = document.querySelector('header .header.block')
    || document.querySelector('header .header')
    || document.querySelector('header')
    || document.body;
  if (!observeTarget) return;

  state.navObserver = new MutationObserver(() => {
    if (document.querySelector('header .nav-wrapper')) {
      state.navObserver.disconnect();
      state.navObserver = null;
      updateAllHeaderOffsets();
      debugLog(config, 'nav-wrapper observed and offsets refreshed');
    }
  });

  state.navObserver.observe(observeTarget, { childList: true, subtree: true });
}

function buildTickerCellsForSource(row, source) {
  if (source === 'left') return [row.left];
  if (source === 'left-right') return [row.left, row.right];
  return [row.left, row.center, row.right];
}

function createTickerTrack(messages) {
  const track = document.createElement('div');
  track.className = 'top-banner-ticker-track';

  messages.forEach((message, index) => {
    const item = document.createElement('span');
    item.className = 'top-banner-ticker-item';
    item.append(cloneCellContent(message));
    track.append(item);

    if (index < messages.length - 1) {
      const separator = document.createElement('span');
      separator.className = 'top-banner-ticker-separator';
      separator.textContent = '\u2022';
      track.append(separator);
    }
  });

  return track;
}

function shouldRenderTickerStatic() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReducedMotion;
}

function buildTicker(leftLane, rows, config, signal) {
  const sourceRows = rows.filter((row) => row);
  const messages = sourceRows
    .flatMap((row) => buildTickerCellsForSource(row, config.source))
    .filter(hasMeaningfulContent);

  if (!messages.length) {
    leftLane.textContent = '';
    return { isAnimated: false, ticker: null };
  }

  if (shouldRenderTickerStatic()) {
    leftLane.append(cloneCellContent(messages[0]));
    return { isAnimated: false, ticker: null };
  }

  const ticker = document.createElement('div');
  ticker.className = 'top-banner-ticker';
  ticker.dataset.topbannerDirection = config.direction;
  ticker.dataset.topbannerSpeed = config.speed;
  ticker.dataset.topbannerPauseonhover = config.pauseOnHover ? 'true' : 'false';
  ticker.dataset.topbannerLoopgap = config.loopGap;
  ticker.dataset.topbannerSource = config.source;

  const track = createTickerTrack(messages);
  ticker.append(track);
  leftLane.append(ticker);

  let pausedByFocus = false;
  let pausedByHover = false;

  const applyPlaybackState = () => {
    if (pausedByFocus || pausedByHover) {
      track.style.animationPlayState = 'paused';
    } else {
      track.style.removeProperty('animation-play-state');
    }
  };

  const syncLayout = () => {
    if (!ticker.isConnected) return;

    ticker.dataset.topbannerStatic = 'false';
    const tickerWidth = Math.ceil(ticker.clientWidth);
    const trackWidth = Math.ceil(track.scrollWidth);

    if (tickerWidth > 0 && trackWidth > 0) {
      if (config.direction === 'right') {
        track.style.setProperty('--top-banner-track-start', `-${trackWidth}px`);
        track.style.setProperty('--top-banner-track-end', `${tickerWidth}px`);
      } else {
        track.style.setProperty('--top-banner-track-start', `${tickerWidth}px`);
        track.style.setProperty('--top-banner-track-end', `-${trackWidth}px`);
      }
    }

    applyPlaybackState();
  };

  ticker.addEventListener('focusin', () => {
    pausedByFocus = true;
    applyPlaybackState();
  }, { signal });

  ticker.addEventListener('focusout', (event) => {
    if (!ticker.contains(event.relatedTarget)) {
      pausedByFocus = false;
      applyPlaybackState();
    }
  }, { signal });

  if (config.pauseOnHover) {
    // Use pointer events instead of pure CSS :hover so initial cursor position
    // does not freeze ticker on first paint.
    ticker.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      pausedByHover = true;
      applyPlaybackState();
    }, { signal });

    ticker.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      pausedByHover = false;
      applyPlaybackState();
    }, { signal });
  }

  return {
    isAnimated: true,
    ticker,
    syncLayout,
  };
}

function appendLaneFragments(lane, cells) {
  const visibleCells = cells.filter(hasMeaningfulContent);
  visibleCells.forEach((cell, index) => {
    const fragment = document.createElement('span');
    fragment.className = 'top-banner-fragment';
    fragment.append(cloneCellContent(cell));
    lane.append(fragment);

    if (index < visibleCells.length - 1) {
      const separator = document.createElement('span');
      separator.className = 'top-banner-fragment-separator';
      separator.textContent = '\u2022';
      lane.append(separator);
    }
  });
}

function runAutomatedChecks(block, config) {
  const checks = [];

  const linkIssues = [...block.querySelectorAll('a[href]')].filter((link) => !isSafeHref(link.getAttribute('href')));
  checks.push({
    check: 'url-sanitization',
    pass: linkIssues.length === 0,
    detail: linkIssues.length ? `${linkIssues.length} unsafe link(s)` : 'all links safe',
  });

  const metadataPass = ['static', 'ticker'].includes(config.mode)
    && ['header', 'inline'].includes(config.mount)
    && ['single', 'split', 'multi'].includes(config.layout)
    && ['left', 'center', 'right'].includes(config.align);
  checks.push({
    check: 'metadata-normalization',
    pass: metadataPass,
    detail: metadataPass ? 'normalized values in allowed sets' : 'one or more values outside allowed sets',
  });

  const currentWidth = window.innerWidth;
  const nearestSweepWidth = REQUIRED_WIDTHS.reduce((nearest, width) => (
    Math.abs(width - currentWidth) < Math.abs(nearest - currentWidth) ? width : nearest
  ), REQUIRED_WIDTHS[0]);

  const headerMountedBanners = getHeaderMountedVisibleBanners();
  const hasHeaderMountedBanners = headerMountedBanners.length > 0;
  const navWrapper = document.querySelector('header .nav-wrapper');
  const main = document.querySelector('main');
  const bannerHeight = Math.round(block.getBoundingClientRect().height);
  const navTop = navWrapper
    ? Math.round(Number.parseFloat(window.getComputedStyle(navWrapper).top) || 0)
    : 0;
  const offsetPass = config.mount !== 'header' || !navWrapper || Math.abs(navTop - bannerHeight) <= 2;
  const navInlineTop = (navWrapper?.style.top || '').trim();
  const mainInlinePaddingTop = (main?.style.paddingTop || '').trim();

  checks.push({
    check: 'offset-behavior',
    pass: offsetPass,
    detail: config.mount !== 'header'
      ? 'inline mount (offset not required)'
      : `viewport ${currentWidth}px (nearest required width ${nearestSweepWidth}px), navTop=${navTop}, banner=${bannerHeight}`,
  });

  checks.push({
    check: 'offset-reset-when-no-header-banner',
    pass: hasHeaderMountedBanners || (!navInlineTop && !mainInlinePaddingTop),
    detail: hasHeaderMountedBanners
      ? 'skipped: header-mounted banner exists'
      : `navInlineTop=${navInlineTop || '(empty)'}, mainInlinePaddingTop=${mainInlinePaddingTop || '(empty)'}`,
  });

  let headerMountOffsetsDetail = 'inline mount';
  if (config.mount === 'header') {
    if (!navWrapper || !main) {
      headerMountOffsetsDetail = 'nav-wrapper/main not both present';
    } else {
      headerMountOffsetsDetail = `navInlineTop=${navInlineTop || '(empty)'}, mainInlinePaddingTop=${mainInlinePaddingTop || '(empty)'}`;
    }
  }

  checks.push({
    check: 'header-mount-inline-offsets',
    pass: config.mount !== 'header'
      || !navWrapper
      || !main
      || (Boolean(navInlineTop) && Boolean(mainInlinePaddingTop)),
    detail: headerMountOffsetsDetail,
  });

  block.dispatchEvent(new CustomEvent('top-banner:checks', {
    bubbles: true,
    detail: {
      checks,
      requiredSweep: REQUIRED_WIDTHS,
    },
  }));

  if (checks.some((item) => !item.pass)) {
    // eslint-disable-next-line no-console
    console.warn('top-banner: automated checks found issues.', checks);
  } else {
    // eslint-disable-next-line no-console
    console.info('top-banner: automated checks passed.', checks);
  }
}

function cleanupInstance(block) {
  const state = INSTANCE_STATE.get(block);
  if (!state) return;

  state.controller.abort();

  if (state.resizeObserver) {
    state.resizeObserver.disconnect();
    state.resizeObserver = null;
  }

  if (state.disconnectObserver) {
    state.disconnectObserver.disconnect();
    state.disconnectObserver = null;
  }

  if (state.navObserver) {
    state.navObserver.disconnect();
    state.navObserver = null;
  }

  if (state.resizeTimer) {
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = 0;
  }

  INSTANCE_STATE.delete(block);
  updateAllHeaderOffsets();
}

function createInstanceState(block) {
  const controller = new AbortController();
  const state = {
    block,
    controller,
    signal: controller.signal,
    resizeObserver: null,
    disconnectObserver: null,
    navObserver: null,
    resizeTimer: 0,
  };
  INSTANCE_STATE.set(block, state);
  return state;
}

function applyConfigDataset(block, config) {
  block.dataset[DATASET_KEYS.mode] = config.mode;
  block.dataset[DATASET_KEYS.mount] = config.mount;
  block.dataset[DATASET_KEYS.mountTarget] = config.mountTarget;
  block.dataset[DATASET_KEYS.layout] = config.layout;
  block.dataset[DATASET_KEYS.ariaLive] = config.ariaLive;
  block.dataset[DATASET_KEYS.align] = config.align;
  block.dataset[DATASET_KEYS.variant] = config.variant;
  block.dataset[DATASET_KEYS.maxWidth] = config.maxWidth;
  block.dataset[DATASET_KEYS.textSize] = config.textSize;
  block.dataset[DATASET_KEYS.textWeight] = config.textWeight;
  block.dataset[DATASET_KEYS.density] = config.density;
  block.dataset[DATASET_KEYS.contentGap] = config.contentGap;
  block.dataset[DATASET_KEYS.bgColor] = config.bgColor;
  block.dataset[DATASET_KEYS.textColor] = config.textColor;
  block.dataset[DATASET_KEYS.speed] = config.speed;
  block.dataset[DATASET_KEYS.direction] = config.direction;
  block.dataset[DATASET_KEYS.pauseOnHover] = config.pauseOnHover ? 'true' : 'false';
  block.dataset[DATASET_KEYS.loopGap] = config.loopGap;
  block.dataset[DATASET_KEYS.source] = config.source;
  block.dataset[DATASET_KEYS.debug] = config.debug ? 'true' : 'false';
}

function buildConfig(block, rowGroups) {
  const sectionData = block.closest('.section')?.dataset || {};

  const read = {
    mode: readConfigValue(block, sectionData, DATASET_KEYS.mode, DEFAULTS.mode),
    mount: readConfigValue(block, sectionData, DATASET_KEYS.mount, DEFAULTS.mount),
    mountTarget: readConfigValue(
      block,
      sectionData,
      DATASET_KEYS.mountTarget,
      DEFAULTS.mountTarget,
    ),
    layout: readConfigValue(block, sectionData, DATASET_KEYS.layout, DEFAULTS.layout),
    ariaLive: readConfigValue(block, sectionData, DATASET_KEYS.ariaLive, DEFAULTS.ariaLive),
    align: readConfigValue(block, sectionData, DATASET_KEYS.align, DEFAULTS.align),
    variant: readConfigValue(block, sectionData, DATASET_KEYS.variant, DEFAULTS.variant),
    maxWidth: readConfigValue(block, sectionData, DATASET_KEYS.maxWidth, DEFAULTS.maxWidth),
    textSize: readConfigValue(block, sectionData, DATASET_KEYS.textSize, DEFAULTS.textSize),
    textWeight: readConfigValue(block, sectionData, DATASET_KEYS.textWeight, DEFAULTS.textWeight),
    density: readConfigValue(block, sectionData, DATASET_KEYS.density, DEFAULTS.density),
    contentGap: readConfigValue(block, sectionData, DATASET_KEYS.contentGap, DEFAULTS.contentGap),
    bgColor: readConfigValue(block, sectionData, DATASET_KEYS.bgColor, DEFAULTS.bgColor),
    textColor: readConfigValue(block, sectionData, DATASET_KEYS.textColor, DEFAULTS.textColor),
    speed: readConfigValue(block, sectionData, DATASET_KEYS.speed, DEFAULTS.speed),
    direction: readConfigValue(block, sectionData, DATASET_KEYS.direction, DEFAULTS.direction),
    pauseOnHover: readConfigValue(block, sectionData, DATASET_KEYS.pauseOnHover, ''),
    loopGap: readConfigValue(block, sectionData, DATASET_KEYS.loopGap, DEFAULTS.loopGap),
    source: readConfigValue(block, sectionData, DATASET_KEYS.source, DEFAULTS.source),
    debug: readConfigValue(block, sectionData, DATASET_KEYS.debug, ''),
  };

  return normalizeConfig(read, rowGroups);
}

export default function decorate(block) {
  cleanupInstance(block);

  const rows = parseRows(block);
  if (!rows.length) return;

  const rowGroups = resolveRowGroups(rows);
  const config = buildConfig(block, rowGroups);

  const state = createInstanceState(block);

  state.signal.addEventListener('abort', () => {
    updateAllHeaderOffsets();
  }, { once: true });

  const disconnectRoot = block.parentElement || block.closest('main') || document.body;
  state.disconnectObserver = new MutationObserver(() => {
    if (!block.isConnected) {
      cleanupInstance(block);
    }
  });
  state.disconnectObserver.observe(disconnectRoot, {
    childList: true,
    subtree: disconnectRoot === document.body,
  });

  applyConfigDataset(block, config);

  if (config.mount === 'header') {
    const mounted = mountBannerToHeader(block, config.mountTarget);
    if (!mounted) {
      // eslint-disable-next-line no-console
      console.warn(`top-banner: header mount target not found ("${config.mountTarget}").`);
    }
  }

  block.style.setProperty('--top-banner-bg', resolveColorToken(config.bgColor));
  block.style.setProperty('--top-banner-text', resolveColorToken(config.textColor));

  const effectiveLayout = config.mode === 'ticker' ? 'single' : config.layout;
  block.dataset.topbannerEffectivelayout = effectiveLayout;

  const inner = document.createElement('div');
  inner.className = 'top-banner-inner';

  const leftLane = document.createElement('div');
  leftLane.className = 'top-banner-lane top-banner-lane-left';

  let tickerRuntime = {
    isAnimated: false,
    ticker: null,
    syncLayout: () => {},
  };

  if (config.mode === 'ticker') {
    tickerRuntime = buildTicker(leftLane, rowGroups.tickerRows, config, state.signal);
  } else {
    appendLaneFragments(leftLane, [rowGroups.messageRow.left]);
  }

  inner.append(leftLane);

  if (config.mode !== 'ticker' && effectiveLayout === 'multi') {
    const centerCells = [
      rowGroups.messageRow.center,
      ...rowGroups.utilityRows.map((row) => row.center),
    ];

    if (centerCells.some(hasMeaningfulContent)) {
      const centerLane = document.createElement('div');
      centerLane.className = 'top-banner-lane top-banner-lane-center';
      appendLaneFragments(centerLane, centerCells);
      inner.append(centerLane);
    }
  }

  if (config.mode !== 'ticker' && ['split', 'multi'].includes(effectiveLayout)) {
    const rightCells = [
      rowGroups.messageRow.right,
      ...rowGroups.utilityRows.map((row) => row.right),
    ];

    if (rightCells.some(hasMeaningfulContent)) {
      const rightLane = document.createElement('div');
      rightLane.className = 'top-banner-lane top-banner-lane-right';
      appendLaneFragments(rightLane, rightCells);
      inner.append(rightLane);
    }
  }

  block.replaceChildren(inner);

  sanitizeLinks(block);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', 'Site announcement');
  block.setAttribute('aria-live', config.ariaLive);

  warnIfLowContrast(block);

  if (tickerRuntime.isAnimated) {
    requestAnimationFrame(() => {
      tickerRuntime.syncLayout();
    });
  }

  const runResizeSync = () => {
    if (config.mount === 'header') {
      updateAllHeaderOffsets();
      ensureNavWrapperObserver(state, config);
    } else {
      updateAllHeaderOffsets();
    }

    if (tickerRuntime.isAnimated) {
      tickerRuntime.syncLayout();
    }
  };

  const handleResize = () => {
    if (state.resizeTimer) window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(() => {
      state.resizeTimer = 0;
      runResizeSync();
    }, 150);
  };

  if (config.mount === 'header' || tickerRuntime.isAnimated) {
    window.addEventListener('resize', handleResize, { signal: state.signal, passive: true });
  }

  if (config.mount === 'header') {
    state.resizeObserver = new ResizeObserver(() => {
      updateAllHeaderOffsets();
    });
    state.resizeObserver.observe(block);

    updateAllHeaderOffsets();
    ensureNavWrapperObserver(state, config);
  } else {
    updateAllHeaderOffsets();
  }

  emitBlockEvent(block, 'shown', {
    mode: config.mode,
    mount: config.mount,
    source: config.source,
    direction: config.direction,
    animated: tickerRuntime.isAnimated,
  });

  if (tickerRuntime.isAnimated) {
    emitBlockEvent(block, 'ticker-start', {
      source: config.source,
      direction: config.direction,
      speed: config.speed,
    });
  }

  if (config.debug) {
    runAutomatedChecks(block, config);
  }
  debugLog(config, 'decorate complete', {
    mode: config.mode,
    mount: config.mount,
    layout: config.layout,
    effectiveLayout,
    typedRows: rowGroups.hasTyped,
  });
}

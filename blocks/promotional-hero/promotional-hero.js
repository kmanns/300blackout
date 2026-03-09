import { createOptimizedPicture } from '../../scripts/aem.js';

const DEFAULTS = {
  align: 'center',
  columns: '2',
  cardWidth: 'medium',
  cardHeight: 'auto',
  imageRatio: 'portrait',
  imageFit: 'cover',
  gap: 'medium',
  density: 'comfortable',
  contentStyle: 'floating',
  contentAlign: 'center',
  panelWidth: 'standard',
  panelOffset: 'medium',
  contentBgColor: 'white',
  contentTextColor: 'dark',
  contentBorderStyle: 'none',
  contentBorderColor: '',
  contentShadow: 'soft',
  contentRadius: 'default',
  cardBorderStyle: 'none',
  cardBorderColor: '',
  cardBorderWidth: '0',
  buttonStyle: 'outline',
  buttonCorner: '',
  buttonWidth: 'medium',
  buttonTextTransform: 'none',
  buttonHoverMotion: 'lift',
  buttonHoverColor: 'none',
  buttonBorderWidth: '3',
  buttonShadow: 'none',
  buttonFontSize: 'md',
  buttonFontWeight: '600',
  buttonBorderColor: 'white',
  buttonFillColor: 'transparent',
  buttonTextColor: 'white',
  cardRadius: 'default',
  imageShadow: 'soft',
  imagePosition: 'center',
  hoverEffect: 'subtle',
  imageOverlay: 'none',
  imageOverlayColor: 'dark',
  gridMaxWidth: 'none',
  mobileLayout: 'stack',
  descriptionMaxLines: 'none',
  descriptionStyle: 'body',
  backgroundColor: 'transparent',
  width: 'default',
  layout: 'linear',
  fallbackButtonLabel: 'Shop now',
};

function getConfigValue(blockValue, sectionData, keys, fallback) {
  if (blockValue) return blockValue;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (sectionData?.[key]) return sectionData[key];
  }
  return fallback;
}

function hasConfigValue(blockValue, sectionData, keys) {
  if (typeof blockValue === 'string' && blockValue.trim()) return true;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (typeof sectionData?.[key] === 'string' && sectionData[key].trim()) return true;
  }
  return false;
}

function readPromotionalConfig(block, sectionData, suffix, fallback) {
  const key = `promohero${suffix}`;
  const dataKey = `dataPromohero${suffix}`;
  return getConfigValue(block.dataset[key], sectionData, [key, dataKey], fallback);
}

function hasPromotionalConfig(block, sectionData, suffix) {
  const key = `promohero${suffix}`;
  const dataKey = `dataPromohero${suffix}`;
  return hasConfigValue(block.dataset[key], sectionData, [key, dataKey]);
}

function warnOnInvalidConfig(name, rawValue, normalizedValue, fallback) {
  if (!rawValue) return;
  const raw = String(rawValue).trim().toLowerCase();
  const normalized = String(normalizedValue ?? '').trim().toLowerCase();
  const fallbackValue = String(fallback ?? '').trim().toLowerCase();
  if (raw !== normalized && normalized === fallbackValue) {
    console.warn(`promotional-hero: invalid ${name} "${rawValue}". Using "${fallback}".`);
  }
}

function warnOnNoOpConfig(name, rawValue, reason) {
  if (!rawValue || !rawValue.toString().trim()) return;
  console.warn(`promotional-hero: ${name} "${rawValue}" has no effect. ${reason}`);
}

function normalizeToken(value, allowed, fallback) {
  const val = (value || '').toString().trim().toLowerCase();
  return allowed.includes(val) ? val : fallback;
}

function normalizeColor(value, fallback) {
  const raw = (value || '').toString().trim();
  if (!raw) return fallback;
  const val = raw.toLowerCase();
  const named = ['transparent', 'light', 'neutral', 'dark', 'brand', 'accent', 'white', 'black'];
  if (named.includes(val)) return val;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
  if (/^rgba?\(/i.test(raw)) return raw;
  return fallback;
}

function normalizePositiveInt(value, fallback, allowed = []) {
  const parsed = Number.parseInt((value || '').toString().trim(), 10);
  if (Number.isNaN(parsed)) return fallback;
  if (allowed.length && !allowed.includes(parsed)) return fallback;
  return parsed.toString();
}

function normalizeButtonCorner(value, fallback = '') {
  const val = (value || '').toString().trim().toLowerCase();
  if (!val) return fallback;
  return ['sharp', 'default', 'soft', 'rounded-lg', 'pill'].includes(val) ? val : fallback;
}

function normalizeLayoutWidth(value, fallback = 'default') {
  const val = (value || '').toString().trim().toLowerCase();
  if (['default', 'full-width'].includes(val)) return val;
  return fallback;
}

function normalizeLayoutPattern(value, fallback = 'linear') {
  const val = (value || '').toString().trim().toLowerCase();
  if (val === 'on') return 'honeycomb';
  if (val === 'off') return 'linear';
  if (['linear', 'honeycomb'].includes(val)) return val;
  return fallback;
}

function getResponsiveMaxLinearColumns() {
  const viewport = window.innerWidth || 0;
  if (viewport < 768) return 1;
  if (viewport < 1024) return 2;
  if (viewport < 1280) return 3;
  return 4;
}

function getLinearScale(columnCount, viewport) {
  if (columnCount <= 2) return '1';
  if (columnCount === 3) {
    if (viewport >= 1600) return '0.94';
    if (viewport >= 1280) return '0.9';
    return '0.86';
  }
  if (viewport >= 1800) return '0.84';
  if (viewport >= 1600) return '0.8';
  if (viewport >= 1400) return '0.76';
  return '0.72';
}

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Block protocol-relative external URLs.
  if (trimmed.startsWith('//')) return '';

  // Safe relative/hash/query forms.
  if (['#', '/', './', '../', '?'].some((token) => trimmed.startsWith(token))) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return trimmed;
    }
    return '';
  } catch {
    return '';
  }
}

function extractImageSource(cell) {
  if (!cell) return null;

  const pictureImg = cell.querySelector('picture img');
  if (pictureImg?.src) {
    return { src: pictureImg.src, alt: pictureImg.alt || '' };
  }

  const img = cell.querySelector('img');
  if (img?.src) {
    return { src: img.src, alt: img.alt || '' };
  }

  const link = cell.querySelector('a[href]');
  const linkedSrc = link?.getAttribute('href')?.trim();
  if (linkedSrc && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(linkedSrc)) {
    return { src: linkedSrc, alt: link.textContent.trim() || '' };
  }

  const rawText = cell.textContent?.trim();
  if (rawText && /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(rawText)) {
    return { src: rawText, alt: '' };
  }

  return null;
}

function createDescription(cell, config = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'promotional-hero-description';
  if (config.descriptionStyle) wrapper.dataset.descriptionStyle = config.descriptionStyle;
  if (config.descriptionMaxLines && config.descriptionMaxLines !== 'none') {
    wrapper.style.setProperty('--promotional-hero-description-max-lines', config.descriptionMaxLines);
  }

  if (!cell || !cell.textContent.trim()) return wrapper;

  const paragraphs = [...cell.querySelectorAll('p')];
  if (paragraphs.length) {
    paragraphs.forEach((paragraph) => {
      const line = document.createElement('p');
      line.textContent = paragraph.textContent.trim();
      if (line.textContent) wrapper.append(line);
    });
    return wrapper;
  }

  const text = cell.textContent
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (text.length) {
    text.forEach((lineText) => {
      const line = document.createElement('p');
      line.textContent = lineText;
      wrapper.append(line);
    });
  }

  return wrapper;
}

function parseButton(cell, fallbackLabel) {
  const fallback = {
    label: fallbackLabel,
    href: '#',
    target: '',
    rel: '',
  };
  if (!cell) return fallback;

  const authoredLink = cell.querySelector('a');
  if (authoredLink) {
    const label = authoredLink.textContent.trim() || fallbackLabel;
    const href = authoredLink.getAttribute('href')?.trim() || '#';
    const target = authoredLink.getAttribute('target')?.trim() || '';
    const rel = authoredLink.getAttribute('rel')?.trim() || '';
    return {
      label,
      href,
      target,
      rel,
    };
  }

  const raw = cell.textContent.trim();
  if (!raw) return fallback;

  const [labelPart, hrefPart] = raw.split('|').map((part) => part?.trim());
  return {
    label: labelPart || fallbackLabel,
    href: hrefPart || '#',
    target: '',
    rel: '',
  };
}

function resolveColorToken(value, map) {
  const key = (value || '').toLowerCase();
  return map[key] || value;
}

function resolveButtonHoverColor(colorValue, resolvedBaseColor) {
  const key = (colorValue || '').toLowerCase();
  const tokenMap = {
    transparent: 'var(--color-neutral-50)',
    light: 'var(--color-neutral-200)',
    neutral: 'var(--color-neutral-300)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-600)',
    accent: 'var(--color-informational-800)',
    white: 'var(--color-neutral-100)',
    black: 'var(--color-neutral-900)',
  };

  if (tokenMap[key]) return tokenMap[key];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorValue) || /^rgba?\(/i.test(colorValue)) {
    return `color-mix(in srgb, ${resolvedBaseColor} 92%, black)`;
  }
  return resolvedBaseColor;
}

function buildCard(row, index, config) {
  const cells = [...row.children];
  const imageCell = cells[0];
  const descriptionCell = cells[1];
  const buttonCell = cells[2];

  const card = document.createElement('article');
  card.className = 'promotional-hero-card';

  const imageData = extractImageSource(imageCell);
  if (imageData?.src) {
    const media = document.createElement('div');
    media.className = 'promotional-hero-image';
    const picture = createOptimizedPicture(
      imageData.src,
      imageData.alt,
      index === 0,
      [
        { media: '(min-width: 1200px)', width: '1200' },
        { media: '(min-width: 768px)', width: '900' },
        { width: '700' },
      ],
    );
    media.append(picture);
    card.append(media);
  } else {
    console.warn('promotional-hero: row is missing a valid image source.');
  }

  const content = document.createElement('div');
  content.className = 'promotional-hero-whitebox';

  const description = createDescription(descriptionCell, config);
  if (description.textContent.trim()) {
    content.append(description);
  }

  const buttonData = parseButton(buttonCell, DEFAULTS.fallbackButtonLabel);
  const button = document.createElement('a');
  button.className = 'promotional-hero-button';
  button.textContent = buttonData.label;

  const safeHref = sanitizeUrl(buttonData.href);
  if (safeHref) {
    button.href = safeHref;
    if (buttonData.target === '_blank') {
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
    } else if (buttonData.target) {
      button.target = buttonData.target;
      if (buttonData.rel) {
        button.rel = buttonData.rel;
      }
    }
  } else {
    button.href = '#';
    button.setAttribute('role', 'button');
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('tabindex', '-1');
    if (buttonData.href && buttonData.href !== '#') {
      console.warn(`promotional-hero: blocked unsafe CTA URL "${buttonData.href}".`);
    }
  }

  content.append(button);
  card.append(content);

  return card;
}

export default function decorate(block) {
  if (typeof block._promotionalHeroCleanup === 'function') {
    block._promotionalHeroCleanup();
    delete block._promotionalHeroCleanup;
  }

  const rows = [...block.children];
  if (!rows.length) return;

  block.dataset.loading = 'true';

  const section = block.closest('.section');
  const sectionData = section?.dataset || {};
  const hasButtonWidthOverride = hasPromotionalConfig(block, sectionData, 'Btnwidth');
  const hasExplicitConfig = {
    contentBorderColor: hasPromotionalConfig(block, sectionData, 'Contentbordercolor'),
    buttonCorner: hasPromotionalConfig(block, sectionData, 'Btncorner'),
    buttonBorderWidth: hasPromotionalConfig(block, sectionData, 'Btnborder'),
    buttonBorderColor: hasPromotionalConfig(block, sectionData, 'Btncolor'),
    buttonFillColor: hasPromotionalConfig(block, sectionData, 'Btnfill'),
    buttonTextColor: hasPromotionalConfig(block, sectionData, 'Btntext'),
  };

  const raw = {
    align: readPromotionalConfig(block, sectionData, 'Align', DEFAULTS.align),
    columns: readPromotionalConfig(block, sectionData, 'Columns', DEFAULTS.columns),
    cardWidth: readPromotionalConfig(block, sectionData, 'Cardwidth', DEFAULTS.cardWidth),
    cardHeight: readPromotionalConfig(block, sectionData, 'Cardheight', DEFAULTS.cardHeight),
    imageRatio: readPromotionalConfig(block, sectionData, 'Imageratio', DEFAULTS.imageRatio),
    imageFit: readPromotionalConfig(block, sectionData, 'Imagefit', DEFAULTS.imageFit),
    gap: readPromotionalConfig(block, sectionData, 'Gap', DEFAULTS.gap),
    density: readPromotionalConfig(block, sectionData, 'Density', DEFAULTS.density),
    contentStyle: readPromotionalConfig(block, sectionData, 'Contentstyle', DEFAULTS.contentStyle),
    contentAlign: readPromotionalConfig(block, sectionData, 'Contentalign', DEFAULTS.contentAlign),
    panelWidth: readPromotionalConfig(block, sectionData, 'Panelwidth', DEFAULTS.panelWidth),
    panelOffset: readPromotionalConfig(block, sectionData, 'Paneloffset', DEFAULTS.panelOffset),
    contentBgColor: readPromotionalConfig(block, sectionData, 'Contentbg', DEFAULTS.contentBgColor),
    contentTextColor: readPromotionalConfig(block, sectionData, 'Contenttext', DEFAULTS.contentTextColor),
    contentBorderStyle: readPromotionalConfig(block, sectionData, 'Contentborderstyle', DEFAULTS.contentBorderStyle),
    contentBorderColor: readPromotionalConfig(block, sectionData, 'Contentbordercolor', DEFAULTS.contentBorderColor),
    contentShadow: readPromotionalConfig(block, sectionData, 'Contentshadow', DEFAULTS.contentShadow),
    contentRadius: readPromotionalConfig(block, sectionData, 'Contentradius', DEFAULTS.contentRadius),
    cardBorderStyle: readPromotionalConfig(block, sectionData, 'Cardborderstyle', DEFAULTS.cardBorderStyle),
    cardBorderColor: readPromotionalConfig(block, sectionData, 'Cardbordercolor', DEFAULTS.cardBorderColor),
    cardBorderWidth: readPromotionalConfig(block, sectionData, 'Cardborderwidth', DEFAULTS.cardBorderWidth),
    buttonStyle: readPromotionalConfig(block, sectionData, 'Btnstyle', DEFAULTS.buttonStyle),
    buttonCorner: readPromotionalConfig(block, sectionData, 'Btncorner', DEFAULTS.buttonCorner),
    buttonWidth: readPromotionalConfig(block, sectionData, 'Btnwidth', DEFAULTS.buttonWidth),
    buttonTextTransform: readPromotionalConfig(block, sectionData, 'Btncase', DEFAULTS.buttonTextTransform),
    buttonHoverMotion: readPromotionalConfig(block, sectionData, 'Btnhovermotion', DEFAULTS.buttonHoverMotion),
    buttonHoverColor: readPromotionalConfig(block, sectionData, 'Btnhovercolor', DEFAULTS.buttonHoverColor),
    buttonBorderWidth: readPromotionalConfig(block, sectionData, 'Btnborder', DEFAULTS.buttonBorderWidth),
    buttonShadow: readPromotionalConfig(block, sectionData, 'Btnshadow', DEFAULTS.buttonShadow),
    buttonFontSize: readPromotionalConfig(block, sectionData, 'Btnsize', DEFAULTS.buttonFontSize),
    buttonFontWeight: readPromotionalConfig(block, sectionData, 'Btnweight', DEFAULTS.buttonFontWeight),
    buttonBorderColor: readPromotionalConfig(block, sectionData, 'Btncolor', DEFAULTS.buttonBorderColor),
    buttonFillColor: readPromotionalConfig(block, sectionData, 'Btnfill', DEFAULTS.buttonFillColor),
    buttonTextColor: readPromotionalConfig(block, sectionData, 'Btntext', DEFAULTS.buttonTextColor),
    cardRadius: readPromotionalConfig(block, sectionData, 'Cardradius', DEFAULTS.cardRadius),
    imageShadow: readPromotionalConfig(block, sectionData, 'Imageshadow', DEFAULTS.imageShadow),
    imagePosition: readPromotionalConfig(block, sectionData, 'Imageposition', DEFAULTS.imagePosition),
    hoverEffect: readPromotionalConfig(block, sectionData, 'Hovereffect', DEFAULTS.hoverEffect),
    imageOverlay: readPromotionalConfig(block, sectionData, 'Imageoverlay', DEFAULTS.imageOverlay),
    imageOverlayColor: readPromotionalConfig(block, sectionData, 'Imageoverlaycolor', DEFAULTS.imageOverlayColor),
    gridMaxWidth: readPromotionalConfig(block, sectionData, 'Gridmaxwidth', DEFAULTS.gridMaxWidth),
    mobileLayout: readPromotionalConfig(block, sectionData, 'Mobilelayout', DEFAULTS.mobileLayout),
    descriptionMaxLines: readPromotionalConfig(block, sectionData, 'Descmaxlines', DEFAULTS.descriptionMaxLines),
    descriptionStyle: readPromotionalConfig(block, sectionData, 'Descstyle', DEFAULTS.descriptionStyle),
    backgroundColor: readPromotionalConfig(block, sectionData, 'Bgcolor', DEFAULTS.backgroundColor),
    width: readPromotionalConfig(block, sectionData, 'Width', DEFAULTS.width),
    layout: readPromotionalConfig(block, sectionData, 'Layout', DEFAULTS.layout),
  };

  const layoutConfig = {
    align: normalizeToken(raw.align, ['left', 'center', 'right'], DEFAULTS.align),
    columns: normalizeToken(raw.columns, ['auto', '1', '2', '3', '4'], DEFAULTS.columns),
    cardWidth: normalizeToken(raw.cardWidth, ['small', 'medium', 'large'], DEFAULTS.cardWidth),
    cardHeight: normalizeToken(raw.cardHeight, ['auto', 'short', 'medium', 'tall'], DEFAULTS.cardHeight),
    imageRatio: normalizeToken(raw.imageRatio, ['portrait', 'square', 'landscape'], DEFAULTS.imageRatio),
    imageFit: normalizeToken(raw.imageFit, ['cover', 'contain'], DEFAULTS.imageFit),
    gap: normalizeToken(raw.gap, ['small', 'medium', 'large'], DEFAULTS.gap),
    density: normalizeToken(raw.density, ['compact', 'comfortable', 'spacious'], DEFAULTS.density),
    contentStyle: normalizeToken(raw.contentStyle, ['floating', 'flush', 'inset'], DEFAULTS.contentStyle),
    contentAlign: normalizeToken(raw.contentAlign, ['left', 'center', 'right'], DEFAULTS.contentAlign),
    panelWidth: normalizeToken(raw.panelWidth, ['compact', 'standard', 'wide'], DEFAULTS.panelWidth),
    panelOffset: normalizeToken(raw.panelOffset, ['none', 'small', 'medium', 'large', 'xlarge'], DEFAULTS.panelOffset),
    gridMaxWidth: normalizeToken(raw.gridMaxWidth, ['none', '1200', '1400', '1600', '1800'], DEFAULTS.gridMaxWidth),
    mobileLayout: normalizeToken(raw.mobileLayout, ['stack', 'carousel', 'snap-scroll'], DEFAULTS.mobileLayout),
    descriptionMaxLines: normalizeToken(raw.descriptionMaxLines, ['2', '3', '4', '5', 'none'], DEFAULTS.descriptionMaxLines),
    descriptionStyle: normalizeToken(raw.descriptionStyle, ['body', 'headline', 'eyebrow', 'muted'], DEFAULTS.descriptionStyle),
    imagePosition: normalizeToken(raw.imagePosition, ['left', 'center', 'right', 'top', 'bottom'], DEFAULTS.imagePosition),
    width: normalizeLayoutWidth(raw.width, DEFAULTS.width),
    layout: normalizeLayoutPattern(raw.layout, DEFAULTS.layout),
  };

  const structureConfig = {
    buttonWidth: normalizeToken(raw.buttonWidth, ['auto', 'narrow', 'medium', 'wide', 'fluid'], DEFAULTS.buttonWidth),
  };

  const styleConfig = {
    contentBorderStyle: normalizeToken(
      raw.contentBorderStyle,
      [
        'none',
        'outline',
        'solid',
        'elevated',
        'glass',
        'soft',
        'soft-glow',
        'neo',
        'ribbon',
        'stamp',
        'link',
        'inset',
        'underline',
        'quiet',
        'strong',
        'halo',
        'bevel',
        'tab',
        'rail',
        'outline-double',
        'compact',
        'corner-pins',
        'ticket',
        'capsule-cut',
        'brace',
        'double-notch',
        'frame-gap',
        'split-edge',
        'fold',
        'badge',
        'pixel-step',
      ],
      DEFAULTS.contentBorderStyle,
    ),
    contentShadow: normalizeToken(raw.contentShadow, ['none', 'soft', 'medium', 'strong'], DEFAULTS.contentShadow),
    contentRadius: normalizeToken(raw.contentRadius, ['sharp', 'soft', 'default', 'rounded-lg', 'pill'], DEFAULTS.contentRadius),
    cardBorderStyle: normalizeToken(raw.cardBorderStyle, ['none', 'subtle', 'strong', 'brand'], DEFAULTS.cardBorderStyle),
    cardBorderWidth: normalizePositiveInt(
      raw.cardBorderWidth,
      DEFAULTS.cardBorderWidth,
      [0, 1, 2, 3, 4, 6],
    ),
    buttonStyle: normalizeToken(
      raw.buttonStyle,
      [
        'outline',
        'solid',
        'elevated',
        'glass',
        'soft',
        'soft-glow',
        'neo',
        'ribbon',
        'stamp',
        'link',
        'inset',
        'underline',
        'quiet',
        'strong',
        'halo',
        'bevel',
        'tab',
        'rail',
        'outline-double',
        'compact',
        'corner-pins',
        'ticket',
        'capsule-cut',
        'brace',
        'double-notch',
        'frame-gap',
        'split-edge',
        'fold',
        'badge',
        'pixel-step',
      ],
      DEFAULTS.buttonStyle,
    ),
    buttonCorner: normalizeButtonCorner(raw.buttonCorner, DEFAULTS.buttonCorner),
    buttonTextTransform: normalizeToken(raw.buttonTextTransform, ['none', 'uppercase', 'capitalize'], DEFAULTS.buttonTextTransform),
    buttonBorderWidth: normalizePositiveInt(
      raw.buttonBorderWidth,
      DEFAULTS.buttonBorderWidth,
      [1, 2, 3, 4],
    ),
    buttonShadow: normalizeToken(raw.buttonShadow, ['none', 'soft', 'medium', 'strong'], DEFAULTS.buttonShadow),
    buttonFontSize: normalizeToken(raw.buttonFontSize, ['sm', 'md', 'lg'], DEFAULTS.buttonFontSize),
    buttonFontWeight: normalizeToken(raw.buttonFontWeight, ['400', '500', '600', '700'], DEFAULTS.buttonFontWeight),
    cardRadius: normalizeToken(raw.cardRadius, ['sharp', 'soft', 'default', 'rounded-lg'], DEFAULTS.cardRadius),
    imageShadow: normalizeToken(raw.imageShadow, ['none', 'soft', 'strong'], DEFAULTS.imageShadow),
  };

  const colorConfig = {
    contentBgColor: normalizeColor(raw.contentBgColor, DEFAULTS.contentBgColor),
    contentTextColor: normalizeColor(raw.contentTextColor, DEFAULTS.contentTextColor),
    contentBorderColor: normalizeColor(raw.contentBorderColor, DEFAULTS.contentBorderColor),
    cardBorderColor: normalizeColor(raw.cardBorderColor, DEFAULTS.cardBorderColor),
    buttonBorderColor: normalizeColor(raw.buttonBorderColor, DEFAULTS.buttonBorderColor),
    buttonFillColor: normalizeColor(raw.buttonFillColor, DEFAULTS.buttonFillColor),
    buttonTextColor: normalizeColor(raw.buttonTextColor, DEFAULTS.buttonTextColor),
    imageOverlayColor: normalizeColor(raw.imageOverlayColor, DEFAULTS.imageOverlayColor),
    backgroundColor: normalizeColor(raw.backgroundColor, DEFAULTS.backgroundColor),
  };

  const panelIsLight = ['white', 'light', 'neutral'].includes(
    (colorConfig.contentBgColor || '').toLowerCase(),
  );
  if (
    styleConfig.buttonStyle === 'outline'
    && panelIsLight
    && !hasExplicitConfig.buttonBorderColor
    && !hasExplicitConfig.buttonTextColor
    && !hasExplicitConfig.buttonFillColor
  ) {
    colorConfig.buttonBorderColor = 'dark';
    colorConfig.buttonTextColor = 'dark';
  }

  if (
    styleConfig.contentBorderStyle !== 'none'
    && !hasExplicitConfig.contentBorderColor
    && !colorConfig.contentBorderColor
  ) {
    colorConfig.contentBorderColor = panelIsLight ? 'dark' : 'white';
  }

  const motionConfig = {
    hoverEffect: normalizeToken(raw.hoverEffect, ['none', 'subtle', 'lift'], DEFAULTS.hoverEffect),
    imageOverlay: normalizeToken(raw.imageOverlay, ['none', 'light', 'medium', 'strong', 'brand-tint'], DEFAULTS.imageOverlay),
    buttonHoverMotion: normalizeToken(raw.buttonHoverMotion, ['none', 'lift', 'press', 'pop', 'nudge', 'tilt'], DEFAULTS.buttonHoverMotion),
    buttonHoverColor: normalizeToken(raw.buttonHoverColor, ['style', 'none', 'inverse', 'darken'], DEFAULTS.buttonHoverColor),
  };

  if (!hasButtonWidthOverride && layoutConfig.imageRatio === 'landscape') {
    structureConfig.buttonWidth = 'medium';
  }

  warnOnInvalidConfig('promohero-align', raw.align, layoutConfig.align, DEFAULTS.align);
  warnOnInvalidConfig('promohero-columns', raw.columns, layoutConfig.columns, DEFAULTS.columns);
  warnOnInvalidConfig('promohero-cardwidth', raw.cardWidth, layoutConfig.cardWidth, DEFAULTS.cardWidth);
  warnOnInvalidConfig('promohero-cardheight', raw.cardHeight, layoutConfig.cardHeight, DEFAULTS.cardHeight);
  warnOnInvalidConfig('promohero-imageratio', raw.imageRatio, layoutConfig.imageRatio, DEFAULTS.imageRatio);
  warnOnInvalidConfig('promohero-imagefit', raw.imageFit, layoutConfig.imageFit, DEFAULTS.imageFit);
  warnOnInvalidConfig('promohero-gap', raw.gap, layoutConfig.gap, DEFAULTS.gap);
  warnOnInvalidConfig('promohero-density', raw.density, layoutConfig.density, DEFAULTS.density);
  warnOnInvalidConfig('promohero-contentstyle', raw.contentStyle, layoutConfig.contentStyle, DEFAULTS.contentStyle);
  warnOnInvalidConfig('promohero-contentalign', raw.contentAlign, layoutConfig.contentAlign, DEFAULTS.contentAlign);
  warnOnInvalidConfig('promohero-panelwidth', raw.panelWidth, layoutConfig.panelWidth, DEFAULTS.panelWidth);
  warnOnInvalidConfig('promohero-paneloffset', raw.panelOffset, layoutConfig.panelOffset, DEFAULTS.panelOffset);
  warnOnInvalidConfig('promohero-gridmaxwidth', raw.gridMaxWidth, layoutConfig.gridMaxWidth, DEFAULTS.gridMaxWidth);
  warnOnInvalidConfig('promohero-mobilelayout', raw.mobileLayout, layoutConfig.mobileLayout, DEFAULTS.mobileLayout);
  warnOnInvalidConfig('promohero-descmaxlines', raw.descriptionMaxLines, layoutConfig.descriptionMaxLines, DEFAULTS.descriptionMaxLines);
  warnOnInvalidConfig('promohero-descstyle', raw.descriptionStyle, layoutConfig.descriptionStyle, DEFAULTS.descriptionStyle);
  warnOnInvalidConfig('promohero-width', raw.width, layoutConfig.width, DEFAULTS.width);
  warnOnInvalidConfig('promohero-layout', raw.layout, layoutConfig.layout, DEFAULTS.layout);
  warnOnInvalidConfig('promohero-contentborderstyle', raw.contentBorderStyle, styleConfig.contentBorderStyle, DEFAULTS.contentBorderStyle);
  warnOnInvalidConfig('promohero-contentshadow', raw.contentShadow, styleConfig.contentShadow, DEFAULTS.contentShadow);
  warnOnInvalidConfig('promohero-contentradius', raw.contentRadius, styleConfig.contentRadius, DEFAULTS.contentRadius);
  warnOnInvalidConfig('promohero-cardborderstyle', raw.cardBorderStyle, styleConfig.cardBorderStyle, DEFAULTS.cardBorderStyle);
  warnOnInvalidConfig('promohero-cardborderwidth', raw.cardBorderWidth, styleConfig.cardBorderWidth, DEFAULTS.cardBorderWidth);
  warnOnInvalidConfig('promohero-btnstyle', raw.buttonStyle, styleConfig.buttonStyle, DEFAULTS.buttonStyle);
  warnOnInvalidConfig('promohero-btncorner', raw.buttonCorner, styleConfig.buttonCorner || '', DEFAULTS.buttonCorner);
  warnOnInvalidConfig('promohero-btnwidth', raw.buttonWidth, structureConfig.buttonWidth, DEFAULTS.buttonWidth);
  warnOnInvalidConfig('promohero-btncase', raw.buttonTextTransform, styleConfig.buttonTextTransform, DEFAULTS.buttonTextTransform);
  warnOnInvalidConfig('promohero-btnborder', raw.buttonBorderWidth, styleConfig.buttonBorderWidth, DEFAULTS.buttonBorderWidth);
  warnOnInvalidConfig('promohero-btnshadow', raw.buttonShadow, styleConfig.buttonShadow, DEFAULTS.buttonShadow);
  warnOnInvalidConfig('promohero-btnsize', raw.buttonFontSize, styleConfig.buttonFontSize, DEFAULTS.buttonFontSize);
  warnOnInvalidConfig('promohero-btnweight', raw.buttonFontWeight, styleConfig.buttonFontWeight, DEFAULTS.buttonFontWeight);
  warnOnInvalidConfig('promohero-cardradius', raw.cardRadius, styleConfig.cardRadius, DEFAULTS.cardRadius);
  warnOnInvalidConfig('promohero-imageshadow', raw.imageShadow, styleConfig.imageShadow, DEFAULTS.imageShadow);
  warnOnInvalidConfig('promohero-contentbg', raw.contentBgColor, colorConfig.contentBgColor, DEFAULTS.contentBgColor);
  warnOnInvalidConfig('promohero-contenttext', raw.contentTextColor, colorConfig.contentTextColor, DEFAULTS.contentTextColor);
  warnOnInvalidConfig('promohero-contentbordercolor', raw.contentBorderColor, colorConfig.contentBorderColor, DEFAULTS.contentBorderColor);
  warnOnInvalidConfig('promohero-cardbordercolor', raw.cardBorderColor, colorConfig.cardBorderColor, DEFAULTS.cardBorderColor);
  warnOnInvalidConfig('promohero-btncolor', raw.buttonBorderColor, colorConfig.buttonBorderColor, DEFAULTS.buttonBorderColor);
  warnOnInvalidConfig('promohero-btnfill', raw.buttonFillColor, colorConfig.buttonFillColor, DEFAULTS.buttonFillColor);
  warnOnInvalidConfig('promohero-btntext', raw.buttonTextColor, colorConfig.buttonTextColor, DEFAULTS.buttonTextColor);
  warnOnInvalidConfig('promohero-imageoverlaycolor', raw.imageOverlayColor, colorConfig.imageOverlayColor, DEFAULTS.imageOverlayColor);
  warnOnInvalidConfig('promohero-bgcolor', raw.backgroundColor, colorConfig.backgroundColor, DEFAULTS.backgroundColor);
  warnOnInvalidConfig('promohero-imageposition', raw.imagePosition, layoutConfig.imagePosition, DEFAULTS.imagePosition);
  warnOnInvalidConfig('promohero-hovereffect', raw.hoverEffect, motionConfig.hoverEffect, DEFAULTS.hoverEffect);
  warnOnInvalidConfig('promohero-imageoverlay', raw.imageOverlay, motionConfig.imageOverlay, DEFAULTS.imageOverlay);
  warnOnInvalidConfig('promohero-btnhovermotion', raw.buttonHoverMotion, motionConfig.buttonHoverMotion, DEFAULTS.buttonHoverMotion);
  warnOnInvalidConfig('promohero-btnhovercolor', raw.buttonHoverColor, motionConfig.buttonHoverColor, DEFAULTS.buttonHoverColor);

  if (styleConfig.buttonStyle === 'link') {
    if (hasExplicitConfig.buttonCorner) {
      warnOnNoOpConfig(
        'promohero-btncorner',
        raw.buttonCorner,
        'Link style ignores corner radius.',
      );
    }
    if (hasExplicitConfig.buttonBorderWidth) {
      warnOnNoOpConfig(
        'promohero-btnborder',
        raw.buttonBorderWidth,
        'Link style does not render button border width.',
      );
    }
    if (hasExplicitConfig.buttonBorderColor) {
      warnOnNoOpConfig(
        'promohero-btncolor',
        raw.buttonBorderColor,
        'Link style does not render button border color.',
      );
    }
    if (hasExplicitConfig.buttonFillColor) {
      warnOnNoOpConfig(
        'promohero-btnfill',
        raw.buttonFillColor,
        'Link style does not render button fill color.',
      );
    }
  }

  if (layoutConfig.layout === 'honeycomb' && raw.columns && raw.columns.toString().trim().toLowerCase() !== 'auto') {
    warnOnNoOpConfig(
      'promohero-columns',
      raw.columns,
      'Honeycomb layout manages placement pattern and ignores explicit column counts.',
    );
  }

  const cardCount = Math.max(rows.length, 1);
  const requestedColumns = Math.min(Math.max(Number.parseInt(layoutConfig.columns, 10) || 1, 1), 4);
  const applyResponsiveLayout = () => {
    const maxResponsiveColumns = getResponsiveMaxLinearColumns();
    const linearColumnCount = layoutConfig.columns === 'auto'
      ? Math.min(cardCount, maxResponsiveColumns, 4)
      : Math.min(requestedColumns, cardCount, maxResponsiveColumns);
    const effectiveColumns = layoutConfig.layout === 'linear' && layoutConfig.columns !== 'auto'
      ? `${linearColumnCount}`
      : layoutConfig.columns;
    const layoutScale = layoutConfig.layout === 'linear'
      ? getLinearScale(linearColumnCount, window.innerWidth || 0)
      : '1';

    block.dataset.columns = effectiveColumns;
    block.dataset.requestedColumns = layoutConfig.columns;
    block.dataset.linearColumns = `${linearColumnCount}`;
    block.style.setProperty('--promotional-hero-linear-max-cols', `${linearColumnCount}`);
    block.style.setProperty('--promotional-hero-layout-scale', layoutScale);
  };

  block.dataset.align = layoutConfig.align;
  block.dataset.layout = layoutConfig.layout;
  block.dataset.cardWidth = layoutConfig.cardWidth;
  block.dataset.cardHeight = layoutConfig.cardHeight;
  block.dataset.imageRatio = layoutConfig.imageRatio;
  block.dataset.imageFit = layoutConfig.imageFit;
  block.dataset.gap = layoutConfig.gap;
  block.dataset.density = layoutConfig.density;
  block.dataset.contentStyle = layoutConfig.contentStyle;
  block.dataset.contentAlign = layoutConfig.contentAlign;
  block.dataset.panelWidth = layoutConfig.panelWidth;
  block.dataset.panelOffset = layoutConfig.panelOffset;
  block.dataset.contentBgColor = colorConfig.contentBgColor;
  block.dataset.contentTextColor = colorConfig.contentTextColor;
  block.dataset.contentBorderColor = colorConfig.contentBorderColor || '';
  block.dataset.contentBorderStyle = styleConfig.contentBorderStyle;
  block.dataset.contentShadow = styleConfig.contentShadow;
  block.dataset.contentRadius = styleConfig.contentRadius;
  block.dataset.cardBorderColor = colorConfig.cardBorderColor || '';
  block.dataset.cardBorderStyle = styleConfig.cardBorderStyle;
  block.dataset.cardBorderWidth = styleConfig.cardBorderWidth;
  block.dataset.buttonStyle = styleConfig.buttonStyle;
  if (styleConfig.buttonCorner) {
    block.dataset.buttonCorner = styleConfig.buttonCorner;
  } else {
    delete block.dataset.buttonCorner;
  }
  block.dataset.buttonWidth = structureConfig.buttonWidth;
  block.dataset.buttonTextTransform = styleConfig.buttonTextTransform;
  block.dataset.buttonHoverMotion = motionConfig.buttonHoverMotion;
  block.dataset.buttonHoverColor = motionConfig.buttonHoverColor;
  block.dataset.buttonBorderWidth = styleConfig.buttonBorderWidth;
  block.dataset.buttonShadow = styleConfig.buttonShadow;
  block.dataset.buttonFontSize = styleConfig.buttonFontSize;
  block.dataset.buttonFontWeight = styleConfig.buttonFontWeight;
  block.dataset.buttonColor = colorConfig.buttonBorderColor;
  block.dataset.buttonFill = colorConfig.buttonFillColor;
  block.dataset.buttonTextColor = colorConfig.buttonTextColor;
  block.dataset.cardRadius = styleConfig.cardRadius;
  block.dataset.imageShadow = styleConfig.imageShadow;
  block.dataset.imagePosition = layoutConfig.imagePosition;
  block.dataset.hoverEffect = motionConfig.hoverEffect;
  block.dataset.imageOverlay = motionConfig.imageOverlay;
  block.dataset.imageOverlayColor = colorConfig.imageOverlayColor;
  block.dataset.gridMaxWidth = layoutConfig.gridMaxWidth;
  block.dataset.mobileLayout = layoutConfig.mobileLayout;
  block.dataset.descriptionMaxLines = layoutConfig.descriptionMaxLines;
  block.dataset.descriptionStyle = layoutConfig.descriptionStyle;
  block.dataset.layoutWidth = layoutConfig.width;
  block.dataset.fullWidth = layoutConfig.width === 'full-width' ? 'true' : 'false';

  const buttonBorderColorToken = resolveColorToken(colorConfig.buttonBorderColor, {
    transparent: 'transparent',
    light: 'var(--color-neutral-100)',
    neutral: 'var(--color-neutral-200)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-500)',
    accent: 'var(--color-informational-500)',
    white: 'var(--color-neutral-50)',
    black: '#000',
  });

  const buttonFillColorToken = resolveColorToken(colorConfig.buttonFillColor, {
    transparent: 'transparent',
    light: 'var(--color-neutral-100)',
    neutral: 'var(--color-neutral-200)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-500)',
    accent: 'var(--color-informational-500)',
    white: 'var(--color-neutral-50)',
    black: '#000',
  });

  const buttonTextColorToken = resolveColorToken(colorConfig.buttonTextColor, {
    transparent: 'transparent',
    light: 'var(--color-neutral-100)',
    neutral: 'var(--color-neutral-700)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-500)',
    accent: 'var(--color-informational-500)',
    white: 'var(--color-neutral-50)',
    black: '#000',
  });

  const contentBgColorToken = resolveColorToken(colorConfig.contentBgColor, {
    transparent: 'transparent',
    light: 'var(--color-neutral-100)',
    neutral: 'var(--color-neutral-200)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-500)',
    accent: 'var(--color-informational-500)',
    white: 'var(--color-neutral-50)',
    black: '#000',
  });

  const contentTextColorToken = resolveColorToken(colorConfig.contentTextColor, {
    transparent: 'transparent',
    light: 'var(--color-neutral-100)',
    neutral: 'var(--color-neutral-700)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-500)',
    accent: 'var(--color-informational-500)',
    white: 'var(--color-neutral-50)',
    black: '#000',
  });

  const contentBorderColorToken = resolveColorToken(colorConfig.contentBorderColor, {
    transparent: 'transparent',
    light: 'var(--color-neutral-100)',
    neutral: 'var(--color-neutral-300)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-500)',
    accent: 'var(--color-informational-500)',
    white: 'var(--color-neutral-50)',
    black: '#000',
  });

  const cardBorderColorToken = resolveColorToken(colorConfig.cardBorderColor, {
    transparent: 'transparent',
    light: 'var(--color-neutral-100)',
    neutral: 'var(--color-neutral-300)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-500)',
    accent: 'var(--color-informational-500)',
    white: 'var(--color-neutral-50)',
    black: '#000',
  });

  const imageOverlayColorToken = resolveColorToken(colorConfig.imageOverlayColor, {
    transparent: 'transparent',
    light: 'var(--color-neutral-100)',
    neutral: 'var(--color-neutral-700)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-500)',
    accent: 'var(--color-informational-500)',
    white: 'var(--color-neutral-50)',
    black: '#000',
  });

  const backgroundColorToken = resolveColorToken(colorConfig.backgroundColor, {
    transparent: 'transparent',
    light: 'var(--color-neutral-100)',
    neutral: 'var(--color-neutral-200)',
    dark: 'var(--color-neutral-900)',
    brand: 'var(--color-brand-500)',
    accent: 'var(--color-informational-500)',
    white: 'var(--color-neutral-50)',
    black: '#000',
  });

  const buttonHoverBgColorToken = resolveButtonHoverColor(
    colorConfig.buttonFillColor,
    buttonFillColorToken,
  );
  const buttonHoverBorderColorToken = resolveButtonHoverColor(
    colorConfig.buttonBorderColor,
    buttonBorderColorToken,
  );

  block.style.setProperty('--promotional-hero-button-bg', buttonFillColorToken);
  block.style.setProperty('--promotional-hero-button-border', buttonBorderColorToken);
  block.style.setProperty('--promotional-hero-button-text', buttonTextColorToken);
  block.style.setProperty('--promotional-hero-button-hover-bg', buttonHoverBgColorToken);
  block.style.setProperty('--promotional-hero-button-hover-border', buttonHoverBorderColorToken);
  block.style.setProperty('--promotional-hero-button-hover-text', buttonTextColorToken);
  block.style.setProperty('--promotional-hero-content-bg', contentBgColorToken);
  block.style.setProperty('--promotional-hero-content-color', contentTextColorToken);
  block.style.setProperty('--promotional-hero-content-border-color', contentBorderColorToken);
  block.style.setProperty('--promotional-hero-card-border-color', cardBorderColorToken);
  block.style.setProperty('--promotional-hero-image-overlay-color', imageOverlayColorToken);
  block.style.setProperty('--promotional-hero-card-border-width', `${styleConfig.cardBorderWidth}px`);
  block.style.setProperty('--promotional-hero-button-border-width', `${styleConfig.buttonBorderWidth}px`);
  block.style.setProperty('--promotional-hero-button-font-weight', styleConfig.buttonFontWeight);
  block.style.setProperty('--promotional-hero-background', backgroundColorToken);
  applyResponsiveLayout();

  const container = document.createElement('div');
  container.className = 'promotional-hero-container';

  rows.forEach((row, index) => {
    if (!row.children?.length) return;
    container.append(buildCard(row, index, layoutConfig));
  });

  block.replaceChildren(container);

  let timeoutId;
  let imageLoadHandler;
  let resizeDebounceId;
  let resizeHandler;
  if (layoutConfig.layout === 'linear') {
    resizeHandler = () => {
      clearTimeout(resizeDebounceId);
      resizeDebounceId = setTimeout(() => {
        applyResponsiveLayout();
      }, 120);
    };
    window.addEventListener('resize', resizeHandler);
  }

  const firstImage = block.querySelector('.promotional-hero-image img');
  if (firstImage) {
    if (firstImage.complete) {
      delete block.dataset.loading;
    } else {
      imageLoadHandler = () => {
        delete block.dataset.loading;
      };
      firstImage.addEventListener('load', imageLoadHandler, { once: true });
      timeoutId = setTimeout(() => {
        delete block.dataset.loading;
      }, 3000);
    }
  } else {
    delete block.dataset.loading;
  }

  block._promotionalHeroCleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (resizeDebounceId) {
      clearTimeout(resizeDebounceId);
      resizeDebounceId = undefined;
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = undefined;
    }
    if (firstImage && imageLoadHandler) {
      firstImage.removeEventListener('load', imageLoadHandler);
      imageLoadHandler = undefined;
    }
  };
}

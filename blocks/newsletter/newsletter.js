const DEFAULTS = {
  heading: 'Our freshest gear. Straight to your inbox.',
  subheading: 'Be first to know about our newest products, limited-time offers, community events, and more.',
  emailPlaceholder: 'Enter your email address',
  buttonLabel: 'Sign Up',
  supportingText: 'We only send relevant updates. You can unsubscribe any time.',
  successHeading: 'Thank you.',
  successSubheading: 'Newsletter subscription is successful.',
  successSupportingText: 'You can unsubscribe at any time.',
  validationError: 'Please enter a valid email address.',
};

const BUTTON_COLORS = {
  default: {
    bg: 'var(--color-neutral-900)',
    text: 'var(--color-neutral-50)',
    border: 'var(--color-neutral-900)',
  },
  transparent: {
    bg: 'transparent',
    text: 'var(--color-neutral-900)',
    border: 'var(--color-neutral-900)',
  },
  white: {
    bg: 'var(--color-neutral-50)',
    text: 'var(--color-neutral-900)',
    border: 'var(--color-neutral-300)',
  },
  brand: {
    bg: 'var(--color-brand-500)',
    text: 'var(--color-neutral-50)',
    border: 'var(--color-brand-500)',
  },
  accent: {
    bg: 'var(--color-informational-500)',
    text: 'var(--color-neutral-50)',
    border: 'var(--color-informational-500)',
  },
  dark: {
    bg: 'var(--color-neutral-900)',
    text: 'var(--color-neutral-50)',
    border: 'var(--color-neutral-900)',
  },
  'outline-dark': {
    bg: 'transparent',
    text: 'var(--color-neutral-900)',
    border: 'var(--color-neutral-900)',
  },
  muted: {
    bg: 'var(--color-neutral-300)',
    text: 'var(--color-neutral-700)',
    border: 'var(--color-neutral-300)',
  },
  success: {
    bg: 'var(--color-positive-700, #0f8a43)',
    text: 'var(--color-neutral-50)',
    border: 'var(--color-positive-700, #0f8a43)',
  },
  warning: {
    bg: 'var(--color-warning-500, #f2b223)',
    text: 'var(--color-neutral-900, #1b1b1b)',
    border: 'var(--color-warning-500, #f2b223)',
  },
  negative: {
    bg: 'var(--color-negative-700, #b42318)',
    text: 'var(--color-neutral-50)',
    border: 'var(--color-negative-700, #b42318)',
  },
  info: {
    bg: 'var(--color-informational-500, #1d4ed8)',
    text: 'var(--color-neutral-50)',
    border: 'var(--color-informational-500, #1d4ed8)',
  },
  inherit: {
    bg: 'color-mix(in srgb, var(--newsletter-text) 12%, transparent)',
    text: 'var(--newsletter-text)',
    border: 'color-mix(in srgb, var(--newsletter-text) 35%, transparent)',
  },
};

function normalizeAlign(value, fallback = 'center') {
  const val = (value || '').toLowerCase();
  return ['left', 'center', 'right', 'start', 'end'].includes(val) ? val : fallback;
}

function normalizeButtonStyle(value, fallback = 'default') {
  const val = (value || '').toLowerCase();
  return [
    'default',
    'pill',
    'sharp',
    'soft',
    'rounded-lg',
    'outline',
    'ghost',
    'elevated',
  ].includes(val) ? val : fallback;
}

function normalizeButtonWidth(value, fallback = 'medium') {
  const val = (value || '').toLowerCase();
  return ['auto', 'narrow', 'medium', 'wide', 'fluid', 'fit-content'].includes(val) ? val : fallback;
}

function normalizeBackgroundColor(value, fallback = 'neutral') {
  const val = (value || '').toLowerCase();
  const named = ['neutral', 'light', 'white', 'brand', 'dark', 'accent'];
  if (named.includes(val)) return val;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) return val;
  return fallback;
}

function normalizeBackgroundStyle(value, fallback = 'solid') {
  const val = (value || '').toLowerCase();
  const options = [
    'none',
    'solid',
    'subtle-gradient',
    'mesh-gradient',
    'noise-texture',
    'split-tone',
    'radial-glow',
    'duotone',
    'top-glow',
    'bottom-fade',
    'diagonal-sweep',
    'grid-fade',
    'image-wash',
  ];
  return options.includes(val) ? val : fallback;
}

function normalizeEmailStyle(value, fallback = 'outlined') {
  const val = (value || '').toLowerCase();
  const options = [
    'outlined',
    'filled',
    'underlined',
    'pill',
    'sharp',
    'minimal',
    'inset',
    'soft',
    'glass',
    'high-contrast',
  ];
  return options.includes(val) ? val : fallback;
}

function normalizeDensity(value, fallback = 'comfortable') {
  const val = (value || '').toString().trim().toLowerCase();
  return [
    'xx-compact',
    'x-compact',
    'compact',
    'comfortable',
    'spacious',
    'x-spacious',
    'xx-spacious',
    'adaptive',
    'responsive',
  ].includes(val) ? val : fallback;
}

function normalizeFormGap(value, fallback = 'auto') {
  const val = (value || '').toString().trim().toLowerCase();
  const presets = ['auto', 'none', 'xxsmall', 'xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'];
  if (presets.includes(val)) return val;
  if (/^\d+(\.\d+)?(px|rem|em)$/.test(val)) return val;
  return fallback;
}

function normalizeButtonColor(value, fallback = 'default') {
  const val = (value || '').toLowerCase();
  if (BUTTON_COLORS[val]) return val;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) return val;
  return fallback;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const val = (value || '').toString().trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(val)) return true;
  if (['false', '0', 'no', 'off'].includes(val)) return false;
  return fallback;
}

function getConfigValue(blockValue, sectionData, keys, fallback) {
  if (typeof blockValue === 'string' && blockValue.trim()) return blockValue;
  if (typeof blockValue === 'boolean') return blockValue;

  for (let i = 0; i < keys.length; i += 1) {
    const value = sectionData?.[keys[i]];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return fallback;
}

function isSafeUrl(url) {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function parseButtonConfig(buttonText) {
  const raw = (buttonText || '').trim();
  if (!raw) return { label: DEFAULTS.buttonLabel };

  // Keep backward compatibility with old "Label|URL" authoring by taking label only.
  const [labelPart] = raw.split('|').map((part) => part?.trim());
  const label = labelPart || DEFAULTS.buttonLabel;
  return { label };
}

function getRowText(rows, index, fallback) {
  const value = rows[index]?.textContent?.trim();
  return value || fallback;
}

function getRowCell(rows, index) {
  const row = rows[index];
  if (!row) return null;
  return row.firstElementChild || row;
}

function hasRenderableContent(cell) {
  return !!(cell && cell.textContent && cell.textContent.trim().length);
}

function copyCellContent(target, cell, fallbackText) {
  target.textContent = '';

  if (hasRenderableContent(cell)) {
    [...cell.childNodes].forEach((node) => {
      target.append(node.cloneNode(true));
    });
    return;
  }

  target.textContent = fallbackText;
}

function normalizeInlineText(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

function setHeadingContent(target, cell, fallbackText) {
  target.textContent = '';

  if (hasRenderableContent(cell)) {
    const paragraphs = [...cell.querySelectorAll('p')];
    if (paragraphs.length > 0) {
      paragraphs.forEach((paragraph) => {
        const line = document.createElement('span');
        line.className = 'newsletter-heading-line';
        line.textContent = normalizeInlineText(paragraph.textContent || '');
        if (line.textContent) target.append(line);
      });
      return;
    }

    const text = normalizeInlineText(cell.textContent || '');
    if (text) {
      const line = document.createElement('span');
      line.className = 'newsletter-heading-line';
      line.textContent = text;
      target.append(line);
      return;
    }
  }

  const fallbackLine = document.createElement('span');
  fallbackLine.className = 'newsletter-heading-line';
  fallbackLine.textContent = fallbackText;
  target.append(fallbackLine);
}

function getCustomTextColor(hexColor) {
  const cleanHex = hexColor.replace('#', '');
  const expanded = cleanHex.length === 3
    ? cleanHex.split('').map((char) => char + char).join('')
    : cleanHex;

  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);

  const luminance = (0.299 * red) + (0.587 * green) + (0.114 * blue);
  return luminance > 160 ? '#1b1b1b' : '#ffffff';
}

function applyButtonColor(block, state, color) {
  const cssState = state === 'empty' ? 'empty' : 'filled';

  if (color.startsWith('#')) {
    const text = getCustomTextColor(color);
    block.style.setProperty(`--newsletter-button-${cssState}-bg`, color);
    block.style.setProperty(`--newsletter-button-${cssState}-text`, text);
    block.style.setProperty(`--newsletter-button-${cssState}-border`, color);
    return;
  }

  const named = BUTTON_COLORS[color] || BUTTON_COLORS.default;
  block.style.setProperty(`--newsletter-button-${cssState}-bg`, named.bg);
  block.style.setProperty(`--newsletter-button-${cssState}-text`, named.text);
  block.style.setProperty(`--newsletter-button-${cssState}-border`, named.border);
}

function parseConfig(block) {
  const section = block.closest('.section');
  const sectionData = section?.dataset || {};

  const config = {
    align: normalizeAlign(
      getConfigValue(
        block.dataset.align,
        sectionData,
        ['newsletterAlign', 'dataNewsletterAlign'],
        'center',
      ),
    ),
    buttonStyle: normalizeButtonStyle(
      getConfigValue(
        block.dataset.buttonStyle,
        sectionData,
        ['newsletterButtonStyle', 'dataNewsletterButtonStyle'],
        'default',
      ),
    ),
    buttonWidth: normalizeButtonWidth(
      getConfigValue(
        block.dataset.buttonWidth,
        sectionData,
        ['newsletterButtonWidth', 'dataNewsletterButtonWidth'],
        'medium',
      ),
    ),
    buttonColorEmpty: normalizeButtonColor(
      getConfigValue(
        block.dataset.buttonColorEmpty,
        sectionData,
        ['newsletterButtonColorEmpty', 'dataNewsletterButtonColorEmpty'],
        'muted',
      ),
    ),
    buttonColorFilled: normalizeButtonColor(
      getConfigValue(
        block.dataset.buttonColorFilled,
        sectionData,
        ['newsletterButtonColorFilled', 'dataNewsletterButtonColorFilled'],
        'dark',
      ),
    ),
    backgroundColor: normalizeBackgroundColor(
      getConfigValue(
        block.dataset.backgroundColor,
        sectionData,
        ['newsletterBackgroundColor', 'dataNewsletterBackgroundColor'],
        'neutral',
      ),
    ),
    backgroundStyle: normalizeBackgroundStyle(
      getConfigValue(
        block.dataset.backgroundStyle,
        sectionData,
        ['newsletterBackgroundStyle', 'dataNewsletterBackgroundStyle'],
        'solid',
      ),
    ),
    backgroundImage: getConfigValue(
      block.dataset.backgroundImage,
      sectionData,
      ['newsletterBackgroundImage', 'dataNewsletterBackgroundImage'],
      '',
    ).trim(),
    emailStyle: normalizeEmailStyle(
      getConfigValue(
        block.dataset.emailStyle,
        sectionData,
        ['newsletterEmailStyle', 'dataNewsletterEmailStyle'],
        'outlined',
      ),
    ),
    density: normalizeDensity(
      getConfigValue(
        block.dataset.density,
        sectionData,
        ['newsletterDensity', 'dataNewsletterDensity'],
        'comfortable',
      ),
    ),
    formGap: normalizeFormGap(
      getConfigValue(
        block.dataset.formGap,
        sectionData,
        ['newsletterFormGap', 'dataNewsletterFormGap'],
        'auto',
      ),
    ),
    fullWidth: normalizeBoolean(
      getConfigValue(
        block.dataset.fullWidth,
        sectionData,
        ['newsletterFullWidth', 'dataNewsletterFullWidth'],
        false,
      ),
      false,
    ),
  };

  Object.entries(config).forEach(([key, value]) => {
    block.dataset[key] = value;
  });

  return config;
}

function setLoadingState(block, submitButton, isLoading) {
  if (isLoading) {
    block.dataset.loading = 'true';
    submitButton.disabled = true;
  } else {
    delete block.dataset.loading;
    submitButton.disabled = false;
  }
}

function setEmailState(block, value) {
  block.dataset.emailState = value.trim().length > 0 ? 'filled' : 'empty';
}

function setBlockState(block, state, elements) {
  const isSuccess = state === 'success';
  block.dataset.state = isSuccess ? 'success' : 'default';

  elements.defaultNodes.forEach((node) => {
    node.hidden = isSuccess;
    node.setAttribute('aria-hidden', isSuccess ? 'true' : 'false');
  });

  elements.successNode.hidden = !isSuccess;
  elements.successNode.setAttribute('aria-hidden', isSuccess ? 'false' : 'true');

  if (isSuccess) {
    elements.successHeading.setAttribute('tabindex', '-1');
    elements.successHeading.focus();
  } else {
    elements.successHeading.removeAttribute('tabindex');
  }
}

export default function decorate(block) {
  const rows = [...block.children];
  const config = parseConfig(block);
  const container = block.closest('.newsletter-container');

  const heading = getRowText(rows, 0, DEFAULTS.heading);
  const subheading = getRowText(rows, 1, DEFAULTS.subheading);
  const emailPlaceholder = getRowText(rows, 2, DEFAULTS.emailPlaceholder);
  const buttonText = getRowText(rows, 3, DEFAULTS.buttonLabel);
  const supportingText = getRowText(rows, 4, DEFAULTS.supportingText);
  const successHeading = getRowText(rows, 5, DEFAULTS.successHeading);
  const successSubheading = getRowText(rows, 6, DEFAULTS.successSubheading);
  const successSupportingFallback = supportingText || DEFAULTS.successSupportingText;
  const successSupportingText = getRowText(rows, 7, successSupportingFallback);

  const { label: buttonLabel } = parseButtonConfig(buttonText);

  const wrapper = document.createElement('div');
  wrapper.className = 'newsletter-inner';

  const title = document.createElement('h2');
  title.className = 'newsletter-heading';
  title.textContent = heading;

  const description = document.createElement('div');
  description.className = 'newsletter-subheading';

  const form = document.createElement('form');
  form.className = 'newsletter-form';
  form.method = 'post';
  form.noValidate = true;

  const fieldId = window.crypto?.randomUUID
    ? `newsletter-email-${window.crypto.randomUUID()}`
    : `newsletter-email-${Date.now()}`;
  const statusId = `${fieldId}-status`;
  const errorId = `${fieldId}-error`;

  const emailLabel = document.createElement('label');
  emailLabel.className = 'newsletter-sr-only';
  emailLabel.setAttribute('for', fieldId);
  emailLabel.textContent = 'Email address';

  const input = document.createElement('input');
  input.className = 'newsletter-email';
  input.id = fieldId;
  input.name = 'email';
  input.type = 'email';
  input.placeholder = emailPlaceholder;
  input.autocomplete = 'email';
  input.required = true;
  input.setAttribute('aria-required', 'true');
  input.setAttribute('aria-invalid', 'false');
  input.setAttribute('aria-describedby', `${errorId} ${statusId}`);

  const submitButton = document.createElement('button');
  submitButton.className = 'newsletter-submit';
  submitButton.type = 'submit';
  submitButton.textContent = buttonLabel;

  const status = document.createElement('p');
  status.className = 'newsletter-status';
  status.id = statusId;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const validationErrorEl = document.createElement('p');
  validationErrorEl.className = 'newsletter-error';
  validationErrorEl.id = errorId;
  validationErrorEl.hidden = true;
  validationErrorEl.setAttribute('role', 'alert');
  validationErrorEl.setAttribute('aria-live', 'assertive');

  const supporting = document.createElement('div');
  supporting.className = 'newsletter-supporting';

  const success = document.createElement('div');
  success.className = 'newsletter-success';
  success.setAttribute('role', 'status');
  success.setAttribute('aria-live', 'polite');
  success.hidden = true;
  success.setAttribute('aria-hidden', 'true');

  const successTitle = document.createElement('h3');
  successTitle.className = 'newsletter-success-heading';
  successTitle.textContent = successHeading;

  const successBody = document.createElement('div');
  successBody.className = 'newsletter-success-subheading';

  const successLegal = document.createElement('div');
  successLegal.className = 'newsletter-success-supporting';

  const subheadingCell = getRowCell(rows, 1);
  const supportingCell = getRowCell(rows, 4);
  const headingCell = getRowCell(rows, 0);
  const successHeadingCell = getRowCell(rows, 5);
  const successSubheadingCell = getRowCell(rows, 6);
  const successSupportingCell = getRowCell(rows, 7);

  setHeadingContent(title, headingCell, heading);
  copyCellContent(description, subheadingCell, subheading);
  copyCellContent(supporting, supportingCell, supportingText);
  setHeadingContent(successTitle, successHeadingCell, successHeading);
  copyCellContent(successBody, successSubheadingCell, successSubheading);
  copyCellContent(successLegal, successSupportingCell, successSupportingText);

  success.append(successTitle, successBody, successLegal);

  form.append(emailLabel, input, submitButton);
  wrapper.append(title, description, form, validationErrorEl, status, supporting, success);
  block.replaceChildren(wrapper);

  if (config.backgroundColor.startsWith('#')) {
    block.dataset.backgroundColor = 'custom';
    block.style.setProperty('--newsletter-custom-bg', config.backgroundColor);
    block.style.setProperty('--newsletter-custom-text', getCustomTextColor(config.backgroundColor));
  }

  if (config.backgroundStyle === 'image-wash' && isSafeUrl(config.backgroundImage)) {
    block.style.setProperty('--newsletter-bg-image', `url("${config.backgroundImage}")`);
  }

  if (config.fullWidth) {
    block.dataset.fullWidth = 'true';
    container?.setAttribute('data-full-width', 'true');
  }

  applyButtonColor(block, 'empty', config.buttonColorEmpty);
  applyButtonColor(block, 'filled', config.buttonColorFilled);

  if (config.formGap.endsWith('px') || config.formGap.endsWith('rem') || config.formGap.endsWith('em')) {
    block.dataset.formGap = 'custom';
    block.style.setProperty('--newsletter-form-gap', config.formGap);
  }

  setBlockState(block, 'default', {
    defaultNodes: [title, description, form, validationErrorEl, status, supporting],
    successNode: success,
    successHeading: successTitle,
  });
  setEmailState(block, '');

  input.addEventListener('input', () => {
    setEmailState(block, input.value);
    if (!validationErrorEl.hidden) {
      validationErrorEl.hidden = true;
      validationErrorEl.textContent = '';
      input.setAttribute('aria-invalid', 'false');
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!input.checkValidity()) {
      input.setAttribute('aria-invalid', 'true');
      validationErrorEl.hidden = false;
      validationErrorEl.textContent = input.validationMessage || DEFAULTS.validationError;
      status.textContent = '';
      input.focus();
      return;
    }

    setLoadingState(block, submitButton, true);
    input.setAttribute('aria-invalid', 'false');
    validationErrorEl.hidden = true;
    validationErrorEl.textContent = '';
    status.textContent = '';

    setBlockState(block, 'success', {
      defaultNodes: [title, description, form, validationErrorEl, status, supporting],
      successNode: success,
      successHeading: successTitle,
    });
    status.textContent = '';
    input.value = '';
    setEmailState(block, '');
    setLoadingState(block, submitButton, false);
  });
}

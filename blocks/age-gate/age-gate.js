import { readBlockConfig } from '../../scripts/aem.js';

const DEFAULTS = Object.freeze({
  headline: 'Age Verification Required',
  message: 'This website is intended for adults only. You must be at least 18 years old to enter.',
  legalCopy: 'By entering this site, you confirm that you are of legal age in your jurisdiction.',
  confirmLabel: 'I am 18 or older',
  denyLabel: 'Exit',
  minAge: '18',
  storageKey: 'age-gate-verified',
  exitUrl: 'https://www.google.com',
});

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('//')) return '';

  if (['#', '/', './', '../', '?'].some((token) => trimmed.startsWith(token))) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    return '';
  }

  return '';
}

function setVerified(storageKey) {
  try {
    localStorage.setItem(storageKey, 'true');
    return true;
  } catch {
    return false;
  }
}

function isVerified(storageKey) {
  try {
    return localStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

function buildPanel(config) {
  const overlay = document.createElement('div');
  overlay.className = 'age-gate-overlay';

  const panel = document.createElement('div');
  panel.className = 'age-gate-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'age-gate-title');

  if (config.backgroundImage) {
    panel.style.setProperty('--age-gate-bg-image', `url('${config.backgroundImage}')`);
    panel.dataset.hasImage = 'true';
  }

  const eyebrow = document.createElement('p');
  eyebrow.className = 'age-gate-eyebrow';
  eyebrow.textContent = `${config.minAge}+ ONLY`;

  const title = document.createElement('h2');
  title.id = 'age-gate-title';
  title.className = 'age-gate-title';
  title.textContent = config.headline;

  const message = document.createElement('p');
  message.className = 'age-gate-message';
  message.textContent = config.message;

  const legal = document.createElement('p');
  legal.className = 'age-gate-legal';
  legal.textContent = config.legalCopy;

  const actions = document.createElement('div');
  actions.className = 'age-gate-actions';

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'button age-gate-confirm';
  confirmButton.textContent = config.confirmLabel;

  const denyLink = document.createElement('a');
  denyLink.className = 'button secondary age-gate-deny';
  denyLink.href = config.exitUrl;
  denyLink.textContent = config.denyLabel;

  actions.append(confirmButton, denyLink);
  panel.append(eyebrow, title, message, legal, actions);
  overlay.append(panel);

  return { overlay, confirmButton };
}

function normalizeConfig(config) {
  const normalized = {
    headline: config.headline || DEFAULTS.headline,
    message: config.message || DEFAULTS.message,
    legalCopy: config.legalcopy || DEFAULTS.legalCopy,
    confirmLabel: config.confirmlabel || DEFAULTS.confirmLabel,
    denyLabel: config.denylabel || DEFAULTS.denyLabel,
    minAge: config.minage || DEFAULTS.minAge,
    storageKey: config.storagekey || DEFAULTS.storageKey,
    backgroundImage: config.backgroundimage || '',
    exitUrl: sanitizeUrl(config.exiturl) || DEFAULTS.exitUrl,
  };

  return normalized;
}

function lockPage() {
  document.body.classList.add('age-gate-locked');
}

function unlockPage() {
  document.body.classList.remove('age-gate-locked');
}

export default function decorate(block) {
  const config = normalizeConfig(readBlockConfig(block));

  block.textContent = '';

  if (isVerified(config.storageKey)) {
    block.dataset.ageGateStatus = 'verified';
    unlockPage();
    return;
  }

  block.dataset.ageGateStatus = 'locked';
  lockPage();

  const { overlay, confirmButton } = buildPanel(config);
  block.append(overlay);

  confirmButton.addEventListener('click', () => {
    setVerified(config.storageKey);
    block.dataset.ageGateStatus = 'verified';
    overlay.remove();
    unlockPage();
  });

  window.requestAnimationFrame(() => {
    confirmButton.focus({ preventScroll: true });
  });
}

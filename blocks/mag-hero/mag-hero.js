function normalizeLabel(value = '') {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

function toConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const [labelCell, valueCell] = row.children;
    if (!labelCell || !valueCell) return;
    config[normalizeLabel(labelCell.textContent)] = valueCell;
  });
  return config;
}

function buildButton(link, secondary = false) {
  if (!link) return null;
  link.classList.add('button');
  if (secondary) link.classList.add('secondary');
  return link;
}

function getLink(config, ...keys) {
  return keys
    .map((key) => config[key])
    .filter(Boolean)
    .map((value) => value.querySelector('a'))
    .find(Boolean) || null;
}

export default function decorate(block) {
  const config = toConfig(block);
  const image = config.image?.querySelector('img, picture img');
  const primaryLink = getLink(config, 'primary-cta', 'primary-cta-link', 'primary-cta-button');
  const secondaryLink = getLink(config, 'secondary-cta', 'secondary-cta-link', 'secondary-cta-button');

  const hero = document.createElement('div');
  hero.className = 'mag-hero-inner';

  if (image?.src) {
    hero.style.setProperty('--mag-hero-bg', `url("${image.src}")`);
  }

  const content = document.createElement('div');
  content.className = 'mag-hero-content';

  if (config.eyebrow?.textContent.trim()) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'mag-hero-eyebrow';
    eyebrow.textContent = config.eyebrow.textContent.trim();
    content.append(eyebrow);
  }

  if (config.title?.textContent.trim()) {
    const title = document.createElement('h1');
    title.textContent = config.title.textContent.trim();
    content.append(title);
  }

  if (config.description?.textContent.trim()) {
    const description = document.createElement('p');
    description.className = 'mag-hero-description';
    description.textContent = config.description.textContent.trim();
    content.append(description);
  }

  const actions = document.createElement('div');
  actions.className = 'mag-hero-actions';

  const primaryButton = buildButton(primaryLink);
  const secondaryButton = buildButton(secondaryLink, true);

  if (primaryButton) actions.append(primaryButton);
  if (secondaryButton) actions.append(secondaryButton);

  if (actions.children.length) content.append(actions);

  hero.append(content);
  block.replaceChildren(hero);
}

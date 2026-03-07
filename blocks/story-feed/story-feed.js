import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const list = document.createElement('ul');

  [...block.children].forEach((row) => {
    const [mediaCell, contentCell, linkCell] = row.children;
    if (!mediaCell || !contentCell) return;

    const image = mediaCell.querySelector('img');
    const link = linkCell?.querySelector('a');
    const href = link?.href || '#';

    const item = document.createElement('li');
    const card = document.createElement('a');
    card.className = 'story-feed-card';
    card.href = href;

    if (image?.src) {
      const media = document.createElement('div');
      media.className = 'story-feed-media';
      media.append(createOptimizedPicture(image.src, image.alt || '', false, [{ width: '600' }]));
      card.append(media);
    }

    const body = document.createElement('div');
    body.className = 'story-feed-body';
    body.append(...[...contentCell.children].map((child) => child.cloneNode(true)));

    const cta = document.createElement('span');
    cta.className = 'story-feed-cta';
    cta.textContent = link?.textContent?.trim() || 'Read Story';
    body.append(cta);

    card.append(body);
    item.append(card);
    list.append(item);
  });

  block.replaceChildren(list);
}

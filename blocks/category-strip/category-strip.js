import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const list = document.createElement('ul');

  [...block.children].forEach((row) => {
    const [mediaCell, contentCell] = row.children;
    if (!mediaCell || !contentCell) return;

    const image = mediaCell.querySelector('img');
    const link = contentCell.querySelector('a');
    const href = link?.href || '#';

    const item = document.createElement('li');
    const card = document.createElement('a');
    card.className = 'category-strip-card';
    card.href = href;

    if (image?.src) {
      const media = document.createElement('div');
      media.className = 'category-strip-media';
      media.append(createOptimizedPicture(image.src, image.alt || '', false, [{ width: '750' }]));
      card.append(media);
    }

    const body = document.createElement('div');
    body.className = 'category-strip-body';
    body.append(...[...contentCell.children].map((child) => child.cloneNode(true)));
    card.append(body);

    item.append(card);
    list.append(item);
  });

  block.replaceChildren(list);
}

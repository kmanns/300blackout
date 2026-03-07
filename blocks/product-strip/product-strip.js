import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  const rail = document.createElement('div');
  rail.className = 'product-strip-rail';

  [...block.children].forEach((row) => {
    const [mediaCell, contentCell, linkCell] = row.children;
    if (!mediaCell || !contentCell) return;

    const product = document.createElement('article');
    product.className = 'product-strip-item';

    const image = mediaCell.querySelector('img');
    if (image?.src) {
      const media = document.createElement('div');
      media.className = 'product-strip-media';
      media.append(createOptimizedPicture(image.src, image.alt || '', false, [{ width: '400' }]));
      product.append(media);
    }

    const body = document.createElement('div');
    body.className = 'product-strip-body';
    body.append(...[...contentCell.children].map((child) => child.cloneNode(true)));

    const link = linkCell?.querySelector('a')?.cloneNode(true);
    if (link) {
      link.classList.add('button', 'secondary');
      body.append(link);
    }

    product.append(body);
    rail.append(product);
  });

  block.replaceChildren(rail);
}

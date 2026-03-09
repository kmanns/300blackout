# Circle Carousel Block

A responsive horizontal carousel displaying circular images with linked text below. Perfect for grocery store categories, featured products, or brand showcases with smooth sliding transitions and navigation controls.

## Features

- Circular image containers with optimized images
- Clickable text links below each circle
- Horizontal smooth-sliding carousel
- Configurable items per view (mobile/tablet/desktop)
- Optional autoplay with hover pause
- Navigation arrows and dot indicators
- Responsive design (2/4/6 items visible)
- Touch-friendly for mobile
- Follows Adobe Commerce Storefront design standards

## Usage in DA.live

### Basic Configuration

Add a "Circle Carousel" block with up to 8 items:

| Circle Carousel | |
|-----------------|---|
| ![produce.jpg](/images/produce.jpg) | Fresh Produce → /categories/produce |
| ![bakery.jpg](/images/bakery.jpg) | Bakery → /categories/bakery |
| ![dairy.jpg](/images/dairy.jpg) | Dairy & Eggs → /categories/dairy |
| ![meat.jpg](/images/meat.jpg) | Meat & Seafood → /categories/meat |
| ![frozen.jpg](/images/frozen.jpg) | Frozen Foods → /categories/frozen |
| ![deli.jpg](/images/deli.jpg) | Deli → /categories/deli |
| ![beverages.jpg](/images/beverages.jpg) | Beverages → /categories/beverages |
| ![snacks.jpg](/images/snacks.jpg) | Snacks → /categories/snacks |

### Structure

Each row has 2 columns:
- **Column 1**: Circle Image (square images work best, will be cropped to circle)
- **Column 2**: Linked Text (title with hyperlink, e.g., `Fresh Produce → /produce`)

**Image Recommendations:**
- **Size**: 200x200px minimum (square aspect ratio)
- **Format**: JPG or PNG
- **Content**: Product photos, category icons, or representative images
- **Focus**: Center the main subject (will be cropped to circle)

## Configuration Options

### 1. Alignment
**Type:** Select (left | center | right)  
**Default:** "center"  
**Description:** Horizontal alignment of the carousel within the section.

**Options:**
- `left` - Align carousel to the left
- `center` - Center carousel (default, recommended for grocery)
- `right` - Align carousel to the right

### 2. Enable Autoplay
**Type:** Boolean  
**Default:** true  
**Description:** Automatically cycle through items every 4 seconds.

**Behavior:**
- Autoplay pauses on hover
- Resumes when mouse leaves
- Loops back to start after reaching the end
- Only active when more items than visible

### 3. Items Per View (Mobile)
**Type:** Number (1-4)  
**Default:** 2  
**Description:** Number of circles visible on mobile screens (< 768px).

**Recommendations:**
- `2` - Standard for grocery (default)
- `1` - For large product images
- `3` - For small icons/categories

### 4. Items Per View (Tablet)
**Type:** Number (2-6)  
**Default:** 4  
**Description:** Number of circles visible on tablet screens (768-1023px).

**Recommendations:**
- `4` - Balanced view (default)
- `3` - More breathing room
- `5-6` - For many categories

### 5. Items Per View (Desktop)
**Type:** Number (3-8)  
**Default:** 6  
**Description:** Number of circles visible on desktop screens (≥ 1024px).

**Recommendations:**
- `6` - Standard for grocery categories (default)
- `5` - Larger circles with more prominence
- `8` - Maximum, for extensive catalogs

## Layout

```
Desktop (6 items visible):
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ◄  (○)   (○)   (○)   (○)   (○)   (○)   ►              │
│     Prod  Bake  Dairy Meat  Froz  Deli                  │
│     Link  Link  Link  Link  Link  Link                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
              ○  ○  ●  ○  ○  (Indicators)

Tablet (4 items visible):
┌──────────────────────────────────────────┐
│                                          │
│  ◄  (○)   (○)   (○)   (○)   ►           │
│     Prod  Bake  Dairy Meat               │
│                                          │
└──────────────────────────────────────────┘
         ○  ○  ●  ○  (Indicators)

Mobile (2 items visible):
┌─────────────────────────┐
│                         │
│  ◄  (○)   (○)   ►       │
│     Prod  Bake          │
│                         │
└─────────────────────────┘
      ○  ○  ●  (Indicators)
```

## Examples

### Grocery Categories (6 items)

| Circle Carousel | |
|-----------------|---|
| ![produce](/images/categories/produce.jpg) | Fresh Produce → /produce |
| ![bakery](/images/categories/bakery.jpg) | Bakery → /bakery |
| ![dairy](/images/categories/dairy.jpg) | Dairy & Eggs → /dairy |
| ![meat](/images/categories/meat.jpg) | Meat & Seafood → /meat |
| ![frozen](/images/categories/frozen.jpg) | Frozen Foods → /frozen |
| ![pantry](/images/categories/pantry.jpg) | Pantry Staples → /pantry |

**Configuration:**
- Alignment: center
- Autoplay: true
- Items: 2 (mobile) / 4 (tablet) / 6 (desktop)

### Featured Brands (8 items)

| Circle Carousel | |
|-----------------|---|
| ![brand1](/images/brands/organic-valley.jpg) | Organic Valley → /brands/organic-valley |
| ![brand2](/images/brands/365.jpg) | 365 Everyday Value → /brands/365 |
| ![brand3](/images/brands/applegate.jpg) | Applegate → /brands/applegate |
| ... (more brands) ... |

**Configuration:**
- Alignment: center
- Autoplay: true
- Items: 2 (mobile) / 4 (tablet) / 6 (desktop)

### Weekly Specials (5 items)

| Circle Carousel | |
|-----------------|---|
| ![special1](/images/specials/apples.jpg) | Fresh Apples $1.99/lb → /specials |
| ![special2](/images/specials/bread.jpg) | Artisan Bread BOGO → /specials |
| ![special3](/images/specials/milk.jpg) | Organic Milk $3.49 → /specials |
| ![special4](/images/specials/chicken.jpg) | Free Range Chicken $4.99 → /specials |
| ![special5](/images/specials/cheese.jpg) | Aged Cheddar 20% Off → /specials |

**Configuration:**
- Alignment: center
- Autoplay: false (let users browse at their pace)
- Items: 2 (mobile) / 3 (tablet) / 5 (desktop)

## Technical Details

### Dependencies
- `scripts/aem.js` - Image optimization utilities
- No external drop-ins required

### Behavior
- **Sliding**: Smooth CSS transform transitions
- **Navigation**: Arrows slide by 1 item
- **Autoplay Interval**: 4 seconds per slide
- **Loop**: Returns to start after reaching end
- **Responsive**: Recalculates on window resize

### Image Optimization
- Images optimized at 200px width
- Lazy loading via `createOptimizedPicture()`
- Responsive srcset generated automatically
- Circular crop via CSS `border-radius: 50%`

### Performance
- Hardware-accelerated CSS transforms
- Debounced resize handler (250ms)
- Minimal JavaScript for navigation
- Efficient DOM manipulation

### Accessibility
- **ARIA Labels**: All buttons labeled for screen readers
- **Keyboard Navigation**: Tab through controls
- **Focus States**: Visible indicators on buttons
- **Disabled States**: Properly communicated to assistive tech

## Styling

The block uses design tokens for consistent styling:

**Layout & Spacing:**
- `--spacing-small`, `--spacing-medium` - Gaps and padding
- `--circle-carousel-gap` - Space between circles

**Circles:**
- `--circle-carousel-circle-size` - 120px on desktop
- `--circle-carousel-circle-size-mobile` - 100px on mobile

**Colors:**
- `--color-neutral-50` - Circle background
- `--color-neutral-300` - Circle border
- `--color-neutral-900` - Text color
- `--color-brand-500` - Hover/active states

**Typography:**
- `--type-body-1-default-font` - Link text (desktop)
- `--type-body-2-default-font` - Link text (mobile)

### Customization

Override in your CSS:

```css
/* Adjust circle size */
:root {
  --circle-carousel-circle-size: 150px;
  --circle-carousel-circle-size-mobile: 120px;
}

/* Change transition speed */
:root {
  --circle-carousel-transition: transform 0.8s ease;
}

/* Modify circle styling */
.circle-carousel-circle {
  border-width: 4px;
  box-shadow: 0 6px 16px rgba(0 0 0 / 15%);
}

/* Adjust hover effect */
.circle-carousel-circle:hover {
  transform: translateY(-6px) scale(1.08);
}
```

## Use Cases for Grocery

### 1. **Shop by Department**
Display main grocery departments with category images and links to browse.

### 2. **Featured Brands**
Showcase popular or exclusive brands available in your store.

### 3. **Weekly Specials**
Highlight this week's deals with product images and promotional text.

### 4. **Seasonal Products**
Feature seasonal items like "Holiday Favorites" or "Summer BBQ Essentials".

### 5. **New Arrivals**
Show recently added products or newly stocked items.

### 6. **Store Services**
Display available services like "Curbside Pickup", "Delivery", "Pharmacy", etc.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Touch/swipe gestures on mobile devices
- IE11 not supported (CSS Grid and modern JS required)

## Known Limitations

- Maximum 8 items recommended for performance
- Square images work best (will be cropped to circle)
- Autoplay interval fixed at 4 seconds (modifiable in JS)
- Slides by 1 item per click (not by full page)

## Troubleshooting

**Carousel not sliding:**
1. Check that block has multiple items
2. Verify navigation buttons are present
3. Check console for JavaScript errors
4. Ensure CSS file is loaded

**Images not circular:**
1. Verify CSS `border-radius: 50%` applied
2. Check that images are loading (not 404)
3. Ensure image container has equal width/height

**Autoplay not working:**
1. Verify `data-autoplay` is not set to `"false"`
2. Check that there are more items than visible
3. Ensure no JavaScript errors in console
4. Try hovering then leaving to re-trigger

**Navigation missing:**
1. Need more items than `itemsPerView` setting
2. Check that navigation element is appended
3. Verify indicators are created

**Responsive not working:**
1. Check viewport meta tag in HTML
2. Verify CSS media queries loading
3. Test resize by refreshing page

## Related Blocks

- **Slider Accordion** - Full-width hero slider with fade transitions
- **Three Boxes** - Static three-column feature display
- **Cards** - Grid layout for products/content

## Adobe Commerce Storefront Best Practices

✅ **Vertical spacing handled by sections, not blocks**  
✅ **Design tokens for all styling**  
✅ **Configuration drives behavior**  
✅ **Responsive and mobile-first**  
✅ **Accessible by default**  
✅ **Semantic HTML structure**  
✅ **Configuration integrity** (all model fields used)  
✅ **JSDoc documentation** on all functions  
✅ **Width conforms to section** (1200px constraint)

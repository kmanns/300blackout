# Top Banner

## Overview
`top-banner` renders a global announcement strip that can mount above the site header or render inline.

Supported behavior:
- Static lane layout (`single`, `split`, `multi`)
- Ticker mode with animated scrolling message stream
- Header mount with automatic nav/main offset updates

Not currently implemented:
- Dismiss/persistence behavior
- Mobile-mode ticker override metadata
- Region/audience/analytics targeting metadata

## DA.live Integration And Authoring Structure
### Block Structure
`_top-banner.json` defines a `4`-column shape.

Authoring supports two formats:

1. Typed rows (recommended)
- Column 1: row type (`message`, `utility`, `ticker-item`)
- Column 2: left lane content
- Column 3: center lane content
- Column 4: right lane content

2. Legacy rows
- No row type column
- Columns map directly to left/center/right

### Typed Row Semantics
- `message`: primary row used for static left lane
- `utility`: contributes center/right fragments in static layouts
- `ticker-item`: explicit ticker feed rows

Ticker feed resolution:
- If explicit `ticker-item` rows exist, ticker uses only those rows
- Otherwise ticker falls back to `message + utility` rows

### DA.live Model Options
`_top-banner.json` currently defines no model fields.

| model field | values | effect |
| --- | --- | --- |
| none | n/a | Configure behavior using section metadata only. |

### Section Metadata Placement Guidance
Place `section-metadata` immediately above the section containing `top-banner`.

Canonical keys are `topbanner-*`.

## Configuration Options
### Section Metadata Reference
| key/field | possible values | effect |
| --- | --- | --- |
| `topbanner-mode` | `static`, `ticker` | Default: `static`. Selects static lane rendering or ticker rendering. |
| `topbanner-mount` | `header`, `inline` | Default: `header`. `header` mounts into header and updates offsets; `inline` renders in-flow. |
| `topbanner-mounttarget` | CSS selector | Default: `header .header.block`. Selector used as preferred mount target when `topbanner-mount=header`. |
| `topbanner-layout` | `single`, `split`, `multi` | Default: `split`. Static layout only. Ticker mode forces effective single-lane layout. |
| `topbanner-arialive` | `off`, `polite` | Default: `off`. Controls live-region behavior. |
| `topbanner-align` | `left`, `center`, `right` | Default: `left`. Aligns primary lane content. |
| `topbanner-variant` | `info`, `promo`, `urgent`, `neutral` | Default: `neutral`. Applies variant border treatment. |
| `topbanner-maxwidth` | `none`, `1200`, `1400`, `1600` | Default: `none`. Constrains inner content width while background remains full width. |
| `topbanner-textsize` | `sm`, `md`, `lg` | Default: `md`. Sets banner typography size token preset. |
| `topbanner-textweight` | `400`, `500`, `600`, `700` | Default: `500`. Sets banner font weight. |
| `topbanner-density` | `default`, `compact` | Default: `default`. Controls vertical density of banner inner layout. |
| `topbanner-contentgap` | `none`, `xsmall`, `small`, `medium`, `large` | Default: `none`. Adds extra spacing below header-mounted banner stack. No-op in inline mode (warned). |
| `topbanner-bgcolor` | `transparent`, `light`, `neutral`, `dark`, `brand`, `accent`, `white`, `black`, `#RGB`, `#RRGGBB`, `rgb(...)`, `rgba(...)` | Default: `neutral`. Sets banner background color token/value. |
| `topbanner-textcolor` | `transparent`, `light`, `neutral`, `dark`, `brand`, `accent`, `white`, `black`, `#RGB`, `#RRGGBB`, `rgb(...)`, `rgba(...)` | Default: `dark`. Sets banner text/link color token/value. |
| `topbanner-speed` | `slow`, `medium`, `fast` | Default: `medium`. Ticker animation speed. |
| `topbanner-direction` | `left`, `right` | Default: `left`. Ticker scroll direction. |
| `topbanner-pauseonhover` | `true`, `false`, `1`, `0`, `yes`, `no`, `on`, `off` | Default: `true`. Pauses ticker on pointer hover and focus interactions. |
| `topbanner-loopgap` | `small`, `medium`, `large` | Default: `medium`. Spacing between ticker items. |
| `topbanner-source` | `all`, `left`, `left-right` | Default: `all`. Chooses which lanes feed ticker items from each row. |
| `topbanner-debug` | `true`, `false`, `1`, `0`, `yes`, `no`, `on`, `off` | Default: `false`. Runs runtime checks and emits diagnostics. |

## Metadata Precedence
1. Layout tier
- `topbanner-mode`, `topbanner-mount`, `topbanner-mounttarget`, `topbanner-layout`, `topbanner-align`, `topbanner-maxwidth`, `topbanner-density`, `topbanner-contentgap`

2. Content/structure tier
- typed/legacy row parsing
- `topbanner-source`

3. Style/shape tier
- `topbanner-variant`, `topbanner-textsize`, `topbanner-textweight`

4. Color/explicit overrides tier
- `topbanner-bgcolor`, `topbanner-textcolor`

5. Media/motion tier
- `topbanner-speed`, `topbanner-direction`, `topbanner-pauseonhover`, reduced-motion behavior

## Override Rules
| condition | winner | ignored/no-op fields | user-visible effect |
| --- | --- | --- | --- |
| `topbanner-mode=ticker` | mode rule | static lane layout semantics | Effective layout becomes single-lane ticker. |
| `topbanner-contentgap!=none` with `topbanner-mount=inline` | mount rule | `topbanner-contentgap` | Gap is not applied; warning emitted. |
| `prefers-reduced-motion: reduce` | accessibility rule | ticker animation | Ticker renders first message statically (no animation). |

## Behavior Patterns
- Config resolution is deterministic via canonical keys only.
- Invalid values fall back safely and log `top-banner:` warnings.
- Links are sanitized for protocol safety; `_blank` links enforce `rel="noopener noreferrer"`.
- Header mount updates header/nav/main offsets using measured banner stack height.
- Ticker playback state can pause via hover or focus interactions.
- Instance cleanup aborts listeners and observers before re-decoration.

## Accessibility Notes
- Banner is rendered as `role="region"` with `aria-label="Site announcement"`.
- `aria-live` supports `off` and `polite`.
- Focus interactions pause ticker to improve readability.
- Reduced-motion users receive static (non-animated) ticker output.

## Runtime Events
Events emitted on the block element:
- `top-banner:shown`
- `top-banner:ticker-start` (ticker mode only)
- `top-banner:checks` (debug mode only)

## Troubleshooting
| symptom | likely cause | fix |
| --- | --- | --- |
| Banner did not mount into header | Mount target selector did not resolve | Set `topbanner-mounttarget` to a valid selector or rely on fallback header selectors. |
| Static layout not as expected | Ticker mode enabled | Set `topbanner-mode=static` to use `single/split/multi` lane layouts. |
| Ticker does not animate | `prefers-reduced-motion` active or no ticker content | Check OS/browser reduced-motion preference and ensure ticker source lanes contain content. |
| Metadata not applying | Metadata key mismatch | Use canonical `topbanner-*` keys and place section metadata above the block section. |
| Unsafe link was replaced with `#` | Blocked URL protocol | Use allowed protocols (`http`, `https`, `mailto`, `tel`, or relative/hash links). |

## Quick Validation
```js
(() => {
  const banner = document.querySelector('.top-banner');
  const ticker = banner?.querySelector('.top-banner-ticker');
  const track = ticker?.querySelector('.top-banner-ticker-track');
  console.table({
    mode: banner?.dataset.topbannerMode,
    mount: banner?.dataset.topbannerMount,
    layout: banner?.dataset.topbannerLayout,
    effectiveLayout: banner?.dataset.topbannerEffectivelayout,
    source: banner?.dataset.topbannerSource,
    direction: banner?.dataset.topbannerDirection,
    ariaLive: banner?.getAttribute('aria-live'),
    items: ticker?.querySelectorAll('.top-banner-ticker-item').length ?? 0,
    animation: track ? getComputedStyle(track).animationName : '(none)',
  });
})();
```

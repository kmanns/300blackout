# Hero CTA Block

## Overview

The `hero-cta` block is a media-first hero with optional sidebar navigation and metadata-driven CTA styling.

It now uses **typed row authoring** in DA.live to remove ambiguity:
- `slide` rows for media + CTA content,
- `nav` rows for sidebar entries,
- `interval` rows for slide timing.

## DA.live Integration and Authoring Structure

Author using a **4-column** `hero-cta` table.

### Typed Row Model

| Row Type (Col 1) | Col 2 | Col 3 | Col 4 |
|---|---|---|---|
| `slide` | image/media cell | CTA labels (one per line or links) | CTA URLs (one per line or links) |
| `nav` | mode: `item` or `header` | nav label (rich text preserved) | nav URL (for `item`) |
| `interval` | interval in ms (for example `5000`) | unused | unused |

### Authoring Examples

| Col 1 | Col 2 | Col 3 | Col 4 |
|---|---|---|---|
| `slide` | `[image]` | `Shop Shirts`<br>`Shop Hats` | `/shirts`<br>`/hats` |
| `nav` | `header` | `Women` (can be authored as H1-H6 / bold / paragraph) | |
| `nav` | `item` | `New Arrivals` | `/women/new` |
| `nav` | `item` | `Jackets` | `/women/jackets` |
| `interval` | `5000` | | |

### Sidebar Header Behavior

When `nav` row mode is `header` (Column 2):
- the row renders as a non-clickable sidebar heading,
- it is styled as `.hero-cta-sidebar-header`,
- no URL is required.

### Sidebar Label Typography Source

- Sidebar nav label typography is authored in DA.live (Column 3 of `nav` rows).
- Downstream rendering preserves authored rich text structure for labels (for example headings, bold text, paragraph text).
- `herocta-ctasize` controls CTA button text size only, not sidebar nav typography.

## Configuration Options

### DA.live Model Options

| Option | Value |
|---|---|
| Block columns | `4` |
| Supported typed rows | `slide`, `nav`, `interval` |
| Sidebar header mode | `nav` row + Column 2 = `header` |

### Section Metadata Reference

Place section metadata immediately above the block.

#### Layout

| Key | Possible Values | Effect |
|---|---|---|
| `herocta-position` | `top-left`, `top-center`, `top-right`, `middle-left`, `middle-center`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right` | Default: `bottom-right`. Controls overlay anchor point for CTA content on both axes. |
| `herocta-size` | `short`, `medium`, `tall`, `fullscreen` | Default: `tall`. Controls hero height preset. |
| `herocta-inset` | `xsmall`, `small`, `medium`, `large`, `xlarge` | Default: `medium`. Controls linear distance of overlay content from edges. |
| `herocta-contentwidth` | `360`, `420`, `520`, `640` | Default: `420`. Sets maximum CTA/content surface width in pixels. |
| `herocta-width` | `default`, `full-width` | Default: `default`. Controls container width mode. `full-width` becomes no-op when sidebar is enabled. |
| `herocta-sidebar` | `left`, `right`, `overlay-left`, `overlay-right`, `sticky-left`, `sticky-right` | Default: `off` (unset). Enables sidebar placement mode when typed `nav` rows exist. |
| `herocta-imgmax` | `1200`, `1600`, `2000`, `2400`, `3000`, `3600` | Default: `2400`. Controls responsive image max width cap used for optimized picture breakpoints. |

#### CTA/Button

| Key | Possible Values | Effect |
|---|---|---|
| `herocta-btnstyle` | `outline`, `solid`, `elevated`, `glass`, `soft`, `soft-glow`, `neo`, `ribbon`, `stamp`, `link`, `inset`, `underline`, `quiet`, `strong`, `halo`, `bevel`, `tab`, `rail`, `outline-double`, `compact`, `corner-pins`, `ticket`, `capsule-cut`, `brace`, `double-notch`, `frame-gap`, `split-edge`, `fold`, `badge`, `pixel-step` | Default: `elevated`. Controls button structure/chrome only. |
| `herocta-btncorner` | `default`, `soft`, `rounded-lg`, `pill`, `none` | Default: unset. Optional explicit corner override for CTA shape. |
| `herocta-btnwidth` | `auto`, `narrow`, `medium`, `wide`, `fluid`, `fit-content` | Default: `medium`. Controls CTA width sizing. |
| `herocta-btnborder` | `1`, `2`, `3`, `4` | Default: `3`. Controls CTA border thickness in px. |
| `herocta-btncolor` | token values (`transparent`, `light`, `neutral`, `dark`, `brand`, `accent`, `white`, `black`) or color literals (`#hex`, `rgb(...)`, `rgba(...)`) | Default: `white`. Controls CTA border color only. |
| `herocta-btnfill` | token values (`transparent`, `light`, `neutral`, `dark`, `brand`, `accent`, `white`, `black`) or color literals (`#hex`, `rgb(...)`, `rgba(...)`) | Default: `transparent`. Controls CTA fill color only. |
| `herocta-btntext` | `white`, `dark`, `brand`, `accent`, `inherit` or color literals | Default: `white`. Controls CTA text color only. |
| `herocta-btnhover` | `none`, `lift`, `press`, `pop`, `nudge`, `tilt`, `swing`, `pulse` | Default: `lift`. Motion-only hover behavior. |
| `herocta-ctalayout` | `stack`, `inline`, `split` | Default: `stack`. Controls CTA grouping layout. |
| `herocta-ctagap` | `xsmall`, `small`, `medium`, `large` | Default: `medium`. Controls spacing between CTA items. |
| `herocta-ctacase` | `none`, `uppercase`, `capitalize` | Default: `none`. Controls CTA text transform. |
| `herocta-ctasize` | `default`, `sm`, `md`, `lg` | Default: `default`. Controls CTA font size preset. |

#### Frame/Image

| Key | Possible Values | Effect |
|---|---|---|
| `herocta-frame` | `default`, `soft-small`, `soft-medium`, `soft-large`, `outline`, `double-stroke`, `glass-ring`, `floating-panel`, `halo-ring`, `photo-matte`, `edge-rails`, `topline-accent`, `duo-effect` | Default: `default`. Applies frame treatment to hero container. |

#### Motion

| Key | Possible Values | Effect |
|---|---|---|
| `herocta-transition` | `fade`, `slide`, `none` | Default: `fade`. Controls slide transition behavior. |

## Behavior Patterns

### Metadata Precedence

The block resolves configuration in this order:
1. Layout tier (`position`, `size`, `sidebar`, `width`, `inset`, `content width`, `image max width`)
2. Content/structure tier (`cta layout`, `gap`, `case`, `font size`, `button width`)
3. Style/shape tier (`button style`, `button corner`, `button border width`)
4. Color/explicit overrides tier (`button border/fill/text colors`)
5. Media/motion tier (`slide transition`, `image frame`, `button hover motion`)

### Override Rules

| Condition | Winner | Ignored/No-op | User-visible effect |
|---|---|---|---|
| `herocta-width=full-width` with sidebar enabled | Sidebar/layout constraint | `herocta-width=full-width` | Block uses default width to preserve sidebar geometry. |
| `herocta-btnstyle=link` with border/corner settings | Link style | corner/border settings | CTA renders as text-link style. |
| `herocta-ctalayout=split` with fewer than 2 CTAs | Content count | split intent | Split grid cannot form; warning is logged. |

### Conflict/No-op Notes

- Sidebar requires typed `nav` rows; enabling `herocta-sidebar` without typed nav rows logs a warning and renders no sidebar.
- Invalid metadata values normalize to defaults with block-prefixed warnings.
- `nav` rows with `header` mode intentionally ignore URL values.
- Sidebar label text size/weight is not metadata-driven; it comes from authored DA.live text formatting in `nav` label cells.

## Accessibility Notes

- First slide image is eager-loaded for LCP optimization.
- CTA disabled placeholders are marked non-focusable.
- Sidebar headers are non-interactive semantic text.
- Focus-visible states are provided for CTA and sidebar links.
- Reduced-motion media query disables heavy hover animations.

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Sidebar not visible | No typed `nav` rows authored | Add `nav` rows with mode `item` or `header`. |
| Sidebar title should be non-clickable | Nav row mode not set | Set `nav` row Column 2 to `header`. |
| Sidebar text size/weight not changing via metadata | Sidebar typography is author-driven | Apply DA.live text formatting in `nav` label cell (Column 3), for example H2/H3/bold. |
| CTA labels render but links do not | Slide URLs missing | Add URLs in `slide` row Column 4. |
| Interval not applied | `interval` row value invalid | Use numeric ms in Column 2 (for example `5000`). |
| Full-width not applying | Sidebar enabled | Disable sidebar or keep width as `default`. |

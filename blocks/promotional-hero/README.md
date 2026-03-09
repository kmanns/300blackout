# Promotional Hero Block

## Overview

The `promotional-hero` block renders a responsive campaign card grid with image-first cards, optional description copy, and one CTA per card.

It uses section metadata for layout, panel treatment, CTA styling, color channels, and motion behavior.

## DA.live Integration and Authoring Structure

Author using a **3-column** `promotional-hero` table.

### Authoring Table Model

| Column | Purpose | Required |
|---|---|---|
| Col 1 | Image/media source | Yes |
| Col 2 | Description copy | No |
| Col 3 | CTA | No |

### Authoring Notes

- Col 1 accepts image, image link, or image URL.
- Col 2 supports paragraph/line-based copy.
- Col 3 supports authored links and `Label|URL` fallback syntax.

## Configuration Options

### DA.live Model Options

| Option | Value |
|---|---|
| Block columns | `3` |
| Card source | One row per promotional card |
| Runtime config source | Section metadata only |

### Section Metadata Reference

Place section metadata immediately above the block.

#### Layout

| Key | Possible Values | Effect |
|---|---|---|
| `promohero-align` | `left`, `center`, `right` | Default: `center`. Controls horizontal alignment of the card grid. |
| `promohero-columns` | `auto`, `1`, `2`, `3`, `4` | Default: `2`. Controls desktop card columns in linear layout. |
| `promohero-layout` | `linear`, `honeycomb`, `on`, `off` | Default: `linear`. `on` maps to `honeycomb`, `off` maps to `linear`. |
| `promohero-cardwidth` | `small`, `medium`, `large` | Default: `medium`. Controls base card width profile. |
| `promohero-cardheight` | `auto`, `short`, `medium`, `tall` | Default: `auto`. Controls minimum card height profile. |
| `promohero-imageratio` | `portrait`, `square`, `landscape` | Default: `portrait`. Controls card media aspect ratio. |
| `promohero-imagefit` | `cover`, `contain` | Default: `cover`. Controls media crop behavior. |
| `promohero-gap` | `small`, `medium`, `large` | Default: `medium`. Controls spacing between cards. |
| `promohero-density` | `compact`, `comfortable`, `spacious` | Default: `comfortable`. Scales internal spacing rhythm. |
| `promohero-width` | `default`, `full-width` | Default: `default`. `full-width` enables edge-to-edge block treatment. |
| `promohero-gridmaxwidth` | `none`, `1200`, `1400`, `1600`, `1800` | Default: `none`. Caps maximum grid width on large screens. |
| `promohero-mobilelayout` | `stack`, `carousel`, `snap-scroll` | Default: `stack`. Controls mobile card flow behavior. |

#### Content Panel

| Key | Possible Values | Effect |
|---|---|---|
| `promohero-contentstyle` | `floating`, `flush`, `inset` | Default: `floating`. Controls panel placement relative to media. |
| `promohero-contentalign` | `left`, `center`, `right` | Default: `center`. Controls text alignment within panel. |
| `promohero-panelwidth` | `compact`, `standard`, `wide` | Default: `standard`. Controls panel width envelope. |
| `promohero-paneloffset` | `none`, `small`, `medium`, `large`, `xlarge` | Default: `medium`. Controls floating panel vertical offset. |
| `promohero-contentborderstyle` | `none`, `outline`, `solid`, `elevated`, `glass`, `soft`, `soft-glow`, `neo`, `ribbon`, `stamp`, `link`, `inset`, `underline`, `quiet`, `strong`, `halo`, `bevel`, `tab`, `rail`, `outline-double`, `compact`, `corner-pins`, `ticket`, `capsule-cut`, `brace`, `double-notch`, `frame-gap`, `split-edge`, `fold`, `badge`, `pixel-step` | Default: `none`. Controls panel border structure/chrome only, using the same style vocabulary as CTA buttons. |
| `promohero-contentshadow` | `none`, `soft`, `medium`, `strong` | Default: `soft`. Controls panel elevation depth. |
| `promohero-contentradius` | `sharp`, `soft`, `default`, `rounded-lg`, `pill` | Default: `default`. Controls panel corner geometry. |
| `promohero-contentbg` | token values (`transparent`, `light`, `neutral`, `dark`, `brand`, `accent`, `white`, `black`) or color literals (`#hex`, `rgb(...)`, `rgba(...)`) | Default: `white`. Controls panel background color only. |
| `promohero-contenttext` | token values (`transparent`, `light`, `neutral`, `dark`, `brand`, `accent`, `white`, `black`) or color literals | Default: `dark`. Controls panel text color only. |
| `promohero-contentbordercolor` | token values or color literals | Default: unset. Explicit panel border color override. |

#### Card and Image

| Key | Possible Values | Effect |
|---|---|---|
| `promohero-cardradius` | `sharp`, `soft`, `default`, `rounded-lg` | Default: `default`. Controls card shell corner shape. |
| `promohero-cardborderstyle` | `none`, `subtle`, `strong`, `brand` | Default: `none`. Controls card border style preset. |
| `promohero-cardborderwidth` | `0`, `1`, `2`, `3`, `4`, `6` | Default: `0`. Controls card border width in px. |
| `promohero-cardbordercolor` | token values or color literals | Default: unset. Explicit card border color override. |
| `promohero-imageshadow` | `none`, `soft`, `strong` | Default: `soft`. Controls card media elevation. |
| `promohero-imageposition` | `left`, `center`, `right`, `top`, `bottom` | Default: `center`. Controls media object-position. |
| `promohero-imageoverlay` | `none`, `light`, `medium`, `strong`, `brand-tint` | Default: `none`. Controls image overlay intensity/style. |
| `promohero-imageoverlaycolor` | token values or color literals | Default: `dark`. Controls overlay color channel. |
| `promohero-bgcolor` | token values or color literals | Default: `transparent`. Controls block background surface. |

#### CTA and Description

| Key | Possible Values | Effect |
|---|---|---|
| `promohero-btnstyle` | `outline`, `solid`, `elevated`, `glass`, `soft`, `soft-glow`, `neo`, `ribbon`, `stamp`, `link`, `inset`, `underline`, `quiet`, `strong`, `halo`, `bevel`, `tab`, `rail`, `outline-double`, `compact`, `corner-pins`, `ticket`, `capsule-cut`, `brace`, `double-notch`, `frame-gap`, `split-edge`, `fold`, `badge`, `pixel-step` | Default: `outline`. Controls CTA structure/chrome only. |
| `promohero-btncorner` | `sharp`, `default`, `soft`, `rounded-lg`, `pill` | Default: unset. Optional explicit corner override. |
| `promohero-btnwidth` | `auto`, `narrow`, `medium`, `wide`, `fluid` | Default: `medium`. Controls CTA width behavior. |
| `promohero-btncase` | `none`, `uppercase`, `capitalize` | Default: `none`. Controls CTA text transform. |
| `promohero-btnborder` | `1`, `2`, `3`, `4` | Default: `3`. Controls CTA border width in px. |
| `promohero-btnshadow` | `none`, `soft`, `medium`, `strong` | Default: `none`. Controls CTA shadow depth. |
| `promohero-btnsize` | `sm`, `md`, `lg` | Default: `md`. Controls CTA font size preset. |
| `promohero-btnweight` | `400`, `500`, `600`, `700` | Default: `600`. Controls CTA font weight. |
| `promohero-btncolor` | token values or color literals | Default: `white`. Controls CTA border color only. |
| `promohero-btnfill` | token values or color literals | Default: `transparent`. Controls CTA fill color only. |
| `promohero-btntext` | token values or color literals | Default: `white`. Controls CTA text color only. |
| `promohero-btnhovermotion` | `none`, `lift`, `press`, `pop`, `nudge`, `tilt` | Default: `lift`. Motion-only hover behavior. |
| `promohero-btnhovercolor` | `style`, `none`, `inverse`, `darken` | Default: `none`. Hover color behavior layer. |
| `promohero-descmaxlines` | `2`, `3`, `4`, `5`, `none` | Default: `none`. Optional description line clamp. |
| `promohero-descstyle` | `body`, `headline`, `eyebrow`, `muted` | Default: `body`. Description text style preset. |

## Behavior Patterns

### Metadata Precedence

The block resolves configuration in this order:
1. Layout tier (`align`, `columns`, `layout`, card/media geometry, spacing, width)
2. Content/structure tier (`button width` and card row structure)
3. Style/shape tier (`button style`, corners, border widths, shadows, panel/card shell style)
4. Color/explicit overrides tier (panel/card/button/overlay/background color channels)
5. Media/motion tier (`hover effect`, `button hover motion`, `button hover color`, image overlay behavior)

### Override Rules

| Condition | Winner | Ignored/No-op | User-visible effect |
|---|---|---|---|
| `promohero-btnstyle=link` with `promohero-btncorner` | `btnstyle` | `btncorner` | Link CTA ignores corner radius and logs warning. |
| `promohero-btnstyle=link` with `promohero-btnborder` | `btnstyle` | `btnborder` | Link CTA ignores border width and logs warning. |
| `promohero-btnstyle=link` with `promohero-btncolor` | `btnstyle` | `btncolor` | Link CTA ignores border color and logs warning. |
| `promohero-btnstyle=link` with `promohero-btnfill` | `btnstyle` | `btnfill` | Link CTA ignores fill color and logs warning. |
| `promohero-imageratio=landscape` with no explicit `promohero-btnwidth` | layout/structure rule | implicit width assumption | CTA width resolves to `medium` for stable card geometry. |
| `promohero-layout=honeycomb` with explicit `promohero-columns` | layout pattern | explicit columns | Honeycomb pattern manages placement and ignores manual column count. |

### Conflict/No-op Notes

- Invalid metadata values normalize to safe defaults with block-prefixed warnings.
- CTA color channels are independent from `promohero-btnstyle` except `link` no-op rules above.
- Only safe URLs are rendered as clickable links; invalid URLs are disabled.

## Accessibility Notes

- CTA actions are semantic links.
- Invalid/unsafe links are marked `aria-disabled` and removed from tab order.
- Focus-visible states are present for keyboard navigation.
- `_blank` links always enforce `rel="noopener noreferrer"`.
- Reduced-motion users get transform-free hover behavior.

## Troubleshooting

| Symptom | Likely Cause | Resolution |
|---|---|---|
| CTA style value does not apply | Unsupported `promohero-btnstyle` value | Use one of the documented canonical style values. |
| CTA corner/border/fill appears ignored | `promohero-btnstyle=link` | Switch to a shell style (for example `outline`, `elevated`, `soft`). |
| Card layout not respecting explicit columns | `promohero-layout=honeycomb` | Use `promohero-layout=linear` for manual column control. |
| CTA link renders disabled | URL failed sanitization | Use `https`, `http`, `mailto`, `tel`, `/relative`, `./relative`, `../relative`, `#anchor`, or `?query`. |
| Full-width not visually edge-to-edge | Section/container constraints | Keep `promohero-width=full-width` and verify parent section/container layout constraints. |

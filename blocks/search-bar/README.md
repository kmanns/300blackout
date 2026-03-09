# Search Bar Block

## Overview

The `search-bar` block is a standalone storefront search input with inline product results, powered by product discovery drop-ins.

This implementation is intentionally default-only for visual styling (no preset themes), with performance and accessibility optimizations:
- debounced inline requests,
- per-instance search scope,
- stale-result guarding,
- fallback submit-only mode if inline search modules fail.

## DA.live Integration

Create a 1-row, 1-column `search-bar` block.

| Row | Purpose | Required | Default | Notes |
|---|---|---|---|---|
| 1 | Placeholder text | No | `Search products...` | Example: `Search products` |

### Example

| search-bar |
|---|
| Search products |

## Configuration Options

| Key | Default | Possible Values | Effect |
|---|---|---|---|
| Author row 1 (placeholder) | `Search products...` | Any text | Sets input placeholder copy. |

## Section Metadata Reference

Place **Section Metadata immediately above** the `search-bar` block.

| Key | Default | Possible Values | Effect |
|---|---|---|---|
| `searchbar-align` | `center` | `left`, `center`, `right`, `wide` | Positions search bar in the section, or stretches it to full available section width with `wide`. |
| `searchbar-results` | `8` | `2` to `20` | Controls number of inline product results requested/rendered. |
| `searchbar-minquery` | `2` | `1` to `5` | Minimum input length before inline search executes. |
| `searchbar-debounce` | `80` | `0` to `1000` | Debounce delay in milliseconds for inline search requests. |
| `searchbar-opendelay` | `0` | `0` to `1000` | Adds a delay (ms) before opening the inline results panel after results arrive. |
| `searchbar-maxheight` | `576` | `compact`, `default`, `tall`, or `200` to `1200` (px) | Caps inline results panel height before it scrolls internally. |
| `searchbar-viewall` | `auto` | `auto`, `always`, `never` | Controls footer “View All Results” visibility: `auto` shows when inline results hit the page size limit, `always` shows whenever there are results, `never` hides it. |

## Behavior Patterns

- Minimum query length defaults to `2` characters before inline search executes.
- Form submit navigates to `/search?q=<query>`.
- Escape closes open results and returns focus safely.
- Clicking outside closes open results.
- Product visibility is filtered to searchable catalog values.
- If inline modules fail, block falls back to submit-only search.

## Accessibility

- Uses semantic search form (`role="search"`).
- Search input uses combobox semantics (`role="combobox"`, `aria-expanded`, `aria-controls`).
- Includes ARIA live region announcements for result count/close actions.
- Preserves keyboard behavior (submit, escape close, focus handling).
- Honors `prefers-reduced-motion`.

## Troubleshooting

- No inline suggestions shown:
  - Ensure query length is at least configured `searchbar-minquery` (default `2`).
  - Verify discovery API connectivity.
  - If inline modules fail, fallback note appears and Enter submit still works.
- Too many API calls while typing:
  - Increase `searchbar-debounce`.
- Wrong results count:
  - Ensure `searchbar-results` is a number from `2` to `20`.

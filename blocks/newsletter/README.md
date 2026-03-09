# Newsletter Block

## Name of Block and Purpose

The **Newsletter** block is a configurable email-capture section for campaign and homepage use.

It supports:
- a default signup state (headline, subheadline, email field, CTA, supporting/legal text),
- a dedicated success state after submission,
- configurable visual styles for background, email field, and CTA behavior,
- section metadata controls for design and behavior without code changes.

## Benefits

- Fast to author in DA.live with a simple row-based structure.
- Flexible visual system: multiple background treatments and input styles.
- Conversion-focused CTA behavior: separate button styles for empty vs typed email state.
- Built-in success-state UX to confirm completion clearly.
- Progressive enhancement: validates email client-side and transitions to success state immediately.
- Accessibility baseline: semantic form, labels, focus-visible, and live status messaging.

## How to Author

Use a **single-column Newsletter table** with up to 8 rows.

| Newsletter |
|---|
| Our freshest gear. Straight to your inbox. |
| Be first to know about our newest products, limited-time offers, community events, and more. |
| Enter your email address |
| Sign Up |
| I agree to receive marketing communications. |
| Thank you. |
| Newsletter subscription is successful. |
| See Privacy Center for more information. |

| Row | Purpose | Required | Default Fallback |
|---|---|---|---|
| 1 | Heading (default state) | Yes | `Our freshest gear. Straight to your inbox.` |
| 2 | Subheading (default state) | Yes | `Be first to know about our newest products, limited-time offers, community events, and more.` |
| 3 | Email placeholder | Yes | `Enter your email address` |
| 4 | Button label | Yes | `Sign Up` |
| 5 | Supporting/legal text (default state) | Yes | `We only send relevant updates. You can unsubscribe any time.` |
| 6 | Success heading | No | `Thank you.` |
| 7 | Success subheading | No | `Newsletter subscription is successful.` |
| 8 | Success supporting/legal text | No | Falls back to Row 5 |

Notes:
- If row 4 contains old `Label|URL` format, only `Label` is used.
- If Row 8 is omitted, it falls back to Row 5.

## How to Section-Metadata

Place **Section Metadata immediately above** the Newsletter block.

| Section Metadata | Value |
|---|---|
| `newsletter-align` | `center` |
| `newsletter-background-color` | `#e6e6e6` |
| `newsletter-background-style` | `mesh-gradient` |
| `newsletter-background-image` | `https://example.com/bg.jpg` |
| `newsletter-email-style` | `glass` |
| `newsletter-button-style` | `soft` |
| `newsletter-button-width` | `medium` |
| `newsletter-form-gap` | `small` |
| `newsletter-density` | `comfortable` |
| `newsletter-button-color-empty` | `muted` |
| `newsletter-button-color-filled` | `dark` |
| `newsletter-full-width` | `true` |

### Section Metadata Reference

| Key | Default | Possible Values | Effect |
|---|---|---|---|
| `newsletter-align` | `center` | `left`, `center`, `right`, `start`, `end` | Controls horizontal placement of all inner content; `start` and `end` are direction-aware (RTL/LTR safe). |
| `newsletter-background-color` | `neutral` | `neutral`, `light`, `white`, `brand`, `dark`, `accent`, `#RGB`, `#RRGGBB` | Sets the base surface color behind the newsletter and drives readable text/border token behavior. |
| `newsletter-background-style` | `solid` | `none`, `solid`, `subtle-gradient`, `mesh-gradient`, `noise-texture`, `split-tone`, `radial-glow`, `duotone`, `top-glow`, `bottom-fade`, `diagonal-sweep`, `grid-fade`, `image-wash` | Adds optional visual treatment layers over the base color; use `none`/`solid` for minimal UI and richer presets for campaign styling. |
| `newsletter-background-image` | empty | Valid `http://` or `https://` image URL | Supplies artwork only when `newsletter-background-style=image-wash`; ignored for other styles. |
| `newsletter-email-style` | `outlined` | `outlined`, `filled`, `underlined`, `pill`, `sharp`, `minimal`, `inset`, `soft`, `glass`, `high-contrast` | Changes the input field treatment (border shape, fill, contrast, and depth) without changing content structure. |
| `newsletter-button-style` | `default` | `default`, `pill`, `sharp`, `soft`, `rounded-lg`, `outline`, `ghost`, `elevated` | Controls button shape and emphasis treatment while preserving the configured button colors. |
| `newsletter-button-width` | `medium` | `auto`, `narrow`, `medium`, `wide`, `fluid`, `fit-content` | Sets CTA width behavior from default auto sizing to fixed presets and adaptive patterns (`fluid` for broader fill, `fit-content` for compact intrinsic width). |
| `newsletter-form-gap` | `auto` | `auto`, `none`, `xxsmall`, `xsmall`, `small`, `medium`, `large`, `xlarge`, `xxlarge`, custom `8px` / `0.5rem` / `0.5em` | Controls only the horizontal gap between email input and button; can override density-derived spacing independently. |
| `newsletter-density` | `comfortable` | `xx-compact`, `x-compact`, `compact`, `comfortable`, `spacious`, `x-spacious`, `xx-spacious`, `adaptive`, `responsive` | Scales block rhythm (padding, control height, copy spacing, max width) as a coordinated spacing system. |
| `newsletter-button-color-empty` | `muted` | `muted`, `default`, `transparent`, `white`, `brand`, `accent`, `dark`, `outline-dark`, `success`, `warning`, `negative`, `info`, `inherit`, `#RGB`, `#RRGGBB` | Sets button colors before typing begins, useful for low-commitment or neutral default CTA state. |
| `newsletter-button-color-filled` | `dark` | `muted`, `default`, `transparent`, `white`, `brand`, `accent`, `dark`, `outline-dark`, `success`, `warning`, `negative`, `info`, `inherit`, `#RGB`, `#RRGGBB` | Sets button colors once email input has content, allowing a stronger or semantic conversion-ready state. |
| `newsletter-full-width` | `false` | `true`, `false`, `1`, `0`, `yes`, `no`, `on`, `off` | Expands the newsletter background band edge-to-edge while keeping content constrained by inner width tokens. |

## Submission Behavior

- The block validates email client-side and transitions to success state locally.
- No remote endpoint configuration is used by this block.

## Success State Behavior

- On success, the default signup UI is hidden.
- Success heading/subheading/supporting text are shown from Rows 6–8.

## Accessibility

- Uses semantic `<form>`, associated label, and `type="email"` validation.
- Uses status live regions for submission feedback.
- Provides visible keyboard focus states for input and button.

## Troubleshooting

- **Background image not visible**: ensure `newsletter-background-style=image-wash` and provide a valid URL in `newsletter-background-image`.
- **Button colors not switching**: verify `newsletter-button-color-empty` and `newsletter-button-color-filled` values.
- **Density not changing**: verify `newsletter-density` is one of `xx-compact`, `x-compact`, `compact`, `comfortable`, `spacious`, `x-spacious`, `xx-spacious`, `adaptive`, `responsive`.
- **Metadata key format**: use canonical `newsletter-*` section metadata keys.
- **Metadata not applied**: ensure Section Metadata table is directly above the block and republish.

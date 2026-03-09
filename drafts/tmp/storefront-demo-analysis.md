# Storefront Demo Analysis

## Task Summary
Build a firearms-accessory themed Adobe Commerce + Edge Delivery demo experience in `300blackout` by:
- Updating visual styling toward a Magpul/Nighthawk-inspired direction
- Adding an `age-gate` homepage-capable block (18+ verification)
- Adding a `social-media-carousel` block for Instagram posts and YouTube Shorts

## Requirements
- New age-gate block must block access until the user confirms they are 18+
- Age-gate must be deployable on homepage via block authoring
- New social media carousel block must support Instagram posts and YouTube Shorts
- Existing site styling should feel tactical, premium, and clean (dark metals, crisp typography, restrained accents)
- Must fit existing EDS block architecture and authoring patterns

## Assumptions
- Age verification persistence is client-side only (localStorage/session), not legal identity verification
- Instagram content is embedded via Instagram embed script when possible, with fallback links
- Authors provide social URLs in block rows

## Acceptance Criteria
1. `age-gate` block renders a full-screen modal overlay when no prior verification exists.
2. Clicking confirm stores verification in localStorage and dismisses the gate.
3. Clicking deny redirects to configured exit URL (or safe default if not provided).
4. `social-media-carousel` block renders mixed social cards and supports:
   - YouTube Shorts embed playback
   - Instagram post embeds or a fallback clickable post link
5. Carousel provides keyboard/button navigation and visual slide indicators.
6. Shared styling updates deliver a more tactical storefront visual language without breaking base layout.
7. `npm run lint` passes.

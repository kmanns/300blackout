# Store Locator Block

A Google Places (New) powered store finder for Adobe Commerce Storefront pages, with:
- Search + geolocation
- Service and "Open now" filtering
- Radius filtering (`0` = all distances)
- Split/list/map views
- Places enrichment (lite/rich)
- Interactive map with Advanced Markers
- Rich info windows (photos, reviews, hours)
- Analytics hooks (`adobeDataLayer`/`dataLayer`)

## Capabilities

### Core UX
- Address search with autocomplete
- "Use My Location" geolocation search
- Sort: `distance`, `name`, `recent`
- Filters: open-now + dynamic service chips from actual store data
- Radius dropdown from configurable presets
- View toggle: `list`, `map`, `split`
- Applied-filter chips + "Clear all"
- Results summary row

### Mapping
- Google Maps JS API + Places API (New)
- Advanced Markers for stores and user location
- Info window with:
  - name, rating, address, phone, distance
  - full weekly hours dropdown
  - supplementary tags
  - optional photos and reviews
- Desktop split map is sticky; mobile/tablet fallback to non-sticky map
- Cooperative map gestures on desktop/tablet, greedy on mobile

### Data + Enrichment
- DA.live block table as primary source
- Place ID enrichment via Places API (New)
- `lite` vs `rich` field profiles
- Optional eager enrich on load, or lazy hydrate on demand
- Session + memory cache with TTL
- Concurrency-limited enrichment
- Stale-photo cache bypass for rich-photo entries with empty photos

### Accessibility + Interaction
- Search form semantics (`role="search"`)
- `aria-live` results summary updates
- Focus-visible styles on key controls
- Keyboard-accessible controls/chips/buttons

### Analytics Events
Pushed (if present) to both `window.adobeDataLayer` and `window.dataLayer`:
- `search_submit`
- `use_my_location`
- `view_change`
- `sort_change`
- `filter_change`
- `radius_change`
- `filter_chip_remove`
- `clear_all_filters`
- `directions_click`

## DA.live Configuration (Full)

Use top config rows, then a data header row.

### Supported config keys

| Key | Aliases | Type | Allowed values / format | Default |
|---|---|---|---|---|
| Google Maps API Key | - | string | valid key | empty |
| Default View | - | enum | `split`, `list`, `map` | `split` |
| Autocomplete Provider | - | enum | `google` | `google` |
| Map Provider | - | enum | `google` | `google` |
| Data Source | - | enum | `block-content`, `json-file`, `api` | `block-content` |
| Search Radius | Search Radius Miles | number | `0+` (`0` = all) | `0` |
| Max Results | Maximum Results | number | positive integer | `10` |
| Auto Detect Location | - | boolean | `true` / `false` | `true` |
| Show Distance | - | boolean | `true` / `false` | `true` |
| Default Location | - | string | address text | `Portland, OR` |
| Services Filter | Available Service Filters | CSV | comma-separated service tokens | built-in defaults |
| Zoom Level | - | number | map zoom integer | `11` |
| Places Data Mode | - | enum | `lite`, `rich` | `lite` |
| Enrich On Load | - | boolean | `true` / `false` | `true` |
| Enrich Concurrency | - | number | `1..10` | `4` |
| Cache TTL Minutes | - | number | `1..1440` | `30` |
| Enable Reviews | - | boolean | `true` / `false` | `true` |
| Enable Photos | - | boolean | `true` / `false` | `true` |
| Experience Mode | - | enum | `fast`, `rich` | `fast` |
| Radius Presets | Search Radius Options | CSV | e.g. `0,5,10,25,50` | `0,5,10,25,50` |
| Units | - | enum | `miles`, `km` | `miles` |
| No Results Message | - | string | plain text | built-in message |
| Max Reviews Per Store | Max Reviews Per Sore (tolerated typo) | number | `1..20` | `5` |
| Map Style | - | enum | `default`, `muted`, `minimal` | `default` |
| Primary CTA Label | - | string | button text | `Get Directions` |
| Store Card Density | Card Density | enum | `comfortable`, `compact` | `comfortable` |

### Important interactions
- `Experience Mode = fast`
  - forces fast defaults (lite fields, photos/reviews disabled)
- `Experience Mode = rich`
  - sets rich fields and enables photos/reviews
- `Search Radius = 0`
  - means no radius cap ("All")
- `Radius Presets`
  - controls radius dropdown options

## DA.live Preferred Minimal Options

Use this in production when you want predictable behavior with low config overhead:

```text
store-locator
Google Maps API Key | <YOUR_KEY>
Default View | split
Experience Mode | fast
Search Radius | 0
Radius Presets | 0,5,10,25,50
Max Results | 10
Auto Detect Location | true
Show Distance | true
Units | miles
Map Style | default
Primary CTA Label | Get Directions
```

Why this baseline:
- Fast first render
- All-distance default for broad discovery
- Clear radius options
- Lower Places payload by default

## Advanced Presets

### Rich merchandising preset

```text
Experience Mode | rich
Places Data Mode | rich
Enable Photos | true
Enable Reviews | true
Enrich On Load | true
Enrich Concurrency | 3
Cache TTL Minutes | 30
Max Reviews Per Store | 5
```

Use when image/review depth matters more than initial payload.

### High-performance preset

```text
Experience Mode | fast
Places Data Mode | lite
Enable Photos | false
Enable Reviews | false
Enrich On Load | true
Enrich Concurrency | 4
Cache TTL Minutes | 60
Max Results | 10
```

Use when speed/API efficiency is priority.

## DA.live Data Schema

### Preferred schema (Place ID format)

Header row (required):

```text
Places ID | Featured | Custom Services | Display Order | Override Name
```

- `Places ID` (required): Google Place ID
- `Featured`: `true`/`false`
- `Custom Services`: comma-separated service labels
- `Display Order`: numeric ordering hint
- `Override Name`: replaces Google display name

### Legacy schema (supported)

```text
Name | Address | Coordinates | Phone | Hours | Services | Photo | Details
```

Used when Place IDs are not provided. Enrichment is limited in this mode.

## Section Metadata

`section-metadata` controls section width outside the block:

```text
section-metadata
width | wide
```

or

```text
section-metadata
width | full
```

Notes:
- `wide`/`full` affect the section wrapper width, not card internals.
- Verify on page with:
  - `document.querySelector('main > .section.store-locator-container')?.dataset.width`

## Setup (Google)

1. Enable `Maps JavaScript API` and `Places API (New)` in Google Cloud.
2. Configure API key restrictions to your domains.
3. Add local domain for development (`http://localhost:3000/*`).
4. Place key in DA.live `Google Maps API Key` row.

## Performance and API Best Practices

- Prefer `Experience Mode = fast` as default.
- Use `rich` only when photo/review UX is required.
- Keep `Max Results` moderate (`10-20`) for stable rendering.
- Keep `Enrich Concurrency` conservative (`3-5`) to avoid request bursts.
- Set `Cache TTL Minutes` to reduce repeated field fetches.
- Use `Radius Presets` with `0` included to keep "All" available.

## Troubleshooting

### Map and list appear vertically misaligned in split view
- Check computed map position/top in console.
- Expected in fixed build: sticky map with no unintended relative top offset.

### Some stores show no photo even though Google has photos
- Can be stale rich cache photo payload.
- Refresh path now bypasses cached rich entries with empty photo arrays.
- Optional quick reset:
  - `sessionStorage.removeItem('storeLocator.place.<PLACE_ID>.rich')`

### Radius appears capped when expecting all distances
- Ensure `Search Radius` is `0`.
- Ensure radius selector includes `0` via `Radius Presets`.
- Clear persisted prefs if needed:
  - `localStorage.removeItem('storeLocatorPrefs'); location.reload();`

### Section width metadata appears ignored
- Confirm `section-metadata` row exists in the same section.
- Confirm rendered section `data-width` is set.
- Ensure no custom wrapper CSS is re-constraining width.

## Recommended Validation Checklist

- View modes: `list`, `map`, `split`
- Radius `0` behavior returns cross-distance results
- Open-now and service filters combine correctly
- Desktop split sticky behavior + scroll interaction
- Mobile list/map usability
- Photos/reviews behavior in `fast` vs `rich`
- Lint status:
  - `npx eslint blocks/store-locator/store-locator.js`
  - `npx stylelint blocks/store-locator/store-locator.css`

## Changelog Notes (Current Implementation)

- Added applied filters row + clear-all action
- Added results summary row
- Added view toggle and responsive defaults
- Added analytics event pushes
- Added map sticky split behavior refinements
- Reintroduced card photos and added stale-photo cache bypass

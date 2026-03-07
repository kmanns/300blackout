# 300blackout DA Content Analysis

## Task
Prepare paste-ready DA content and execution guidance for a Magpul-themed Adobe Commerce EDS site.

## Requirements Captured
- DA content must be structured with block tables (not freeform custom HTML blocks).
- Output must be directly copy/pasteable into `da.live` documents.
- Publish sequence should follow fragment-first dependency order.
- Must align with existing custom blocks (`mag-hero`, `category-strip`, `product-strip`, `story-feed`) and Commerce drop-in blocks in this repo.
- Use `builditright-eds` migration docs as pattern for runbook/checklist format.

## Acceptance Criteria
- `drafts/da/` contains route-level paste-ready content files.
- Fragments provided for `/nav`, `/footer`, and `/customer/sidebar-fragment`.
- Core commerce and account routes included for storefront operability.
- `docs/migration/da-copy-paste-pack.md` provides path-to-file mapping.
- `docs/migration/da-publish-runbook.md` provides ordered preview/publish checklist.

## Notes
- No code behavior change required; this is content-source and execution guidance work.
- Content model follows author-friendly key/value rows where block config is required.

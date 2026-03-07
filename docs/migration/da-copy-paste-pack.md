# DA Copy/Paste Pack (300blackout)

This is the execution sheet for `da.live`.

Format:
- `DA path` -> copy from `local file`

## Batch 0: Fragments (publish first)

- `/nav` -> `drafts/da/nav.plain.html`
- `/footer` -> `drafts/da/footer.plain.html`
- `/customer/sidebar-fragment` -> `drafts/da/customer/sidebar-fragment.plain.html`

## Batch 1: Core Storefront

- `/index` -> `drafts/da/index-copy-ready.html`
- `/products` -> `drafts/da/products.html`
- `/products/default` -> `drafts/da/products/default.html`
- `/cart` -> `drafts/da/cart.html`
- `/checkout` -> `drafts/da/checkout.html`
- `/wishlist` -> `drafts/da/wishlist.html`
- `/order-status` -> `drafts/da/order-status.html`

## Batch 2: Customer Auth

- `/customer/login` -> `drafts/da/customer/login.html`
- `/customer/create-account` -> `drafts/da/customer/create-account.html`
- `/customer/forgotpassword` -> `drafts/da/customer/forgotpassword.html`

## Batch 3: Customer Account

- `/customer/account` -> `drafts/da/customer/account.html`
- `/customer/orders` -> `drafts/da/customer/orders.html`
- `/customer/order-details` -> `drafts/da/customer/order-details.html`
- `/customer/address` -> `drafts/da/customer/address.html`
- `/customer/returns` -> `drafts/da/customer/returns.html`

## DA Authoring Notes (Important)

- Do not author block markup as custom HTML wrappers.
- In DA, blocks should be table-based rows where the first row names the block (e.g., `Commerce Cart`, `Product List Page`, `Mag Hero`).
- For config blocks, each additional row is `key | value`.
- Keep each route as its own DA document path (for example `/customer/orders`, not `/customer/orders.html`).
- Runtime resolves fragments as `.plain.html` automatically after publish.

## Block Models Used in This Pack

- Custom themed blocks (from `blocks/`): `Mag Hero`, `Category Strip`, `Product Strip`, `Story Feed`
- Commerce drop-in blocks: `Product List Page`, `Product Details`, `Commerce Cart`, `Commerce Checkout`, `Commerce Login`, `Commerce Create Account`, `Commerce Forgot Password`, `Commerce Account Sidebar`, `Commerce Account Header`, `Commerce Orders List`, `Commerce Order Header`, `Commerce Shipping Status`, `Commerce Order Product List`, `Commerce Order Returns`, `Commerce Order Cost Summary`, `Commerce Addresses`, `Commerce Returns List`, `Commerce Wishlist`, `Commerce Search Order`

## Skill References Applied

- `Using Content Driven Development`: content-first DA authoring flow and validation order
- `Modeling Content`: table-first block structures and author-friendly key/value rows
- `Building Blocks`: block naming/config alignment with decorators in this repo
- `Using the Block Collection and Block Party`: reference pattern for block structure discipline
- `frontend-design`: themed homepage content composition (hero/category/product/story hierarchy)

## Quick Copy Commands

```bash
cat drafts/da/index-copy-ready.html
cat drafts/da/products.html
cat drafts/da/customer/account.html
```

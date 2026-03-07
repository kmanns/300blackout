# DA Publish Runbook (300blackout)

Use this while executing in `da.live`.

## Batch 0: Fragments

- [ ] `/nav` from `drafts/da/nav.plain.html`
- [ ] `/footer` from `drafts/da/footer.plain.html`
- [ ] `/customer/sidebar-fragment` from `drafts/da/customer/sidebar-fragment.plain.html`
- [ ] preview validated for all 3 fragments
- [ ] published all 3 fragments

## Batch 1: Core Storefront

- [ ] `/index` from `drafts/da/index-copy-ready.html`
- [ ] `/products` from `drafts/da/products.html`
- [ ] `/products/default` from `drafts/da/products/default.html`
- [ ] `/cart` from `drafts/da/cart.html`
- [ ] `/checkout` from `drafts/da/checkout.html`
- [ ] `/wishlist` from `drafts/da/wishlist.html`
- [ ] `/order-status` from `drafts/da/order-status.html`
- [ ] preview validated for batch
- [ ] batch published

## Batch 2: Customer Auth

- [ ] `/customer/login` from `drafts/da/customer/login.html`
- [ ] `/customer/create-account` from `drafts/da/customer/create-account.html`
- [ ] `/customer/forgotpassword` from `drafts/da/customer/forgotpassword.html`
- [ ] preview validated for batch
- [ ] batch published

## Batch 3: Customer Account

- [ ] `/customer/account` from `drafts/da/customer/account.html`
- [ ] `/customer/orders` from `drafts/da/customer/orders.html`
- [ ] `/customer/order-details` from `drafts/da/customer/order-details.html`
- [ ] `/customer/address` from `drafts/da/customer/address.html`
- [ ] `/customer/returns` from `drafts/da/customer/returns.html`
- [ ] preview validated for batch
- [ ] batch published

## Gate Checks Per Batch

- [ ] no obvious JS runtime errors on preview
- [ ] nav/footer render across pages
- [ ] custom homepage blocks render with styling (`mag-hero`, `category-strip`, `product-strip`, `story-feed`)
- [ ] commerce drop-in wrappers render on each route
- [ ] sidebar fragment resolves on customer routes

## Rollback

- [ ] restore previous DA revision for affected route
- [ ] republish affected route
- [ ] rerun gate checks for that route family

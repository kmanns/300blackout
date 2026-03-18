const CART_COMPAT_REPLACEMENTS = [
  [/gift_wrapping_for_items_incl_tax\s*\{[^}]*\}/g, 'gift_wrapping_for_items {\n        currency\n        value\n      }'],
  [/gift_wrapping_for_order_incl_tax\s*\{[^}]*\}/g, 'gift_wrapping_for_order {\n        currency\n        value\n      }'],
  [/printed_card_incl_tax\s*\{[^}]*\}/g, 'printed_card {\n        currency\n        value\n      }'],
  [/grand_total_excluding_tax\s*\{[^}]*\}/g, 'grand_total_excluding_tax: subtotal_excluding_tax {\n      currency\n      value\n    }'],
  [/\s*applied_coupons\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\n/g, '\n'],
  [/\s*available_gift_wrappings\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}\n/g, '\n'],
  [/\n[ \t]*gift_wrapping\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}/g, ''],
  [/\n[ \t]*gift_message\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}/g, ''],
  [/\n[ \t]*available_gift_wrapping\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}/g, ''],
  [/\s*not_available_message\n/g, '\n'],
  [/\s*custom_attributesV2\s*\([^)]*\)\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}\n/g, '\n'],
  [/\s*price_tiers\s*\{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}\n/g, '\n'],
  [/(^|\n)([ \t]*)quantity([ \t]*)(?=\n|$)/gm, '$1'],
  [/gift_wrapping_available/g, 'gift_wrapping_available: gift_message_available'],
  [/\s*gift_wrapping_price\s*\{[^}]*\}\n/g, '\n'],
  [/\n[ \t]*fragment GIFT_MESSAGE_FRAGMENT on GiftMessage \{[^{}]*\}/g, ''],
  [/\n[ \t]*fragment GIFT_WRAPPING_FRAGMENT on GiftWrapping \{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, ''],
  [/\n[ \t]*fragment AVAILABLE_GIFT_WRAPPING_FRAGMENT on GiftWrapping \{[^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*\}/g, ''],
];

function patchGraphQlQuery(query) {
  return CART_COMPAT_REPLACEMENTS.reduce(
    (patched, [pattern, replacement]) => patched.replace(pattern, replacement),
    query,
  );
}

export function patchCoreGraphQlRequest(requestInit) {
  if (!requestInit?.body || typeof requestInit.body !== 'string') {
    return requestInit;
  }

  let payload;
  try {
    payload = JSON.parse(requestInit.body);
  } catch {
    return requestInit;
  }

  if (!payload?.query) {
    return requestInit;
  }

  const isCartOrOrderQuery = [
    'Cart',
    'cart',
    'Order',
    'placeOrder',
    'gift_wrapping_for_items_incl_tax',
    'grand_total_excluding_tax',
  ].some((needle) => payload.query.includes(needle));

  if (!isCartOrOrderQuery) {
    return requestInit;
  }

  return {
    ...requestInit,
    body: JSON.stringify({
      ...payload,
      query: patchGraphQlQuery(payload.query),
    }),
  };
}

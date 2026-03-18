const CART_COMPAT_REPLACEMENTS = [
  [/gift_wrapping_for_items_incl_tax\s*\{[^}]*\}/g, 'gift_wrapping_for_items {\n        currency\n        value\n      }'],
  [/gift_wrapping_for_order_incl_tax\s*\{[^}]*\}/g, 'gift_wrapping_for_order {\n        currency\n        value\n      }'],
  [/printed_card_incl_tax\s*\{[^}]*\}/g, 'printed_card {\n        currency\n        value\n      }'],
  [/grand_total_excluding_tax\s*\{[^}]*\}/g, 'grand_total_excluding_tax: subtotal_excluding_tax {\n      currency\n      value\n    }'],
  [/\s*not_available_message\n/g, '\n'],
  [/\s*original_item_price\s*\{[^}]*\}\n/g, '\n'],
  [/\s*original_row_total\s*\{[^}]*\}\n/g, '\n'],
  [/\s*quantity\n/g, '\n'],
  [/gift_wrapping_available/g, 'gift_wrapping_available: gift_message_available'],
  [/\s*gift_wrapping_price\s*\{[^}]*\}\n/g, '\n'],
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

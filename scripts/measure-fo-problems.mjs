import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const read = (path) => readFileSync(join(root, path), 'utf8');

const compact = (value) => value.replace(/\s+/g, ' ').trim();

const extractConstTemplate = (source, name) => {
  const marker = `const ${name} = \``;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Missing ${name}`);
  const bodyStart = start + marker.length;
  const bodyEnd = source.indexOf('`;', bodyStart);
  if (bodyEnd === -1) throw new Error(`Missing template end for ${name}`);
  return source.slice(bodyStart, bodyEnd);
};

const countScalarLines = (fields) =>
  fields
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.endsWith('{') && line !== '}').length;

const countOperationBytes = (operation) => Buffer.byteLength(compact(operation), 'utf8');

const priceApi = read('apps/dadamjang-fo/src/features/price-evidence/api.ts');
const priceHooks = read('apps/dadamjang-fo/src/features/price-evidence/hooks.ts');
const priceCard = read('apps/dadamjang-fo/src/features/price-evidence/price-summary-card.tsx');
const cartHooks = read('apps/dadamjang-fo/src/features/cart/hooks.ts');
const cartScreen = read('apps/dadamjang-fo/app/(tabs)/cart.tsx');
const cartViewIos = read('apps/dadamjang-fo/src/features/cart/cart-view.ios.tsx');
const cartViewAndroid = read('apps/dadamjang-fo/src/features/cart/cart-view.android.tsx');

const summaryFields = extractConstTemplate(priceApi, 'productPriceSummaryFields');
const evidenceFields = extractConstTemplate(priceApi, 'productPriceEvidenceFields');
const fullPriceFields = `${summaryFields}\n${evidenceFields}`;

const summaryQuery = priceApi.match(/`query ProductPriceSummaries\([\s\S]*?`\s*,/)?.[0] ?? '';
const evidenceQuery = priceApi.match(/`query ProductPriceEvidence\([\s\S]*?`\s*,/)?.[0] ?? '';
const comparisonQuery = priceApi.match(/`query ComparisonPriceSummaries[\s\S]*?`\s*,/)?.[0] ?? '';

const eventTypes = [...`${priceCard}\n${cartScreen}`.matchAll(/eventType: '([^']+)'/g)].map((match) => match[1]);

const measurement = {
  priceEvidence: {
    summaryScalarFields: countScalarLines(summaryFields),
    evidenceScalarFields: countScalarLines(evidenceFields),
    combinedScalarFieldsBeforeSplit: countScalarLines(fullPriceFields),
    initialListFieldReductionPercent: Math.round(
      (1 - countScalarLines(summaryFields) / countScalarLines(fullPriceFields)) * 100,
    ),
    summaryQueryBytes: countOperationBytes(summaryQuery),
    evidenceQueryBytes: countOperationBytes(evidenceQuery),
    comparisonQueryBytes: countOperationBytes(comparisonQuery),
    evidenceLazyQueryEnabledByExpandedState:
      priceHooks.includes('enabled') && priceCard.includes('useProductPriceEvidence') && priceCard.includes('expanded'),
    trackedEvents: eventTypes.filter((eventType) => eventType.startsWith('PRICE_EVIDENCE')),
  },
  checkoutConsistency: {
    checkoutClickGuardCount: (cartScreen.match(/actions\.checkout\.isPending/g) ?? []).length,
    platformPendingCtaCount:
      (cartViewIos.match(/checkoutPending/g) ?? []).length + (cartViewAndroid.match(/checkoutPending/g) ?? []).length,
    idempotencyKeyGeneratedInMutation: cartHooks.includes('Crypto.randomUUID()'),
    successInvalidatesCartAndOrders:
      cartHooks.includes('cartQueryKeys.detail()') && cartHooks.includes('orderQueryKeys.list()'),
    failureRefetchesCart: cartHooks.includes('refetchQueries({ queryKey: cartQueryKeys.detail() })'),
    trackedEvents: eventTypes.filter((eventType) => eventType.startsWith('CHECKOUT')),
  },
};

console.log(JSON.stringify(measurement, null, 2));

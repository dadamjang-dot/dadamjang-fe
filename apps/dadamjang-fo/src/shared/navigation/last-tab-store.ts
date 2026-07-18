import { router } from 'expo-router';

export type Href = Parameters<typeof router.navigate>[0];

let _lastNonMyTab = 'index';
let _routeBeforeAuth: { name: string; params?: Record<string, string | undefined> } | null = null;
let _lastPublicUrl: string | null = null;

// ── Global last-public-url tracker ────────────
// Saves the most recent public URL the user visited.
// Used as fallback when the user came from a page outside tabs
// (e.g. product/10101011 → back to tabs → MY → auth → should go back to product)

export const setLastPublicUrl = (url: string): void => {
  _lastPublicUrl = url;
};

// ── Tab tracking ──────────────────────────────

export const setLastNonMyTab = (tab: string): void => {
  _lastNonMyTab = tab;
};

export const getLastNonMyRoute = (): Href => {
  if (_lastNonMyTab === 'index') return '/';
  return `/${_lastNonMyTab}` as Href;
};

// ── Route-before-auth tracking ────────────────

export const setRouteBeforeAuth = (
  route: { name: string; params?: Record<string, string | undefined> } | null,
): void => {
  _routeBeforeAuth = route;
};

export const clearRouteBeforeAuth = (): void => {
  _routeBeforeAuth = null;
};

const buildUrl = (route: { name: string; params?: Record<string, string | undefined> }): Href => {
  // Route groups — can't navigate to them directly
  if (route.name.startsWith('(') && route.name.endsWith(')')) {
    return getLastNonMyRoute();
  }

  if (route.name === 'index') return '/';

  // Parametric routes: product/[product-id] → /product/10101011
  const path = route.name.replace(/\[([^\]]+)\]/g, (_, key) => route.params?.[key] ?? `[${key}]`);
  return `/${path}` as Href;
};

/**
 * Returns the best navigation target after auth closes.
 * Priority:
 *  1. Route captured right before auth redirect (product detail, etc.)
 *  2. Last public URL the user visited (from global tracker)
 *  3. Last known non-My tab
 */
export const getAuthCloseTarget = (): Href => {
  // Priority 1: route captured right before auth redirect
  if (_routeBeforeAuth && !_routeBeforeAuth.name.startsWith('(')) {
    const target = buildUrl(_routeBeforeAuth);
    clearRouteBeforeAuth();
    return target;
  }
  clearRouteBeforeAuth();

  // Priority 2: last public URL from global tracker
  if (_lastPublicUrl) {
    const url = _lastPublicUrl as Href;
    _lastPublicUrl = null;
    return url;
  }

  // Priority 3: last non-My tab
  return getLastNonMyRoute();
};

// ── Suppress auth redirect after close ──────
// Prevents MY/WISH tab from immediately re-triggering auth redirect
// when the user closes the auth screen without logging in.

let _authCloseSuppress = false;

export const suppressAuthOnce = (): void => {
  _authCloseSuppress = true;
};

export const consumeSuppressAuth = (): boolean => {
  if (!_authCloseSuppress) return false;
  _authCloseSuppress = false;
  return true;
};

/** Returns the last non-My tab name (e.g. 'shop', 'index', 'style'). */
export const getLastNonMyTabName = (): string => _lastNonMyTab;

// Unit tests for last-tab-store.
// The store uses module-level mutable state.  jest.isolateModules
// gives us a fresh copy of the module before each test group.

type Href = string;

let mod: typeof import('../last-tab-store');

const freshLoad = (): void => {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mod = require('../last-tab-store');
  });
};

beforeAll(freshLoad);
afterEach(freshLoad);

// ──────────────────────────────────────────────
//  getLastNonMyRoute
// ──────────────────────────────────────────────

describe('getLastNonMyRoute', () => {
  it('returns "/" when last tab is "index"', () => {
    expect(mod.getLastNonMyRoute()).toBe('/');
  });

  it('returns "/shop" when last tab is set to "shop"', () => {
    mod.setLastNonMyTab('shop');
    expect(mod.getLastNonMyRoute()).toBe('/shop');
  });

  it('returns "/style" when last tab is set to "style"', () => {
    mod.setLastNonMyTab('style');
    expect(mod.getLastNonMyRoute()).toBe('/style');
  });
});

// ──────────────────────────────────────────────
//  setLastNonMyTab / getLastNonMyTabName
// ──────────────────────────────────────────────

describe('setLastNonMyTab / getLastNonMyTabName', () => {
  it('defaults to "index"', () => {
    expect(mod.getLastNonMyTabName()).toBe('index');
  });

  it('stores the last tab name', () => {
    mod.setLastNonMyTab('style');
    expect(mod.getLastNonMyTabName()).toBe('style');
  });

  it('updates on subsequent calls', () => {
    mod.setLastNonMyTab('shop');
    mod.setLastNonMyTab('style');
    expect(mod.getLastNonMyTabName()).toBe('style');
  });
});

// ──────────────────────────────────────────────
//  setRouteBeforeAuth / clearRouteBeforeAuth
// ──────────────────────────────────────────────

describe('setRouteBeforeAuth / clearRouteBeforeAuth', () => {
  it('getAuthCloseTarget returns last non-My tab when no route was captured', () => {
    mod.setLastNonMyTab('shop');
    expect(mod.getAuthCloseTarget()).toBe('/shop');
  });

  it('getAuthCloseTarget clears after first call', () => {
    mod.setLastNonMyTab('shop');
    mod.getAuthCloseTarget(); // consumes
    mod.setLastNonMyTab('style');
    expect(mod.getAuthCloseTarget()).toBe('/style');
  });
});

// ──────────────────────────────────────────────
//  getAuthCloseTarget — priority
// ──────────────────────────────────────────────

describe('getAuthCloseTarget priority', () => {
  it('Priority 1: returns captured route (not a route group)', () => {
    mod.setLastNonMyTab('shop');
    mod.setRouteBeforeAuth({ name: 'product/[product-id]', params: { 'product-id': '10101011' } });
    expect(mod.getAuthCloseTarget()).toBe('/product/10101011');
  });

  it('Priority 1: skips (tabs) route group, falls through', () => {
    mod.setLastNonMyTab('shop');
    mod.setRouteBeforeAuth({ name: '(tabs)' });
    expect(mod.getAuthCloseTarget()).toBe('/shop');
  });

  it('Priority 1: skips (protected) route group, falls through', () => {
    mod.setLastNonMyTab('style');
    mod.setRouteBeforeAuth({ name: '(protected)' });
    expect(mod.getAuthCloseTarget()).toBe('/style');
  });

  it('Priority 2: uses last public URL when no route was captured', () => {
    mod.setLastNonMyTab('shop');
    mod.setLastPublicUrl('/product/10101011');
    expect(mod.getAuthCloseTarget()).toBe('/product/10101011');
  });

  it('Priority 2: consumes last public URL after first call', () => {
    mod.setLastNonMyTab('shop');
    mod.setLastPublicUrl('/product/10101011');
    mod.getAuthCloseTarget(); // consumes
    expect(mod.getAuthCloseTarget()).toBe('/shop');
  });

  it('Priority 3: falls back to last non-My tab', () => {
    mod.setLastNonMyTab('style');
    expect(mod.getAuthCloseTarget()).toBe('/style');
  });
});

// ──────────────────────────────────────────────
//  buildUrl (tested indirectly via getAuthCloseTarget)
// ──────────────────────────────────────────────

describe('buildUrl (via getAuthCloseTarget)', () => {
  it('converts product/[product-id] with param', () => {
    mod.setRouteBeforeAuth({ name: 'product/[product-id]', params: { 'product-id': '42' } });
    expect(mod.getAuthCloseTarget()).toBe('/product/42');
  });

  it('converts style/[style-id] with param', () => {
    mod.setRouteBeforeAuth({ name: 'style/[style-id]', params: { 'style-id': '7' } });
    expect(mod.getAuthCloseTarget()).toBe('/style/7');
  });

  it('handles route with no params (keeps bracket as-is)', () => {
    mod.setRouteBeforeAuth({ name: 'product/[product-id]' });
    expect(mod.getAuthCloseTarget()).toBe('/product/[product-id]');
  });

  it('converts index route to /', () => {
    mod.setRouteBeforeAuth({ name: 'index' });
    expect(mod.getAuthCloseTarget()).toBe('/');
  });
});

// ──────────────────────────────────────────────
//  Suppress auth redirect
// ──────────────────────────────────────────────

describe('suppressAuthOnce / consumeSuppressAuth', () => {
  it('consumeSuppressAuth returns false when not suppressed', () => {
    expect(mod.consumeSuppressAuth()).toBe(false);
  });

  it('consumeSuppressAuth returns true after suppressAuthOnce', () => {
    mod.suppressAuthOnce();
    expect(mod.consumeSuppressAuth()).toBe(true);
  });

  it('consumeSuppressAuth consumes the flag', () => {
    mod.suppressAuthOnce();
    mod.consumeSuppressAuth();
    expect(mod.consumeSuppressAuth()).toBe(false);
  });
});

// ──────────────────────────────────────────────
//  Integration: full auth close flow
// ──────────────────────────────────────────────

describe('full auth close flow', () => {
  it('STYLE -> WISH -> Auth -> Close -> STYLE', () => {
    mod.setLastNonMyTab('style');
    mod.setRouteBeforeAuth(null);
    mod.suppressAuthOnce();
    expect(mod.consumeSuppressAuth()).toBe(true);
    expect(mod.getLastNonMyTabName()).toBe('style');
  });

  it('HOME -> WISH -> Auth -> Close -> HOME', () => {
    mod.setLastNonMyTab('index');
    mod.setRouteBeforeAuth(null);
    mod.suppressAuthOnce();
    expect(mod.consumeSuppressAuth()).toBe(true);
    expect(mod.getLastNonMyTabName()).toBe('index');
  });

  it('MY -> Auth -> Close -> last non-My tab (STYLE)', () => {
    mod.setLastNonMyTab('style');
    mod.setRouteBeforeAuth(null);
    mod.suppressAuthOnce();
    expect(mod.consumeSuppressAuth()).toBe(true);
    expect(mod.getLastNonMyTabName()).toBe('style');
  });

  it('product/10101011 -> (go back) -> MY -> Auth -> Close uses _lastPublicUrl after LOGIN', () => {
    mod.setLastPublicUrl('/product/10101011');
    mod.setLastNonMyTab('shop');
    expect(mod.getAuthCloseTarget()).toBe('/product/10101011');
  });
});

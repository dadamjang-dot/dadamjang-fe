import { recordCommerceEvent } from './api';

import type { CommerceEventInput } from './types';

export const trackCommerceEvent = (input: CommerceEventInput) => {
  void recordCommerceEvent(input).catch(() => undefined);
};

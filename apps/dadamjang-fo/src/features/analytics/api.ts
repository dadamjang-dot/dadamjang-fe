import { graphqlRequest } from '@dadamjang/graphql-client';

import type { CommerceEventInput } from './types';

export const recordCommerceEvent = async (input: CommerceEventInput) =>
  graphqlRequest(
    `mutation RecordActivity($input: RecordActivityEventInput!) {
      recordActivity(input: $input) { eventId }
    }`,
    { input },
  );

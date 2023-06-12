/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EntitlementConsumer } from '../../entitlements/entitlementsClient'
import { EntitlementConsumer as EntitlementConsumerGraphQL } from '../../gen/graphqlTypes'

export class EntitlementConsumerTransformer {
  public static toClient(
    graphql: EntitlementConsumerGraphQL,
  ): EntitlementConsumer {
    return { id: graphql.id, issuer: graphql.issuer }
  }

  public static toGraphQL(
    client: EntitlementConsumer,
  ): EntitlementConsumerGraphQL {
    return { id: client.id, issuer: client.issuer }
  }
}

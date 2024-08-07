/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Entitlement as EntitlementClient } from '../../entitlements/entitlementsClient'
import { Entitlement as EntitlementGraphQL } from '../../gen/graphqlTypes'

export class EntitlementTransformer {
  public static toClient(graphql: EntitlementGraphQL): EntitlementClient {
    return {
      name: graphql.name,
      description: graphql.description ?? undefined,
      value: graphql.value,
    }
  }
  public static toGraphQL(client: EntitlementClient): EntitlementGraphQL {
    return {
      name: client.name,
      description: client.description,
      value: client.value,
    }
  }
}

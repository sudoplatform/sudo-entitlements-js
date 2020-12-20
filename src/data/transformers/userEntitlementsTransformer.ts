import { UserEntitlements } from '../../entitlements/entitlementsClient'
import { UserEntitlements as UserEntitlementsGraphQL } from '../../gen/graphqlTypes'
import { EntitlementTransformer } from './entitlementTransformer'

export class UserEntitlementsTransformer {
  public static toClient(graphql: UserEntitlementsGraphQL): UserEntitlements {
    return {
      entitlementsSetName: graphql.entitlementsSetName,
      version: graphql.version,
      entitlements: graphql.entitlements.map((e) =>
        EntitlementTransformer.toClient(e),
      ),
    }
  }

  public static toGraphQL(client: UserEntitlements): UserEntitlementsGraphQL {
    return {
      entitlementsSetName: client.entitlementsSetName,
      version: client.version,
      entitlements: client.entitlements.map((e) =>
        EntitlementTransformer.toGraphQL(e),
      ),
    }
  }
}

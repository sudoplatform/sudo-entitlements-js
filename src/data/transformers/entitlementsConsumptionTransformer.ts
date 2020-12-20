import { EntitlementsConsumption } from '../../entitlements/entitlementsClient'
import { EntitlementsConsumption as EntitlementsConsumptionGraphQL } from '../../gen/graphqlTypes'
import { EntitlementConsumptionTransformer } from './entitlementConsumptionTransformer'
import { UserEntitlementsTransformer } from './userEntitlementsTransformer'

export class EntitlementsConsumptionTransformer {
  public static toClient(
    graphql: EntitlementsConsumptionGraphQL,
  ): EntitlementsConsumption {
    return {
      entitlements: UserEntitlementsTransformer.toClient(graphql.entitlements),
      consumption: graphql.consumption.map((c) =>
        EntitlementConsumptionTransformer.toClient(c),
      ),
    }
  }

  public static toGraphQL(
    client: EntitlementsConsumption,
  ): EntitlementsConsumptionGraphQL {
    return {
      entitlements: UserEntitlementsTransformer.toGraphQL(client.entitlements),
      consumption: client.consumption.map((c) =>
        EntitlementConsumptionTransformer.toGraphQL(c),
      ),
    }
  }
}

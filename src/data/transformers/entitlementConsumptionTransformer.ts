import { EntitlementConsumption } from '../../entitlements/entitlementsClient'
import { EntitlementConsumption as EntitlementConsumptionGraphQL } from '../../gen/graphqlTypes'
import { EntitlementConsumerTransformer } from './entitlementConsumerTransformer'

export class EntitlementConsumptionTransformer {
  public static toClient(
    graphql: EntitlementConsumptionGraphQL,
  ): EntitlementConsumption {
    return {
      name: graphql.name,
      value: graphql.value,
      consumer: graphql.consumer
        ? EntitlementConsumerTransformer.toClient(graphql.consumer)
        : undefined,
      consumed: graphql.consumed,
      available: graphql.available,
      firstConsumedAtEpochMs: graphql.firstConsumedAtEpochMs ?? undefined,
      lastConsumedAtEpochMs: graphql.lastConsumedAtEpochMs ?? undefined,
    }
  }

  public static toGraphQL(
    client: EntitlementConsumption,
  ): EntitlementConsumptionGraphQL {
    return {
      name: client.name,
      value: client.value,
      consumer: client.consumer
        ? EntitlementConsumerTransformer.toGraphQL(client.consumer)
        : undefined,
      consumed: client.consumed,
      available: client.available,
      firstConsumedAtEpochMs: client.firstConsumedAtEpochMs,
      lastConsumedAtEpochMs: client.lastConsumedAtEpochMs,
    }
  }
}

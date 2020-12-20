import {
  ApiClientManager,
  DefaultApiClientManager,
} from '@sudoplatform/sudo-api-client'
import * as SudoCommon from '@sudoplatform/sudo-common'
import { AppSyncError } from '@sudoplatform/sudo-common'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import AWSAppSyncClient from 'aws-appsync'
import { AmbiguousEntitlementsError } from '../errors/error'
import {
  EntitlementsConsumption,
  EntitlementsSet,
  GetEntitlementsConsumptionDocument,
  GetEntitlementsConsumptionQuery,
  GetEntitlementsDocument,
  GetEntitlementsQuery,
  RedeemEntitlementsDocument,
  RedeemEntitlementsMutation,
} from '../gen/graphqlTypes'

/**
 * AppSync wrapper to use to invoke Entitlements Service APIs.
 */
export class ApiClient {
  private readonly client: AWSAppSyncClient<NormalizedCacheObject>

  public constructor(apiClientManager?: ApiClientManager) {
    const clientManager =
      apiClientManager ?? DefaultApiClientManager.getInstance()

    this.client = clientManager.getClient({ disableOffline: true })
  }

  public async getEntitlements(): Promise<EntitlementsSet | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: any
    try {
      const result = await this.client.query<GetEntitlementsQuery>({
        query: GetEntitlementsDocument,
        variables: {},
        fetchPolicy: 'no-cache',
      })

      if (result.data) {
        return result.data.getEntitlements ?? null
      }
      error = result.errors?.[0]
    } catch (err) {
      error = err.graphQLErrors?.[0]
    }

    if (error) {
      throw this.mapGraphQLToClientError(error)
    }

    throw new SudoCommon.FatalError(
      'getEntitlements did not return any result or any error.',
    )
  }

  public async getEntitlementsConsumption(): Promise<EntitlementsConsumption> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: any
    try {
      const result = await this.client.query<GetEntitlementsConsumptionQuery>({
        query: GetEntitlementsConsumptionDocument,
        variables: {},
        fetchPolicy: 'no-cache',
      })

      if (result.data) {
        return result.data.getEntitlementsConsumption
      }
      error = result.errors?.[0]
    } catch (err) {
      error = err.graphQLErrors?.[0]
    }
    if (error) {
      throw this.mapGraphQLToClientError(error)
    }

    throw new SudoCommon.FatalError(
      'getEntitlementsConsumption did not return any result or any error.',
    )
  }

  public async redeemEntitlements(): Promise<EntitlementsSet> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: any
    try {
      const result = await this.client.mutate<RedeemEntitlementsMutation>({
        mutation: RedeemEntitlementsDocument,
        variables: {},
        fetchPolicy: 'no-cache',
      })

      if (result.data) {
        return result.data.redeemEntitlements ?? null
      }
      error = result.errors?.[0]
    } catch (err) {
      error = err.graphQLErrors?.[0]
    }
    if (error) {
      throw this.mapGraphQLToClientError(error)
    }

    throw new SudoCommon.FatalError(
      'redeemEntitlements did not return any result or any error.',
    )
  }

  private mapGraphQLToClientError(error: AppSyncError): Error {
    const prefix = 'sudoplatform.entitlements'
    switch (error.errorType) {
      case `${prefix}.AmbiguousEntitlementsError`:
        return new AmbiguousEntitlementsError()
      default:
        return SudoCommon.mapGraphQLToClientError(error)
    }
  }
}

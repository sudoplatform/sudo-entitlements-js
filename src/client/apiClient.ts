import {
  ApiClientManager,
  DefaultApiClientManager,
} from '@sudoplatform/sudo-api-client'
import {
  AppSyncError,
  FatalError,
  isAppSyncNetworkError,
  mapGraphQLToClientError,
  mapNetworkErrorToClientError,
} from '@sudoplatform/sudo-common'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import AWSAppSyncClient from 'aws-appsync'
import { ApolloError } from 'apollo-client'
import { AmbiguousEntitlementsError } from '../errors/error'
import {
  ConsumeBooleanEntitlementsDocument,
  ConsumeBooleanEntitlementsMutation,
  EntitlementsConsumption,
  EntitlementsSet,
  GetEntitlementsConsumptionDocument,
  GetEntitlementsConsumptionQuery,
  GetEntitlementsDocument,
  GetEntitlementsQuery,
  GetExternalIdDocument,
  GetExternalIdQuery,
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
    let error: AppSyncError
    try {
      const result = await this.client.query<GetEntitlementsQuery>({
        query: GetEntitlementsDocument,
        variables: {},
        fetchPolicy: 'no-cache',
      })

      if (result.data) {
        return result.data.getEntitlements ?? null
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      const appSyncError = err as AppSyncError
      if (isAppSyncNetworkError(appSyncError)) {
        throw mapNetworkErrorToClientError(appSyncError)
      }
      error = (err as ApolloError).graphQLErrors?.[0] ?? err
    }

    if (error) {
      throw this.mapGraphQLToClientError(error)
    }

    throw new FatalError(
      'getEntitlements did not return any result or any error.',
    )
  }

  public async getEntitlementsConsumption(): Promise<EntitlementsConsumption> {
    let error: AppSyncError
    try {
      const result = await this.client.query<GetEntitlementsConsumptionQuery>({
        query: GetEntitlementsConsumptionDocument,
        variables: {},
        fetchPolicy: 'no-cache',
      })

      if (result.data) {
        return result.data.getEntitlementsConsumption
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      const appSyncError = err as Error
      if (isAppSyncNetworkError(appSyncError)) {
        throw mapNetworkErrorToClientError(appSyncError)
      }
      error = (err as ApolloError).graphQLErrors?.[0] ?? err
    }
    if (error) {
      throw this.mapGraphQLToClientError(error)
    }

    throw new FatalError(
      'getEntitlementsConsumption did not return any result or any error.',
    )
  }

  public async getExternalId(): Promise<string> {
    let error: AppSyncError
    try {
      const result = await this.client.query<GetExternalIdQuery>({
        query: GetExternalIdDocument,
        variables: {},
        fetchPolicy: 'no-cache',
      })

      if (result.data) {
        return result.data.getExternalId
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      const appSyncError = err as AppSyncError
      if (isAppSyncNetworkError(appSyncError)) {
        throw mapNetworkErrorToClientError(appSyncError)
      }
      error = (err as ApolloError).graphQLErrors?.[0] ?? err
    }
    if (error) {
      throw this.mapGraphQLToClientError(error)
    }

    throw new FatalError(
      'getExternalId did not return any result or any error.',
    )
  }

  public async redeemEntitlements(): Promise<EntitlementsSet> {
    let error: AppSyncError
    try {
      const result = await this.client.mutate<RedeemEntitlementsMutation>({
        mutation: RedeemEntitlementsDocument,
        variables: {},
        fetchPolicy: 'no-cache',
      })

      if (result.data) {
        return result.data.redeemEntitlements
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      const appSyncError = err as AppSyncError
      if (isAppSyncNetworkError(appSyncError)) {
        throw mapNetworkErrorToClientError(appSyncError)
      }
      error = (err as ApolloError).graphQLErrors?.[0] ?? err
    }
    if (error) {
      throw this.mapGraphQLToClientError(error)
    }

    throw new FatalError(
      'redeemEntitlements did not return any result or any error.',
    )
  }

  public async consumeBooleanEntitlements(
    entitlementNames: string[],
  ): Promise<boolean> {
    let error: AppSyncError
    try {
      const result =
        await this.client.mutate<ConsumeBooleanEntitlementsMutation>({
          mutation: ConsumeBooleanEntitlementsDocument,
          variables: { entitlementNames },
          fetchPolicy: 'no-cache',
        })

      if (result.data) {
        return result.data.consumeBooleanEntitlements
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      const appSyncError = err as AppSyncError
      if (isAppSyncNetworkError(appSyncError)) {
        throw mapNetworkErrorToClientError(appSyncError)
      }
      error = (err as ApolloError).graphQLErrors?.[0] ?? err
    }
    if (error) {
      throw this.mapGraphQLToClientError(error)
    }

    throw new FatalError(
      'consumeBooleanEntitlements did not return any result or any error.',
    )
  }

  private mapGraphQLToClientError(error: AppSyncError): Error {
    const prefix = 'sudoplatform.entitlements'
    switch (error.errorType) {
      case `${prefix}.AmbiguousEntitlementsError`:
        return new AmbiguousEntitlementsError()
      default:
        return mapGraphQLToClientError(error)
    }
  }
}

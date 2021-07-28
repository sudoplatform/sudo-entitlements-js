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
      if (isAppSyncNetworkError(err)) {
        throw mapNetworkErrorToClientError(err)
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
      if (isAppSyncNetworkError(err)) {
        throw mapNetworkErrorToClientError(err)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: any
    try {
      const result = await this.client.query<GetExternalIdQuery>({
        query: GetExternalIdDocument,
        variables: {},
        fetchPolicy: 'no-cache',
      })

      if (result.data) {
        return result.data.getExternalId
      }
      error = result.errors?.[0]
    } catch (err) {
      if (isAppSyncNetworkError(err)) {
        throw mapNetworkErrorToClientError(err)
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
      if (isAppSyncNetworkError(err)) {
        throw mapNetworkErrorToClientError(err)
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

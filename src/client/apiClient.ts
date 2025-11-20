/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ApiClientManager,
  DefaultApiClientManager,
} from '@sudoplatform/sudo-api-client'
import {
  AppSyncError,
  FatalError,
  isGraphQLNetworkError,
  mapGraphQLToClientError,
  mapNetworkErrorToClientError,
} from '@sudoplatform/sudo-common'
import {
  AmbiguousEntitlementsError,
  EntitlementsSequenceNotFoundError,
  EntitlementsSetNotFoundError,
  NoBillingGroupError,
  NoExternalIdError,
} from '../errors/error'
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
import { GraphQLClient } from '@sudoplatform/sudo-user'

/**
 * AppSync wrapper to use to invoke Entitlements Service APIs.
 */
export class ApiClient {
  private readonly client: GraphQLClient

  public constructor(apiClientManager?: ApiClientManager) {
    const clientManager =
      apiClientManager ?? DefaultApiClientManager.getInstance()

    this.client = clientManager.getClient({})
  }

  public async getEntitlements(): Promise<EntitlementsSet | null> {
    let error: AppSyncError
    try {
      const result = await this.client.query<GetEntitlementsQuery>({
        query: GetEntitlementsDocument,
        variables: {},
      })

      if (result.data) {
        return result.data.getEntitlements ?? null
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      error = this.interpretError(err)
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
      })

      if (result.data) {
        return result.data.getEntitlementsConsumption
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      error = this.interpretError(err)
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
      })

      if (result.data) {
        return result.data.getExternalId
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      error = this.interpretError(err)
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
      })

      if (result.data) {
        return result.data.redeemEntitlements
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      error = this.interpretError(err)
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
        })

      if (result.data) {
        return result.data.consumeBooleanEntitlements
      }
      error = result.errors?.[0] as AppSyncError
    } catch (err) {
      error = this.interpretError(err)
    }
    if (error) {
      throw this.mapGraphQLToClientError(error)
    }

    throw new FatalError(
      'consumeBooleanEntitlements did not return any result or any error.',
    )
  }

  private interpretError(err: unknown): AppSyncError {
    let error: AppSyncError
    const appSyncError = err as AppSyncError
    if (isGraphQLNetworkError(appSyncError)) {
      throw mapNetworkErrorToClientError(appSyncError)
    }
    error = appSyncError
    const baseError = err as Error
    if (
      'graphQLErrors' in baseError &&
      Array.isArray(baseError.graphQLErrors) &&
      baseError.graphQLErrors.length > 0
    ) {
      error = baseError.graphQLErrors[0] as AppSyncError
    }
    return error
  }

  private mapGraphQLToClientError(error: AppSyncError): Error {
    const prefix = 'sudoplatform.entitlements'
    switch (error.errorType) {
      case `${prefix}.AmbiguousEntitlementsError`:
        return new AmbiguousEntitlementsError()
      case `${prefix}.EntitlementsSequenceNotFoundError`:
        return new EntitlementsSequenceNotFoundError()
      case `${prefix}.EntitlementsSetNotFoundError`:
        return new EntitlementsSetNotFoundError()
      case `${prefix}.NoBillingGroupError`:
        return new NoBillingGroupError()
      case `${prefix}.NoExternalIdError`:
        return new NoExternalIdError()
      default:
        return mapGraphQLToClientError(error)
    }
  }
}

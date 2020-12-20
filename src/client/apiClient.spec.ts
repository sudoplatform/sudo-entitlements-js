import { ApiClientManager } from '@sudoplatform/sudo-api-client'
import {
  InvalidTokenError,
  NoEntitlementsError,
  ServiceError,
} from '@sudoplatform/sudo-common'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import { NetworkStatus } from 'apollo-client'
import AWSAppSyncClient from 'aws-appsync'
import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { AmbiguousEntitlementsError } from '../errors/error'
import {
  EntitlementsConsumption,
  EntitlementsSet,
  GetEntitlementsConsumptionQuery,
  GetEntitlementsQuery,
  RedeemEntitlementsMutation,
} from '../gen/graphqlTypes'
import { ApiClient } from './apiClient'

describe('ApiClient test suite', () => {
  const mockApiClientManager = mock<ApiClientManager>()
  const mockAWSAppSyncClient = mock<AWSAppSyncClient<NormalizedCacheObject>>()

  let apiClient: ApiClient

  beforeEach(() => {
    reset(mockApiClientManager)
    reset(mockAWSAppSyncClient)

    when(mockApiClientManager.getClient(anything())).thenReturn(
      instance(mockAWSAppSyncClient),
    )

    apiClient = new ApiClient(instance(mockApiClientManager))
  })

  const now = Date.now()
  const entitlementsSet: EntitlementsSet = {
    createdAtEpochMs: now,
    updatedAtEpochMs: now,
    version: 1,
    name: 'jest',
    entitlements: [{ name: 'jest-1', value: 1 }],
  }

  const entitlementsConsumption: EntitlementsConsumption = {
    entitlements: {
      entitlementsSetName: entitlementsSet.name,
      version: 1.00001,
      entitlements: entitlementsSet.entitlements,
    },
    consumption: [
      {
        name: entitlementsSet.entitlements[0].name,
        value: entitlementsSet.entitlements[0].value,
        consumed: 1,
        available: entitlementsSet.entitlements[0].value - 1,
      },
    ],
  }

  describe('getEntitlements tests', () => {
    it('should return data if returned', async () => {
      when(
        mockAWSAppSyncClient.query<GetEntitlementsQuery>(anything()),
      ).thenResolve({
        data: { getEntitlements: entitlementsSet },
        loading: false,
        networkStatus: NetworkStatus.ready,
        stale: false,
      })

      await expect(apiClient.getEntitlements()).resolves.toEqual(
        entitlementsSet,
      )

      verify(mockAWSAppSyncClient.query(anything())).once()
    })

    it('should throw a FatalError if no data and no errors returned', async () => {
      when(mockAWSAppSyncClient.query(anything())).thenResolve({
        data: undefined,
        errors: undefined,
        loading: false,
        networkStatus: NetworkStatus.ready,
        stale: false,
      })

      await expect(
        apiClient.getEntitlements(),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockAWSAppSyncClient.query(anything())).once()
    })

    it.each`
      result
      ${undefined}
      ${null}
    `('should return null if $result returned', async ({ result }) => {
      when(
        mockAWSAppSyncClient.query<GetEntitlementsQuery>(anything()),
      ).thenResolve({
        data: { getEntitlements: result },
        loading: false,
        networkStatus: NetworkStatus.ready,
        stale: false,
      })

      await expect(apiClient.getEntitlements()).resolves.toEqual(null)

      verify(mockAWSAppSyncClient.query(anything())).once()
    })
    it.each`
      code                                  | error
      ${'sudoplatform.NoEntitlementsError'} | ${new NoEntitlementsError()}
      ${'sudoplatform.InvalidTokenError'}   | ${new InvalidTokenError()}
      ${'sudoplatform.ServiceError'}        | ${new ServiceError('graphql-error')}
    `('should map $code error', async ({ code, error }) => {
      when(mockAWSAppSyncClient.query(anything())).thenResolve({
        data: undefined,
        loading: false,
        networkStatus: NetworkStatus.ready,
        stale: false,
        errors: [
          {
            errorType: code,
            message: 'graphql-error',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ],
      })

      await expect(apiClient.getEntitlements()).rejects.toThrow(error)
    })
  })

  describe('getEntitlementsConsumption tests', () => {
    it('should return data if returned', async () => {
      when(
        mockAWSAppSyncClient.query<GetEntitlementsConsumptionQuery>(anything()),
      ).thenResolve({
        data: { getEntitlementsConsumption: entitlementsConsumption },
        loading: false,
        networkStatus: NetworkStatus.ready,
        stale: false,
      })

      await expect(apiClient.getEntitlementsConsumption()).resolves.toEqual(
        entitlementsConsumption,
      )

      verify(mockAWSAppSyncClient.query(anything())).once()
    })

    it('should throw a FatalError if no data and no errors returned', async () => {
      when(mockAWSAppSyncClient.query(anything())).thenResolve({
        data: undefined,
        errors: undefined,
        loading: false,
        networkStatus: NetworkStatus.ready,
        stale: false,
      })

      await expect(
        apiClient.getEntitlementsConsumption(),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockAWSAppSyncClient.query(anything())).once()
    })
    it.each`
      code                                  | error
      ${'sudoplatform.NoEntitlementsError'} | ${new NoEntitlementsError()}
      ${'sudoplatform.InvalidTokenError'}   | ${new InvalidTokenError()}
      ${'sudoplatform.ServiceError'}        | ${new ServiceError('graphql-error')}
    `('should map $code error', async ({ code, error }) => {
      when(mockAWSAppSyncClient.query(anything())).thenResolve({
        data: undefined,
        loading: false,
        networkStatus: NetworkStatus.ready,
        stale: false,
        errors: [
          {
            errorType: code,
            message: 'graphql-error',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ],
      })

      await expect(apiClient.getEntitlementsConsumption()).rejects.toThrow(
        error,
      )
    })
  })

  describe('redeemEntitlements tests', () => {
    it('should throw a FatalError if no data and no errors returned', async () => {
      when(
        mockAWSAppSyncClient.mutate<RedeemEntitlementsMutation>(anything()),
      ).thenResolve({})

      await expect(
        apiClient.redeemEntitlements(),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockAWSAppSyncClient.mutate(anything())).once()
    })

    it('should return data if returned', async () => {
      when(
        mockAWSAppSyncClient.mutate<RedeemEntitlementsMutation>(anything()),
      ).thenResolve({
        data: { redeemEntitlements: entitlementsSet },
      })

      await expect(apiClient.redeemEntitlements()).resolves.toEqual(
        entitlementsSet,
      )

      verify(mockAWSAppSyncClient.mutate(anything())).once()
    })

    it.each`
      result
      ${undefined}
      ${null}
    `('should return null if $result returned', async ({ result }) => {
      when(
        mockAWSAppSyncClient.mutate<RedeemEntitlementsMutation>(anything()),
      ).thenResolve({
        data: { redeemEntitlements: result },
      })

      await expect(apiClient.redeemEntitlements()).resolves.toEqual(null)

      verify(mockAWSAppSyncClient.mutate(anything())).once()
    })

    it.each`
      code                                                      | error
      ${'sudoplatform.entitlements.AmbiguousEntitlementsError'} | ${new AmbiguousEntitlementsError()}
      ${'sudoplatform.InvalidTokenError'}                       | ${new InvalidTokenError()}
      ${'sudoplatform.ServiceError'}                            | ${new ServiceError('graphql-error')}
    `('should map $code error', async ({ code, error }) => {
      when(
        mockAWSAppSyncClient.mutate<RedeemEntitlementsMutation>(anything()),
      ).thenResolve({
        errors: [
          {
            errorType: code,
            message: 'graphql-error',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ],
      })
      await expect(apiClient.redeemEntitlements()).rejects.toThrow(error)
    })
  })
})

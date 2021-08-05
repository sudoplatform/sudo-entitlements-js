import { ApiClientManager } from '@sudoplatform/sudo-api-client'
import {
  IllegalArgumentError,
  InsufficientEntitlementsError,
  InvalidTokenError,
  NoEntitlementsError,
  NotAuthorizedError,
  RequestFailedError,
  ServiceError,
} from '@sudoplatform/sudo-common'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import { NetworkStatus } from 'apollo-client'
import AWSAppSyncClient from 'aws-appsync'
import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { ApiClient } from '../../../src/client/apiClient'
import { AmbiguousEntitlementsError } from '../../../src/errors/error'
import {
  ConsumeBooleanEntitlementsMutation,
  EntitlementsConsumption,
  EntitlementsSet,
  GetEntitlementsConsumptionQuery,
  GetEntitlementsQuery,
  GetExternalIdQuery,
  RedeemEntitlementsMutation,
} from '../../../src/gen/graphqlTypes'

describe('ApiClient test suite', () => {
  const mockApiClientManager = mock<ApiClientManager>()
  const mockAWSAppSyncClient = mock<AWSAppSyncClient<NormalizedCacheObject>>()

  let apiClient: ApiClient

  const notAuthorizedError = new NotAuthorizedError()

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
        firstConsumedAtEpochMs: 1,
        lastConsumedAtEpochMs: 2,
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
    `('should map $code error when returned', async ({ code, error }) => {
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

    describe.each`
      code                                  | error
      ${'sudoplatform.NoEntitlementsError'} | ${new NoEntitlementsError()}
      ${'sudoplatform.InvalidTokenError'}   | ${new InvalidTokenError()}
      ${'sudoplatform.ServiceError'}        | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
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

      it('when error is thrown', async () => {
        when(mockAWSAppSyncClient.query(anything())).thenReject({
          message: 'error',
          name: 'error',
          graphQLErrors: [
            {
              name: 'GraphQLError',
              errorType: code,
              message: 'graphql-error',
            },
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        await expect(apiClient.getEntitlements()).rejects.toThrow(error)
      })
    })

    it.each`
      networkError           | clientError
      ${{ statusCode: 401 }} | ${notAuthorizedError}
      ${{ statusCode: 500 }} | ${'default'}
      ${{}}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(mockAWSAppSyncClient.query(anything())).thenReject({
          message: 'error',
          name: 'error',
          networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError.statusCode,
          )
        }

        await expect(apiClient.getEntitlements()).rejects.toThrow(clientError)
      },
    )
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

    describe.each`
      code                                  | error
      ${'sudoplatform.NoEntitlementsError'} | ${new NoEntitlementsError()}
      ${'sudoplatform.InvalidTokenError'}   | ${new InvalidTokenError()}
      ${'sudoplatform.ServiceError'}        | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
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

      it('when error is thrown', async () => {
        when(mockAWSAppSyncClient.query(anything())).thenReject({
          message: 'error',
          name: 'error',
          graphQLErrors: [
            {
              name: 'GraphQLError',
              errorType: code,
              message: 'graphql-error',
            },
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        await expect(apiClient.getEntitlementsConsumption()).rejects.toThrow(
          error,
        )
      })
    })

    it.each`
      networkError           | clientError
      ${{ statusCode: 401 }} | ${notAuthorizedError}
      ${{ statusCode: 500 }} | ${'default'}
      ${{}}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(mockAWSAppSyncClient.query(anything())).thenReject({
          message: 'error',
          name: 'error',
          networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError.statusCode,
          )
        }

        await expect(apiClient.getEntitlementsConsumption()).rejects.toThrow(
          clientError,
        )
      },
    )
  })

  describe('getExternalId tests', () => {
    it('should return data if returned', async () => {
      const externalId = 'external-id'
      when(
        mockAWSAppSyncClient.query<GetExternalIdQuery>(anything()),
      ).thenResolve({
        data: { getExternalId: externalId },
        loading: false,
        networkStatus: NetworkStatus.ready,
        stale: false,
      })

      await expect(apiClient.getExternalId()).resolves.toEqual(externalId)

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
        apiClient.getExternalId(),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockAWSAppSyncClient.query(anything())).once()
    })
    describe.each`
      code                                | error
      ${'sudoplatform.InvalidTokenError'} | ${new InvalidTokenError()}
      ${'sudoplatform.ServiceError'}      | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
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

        await expect(apiClient.getExternalId()).rejects.toThrow(error)
      })

      it('when error is thrown', async () => {
        when(mockAWSAppSyncClient.query(anything())).thenReject({
          message: 'error',
          name: 'error',
          graphQLErrors: [
            {
              name: 'GraphQLError',
              errorType: code,
              message: 'graphql-error',
            },
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        await expect(apiClient.getExternalId()).rejects.toThrow(error)
      })
    })

    it.each`
      networkError           | clientError
      ${{ statusCode: 401 }} | ${notAuthorizedError}
      ${{ statusCode: 500 }} | ${'default'}
      ${{}}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(mockAWSAppSyncClient.query(anything())).thenReject({
          message: 'error',
          name: 'error',
          networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError.statusCode,
          )
        }

        await expect(apiClient.getExternalId()).rejects.toThrow(clientError)
      },
    )
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

    describe.each`
      code                                                      | error
      ${'sudoplatform.entitlements.AmbiguousEntitlementsError'} | ${new AmbiguousEntitlementsError()}
      ${'sudoplatform.InvalidTokenError'}                       | ${new InvalidTokenError()}
      ${'sudoplatform.ServiceError'}                            | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
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

      it('when error is thrown', async () => {
        when(
          mockAWSAppSyncClient.mutate<RedeemEntitlementsMutation>(anything()),
        ).thenReject({
          message: 'error',
          name: 'error',
          graphQLErrors: [
            {
              name: 'GraphQLError',
              errorType: code,
              message: 'graphql-error',
            },
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        await expect(apiClient.redeemEntitlements()).rejects.toThrow(error)
      })
    })

    it.each`
      networkError           | clientError
      ${{ statusCode: 401 }} | ${notAuthorizedError}
      ${{ statusCode: 500 }} | ${'default'}
      ${{}}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(
          mockAWSAppSyncClient.mutate<RedeemEntitlementsMutation>(anything()),
        ).thenReject({
          message: 'error',
          name: 'error',
          networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError.statusCode,
          )
        }

        await expect(apiClient.redeemEntitlements()).rejects.toThrow(
          clientError,
        )
      },
    )
  })

  describe('consumeBooleanEntitlements tests', () => {
    const entitlementNames = ['some-boolean-entitlement']
    it('should throw a FatalError if no data and no errors returned', async () => {
      when(
        mockAWSAppSyncClient.mutate<ConsumeBooleanEntitlementsMutation>(
          anything(),
        ),
      ).thenResolve({})

      await expect(
        apiClient.consumeBooleanEntitlements(entitlementNames),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockAWSAppSyncClient.mutate(anything())).once()
    })

    it('should resolve if API returns', async () => {
      when(
        mockAWSAppSyncClient.mutate<ConsumeBooleanEntitlementsMutation>(
          anything(),
        ),
      ).thenResolve({
        data: { consumeBooleanEntitlements: true },
      })

      await expect(
        apiClient.consumeBooleanEntitlements(entitlementNames),
      ).resolves.toEqual(true)

      verify(mockAWSAppSyncClient.mutate(anything())).once()
    })

    describe.each`
      code                                            | error
      ${'sudoplatform.InsufficientEntitlementsError'} | ${new InsufficientEntitlementsError()}
      ${'sudoplatform.InvalidArgumentError'}          | ${new IllegalArgumentError()}
      ${'sudoplatform.ServiceError'}                  | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
        when(
          mockAWSAppSyncClient.mutate<ConsumeBooleanEntitlementsMutation>(
            anything(),
          ),
        ).thenResolve({
          errors: [
            {
              errorType: code,
              message: 'graphql-error',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          ],
        })
        await expect(
          apiClient.consumeBooleanEntitlements(entitlementNames),
        ).rejects.toThrow(error)
      })

      it('when error is thrown', async () => {
        when(
          mockAWSAppSyncClient.mutate<ConsumeBooleanEntitlementsMutation>(
            anything(),
          ),
        ).thenReject({
          message: 'error',
          name: 'error',
          graphQLErrors: [
            {
              name: 'GraphQLError',
              errorType: code,
              message: 'graphql-error',
            },
          ],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        await expect(
          apiClient.consumeBooleanEntitlements(entitlementNames),
        ).rejects.toThrow(error)
      })
    })

    it.each`
      networkError           | clientError
      ${{ statusCode: 401 }} | ${notAuthorizedError}
      ${{ statusCode: 500 }} | ${'default'}
      ${{}}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(
          mockAWSAppSyncClient.mutate<ConsumeBooleanEntitlementsMutation>(
            anything(),
          ),
        ).thenReject({
          message: 'error',
          name: 'error',
          networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError.statusCode,
          )
        }

        await expect(
          apiClient.consumeBooleanEntitlements(entitlementNames),
        ).rejects.toThrow(clientError)
      },
    )
  })
})

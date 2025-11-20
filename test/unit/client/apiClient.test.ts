/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

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
import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { ApiClient } from '../../../src/client/apiClient'
import {
  AmbiguousEntitlementsError,
  EntitlementsSequenceNotFoundError,
  EntitlementsSetNotFoundError,
  NoBillingGroupError,
  NoExternalIdError,
} from '../../../src/errors/error'
import {
  ConsumeBooleanEntitlementsMutation,
  EntitlementsConsumption,
  EntitlementsSet,
  GetEntitlementsConsumptionQuery,
  GetEntitlementsQuery,
  GetExternalIdQuery,
  RedeemEntitlementsMutation,
} from '../../../src/gen/graphqlTypes'
import { GraphQLClient } from '@sudoplatform/sudo-user'

describe('ApiClient test suite', () => {
  const mockApiClientManager = mock<ApiClientManager>()
  const mockGraphQLClient = mock<GraphQLClient>()

  let apiClient: ApiClient

  const notAuthorizedError = new NotAuthorizedError()

  beforeEach(() => {
    reset(mockApiClientManager)
    reset(mockGraphQLClient)

    when(mockApiClientManager.getClient(anything())).thenReturn(
      instance(mockGraphQLClient),
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
        mockGraphQLClient.query<GetEntitlementsQuery>(anything()),
      ).thenResolve({
        data: { getEntitlements: entitlementsSet },
      })

      await expect(apiClient.getEntitlements()).resolves.toEqual(
        entitlementsSet,
      )

      verify(mockGraphQLClient.query(anything())).once()
    })

    it('should throw a FatalError if no data and no errors returned', async () => {
      when(mockGraphQLClient.query(anything())).thenResolve({
        data: undefined,
        errors: undefined,
      })

      await expect(
        apiClient.getEntitlements(),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockGraphQLClient.query(anything())).once()
    })

    it.each`
      result
      ${undefined}
      ${null}
    `('should return null if $result returned', async ({ result }) => {
      when(
        mockGraphQLClient.query<GetEntitlementsQuery>(anything()),
      ).thenResolve({
        data: { getEntitlements: result },
      })

      await expect(apiClient.getEntitlements()).resolves.toEqual(null)

      verify(mockGraphQLClient.query(anything())).once()
    })

    it.each`
      code                                                             | error
      ${'sudoplatform.entitlements.AmbiguousEntitlementsError'}        | ${new AmbiguousEntitlementsError()}
      ${'sudoplatform.entitlements.EntitlementsSequenceNotFoundError'} | ${new EntitlementsSequenceNotFoundError()}
      ${'sudoplatform.entitlements.EntitlementsSetNotFoundError'}      | ${new EntitlementsSetNotFoundError()}
      ${'sudoplatform.entitlements.NoBillingGroupError'}               | ${new NoBillingGroupError()}
      ${'sudoplatform.entitlements.NoExternalIdError'}                 | ${new NoExternalIdError()}
      ${'sudoplatform.InvalidTokenError'}                              | ${new InvalidTokenError()}
      ${'sudoplatform.NoEntitlementsError'}                            | ${new NoEntitlementsError()}
      ${'sudoplatform.ServiceError'}                                   | ${new ServiceError('graphql-error')}
    `('should map $code error when returned', async ({ code, error }) => {
      when(mockGraphQLClient.query(anything())).thenResolve({
        data: undefined,
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
      code                                                             | error
      ${'sudoplatform.entitlements.AmbiguousEntitlementsError'}        | ${new AmbiguousEntitlementsError()}
      ${'sudoplatform.entitlements.EntitlementsSequenceNotFoundError'} | ${new EntitlementsSequenceNotFoundError()}
      ${'sudoplatform.entitlements.EntitlementsSetNotFoundError'}      | ${new EntitlementsSetNotFoundError()}
      ${'sudoplatform.entitlements.NoBillingGroupError'}               | ${new NoBillingGroupError()}
      ${'sudoplatform.entitlements.NoExternalIdError'}                 | ${new NoExternalIdError()}
      ${'sudoplatform.InvalidTokenError'}                              | ${new InvalidTokenError()}
      ${'sudoplatform.NoEntitlementsError'}                            | ${new NoEntitlementsError()}
      ${'sudoplatform.ServiceError'}                                   | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
        when(mockGraphQLClient.query(anything())).thenResolve({
          data: undefined,
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
        when(mockGraphQLClient.query(anything())).thenReject({
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
      networkError                          | clientError
      ${{ _response: { statusCode: 401 } }} | ${notAuthorizedError}
      ${{ _response: { statusCode: 500 } }} | ${'default'}
      ${{ _response: {} }}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(mockGraphQLClient.query(anything())).thenReject({
          message: 'error',
          name: 'error',
          originalError: networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError._response.statusCode,
          )
        }

        await expect(apiClient.getEntitlements()).rejects.toThrow(clientError)
      },
    )
  })

  describe('getEntitlementsConsumption tests', () => {
    it('should return data if returned', async () => {
      when(
        mockGraphQLClient.query<GetEntitlementsConsumptionQuery>(anything()),
      ).thenResolve({
        data: { getEntitlementsConsumption: entitlementsConsumption },
      })

      await expect(apiClient.getEntitlementsConsumption()).resolves.toEqual(
        entitlementsConsumption,
      )

      verify(mockGraphQLClient.query(anything())).once()
    })

    it('should throw a FatalError if no data and no errors returned', async () => {
      when(mockGraphQLClient.query(anything())).thenResolve({
        data: undefined,
        errors: undefined,
      })

      await expect(
        apiClient.getEntitlementsConsumption(),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockGraphQLClient.query(anything())).once()
    })

    describe.each`
      code                                                             | error
      ${'sudoplatform.entitlements.AmbiguousEntitlementsError'}        | ${new AmbiguousEntitlementsError()}
      ${'sudoplatform.entitlements.EntitlementsSequenceNotFoundError'} | ${new EntitlementsSequenceNotFoundError()}
      ${'sudoplatform.entitlements.EntitlementsSetNotFoundError'}      | ${new EntitlementsSetNotFoundError()}
      ${'sudoplatform.entitlements.NoBillingGroupError'}               | ${new NoBillingGroupError()}
      ${'sudoplatform.entitlements.NoExternalIdError'}                 | ${new NoExternalIdError()}
      ${'sudoplatform.InvalidTokenError'}                              | ${new InvalidTokenError()}
      ${'sudoplatform.NoEntitlementsError'}                            | ${new NoEntitlementsError()}
      ${'sudoplatform.ServiceError'}                                   | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
        when(mockGraphQLClient.query(anything())).thenResolve({
          data: undefined,
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
        when(mockGraphQLClient.query(anything())).thenReject({
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
      networkError                          | clientError
      ${{ _response: { statusCode: 401 } }} | ${notAuthorizedError}
      ${{ _response: { statusCode: 500 } }} | ${'default'}
      ${{ _response: {} }}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(mockGraphQLClient.query(anything())).thenReject({
          message: 'error',
          name: 'error',
          originalError: networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError._response.statusCode,
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
      when(mockGraphQLClient.query<GetExternalIdQuery>(anything())).thenResolve(
        {
          data: { getExternalId: externalId },
        },
      )

      await expect(apiClient.getExternalId()).resolves.toEqual(externalId)

      verify(mockGraphQLClient.query(anything())).once()
    })

    it('should throw a FatalError if no data and no errors returned', async () => {
      when(mockGraphQLClient.query(anything())).thenResolve({
        data: undefined,
        errors: undefined,
      })

      await expect(
        apiClient.getExternalId(),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockGraphQLClient.query(anything())).once()
    })
    describe.each`
      code                                                             | error
      ${'sudoplatform.entitlements.AmbiguousEntitlementsError'}        | ${new AmbiguousEntitlementsError()}
      ${'sudoplatform.entitlements.EntitlementsSequenceNotFoundError'} | ${new EntitlementsSequenceNotFoundError()}
      ${'sudoplatform.entitlements.EntitlementsSetNotFoundError'}      | ${new EntitlementsSetNotFoundError()}
      ${'sudoplatform.entitlements.NoBillingGroupError'}               | ${new NoBillingGroupError()}
      ${'sudoplatform.entitlements.NoExternalIdError'}                 | ${new NoExternalIdError()}
      ${'sudoplatform.InvalidTokenError'}                              | ${new InvalidTokenError()}
      ${'sudoplatform.NoEntitlementsError'}                            | ${new NoEntitlementsError()}
      ${'sudoplatform.ServiceError'}                                   | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
        when(mockGraphQLClient.query(anything())).thenResolve({
          data: undefined,
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
        when(mockGraphQLClient.query(anything())).thenReject({
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
      networkError                          | clientError
      ${{ _response: { statusCode: 401 } }} | ${notAuthorizedError}
      ${{ _response: { statusCode: 500 } }} | ${'default'}
      ${{ _response: {} }}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(mockGraphQLClient.query(anything())).thenReject({
          message: 'error',
          name: 'error',
          originalError: networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError._response.statusCode,
          )
        }

        await expect(apiClient.getExternalId()).rejects.toThrow(clientError)
      },
    )
  })

  describe('redeemEntitlements tests', () => {
    it('should throw a FatalError if no data and no errors returned', async () => {
      when(
        mockGraphQLClient.mutate<RedeemEntitlementsMutation>(anything()),
      ).thenResolve({
        data: null as any,
      })

      await expect(
        apiClient.redeemEntitlements(),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockGraphQLClient.mutate(anything())).once()
    })

    it('should return data if returned', async () => {
      when(
        mockGraphQLClient.mutate<RedeemEntitlementsMutation>(anything()),
      ).thenResolve({
        data: { redeemEntitlements: entitlementsSet },
      })

      await expect(apiClient.redeemEntitlements()).resolves.toEqual(
        entitlementsSet,
      )

      verify(mockGraphQLClient.mutate(anything())).once()
    })

    describe.each`
      code                                                             | error
      ${'sudoplatform.entitlements.AmbiguousEntitlementsError'}        | ${new AmbiguousEntitlementsError()}
      ${'sudoplatform.entitlements.EntitlementsSequenceNotFoundError'} | ${new EntitlementsSequenceNotFoundError()}
      ${'sudoplatform.entitlements.EntitlementsSetNotFoundError'}      | ${new EntitlementsSetNotFoundError()}
      ${'sudoplatform.entitlements.NoBillingGroupError'}               | ${new NoBillingGroupError()}
      ${'sudoplatform.entitlements.NoExternalIdError'}                 | ${new NoExternalIdError()}
      ${'sudoplatform.InvalidTokenError'}                              | ${new InvalidTokenError()}
      ${'sudoplatform.NoEntitlementsError'}                            | ${new NoEntitlementsError()}
      ${'sudoplatform.ServiceError'}                                   | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
        when(
          mockGraphQLClient.mutate<RedeemEntitlementsMutation>(anything()),
        ).thenResolve({
          data: null as any,
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
          mockGraphQLClient.mutate<RedeemEntitlementsMutation>(anything()),
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
      networkError                          | clientError
      ${{ _response: { statusCode: 401 } }} | ${notAuthorizedError}
      ${{ _response: { statusCode: 500 } }} | ${'default'}
      ${{ _response: {} }}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(
          mockGraphQLClient.mutate<RedeemEntitlementsMutation>(anything()),
        ).thenReject({
          message: 'error',
          name: 'error',
          originalError: networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError._response.statusCode,
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
        mockGraphQLClient.mutate<ConsumeBooleanEntitlementsMutation>(
          anything(),
        ),
      ).thenResolve({
        data: null as any,
      })

      await expect(
        apiClient.consumeBooleanEntitlements(entitlementNames),
      ).rejects.toThrowErrorMatchingSnapshot()

      verify(mockGraphQLClient.mutate(anything())).once()
    })

    it('should resolve if API returns', async () => {
      when(
        mockGraphQLClient.mutate<ConsumeBooleanEntitlementsMutation>(
          anything(),
        ),
      ).thenResolve({
        data: { consumeBooleanEntitlements: true },
      })

      await expect(
        apiClient.consumeBooleanEntitlements(entitlementNames),
      ).resolves.toEqual(true)

      verify(mockGraphQLClient.mutate(anything())).once()
    })

    describe.each`
      code                                            | error
      ${'sudoplatform.InsufficientEntitlementsError'} | ${new InsufficientEntitlementsError()}
      ${'sudoplatform.InvalidArgumentError'}          | ${new IllegalArgumentError()}
      ${'sudoplatform.ServiceError'}                  | ${new ServiceError('graphql-error')}
    `('should map $code error', ({ code, error }) => {
      it('when error is returned', async () => {
        when(
          mockGraphQLClient.mutate<ConsumeBooleanEntitlementsMutation>(
            anything(),
          ),
        ).thenResolve({
          data: null as any,
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
          mockGraphQLClient.mutate<ConsumeBooleanEntitlementsMutation>(
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
      networkError                          | clientError
      ${{ _response: { statusCode: 401 } }} | ${notAuthorizedError}
      ${{ _response: { statusCode: 500 } }} | ${'default'}
      ${{ _response: {} }}                  | ${'default'}
    `(
      'should map network error $networkError to $clientError',
      async ({ networkError, clientError }) => {
        when(
          mockGraphQLClient.mutate<ConsumeBooleanEntitlementsMutation>(
            anything(),
          ),
        ).thenReject({
          message: 'error',
          name: 'error',
          originalError: networkError,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)

        if (clientError === 'default') {
          clientError = new RequestFailedError(
            networkError,
            networkError._response.statusCode,
          )
        }

        await expect(
          apiClient.consumeBooleanEntitlements(entitlementNames),
        ).rejects.toThrow(clientError)
      },
    )
  })
})

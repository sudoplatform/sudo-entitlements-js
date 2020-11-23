import * as SudoCommon from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { instance, mock, reset, verify, when } from 'ts-mockito'
import { ApiClient } from '../client/apiClient'
import { EntitlementsSetTransformer } from '../data/transformers/entitlementsSetTransformer'
import {
  DefaultSudoEntitlementsClient,
  EntitlementsSet,
} from './entitlementsClient'

describe('DefaultSudoEntitlementsClient test suite', () => {
  const mockSudoUserClient = mock<SudoUserClient>()
  const mockApiClient = mock<ApiClient>()
  let sudoEntitlementsClient: DefaultSudoEntitlementsClient

  beforeEach(() => {
    reset(mockSudoUserClient)
    reset(mockApiClient)
    sudoEntitlementsClient = new DefaultSudoEntitlementsClient(
      instance(mockSudoUserClient),
      instance(mockApiClient),
    )
  })

  const now = new Date()
  const entitlementsSet: EntitlementsSet = {
    createdAt: now,
    updatedAt: now,
    version: 1,
    name: 'jest',
    entitlements: [{ name: 'jest-1', value: 1 }],
  }

  class TestError extends Error {
    public readonly graphQLErrors?: { errorType: string }[]
    public constructor(
      args: {
        graphQLErrorType?: string
        nonGraphQLError?: string
      } = {},
    ) {
      super(
        args.graphQLErrorType ? 'Custom GraphQL error' : args.nonGraphQLError,
      )
      if (args.graphQLErrorType) {
        this.graphQLErrors = [{ errorType: args.graphQLErrorType }]
      }
    }
  }

  describe('getEntitlements tests', () => {
    it('should throw NotSignedInError if not signed in', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(false)

      await expect(sudoEntitlementsClient.getEntitlements()).rejects.toThrow(
        SudoCommon.NotSignedInError,
      )

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.getEntitlements()).never()
    })

    it('should invoke ApiClient.getEntitlements successfully', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.getEntitlements()).thenResolve(
        EntitlementsSetTransformer.toGraphQL(entitlementsSet),
      )

      await expect(sudoEntitlementsClient.getEntitlements()).resolves.toEqual(
        entitlementsSet,
      )

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.getEntitlements()).once()
    })

    it.each`
      result
      ${undefined}
      ${null}
    `('should return undefined if result is $result', async ({ result }) => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.getEntitlements()).thenResolve(result)

      await expect(
        sudoEntitlementsClient.getEntitlements(),
      ).resolves.toBeUndefined()

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.getEntitlements()).once()
    })

    it('should map a platform GraphQL error', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.getEntitlements()).thenReject(
        new TestError({ graphQLErrorType: 'sudoplatform.test.SomeError' }),
      )

      await expect(
        sudoEntitlementsClient.getEntitlements(),
      ).rejects.toThrowError(/sudoplatform.test.SomeError/)

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.getEntitlements()).once()
    })

    it('should not map a non platform GraphQL error', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.getEntitlements()).thenReject(
        new TestError({ graphQLErrorType: 'some.non.sudoplatform.Error' }),
      )

      await expect(
        sudoEntitlementsClient.getEntitlements(),
      ).rejects.toThrowError(/Custom GraphQL error/)

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.getEntitlements()).once()
    })

    it('should pass through a non GraphQL error', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.getEntitlements()).thenReject(
        new TestError({ nonGraphQLError: 'Other error' }),
      )

      await expect(
        sudoEntitlementsClient.getEntitlements(),
      ).rejects.toThrowError(/Other error/)

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.getEntitlements()).once()
    })
  })

  describe('redeemEntitlements tests', () => {
    it('should throw NotSignedInError if not signed in', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(false)

      await expect(sudoEntitlementsClient.redeemEntitlements()).rejects.toThrow(
        SudoCommon.NotSignedInError,
      )

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.redeemEntitlements()).never()
    })

    it('should invoke ApiClient.redeemEntitlements successfully', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.redeemEntitlements()).thenResolve(
        EntitlementsSetTransformer.toGraphQL(entitlementsSet),
      )

      await expect(
        sudoEntitlementsClient.redeemEntitlements(),
      ).resolves.toEqual(entitlementsSet)

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.redeemEntitlements()).once()
    })

    it('should map a platform GraphQL error', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.redeemEntitlements()).thenReject(
        new TestError({ graphQLErrorType: 'sudoplatform.test.SomeError' }),
      )

      await expect(
        sudoEntitlementsClient.redeemEntitlements(),
      ).rejects.toThrowError(/sudoplatform.test.SomeError/)

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.redeemEntitlements()).once()
    })

    it('should not map a non platform GraphQL error', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.redeemEntitlements()).thenReject(
        new TestError({ graphQLErrorType: 'some.non.sudoplatform.Error' }),
      )

      await expect(
        sudoEntitlementsClient.redeemEntitlements(),
      ).rejects.toThrowError(/Custom GraphQL error/)

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.redeemEntitlements()).once()
    })

    it('should pass through a non GraphQL error', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.redeemEntitlements()).thenReject(
        new TestError({ nonGraphQLError: 'Other error' }),
      )

      await expect(
        sudoEntitlementsClient.redeemEntitlements(),
      ).rejects.toThrowError(/Other error/)

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.redeemEntitlements()).once()
    })
  })
})

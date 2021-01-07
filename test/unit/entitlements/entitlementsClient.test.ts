import * as SudoCommon from '@sudoplatform/sudo-common'
import { IllegalArgumentError } from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { instance, mock, reset, verify, when } from 'ts-mockito'
import { ApiClient } from '../../../src/client/apiClient'
import { EntitlementsConsumptionTransformer } from '../../../src/data/transformers/entitlementsConsumptionTransformer'
import { EntitlementsSetTransformer } from '../../../src/data/transformers/entitlementsSetTransformer'
import {
  DefaultSudoEntitlementsClient,
  EntitlementsConsumption,
  EntitlementsSet,
  splitUserEntitlementsVersion,
} from '../../../src/entitlements/entitlementsClient'

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

  const entitlementsConsumption: EntitlementsConsumption = {
    entitlements: {
      entitlementsSetName: entitlementsSet.name,
      version: 1.00001,
      entitlements: entitlementsSet.entitlements,
    },
    consumption: [
      {
        ...entitlementsSet.entitlements[0],
        consumed: 1,
        available: entitlementsSet.entitlements[0].value - 1,
      },
    ],
  }

  describe('splitUserEntitlementsVersion tests', () => {
    it.each`
      version    | expected
      ${2.00001} | ${[2, 1]}
      ${1}       | ${[1, 0]}
      ${0}       | ${[0, 0]}
      ${2.0001}  | ${[2, 10]}
      ${20.001}  | ${[20, 100]}
    `(
      'should return $expected for $version',
      ({
        version,
        expected,
      }: {
        version: number
        expected: [number, number]
      }) => {
        expect(splitUserEntitlementsVersion(version)).toEqual(expected)
      },
    )

    it.each`
      version      | message
      ${-1}        | ${/negative/}
      ${1.0000001} | ${/precise/}
    `(
      'should throw IllegalArgumentError for $version',
      ({ version, message }) => {
        let thrown: Error | undefined
        try {
          splitUserEntitlementsVersion(version)
        } catch (err) {
          thrown = err
        }
        expect(thrown).toBeInstanceOf(IllegalArgumentError)
        expect(thrown).toMatchObject({
          name: 'IllegalArgumentError',
          message,
        })
      },
    )
  })

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
  })

  describe('getEntitlementsConsumption tests', () => {
    it('should throw NotSignedInError if not signed in', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(false)

      await expect(
        sudoEntitlementsClient.getEntitlementsConsumption(),
      ).rejects.toThrow(SudoCommon.NotSignedInError)

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.getEntitlementsConsumption()).never()
    })

    it('should invoke ApiClient.getEntitlementsConsumption successfully', async () => {
      when(mockSudoUserClient.isSignedIn()).thenResolve(true)
      when(mockApiClient.getEntitlementsConsumption()).thenResolve(
        EntitlementsConsumptionTransformer.toGraphQL(entitlementsConsumption),
      )

      await expect(
        sudoEntitlementsClient.getEntitlementsConsumption(),
      ).resolves.toEqual(entitlementsConsumption)

      verify(mockSudoUserClient.isSignedIn()).once()
      verify(mockApiClient.getEntitlementsConsumption()).once()
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
  })
})

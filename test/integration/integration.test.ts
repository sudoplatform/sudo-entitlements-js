import { DefaultApiClientManager } from '@sudoplatform/sudo-api-client'
import {
  InvalidTokenError,
  NoEntitlementsError,
} from '@sudoplatform/sudo-common'
import { DefaultConfigurationManager } from '@sudoplatform/sudo-common/lib/configurationManager/defaultConfigurationManager'
import {
  DefaultSudoUserClient,
  SudoUserClient,
  TESTAuthenticationProvider,
} from '@sudoplatform/sudo-user'
import fs from 'fs'
import {
  DefaultSudoEntitlementsClient,
  EntitlementsSet,
  SudoEntitlementsClient,
} from '../../src'
import {
  describeDefaultEntitlementsSetForTestUsersTests,
  describeIntegrationTestEntitlementsSetTests,
  describeNoDefaultEntitlementsSetForTestUsersTests,
  describeUserAttributeAdminTests,
} from './describe'
import { updateUserCustomClaims } from './updateUserCustomClaims'
require('isomorphic-fetch')
global.crypto = require('isomorphic-webcrypto')

describe('sudo-entitlements API integration tests', () => {
  jest.setTimeout(30000)

  let sudoEntitlements: SudoEntitlementsClient
  let sudoUser: SudoUserClient
  let userPoolId: string
  let beforeAllComplete = false
  let beforeEachComplete = false
  let testAuthenticationProvider: TESTAuthenticationProvider

  beforeAll(async () => {
    const sudoPlatformConfigPath =
      process.env.SUDO_PLATFORM_CONFIG ||
      `${__dirname}/../../config/sudoplatformconfig.json`
    const registerKeyPath =
      process.env.REGISTER_KEY ||
      `${__dirname}/../../config/register_key.private`
    const registerKeyIdPath =
      process.env.REGISTER_KEY_ID || `${__dirname}/../../config/register_key.id`

    expect(sudoPlatformConfigPath).toMatch(/.+/)
    expect(registerKeyPath).toMatch(/.+/)
    expect(registerKeyIdPath).toMatch(/.+/)

    const registerKey = fs.readFileSync(registerKeyPath).toString()
    const registerKeyId = fs.readFileSync(registerKeyIdPath).toString().trim()
    const sudoPlatformConfig = fs
      .readFileSync(sudoPlatformConfigPath)
      .toString()
    expect(registerKey).toMatch(/.+/)
    expect(registerKeyId).toMatch(/.+/)

    testAuthenticationProvider = new TESTAuthenticationProvider(
      'sudo-entitlements-js-test',
      registerKey,
      registerKeyId,
    )

    const configurationManager = DefaultConfigurationManager.getInstance()
    configurationManager.setConfig(sudoPlatformConfig)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const identityServiceConfig: any =
      configurationManager.getConfigSet('identityService')
    expect(identityServiceConfig?.poolId).toBeTruthy()
    if (!identityServiceConfig?.poolId) {
      fail('identityServiceConfig.poolId unexpectedly falsy')
    }
    userPoolId = identityServiceConfig.poolId
    sudoUser = new DefaultSudoUserClient()
    DefaultApiClientManager.getInstance().setAuthClient(sudoUser)

    sudoEntitlements = new DefaultSudoEntitlementsClient(sudoUser)
    beforeAllComplete = true
  })

  beforeEach(async () => {
    expect({ beforeAllComplete }).toEqual({ beforeAllComplete: true })

    await sudoUser.registerWithAuthenticationProvider(
      testAuthenticationProvider,
    )
    await sudoUser.signInWithKey()
    beforeEachComplete = true
  })

  afterEach(() => {
    beforeEachComplete = false
    sudoUser?.reset()
  })

  afterAll(() => {
    beforeAllComplete = false
  })

  // Failures in beforeAll do not stop tests executing
  function expectBeforesComplete(): void {
    expect({ beforeAllComplete, beforeEachComplete }).toEqual({
      beforeAllComplete: true,
      beforeEachComplete: true,
    })
  }

  function checkIntegrationTestEntitlementsSet(
    entitlementsSet: EntitlementsSet,
  ) {
    expect(entitlementsSet.name).toEqual('integration-test')
    expect(entitlementsSet.createdAt.getTime()).toBeGreaterThan(0)
    expect(entitlementsSet.updatedAt.getTime()).toBeGreaterThan(0)
    expect(entitlementsSet.entitlements).not.toHaveLength(0)
    entitlementsSet.entitlements.forEach((e) => {
      expect(e.name).not.toHaveLength(0)
    })
  }

  describe('getEntitlements tests', () => {
    describeDefaultEntitlementsSetForTestUsersTests(
      'Default entitlements set for test users tests',
      () => {
        it('should return null for raw test user', async () => {
          expectBeforesComplete()

          await expect(
            sudoEntitlements.getEntitlements(),
          ).resolves.toBeUndefined()
        })
      },
    )

    describeNoDefaultEntitlementsSetForTestUsersTests(
      'No default entitlements set for test users tests',
      () => {
        it('should throw NoEntitlementsError for raw test user', async () => {
          expectBeforesComplete()

          await expect(
            sudoEntitlements.getEntitlements(),
          ).resolves.toBeUndefined()
        })

        describeIntegrationTestEntitlementsSetTests(
          'Tests needing integration-test entitlements set',
          () => {
            describeUserAttributeAdminTests(
              'Tests requiring user attribute admin authority',
              () => {
                it('should get integration-test entitlements set for redeemed user', async () => {
                  await updateUserCustomClaims(userPoolId, sudoUser, {
                    ent: {
                      externalId: sudoUser.getUserName(),
                      claims: { 'custom:entitlementsSet': 'integration-test' },
                    },
                  })

                  const redeemed = await sudoEntitlements.redeemEntitlements()
                  checkIntegrationTestEntitlementsSet(redeemed)
                  const gotten = await sudoEntitlements.getEntitlements()
                  expect(gotten).toEqual(redeemed)
                })
              },
            )
          },
        )
      },
    )

    describe('getEntitlementsConsumption tests', () => {
      describeDefaultEntitlementsSetForTestUsersTests(
        'Default entitlements set for test users tests',
        () => {
          it('should throw NoEntitlementsError for raw test user', async () => {
            expectBeforesComplete()

            await expect(
              sudoEntitlements.getEntitlementsConsumption(),
            ).rejects.toThrowError(new NoEntitlementsError())
          })
        },
      )

      describeNoDefaultEntitlementsSetForTestUsersTests(
        'No default entitlements set for test users tests',
        () => {
          it('should throw NoEntitlementsError for raw test user', async () => {
            expectBeforesComplete()

            await expect(
              sudoEntitlements.getEntitlementsConsumption(),
            ).rejects.toThrowError(new NoEntitlementsError())
          })
        },
      )

      describeIntegrationTestEntitlementsSetTests(
        'Tests needing integration-test entitlements set',
        () => {
          describeUserAttributeAdminTests(
            'Tests requiring user attribute admin authority',
            () => {
              it('should get entitlements consumption for redeemed user', async () => {
                await updateUserCustomClaims(userPoolId, sudoUser, {
                  ent: {
                    externalId: sudoUser.getUserName(),
                    claims: { 'custom:entitlementsSet': 'integration-test' },
                  },
                })

                const redeemed = await sudoEntitlements.redeemEntitlements()
                checkIntegrationTestEntitlementsSet(redeemed)
                const consumption =
                  await sudoEntitlements.getEntitlementsConsumption()
                expect(consumption.entitlements.entitlementsSetName).toEqual(
                  redeemed.name,
                )
                expect(consumption.entitlements.entitlements).toEqual(
                  redeemed.entitlements,
                )
                expect(consumption.entitlements.version).toEqual(
                  redeemed.version,
                )
                expect(consumption.consumption).toHaveLength(0)
              })
            },
          )
        },
      )
    })

    describe('redeemEntitlements tests', () => {
      describeDefaultEntitlementsSetForTestUsersTests(
        'Default entitlements set for test users tests',
        () => {
          it('should succeed for raw test user', async () => {
            expectBeforesComplete()

            await expect(
              sudoEntitlements.redeemEntitlements(),
            ).resolves.toBeDefined()
          })
        },
      )

      describeNoDefaultEntitlementsSetForTestUsersTests(
        'No default entitlements set for test users tests',
        () => {
          it('should throw InvalidTokenError for raw test user', async () => {
            expectBeforesComplete()

            await expect(
              sudoEntitlements.redeemEntitlements(),
            ).rejects.toThrowError(new InvalidTokenError())
          })
        },
      )

      describeIntegrationTestEntitlementsSetTests(
        'Tests needing integration-test entitlements set',
        () => {
          describeUserAttributeAdminTests(
            'Tests requiring user attribute admin authority',
            () => {
              it('should redeem to integration-test entitlements set', async () => {
                await updateUserCustomClaims(userPoolId, sudoUser, {
                  ent: {
                    externalId: sudoUser.getUserName(),
                    claims: { 'custom:entitlementsSet': 'integration-test' },
                  },
                })

                const redeemed = await sudoEntitlements.redeemEntitlements()
                checkIntegrationTestEntitlementsSet(redeemed)
              })
            },
          )
        },
      )

      describeUserAttributeAdminTests(
        'Tests requiring user attribute admin authority',
        () => {
          it('should throw InvalidTokenError if no entitlements set can be found', async () => {
            expectBeforesComplete()

            await updateUserCustomClaims(userPoolId, sudoUser, {
              ent: {
                externalId: sudoUser.getUserName(),
                claims: {
                  'custom:entitlementsSet': 'no-such-entitlements-set',
                },
              },
            })

            await expect(
              sudoEntitlements.redeemEntitlements(),
            ).rejects.toThrowError(new InvalidTokenError())
          })
        },
      )
    })
  })
})

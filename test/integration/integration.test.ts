/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultApiClientManager } from '@sudoplatform/sudo-api-client'
import {
  IllegalArgumentError,
  NoEntitlementsError,
  NotAuthorizedError,
} from '@sudoplatform/sudo-common'
import { DefaultConfigurationManager } from '@sudoplatform/sudo-common'
import {
  DefaultSudoUserClient,
  TESTAuthenticationProvider,
} from '@sudoplatform/sudo-user'
import { internal } from '@sudoplatform/sudo-user'
import {
  DefaultSudoEntitlementsAdminClient,
  SudoEntitlementsAdminClient,
} from '@sudoplatform/sudo-entitlements-admin'
import fs from 'fs'
import {
  DefaultSudoEntitlementsClient,
  EntitlementsSet,
  SudoEntitlementsClient,
} from '../../src'
import { v4 } from 'uuid'
import waitForExpect from 'wait-for-expect'

import {
  defaultEntitlementsSetForNonTestUsers,
  describeDefaultEntitlementsSetForTestUsersTests,
  describeIntegrationTestEntitlementsSetTests,
  describeNoDefaultEntitlementsSetForTestUsersTests,
  describeUserAttributeAdminTests,
} from './describe'

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('isomorphic-fetch')

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
global.crypto = require('crypto').webcrypto

if (typeof btoa === 'undefined') {
  global.btoa = function (b) {
    return Buffer.from(b, 'binary').toString('base64')
  }
}

if (typeof atob === 'undefined') {
  global.atob = function (a) {
    return Buffer.from(a, 'base64').toString('binary')
  }
}

class TestSudoUserClient extends DefaultSudoUserClient {
  public overrideLatestAuthToken?: string

  public constructor(options?: internal.SudoUserOptions) {
    super(options)
  }

  public async getLatestAuthToken(): Promise<string> {
    return this.overrideLatestAuthToken ?? super.getLatestAuthToken()
  }

  public async reset() {
    await super.reset()
    this.overrideLatestAuthToken = undefined
  }
}

describe('sudo-entitlements API integration tests', () => {
  jest.setTimeout(30000)
  waitForExpect.defaults.interval = 250
  waitForExpect.defaults.timeout = 10000

  let sudoEntitlements: SudoEntitlementsClient
  let sudoEntitlementsAdmin: SudoEntitlementsAdminClient
  let sudoUser: TestSudoUserClient
  let beforeAllComplete = false
  let beforeEachComplete = false
  let testAuthenticationProvider: TESTAuthenticationProvider
  let expectRedeemOnUserRegistration: boolean

  beforeAll(() => {
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
    DefaultConfigurationManager.getInstance().setConfig(
      sudoPlatformConfig.trim(),
    )

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

    const entitlementsServiceConfig: any = configurationManager.getConfigSet(
      'entitlementsService',
    )

    expectRedeemOnUserRegistration =
      (entitlementsServiceConfig.redeemOnUserRegistration &&
        defaultEntitlementsSetForNonTestUsers) ??
      false

    sudoUser = new TestSudoUserClient()
    DefaultApiClientManager.getInstance().setAuthClient(sudoUser)
    sudoEntitlements = new DefaultSudoEntitlementsClient(sudoUser)

    let adminApiKey = process.env.ADMIN_API_KEY?.trim()
    const adminApiKeyPath = '${__dirname}/../../config/api.key'
    if (!adminApiKey && fs.existsSync(adminApiKeyPath)) {
      adminApiKey = fs.readFileSync(adminApiKeyPath).toString()?.trim()
      console.log('Read admin api key', { adminApiKeyPath, adminApiKey })
    }
    if (!adminApiKey) {
      adminApiKey = 'IAM'
    }

    sudoEntitlementsAdmin = new DefaultSudoEntitlementsAdminClient(adminApiKey)

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

  afterEach(async () => {
    beforeEachComplete = false
    await sudoUser?.reset()
  })

  afterAll(() => {
    beforeAllComplete = false
  })

  // Failures in beforeAll do not stop tests executing
  function expectSetupComplete(): void {
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

  describe('getExternalId tests', () => {
    describeUserAttributeAdminTests(
      'Tests requiring user attribute admin authority',
      () => {
        it('should return correct external ID before redemption', async () => {
          const userName = await sudoUser.getUserName()

          await expect(sudoEntitlements.getExternalId()).resolves.toEqual(
            userName,
          )
        })

        describeIntegrationTestEntitlementsSetTests(
          'Tests needing integration-test entitlements set',
          () => {
            it('should return correct external ID after redemption', async () => {
              const userName = await sudoUser.getUserName()
              expect(userName).toBeDefined()
              if (!userName) {
                fail('userName unexpectedly falsy')
              }
              await sudoEntitlementsAdmin.applyEntitlementsSetToUser(
                userName,
                'integration-test',
              )

              await sudoEntitlements.redeemEntitlements()

              await expect(sudoEntitlements.getExternalId()).resolves.toEqual(
                userName,
              )
            })
          },
        )

        describeDefaultEntitlementsSetForTestUsersTests(
          'Default entitlements set for test users tests',
          () => {
            it('should return correct external ID after redemption', async () => {
              const userName = await sudoUser.getUserName()
              await sudoEntitlements.redeemEntitlements()

              await expect(sudoEntitlements.getExternalId()).resolves.toEqual(
                userName,
              )
            })
          },
        )
      },
    )
  })

  describe('getEntitlements tests', () => {
    describe('Common tests', () => {
      it('should throw NotAuthorizedError when not authenticated', async () => {
        expectSetupComplete()

        sudoUser.overrideLatestAuthToken = ''

        await expect(sudoEntitlements.getEntitlements()).rejects.toThrow(
          new NotAuthorizedError(),
        )
      })
    })

    describeDefaultEntitlementsSetForTestUsersTests(
      'Default entitlements set for test users tests',
      () => {
        it('should return null for raw test user if auto-redeem not enabled', async () => {
          expectSetupComplete()

          if (expectRedeemOnUserRegistration) {
            await waitForExpect(() =>
              expect(sudoEntitlements.getEntitlements()).resolves.toBeTruthy(),
            )
          } else {
            await expect(
              sudoEntitlements.getEntitlements(),
            ).resolves.toBeUndefined()
          }
        })
      },
    )

    describeNoDefaultEntitlementsSetForTestUsersTests(
      'No default entitlements set for test users tests',
      () => {
        it('should return undefined for raw test user if no auto-redeem', async () => {
          expectSetupComplete()

          if (expectRedeemOnUserRegistration) {
            await waitForExpect(() =>
              expect(sudoEntitlements.getEntitlements()).resolves.toBeTruthy(),
            )
          } else {
            await expect(
              sudoEntitlements.getEntitlements(),
            ).resolves.toBeUndefined()
          }
        })

        describeIntegrationTestEntitlementsSetTests(
          'Tests needing integration-test entitlements set',
          () => {
            describeUserAttributeAdminTests(
              'Tests requiring user attribute admin authority',
              () => {
                it('should get integration-test entitlements set for redeemed user', async () => {
                  expectSetupComplete()
                  const userName = await sudoUser.getUserName()
                  expect(userName).toBeDefined()
                  if (!userName) {
                    fail('userName unexpectedly falsy')
                  }
                  await sudoEntitlementsAdmin.applyEntitlementsSetToUser(
                    userName,
                    'integration-test',
                  )
                  const redeemed = await sudoEntitlements.redeemEntitlements()
                  checkIntegrationTestEntitlementsSet(redeemed)
                  const gotten = await sudoEntitlements.getEntitlements()
                  expect(gotten).toEqual({
                    ...redeemed,
                    // Get may result in a lazy update so updatedAt may differ
                    updatedAt: gotten?.updatedAt ?? redeemed.updatedAt,
                  })
                })
              },
            )
          },
        )
      },
    )
  })

  describe('getEntitlementsConsumption tests', () => {
    describe('Common tests', () => {
      it('should throw NotAuthorizedError when not authenticated', async () => {
        expectSetupComplete()

        sudoUser.overrideLatestAuthToken = ''

        await expect(
          sudoEntitlements.getEntitlementsConsumption(),
        ).rejects.toThrow(new NotAuthorizedError())
      })
    })

    describeDefaultEntitlementsSetForTestUsersTests(
      'Default entitlements set for test users tests',
      () => {
        it('should throw NoEntitlementsError for raw test user if auto-redeem not enabled', async () => {
          expectSetupComplete()

          if (expectRedeemOnUserRegistration) {
            await waitForExpect(() =>
              expect(
                sudoEntitlements.getEntitlementsConsumption(),
              ).resolves.toBeTruthy(),
            )
          } else {
            await expect(
              sudoEntitlements.getEntitlementsConsumption(),
            ).rejects.toThrowError(new NoEntitlementsError())
          }
        })
      },
    )

    describeNoDefaultEntitlementsSetForTestUsersTests(
      'No default entitlements set for test users tests',
      () => {
        it('should throw NoEntitlementsError for raw test user if no auto-redeem', async () => {
          expectSetupComplete()

          if (expectRedeemOnUserRegistration) {
            await waitForExpect(() =>
              expect(
                sudoEntitlements.getEntitlementsConsumption(),
              ).resolves.toBeTruthy(),
            )
          } else {
            await expect(
              sudoEntitlements.getEntitlementsConsumption(),
            ).rejects.toThrowError(new NoEntitlementsError())
          }
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
              expectSetupComplete()
              const userName = await sudoUser.getUserName()
              expect(userName).toBeDefined()
              if (!userName) {
                fail('userName unexpectedly falsy')
              }
              await sudoEntitlementsAdmin.applyEntitlementsSetToUser(
                userName,
                'integration-test',
              )

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
              expect(consumption.entitlements.version).toEqual(redeemed.version)
              expect(consumption.consumption).toHaveLength(0)
            })
          },
        )
      },
    )
  })

  describe('redeemEntitlements tests', () => {
    describe('Common tests', () => {
      it('should throw NotAuthorizedError when not authenticated', async () => {
        expectSetupComplete()

        sudoUser.overrideLatestAuthToken = ''

        await expect(sudoEntitlements.redeemEntitlements()).rejects.toThrow(
          new NotAuthorizedError(),
        )
      })
    })

    describeDefaultEntitlementsSetForTestUsersTests(
      'Default entitlements set for test users tests',
      () => {
        it('should succeed for raw test user', async () => {
          expectSetupComplete()

          await expect(
            sudoEntitlements.redeemEntitlements(),
          ).resolves.toBeDefined()
        })
      },
    )

    describeNoDefaultEntitlementsSetForTestUsersTests(
      'No default entitlements set for test users tests',
      () => {
        it('should throw NoEntitlementsError for raw test user if no auto-redeem', async () => {
          expectSetupComplete()

          if (expectRedeemOnUserRegistration) {
            await waitForExpect(() =>
              expect(
                sudoEntitlements.redeemEntitlements(),
              ).resolves.toBeTruthy(),
            )
          } else {
            await expect(
              sudoEntitlements.redeemEntitlements(),
            ).rejects.toThrowError(new NoEntitlementsError())
          }
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
              expectSetupComplete()

              const userName = await sudoUser.getUserName()
              expect(userName).toBeDefined()
              if (!userName) {
                fail('userName unexpectedly falsy')
              }
              await sudoEntitlementsAdmin.applyEntitlementsSetToUser(
                userName,
                'integration-test',
              )

              const redeemed = await sudoEntitlements.redeemEntitlements()
              checkIntegrationTestEntitlementsSet(redeemed)
            })
          },
        )
      },
    )
  })

  describe('consumeBooleanEntitlements tests', () => {
    describe('Common tests', () => {
      it('should throw NotAuthorizedError when not authenticated', async () => {
        expectSetupComplete()

        sudoUser.overrideLatestAuthToken = ''

        await expect(
          sudoEntitlements.consumeBooleanEntitlements([]),
        ).rejects.toThrow(new NotAuthorizedError())
      })

      it('should throw IllegalArgumentError for an invalid entitlement name', async () => {
        expectSetupComplete()

        const invalidEntitlementName = v4()
        await expect(
          sudoEntitlements.consumeBooleanEntitlements([invalidEntitlementName]),
        ).rejects.toEqual(new IllegalArgumentError())
      })
    })

    describeUserAttributeAdminTests(
      'Tests requiring user attribute admin authority',
      () => {
        describeIntegrationTestEntitlementsSetTests(
          'Tests needing integration-test entitlements set',
          () => {
            it('should permit consumption of boolean entitlement', async () => {
              expectSetupComplete()

              const userName = await sudoUser.getUserName()
              expect(userName).toBeDefined()
              if (!userName) {
                fail('userName unexpectedly falsy')
              }
              await sudoEntitlementsAdmin.applyEntitlementsSetToUser(
                userName,
                'integration-test',
              )

              await sudoEntitlements.redeemEntitlements()

              let consumed = await sudoEntitlements.getEntitlementsConsumption()
              expect(consumed.consumption).toHaveLength(0)

              await sudoEntitlements.consumeBooleanEntitlements([
                'sudoplatform.test.testEntitlement-2',
              ])

              consumed = await sudoEntitlements.getEntitlementsConsumption()
              expect(consumed.consumption).toHaveLength(1)
              expect(consumed.consumption[0]).toMatchObject({
                name: 'sudoplatform.test.testEntitlement-2',
                available: 0,
                value: 1,
                consumed: 1,
              })
            })
          },
        )
      },
    )
  })

  describe('Large entitlement value tests', () => {
    describeIntegrationTestEntitlementsSetTests(
      'Tests needing integration-test entitlements set',
      () => {
        it('should reflect large entitlements on redemption and consumption query', async () => {
          expectSetupComplete()

          const userName = await sudoUser.getUserName()
          expect(userName).toBeDefined()
          if (!userName) {
            fail('userName unexpectedly falsy')
          }
          const entitlement = {
            name: 'sudoplatform.test.testEntitlement-1',
            description: '',
            value: 2 ** 52 - 1,
          }
          await sudoEntitlementsAdmin.applyEntitlementsToUser(userName, [
            entitlement,
          ])

          const redeemed = await sudoEntitlements.redeemEntitlements()
          expect(redeemed.entitlements).toEqual([entitlement])

          const consumption =
            await sudoEntitlements.getEntitlementsConsumption()
          expect(consumption.entitlements.entitlements).toEqual([entitlement])
        })
      },
    )
  })
})

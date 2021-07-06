import { DefaultApiClientManager } from '@sudoplatform/sudo-api-client'
import { DefaultConfigurationManager } from '@sudoplatform/sudo-common/lib/configurationManager/defaultConfigurationManager'
import {
  DefaultSudoUserClient,
  SudoUserClient,
  TESTAuthenticationProvider,
} from '@sudoplatform/sudo-user'
import fs from 'fs'
import {
  DefaultSudoEntitlementsClient,
  SudoEntitlementsClient,
} from '../../src'
import * as _ from 'lodash'

require('isomorphic-fetch')
global.crypto = require('isomorphic-webcrypto')

/*
 * All tests requiring bad configuration are implemented in this single file
 * since it's not possible for us to reset the constructed AWSAppSyncClient
 * as it has a private global variable that records offline storage prefixes
 * forever. This makes it impossible to reset configuration and reconstruct
 * the client since any offline storage prefix used by the consuming SDK will
 * be forever recorded as "in use" resulting in failed construction of the
 * AWSAppSyncClient.
 */

describe('Bad config sudo-entitlements API integration tests', () => {
  jest.setTimeout(30000)

  let sudoEntitlements: SudoEntitlementsClient
  let sudoUser: SudoUserClient
  let beforeAllComplete = false
  let beforeEachComplete = false
  let testAuthenticationProvider: TESTAuthenticationProvider
  let config
  let configBadApiUrl

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

    /*
     * Set up some bad config to generate network errors. After experimentation, changing
     * the scheme to http seems like the most reliable way to get a fast failing
     * operation.
     */

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config = JSON.parse(sudoPlatformConfig)
    configBadApiUrl = _.clone(config)
    configBadApiUrl.apiService.apiUrl = config.apiService.apiUrl.replace(
      'https://',
      'http://',
    )

    testAuthenticationProvider = new TESTAuthenticationProvider(
      'sudo-entitlements-js-test',
      registerKey,
      registerKeyId,
    )

    const configurationManager = DefaultConfigurationManager.getInstance()
    configurationManager.setConfig(JSON.stringify(configBadApiUrl))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const identityServiceConfig: any =
      configurationManager.getConfigSet('identityService')
    expect(identityServiceConfig?.poolId).toBeTruthy()
    if (!identityServiceConfig?.poolId) {
      fail('identityServiceConfig.poolId unexpectedly falsy')
    }
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

  afterEach(async () => {
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

  describe('getEntitlements tests', () => {
    it('should throw RequestFailedError when connection fails', async () => {
      expectBeforesComplete()
      await expect(
        sudoEntitlements.getEntitlements(),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        '"API request failed. cause: Error: Network error: Unexpected token < in JSON at position 0, statusCode: undefined"',
      )
    })
  })

  describe('getEntitlementsConsumption tests', () => {
    it('should throw RequestFailedError when connection fails', async () => {
      await expect(
        sudoEntitlements.getEntitlementsConsumption(),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        '"API request failed. cause: Error: Network error: Unexpected token < in JSON at position 0, statusCode: undefined"',
      )
    })
  })

  describe('redeemEntitlements tests', () => {
    it('should throw RequestFailedError when connection fails', async () => {
      await expect(
        sudoEntitlements.redeemEntitlements(),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        '"API request failed. cause: Error: Network error: Unexpected token < in JSON at position 0, statusCode: undefined"',
      )
    })
  })
})

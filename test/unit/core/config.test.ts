/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultConfigurationManager } from '@sudoplatform/sudo-common'
import { getEntitlementsServiceConfig } from '../../../src/core/sdk-config'
import { EntitlementsServiceConfigNotFound } from '../../../src/errors/error'

describe('sdk-config tests', () => {
  describe('getIdentityServiceConfig', () => {
    it('should throw EntitlementsServiceConfigNotFound if entitlementsService stanza not present in config', () => {
      DefaultConfigurationManager.getInstance().setConfig(JSON.stringify({}))

      expect(() => getEntitlementsServiceConfig()).toThrowError(
        EntitlementsServiceConfigNotFound,
      )
    })
  })
})

/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiClient } from '../client/apiClient'
import { DefaultSudoEntitlementsClientOptions } from '../entitlements/entitlementsClient'

export interface DefaultSudoEntitlementsClientPrivateOptions extends DefaultSudoEntitlementsClientOptions {
  apiClient?: ApiClient
}

import { ApiClient } from '../client/apiClient'
import { DefaultSudoEntitlementsClientOptions } from '../entitlements/entitlementsClient'

export interface DefaultSudoEntitlementsClientPrivateOptions
  extends DefaultSudoEntitlementsClientOptions {
  apiClient?: ApiClient
}

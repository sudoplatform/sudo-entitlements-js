import * as SudoCommon from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { ApiClient } from '../client/apiClient'
import { EntitlementsSetTransformer } from '../data/transformers/entitlementsSetTransformer'

/**
 * Representation of an entitlement
 */
export interface Entitlement {
  /**
   * Name of the entitlement
   */
  name: string

  /**
   * Description, if any, of the entitlement
   */
  description?: string

  /**
   * Value of the entitlement.
   */
  value: number
}

/**
 * Set of entitlements current for the user
 */
export interface EntitlementsSet {
  /**
   * Time at which the entitlements for the user was originally created
   */
  createdAt: Date

  /**
   * Time at which the entitlements for the user were most recently updated.
   */
  updatedAt: Date

  /**
   * Version number of the user's entitlements. This is incremented every
   * time there is a change of entitlements set or explicit entitlements
   * for this user.
   */
  version: number
  /**
   * Name of the entitlements set specifying this user's entitlements
   * or the user's subject ID if the user's entitlements are specified
   * explicitly rather than by entitlements set name.
   */
  name: string

  /**
   * Description, if any, of the entitlements set as specified by the entitlements
   * set administrator or undefined if user's entitlements are specified explicitly
   * rather than by entitlements set name.
   */
  description?: string

  /**
   * The set of entitlements active for the user. This details the limits
   * of the user's entitlements and does not specify any information regarding
   * current consumption of those entitlements.
   */
  entitlements: Entitlement[]
}

/**
 * Client responsible for establishing entitlements of federated identities.
 *
 * @beta
 */
export interface SudoEntitlementsClient {
  /**
   * Return any entitlements for the currently logged in user or null if none.
   *
   * This will return undefined for any of the conditions that return Sudos
   * for the redeemEntitlements API.
   *
   * @returns Currently active entitlements set, if any, for the logged in user.
   */
  getEntitlements(): Promise<EntitlementsSet | undefined>

  /**
   * Redeem entitlements for the currently logged in user.
   *
   * If the user has already redeemed entitlements then the user's current
   * entitlements as determined by the original redemption and any subsequent
   * administrative modifications rather than entitlements corresponding
   * to the user's current identity token claims are returned.
   *
   * @returns Redeemed or currently active entitlements set for the logged in user.
   *
   * @throws {@link InvalidTokenError}
   * - Identity token contains no FSSO user identity information
   * - Identity token contains no claims recognized as entitling the user
   * - Identity token claims that are recognized specify unrecognized entitlements sets
   *
   * @throws {@link ServiceError}
   *  - An error occurred within the entitlements service that indicates an issue with
   *    the configuration or operation of the service.
   *
   * @throws (@link AmbiguousEntitlementsError}
   *  - Multiple identity token claims are recognized and specify conflicting entitlement sets
   */
  redeemEntitlements(): Promise<EntitlementsSet>
}

export class DefaultSudoEntitlementsClient implements SudoEntitlementsClient {
  private readonly apiClient: ApiClient

  public constructor(
    private readonly sudoUserClient: SudoUserClient,
    apiClient?: ApiClient,
  ) {
    this.apiClient = apiClient ?? new ApiClient()
  }

  async getEntitlements(): Promise<EntitlementsSet | undefined> {
    const signedIn = await this.sudoUserClient.isSignedIn()
    if (!signedIn) {
      throw new SudoCommon.NotSignedInError()
    }

    try {
      const entitlements = await this.apiClient.getEntitlements()
      if (!entitlements) {
        return undefined
      }
      return EntitlementsSetTransformer.toClient(entitlements)
    } catch (err) {
      throw this.extractPlatformError(err)
    }
  }

  async redeemEntitlements(): Promise<EntitlementsSet> {
    const signedIn = await this.sudoUserClient.isSignedIn()
    if (!signedIn) {
      throw new SudoCommon.NotSignedInError()
    }

    try {
      const entitlements = await this.apiClient.redeemEntitlements()
      return EntitlementsSetTransformer.toClient(entitlements)
    } catch (err) {
      throw this.extractPlatformError(err)
    }
  }

  private extractPlatformError(err: unknown): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any
    if (anyErr?.graphQLErrors?.[0]?.errorType?.startsWith('sudoplatform.')) {
      return new Error(anyErr.graphQLErrors[0].errorType)
    }
    return err
  }
}

import * as SudoCommon from '@sudoplatform/sudo-common'
import { IllegalArgumentError } from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { Config, getEntitlementsServiceConfig } from '../core/sdk-config'
import { ApiClient } from '../client/apiClient'
import { EntitlementsConsumptionTransformer } from '../data/transformers/entitlementsConsumptionTransformer'
import { EntitlementsSetTransformer } from '../data/transformers/entitlementsSetTransformer'
import { DefaultSudoEntitlementsClientPrivateOptions } from '../private/defaultSudoEntitlementsClientPrivateOptions'

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
 * The sub-user level consuming resource of an entitlement
 */
export interface EntitlementConsumer {
  /**
   * ID of the resource consuming an entitlement
   */
  id: string

  /**
   * The issuer of the ID. For example `sudoplatform.sudoservice` for a Sudo ID
   */
  issuer: string
}

/**
 * The consumption of a particular entitlement
 */
export interface EntitlementConsumption {
  /**
   * Name of the consumed entitlement
   */
  name: string

  /**
   * Consumer of the entitlement. If present this indicates the sub-user level resource
   * responsible for consumption of the entitlement. If not present, the entitlement is
   * consumed directly by the user.
   */
  consumer?: EntitlementConsumer

  /**
   * The maximum amount of the entitlement that can be consumed by the consumer
   */
  value: number

  /**
   * The amount of the entitlement that has been consumed
   */
  consumed: number

  /**
   * The amount of the entitlement that is yet to be consumed. Provided for convenience.
   * `available` + `consumed` always equals `value`
   */
  available: number

  /**
   * The time at which this entitlement was first consumed
   */
  firstConsumedAtEpochMs?: number

  /**
   * The most recent time at which this entitlement was consumed
   */
  lastConsumedAtEpochMs?: number
}

/**
 * Entitlements of the user.
 */
export interface UserEntitlements {
  /**
   * Version number of the user's entitlements. This is incremented every
   * time there is a change of entitlements set or explicit entitlements
   * for this user.
   *
   * For users entitled by entitlement set, the fractional part of this version
   * specifies the version of the entitlements set itself divided by 100000
   * (specified by [[`entitlementsSetVersionScalingFactor`]]).
   *
   * See also:
   *  - [[`entitlementsSetVersionScalingFactor`]]
   *  - [[`splitUserEntitlementsVersion`]]
   */
  version: number

  /**
   * Name of the entitlement set assigned to the user or undefined if the user's
   * entitlements are assigned directly.
   */
  entitlementsSetName?: string

  /**
   * The full set of entitlements assigned to the user.
   */
  entitlements: Entitlement[]
}

/**
 * Scaling factor used in construction of composite user entitlements version
 */
export const entitlementsSetVersionScalingFactor = 100000

/**
 * Split the components of the composite version. Returns a tuple with
 * the version of the user's entitlements assigned as the first element
 * and the version of the entitlements set the user is assigned to as the
 * second element. If the user is not assigned an entitlements set then
 * 0 is returned for the second element.
 *
 * @param version The version of a [[`UserEntitlements`]]
 *
 * @returns Returns the version split as a tuple: `[userEntitlementVersion: number, entitlementsSetVersion: number]`
 */
export function splitUserEntitlementsVersion(
  version: number,
): [number, number] {
  if (version < 0) {
    throw new IllegalArgumentError('version negative')
  }

  const userEntitlementsVersion = Math.floor(version)
  const entitlementsSetVersion = Math.floor(
    (version * entitlementsSetVersionScalingFactor) %
      entitlementsSetVersionScalingFactor,
  )

  if (
    userEntitlementsVersion +
      entitlementsSetVersion / entitlementsSetVersionScalingFactor !==
    version
  ) {
    throw new IllegalArgumentError('version too precise')
  }

  return [userEntitlementsVersion, entitlementsSetVersion]
}

/**
 * Entitlements consumption information for the user
 */
export interface EntitlementsConsumption {
  /**
   * The user's current assigned entitlements
   */
  entitlements: UserEntitlements

  /**
   * Consumption information for consumed entitlements.
   *
   * Absence of an element in this array for a particular entitlement
   * indicates that the entitlement has not been consumed at all.
   *
   * For sub-user level resource consumption, absence of an element in this
   * array for a particular potential consumer indicates that the entitlement
   * has not be consumed at all by that consumer.
   */
  consumption: EntitlementConsumption[]
}

/**
 * Client responsible for establishing entitlements of federated identities.
 */
export interface SudoEntitlementsClient {
  /**
   * Record consumption of a set of boolean entitlements.
   *
   * This is to support services that want a record of
   * usage recorded but have no service side enforcement
   * point.
   *
   * @param entitlementNames Boolean entitlement names to record consumption of
   *
   * @throws {@link NotSignedInError}
   *   User is not signed in
   *
   * @throws {@link InsufficientEntitlementsError}
   *   User is not entitled to one or more of the boolean entitlements.
   *   Check entitlements and that redeemEntitlements has been called
   *   for the user.
   *
   * @throws {@link InvalidArgumentError}
   *   One or more of the specified entitlement names does not correspond
   *   to a boolean entitlement defined to the entitlements serivce
   *
   * @throws {@link ServiceError}
   *   An error occurred within the entitlements service that indiciates an issue with
   *   the configuration or operation of the service.   *
   */
  consumeBooleanEntitlements(entitlementNames: string[]): Promise<void>

  /**
   * Return any entitlements for the currently logged in user or null if none.
   *
   * This will return undefined for any of the conditions that return Sudos
   * for the redeemEntitlements API.
   *
   * @returns Currently active entitlements set as an [[`EntitlementsSet`]], if any, for the logged in user.
   */
  getEntitlements(): Promise<EntitlementsSet | undefined>

  /**
   * Return entitlements consumption information for the user.
   *
   * @returns [[`EntitlementsConsumption`]]: Current entitlements and consumption for the logged in user.
   *
   * @throws {@link NoEntitlementsError}
   * - Identity token has not been redeemed.
   *
   * @throws {@link InvalidTokenError}
   * - Identity token contains no FSSO user identity information
   * - Identity token contains no claims recognized as entitling the user
   * - Identity token claims that are recognized specify unrecognized entitlements sets
   *
   * @function
   */
  getEntitlementsConsumption(): Promise<EntitlementsConsumption>

  /**
   * Retrieve external ID for the user.
   *
   * @returns [[`string`]]: The user's external ID.
   *
   * @throws {@link InvalidTokenError}
   * - Identity token contains no claims recognized as identifying the external user.
   *
   * @function
   */
  getExternalId(): Promise<string>

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DefaultSudoEntitlementsClientOptions {
  config?: Config
}

export class DefaultSudoEntitlementsClient implements SudoEntitlementsClient {
  private readonly apiClient: ApiClient
  private config: Config

  public constructor(
    private readonly sudoUserClient: SudoUserClient,
    options?: DefaultSudoEntitlementsClientOptions,
  ) {
    this.config = options?.config ?? getEntitlementsServiceConfig()
    const privateOptions = options as
      | DefaultSudoEntitlementsClientPrivateOptions
      | undefined
    this.apiClient = privateOptions?.apiClient ?? new ApiClient()
  }

  async getEntitlements(): Promise<EntitlementsSet | undefined> {
    const signedIn = await this.sudoUserClient.isSignedIn()
    if (!signedIn) {
      throw new SudoCommon.NotSignedInError()
    }

    const entitlements = await this.apiClient.getEntitlements()
    if (!entitlements) {
      return undefined
    }
    return EntitlementsSetTransformer.toClient(entitlements)
  }

  async getEntitlementsConsumption(): Promise<EntitlementsConsumption> {
    const signedIn = await this.sudoUserClient.isSignedIn()
    if (!signedIn) {
      throw new SudoCommon.NotSignedInError()
    }

    const entitlementsConsumption =
      await this.apiClient.getEntitlementsConsumption()
    return EntitlementsConsumptionTransformer.toClient(entitlementsConsumption)
  }

  async getExternalId(): Promise<string> {
    const signedIn = await this.sudoUserClient.isSignedIn()
    if (!signedIn) {
      throw new SudoCommon.NotSignedInError()
    }
    const externalId = await this.apiClient.getExternalId()
    return externalId
  }

  async redeemEntitlements(): Promise<EntitlementsSet> {
    const signedIn = await this.sudoUserClient.isSignedIn()
    if (!signedIn) {
      throw new SudoCommon.NotSignedInError()
    }

    const entitlements = await this.apiClient.redeemEntitlements()
    return EntitlementsSetTransformer.toClient(entitlements)
  }

  async consumeBooleanEntitlements(entitlementNames: string[]): Promise<void> {
    const signedIn = await this.sudoUserClient.isSignedIn()
    if (!signedIn) {
      throw new SudoCommon.NotSignedInError()
    }

    await this.apiClient.consumeBooleanEntitlements(entitlementNames)
  }
}

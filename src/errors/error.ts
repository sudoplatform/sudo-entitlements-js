/**
 * The identity token contained multiple recognized claims identifying
 * different entitlements sets on redemption.
 */
export class AmbiguousEntitlementsError extends Error {
  constructor() {
    super('Ambiguous entitlements.')
    this.name = 'AmbiguousEntitlementsError'
  }
}

/**
 * The identity token contained no claims identifying the external
 * ID of the user
 */
export class NoExternalIdError extends Error {
  constructor() {
    super('No external ID identifiable from token.')
    this.name = 'NoExternalIdError'
  }
}

/**
 * The identity token contained no claims identifying the billing group
 * of the user
 */
export class NoBillingGroupError extends Error {
  constructor() {
    super('No billing group identifiable from token.')
    this.name = 'NoBillingGroupError'
  }
}

/**
 * The entitlements set referenced in the identity token was
 * not found.
 */
export class EntitlementsSetNotFoundError extends Error {
  constructor() {
    super('Entitlements set referenced in token was not found.')
    this.name = 'EntitlementsSetNotFoundError'
  }
}

/**
 * The entitlements sequence referenced in the identity token was
 * not found.
 */
export class EntitlementsSequenceNotFoundError extends Error {
  constructor() {
    super('Entitlements sequence referenced in token was not found.')
    this.name = 'EntitlementsSequenceNotFoundError'
  }
}

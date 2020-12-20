/**
 * The token contained multiple recognized claims identitying
 * different entitlements sets on redemption.
 */
export class AmbiguousEntitlementsError extends Error {
  constructor() {
    super('Ambiguous entitlements.')
    this.name = 'AmbiguousEntitlementsError'
  }
}

import * as dotenv from 'dotenv'
dotenv.config()

/**
 * Variants of describe for executing or skipping integration tests
 * depending on the properties of the instance against which they are
 * running.
 */

/**
 * Variation in redeem behaviour for test registration users depending
 * on whether test user default entitlements set is configured or not.
 */
export const defaultEntitlementsSetForTestUsers =
  process.env.DEFAULT_ENTITLEMENTS_SET_FOR_TEST_USERS === 'true'
let _noDefaultEntitlementsSetForTestUsersTests: typeof describe = describe
let _defaultEntitlementsSetForTestUsersTests: typeof describe = describe.skip
if (defaultEntitlementsSetForTestUsers) {
  _noDefaultEntitlementsSetForTestUsersTests = describe.skip
  _defaultEntitlementsSetForTestUsersTests = describe
}
export const describeDefaultEntitlementsSetForTestUsersTests = _defaultEntitlementsSetForTestUsersTests
export const describeNoDefaultEntitlementsSetForTestUsersTests = _noDefaultEntitlementsSetForTestUsersTests

export const userAttributeAdmin = process.env.USER_ATTRIBUTE_ADMIN === 'true'
let _userAttributeAdminTests: typeof describe = describe.skip
if (userAttributeAdmin) {
  _userAttributeAdminTests = describe
}
export const describeUserAttributeAdminTests = _userAttributeAdminTests

/**
 * Variation for tests that can exploit the "integration-test" entitlements
 * set deployed in ent-dev. Assignment to integration-test admin requires
 */
export const integrationTestEntitlementsSetAvailable =
  process.env.INTEGRATION_TEST_ENTITLEMENTS_SET_AVAILABLE === 'true'
let _integrationTestEntitlementsSetTests: typeof describe = describe.skip
if (integrationTestEntitlementsSetAvailable) {
  _integrationTestEntitlementsSetTests = describe
}
export const describeIntegrationTestEntitlementsSetTests = _integrationTestEntitlementsSetTests

import {
  ApiClientManager,
  DefaultApiClientManager,
} from '@sudoplatform/sudo-api-client'
import * as SudoCommon from '@sudoplatform/sudo-common'
import { NormalizedCacheObject } from 'apollo-cache-inmemory'
import AWSAppSyncClient from 'aws-appsync'
import {
  EntitlementsSet,
  GetEntitlementsDocument,
  GetEntitlementsQuery,
  RedeemEntitlementsDocument,
  RedeemEntitlementsMutation,
} from '../gen/graphqlTypes'
/**
 * AppSync wrapper to use to invoke Entitlements Service APIs.
 */
export class ApiClient {
  private readonly client: AWSAppSyncClient<NormalizedCacheObject>

  public constructor(apiClientManager?: ApiClientManager) {
    const clientManager =
      apiClientManager ?? DefaultApiClientManager.getInstance()

    this.client = clientManager.getClient({ disableOffline: true })
  }

  public async getEntitlements(): Promise<EntitlementsSet | null> {
    const result = await this.client.query<GetEntitlementsQuery>({
      query: GetEntitlementsDocument,
      variables: {},
      fetchPolicy: 'no-cache',
    })

    return result.data.getEntitlements ?? null
  }

  public async redeemEntitlements(): Promise<EntitlementsSet> {
    const result = await this.client.mutate<RedeemEntitlementsMutation>({
      mutation: RedeemEntitlementsDocument,
      variables: {},
      fetchPolicy: 'no-cache',
    })

    if (result.data) {
      return result.data.redeemEntitlements ?? null
    } else {
      throw new SudoCommon.FatalError(
        'redeemEntitlements did not return any result.',
      )
    }
  }
}

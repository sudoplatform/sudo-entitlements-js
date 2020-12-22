import { SudoUserClient } from '@sudoplatform/sudo-user'
import AWS from 'aws-sdk'
import * as dotenv from 'dotenv'
import * as jwt from 'jsonwebtoken'
import waitForExpect from 'wait-for-expect'
dotenv.config()

export interface EntTestUserData {
  ent: {
    externalId?: string
    claims: {
      [key: string]: string
    }
  }
}

export async function updateUserCustomClaims(
  userPoolId: string,
  userClient: SudoUserClient,
  entTestUserData: EntTestUserData,
): Promise<void> {
  const identityProvider = new AWS.CognitoIdentityServiceProvider({
    region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
  })
  const Username = userClient.getUserName()
  if (!Username) {
    throw new Error('No username')
  }

  await identityProvider
    .adminUpdateUserAttributes({
      UserPoolId: userPoolId,
      Username,
      UserAttributes: [
        {
          Name: 'custom:test',
          Value: JSON.stringify(entTestUserData),
        },
      ],
    })
    .promise()

  await waitForExpect(async () => {
    await userClient.signInWithKey()
    const idToken = userClient.getIdToken()
    expect(idToken).toBeDefined()
    if (!idToken) {
      fail('idToken unexpectedly falsy')
    }
    const decoded = jwt.decode(idToken)
    expect(decoded).toBeTruthy()
    if (!decoded || typeof decoded === 'string') {
      fail('decoded unexpectedly falsy or a string')
    }
    const customTestClaim = decoded['custom:test']
    const decodingResult = JSON.parse(customTestClaim)
    expect(decodingResult?.ent).toEqual(entTestUserData.ent)
  })
}

import { DefaultConfigurationManager } from '@sudoplatform/sudo-common'
import * as t from 'io-ts'
import { EntitlementsServiceConfigNotFound } from '../errors/error'

export const Config = t.type({})

export type Config = t.TypeOf<typeof Config>

export function getEntitlementsServiceConfig(): Config {
  if (
    !DefaultConfigurationManager.getInstance().getConfigSet(
      'entitlementsService',
    )
  ) {
    throw new EntitlementsServiceConfigNotFound()
  }

  return DefaultConfigurationManager.getInstance().bindConfigSet<Config>(
    Config,
    undefined,
  )
}

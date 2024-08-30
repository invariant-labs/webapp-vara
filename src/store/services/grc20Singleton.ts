import { GearApi } from '@gear-js/api'
import { FungibleToken } from '@invariant-labs/vara-sdk'
import { Network } from '@store/consts/static'

class SingletonGRC20 {
  static GRC20: FungibleToken | null = null
  static api: GearApi | null = null
  static network: Network | null = null

  static getInstance(): FungibleToken | null {
    return this.GRC20
  }

  static async loadInstance(api: GearApi): Promise<FungibleToken> {
    if (!this.GRC20 || api !== this.api) {
      this.GRC20 = await FungibleToken.load(api)
      this.api = api
    }

    return this.GRC20
  }
}

export default SingletonGRC20

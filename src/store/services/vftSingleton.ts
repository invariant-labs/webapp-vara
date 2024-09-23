import { GearApi } from '@gear-js/api'
import { FungibleToken, Network } from '@invariant-labs/vara-sdk'

class SingletonVft {
  static vft: FungibleToken | null = null
  static api: GearApi | null = null
  static network: Network | null = null

  static getInstance(): FungibleToken | null {
    return this.vft
  }

  static async loadInstance(api: GearApi): Promise<FungibleToken> {
    if (!this.vft || api !== this.api) {
      this.vft = await FungibleToken.load(api)
      this.api = api
    }

    return this.vft
  }
}

export default SingletonVft

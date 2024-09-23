import { GearApi } from '@gear-js/api'
import { FungibleToken, Network } from '@invariant-labs/vara-sdk'

class SingletonVFT {
  static VFT: FungibleToken | null = null
  static api: GearApi | null = null
  static network: Network | null = null

  static getInstance(): FungibleToken | null {
    return this.VFT
  }

  static async loadInstance(api: GearApi): Promise<FungibleToken> {
    if (!this.VFT || api !== this.api) {
      this.VFT = await FungibleToken.load(api)
      this.api = api
    }

    return this.VFT
  }
}

export default SingletonVFT

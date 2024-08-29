import { GearApi } from '@gear-js/api'
import { Invariant, TESTNET_INVARIANT_ADDRESS } from '@invariant-labs/vara-sdk'

class SingletonInvariant {
  static invariant: Invariant | null = null
  static api: GearApi | null = null

  static getInstance(): Invariant | null {
    return this.invariant
  }

  static async loadInstance(api: GearApi): Promise<Invariant> {
    if (!this.invariant || api !== this.api) {
      //TODO handle mainnet
      this.invariant = await Invariant.load(api, TESTNET_INVARIANT_ADDRESS)
      this.api = api
    }

    return this.invariant
  }
}

export default SingletonInvariant

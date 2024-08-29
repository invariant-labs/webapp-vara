import { initGearApi } from '@invariant-labs/vara-sdk'
import { GearApi } from '@gear-js/api'

class SingletonApi {
  static api: GearApi | null = null
  static rpc: string | null = null

  static getInstance(): GearApi | null {
    return this.api
  }

  static async loadInstance(rpc: string): Promise<GearApi> {
    if (!this.api || rpc !== this.rpc) {
      this.api = await initGearApi({ providerAddress: rpc })
      this.rpc = rpc
    }

    return this.api
  }
}

export default SingletonApi

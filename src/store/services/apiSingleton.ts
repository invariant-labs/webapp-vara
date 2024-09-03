import { initGearApi } from '@invariant-labs/vara-sdk'
import { GearApi } from '@gear-js/api'
import { Network } from '@store/consts/static'

class SingletonApi {
  static api: GearApi | null = null
  static network: Network | null = null

  static getInstance(): GearApi | null {
    return this.api
  }

  static async loadInstance(network: Network): Promise<GearApi> {
    if (!this.api || network !== this.network) {
      this.api = await initGearApi(network as any)
      this.network = network
    }

    return this.api
  }
}

export default SingletonApi

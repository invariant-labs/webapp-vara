import { ApiPromise, WsProvider } from '@polkadot/api'

let _varaConnection: ApiPromise | null = null
let _network: string

const getVaraConnection = async (url: string) => {
  if (_varaConnection && _network === url) return _varaConnection

  const provider = new WsProvider(url)
  _varaConnection = await ApiPromise.create({
    provider
  })
  _network = url

  return _varaConnection
}

const getCurrentVaraConnection = (): ApiPromise | null => {
  return _varaConnection
}

export { getVaraConnection, getCurrentVaraConnection }

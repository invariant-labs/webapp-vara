import { NightlyConnectAdapter } from '@nightlylabs/wallet-selector-polkadot'

let _adapter: NightlyConnectAdapter | undefined
export const getAdapter = async () => {
  if (_adapter) return _adapter
  _adapter = await NightlyConnectAdapter.build({
    appMetadata: {
      name: 'Vara Template',
      description: 'Vara Template',
      icon: 'https://docs.nightly.app/img/logo.png',
    },
    network: 'Vara',
  })
  return _adapter
}

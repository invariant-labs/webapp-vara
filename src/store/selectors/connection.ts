import { IVaraConnectionStore, connectionSliceName } from '@store/reducers/connection'
import { AnyProps, keySelectors } from './helpers'

const store = (s: AnyProps) => s[connectionSliceName] as IVaraConnectionStore

export const { networkType, status, blockNumber, rpcAddress, invariantAddress } = keySelectors(
  store,
  ['networkType', 'status', 'blockNumber', 'rpcAddress', 'invariantAddress']
)

export const varaConnectionSelectors = {
  networkType,
  status,
  blockNumber,
  rpcAddress,
  invariantAddress
}

export default varaConnectionSelectors

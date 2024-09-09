import { ActorId } from '@invariant-labs/vara-sdk'
import { TESTNET_INVARIANT_ADDRESS } from '@invariant-labs/vara-sdk/target/consts'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { Network, RPC } from '@store/consts/static'
import { PayloadType } from '@store/consts/types'

export enum Status {
  Uninitialized = 'uninitialized',
  Init = 'init',
  Error = 'error',
  Initialized = 'initalized'
}
export interface IVaraConnectionStore {
  status: Status
  message: string
  networkType: Network
  blockNumber: number
  rpcAddress: string
  invariantAddress: ActorId
  // wrappedAZEROAddress: string
}

export const defaultState: IVaraConnectionStore = {
  status: Status.Uninitialized,
  message: '',
  networkType: Network.Testnet,
  blockNumber: 0,
  rpcAddress: localStorage.getItem(`INVARIANT_RPC_VARA_${Network.Testnet}`) || RPC.TEST,
  invariantAddress: TESTNET_INVARIANT_ADDRESS
  // wrappedAZEROAddress: TESTNET_WAZERO_ADDRESS
}
export const connectionSliceName = 'connection'
const connectionSlice = createSlice({
  name: connectionSliceName,
  initialState: defaultState,
  reducers: {
    initVaraConnection(state) {
      state.status = Status.Init
      return state
    },
    setStatus(state, action: PayloadAction<Status>) {
      state.status = action.payload
      return state
    },
    setMessage(state, action: PayloadAction<string>) {
      state.message = action.payload
      return state
    },
    setNetwork(
      state,
      action: PayloadAction<{
        networkType: Network
        rpcAddress: string
        rpcName?: string
      }>
    ) {
      state.networkType = action.payload.networkType
      state.rpcAddress = action.payload.rpcAddress
      return state
    },
    updateSlot(state) {
      return state
    },
    setSlot(state, action: PayloadAction<number>) {
      state.blockNumber = action.payload
      return state
    }
  }
})

export const actions = connectionSlice.actions
export const reducer = connectionSlice.reducer
export type PayloadTypes = PayloadType<typeof actions>

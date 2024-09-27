import { ActorId, Network } from '@invariant-labs/vara-sdk'
import { TESTNET_INVARIANT_ADDRESS, VARA_ADDRESS } from '@invariant-labs/vara-sdk/target/consts'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { INVARIANT_ADDRESS, RPC } from '@store/consts/static'
import { PayloadType } from '@store/consts/types'

export enum Status {
  Uninitialized = 'uninitialized',
  Init = 'init',
  Error = 'error',
  Initialized = 'initalized'
}

export enum RpcStatus {
  Uninitialized,
  Error,
  Ignored,
  IgnoredWithError
}

const RPC_STATUS =
  localStorage.getItem('IS_RPC_WARNING_IGNORED') === 'true'
    ? RpcStatus.Ignored
    : RpcStatus.Uninitialized

export interface IVaraConnectionStore {
  status: Status
  message: string
  networkType: Network
  blockNumber: number
  rpcAddress: string
  invariantAddress: ActorId
  wrappedVARAAddress: string
  rpcStatus: RpcStatus
}

export const defaultState: IVaraConnectionStore = {
  status: Status.Uninitialized,
  message: '',
  networkType: Network.Testnet,
  blockNumber: 0,
  rpcAddress: localStorage.getItem(`INVARIANT_RPC_VARA_${Network.Testnet}`) || RPC.TEST,
  invariantAddress: TESTNET_INVARIANT_ADDRESS,
  wrappedVARAAddress: VARA_ADDRESS,
  rpcStatus: RPC_STATUS
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
    setNetwork(state, action: PayloadAction<Network>) {
      state.networkType = action.payload
      state.invariantAddress = INVARIANT_ADDRESS[action.payload]
      state.wrappedVARAAddress = VARA_ADDRESS
      return state
    },
    updateSlot(state) {
      return state
    },
    setSlot(state, action: PayloadAction<number>) {
      state.blockNumber = action.payload
      return state
    },
    setRPCAddress(state, action: PayloadAction<string>) {
      state.rpcAddress = action.payload
      return state
    },
    setRpcStatus(state, action: PayloadAction<RpcStatus>) {
      state.rpcStatus = action.payload
      return state
    },
    handleRpcError(state, _action: PayloadAction) {
      return state
    }
  }
})

export const actions = connectionSlice.actions
export const reducer = connectionSlice.reducer
export type PayloadTypes = PayloadType<typeof actions>

import { NightlyConnectAdapter } from '@nightlylabs/wallet-selector-polkadot'
import { PayloadAction } from '@reduxjs/toolkit'
import { actions as positionsActions } from '@store/reducers/positions'
import { actions as snackbarsActions } from '@store/reducers/snackbars'
import { Status, actions } from '@store/reducers/wallet'
import { tokens } from '@store/selectors/pools'
import { status } from '@store/selectors/wallet'
import { disconnectWallet, getAlephZeroWallet } from '@utils/web3/wallet'
import {
  SagaGenerator,
  all,
  call,
  put,
  select,
  spawn,
  takeLatest,
  takeLeading
} from 'typed-redux-saga'
import { positionsList } from '@store/selectors/positions'
import { getApi } from './connection'
import { openWalletSelectorModal } from '@utils/web3/selector'

export function* getWallet(): SagaGenerator<NightlyConnectAdapter> {
  const wallet = yield* call(getAlephZeroWallet)
  return wallet
}

type FrameSystemAccountInfo = {
  data: {
    free: string
    reserved: string
    miscFrozen: string
    feeFrozen: string
  }
  nonce: number
  consumers: number
  providers: number
  sufficients: number
}
export function* getBalance(walletAddress: string): SagaGenerator<string> {
  const connection = yield* getApi()
  const accountInfoResponse = yield* call(
    [connection.query.system.account, connection.query.system.account],
    walletAddress
  ) as any

  const accountInfo = accountInfoResponse.toPrimitive() as FrameSystemAccountInfo

  return accountInfo.data.free
}

export function* handleAirdrop(): Generator {}

export function* init(isEagerConnect: boolean): Generator {
  try {
    yield* put(actions.setStatus(Status.Init))

    const walletAdapter = yield* call(getWallet)
    yield* call([walletAdapter, walletAdapter.connect])
    const accounts = yield* call([walletAdapter.accounts, walletAdapter.accounts.get])

    if (isEagerConnect) {
      yield* put(
        snackbarsActions.add({
          message: 'Wallet reconnected.',
          variant: 'success',
          persist: false
        })
      )
    } else {
      yield* put(
        snackbarsActions.add({
          message: 'Wallet connected.',
          variant: 'success',
          persist: false
        })
      )
    }

    yield* put(actions.setAddress(accounts[0].address))

    const allTokens = yield* select(tokens)
    yield* call(fetchBalances, Object.keys(allTokens))

    yield* put(actions.setStatus(Status.Initialized))
  } catch (error) {
    console.log(error)
  }
}

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function* handleConnect(action: PayloadAction<boolean>): Generator {
  const walletStatus = yield* select(status)
  if (walletStatus === Status.Initialized) {
    yield* put(
      snackbarsActions.add({
        message: 'Wallet already connected.',
        variant: 'info',
        persist: false
      })
    )
    return
  }
  yield* call(init, action.payload)
}

export function* handleDisconnect(): Generator {
  try {
    const { loadedPages } = yield* select(positionsList)

    yield* call(disconnectWallet)
    yield* put(actions.resetState())

    yield* put(
      snackbarsActions.add({
        message: 'Wallet disconnected.',
        variant: 'success',
        persist: false
      })
    )

    yield* put(positionsActions.setPositionsList([]))
    yield* put(positionsActions.setPositionsListLength(0n))
    yield* put(
      positionsActions.setPositionsListLoadedStatus({
        indexes: Object.keys(loadedPages).map(key => Number(key)),
        isLoaded: false
      })
    )

    yield* put(
      positionsActions.setCurrentPositionTicks({
        lowerTick: undefined,
        upperTick: undefined
      })
    )
  } catch (error) {
    console.log(error)
  }
}

export function* fetchBalances(): Generator {}

export function* handleReconnect(): Generator {
  yield* call(handleDisconnect)
  yield* call(openWalletSelectorModal)
  yield* call(handleConnect, { type: actions.connect.type, payload: false })
}

export function* handleGetBalances(action: PayloadAction<string[]>): Generator {
  yield* call(fetchBalances, action.payload)
}

export function* connectHandler(): Generator {
  yield takeLeading(actions.connect, handleConnect)
}

export function* disconnectHandler(): Generator {
  yield takeLeading(actions.disconnect, handleDisconnect)
}

export function* airdropSaga(): Generator {
  yield takeLeading(actions.airdrop, handleAirdrop)
}

export function* getBalancesHandler(): Generator {
  yield takeLeading(actions.getBalances, handleGetBalances)
}

export function* reconnecthandler(): Generator {
  yield takeLatest(actions.reconnect, handleReconnect)
}

export function* walletSaga(): Generator {
  yield all(
    [airdropSaga, connectHandler, disconnectHandler, getBalancesHandler, reconnecthandler].map(
      spawn
    )
  )
}

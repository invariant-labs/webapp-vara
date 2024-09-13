import { NightlyConnectAdapter } from '@nightlylabs/wallet-selector-polkadot'
import { PayloadAction } from '@reduxjs/toolkit'
import { actions as positionsActions } from '@store/reducers/positions'
import { actions as snackbarsActions } from '@store/reducers/snackbars'
import { Status, actions } from '@store/reducers/wallet'
import { tokensWithoutVara } from '@store/selectors/pools'
import { address, balance, hexAddress, status } from '@store/selectors/wallet'
import { disconnectWallet, getVaraWallet } from '@utils/web3/wallet'
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
import { getApi, getGRC20 } from './connection'
import { openWalletSelectorModal } from '@utils/web3/selector'
import { createLoaderKey, getTokenBalances } from '@utils/utils'
import { GearApi, GearKeyring, HexString } from '@gear-js/api'
import {
  DEPOSIT_VARA_SAFE_GAS_AMOUNT,
  FAUCET_DEPLOYER_MNEMONIC,
  FAUCET_SAFE_TRANSACTION_FEE,
  FaucetTokenList,
  TokenAirdropAmount
} from '@store/consts/static'
import { closeSnackbar } from 'notistack'
import { ActorId, batchTxs, Invariant } from '@invariant-labs/vara-sdk'
import { VARA_ADDRESS } from '@invariant-labs/vara-sdk/target/consts'

export function* getWallet(): SagaGenerator<NightlyConnectAdapter> {
  const wallet = yield* call(getVaraWallet)
  if (!wallet.connected) {
    yield* call([wallet, wallet.connect])

    const accounts = yield* call([wallet.accounts, wallet.accounts.get])

    yield* put(actions.setAddress(accounts[0].address))
    yield* put(actions.setStatus(Status.Initialized))
  }

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

export function* handleAirdrop(): Generator {
  const stringAddress = yield* select(address)

  if (!stringAddress) {
    return yield* put(
      snackbarsActions.add({
        message: 'Connect wallet to claim the faucet.',
        variant: 'error',
        persist: false
      })
    )
  }
  const walletAddress = yield* select(hexAddress)
  const walletBalance = yield* select(balance)

  if (FAUCET_SAFE_TRANSACTION_FEE > walletBalance) {
    return yield* put(
      snackbarsActions.add({
        message: 'Insufficient TVARA balance.',
        variant: 'error',
        persist: false,
        link: {
          label: 'GET TVARA',
          href: 'https://idea.gear-tech.io/programs?node=wss%3A%2F%2Ftestnet.vara.network'
        }
      })
    )
  }

  const loaderAirdrop = createLoaderKey()

  try {
    yield put(
      snackbarsActions.add({
        message: 'Airdrop in progress...',
        variant: 'pending',
        persist: true,
        key: loaderAirdrop
      })
    )

    const deployerAccount = yield* call(
      [GearKeyring, GearKeyring.fromMnemonic],
      FAUCET_DEPLOYER_MNEMONIC
    )

    const api = yield* getApi()

    const grc20 = yield* getGRC20()

    grc20.setAdmin(deployerAccount)
    const txs = []

    for (const ticker in FaucetTokenList) {
      const address = FaucetTokenList[ticker as keyof typeof FaucetTokenList]
      const airdropAmount = TokenAirdropAmount[ticker as keyof typeof FaucetTokenList]

      const mintTx = yield* call([grc20, grc20.mintTx], walletAddress, airdropAmount, address)
      txs.push(mintTx)
    }

    yield* call(batchTxs, api, deployerAccount, txs)

    closeSnackbar(loaderAirdrop)
    yield put(snackbarsActions.remove(loaderAirdrop))

    const tokenNames = Object.keys(FaucetTokenList).join(', ')

    yield* put(
      snackbarsActions.add({
        message: `Airdropped ${tokenNames} tokens`,
        variant: 'success',
        persist: false
        // txid: hash
      })
    )

    yield* call(fetchBalances, [...Object.values(FaucetTokenList)])
  } catch (error) {
    console.log(error)

    closeSnackbar(loaderAirdrop)
    yield put(snackbarsActions.remove(loaderAirdrop))
  }
}

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

    const allTokens = yield* select(tokensWithoutVara)

    yield* call(fetchBalances, allTokens as HexString[])
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
export function* fetchBalances(tokens: HexString[]): Generator {
  try {
    const stringAddress = yield* select(address)
    const walletAddress = yield* select(hexAddress)
    const grc20 = yield* getGRC20()
    const tokensWithoutVara = tokens.filter(token => token !== VARA_ADDRESS)

    yield* put(actions.setIsBalanceLoading(true))

    const balance = yield* call(getBalance, stringAddress)
    yield* put(actions.setBalance(BigInt(balance)))

    const tokenBalances = yield* call(getTokenBalances, tokensWithoutVara, grc20, walletAddress)

    if (tokenBalances.length !== 0) {
      yield* put(
        actions.addTokenBalances(
          tokenBalances.map(([address, balance]) => {
            return {
              address,
              balance
            }
          })
        )
      )
    }
    yield* put(actions.setIsBalanceLoading(false))
  } catch (error) {
    console.log(error)
    yield* put(actions.setIsBalanceLoading(false))
  }
}

export function* handleReconnect(): Generator {
  yield* call(handleDisconnect)
  yield* call(openWalletSelectorModal)
  yield* call(handleConnect, { type: actions.connect.type, payload: false })
}

export function* withdrawTokensPair(
  tokenX: HexString,
  tokenY: HexString,
  invariant: Invariant,
  api: GearApi,
  walletAddress: HexString,
  isError?: boolean
) {
  const userBalances = yield* call([invariant, invariant.getUserBalances], walletAddress)

  if (userBalances.size === 0) {
    if (tokenX === VARA_ADDRESS || tokenY === VARA_ADDRESS) {
      yield put(actions.getBalances([tokenX === VARA_ADDRESS ? tokenY : tokenX]))
    } else {
      yield put(actions.getBalances([tokenX, tokenY]))
    }

    return
  }
  const loaderWithdrawTokens = createLoaderKey()

  const txs = []

  if (tokenX === VARA_ADDRESS || tokenY === VARA_ADDRESS) {
    const isTokenXVara = tokenX === VARA_ADDRESS
    if (userBalances.has(VARA_ADDRESS)) {
      const withdrawVaraTx = yield* call(
        [invariant, invariant.withdrawVaraTx],
        null,
        DEPOSIT_VARA_SAFE_GAS_AMOUNT
      )
      txs.push(withdrawVaraTx)
    }

    if (userBalances.has(isTokenXVara ? tokenY : tokenX)) {
      const withdrawSecondTokenTx = yield* call(
        [invariant, invariant.withdrawSingleTokenTx],
        isTokenXVara ? tokenY : tokenX,
        null
      )

      txs.push(withdrawSecondTokenTx)
    }
  } else {
    const withdrawTx = yield* call(
      [invariant, invariant.withdrawTokenPairTx],
      [tokenX, null] as [ActorId, bigint | null],
      [tokenY, null] as [ActorId, bigint | null]
    )
    txs.push(withdrawTx)
  }

  if (isError) {
    yield put(
      snackbarsActions.add({
        message: 'Withdrawing tokens from transaction...',
        variant: 'pending',
        persist: true,
        key: loaderWithdrawTokens
      })
    )
  }

  try {
    yield* call(batchTxs, api, walletAddress, txs)

    if (tokenX === VARA_ADDRESS || tokenY === VARA_ADDRESS) {
      yield put(actions.getBalances([tokenX === VARA_ADDRESS ? tokenY : tokenX]))
    } else {
      yield put(actions.getBalances([tokenX, tokenY]))
    }
  } catch (e) {
    console.log(e)
    closeSnackbar(loaderWithdrawTokens)
    yield put(snackbarsActions.remove(loaderWithdrawTokens))

    yield put(
      snackbarsActions.add({
        message: 'Error during withdrawal tokens',
        variant: 'error',
        persist: false
      })
    )
  }

  closeSnackbar(loaderWithdrawTokens)
  yield put(snackbarsActions.remove(loaderWithdrawTokens))
}
export function* handleGetBalances(action: PayloadAction<HexString[]>): Generator {
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
  yield takeLatest(actions.getBalances, handleGetBalances)
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

import { PayloadAction } from '@reduxjs/toolkit'
import {
  createLiquidityPlot,
  createLoaderKey,
  createPlaceholderLiquidityPlot,
  deserializeTickmap,
  ensureError,
  getLiquidityTicksByPositionsList,
  isErrorMessage,
  poolKeyToString
} from '@utils/utils'
import { FetchTicksAndTickMaps, ListType, actions as poolsActions } from '@store/reducers/pools'
import { actions as walletActions } from '@store/reducers/wallet'
import {
  GetCurrentTicksData,
  GetPositionTicks,
  InitPositionData,
  actions
} from '@store/reducers/positions'
import { poolsArraySortedByFees, tickMaps, tokens } from '@store/selectors/pools'
import { all, call, fork, join, put, select, spawn, takeEvery, takeLatest } from 'typed-redux-saga'
import { fetchTicksAndTickMaps, fetchTokens } from './pools'
import { positionsList } from '@store/selectors/positions'
import { getApi, getGRC20, getInvariant } from './connection'
import { actions as snackbarsActions } from '@store/reducers/snackbars'
import { invariantAddress } from '@store/selectors/connection'
import { address, hexAddress } from '@store/selectors/wallet'
import { getVaraWallet } from '@utils/web3/wallet'
import {
  ActorId,
  calculateTokenAmountsWithSlippage,
  Signer
} from '@invariant-labs/vara-sdk/target/utils'
import { EMPTY_POSITION, ErrorMessage, POSITIONS_PER_QUERY } from '@store/consts/static'
import { closeSnackbar } from 'notistack'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Pool, Position, Tick } from '@invariant-labs/vara-sdk'
import { getWallet } from './wallet'

// export function getWithdrawAllWAZEROTxs(
//   invariant: Invariant,
//   psp22: PSP22,
//   invariantAddress: string,
//   wazeroAddress: string
// ): SubmittableExtrinsic[] {
//   const txs: SubmittableExtrinsic[] = []

//   const approveTx = psp22.approveTx(invariantAddress, U128MAX, wazeroAddress, PSP22_APPROVE_OPTIONS)
//   txs.push(approveTx)

//   const unwrapTx = invariant.withdrawAllWAZEROTx(wazeroAddress, INVARIANT_WITHDRAW_ALL_WAZERO)
//   txs.push(unwrapTx)

//   const resetApproveTx = psp22.approveTx(invariantAddress, 0n, wazeroAddress, PSP22_APPROVE_OPTIONS)
//   txs.push(resetApproveTx)

//   return txs
// }

function* handleInitPosition(action: PayloadAction<InitPositionData>): Generator {
  const {
    poolKeyData,
    lowerTick,
    upperTick,
    spotSqrtPrice,
    tokenXAmount,
    tokenYAmount,
    liquidityDelta,
    initPool,
    slippageTolerance
  } = action.payload
  const { tokenX, tokenY, feeTier } = poolKeyData
  const loaderCreatePosition = createLoaderKey()
  const loaderSigningTx = createLoaderKey()

  try {
    yield put(
      snackbarsActions.add({
        message: 'Creating position...',
        variant: 'pending',
        persist: true,
        key: loaderCreatePosition
      })
    )
    const stringWalletAddress = yield* select(address)
    const hexWalletAddress = yield* select(hexAddress)
    const adapter = yield* call(getWallet)

    // const azeroBalance = yield* select(balance)
    const invAddress = yield* select(invariantAddress)
    const grc20 = yield* getGRC20()
    const api = yield* getApi()
    const invariant = yield* getInvariant()

    const txs1 = []
    const [xAmountWithSlippage, yAmountWithSlippage] = calculateTokenAmountsWithSlippage(
      feeTier.tickSpacing,
      spotSqrtPrice,
      liquidityDelta,
      lowerTick,
      upperTick,
      slippageTolerance,
      true
    )
    const XTokenTx = yield* call([grc20, grc20.approveTx], invAddress, xAmountWithSlippage, tokenX)

    txs1.push(XTokenTx.withAccount(adapter.signer as Signer).extrinsic)

    const YTokenTx = yield* call([grc20, grc20.approveTx], invAddress, yAmountWithSlippage, tokenY)

    txs1.push(YTokenTx.withAccount(adapter.signer as Signer).extrinsic)

    const depositTx = yield* call(
      [invariant, invariant.depositTokenPairTx],
      [hexWalletAddress, tokenXAmount] as [ActorId, bigint],
      [hexWalletAddress, tokenYAmount] as [ActorId, bigint]
    )

    txs1.push(depositTx.withAccount(adapter.signer as Signer).extrinsic)

    const batchedTx1 = yield* call([api.tx.utility, api.tx.utility.batchAll], txs1)

    let signedBatchedTx1: SubmittableExtrinsic
    try {
      signedBatchedTx1 = yield* call([batchedTx1, batchedTx1.signAsync], hexWalletAddress, {
        signer: adapter.signer as any
      })
    } catch (e) {
      throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
    }

    const txResult1 = yield* call([signedBatchedTx1, signedBatchedTx1.send])
    console.log(txResult1.toString())

    const txs2 = []

    if (initPool) {
      const createPoolTx = yield* call(
        [invariant, invariant.createPoolTx],
        poolKeyData,
        spotSqrtPrice
      )

      txs2.push(createPoolTx.withAccount(adapter.signer as Signer).extrinsic)
    }

    const tx = yield* call(
      [invariant, invariant.createPositionTx],
      poolKeyData,
      lowerTick,
      upperTick,
      liquidityDelta,
      spotSqrtPrice,
      slippageTolerance
    )

    txs2.push(tx.withAccount(adapter.signer as Signer).extrinsic)

    const batchedTx2 = yield* call([api.tx.utility, api.tx.utility.batchAll], txs2)

    yield put(
      snackbarsActions.add({
        message: 'Signing transaction...',
        variant: 'pending',
        persist: true,
        key: loaderSigningTx
      })
    )

    let signedBatchedTx2: SubmittableExtrinsic
    try {
      signedBatchedTx2 = yield* call([batchedTx2, batchedTx2.signAsync], hexWalletAddress, {
        signer: adapter.signer as any
      })
    } catch (e) {
      throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
    }

    const txResult2 = yield* call([signedBatchedTx2, signedBatchedTx2.send])

    closeSnackbar(loaderSigningTx)
    yield put(snackbarsActions.remove(loaderSigningTx))

    // const txResult = yield* call(sendTx, signedBatchedTx)

    yield* put(actions.setInitPositionSuccess(true))
    closeSnackbar(loaderCreatePosition)

    yield put(snackbarsActions.remove(loaderCreatePosition))
    yield put(
      snackbarsActions.add({
        message: 'Position created.',
        variant: 'success',
        persist: false,
        txid: txResult2.toString()
      })
    )

    yield put(walletActions.getBalances([tokenX, tokenY]))

    // const { length } = yield* select(positionsList)

    // const position = yield* call([invariant, invariant.getPosition], hexWalletAddress, length)
    // console.log('position' + position)
    // yield* put(actions.addPosition(position))

    yield* put(poolsActions.getPoolKeys())
  } catch (e: unknown) {
    const error = ensureError(e)
    console.log(error)
    yield* put(actions.setInitPositionSuccess(false))
    closeSnackbar(loaderCreatePosition)
    yield put(snackbarsActions.remove(loaderCreatePosition))
    closeSnackbar(loaderSigningTx)
    yield put(snackbarsActions.remove(loaderSigningTx))
    if (isErrorMessage(error.message)) {
      yield put(
        snackbarsActions.add({
          message: error.message,
          variant: 'error',
          persist: false
        })
      )
    } else {
      yield put(
        snackbarsActions.add({
          message: 'Failed to create position. Please try again.',
          variant: 'error',
          persist: false
        })
      )
    }
  }
}

export function* handleGetCurrentPositionTicks(action: PayloadAction<GetPositionTicks>) {
  const { poolKey, lowerTickIndex, upperTickIndex } = action.payload

  const invariant = yield* getInvariant()

  const [lowerTick, upperTick] = yield* all([
    call([invariant, invariant.getTick], poolKey, lowerTickIndex),
    call([invariant, invariant.getTick], poolKey, upperTickIndex)
  ])

  yield put(
    actions.setCurrentPositionTicks({
      lowerTick,
      upperTick
    })
  )
}

export function* handleGetCurrentPlotTicks(action: PayloadAction<GetCurrentTicksData>): Generator {
  const { poolKey, isXtoY, fetchTicksAndTickmap } = action.payload
  let allTickmaps = yield* select(tickMaps)
  const allTokens = yield* select(tokens)
  const allPools = yield* select(poolsArraySortedByFees)

  const xDecimal = allTokens[poolKey.tokenX].decimals
  const yDecimal = allTokens[poolKey.tokenY].decimals

  try {
    const invariant = yield* getInvariant()

    if (!allTickmaps[poolKeyToString(poolKey)] || fetchTicksAndTickmap) {
      const fetchTicksAndTickMapsAction: PayloadAction<FetchTicksAndTickMaps> = {
        type: poolsActions.getTicksAndTickMaps.type,
        payload: {
          tokenFrom: allTokens[poolKey.tokenX].address,
          tokenTo: allTokens[poolKey.tokenY].address,
          allPools
        }
      }

      const fetchTask = yield* fork(fetchTicksAndTickMaps, fetchTicksAndTickMapsAction)

      yield* join(fetchTask)
      allTickmaps = yield* select(tickMaps)
    }

    if (!allTickmaps[poolKeyToString(poolKey)]) {
      const data = createPlaceholderLiquidityPlot(
        action.payload.isXtoY,
        0,
        poolKey.feeTier.tickSpacing,
        xDecimal,
        yDecimal
      )
      yield* put(actions.setPlotTicks({ allPlotTicks: data, userPlotTicks: data }))
      return
    }

    const allRawTicks = yield* call(
      [invariant, invariant.getAllLiquidityTicks],
      poolKey,
      deserializeTickmap(allTickmaps[poolKeyToString(poolKey)])
    )

    const allPlotTicks =
      allRawTicks.length === 0
        ? createPlaceholderLiquidityPlot(
            action.payload.isXtoY,
            0,
            poolKey.feeTier.tickSpacing,
            xDecimal,
            yDecimal
          )
        : createLiquidityPlot(allRawTicks, poolKey.feeTier.tickSpacing, isXtoY, xDecimal, yDecimal)

    yield* call(handleGetRemainingPositions)
    const { list } = yield* select(positionsList)
    const userRawTicks = getLiquidityTicksByPositionsList(poolKey, list)

    const userPlotTicks =
      userRawTicks.length === 0
        ? createPlaceholderLiquidityPlot(
            action.payload.isXtoY,
            0,
            poolKey.feeTier.tickSpacing,
            xDecimal,
            yDecimal
          )
        : createLiquidityPlot(userRawTicks, poolKey.feeTier.tickSpacing, isXtoY, xDecimal, yDecimal)

    yield* put(actions.setPlotTicks({ allPlotTicks, userPlotTicks }))
  } catch (error) {
    console.log(error)
    const data = createPlaceholderLiquidityPlot(
      action.payload.isXtoY,
      10,
      poolKey.feeTier.tickSpacing,
      xDecimal,
      yDecimal
    )
    yield* put(actions.setErrorPlotTicks(data))
  }
}

export function* handleClaimFee() {}

export function* handleGetSinglePosition(action: PayloadAction<bigint>) {
  try {
    const walletAddress = yield* select(hexAddress)
    const invariant = yield* getInvariant()
    const [position, pool, lowerTick, upperTick] = yield* call(
      [invariant, invariant.getPositionWithAssociates],
      walletAddress,
      action.payload
    )
    const assertPosition = position as Position
    yield* put(
      actions.setSinglePosition({
        index: action.payload,
        position: position as Position
      })
    )
    yield put(
      actions.setCurrentPositionTicks({
        lowerTick: lowerTick as Tick,
        upperTick: upperTick as Tick
      })
    )
    yield* put(
      poolsActions.addPoolsForList({
        data: [{ poolKey: assertPosition.poolKey, ...(pool as Pool) }],
        listType: ListType.POSITIONS
      })
    )
  } catch (e) {
    console.log(e)
  }
}

export function* handleClosePosition() {}

export function* handleGetRemainingPositions(): Generator {
  const walletAddress = yield* select(hexAddress)
  const { length, list, loadedPages } = yield* select(positionsList)

  const invariant = yield* getInvariant()

  const pages = yield* call(
    [invariant, invariant.getAllPositions],
    walletAddress,
    length,
    Object.entries(loadedPages)
      .filter(([_, isLoaded]) => isLoaded)
      .map(([index]) => Number(index)),
    BigInt(POSITIONS_PER_QUERY)
  )

  const allList = [...list]
  for (const { index, entries } of pages) {
    for (let i = 0; i < entries.length; i++) {
      allList[i + index * Number(POSITIONS_PER_QUERY)] = entries[i][0]
    }
  }

  yield* put(actions.setPositionsList(allList))
  yield* put(
    actions.setPositionsListLoadedStatus({
      indexes: pages.map(({ index }: { index: number }) => index),
      isLoaded: true
    })
  )
}

export function* handleGetPositionsListPage(
  action: PayloadAction<{ index: number; refresh: boolean }>
) {
  const { index, refresh } = action.payload

  const walletAddress = yield* select(hexAddress)
  const { length, list, loadedPages } = yield* select(positionsList)

  const invariant = yield* getInvariant()

  let entries: [Position, Pool][] = []
  let positionsLength = 0n

  if (refresh) {
    yield* put(
      actions.setPositionsListLoadedStatus({
        indexes: Object.keys(loadedPages)
          .map(key => Number(key))
          .filter(keyIndex => keyIndex !== index),
        isLoaded: false
      })
    )
  }

  if (!length || refresh) {
    const result = yield* call(
      [invariant, invariant.getPositions],
      walletAddress,
      BigInt(POSITIONS_PER_QUERY),
      BigInt(index * POSITIONS_PER_QUERY)
    )
    entries = result[0]
    positionsLength = result[1]

    const poolsWithPoolKeys = entries.map(entry => ({
      poolKey: entry[0].poolKey,
      ...entry[1]
    }))

    yield* put(
      poolsActions.addPoolsForList({ data: poolsWithPoolKeys, listType: ListType.POSITIONS })
    )
    yield* call(fetchTokens, poolsWithPoolKeys)

    yield* put(actions.setPositionsListLength(positionsLength))
  }

  const allList = length ? [...list] : Array(Number(positionsLength)).fill(EMPTY_POSITION)

  const isPageLoaded = loadedPages[index]

  if (!isPageLoaded || refresh) {
    if (length && !refresh) {
      const result = yield* call(
        [invariant, invariant.getPositions],
        walletAddress,
        BigInt(POSITIONS_PER_QUERY),
        BigInt(index * POSITIONS_PER_QUERY)
      )
      entries = result[0]
      positionsLength = result[1]

      const poolsWithPoolKeys = entries.map(entry => ({
        poolKey: entry[0].poolKey,
        ...entry[1]
      }))

      yield* put(
        poolsActions.addPoolsForList({ data: poolsWithPoolKeys, listType: ListType.POSITIONS })
      )
      yield* call(fetchTokens, poolsWithPoolKeys)
    }

    for (let i = 0; i < entries.length; i++) {
      allList[i + index * POSITIONS_PER_QUERY] = entries[i][0]
    }
  }

  yield* put(actions.setPositionsList(allList))
  yield* put(actions.setPositionsListLoadedStatus({ indexes: [index], isLoaded: true }))
}

export function* initPositionHandler(): Generator {
  yield* takeEvery(actions.initPosition, handleInitPosition)
}

export function* getCurrentPositionTicksHandler(): Generator {
  yield* takeEvery(actions.getCurrentPositionTicks, handleGetCurrentPositionTicks)
}

export function* getCurrentPlotTicksHandler(): Generator {
  yield* takeLatest(actions.getCurrentPlotTicks, handleGetCurrentPlotTicks)
}
export function* claimFeeHandler(): Generator {
  yield* takeEvery(actions.claimFee, handleClaimFee)
}

export function* getSinglePositionHandler(): Generator {
  yield* takeEvery(actions.getSinglePosition, handleGetSinglePosition)
}

export function* closePositionHandler(): Generator {
  yield* takeEvery(actions.closePosition, handleClosePosition)
}

export function* getPositionsListPage(): Generator {
  yield* takeLatest(actions.getPositionsListPage, handleGetPositionsListPage)
}

export function* getRemainingPositions(): Generator {
  yield* takeLatest(actions.getRemainingPositions, handleGetRemainingPositions)
}

export function* positionsSaga(): Generator {
  yield all(
    [
      initPositionHandler,
      getCurrentPositionTicksHandler,
      getCurrentPlotTicksHandler,
      claimFeeHandler,
      getSinglePositionHandler,
      closePositionHandler,
      getPositionsListPage,
      getRemainingPositions
    ].map(spawn)
  )
}

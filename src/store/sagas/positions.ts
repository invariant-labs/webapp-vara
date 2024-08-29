import { PayloadAction } from '@reduxjs/toolkit'

import {
  createLiquidityPlot,
  createPlaceholderLiquidityPlot,
  deserializeTickmap,
  getLiquidityTicksByPositionsList,
  poolKeyToString
} from '@utils/utils'
import { FetchTicksAndTickMaps, actions as poolsActions } from '@store/reducers/pools'
import { GetCurrentTicksData, GetPositionTicks, actions } from '@store/reducers/positions'
import { poolsArraySortedByFees, tickMaps, tokens } from '@store/selectors/pools'
import { all, call, fork, join, put, select, spawn, takeEvery, takeLatest } from 'typed-redux-saga'
import { fetchTicksAndTickMaps } from './pools'
import { positionsList } from '@store/selectors/positions'
import { getInvariant } from './connection'

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

function* handleInitPosition() {
  // const {
  //   poolKeyData,
  //   lowerTick,
  //   upperTick,
  //   spotSqrtPrice,
  //   tokenXAmount,
  //   tokenYAmount,
  //   liquidityDelta,
  //   initPool,
  //   slippageTolerance
  // } = action.payload
  // const { tokenX, tokenY, feeTier } = poolKeyData
  // const loaderCreatePosition = createLoaderKey()
  // const loaderSigningTx = createLoaderKey()
  // try {
  //   yield put(
  //     snackbarsActions.add({
  //       message: 'Creating position...',
  //       variant: 'pending',
  //       persist: true,
  //       key: loaderCreatePosition
  //     })
  //   )
  //   const walletAddress = yield* select(address)
  //   const adapter = yield* call(getAlephZeroWallet)
  //   const azeroBalance = yield* select(balance)
  //   const invAddress = yield* select(invariantAddress)
  //   const wazeroAddress = yield* select(wrappedAZEROAddress)
  //   const api = yield* getApi()
  //   const invariant = yield* getInvariant()
  //   const psp22 = yield* getPSP22()
  //   const wazero = yield* getWrappedAZERO()
  //   let txs = []
  //   const [xAmountWithSlippage, yAmountWithSlippage] = calculateTokenAmountsWithSlippage(
  //     feeTier.tickSpacing,
  //     spotSqrtPrice,
  //     liquidityDelta,
  //     lowerTick,
  //     upperTick,
  //     slippageTolerance,
  //     true
  //   )
  //   if (
  //     (tokenX === wazeroAddress && tokenXAmount !== 0n) ||
  //     (tokenY === wazeroAddress && tokenYAmount !== 0n)
  //   ) {
  //     const isTokenX = tokenX === wazeroAddress
  //     const slippageAmount = isTokenX ? xAmountWithSlippage : yAmountWithSlippage
  //     const azeroAmount = azeroBalance > slippageAmount ? slippageAmount : azeroBalance
  //     const depositTx = wazero.depositTx(azeroAmount, WAZERO_DEPOSIT_OPTIONS)
  //     txs.push(depositTx)
  //   }
  //   const XTokenTx = psp22.approveTx(invAddress, xAmountWithSlippage, tokenX, PSP22_APPROVE_OPTIONS)
  //   txs.push(XTokenTx)
  //   const YTokenTx = psp22.approveTx(invAddress, yAmountWithSlippage, tokenY, PSP22_APPROVE_OPTIONS)
  //   txs.push(YTokenTx)
  //   if (initPool) {
  //     const createPoolTx = invariant.createPoolTx(
  //       poolKeyData,
  //       spotSqrtPrice,
  //       INVARIANT_CREATE_POOL_OPTIONS
  //     )
  //     txs.push(createPoolTx)
  //   }
  //   const tx = invariant.createPositionTx(
  //     poolKeyData,
  //     lowerTick,
  //     upperTick,
  //     liquidityDelta,
  //     spotSqrtPrice,
  //     slippageTolerance,
  //     INVARIANT_CREATE_POSITION_OPTIONS
  //   )
  //   txs.push(tx)
  //   if (
  //     (tokenX === wazeroAddress && tokenXAmount !== 0n) ||
  //     (tokenY === wazeroAddress && tokenYAmount !== 0n)
  //   ) {
  //     txs = [...txs, ...getWithdrawAllWAZEROTxs(invariant, psp22, invAddress, wazeroAddress)]
  //   }
  //   const batchedTx = api.tx.utility.batchAll(txs)
  //   yield put(
  //     snackbarsActions.add({
  //       message: 'Signing transaction...',
  //       variant: 'pending',
  //       persist: true,
  //       key: loaderSigningTx
  //     })
  //   )
  //   let signedBatchedTx: SubmittableExtrinsic
  //   try {
  //     signedBatchedTx = yield* call([batchedTx, batchedTx.signAsync], walletAddress, {
  //       signer: adapter.signer as Signer
  //     })
  //   } catch (e) {
  //     throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
  //   }
  //   closeSnackbar(loaderSigningTx)
  //   yield put(snackbarsActions.remove(loaderSigningTx))
  //   const txResult = yield* call(sendTx, signedBatchedTx)
  //   yield* put(actions.setInitPositionSuccess(true))
  //   closeSnackbar(loaderCreatePosition)
  //   yield put(snackbarsActions.remove(loaderCreatePosition))
  //   yield put(
  //     snackbarsActions.add({
  //       message: 'Position created.',
  //       variant: 'success',
  //       persist: false,
  //       txid: txResult.hash
  //     })
  //   )
  //   yield put(walletActions.getBalances([tokenX, tokenY]))
  //   const { length } = yield* select(positionsList)
  //   const position = yield* call([invariant, invariant.getPosition], walletAddress, length)
  //   yield* put(actions.addPosition(position))
  //   yield* call(fetchBalances, [tokenX === wazeroAddress ? tokenY : tokenX])
  //   yield* put(poolsActions.getPoolKeys())
  // } catch (e: unknown) {
  //   const error = ensureError(e)
  //   console.log(error)
  //   yield* put(actions.setInitPositionSuccess(false))
  //   closeSnackbar(loaderCreatePosition)
  //   yield put(snackbarsActions.remove(loaderCreatePosition))
  //   closeSnackbar(loaderSigningTx)
  //   yield put(snackbarsActions.remove(loaderSigningTx))
  //   if (isErrorMessage(error.message)) {
  //     yield put(
  //       snackbarsActions.add({
  //         message: error.message,
  //         variant: 'error',
  //         persist: false
  //       })
  //     )
  //   } else {
  //     yield put(
  //       snackbarsActions.add({
  //         message: 'Failed to create position. Please try again.',
  //         variant: 'error',
  //         persist: false
  //       })
  //     )
  //   }
  // }
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

export function* handleGetSinglePosition() {}

export function* handleClosePosition() {}

export function* handleGetRemainingPositions(): Generator {}

export function* handleGetPositionsListPage() {}

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

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
import { FetchTicksAndTickMaps, actions as poolsActions } from '@store/reducers/pools'
import { actions as walletActions } from '@store/reducers/wallet'
import {
  GetCurrentTicksData,
  GetPositionTicks,
  InitPositionData,
  actions
} from '@store/reducers/positions'
import { poolsArraySortedByFees, tickMaps, tokens } from '@store/selectors/pools'
import { all, call, fork, join, put, select, spawn, takeEvery, takeLatest } from 'typed-redux-saga'
import { fetchTicksAndTickMaps } from './pools'
import { positionsList } from '@store/selectors/positions'
import { getApi, getGRC20, getInvariant } from './connection'
import { actions as snackbarsActions } from '@store/reducers/snackbars'
import { invariantAddress } from '@store/selectors/connection'
import { address, balance, hexAddress } from '@store/selectors/wallet'
import { getVaraWallet } from '@utils/web3/wallet'
import { batchTxs, calculateTokenAmountsWithSlippage } from '@invariant-labs/vara-sdk/target/utils'
import { FAUCET_DEPLOYER_MNEMONIC } from '@store/consts/static'
import { closeSnackbar } from 'notistack'
import { GearKeyring } from '@gear-js/api'

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
  console.log('poolKeyData', poolKeyData)

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
    const adapter = yield* call(getVaraWallet)
    const azeroBalance = yield* select(balance)
    const invAddress = yield* select(invariantAddress)
    const grc20 = yield* getGRC20()
    const api = yield* getApi()
    const invariant = yield* getInvariant()
    const deployerAccount = yield* call(
      [GearKeyring, GearKeyring.fromMnemonic],
      FAUCET_DEPLOYER_MNEMONIC
    )
    console.log('deployerAccount', deployerAccount)

    const txs = []

    console.log('tickSpacing :' + feeTier.tickSpacing)
    console.log('spotSqrtPrice :' + spotSqrtPrice)
    console.log('liquidityDelta :' + liquidityDelta)
    console.log('lowerTick :' + lowerTick)
    console.log('upperTick :' + upperTick)
    console.log('slippageTolerance : ' + slippageTolerance)
    console.log('initPool' + initPool)

    //TODO fix error of calculateTokenAmountsWithSlippage
    const [xAmountWithSlippage, yAmountWithSlippage] = calculateTokenAmountsWithSlippage(
      feeTier.tickSpacing,
      spotSqrtPrice,
      liquidityDelta,
      lowerTick,
      upperTick,
      slippageTolerance,
      true
    )
    console.log('xAmountWithSlippage', xAmountWithSlippage)
    const XTokenTx = yield* call([grc20, grc20.approveTx], invAddress, xAmountWithSlippage, tokenX)

    txs.push(XTokenTx)
    const YTokenTx = yield* call([grc20, grc20.approveTx], invAddress, yAmountWithSlippage, tokenY)
    txs.push(YTokenTx)

    if (initPool) {
      const createPoolTx = yield* call(
        [invariant, invariant.createPoolTx],
        poolKeyData,
        spotSqrtPrice
      )
      invariant.createPoolTx(poolKeyData, spotSqrtPrice)
      txs.push(createPoolTx)
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

    txs.push(tx)

    yield* call(batchTxs, api, hexWalletAddress, txs)

    yield put(
      snackbarsActions.add({
        message: 'Signing transaction...',
        variant: 'pending',
        persist: true,
        key: loaderSigningTx
      })
    )
    // let signedBatchedTx: SubmittableExtrinsic
    // try {
    //   signedBatchedTx = yield* call([batchedTx, batchedTx.signAsync], hexWalletAddress, {
    //     signer: adapter.signer as Signer
    //   })
    // } catch (e) {
    //   throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
    // }
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
        persist: false
        // txid: txResult.hash
      })
    )
    yield put(walletActions.getBalances([tokenX, tokenY]))
    const { length } = yield* select(positionsList)
    const position = yield* call([invariant, invariant.getPosition], hexWalletAddress, length)
    yield* put(actions.addPosition(position))
    // yield* call(fetchBalances, [tokenX === wazeroAddress ? tokenY : tokenX])
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

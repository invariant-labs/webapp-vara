import {
  ActorId,
  batchTxs,
  calculatePriceImpact,
  calculateSqrtPriceAfterSlippage,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PERCENTAGE_SCALE,
  simulateInvariantSwap
} from '@invariant-labs/vara-sdk'
import { PayloadAction } from '@reduxjs/toolkit'
import { ErrorMessage, U128MAX } from '@store/consts/static'
import { actions, Simulate, Swap } from '@store/reducers/swap'
import { pools, poolTicks, tickMaps } from '@store/selectors/pools'
import {
  calculateAmountInWithSlippage,
  createLoaderKey,
  deserializeTickmap,
  ensureError,
  findPairs,
  isErrorMessage,
  poolKeyToString,
  printBigint
} from '@utils/utils'
import { actions as snackbarsActions } from '@store/reducers/snackbars'
import { actions as poolsActions } from '@store/reducers/pools'
import { all, call, put, select, spawn, takeEvery } from 'typed-redux-saga'
import { balance, hexAddress, tokensBalances } from '@store/selectors/wallet'
import { getWallet, withdrawTokensPair } from './wallet'
import { invariantAddress } from '@store/selectors/connection'
import { getApi, getGRC20, getInvariant } from './connection'
import { closeSnackbar } from 'notistack'
import { VARA_ADDRESS } from '@invariant-labs/vara-sdk/target/consts'

export function* handleSwap(action: PayloadAction<Omit<Swap, 'txid'>>): Generator {
  const {
    poolKey,
    tokenFrom,
    slippage,
    amountIn,
    amountOut,
    byAmountIn,
    estimatedPriceAfterSwap,
    tokenTo
  } = action.payload

  if (!poolKey) {
    return
  }
  const loaderSwappingTokens = createLoaderKey()
  const loaderSigningTx = createLoaderKey()

  const walletAddress = yield* select(hexAddress)
  const adapter = yield* call(getWallet)
  const maxTokenBalances = yield* select(tokensBalances)
  const invAddress = yield* select(invariantAddress)

  const api = yield* getApi()
  const invariant = yield* getInvariant()
  const grc20 = yield* getGRC20()

  try {
    yield put(
      snackbarsActions.add({
        message: 'Exchanging tokens...',
        variant: 'pending',
        persist: true,
        key: loaderSwappingTokens
      })
    )

    const xToY = tokenFrom === poolKey.tokenX

    api.setSigner(adapter.signer as any)

    const sqrtPriceLimit = calculateSqrtPriceAfterSlippage(estimatedPriceAfterSwap, slippage, !xToY)

    let calculatedAmountIn = slippage
      ? calculateAmountInWithSlippage(amountOut, sqrtPriceLimit, xToY, poolKey.feeTier.fee)
      : amountIn

    const txs = []

    if (tokenFrom === VARA_ADDRESS) {
      const varaBalance = yield* select(balance)

      const varaAmountInWithSlippage =
        varaBalance > calculatedAmountIn ? calculatedAmountIn : varaBalance

      calculatedAmountIn = varaAmountInWithSlippage

      const depositVaraTx = yield* call(
        [invariant, invariant.depositVaraTx],
        varaAmountInWithSlippage
      )

      txs.push(depositVaraTx)
    } else {
      if (calculatedAmountIn > maxTokenBalances[tokenFrom].balance) {
        calculatedAmountIn = amountIn
      }

      const depositTx = yield* call(
        [invariant, invariant.depositSingleTokenTx],
        tokenFrom as ActorId,
        calculatedAmountIn
      )

      txs.push(depositTx)
    }

    const approveTx = yield* call(
      [grc20, grc20.approveTx],
      invAddress,
      calculatedAmountIn,
      tokenFrom
    )

    txs.unshift(approveTx)

    yield put(
      snackbarsActions.add({
        message: 'Signing transaction...',
        variant: 'pending',
        persist: true,
        key: loaderSigningTx
      })
    )

    try {
      yield* call(batchTxs, api, walletAddress, txs)
    } catch (e: any) {
      throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
    }

    const swapTx = yield* call(
      [invariant, invariant.swapWithSlippageTx],
      poolKey,
      xToY,
      byAmountIn ? amountIn : amountOut,
      byAmountIn,
      estimatedPriceAfterSwap,
      slippage
    )

    try {
      yield* call(batchTxs, api, walletAddress, [swapTx])
    } catch (e) {
      console.log(e)
      throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
    }

    closeSnackbar(loaderSigningTx)
    yield put(snackbarsActions.remove(loaderSigningTx))

    closeSnackbar(loaderSwappingTokens)
    yield put(snackbarsActions.remove(loaderSwappingTokens))

    yield put(
      snackbarsActions.add({
        message: 'Tokens exchanged.',
        variant: 'success',
        persist: false
        // txid: txResult.hash
      })
    )

    yield put(actions.setSwapSuccess(true))

    yield put(
      poolsActions.getAllPoolsForPairData({
        first: tokenFrom,
        second: tokenTo
      })
    )

    yield* call(withdrawTokensPair, tokenFrom, tokenTo, invariant, api, walletAddress)
  } catch (e: any) {
    if (e.failedTxs) {
      console.log(e.failedTxs)
    }
    const error = ensureError(e)
    console.log(error)

    yield put(actions.setSwapSuccess(false))

    closeSnackbar(loaderSwappingTokens)
    yield put(snackbarsActions.remove(loaderSwappingTokens))
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
          message: 'Tokens exchange failed. Please try again.',
          variant: 'error',
          persist: false
        })
      )
    }

    yield put(
      poolsActions.getAllPoolsForPairData({
        first: tokenFrom,
        second: tokenTo
      })
    )

    yield* call(withdrawTokensPair, tokenFrom, tokenTo, invariant, api, walletAddress)
  }
}

export enum SwapError {
  InsufficientLiquidity,
  AmountIsZero,
  NoRouteFound,
  MaxTicksCrossed,
  StateOutdated,
  Unknown
}

export function* handleGetSimulateResult(action: PayloadAction<Simulate>) {
  try {
    const allPools = yield* select(pools)
    const allTickmaps = yield* select(tickMaps)
    const allTicks = yield* select(poolTicks)

    const { fromToken, toToken, amount, byAmountIn } = action.payload

    if (amount === 0n) {
      yield put(
        actions.setSimulateResult({
          poolKey: null,
          amountOut: 0n,
          priceImpact: 0,
          targetSqrtPrice: 0n,
          fee: 0n,
          errors: [SwapError.AmountIsZero]
        })
      )
      return
    }

    const filteredPools = findPairs(
      fromToken.toString(),
      toToken.toString(),
      Object.values(allPools)
    )
    if (!filteredPools) {
      yield put(
        actions.setSimulateResult({
          poolKey: null,
          amountOut: 0n,
          priceImpact: 0,
          targetSqrtPrice: 0n,
          fee: 0n,
          errors: [SwapError.NoRouteFound]
        })
      )
      return
    }

    let poolKey = null
    let amountOut = byAmountIn ? 0n : U128MAX
    let insufficientLiquidityAmountOut = byAmountIn ? 0n : U128MAX
    let priceImpact = 0
    let targetSqrtPrice = 0n
    let fee = 0n
    const errors = []

    for (const pool of filteredPools) {
      const xToY = fromToken.toString() === pool.poolKey.tokenX

      try {
        const result = simulateInvariantSwap(
          deserializeTickmap(allTickmaps[poolKeyToString(pool.poolKey)]),
          pool.poolKey.feeTier,
          allPools[poolKeyToString(pool.poolKey)],
          allTicks[poolKeyToString(pool.poolKey)],
          xToY,
          amount,
          byAmountIn,
          xToY ? MIN_SQRT_PRICE : MAX_SQRT_PRICE
        )

        if (result.globalInsufficientLiquidity) {
          if (
            byAmountIn
              ? result.amountOut > insufficientLiquidityAmountOut
              : result.amountIn < insufficientLiquidityAmountOut
          ) {
            insufficientLiquidityAmountOut = byAmountIn ? result.amountOut : result.amountIn
            fee = pool.poolKey.feeTier.fee
            errors.push(SwapError.InsufficientLiquidity)
          }
          continue
        }

        if (result.maxTicksCrossed) {
          errors.push(SwapError.MaxTicksCrossed)
          continue
        }

        if (result.stateOutdated) {
          errors.push(SwapError.StateOutdated)
          continue
        }

        if (result.amountOut === 0n) {
          errors.push(SwapError.AmountIsZero)
          continue
        }

        if (byAmountIn ? result.amountOut > amountOut : result.amountIn < amountOut) {
          amountOut = byAmountIn ? result.amountOut : result.amountIn
          poolKey = pool.poolKey
          priceImpact = +printBigint(
            calculatePriceImpact(pool.sqrtPrice, result.targetSqrtPrice),
            PERCENTAGE_SCALE
          )
          targetSqrtPrice = result.targetSqrtPrice
        }
      } catch (e) {
        console.log(e)
        errors.push(SwapError.Unknown)
      }
    }

    yield put(
      actions.setSimulateResult({
        poolKey,
        amountOut: amountOut ? amountOut : insufficientLiquidityAmountOut,
        priceImpact,
        targetSqrtPrice,
        fee,
        errors
      })
    )
  } catch (error) {
    console.log(error)
  }
}

export function* swapHandler(): Generator {
  yield* takeEvery(actions.swap, handleSwap)
}

export function* getSimulateResultHandler(): Generator {
  yield* takeEvery(actions.getSimulateResult, handleGetSimulateResult)
}

export function* swapSaga(): Generator {
  yield all([swapHandler, getSimulateResultHandler].map(spawn))
}

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
import {
  ClosePositionData,
  GetCurrentTicksData,
  GetPositionTicks,
  HandleClaimFee,
  InitPositionData,
  actions
} from '@store/reducers/positions'
import { actions as walletActions } from '@store/reducers/wallet'
import { poolsArraySortedByFees, tickMaps, tokens } from '@store/selectors/pools'
import { all, call, fork, join, put, select, spawn, takeEvery, takeLatest } from 'typed-redux-saga'
import { fetchTicksAndTickMaps, fetchTokens } from './pools'
import { positionsList } from '@store/selectors/positions'
import { getApi, getGRC20, getInvariant } from './connection'
import { actions as snackbarsActions } from '@store/reducers/snackbars'
import { invariantAddress } from '@store/selectors/connection'
import { balance, hexAddress, tokensBalances } from '@store/selectors/wallet'
import {
  ActorId,
  batchTxs,
  calculateTokenAmountsWithSlippage
} from '@invariant-labs/vara-sdk/target/utils'
import {
  APPROVE_TOKEN_GAS_AMOUNT,
  DEPOSIT_OR_WITHDRAW_SINGLE_TOKEN_GAS_AMOUNT,
  DEPOSIT_VARA_SAFE_GAS_AMOUNT,
  EMPTY_POSITION,
  ErrorMessage,
  EXTRA_BALANCE_TO_DEPOSIT_VARA,
  INVARIANT_ACTION_GAS_AMOUNT,
  POSITIONS_PER_QUERY,
  SAFE_SLIPPAGE_FOR_INIT_POOL
} from '@store/consts/static'
import { closeSnackbar } from 'notistack'
import { Pool, Position, Tick } from '@invariant-labs/vara-sdk'
import { fetchBalances, getWallet, withdrawTokenPairTx } from './wallet'
import { VARA_ADDRESS } from '@invariant-labs/vara-sdk/target/consts'

function* handleInitPosition(action: PayloadAction<InitPositionData>): Generator {
  const {
    poolKeyData,
    lowerTick,
    upperTick,
    spotSqrtPrice,
    tokenXAmount,
    tokenYAmount,
    liquidityDelta,
    initPool
  } = action.payload
  let { slippageTolerance } = action.payload

  const { tokenX, tokenY, feeTier } = poolKeyData
  const loaderCreatePosition = createLoaderKey()
  const loaderSigningTx = createLoaderKey()
  const hexWalletAddress = yield* select(hexAddress)
  const adapter = yield* call(getWallet)
  const maxTokenBalances = yield* select(tokensBalances)
  const invAddress = yield* select(invariantAddress)
  const varaBalance = yield* select(balance)
  const grc20 = yield* getGRC20()
  const api = yield* getApi()
  const invariant = yield* getInvariant()

  if (initPool && slippageTolerance < SAFE_SLIPPAGE_FOR_INIT_POOL) {
    slippageTolerance = SAFE_SLIPPAGE_FOR_INIT_POOL
  }

  try {
    yield put(
      snackbarsActions.add({
        message: 'Creating position...',
        variant: 'pending',
        persist: true,
        key: loaderCreatePosition
      })
    )
    api.setSigner(adapter.signer as any)

    let [xAmountWithSlippage, yAmountWithSlippage] = calculateTokenAmountsWithSlippage(
      feeTier.tickSpacing,
      spotSqrtPrice,
      liquidityDelta,
      lowerTick,
      upperTick,
      slippageTolerance,
      true
    )

    const txs1 = []
    const txDepositVara = []

    if (
      (tokenX === VARA_ADDRESS && tokenXAmount !== 0n) ||
      (tokenY === VARA_ADDRESS && tokenYAmount !== 0n)
    ) {
      const isTokenX = tokenX === VARA_ADDRESS
      const inputVaraAmount = isTokenX ? tokenXAmount : tokenYAmount

      const slippageAmount = isTokenX ? xAmountWithSlippage : yAmountWithSlippage
      const varaAmount =
        slippageAmount > varaBalance - EXTRA_BALANCE_TO_DEPOSIT_VARA
          ? inputVaraAmount
          : slippageAmount

      if (isTokenX) {
        xAmountWithSlippage = varaAmount
      } else {
        yAmountWithSlippage = varaAmount
      }

      const minimalDeposit = api.existentialDeposit.toBigInt()

      const depositVaraTx = yield* call(
        [invariant, invariant.depositVaraTx],
        varaAmount < minimalDeposit ? minimalDeposit : varaAmount,
        DEPOSIT_VARA_SAFE_GAS_AMOUNT
      )

      txDepositVara.push(depositVaraTx)
    }

    if (tokenX !== VARA_ADDRESS && tokenXAmount !== 0n) {
      const validatedTokenXAmount =
        xAmountWithSlippage > maxTokenBalances[tokenX].balance ? tokenXAmount : xAmountWithSlippage

      xAmountWithSlippage = validatedTokenXAmount

      const depositTokenXTx = yield* call(
        [invariant, invariant.depositSingleTokenTx],
        poolKeyData.tokenX as ActorId,
        validatedTokenXAmount as bigint,
        DEPOSIT_OR_WITHDRAW_SINGLE_TOKEN_GAS_AMOUNT
      )
      txs1.push(depositTokenXTx)
    }

    if (tokenY !== VARA_ADDRESS && tokenYAmount !== 0n) {
      const validatedTokenYAmount =
        yAmountWithSlippage > maxTokenBalances[tokenY].balance ? tokenYAmount : yAmountWithSlippage

      yAmountWithSlippage = validatedTokenYAmount

      const depositTokenYTx = yield* call(
        [invariant, invariant.depositSingleTokenTx],
        poolKeyData.tokenY as ActorId,
        validatedTokenYAmount as bigint,
        DEPOSIT_OR_WITHDRAW_SINGLE_TOKEN_GAS_AMOUNT
      )
      txs1.push(depositTokenYTx)
    }

    if (tokenX !== VARA_ADDRESS) {
      const XTokenApproveTx = yield* call(
        [grc20, grc20.approveTx],
        invAddress,
        xAmountWithSlippage,
        tokenX,
        APPROVE_TOKEN_GAS_AMOUNT
      )

      txs1.unshift(XTokenApproveTx)
    }

    if (tokenY !== VARA_ADDRESS) {
      const YTokenApproveTx = yield* call(
        [grc20, grc20.approveTx],
        invAddress,
        yAmountWithSlippage,
        tokenY,
        APPROVE_TOKEN_GAS_AMOUNT
      )
      txs1.unshift(YTokenApproveTx)
    }

    yield put(
      snackbarsActions.add({
        message: 'Signing transaction...',
        variant: 'pending',
        persist: true,
        key: loaderSigningTx
      })
    )
    try {
      yield* call(batchTxs, api, hexWalletAddress, [...txDepositVara, ...txs1])
    } catch (e: any) {
      console.log(e)

      if (e?.name === 'InsufficientBalance') {
        yield* put(
          snackbarsActions.add({
            message: 'Insufficient VARA balance to pass transaction.',
            variant: 'error',
            persist: false,
            link: {
              label: 'GET VARA',
              href: 'https://idea.gear-tech.io/programs?node=wss%3A%2F%2Ftestnet.vara.network'
            }
          })
        )
      }

      throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
    }

    const txs2 = []

    if (initPool) {
      const createPoolTx = yield* call(
        [invariant, invariant.createPoolTx],
        poolKeyData,
        spotSqrtPrice,
        INVARIANT_ACTION_GAS_AMOUNT
      )

      txs2.push(createPoolTx)
    }

    const tx = yield* call(
      [invariant, invariant.createPositionTx],
      poolKeyData,
      lowerTick,
      upperTick,
      liquidityDelta,
      spotSqrtPrice,
      slippageTolerance,
      INVARIANT_ACTION_GAS_AMOUNT
    )

    txs2.push(tx)

    const withdrawTxs = yield* call(
      withdrawTokenPairTx,
      tokenX,
      tokenY,
      invariant,
      hexWalletAddress
    )
    if (withdrawTxs?.length) {
      txs2.push(...withdrawTxs)
    }

    try {
      yield* call(batchTxs, api, hexWalletAddress, txs2)

      if (tokenX === VARA_ADDRESS || tokenY === VARA_ADDRESS) {
        yield put(walletActions.getBalances([tokenX === VARA_ADDRESS ? tokenY : tokenX]))
      } else {
        yield put(walletActions.getBalances([tokenX, tokenY]))
      }
    } catch (e: any) {
      console.log(e)

      if (e?.name === 'InsufficientBalance') {
        yield* put(
          snackbarsActions.add({
            message: 'Insufficient VARA balance to pass transaction.',
            variant: 'error',
            persist: false,
            link: {
              label: 'GET VARA',
              href: 'https://idea.gear-tech.io/programs?node=wss%3A%2F%2Ftestnet.vara.network'
            }
          })
        )
      }

      throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
    }
    closeSnackbar(loaderSigningTx)
    yield put(snackbarsActions.remove(loaderSigningTx))

    yield* put(actions.setInitPositionSuccess(true))
    closeSnackbar(loaderCreatePosition)

    yield put(snackbarsActions.remove(loaderCreatePosition))
    yield put(
      snackbarsActions.add({
        message: 'Position created.',
        variant: 'success',
        persist: false
      })
    )

    const { length } = yield* select(positionsList)

    const position = yield* call([invariant, invariant.getPosition], hexWalletAddress, length)
    yield* put(actions.addPosition(position))

    yield* put(poolsActions.getPoolKeys())
  } catch (e: any) {
    if (e.failedTxs) {
      console.log(e.failedTxs)
    }

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

    const withdrawTxs = yield* call(
      withdrawTokenPairTx,
      tokenX,
      tokenY,
      invariant,
      hexWalletAddress
    )
    if (!withdrawTxs) {
      return
    }
    const loaderWithdrawTokens = createLoaderKey()

    yield put(
      snackbarsActions.add({
        message: 'Withdrawing tokens from transaction...',
        variant: 'pending',
        persist: true,
        key: loaderWithdrawTokens
      })
    )

    try {
      yield* call(batchTxs, api, hexWalletAddress, withdrawTxs)

      if (tokenX === VARA_ADDRESS || tokenY === VARA_ADDRESS) {
        yield put(walletActions.getBalances([tokenX === VARA_ADDRESS ? tokenY : tokenX]))
      } else {
        yield put(walletActions.getBalances([tokenX, tokenY]))
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

    if (tokenX === VARA_ADDRESS || tokenY === VARA_ADDRESS) {
      yield put(walletActions.getBalances([tokenX === VARA_ADDRESS ? tokenY : tokenX]))
    } else {
      yield put(walletActions.getBalances([tokenX, tokenY]))
    }

    closeSnackbar(loaderWithdrawTokens)
    yield put(snackbarsActions.remove(loaderWithdrawTokens))
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

export function* handleClaimFee(action: PayloadAction<HandleClaimFee>) {
  const { index, addressTokenX, addressTokenY } = action.payload

  const loaderKey = createLoaderKey()
  const loaderSigningTx = createLoaderKey()
  const walletAddress = yield* select(hexAddress)
  try {
    yield put(
      snackbarsActions.add({
        message: 'Claiming fee...',
        variant: 'pending',
        persist: true,
        key: loaderKey
      })
    )

    const adapter = yield* call(getWallet)

    const api = yield* getApi()
    const invariant = yield* getInvariant()

    api.setSigner(adapter.signer as any)
    const txs = []
    const claimTx = yield* call(
      [invariant, invariant.claimFeeTx],
      index,
      INVARIANT_ACTION_GAS_AMOUNT
    )
    txs.push(claimTx)
    const withdrawTxs = yield* call(
      withdrawTokenPairTx,
      addressTokenX,
      addressTokenY,
      invariant,
      walletAddress
    )

    if (withdrawTxs?.length) {
      txs.push(...withdrawTxs)
    }
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
      console.log(e)

      if (e?.name === 'InsufficientBalance') {
        yield* put(
          snackbarsActions.add({
            message: 'Insufficient VARA balance to pass transaction.',
            variant: 'error',
            persist: false,
            link: {
              label: 'GET VARA',
              href: 'https://idea.gear-tech.io/programs?node=wss%3A%2F%2Ftestnet.vara.network'
            }
          })
        )
      }

      throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
    }

    if (addressTokenX === VARA_ADDRESS || addressTokenY === VARA_ADDRESS) {
      yield put(
        walletActions.getBalances([addressTokenX === VARA_ADDRESS ? addressTokenY : addressTokenX])
      )
    } else {
      yield put(walletActions.getBalances([addressTokenX, addressTokenY]))
    }

    closeSnackbar(loaderSigningTx)
    yield put(snackbarsActions.remove(loaderSigningTx))

    closeSnackbar(loaderKey)
    yield put(snackbarsActions.remove(loaderKey))
    yield put(
      snackbarsActions.add({
        message: 'Fee claimed.',
        variant: 'success',
        persist: false
      })
    )

    yield put(actions.getSinglePosition(index))

    yield* call(fetchBalances, [addressTokenY, addressTokenX])
  } catch (e: any) {
    if (e.failedTxs) {
      console.log(e.failedTxs)
    }

    const error = ensureError(e)
    console.log(error)

    closeSnackbar(loaderSigningTx)
    yield put(snackbarsActions.remove(loaderSigningTx))
    closeSnackbar(loaderKey)
    yield put(snackbarsActions.remove(loaderKey))

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
          message: 'Failed to claim fee. Please try again.',
          variant: 'error',
          persist: false
        })
      )
    }
  }
}

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

export function* handleClosePosition(action: PayloadAction<ClosePositionData>) {
  const { addressTokenX, addressTokenY, onSuccess, positionIndex } = action.payload

  const loaderKey = createLoaderKey()
  const loaderSigningTx = createLoaderKey()

  try {
    yield put(
      snackbarsActions.add({
        message: 'Closing position...',
        variant: 'pending',
        persist: true,
        key: loaderKey
      })
    )

    const walletAddress = yield* select(hexAddress)
    const adapter = yield* call(getWallet)
    const allPositions = yield* select(positionsList)
    const api = yield* getApi()
    const invariant = yield* getInvariant()

    api.setSigner(adapter.signer as any)

    const getPositionsListPagePayload: PayloadAction<{ index: number; refresh: boolean }> = {
      type: actions.getPositionsListPage.type,
      payload: {
        index: Math.floor(Number(allPositions.length) / POSITIONS_PER_QUERY),
        refresh: false
      }
    }

    const fetchTask = yield* fork(handleGetPositionsListPage, getPositionsListPagePayload)
    yield* join(fetchTask)
    const txs = []

    const removePositionTx = yield* call(
      [invariant, invariant.removePositionTx],
      positionIndex,
      INVARIANT_ACTION_GAS_AMOUNT
    )
    txs.push(removePositionTx)

    const withdrawTxs = yield* call(
      withdrawTokenPairTx,
      addressTokenX,
      addressTokenY,
      invariant,
      walletAddress
    )

    if (withdrawTxs?.length) {
      txs.push(...withdrawTxs)
    }

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
      if (e.failedTxs) {
        console.log(e.failedTxs)
      }
      throw new Error(ErrorMessage.TRANSACTION_SIGNING_ERROR)
    }

    if (addressTokenX === VARA_ADDRESS || addressTokenY === VARA_ADDRESS) {
      yield put(
        walletActions.getBalances([addressTokenX === VARA_ADDRESS ? addressTokenY : addressTokenX])
      )
    } else {
      yield put(walletActions.getBalances([addressTokenX, addressTokenY]))
    }

    closeSnackbar(loaderSigningTx)
    yield put(snackbarsActions.remove(loaderSigningTx))

    closeSnackbar(loaderKey)
    yield put(snackbarsActions.remove(loaderKey))
    yield put(
      snackbarsActions.add({
        message: 'Position closed.',
        variant: 'success',
        persist: false
      })
    )

    yield* put(actions.removePosition(positionIndex))
    onSuccess()

    yield* call(fetchBalances, [addressTokenX, addressTokenY])
  } catch (e: any) {
    if (e.failedTxs) {
      console.log(e.failedTxs)
    }

    const error = ensureError(e)
    console.log(error)

    closeSnackbar(loaderSigningTx)
    yield put(snackbarsActions.remove(loaderSigningTx))
    closeSnackbar(loaderKey)
    yield put(snackbarsActions.remove(loaderKey))

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
          message: 'Failed to close position. Please try again.',
          variant: 'error',
          persist: false
        })
      )
    }
  }
}

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

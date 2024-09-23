import { ProgressState } from '@components/AnimatedButton/AnimatedButton'
import { Swap } from '@components/Swap/Swap'
import { commonTokensForNetworks, DEFAULT_SWAP_SLIPPAGE } from '@store/consts/static'
import { TokenPriceData } from '@store/consts/types'
import {
  addNewTokenToLocalStorage,
  getCoinGeckoTokenPrice,
  getMockedTokenPrice,
  getNewTokenOrThrow,
  tickerToAddress
} from '@utils/utils'
import { actions as snackbarsActions } from '@store/reducers/snackbars'
import { Simulate, actions } from '@store/reducers/swap'
import { actions as walletActions } from '@store/reducers/wallet'
import { actions as poolsActions } from '@store/reducers/pools'
import { networkType } from '@store/selectors/connection'
import {
  isLoadingLatestPoolsForTransaction,
  poolsArraySortedByFees,
  tickMaps
} from '@store/selectors/pools'
import { simulateResult, swap as swapPool } from '@store/selectors/swap'
import { balance, balanceLoading, hexAddress, status, swapTokens } from '@store/selectors/wallet'
import { openWalletSelectorModal } from '@utils/web3/selector'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { VariantType } from 'notistack'
import { HexString } from '@gear-js/api'
import apiSingleton from '@store/services/apiSingleton'
import vftSingleton from '@store/services/vftSingleton'

type Props = {
  initialTokenFrom: string
  initialTokenTo: string
}

export const WrappedSwap = ({ initialTokenFrom, initialTokenTo }: Props) => {
  const dispatch = useDispatch()

  const walletAddress = useSelector(hexAddress)
  const walletStatus = useSelector(status)
  const swap = useSelector(swapPool)
  const tickmap = useSelector(tickMaps)
  const allPools = useSelector(poolsArraySortedByFees)
  const tokensDict = useSelector(swapTokens)
  const isBalanceLoading = useSelector(balanceLoading)
  const varaBalance = useSelector(balance)
  const { success, inProgress } = useSelector(swapPool)
  const isFetchingNewPool = useSelector(isLoadingLatestPoolsForTransaction)
  const network = useSelector(networkType)
  const swapSimulateResult = useSelector(simulateResult)

  const [progress, setProgress] = useState<ProgressState>('none')
  const [tokenFrom, setTokenFrom] = useState<HexString | null>(null)
  const [tokenTo, setTokenTo] = useState<HexString | null>(null)

  useEffect(() => {
    let timeoutId1: NodeJS.Timeout
    let timeoutId2: NodeJS.Timeout

    if (!inProgress && progress === 'progress') {
      setProgress(success ? 'approvedWithSuccess' : 'approvedWithFail')

      timeoutId1 = setTimeout(() => {
        setProgress(success ? 'success' : 'failed')
      }, 1000)

      timeoutId2 = setTimeout(() => {
        setProgress('none')
      }, 3000)
    }

    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
    }
  }, [success, inProgress])

  useEffect(() => {
    if (tokenFrom !== null && tokenTo !== null && !isFetchingNewPool) {
      dispatch(
        actions.setPair({
          tokenFrom,
          tokenTo
        })
      )
    }
  }, [isFetchingNewPool])

  const lastTokenFrom =
    tickerToAddress(initialTokenFrom) && initialTokenFrom !== '-'
      ? tickerToAddress(initialTokenFrom)
      : localStorage.getItem(`INVARIANT_LAST_TOKEN_FROM_${network}`)

  const lastTokenTo =
    tickerToAddress(initialTokenTo) && initialTokenTo !== '-'
      ? tickerToAddress(initialTokenTo)
      : localStorage.getItem(`INVARIANT_LAST_TOKEN_TO_${network}`)

  const addTokenHandler = async (address: HexString) => {
    const vft = await vftSingleton.getInstance()
    const api = await apiSingleton.loadInstance(network)
    if (vft && api !== null && !tokensDict[address]) {
      getNewTokenOrThrow(address, vft, walletAddress)
        .then(data => {
          dispatch(poolsActions.addTokens(data))
          dispatch(walletActions.getBalances(Object.keys(data) as HexString[]))
          addNewTokenToLocalStorage(address, network)
          dispatch(
            snackbarsActions.add({
              message: 'Token added.',
              variant: 'success',
              persist: false
            })
          )
        })
        .catch(() => {
          dispatch(
            snackbarsActions.add({
              message: 'Token add failed.',
              variant: 'error',
              persist: false
            })
          )
        })
    } else {
      dispatch(
        snackbarsActions.add({
          message: 'Token already in list.',
          variant: 'info',
          persist: false
        })
      )
    }
  }

  const initialHideUnknownTokensValue =
    localStorage.getItem('HIDE_UNKNOWN_TOKENS') === 'true' ||
    localStorage.getItem('HIDE_UNKNOWN_TOKENS') === null

  const setHideUnknownTokensValue = (val: boolean) => {
    localStorage.setItem('HIDE_UNKNOWN_TOKENS', val ? 'true' : 'false')
  }

  const [tokenFromPriceData, setTokenFromPriceData] = useState<TokenPriceData | undefined>(
    undefined
  )
  const [priceFromLoading, setPriceFromLoading] = useState(false)
  useEffect(() => {
    if (tokenFrom === null) {
      return
    }

    const id = tokensDict[tokenFrom.toString()]?.coingeckoId || ''

    if (id.length) {
      setPriceFromLoading(true)
      getCoinGeckoTokenPrice(id)
        .then(data => setTokenFromPriceData({ price: data ?? 0 }))
        .catch(() =>
          setTokenFromPriceData(
            getMockedTokenPrice(tokensDict[tokenFrom.toString()].symbol, network)
          )
        )
        .finally(() => setPriceFromLoading(false))
    } else {
      setTokenFromPriceData(undefined)
    }
  }, [tokenFrom])

  const [tokenToPriceData, setTokenToPriceData] = useState<TokenPriceData | undefined>(undefined)
  const [priceToLoading, setPriceToLoading] = useState(false)
  useEffect(() => {
    if (tokenTo === null) {
      return
    }

    const id = tokensDict[tokenTo.toString()]?.coingeckoId || ''
    if (id.length) {
      setPriceToLoading(true)
      getCoinGeckoTokenPrice(id)
        .then(data => setTokenToPriceData({ price: data ?? 0 }))
        .catch(() =>
          setTokenToPriceData(getMockedTokenPrice(tokensDict[tokenTo.toString()].symbol, network))
        )
        .finally(() => setPriceToLoading(false))
    } else {
      setTokenToPriceData(undefined)
    }
  }, [tokenTo])

  const initialSlippage = localStorage.getItem('INVARIANT_SWAP_SLIPPAGE') ?? DEFAULT_SWAP_SLIPPAGE

  const onSlippageChange = (slippage: string) => {
    localStorage.setItem('INVARIANT_SWAP_SLIPPAGE', slippage)
  }

  const onRefresh = (tokenFromAddress: HexString | null, tokenToAddress: HexString | null) => {
    if (tokenFromAddress === null || tokenToAddress == null) {
      return
    }

    dispatch(walletActions.getBalances([tokenFromAddress, tokenToAddress]))

    dispatch(
      poolsActions.getAllPoolsForPairData({
        first: tokenFromAddress,
        second: tokenToAddress
      })
    )

    if (tokenTo === null || tokenFrom === null) {
      return
    }

    const idTo = tokensDict[tokenTo].coingeckoId ?? ''

    if (idTo.length) {
      setPriceToLoading(true)
      getCoinGeckoTokenPrice(idTo)
        .then(data => setTokenToPriceData({ price: data ?? 0 }))
        .catch(() =>
          setTokenToPriceData(getMockedTokenPrice(tokensDict[tokenTo.toString()].symbol, network))
        )
        .finally(() => setPriceToLoading(false))
    } else {
      setTokenToPriceData(undefined)
    }

    const idFrom = tokensDict[tokenFrom].coingeckoId ?? ''

    if (idFrom.length) {
      setPriceFromLoading(true)
      getCoinGeckoTokenPrice(idFrom)
        .then(data => setTokenFromPriceData({ price: data ?? 0 }))
        .catch(() =>
          setTokenFromPriceData(
            getMockedTokenPrice(tokensDict[tokenFrom.toString()].symbol, network)
          )
        )
        .finally(() => setPriceFromLoading(false))
    } else {
      setTokenFromPriceData(undefined)
    }
  }

  const simulateSwap = (simulate: Simulate) => {
    dispatch(actions.getSimulateResult(simulate))
  }

  const copyTokenAddressHandler = (message: string, variant: VariantType) => {
    dispatch(
      snackbarsActions.add({
        message,
        variant,
        persist: false
      })
    )
  }

  return (
    <Swap
      isFetchingNewPool={isFetchingNewPool}
      onRefresh={onRefresh}
      onSwap={(
        poolKey,
        slippage,
        estimatedPriceAfterSwap,
        tokenFrom,
        tokenTo,
        amountIn,
        amountOut,
        byAmountIn
      ) => {
        setProgress('progress')

        dispatch(
          actions.swap({
            poolKey,
            slippage,
            estimatedPriceAfterSwap,
            tokenFrom,
            tokenTo,
            amountIn,
            amountOut,
            byAmountIn
          })
        )
      }}
      onSetPair={(tokenFrom, tokenTo) => {
        setTokenFrom(tokenFrom)
        setTokenTo(tokenTo)

        if (tokenFrom !== null) {
          localStorage.setItem(`INVARIANT_LAST_TOKEN_FROM_${network}`, tokenFrom.toString())
        }

        if (tokenTo !== null) {
          localStorage.setItem(`INVARIANT_LAST_TOKEN_TO_${network}`, tokenTo.toString())
        }
        if (
          tokenFrom !== null &&
          tokenTo !== null &&
          tokenFrom !== tokenTo &&
          tokenFrom !== '0x' &&
          tokenTo !== '0x'
        ) {
          dispatch(
            poolsActions.getAllPoolsForPairData({
              first: tokenFrom,
              second: tokenTo
            })
          )
        }
      }}
      onConnectWallet={async () => {
        await openWalletSelectorModal()
        dispatch(walletActions.connect(false))
      }}
      onDisconnectWallet={() => {
        dispatch(walletActions.disconnect())
      }}
      walletStatus={walletStatus}
      tokens={tokensDict}
      pools={allPools}
      swapData={swap}
      progress={progress}
      isWaitingForNewPool={isFetchingNewPool}
      tickmap={tickmap}
      initialTokenFrom={lastTokenFrom}
      initialTokenTo={lastTokenTo}
      handleAddToken={addTokenHandler}
      commonTokens={commonTokensForNetworks[network]}
      initialHideUnknownTokensValue={initialHideUnknownTokensValue}
      onHideUnknownTokensChange={setHideUnknownTokensValue}
      tokenFromPriceData={tokenFromPriceData}
      tokenToPriceData={tokenToPriceData}
      priceFromLoading={priceFromLoading || isBalanceLoading}
      priceToLoading={priceToLoading || isBalanceLoading}
      onSlippageChange={onSlippageChange}
      initialSlippage={initialSlippage}
      isBalanceLoading={isBalanceLoading}
      simulateResult={swapSimulateResult}
      simulateSwap={simulateSwap}
      copyTokenAddressHandler={copyTokenAddressHandler}
      varaBalance={varaBalance}
    />
  )
}

export default WrappedSwap

import { actions } from '@store/reducers/pools'
import { actions as walletActions } from '@store/reducers/wallet'
import { invariantAddress, networkType, rpcAddress, status } from '@store/selectors/connection'
import { poolsArraySortedByFees } from '@store/selectors/pools'
import { swap } from '@store/selectors/swap'
import { hexAddress } from '@store/selectors/wallet'
import apiSingleton from '@store/services/apiSingleton'
import invariantSingleton from '@store/services/invariantSingleton'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getNetworkTokensList, getTokenDataByAddresses } from '@utils/utils'
import vftSingleton from '@store/services/vftSingleton'
import { HexString } from '@gear-js/api'

const MarketEvents = () => {
  const dispatch = useDispatch()
  const network = useSelector(networkType)
  const networkStatus = useSelector(status)
  const { tokenFrom, tokenTo } = useSelector(swap)
  const allPools = useSelector(poolsArraySortedByFees)
  const rpc = useSelector(rpcAddress)
  const walletAddress = useSelector(hexAddress)
  const invariantAddr = useSelector(invariantAddress)

  useEffect(() => {
    const connectEvents = async () => {
      const api = await apiSingleton.loadInstance(network)
      const VFT = await vftSingleton.loadInstance(api)
      let tokens = getNetworkTokensList(network)

      const currentListStr = localStorage.getItem(`CUSTOM_TOKENS_${network}`)
      const currentList: HexString[] =
        currentListStr !== null
          ? JSON.parse(currentListStr)
              .filter((address: HexString) => !tokens[address])
              .map((address: HexString) => address)
          : []
      getTokenDataByAddresses(currentList, VFT, walletAddress)
        .then(data => {
          tokens = {
            ...tokens,
            ...data
          }
        })
        .finally(() => {
          dispatch(actions.addTokens(tokens))
        })
      dispatch(walletActions.getBalances(currentList))
    }

    connectEvents()
  }, [dispatch, networkStatus, walletAddress])

  useEffect(() => {
    if (tokenFrom && tokenTo) {
      dispatch(actions.getTicksAndTickMaps({ tokenFrom, tokenTo, allPools }))
    }
  }, [tokenFrom, tokenTo])

  useEffect(() => {
    const loadInstances = async () => {
      const api = await apiSingleton.loadInstance(network)

      if (api) {
        invariantSingleton.loadInstance(api)
      }
    }

    loadInstances()
  }, [network, rpc, invariantAddr])

  return null
}

export default MarketEvents

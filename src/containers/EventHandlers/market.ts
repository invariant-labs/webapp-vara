import { actions } from '@store/reducers/pools'
import { invariantAddress, networkType, rpcAddress, status } from '@store/selectors/connection'
import { poolsArraySortedByFees } from '@store/selectors/pools'
import { swap } from '@store/selectors/swap'
import { address } from '@store/selectors/wallet'
import apiSingleton from '@store/services/apiSingleton'
import invariantSingleton from '@store/services/invariantSingleton'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getNetworkTokensList } from '@utils/utils'
import grc20Singleton from '@store/services/grc20Singleton'

const MarketEvents = () => {
  const dispatch = useDispatch()
  const network = useSelector(networkType)
  const networkStatus = useSelector(status)
  const { tokenFrom, tokenTo } = useSelector(swap)
  const allPools = useSelector(poolsArraySortedByFees)
  const rpc = useSelector(rpcAddress)
  const walletAddress = useSelector(address)
  const invariantAddr = useSelector(invariantAddress)

  useEffect(() => {
    const connectEvents = async () => {
      const api = await apiSingleton.loadInstance(network)
      await grc20Singleton.loadInstance(api)
      // const grc20 = await grc20Singleton.loadInstance(api)
      const tokens = getNetworkTokensList(network)
      const currentListStr = localStorage.getItem(`CUSTOM_TOKENS_${network}`)
      const currentList: string[] =
        currentListStr !== null
          ? JSON.parse(currentListStr)
              .filter((address: string) => !tokens[address])
              .map((address: string) => address)
          : []
      console.log(currentList)
      // getTokenDataByAddresses(currentList, psp22, walletAddress)
      //   .then(data => {
      //     tokens = {
      //       ...tokens,
      //       ...data
      //     }
      //   })
      // .finally(() => {
      //   dispatch(actions.addTokens(tokens))
      // })
      // dispatch(walletActions.getBalances(currentList))
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

import { actions } from '@store/reducers/pools'
import { invariantAddress, networkType, rpcAddress, status } from '@store/selectors/connection'
import { poolsArraySortedByFees } from '@store/selectors/pools'
import { swap } from '@store/selectors/swap'
import { address } from '@store/selectors/wallet'
import apiSingleton from '@store/services/apiSingleton'
import invariantSingleton from '@store/services/invariantSingleton'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

const MarketEvents = () => {
  const dispatch = useDispatch()
  const network = useSelector(networkType)
  const networkStatus = useSelector(status)
  const { tokenFrom, tokenTo } = useSelector(swap)
  const allPools = useSelector(poolsArraySortedByFees)
  const rpc = useSelector(rpcAddress)
  const walletAddress = useSelector(address)
  const invariantAddr = useSelector(invariantAddress)

  useEffect(() => {}, [dispatch, networkStatus, walletAddress])

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

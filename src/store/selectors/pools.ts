import { createSelector } from '@reduxjs/toolkit'
import { IPoolsStore, poolsSliceName } from '../reducers/pools'
import { keySelectors, AnyProps } from './helpers'
import { VARA_ADDRESS } from '@store/consts/static'
import { Network } from '@invariant-labs/vara-sdk'

const store = (s: AnyProps) => s[poolsSliceName] as IPoolsStore

export const {
  pools,
  poolKeys,
  tokens,
  poolTicks,
  isLoadingLatestPoolsForTransaction,
  tickMaps,
  nearestPoolTicksForPair,
  isLoadingTicksAndTickMaps,
  isLoadingTokens,
  isLoadingTokensError,
  isLoadingPoolKeys
} = keySelectors(store, [
  'pools',
  'poolKeys',
  'tokens',
  'poolTicks',
  'isLoadingLatestPoolsForTransaction',
  'tickMaps',
  'nearestPoolTicksForPair',
  'isLoadingTicksAndTickMaps',
  'isLoadingTokens',
  'isLoadingTokensError',
  'isLoadingPoolKeys'
])

export const poolsArraySortedByFees = createSelector(pools, allPools =>
  Object.values(allPools).sort((a, b) => Number(a.poolKey.feeTier.fee - b.poolKey.feeTier.fee))
)

export const hasTokens = createSelector(tokens, allTokens => !!Object.values(allTokens).length)

export const tokensWithoutVara = createSelector(tokens, allTokens =>
  Object.keys(allTokens).filter(token => token !== VARA_ADDRESS[Network.Testnet])
)

export const poolsSelectors = {
  pools,
  poolKeys,
  tokens,
  poolTicks,
  isLoadingLatestPoolsForTransaction,
  tickMaps,
  nearestPoolTicksForPair,
  isLoadingTicksAndTickMaps,
  isLoadingPoolKeys
}

export default poolsSelectors

import { BN } from '@polkadot/util'
import { createSelector } from '@reduxjs/toolkit'
import { IVaraWallet, ITokenBalance, walletSliceName } from '@store/reducers/wallet'
import { AnyProps, keySelectors } from './helpers'
import { tokens } from './pools'
import { decodeAddress, HexString } from '@gear-js/api'
import { VARA_ADDRESS } from '@invariant-labs/vara-sdk/target/consts'
import { POOL_SAFE_TRANSACTION_FEE, SWAP_SAFE_TRANSACTION_FEE } from '@store/consts/static'

const store = (s: AnyProps) => s[walletSliceName] as IVaraWallet

export const { address, balance, tokensBalances, status, balanceLoading } = keySelectors(store, [
  'address',
  'balance',
  'tokensBalances',
  'status',
  'balanceLoading'
])

export const tokenBalance = (tokenAddress: string) =>
  createSelector(tokensBalances, tokensAccounts => {
    if (tokensAccounts[tokenAddress]) {
      return tokensAccounts[tokenAddress]
    }
  })

export const tokenBalanceAddress = () =>
  createSelector(tokensBalances, tokenAccounts => {
    return Object.values(tokenAccounts).map(item => {
      return item.address
    })
  })

export interface SwapToken {
  balance: bigint
  decimals: bigint
  symbol: string
  assetAddress: HexString
  name: string
  logoURI: string
  isUnknown?: boolean
  coingeckoId?: string
}

export const swapTokens = createSelector(
  tokensBalances,
  tokens,
  balance,
  (allAccounts, tokens, varaBalance) => {
    return Object.values(tokens).map(token => ({
      ...token,
      assetAddress: token.address,
      balance:
        token.address.toString() === VARA_ADDRESS
          ? BigInt(Math.max(Number(varaBalance - SWAP_SAFE_TRANSACTION_FEE), 0))
          : allAccounts[token.address.toString()]?.balance ?? 0n
    }))
  }
)

export const poolTokens = createSelector(
  tokensBalances,
  tokens,
  balance,
  (allAccounts, tokens, varaBalance) => {
    const poolTokens: Record<string, SwapToken> = {}
    Object.entries(tokens).forEach(([key, val]) => {
      poolTokens[key] = {
        ...val,
        assetAddress: val.address,
        balance:
          val.address.toString() === VARA_ADDRESS
            ? BigInt(Math.max(Number(varaBalance - POOL_SAFE_TRANSACTION_FEE), 0))
            : allAccounts[val.address.toString()]?.balance ?? BigInt(0)
      }
    })

    return poolTokens
  }
)

export const swapTokensDict = createSelector(
  tokensBalances,
  tokens,
  balance,
  (allAccounts, tokens, varaBalance) => {
    const swapTokens: Record<string, SwapToken> = {}
    Object.entries(tokens).forEach(([key, val]) => {
      swapTokens[key] = {
        ...val,
        assetAddress: val.address,
        balance:
          val.address.toString() === VARA_ADDRESS
            ? BigInt(varaBalance)
            : allAccounts[val.address.toString()]?.balance ?? BigInt(0)
      }
    })

    return swapTokens
  }
)

export const hexAddress = createSelector(
  address,
  (addressString: string): HexString => (addressString ? decodeAddress(addressString) : '0x')
)

export type TokenBalances = ITokenBalance & {
  symbol: string
  usdValue: BN
  assetDecimals: number
}

export const varaWalletSelectors = {
  address,
  hexAddress,
  balance,
  tokensBalances,
  status,
  tokenBalance,
  balanceLoading
}
export default varaWalletSelectors

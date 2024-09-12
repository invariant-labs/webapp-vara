import {
  FEE_TIERS,
  HexString,
  Network,
  Position,
  TESTNET_BTC_ADDRESS,
  TESTNET_ETH_ADDRESS,
  TESTNET_USDC_ADDRESS
} from '@invariant-labs/vara-sdk'
import { Keyring } from '@polkadot/api'
import {
  BestTier,
  Chain,
  FormatNumberThreshold,
  PrefixConfig,
  Token,
  TokenPriceData
} from './types'
import { testnetBestTiersCreator } from '@utils/utils'
import { POSITIONS_ENTRIES_LIMIT, VARA_ADDRESS } from '@invariant-labs/vara-sdk/target/consts'

export enum RPC {
  TEST = 'wss://testnet.vara.network',
  MAIN = 'wss://rpc.vara.network'
  // LOCAL = Network.Local
}

export const POSITIONS_PER_PAGE = 5

export const STABLECOIN_ADDRESSES: string[] = []

export const DEFAULT_PUBLICKEY = new Keyring({ type: 'ecdsa' })

export const tokensPrices: Record<Network, Record<string, TokenPriceData>> = {
  [Network.Testnet]: { USDC_TEST: { price: 1 }, BTC_TEST: { price: 64572.0 } },
  [Network.Mainnet]: {},
  [Network.Local]: {}
}

export const FAUCET_DEPLOYER_MNEMONIC =
  'perfect piece sorry put inch unknown divert please together clap dutch among'

export const FAUCET_TOKEN_AMOUNT = 1000n

export const TokenAirdropAmount = {
  BTC: 100000n,
  ETH: 20000000000n,
  USDC: 50000000n
}

export const FaucetTokenList = {
  BTC: TESTNET_BTC_ADDRESS,
  ETH: TESTNET_ETH_ADDRESS,
  USDC: TESTNET_USDC_ADDRESS
}

export const BTC: Token = {
  symbol: 'BTC',
  address: TESTNET_BTC_ADDRESS,
  decimals: 8n,
  name: 'Bitcoin',
  logoURI:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E/logo.png',
  coingeckoId: 'bitcoin'
}

export const ETH: Token = {
  symbol: 'ETH',
  address: TESTNET_ETH_ADDRESS,
  decimals: 12n,
  name: 'Ether',
  logoURI:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk/logo.png',
  coingeckoId: 'ethereum'
}

export const USDC: Token = {
  symbol: 'USDC',
  address: TESTNET_USDC_ADDRESS,
  decimals: 6n,
  name: 'USDC',
  logoURI:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  coingeckoId: 'usd-coin'
}

export const VARA: Token = {
  symbol: 'VARA',
  address: VARA_ADDRESS,
  decimals: 12n,
  name: 'Vara',
  logoURI: 'https://assets.coingecko.com/coins/images/31458/standard/vara.jpeg?1696530272',
  coingeckoId: 'vara'
}

export const DEFAULT_TOKENS = [BTC, ETH, USDC, VARA]

export const bestTiers: Record<Network, BestTier[]> = {
  [Network.Testnet]: testnetBestTiersCreator(),
  [Network.Mainnet]: [],
  [Network.Local]: []
}

export const commonTokensForNetworks: Record<Network, HexString[]> = {
  [Network.Testnet]: [BTC.address, ETH.address, USDC.address, VARA.address],
  [Network.Mainnet]: [],
  [Network.Local]: []
}

export const ALL_FEE_TIERS_DATA = FEE_TIERS.map((tier, index) => ({
  tier,
  primaryIndex: index
}))

export const U128MAX = 2n ** 128n - 1n

export const SWAP_SAFE_TRANSACTION_FEE = BigInt(Math.ceil(0.25 * 10 ** 12))
export const POOL_SAFE_TRANSACTION_FEE = BigInt(Math.ceil(0.32 * 10 ** 12))
export const DEPOSIT_VARA_MARGIN = BigInt(Math.ceil(15 * 10 ** 12))
export const FAUCET_SAFE_TRANSACTION_FEE = BigInt(Math.ceil(0.001 * 10 ** 12))

export enum ErrorMessage {
  TRANSACTION_SIGNING_ERROR = 'Error while signing transaction.'
}

export const REFRESHER_INTERVAL = 20

export const defaultThresholds: FormatNumberThreshold[] = [
  {
    value: 10,
    decimals: 4
  },
  {
    value: 1000,
    decimals: 2
  },
  {
    value: 10000,
    decimals: 1
  },
  {
    value: 1000000,
    decimals: 2,
    divider: 1000
  },
  {
    value: 1000000000,
    decimals: 2,
    divider: 1000000
  },
  {
    value: Infinity,
    decimals: 2,
    divider: 1000000000
  }
]

export const COINGECKO_QUERY_COOLDOWN = 20 * 60 * 1000

export const FormatConfig = {
  B: 1000000000,
  M: 1000000,
  K: 1000,
  BDecimals: 9,
  MDecimals: 6,
  KDecimals: 3,
  DecimalsAfterDot: 2
}

export enum PositionTokenBlock {
  None,
  A,
  B
}

export const subNumbers = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']

export const defaultPrefixConfig: PrefixConfig = {
  B: 1000000000,
  M: 1000000,
  K: 10000
}

export const addressTickerMap: { [key: string]: string } = {
  BTC: TESTNET_BTC_ADDRESS,
  ETH: TESTNET_ETH_ADDRESS,
  USDC: TESTNET_USDC_ADDRESS,
  VARA: VARA_ADDRESS
}

export const reversedAddressTickerMap = Object.fromEntries(
  Object.entries(addressTickerMap).map(([key, value]) => [value, key])
)

export const LIQUIDITY_PLOT_DECIMAL = 12n

export const DEFAULT_TOKEN_DECIMAL = 12n

export const EMPTY_POSITION: Position = {
  poolKey: {
    tokenX: TESTNET_BTC_ADDRESS,
    tokenY: TESTNET_ETH_ADDRESS,
    feeTier: { fee: 0n, tickSpacing: 1n }
  },
  liquidity: 0n,
  lowerTickIndex: 0n,
  upperTickIndex: 0n,
  feeGrowthInsideX: 0n,
  feeGrowthInsideY: 0n,
  lastBlockNumber: 0n,
  tokensOwedX: 0n,
  tokensOwedY: 0n
}

export const POSITIONS_PER_QUERY =
  Number(POSITIONS_ENTRIES_LIMIT) - (Number(POSITIONS_ENTRIES_LIMIT) % POSITIONS_PER_PAGE)

export const MINIMAL_POOL_INIT_PRICE = 0.00000001

export const DEFAULT_SWAP_SLIPPAGE = '0.50'
export const DEFAULT_NEW_POSITION_SLIPPAGE = '0.50'

export const CHAINS = [
  { name: Chain.Solana, address: 'https://invariant.app/' },
  { name: Chain.AlephZero, address: 'https://azero.invariant.app/' },
  { name: Chain.Eclipse, address: 'https://eclipse.invariant.app/' },
  { name: Chain.Vara, address: 'https://vara.invariant.app/' }
]

export const enum SortTypePoolList {
  NAME_ASC,
  NAME_DESC,
  FEE_ASC,
  FEE_DESC,
  VOLUME_ASC,
  VOLUME_DESC,
  TVL_ASC,
  TVL_DESC
  // APY_ASC,
  // APY_DESC
}

export const enum SortTypeTokenList {
  NAME_ASC,
  NAME_DESC,
  PRICE_ASC,
  PRICE_DESC,
  CHANGE_ASC,
  CHANGE_DESC,
  VOLUME_ASC,
  VOLUME_DESC,
  TVL_ASC,
  TVL_DESC
}

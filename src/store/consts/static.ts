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
import { bestTiersCreator } from '@utils/utils'
import {
  POSITIONS_ENTRIES_LIMIT,
  TESTNET_INVARIANT_ADDRESS,
  VARA_ADDRESS as VARA_ADDRESS_SDK
} from '@invariant-labs/vara-sdk/target/consts'
import mainnetListJson from '@store/consts/tokenLists/mainnet.json'

export const VARA_ADDRESS: Record<Network, HexString> = {
  [Network.Mainnet]: '0x',
  [Network.Testnet]: VARA_ADDRESS_SDK,
  [Network.Local]: '0x'
}

export const BTC_ADDRESS: Record<Network, HexString> = {
  [Network.Mainnet]: '0x',
  [Network.Testnet]: TESTNET_BTC_ADDRESS,
  [Network.Local]: '0x'
}
export const ETH_ADDRESS: Record<Network, HexString> = {
  [Network.Mainnet]: '0x',
  [Network.Testnet]: TESTNET_ETH_ADDRESS,
  [Network.Local]: '0x'
}
export const USDC_ADDRESS: Record<Network, HexString> = {
  [Network.Mainnet]: '0x',
  [Network.Testnet]: TESTNET_USDC_ADDRESS,
  [Network.Local]: '0x'
}

export const INVARIANT_ADDRESS: Record<Network, HexString> = {
  [Network.Mainnet]: '0x',
  [Network.Testnet]: TESTNET_INVARIANT_ADDRESS,
  [Network.Local]: '0x'
}
export const USDT_MAINNET_ADDRESS = '0x'

export enum RPC {
  TEST = 'wss://testnet.vara.network',
  MAIN = 'wss://rpc.vara.network'
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

export const getFaucetTokenList = (network: Network) => {
  return {
    BTC: BTC_ADDRESS[network],
    ETH: ETH_ADDRESS[network],
    USDC: USDC_ADDRESS[network]
  }
}

export const TESTNET_BTC: Token = {
  symbol: 'BTC',
  address: BTC_ADDRESS[Network.Testnet],
  decimals: 8n,
  name: 'Bitcoin',
  logoURI:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E/logo.png',
  coingeckoId: 'bitcoin'
}

export const TESTNET_ETH: Token = {
  symbol: 'ETH',
  address: ETH_ADDRESS[Network.Testnet],
  decimals: 12n,
  name: 'Ether',
  logoURI:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk/logo.png',
  coingeckoId: 'ethereum'
}

export const TESTNET_USDC: Token = {
  symbol: 'USDC',
  address: USDC_ADDRESS[Network.Testnet],
  decimals: 6n,
  name: 'USDC',
  logoURI:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  coingeckoId: 'usd-coin'
}

export const TESTNET_VARA: Token = {
  symbol: 'VARA',
  address: VARA_ADDRESS[Network.Testnet],
  decimals: 12n,
  name: 'Vara',
  logoURI: 'https://assets.coingecko.com/coins/images/31458/standard/vara.jpeg?1696530272',
  coingeckoId: 'vara-network'
}

export const DEFAULT_TOKENS = ['bitcoin', 'ethereum', 'usd-coin', 'vara-network']

export const bestTiers: Record<Network, BestTier[]> = {
  [Network.Testnet]: bestTiersCreator(Network.Testnet),
  [Network.Mainnet]: [],
  [Network.Local]: bestTiersCreator(Network.Local)
}

export const commonTokensForNetworks: Record<Network, HexString[]> = {
  [Network.Testnet]: [
    TESTNET_BTC.address,
    TESTNET_ETH.address,
    TESTNET_USDC.address,
    TESTNET_VARA.address
  ],
  [Network.Mainnet]: [
    VARA_ADDRESS[Network.Mainnet],
    BTC_ADDRESS[Network.Mainnet],
    ETH_ADDRESS[Network.Mainnet],
    USDC_ADDRESS[Network.Mainnet],
    USDT_MAINNET_ADDRESS
  ],
  [Network.Local]: []
}

const commonTokensLogos = {
  [BTC_ADDRESS[Network.Mainnet]]:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E/logo.png',
  [ETH_ADDRESS[Network.Mainnet]]:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk/logo.png',
  [USDC_ADDRESS[Network.Mainnet]]:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  [VARA_ADDRESS[Network.Mainnet]]:
    'https://assets.coingecko.com/coins/images/31458/standard/vara.jpeg?1696530272',
  [USDT_MAINNET_ADDRESS]:
    'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg'
}

export const mainnetList = (() => {
  const parsedMainnetList: Record<string, Token> = {}

  const mainnetList = mainnetListJson as unknown as Record<string, Token>

  Object.keys(mainnetList).forEach(token => {
    if (commonTokensLogos[token]) {
      parsedMainnetList[token] = {
        ...mainnetList[token],
        logoURI: commonTokensLogos[token]
      }
    } else {
      parsedMainnetList[token] = mainnetList[token]
    }
  })

  return parsedMainnetList
})()

export const ALL_FEE_TIERS_DATA = FEE_TIERS.map((tier, index) => ({
  tier,
  primaryIndex: index
}))

export const MAX = 2n ** 128n - 1n

export const SWAP_SAFE_TRANSACTION_FEE = BigInt(Math.ceil(0.25 * 10 ** 12))
export const POOL_SAFE_TRANSACTION_FEE = BigInt(Math.ceil(0.32 * 10 ** 12))
export const EXTRA_BALANCE_TO_DEPOSIT_VARA = BigInt(Math.ceil(3 * 10 ** 12))
export const DEPOSIT_VARA_SAFE_GAS_AMOUNT = 10_000_000_000n
export const DEPOSIT_OR_WITHDRAW_SINGLE_TOKEN_GAS_AMOUNT = 50_000_000_000n
export const DEPOSIT_OR_WITHDRAW_TOKEN_PAIR_GAS_AMOUNT = 100_000_000_000n
export const INVARIANT_ACTION_GAS_AMOUNT = 10_000_000_000n
export const APPROVE_TOKEN_GAS_AMOUNT = 5_000_000_000n
export const SWAP_GAS_AMOUNT = 120_000_000_000n
export const FAUCET_SAFE_TRANSACTION_FEE = BigInt(Math.ceil(0.001 * 10 ** 12))
export const SAFE_SLIPPAGE_FOR_INIT_POOL = 1500000000n

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

export const getAddressTickerMap = (network: Network): { [k: string]: string } => {
  if (network !== Network.Mainnet) {
    return {
      BTC: BTC_ADDRESS[network],
      ETH: ETH_ADDRESS[network],
      USDC: USDC_ADDRESS[network],
      VARA: VARA_ADDRESS[network]
    }
  } else {
    const parsedMainnetList = mainnetList as unknown as Record<string, Token>
    const result: { [k: string]: string } = {}

    Object.keys(parsedMainnetList).forEach((key: string) => {
      const token = parsedMainnetList[key]
      result[token.symbol] = token.address
    })

    return result
  }
}

export const getReversedAddressTickerMap = (network: Network) => {
  return Object.fromEntries(
    Object.entries(getAddressTickerMap(network)).map(([key, value]) => [value, key])
  )
}

export const LIQUIDITY_PLOT_DECIMAL = 12n

export const DEFAULT_TOKEN_DECIMAL = 12n

export const EMPTY_POSITION: Position = {
  poolKey: {
    tokenX: TESTNET_BTC.address,
    tokenY: TESTNET_ETH.address,
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
  // secondsPerLiquidityInside: 0n,
  // createdAt: 0n
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
  // CHANGE_ASC,
  // CHANGE_DESC,
  VOLUME_ASC,
  VOLUME_DESC,
  TVL_ASC,
  TVL_DESC
}

export const RECOMMENDED_RPC_ADDRESS = {
  [Network.Testnet]: RPC.TEST,
  [Network.Mainnet]: RPC.MAIN,
  [Network.Local]: ''
}

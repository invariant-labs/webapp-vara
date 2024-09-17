import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { MemoryRouter } from 'react-router-dom'
import NewPosition, { INewPosition } from './NewPosition'
import { Network } from '@invariant-labs/vara-sdk'

const meta = {
  title: 'PageComponent/NewPosition',
  component: NewPosition,
  decorators: [
    Story => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    )
  ]
} satisfies Meta<typeof NewPosition>

export default meta
type Story = StoryObj<typeof meta>

const PrimaryComponent: React.FC<INewPosition> = args => {
  return <NewPosition {...args} />
}

export const Primary: Story = {
  args: {
    currentPairReversed: false,
    isXtoY: true,
    addLiquidityHandler: fn(),
    midPrice: { x: 1234, index: 23 } as any,
    bestTiers: [],
    commonTokens: [],
    copyPoolAddressHandler: fn(),
    currentFeeIndex: 0,
    currentPriceSqrt: 123 as any,
    data: [],
    feeTiers: [
      { feeValue: 0.1 },
      { feeValue: 0.2 },
      { feeValue: 0.3 },
      { feeValue: 0.4 },
      { feeValue: 0.5 }
    ],
    handleAddToken: fn(),
    initialFee: '0.05',
    initialHideUnknownTokensValue: false,
    initialOpeningPositionMethod: 'concentration',
    initialSlippage: '0.01',
    initialTokenFrom: 'BTC',
    initialTokenTo: 'ETH',
    isCurrentPoolExisting: true,
    isWaitingForNewPool: false,
    onChangePositionTokens: fn(),
    onHideUnknownTokensChange: fn(),
    onPositionOpeningMethodChange: fn(),
    onSlippageChange: fn(),
    poolIndex: 0,
    progress: 'progress',
    reloadHandler: fn(),
    setMidPrice: fn(),
    ticksLoading: false,
    tickSpacing: 1 as any,
    tokens: {},
    xDecimal: 9 as any,
    yDecimal: 12 as any,
    hasTicksError: false,
    calcAmount: fn(),
    loadingTicksAndTickMaps: false,
    poolKey: '',
    noConnectedBlockerProps: {
      onConnect: fn(),
      descCustomText: 'Cannot add any liquidity.'
    },
    onRefresh: fn(),
    isBalanceLoading: false,
    shouldNotUpdatePriceRange: false,
    unblockUpdatePriceRange: fn(),
    isGetLiquidityError: false,
    onlyUserPositions: false,
    setOnlyUserPositions: fn(),
    network: Network.Testnet,
    varaBalance: 110832233990088 as any
  },
  render: args => <PrimaryComponent {...args} />
}

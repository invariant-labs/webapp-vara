import type { Meta, StoryObj } from '@storybook/react'
import SelectChainButton from './SelectChainButton'
import { fn } from '@storybook/test'
import { Chain } from '@store/consts/types'

const meta = {
  title: 'Buttons/SelectChainButton',
  component: SelectChainButton
} satisfies Meta<typeof SelectChainButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    activeChain: {
      name: Chain.Vara,
      address: 'https://vara.invariant.app/exchange'
    },
    chains: [
      { name: Chain.Vara, address: 'https://vara.invariant.app/exchange' },
      { name: Chain.Eclipse, address: 'https://eclipse.invariant.app/swap' }
    ],
    onSelect: fn(),
    disabled: false
  }
}

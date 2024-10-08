import type { Meta, StoryObj } from '@storybook/react'
import SelectNetworkButton from './SelectNetworkButton'
import { RPC } from '@store/consts/static'
import { action } from '@storybook/addon-actions'
import { Network } from '@invariant-labs/vara-sdk'

const meta = {
  title: 'Buttons/SelectNetworkButton',
  component: SelectNetworkButton
} satisfies Meta<typeof SelectNetworkButton>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    name: Network.Testnet,
    networks: [{ networkType: Network.Testnet, rpc: RPC.TEST }],
    onSelect: (networkType, rpc) => action('chosen: ' + networkType + ' ' + rpc)()
  }
}

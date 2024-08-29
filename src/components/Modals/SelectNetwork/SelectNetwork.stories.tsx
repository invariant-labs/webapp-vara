import type { Meta, StoryObj } from '@storybook/react'
import SelectNetwork from './SelectNetwork'
import { Network } from '@store/consts/static'

const meta = {
  title: 'Modals/SelectNetwork',
  component: SelectNetwork,
  args: {
    activeNetwork: Network.Testnet,
    anchorEl: null,
    handleClose: () => {},
    networks: [
      {
        networkType: Network.Testnet,
        rpc: 'https://testnet-mock.com',
        rpcName: 'Testnet'
      },
      {
        networkType: Network.Mainnet,
        rpc: 'https://mock.com',
        rpcName: 'Mainnet'
      }
    ],
    onSelect: () => {},
    open: true
  }
} satisfies Meta<typeof SelectNetwork>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}

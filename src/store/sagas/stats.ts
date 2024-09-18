import { actions } from '@store/reducers/stats'
import { actions as poolsActions } from '@store/reducers/pools'
import { networkType } from '@store/selectors/connection'
import { tokens } from '@store/selectors/pools'
import { address } from '@store/selectors/wallet'
import { getFullSnap, getTokenDataByAddresses } from '@utils/utils'
import { call, put, select, takeEvery } from 'typed-redux-saga'
import { getGRC20 } from './connection'
import { HexString } from '@gear-js/api'

export function* getStats(): Generator {
  try {
    const currentNetwork = yield* select(networkType)
    const walletAddress = yield* select(address)
    const grc20 = yield* getGRC20()

    const fullSnap = yield* call(getFullSnap, currentNetwork.toLowerCase())

    yield* put(actions.setCurrentStats(fullSnap))

    const allTokens = yield* select(tokens)

    const unknownTokens = new Set<HexString>()

    fullSnap.poolsData.forEach(({ tokenX, tokenY }) => {
      if (!allTokens[tokenX]) {
        unknownTokens.add(tokenX)
      }

      if (!allTokens[tokenY]) {
        unknownTokens.add(tokenY)
      }
    })

    const unknownTokensData = yield* call(
      getTokenDataByAddresses,
      [...unknownTokens],
      grc20,
      walletAddress as HexString
    )
    yield* put(poolsActions.addTokens(unknownTokensData))
  } catch (error) {
    console.log(error)
  }
}

export function* statsHandler(): Generator {
  yield* takeEvery(actions.getCurrentStats, getStats)
}

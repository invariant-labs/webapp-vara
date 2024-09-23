import { all, call, put, SagaGenerator, select, takeLeading, spawn, delay } from 'typed-redux-saga'
import { actions, Status, PayloadTypes } from '@store/reducers/connection'
import { actions as snackbarsActions } from '@store/reducers/snackbars'
import { PayloadAction } from '@reduxjs/toolkit'
import apiSingleton from '@store/services/apiSingleton'
import vftSingleton from '@store/services/vftSingleton'
import invariantSingleton from '@store/services/invariantSingleton'
import { FungibleToken, Invariant } from '@invariant-labs/vara-sdk'
import { GearApi } from '@gear-js/api'
import { networkType } from '@store/selectors/connection'

export function* getApi(): SagaGenerator<GearApi> {
  let api = yield* call([apiSingleton, apiSingleton.getInstance])

  if (!api) {
    const network = yield* select(networkType)

    api = yield* call([apiSingleton, apiSingleton.loadInstance], network)
  }
  return api
}

export function* getInvariant(): SagaGenerator<Invariant> {
  let invariant = yield* call([invariantSingleton, invariantSingleton.getInstance])

  if (!invariant) {
    const api = yield* call(getApi)

    invariant = yield* call([invariantSingleton, invariantSingleton.loadInstance], api)
  }
  return invariant
}

export function* getVft(): SagaGenerator<FungibleToken> {
  let vft = yield* call([vftSingleton, vftSingleton.getInstance])

  if (!vft) {
    const api = yield* call(getApi)
    vft = yield* call([vftSingleton, vftSingleton.loadInstance], api)
  }

  return vft
}

export function* initConnection(): Generator {
  try {
    yield* getApi()

    yield* put(
      snackbarsActions.add({
        message: 'Vara network connected.',
        variant: 'success',
        persist: false
      })
    )

    console.log('Vara network connected.')
    yield* put(actions.setStatus(Status.Initialized))
  } catch (error) {
    console.log(error)
    yield* put(actions.setStatus(Status.Error))
    yield put(
      snackbarsActions.add({
        message: 'Failed to connect to Vara network.',
        variant: 'error',
        persist: false
      })
    )
  }
}

export function* handleNetworkChange(action: PayloadAction<PayloadTypes['setNetwork']>): Generator {
  yield* delay(1000)

  yield* getApi()

  yield* put(
    snackbarsActions.add({
      message: `You are on network ${action.payload.networkType}${
        action.payload?.rpcName ? ' (' + action.payload.rpcName + ')' : ''
      }.`,
      variant: 'info',
      persist: false
    })
  )
}

export function* networkChangeSaga(): Generator {
  yield takeLeading(actions.setNetwork, handleNetworkChange)
}
export function* initConnectionSaga(): Generator {
  yield takeLeading(actions.initVaraConnection, initConnection)
}
export function* connectionSaga(): Generator {
  yield* all([networkChangeSaga, initConnectionSaga].map(spawn))
}

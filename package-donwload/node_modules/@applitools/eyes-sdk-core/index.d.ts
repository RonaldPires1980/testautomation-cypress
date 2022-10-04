import type * as types from '@applitools/types'
export {makeServer as makeExecutionGridClient} from '@applitools/execution-grid-client'

export function makeSDK<TDriver, TContext, TElement, TSelector>(options: {
  name: string
  version: string
  cwd?: string
  spec: types.SpecDriver<TDriver, TContext, TElement, TSelector>
  VisualGridClient: any
}): types.Core<TDriver, TElement, TSelector>

export {Core} from '@applitools/types'

export const TestResultsFormatter: any

export function checkSpecDriver<TDriver, TContext, TElement, TSelector>(options: {
  spec: types.SpecDriver<TDriver, TContext, TElement, TSelector>,
  driver: TDriver
}): Promise<any>

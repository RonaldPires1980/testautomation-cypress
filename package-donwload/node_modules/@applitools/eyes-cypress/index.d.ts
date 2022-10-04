/// <reference types="cypress" />

import type * as types from '@applitools/types'
import type * as api from '@applitools/eyes-api'

type MaybeArray<T> = T | T[]

type LegacyRegion = {left: number; top: number; width: number; height: number}
type Selector = {selector: string; type?: 'css' | 'xpath', nodeType?: 'element' | 'shadow-root'} | 'string'
type Element = HTMLElement | JQuery<HTMLElement>

interface CypressCheckSettings extends types.CheckSettings<Element, Selector> {
  tag?: CypressCheckSettings['name']

  target?: 'window' | 'region'
  selector?: Selector
  element?: Element

  ignore?: MaybeArray<CypressCheckSettings['ignoreRegions'][number] | LegacyRegion>
  layout?: MaybeArray<CypressCheckSettings['layoutRegions'][number] | LegacyRegion>
  content?: MaybeArray<CypressCheckSettings['contentRegions'][number] | LegacyRegion>
  strict?: MaybeArray<CypressCheckSettings['strictRegions'][number] | LegacyRegion>
  floating?: MaybeArray<CypressCheckSettings['floatingRegions'][number] | (({element: Element} | Selector | LegacyRegion) & {maxUpOffset?: number; maxDownOffset?: number; maxLeftOffset?: number; maxRightOffset?: number})>
  accessibility?: MaybeArray<CypressCheckSettings['accessibilityRegions'][number] | (({element: Element} | Selector | LegacyRegion) & {accessibilityType?: types.AccessibilityRegionType})>

  scriptHooks?: CypressCheckSettings['hooks']
}

interface CypressEyesConfig extends types.EyesConfig<Element, Selector> {
  browser?: MaybeArray<CypressEyesConfig['browsersInfo'][number] | {deviceName: string; screenOrientation?: types.ScreenOrientation; name?: string}>

  batchId?: CypressEyesConfig['batch']['id']
  batchName?: CypressEyesConfig['batch']['name']
  batchSequence?: CypressEyesConfig['batch']['sequenceName']
  notifyOnCompletion?: CypressEyesConfig['batch']['notifyOnCompletion']

  envName?: CypressEyesConfig['environmentName']

  ignoreCaret?: CypressEyesConfig['defaultMatchSettings']['ignoreCaret']
  matchLevel?: CypressEyesConfig['defaultMatchSettings']['matchLevel']
  accessibilitySettings?: CypressEyesConfig['defaultMatchSettings']['accessibilitySettings']
  ignoreDisplacements?: CypressEyesConfig['defaultMatchSettings']['ignoreDisplacements']
}

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Create an Applitools test.
       * This will start a session with the Applitools server.
       * @example
       * cy.eyesOpen({ appName: 'My App' })
      */
      eyesOpen(config?: CypressEyesConfig): null

      /**
       * Generate a screenshot of the current page and add it to the Applitools Test.
       * @example
       * cy.eyesCheckWindow()
       *
       * OR
       *
       * cy.eyesCheckWindow({
       *  target: 'region',
       *  selector: '.my-element'
       * });
      */
      eyesCheckWindow(tag?: string): null
      eyesCheckWindow(settings?: CypressCheckSettings): null

      /**
       * Close the applitools test and check that all screenshots are valid.
       * @example cy.eyesClose()
      */
      eyesClose(): null

      /**
       * Returns an object with the applitools test results from a given test / test file. This should be called after close.
       * @example
       * after(() => {
       *  cy.eyesGetAllTestResults().then(summary => {
       *    console.log(summary)
       *  })
       * })
       */
      eyesGetAllTestResults(): Chainable<api.TestResultsSummary>
    }
  }
}
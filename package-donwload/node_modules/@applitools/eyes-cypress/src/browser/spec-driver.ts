type EyesSelector = {selector: string; type?: string}
export type Selector = (string | EyesSelector) & {__applitoolsBrand?: never};
export type Context = Document & {__applitoolsBrand?: never};
export type Element = HTMLElement & {__applitoolsBrand?: never};

export function executeScript(context: Context, script: string, arg: any): any {     

      let scriptToExecute;
      if (
        script.includes('dom-snapshot') ||
        script.includes('dom-capture') ||
        script.includes('dom-shared')
        ) {
            scriptToExecute = script
        } else {
            const prepScirpt = script.replace('function(arg)', 'function func(arg)')
            scriptToExecute = prepScirpt.concat(' return func(arg)')
        }

        const executor = new context.defaultView.Function('arg', scriptToExecute);
        return executor(arg)
}

export function mainContext(): Context {
  //@ts-ignore
  return cy.state('window').document
}

export function parentContext(context: Context): Context {
  // because Cypress doesn't support cross origin iframe, then childContext might return null, and then the input to parentContext might be null
  if (!context) {
    throw new Error('Context is not accessible')
  }; 
  
  return context === mainContext() ? context : context.defaultView.frameElement.ownerDocument
}

export function childContext(_context: Context, element: HTMLIFrameElement): Context {
  if(element.contentDocument)
    return element.contentDocument
  else {
    throw new Error('Context is not accessible')
  }
}

export function getViewportSize(): Object {
  //@ts-ignore
  const currWindow = cy.state('window')
  const viewportSize = {
    width: Math.max(currWindow.document.documentElement.clientWidth || 0, currWindow.innerWidth || 0),
    height: Math.max(currWindow.document.documentElement.clientHeight || 0, currWindow.innerHeight || 0)
  };
  return viewportSize;
}

export function setViewportSize(vs: any): void {
  //@ts-ignore
  Cypress.action('cy:viewport:changed', { viewportWidth: vs.size.width, viewportHeight: vs.size.height });
}

export function transformSelector(selector: Selector): Selector {
  if (selector.hasOwnProperty('selector') && (!selector.hasOwnProperty('type') || (selector as EyesSelector).type === 'css')) {
    return (selector as EyesSelector).selector
  } 
  return selector
}

export function findElement(context: Context, selector: Selector, parent?: Element) {
  const eyesSelector = (selector as EyesSelector)
  const root = parent ?? context
  const sel = typeof selector === 'string' ? selector : eyesSelector.selector
  if (typeof selector !== 'string' && eyesSelector.type === 'xpath') {
    return context.evaluate(sel, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  } else {
    return root.querySelector(sel)
  }
}

export function findElements(context: Context, selector: Selector, parent: Element){
  const eyesSelector = (selector as EyesSelector)
  const root = parent ?? context
  const sel = typeof selector === 'string' ? selector : eyesSelector.selector
  if (typeof selector !== 'string' && eyesSelector.type === 'xpath') {
    const results = [];
    const queryResult = document.evaluate(sel, context,
        null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < queryResult.snapshotLength; i++) {
        results.push(queryResult.snapshotItem(i));
    }
    return results;
  } else {
    return root.querySelectorAll(sel)
  }
}

export function getTitle(context: Context): string {
  return context.title
}

export function getUrl(context: Context): string {
  return context.location.href
}

export function getCookies(): Array<any> {
  //@ts-ignore
  return Cypress.automation('get:cookies', {})
}


// export function takeScreenshot(page: Driver): Promise<Buffer>;

// export function visit(page: Driver, url: string): Promise<void>; (??)

// export function isStaleElementError(err: any): boolean;
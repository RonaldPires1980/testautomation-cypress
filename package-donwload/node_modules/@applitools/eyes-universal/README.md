# Eyes Universal
<center>

  ![Applitools Eyes](https://i.ibb.co/3hWJK68/applitools-eyes-logo.png)

  [![npm](https://img.shields.io/npm/v/@applitools/eyes-universal?color=%2302afc2&label=npm&logo=npm)](https://www.npmjs.com/package/@applitools/eyes-universal)
  [![GitHub release (latest by date)](https://img.shields.io/badge/binaries-download-%2302afc2?logo=github)](https://github.com/applitools/eyes.sdk.javascript1/releases)

</center>

- [Eyes Universal](#eyes-universal)
  - [Introduction](#introduction)
  - [WebSocket](#websocket)
    - [Universal SDK messaging protocol](#universal-sdk-messaging-protocol)
      - [Request format](#request-format)
      - [Response format](#response-format)
      - [Event format](#event-format)
    - [Client-initiated events](#client-initiated-events)
      - [Session.init](#sessioninit)
    - [Client-initiated commands](#client-initiated-commands)
      - [Core.makeManager](#coremakemanager)
      - [EyesManager.openEyes](#eyesmanageropeneyes)
      - [EyesManager.closeManager](#eyesmanagerclosemanager)
      - [Eyes.check](#eyescheck)
      - [Eyes.locate](#eyeslocate)
      - [Eyes.extractTextRegions](#eyesextracttextregions)
      - [Eyes.extractText](#eyesextracttext)
      - [Eyes.close](#eyesclose)
      - [Eyes.abort](#eyesabort)
      - [Core.getViewportSize](#coregetviewportsize)
      - [Core.setViewportSize](#coresetviewportsize)
      - [Core.closeBatches](#coreclosebatches)
      - [Core.deleteTest](#coredeletetest)
    - [Server-initiated commands](#server-initiated-commands)
  - [SpecDriver](#specdriver)
    - [Utility commands](#utility-commands)
      - [`isDriver`](#isdriver)
      - [`isElement`](#iselement)
      - [`isSelector`](#isselector)
      - [`transformDriver`](#transformdriver)
      - [`transformElement`](#transformelement)
      - [`extractSelector`](#extractselector)
      - [`isStaleElementError`](#isstaleelementerror)
      - [`isEqualElements`](#isequalelements)
    - [Core commands](#core-commands)
      - [`mainContext`](#maincontext)
      - [`parentContext`](#parentcontext)
      - [`childContext`](#childcontext)
      - [`executeScript`](#executescript)
      - [`findElement`](#findelement)
      - [`findElements`](#findelements)
      - [`getDriverInfo`](#getdriverinfo)
      - [`getOrientation`](#getorientation)
      - [`getTitle`](#gettitle)
      - [`getUrl`](#geturl)
      - [`takeScreenshot`](#takescreenshot)
      - [`getElementRect`](#getelementrect)
      - [`setWindowSize`](#setwindowsize)
      - [`getWindowSize`](#getwindowsize)
      - [`setViewportSize`](#setviewportsize)
      - [`getViewportSize`](#getviewportsize)
  - [Refer](#refer)
    - [Refer storage](#refer-storage)
    - [Reference format](#reference-format)
    - [Reference usage](#reference-usage)
  - [API](#api)


## Introduction
The main purpose of client implementation (*Client*) is to provide a language binding for the functionality core implemented in JavaScript (*Server*). *Server* controls everything, and *Client* doesn't need to know anything about how work is done.

For the *Client* to be able to communicate with the *Server* it has to implement [WebSocket Client](#WebSocket) communication layer. Through the WebSocket channel *Client* could send commands to the *Server* in order to perform any operations, at the same time *Server* will send commands to the *Client* in order to automate an environment. *Client* has to implement a set of commands ([SpecDriver](#SpecDriver)) and perform those commands when *Server* will ask for it. Since the execution of any command requires knowing about the context this command should be executed in, *Client* should pass some context references to the *Server*. To solve this problem *Client* have to implement a [Refer](#Refer) mechanism. Refer should help *Client* to send non-serializable data to the server, and when this data will be received back from the server easily deref it to the original non-serializable object.

In case of using WebDrive based framework on the *Client*, implementation of a ([SpecDriver](#SpecDriver)) could be avoided as well as a [Refer](#Refer)  implementation. This simplification could be achieved by providing information about WebDriver automation session instead of the driver, also it requires to provide element ids instead of the elements. Since all of the non-serializable objects are replaced with a serializable data object the need in [Refer](#Refer) is eliminated.

The biggest part of the client implementation is the actual user-facing [API layer](#API), it should not contain any specific logic, but only perform some input data validation, collecting, and processing before these data will be sent to the server. API layer should not have any binding to the automation framework it should be used with, it will help to re-use API layer for different frameworks.

## WebSocket
The client-server architecture of the universal sdk requires an implementation of the communication layer between the *Client* and the *Server*. Because of a major need for bidirectional communication, WebSocket protocol was chosen. WebSocket protocol operates only with messages, and each of those is an independent chunk of data. The protocol doesn't support getting a response on a message. This is why the format of communication is determined by a proprietary request-response messaging interface (*Universal SDK messaging protocol*), which requires a specific format of client-server messages.

All of the commands should be treated as requests, which means that response is always has to be sent after a request is received. But simple events are also allowed by the *Universal SDK messaging protocol*, which means that *Client*, as well as *Server*, could send a message which doesn't require any response.

Reference implementation: [JS implementation](https://github.com/applitools/eyes.sdk.javascript1/blob/1a54c6b3f28b25b41a708f5b600ceabbf8fc9db6/packages/eyes-universal/src/socket.js), [Ruby implementation](https://github.com/applitools/eyes.sdk.javascript1/blob/poc/universal-ruby-sdk/rb/eyes-selenium/lib/applitools/socket.rb)

## Running the universal server
A client wishing to spawn the universal server and communicate with it should know the port on which the server is listening to incoming WebSocket requests. The way to know the port is by consuming the first line of the output to the server's `stdout` stream. This line will be the port number to use in `ws://localhost:{port}/eyes`, for example if this line is `21077`, then the URL to connect to the server is `ws://localhost:21077/eyes`.

When spawning the server, there might be a situation of a conflict - a universal server may already be running at the desired port. When this happens, the universal server attempts a "handshake" with the process that listens on `port`. If there is another universal server **of the same version** listening on the port, and `singleton` is specified (that's the default, see [CLI arguments](#cli-arguments) below), then the universal server process will write the `port` to stdout, and shutdown itself. **To the client, this is seamless** - the client doesn't have a way to know if the process it spawned is indeed the same process that is listening on this port.

If the handshake fails, meaning that there is no universal-server or that it's a universal server of a different version, then the behavior is defined by the value of the `lazy` argument. By default, `lazy` is `true` which means that the server will try to find a free port to listen on. If `lazy` is `false`, then the server process will exit with a non-zero code.

### CLI arguments

```
$ ./universal-server-linux --help

Options:
      --help          Show help                                        [boolean]
      --version       Show version number                              [boolean]
  -p, --port          run server on a specific port.   [number] [default: 21077]
  -s, --singleton     runs server on a singleton mode. It will prevent the
                      server to start in case the same server is already
                      started.                         [boolean] [default: true]
  -l, --lazy          runs server on a lazy mode. It will not try to find a free
                      port if the required one is already taken.
                                                      [boolean] [default: false]
      --idle-timeout  time in minutes for server to stay responsible in case of
                      idle.                               [number] [default: 15]
      --config        json string to use instead of cli arguments       [string]
      --eg            launch the execution grid client[boolean] [default: false]

```

### Universal SDK messaging protocol
The protocol describes the format of messages of different types such as [Request](#Request-format), [Response](#Response-format), and [Event](#Event-format). Each of the messages should be formatted as a JSON string.

> **`IDEA`** maybe it makes sense to also support something like UBJSON, it might be helpful in order to send screenshots from *Client* without conversion to the base64 string, which is an obvious overhead.

Both client an server operate with their own sets of non-serializable object, which have to be somehow sent through the WebSocket. On client non-serializable objects are drivers, elements, and maybe selectors, at the same time server operates with runner and eyes abstractions. The protocol describes a generic way to represent non-serializable objects (for client, as well as for server) through the separate module [Refer](#Refer) with a strict patter and format of references.

#### Request format
```ts
{
  name: string, // could be any string, but recommended format is "<Domain>.<requestName>" (e.g. "Driver.executeScript")
  key: string, // could be any random string, this value will be used to associate response with actual request.
  payload?: any // any input data
}
```

#### Response format
```ts
{
  name: string, // name of the request this response sent for
  key: string, // key value received in request
  payload: {
    result?: any, // result of the request if it was finished successfully
    error?: { // error object if exception was thrown during action processing
      message: string // error massage
      stack: string // error stack trace
    }
  }
}
```

#### Event format
```ts
{
  name: string, // could be any string, but recommended format is "<Domain>.<eventName>"
  payload?: any // any event data
}
```

### Client-initiated events
In order to pass some data to the *Server* and let *Server* process it on its own *Client* could send lightweight events ([Event format](#Event-format)), which will not be responded in any way.

#### Session.init
This event has to be sent in the first place just after a connection between *Client* and *Server* will be established. *Client* should send an important metadata about itself in a format:
```ts
{
  name: string, // name of the client sdk
  version: string, // version of the client sdk
  commands?: string[], // array of command names that could be processed by the client sdk
  protocol?: 'webdriver' // the name of the prebuilt server-side spec driver
}
```

### Client-initiated commands
In order to perform any action, the *Client* has to send a proper request to the *Server* in a specific format ([Request format](#Request-format)) and wait for the response in a format described here ([Response format](#Response-format)).

#### Core.makeManager
This request should be sent to create a manager object. It expects input of type [EyesManagerConfig](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/config.ts#L19).

In response client should expect to get a manager reference ([ManagerRef](#Reference-format)), this reference has to be used in order to perform manager related actions ([EyesManager.openEyes](#EyesManager.openEyes), [EyesManager.closeManager](#EyesManager.closeManager))

> Do not send this command in a moment when `EyesManager` is constructed but instead send it lazily when the actual eyes object has to be opened. Pay attention that in this architecture eyes could be created only from a manager instance, and creation and opening of the eyes are combined in a single operation.

#### EyesManager.openEyes
This command has to be used in order to create an eyes object. It expects input with related [ManagerRef](#Reference-format) (from [Core.makeManager](#Core.makeManager)), [DriverRef](#Reference-format), and [EyesConfig](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/config.ts#L25) in a format:
```ts
{
  manager: ManagerRef, // reference received from "Core.makeManager" command
  driver: DriverRef, // reference to the driver that will be used by the server in order to perform automation
  config?: EyesConfig // configuration object that will be associated with a new eyes object, it could be overridden later
}
```

In response client should expect to get an eyes reference ([EyesRef](#Reference-format)), this reference has to be used in eyes related requests ([Eyes.check](#Eyes.check), [Eyes.locate](#Eyes.locate), [Eyes.extractTextRegions](#Eyes.extractTextRegions), [Eyes.extractText](#Eyes.extractText), [Eyes.close](#Eyes.close), [Eyes.abort](#Eyes.abort))

#### EyesManager.closeManager
This command is meant to be used to close all eyes objects created with this runner, abort unclosed test, and return a summary with results, and exceptions from each of the eyes objects. It expects an input with a related [ManagerRef](#Reference-format) (from [Core.makeManager](#Core.makeManager) and a `throwErr` property:
```ts
{
  manager: ManagerRef
  throwErr: boolean
}
```

In response client will receive a summary object of the shape [TestResultSummary](https://github.com/applitools/eyes.sdk.javascript1/blob/1221f4e36ca2fbf5f49dfee5d32504c6bc574c9b/packages/types/src/data.ts#L285)

This command might throw an error if `throwErr` is `true`. The following JavaScript snippet shows how to handle such error:

```
catch (err) {

  // if it's some internal error that is not mapped to a known state - throw it to the user
  if (!err.info?.testResult) {
    throw err
  }

  // wrap the testResult in the error with a data class 
  const testResult = new TestResultsData(err.info.testResult, deleteTest)

  // throw the right instance of error based on the reason
  if (err.reason === 'test failed') {
    throw new TestFailedError(err.message, testResult)
  } else if (err.reason === 'test different') {
    throw new DiffsFoundError(err.message, testResult)
  } else if (err.reason === 'test new') {
    throw new NewTestError(err.message, testResult)
  }
}
```

#### Eyes.check
This command is used to perform a check/match action. It expects input with a related [EyesRef](#Reference-format), [CheckSettings](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/setting.ts#L66), and [EyesConfig](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/config.ts#L25) in a format:
```ts
{
  eyes: EyesRef,
  settings?: CheckSettings,
  config?: EyesConfig
}
```

In a case of success, the client will receive a response with [MatchResult](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/data.ts#L200) object.

#### Eyes.locate
This command is used to perform a locate action. It expects input with a related [EyesRef](#Reference-format), [LocateSettings](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/setting.ts#L92), and [EyesConfig](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/config.ts#L25) in a format:
```ts
{
  eyes: EyesRef,
  settings: LocateSettings,
  config?: EyesConfig
}
```

In a case of success, the client will receive a response with an object where locator names, passed in [LocateSettings](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/setting.ts#L92), are correlated with [Region](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/data.ts#L59)'s.
```ts
{
  [key: string]: Region
}
```

#### Eyes.extractTextRegions
This command has to be used to extract text regions from a page. It expects input with a related [EyesRef](#Reference-format), [OCRSearchSettings](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/setting.ts#L85), and [EyesConfig](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/config.ts#L25) in a format:
```ts
{
  eyes: EyesRef,
  settings: OCRSearchSettings,
  config?: EyesConfig
}
```

In a case of success, the client will receive a response with an object where patterns, passed in [OCRSearchSettings](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/setting.ts#L85), are correlated with arrays of [TextRegion](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/data.ts#L61)'s.

```ts
{
  [key: string]: TextRegion[]
}
```

#### Eyes.extractText
This command has to be used to extract text regions from a page. It expects input with a related [EyesRef](#Reference-format), array of [OCRExtractSettings](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/setting.ts#L78)'s, and [EyesConfig](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/config.ts#L25) in a format:
```ts
{
  eyes: EyesRef,
  regions: OCRExtractSettings[],
  config?: EyesConfig
}
```

In a case of success, the client will receive a response with arrays of strings.

#### Eyes.close
This command has to be used in order to close eyes object and finish the test. It doesn't expect any input except a related [EyesRef](#Reference-format).
```ts
{
  eyes: EyesRef
}
```

In a case of success, the client will receive a response with [TestResult](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/data.ts#L205) object.

> This command will never throw error due to test result status. This functionality should be implemented on client side.

#### Eyes.abort
This command has to be used to abort eyes object. It doesn't expect any input except a related [EyesRef](#Reference-format).
```ts
{
  eyes: EyesRef
}
```

In a case of success, the client will receive a response with [TestResult](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/data.ts#L205) object.

#### Core.getViewportSize
This command has to be used to get the current viewport size of the given driver. It expects input with [DriverRef](#Reference-format) in a format: 
```ts
{
  driver: DriverRef
}
```

In case of success, the client will receive a response with [Size](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/data.ts#L54) object.

> WD protocol doesn't have api to extract viewport size of the browser window, however Appium has this api as well as CDP. So even if it is doesn't make lots of sense to get this information through the server, better do it this way so server could know about this data.

#### Core.setViewportSize
This command has to be used to set the current viewport size of the given driver which automates desktop browser window. If this command will be executed for driver which doesn't support viewport resizing error will be thrown. Also error will be thrown if it isn't possible to resize viewport to the required size. The command expects input with [DriverRef](#Reference-format) and [Size](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/data.ts#L54) in a format:
```ts
{
  driver: DriverRef,
  size: Size
}
```

#### Core.closeBatches
This command has to be used to close batches by their ids. It expects input of type [CloseBatchesSettings](https://github.com/applitools/eyes.sdk.javascript1/blob/0eec1b760d07489f62d95b9441d0ee5c560c24a1/packages/types/src/setting.ts#L97)

#### Core.deleteTest
This command has to be used to close delete test results from the eyes dashboard.

### Server-initiated commands
*Server* has to send a request to the *Client* in order to perform automation using driver api. It will be done through the special interface (a.k.a. [SpecDriver](#SpecDriver)) which abstracts out any framework specifics. Requests which *Server* could possibly send to the client limited only with a set of the [SpecDriver](#SpecDriver) commands.

Since [SpecDriver](#SpecDriver) has a various number of commands, where some of the commands contradict others, *Server* should know the exact set of commands which it could send to the *Client*, this information should be passed in [Session.init](#Session.init) event.

Each [SpecDriver](#SpecDriver) command will be received as request with name `"Driver.<commandName>"`, for example to call [findElement](#findElement) command *Server* will send `"Driver.findElement"` request to the *Client*. Arguments of the [SpecDriver](#SpecDriver) command will be sent in payload, as an object where keys has the same names as arguments, for example to call [findElement](#findElement) command *Server* will send a payload with keys `driver` and `selector`. Result of the [SpecDriver](#SpecDriver) command has to be sent by the *Client* as a payload in the response message.

## SpecDriver
Spec driver is a simple set of functions where each function performs automation by calling framework (e.g. selenium) API. We need this interface between our code and an actual driver to abstract out framework api.

Down below is a list with descriptions of every method that could be implemented in the spec driver, but the need for implementation depends on the framework.

### Utility commands

#### `isDriver`
This command accepts driver instance as an argument and should return `true` if this is a valid driver instance, otherwise `false`.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L32)

#### `isElement`
This command accepts element as an argument and should return `true` if this is a valid element, otherwise `false`.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L36), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L6)

#### `isSelector`
This command accepts selector as an argument and should return `true` if this is a valid selector, otherwise `false`. Valid selectors should be one of three formats:

1. The one supported by the framework (e.g. `By.css('html')` for selenium)
2. JSON object with properties `type` with value `"css"` or `"xpath"` and `selector` with string value.
3. Simple string, if the framework doesn't handle strings by itself, then the string should be treated as css selector.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L38)

#### `transformDriver`
This command is used only once for the driver in order to do some modifications or even replacements in a given driver instance. It might be helpful when some additional configuration is required before start working with the driver. If this method implemented whenever will be returned from it will be used instead of the driver.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L47)

#### `transformElement`
This command is used to transform elements before using them (e.g. as `executeScript` argument). It accepts a value that has to be treated as an element, but the framework itself can't handle this value on its own. Some frameworks might support more than one element format, and these formats might be not equal in terms of usage.

> How to understand to which format you should transform? The correct way to understand which format is superior on others you should check which one works the best in those commands [executeScript](###executeScript) and [childContext](###childContext).

Reference: [TS WDIO](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-webdriverio-5/src/spec-driver.ts#L100)

#### `extractSelector`
This command is used to extract a selector from an element object. Not all frameworks keep information about the selector which was used to find an element, but if does it will help to handle some edge cases with stale element errors.

Reference: [TS WDIO](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-webdriverio-5/src/spec-driver.ts#L104)

#### `isStaleElementError`
This command is used to understand if an error is a stale element error, it accepts an error object and should return `true` if the error is thrown because of element reference was stale.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L55)

#### `isEqualElements`
This command is used to understand if two element objects are references to the same element on a web page (or in a native app), should return `true` if elements are the same.

> **`WD!`** Elements could be compared by their IDs, since by the protocol specification element ID should be unique across all of the frames and the same for the same element, however not all WD implementation keep that rule (e.g. iOS Safari). In this case, elements could be compared in a browser by executing a script with those elements which will compare them, if a stale element error will be thrown, elements are obviously not equivalent.

Reference: [TS WDIO](https://github.com/applitools/eyes.sdk.javascript1/blob/eyes-api/packages/eyes-webdriverio-5/src/spec-driver.ts#L112)

### Core commands
Each command in this section accepts driver/context as a first argument.

#### `mainContext`
This command is used to get access to the main/top-level frame from the current/given frame.

> **`WD!`** This command has to change driver's current frame to the topmost frame, and not necessarily return driver.

> **`CDP!`** This command has to return the topmost (the one which doesn't have a parent) frame in a hierarchy from the given frame.

References: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L78), [TS Playwright](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-playwright/src/spec-driver.ts#L67), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L21)

#### `parentContext`
This command is used to get access to the parent frame of the current/given frame.

> **`WD!`** This command has to change driver's current frame to the parent frame of the current frame, and not necessarily return driver. Legacy implementations of some frameworks (e.g. selenium 3, wdio 4) don't have a dedicated api for this functionality, in this case, the only way to perform the action is by sending a request to the endpoint by yourself ([WD Spec](https://www.w3.org/TR/webdriver/#switch-to-parent-frame)).

> **`CDP!`** This command have to return the parent frame (previous in a hierarchy) of the given frame.

References: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L82), [TS Playwright](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-playwright/src/spec-driver.ts#L75), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L25)

#### `childContext`
This command is used to get access to the child frame of the current/given frame by **element** which refer to the target iframe.

> **`WD!`** This command has to change driver's current frame to the child frame using given element, and not necessarily return driver.

> **`CDP!`** This command has to return the content frame of the given element, parent frame is still provided in arguments, but the protocol doesn't require to use of it.

References: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L91), [TS Playwright](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-playwright/src/spec-driver.ts#L79), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L29)

#### `executeScript`
This command executes a given script of type string with given arguments in a given context.

> **`CDP!`** The protocol is not able to execute scripts that are not function declaration, this means that just function body or JS expression are not valid scripts, for example `return document. title`, has to be transformed to `function(){ return document.title }`.

References: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L71), [TS Playwright](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-playwright/src/spec-driver.ts#L62), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L14)

#### `findElement`
This command finds element by a given selector in a given context. If an element doesn't exist, `null` should be returned (**do not throw**). See [isSelector](###isSelector) command for selector formats.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L95), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L33)

#### `findElements`
This command finds multiple elements by a given selector in a given context. If no elements don't exist, an empty array (`[]`) should be returned. See [isSelector](###isSelector) command for selector formats.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L103), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L37)

#### `getDriverInfo`
This command is used to extract information about the driver and environment in the very beginning. Keep in mind that not all of the properties are required.

Here is a schema of the JSON object this method should return.
```ts
{
  sessionId?: string, // aut session id
  isMobile?: boolean, // true if the environment is a mobile device (e.g. os is android or ios), this doesn't necessarily mean a native app is tested
  isNative?: boolean, // true if the environment is a native app (so no browser)
  deviceName?: string, // device name
  platformName?: string, // os name
  platformVersion?: string, // os version
  browserName?: string, // browser name
  browserVersion?: string, //browser version
}
```

> In fact if your framework doesn't support native apps automation the whole method could be skipped, in this case, data will be extracted from a user agent, but better implement it, if possible. All of the information is contained in the capabilities of the driver. In the future, we might want to provide more information here.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L155)

#### `getOrientation`
This command is not required if the framework doesn't support native apps automation. This command should return `"landscape"` or `"portrait"` strings in **lowercase** depends on device orientation.

> If the framework supports device rotation in runtime, then orientation should also be extracted in runtime and not from capabilities. ([Appium spec](https://appium.io/docs/en/commands/session/orientation/get-orientation/))

Reference: [TS WDIO](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-webdriverio-5/src/spec-driver.ts#L220)

#### `getTitle`
This command should return the title of the page.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L179), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L54)

#### `getUrl`
This command should return the current url of the page.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L182), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L58)

#### `takeScreenshot`
This command should use the default framework api to take a screenshot of the viewport (**without any stabilization**). The result should be returned as base64 encoded string.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L188), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L74)

#### `getElementRect`
This command is used to get metrics of the **native** element only. This command will not be used for the web, since a more complex algorithm is required. The result should be returned as a JSON object with properties `x`, `y`, `width` and `height`, values should remain fractional, no rounding is required.

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L106)

#### `setWindowSize`
This command should set window size from a given JSON object with properties `width` and `height`. The command have to also set window position to (0,0) in order to archive the maximum possible window size to be set.
This command should not be implemented if [setViewportSize](###setViewportSize) is already implemented.

> **`WD!`** Legacy implementations of selenium don't allow to set size and position with a single method, in this case, they should be set separately.

> **`CDP!`** Protocol doesn't support window manipulations, but instead alow viewport manipulations, have a look at [setViewportSize](###setViewportSize).

Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/77fa7c7083d0c673acee3b203b1d0b1a7e972575/packages/eyes-selenium/src/spec-driver.ts#L123), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L45)

#### `getWindowSize`
This command should return the size of the window in the format of the JSON object with properties `width`, and `height`.
The command **have** to be implemented if [setWindowSize](###setWindowSize) was implemented, and could be skipped if [setViewportSize](###setViewportSize) was implemented.

> **`WD!`** Modern implementations of selenium don't have an api to get window size, but api to get window rect could be used instead.

> **`APPIUM!`** Legacy versions of appium servers could not treat well command to get window rect, in this case command to get window size should be sent.

> **`CDP!`** Protocol doesn't support window manipulations, but instead alow viewport manipulations, have a look at [getViewportSize](###getViewportSize).


Reference: [TS Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-selenium/src/spec-driver.ts#L112), [Ruby Selenium](https://github.com/applitools/eyes.sdk.javascript1/blob/24c660e3cc7504d0547901f67a467324c45b2f25/rb/eyes-selenium/lib/applitools/selenium/spec-driver.rb#L41)

#### `setViewportSize`
This command should set viewport size from given JSON object with properties `width` and `height`.

> **`WD!`** Protocol doesn't allow to manipulate viewport directly. Implement [setWindowSize](###setWindowSize) and [getWindowSize](###getWindowSize) instead.

Reference: [TS Playwright](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-playwright/src/spec-driver.ts#L98)

#### `getViewportSize`
This command should return the size of the viewport in the format of the JSON object with the properties `width` and `height`. This command does not necessarily have to be implemented, since viewport size could be extracted from the browser, but if it is possibly better to have it implemented since the framework could already have this information.

> **`WD!`** Protocol doesn't allow to manipulate viewport directly. Implement [setWindowSize](###setWindowSize) and [getWindowSize](###getWindowSize) instead.

Reference: [TS Playwright](https://github.com/applitools/eyes.sdk.javascript1/blob/864f0ebfec04dd370631de1703817e098faa55b8/packages/eyes-playwright/src/spec-driver.ts#L95)

## Refer
The most important objects that sdk has to operate with are non-serializable (e.g. driver object, eyes instantiation) and could not be sent through the WebSocket protocol. It requires to implementation of a generic way for non-serializable object representation. Down below will be described a way that have to be used to create references on both client and server sides.

Reference implementation: [JS implementation](https://github.com/applitools/eyes.sdk.javascript1/blob/1a54c6b3f28b25b41a708f5b600ceabbf8fc9db6/packages/eyes-universal/src/refer.js), [Ruby implementation](https://github.com/applitools/eyes.sdk.javascript1/blob/poc/universal-ruby-sdk/rb/eyes-selenium/lib/applitools/refer.rb)

### Refer storage
Refer should have a key-value storage with each object reference was crated for. Keys in the storage are guids were used in the reference object. Objects should be removed from the storage, once they will not be in use anymore. The storage should support relations between different references, means that presence of some references should depend on presence of others (e.g. it doesn't make sense to keep elements in storage when driver was already destroyed.

### Reference format
Each ref is a JSON object with only one property `applitools-ref-id` with a guid string value.

```ts
{
  'applitools-ref-id': string
}
```

How ever ref interface could be extended in some cases to provide more data about the object it referring to, for example it makes sense to add information about the selector to the element references, it will allow to avoid back and forth communication with the server in some rare cases.

### Reference usage
On the client-side received from the server references (from commands [Core.makeManager](#Core.makeManager) and [EyesManager.openEyes](#EyesManager.openEyes)) could be used only to perform other server-side actions related to the object these references referring to. However, references which client sends to the server inevitably will be received back in one of the [Server-initiated commands](#Server-initiated-commands), in this case client should dereference received reference an perform required operation with actual object.

## API
The API layer is the biggest part of the client implementation which should abstract the way end-user will use an sdk from the internal implementation. The main functional purpose of this layer should be to collect all of the configuration and inputs from a user and send them when actual action should be done. The biggest benefit of this architecture is that API (the biggest and the most chaotic part of the sdk) shouldn't be re-implemented again and again for each new framework.

Reference implementation: [TS Eyes API](https://github.com/applitools/eyes.sdk.javascript1/tree/eyes-api/packages/eyes-api)

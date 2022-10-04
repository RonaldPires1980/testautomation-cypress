'use strict'
/* eslint-disable max-len */

exports.checkSpecDriver = require('@applitools/driver/dist/debug').checkSpecDriver
exports.makeSDK = require('./lib/new/sdk')

// config
exports.AccessibilityMatchSettings = require('./lib/config/AccessibilityMatchSettings')
exports.BatchInfo = require('./lib/config/BatchInfo')
exports.Configuration = require('./lib/config/Configuration')
exports.ExactMatchSettings = require('./lib/config/ExactMatchSettings')
exports.FloatingMatchSettings = require('./lib/config/FloatingMatchSettings')
exports.ImageMatchSettings = require('./lib/config/ImageMatchSettings')
exports.PropertyData = require('./lib/config/PropertyData')
exports.ProxySettings = require('./lib/config/ProxySettings')

// errors
exports.EyesError = require('./lib/errors/EyesError')
exports.DiffsFoundError = require('./lib/errors/DiffsFoundError')
exports.NewTestError = require('./lib/errors/NewTestError')
exports.TestFailedError = require('./lib/errors/TestFailedError')

// geometry
exports.Location = require('./lib/geometry/Location')
exports.RectangleSize = require('./lib/geometry/RectangleSize')
exports.Region = require('./lib/geometry/Region')

// handler
exports.PropertyHandler = require('./lib/handler/PropertyHandler')
exports.ReadOnlyPropertyHandler = require('./lib/handler/ReadOnlyPropertyHandler')
exports.SimplePropertyHandler = require('./lib/handler/SimplePropertyHandler')

// utils
exports.ArgumentGuard = require('./lib/utils/ArgumentGuard')
exports.GeneralUtils = require('./lib/utils/GeneralUtils')
exports.TypeUtils = require('./lib/utils/TypeUtils')
exports.deserializeDomSnapshotResult = require('./lib/utils/deserializeDomSnapshotResult')
exports.CorsIframeHandler = require('./lib/capture/CorsIframeHandler')

exports.RemoteSessionEventHandler = require('./lib/events/RemoteSessionEventHandler')
exports.SessionEventHandler = require('./lib/events/SessionEventHandler')
exports.ValidationInfo = require('./lib/events/ValidationInfo')
exports.ValidationResult = require('./lib/events/ValidationResult')

exports.AppOutput = require('./lib/match/AppOutput')
exports.MatchResult = require('./lib/match/MatchResult')
exports.MatchWindowAndCloseData = require('./lib/match/MatchWindowAndCloseData')
exports.MatchWindowData = require('./lib/match/MatchWindowData')
exports.ImageMatchOptions = require('./lib/match/ImageMatchOptions')

exports.metadata = {
  ActualAppOutput: require('./lib/metadata/ActualAppOutput'),
  Annotations: require('./lib/metadata/Annotations'),
  BatchInfo: require('./lib/metadata/BatchInfo'),
  Branch: require('./lib/metadata/Branch'),
  ExpectedAppOutput: require('./lib/metadata/ExpectedAppOutput'),
  Image: require('./lib/metadata/Image'),
  ImageMatchSettings: require('./lib/metadata/ImageMatchSettings'),
  SessionResults: require('./lib/metadata/SessionResults'),
  StartInfo: require('./lib/metadata/StartInfo'),
}

exports.RenderStatusResults = require('./lib/renderer/RenderStatusResults')
exports.RunningRender = require('./lib/renderer/RunningRender')

exports.RenderingInfo = require('./lib/server/RenderingInfo')
exports.RunningSession = require('./lib/server/RunningSession')
exports.ServerConnector = require('./lib/server/ServerConnector')
exports.getTunnelAgentFromProxy = require('./lib/server/getTunnelAgentFromProxy')
exports.SessionStartInfo = require('./lib/server/SessionStartInfo')

exports.AppEnvironment = require('./lib/AppEnvironment')
exports.MatchWindowTask = require('./lib/MatchWindowTask')
exports.TestResults = require('./lib/TestResults')
exports.TestResultsError = require('./lib/TestResultsError')
exports.TestResultsFormatter = require('./lib/TestResultsFormatter')

exports.EyesBase = require('./lib/sdk/EyesBase')
exports.EyesClassic = require('./lib/sdk/EyesClassic')
exports.EyesVisualGrid = require('./lib/sdk/EyesVisualGrid')
exports.EyesFactory = require('./lib/sdk/EyesFactory')
exports.EyesSDK = require('./lib/sdk/EyesSDK')

exports.takeDomSnapshot = require('./lib/utils/takeDomSnapshot')
exports.takeDomSnapshots = require('./lib/utils/takeDomSnapshots')
exports.takeDomCapture = require('./lib/utils/takeDomCapture')

exports.EyesRunner = require('./lib/runner/EyesRunner')
exports.ClassicRunner = require('./lib/runner/ClassicRunner')
exports.VisualGridRunner = require('./lib/runner/VisualGridRunner')
exports.RunnerOptions = require('./lib/runner/RunnerOptions')
exports.LogEvent = require('./lib/logging/LogEvent')
exports.RunnerStartedEvent = require('./lib/logging/RunnerStartedEvent')

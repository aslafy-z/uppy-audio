/** @jsx h */

const { h } = require('preact')
const { Plugin } = require('@uppy/core')
const Translator = require('@uppy/utils/lib/Translator')
const getFileTypeExtension = require('@uppy/utils/lib/getFileTypeExtension')
const mimeTypes = require('@uppy/utils/lib/mimeTypes')
const canvasToBlob = require('@uppy/utils/lib/canvasToBlob')
const Recorder = require('opus-recorder')
const supportsMediaRecorder = require('./supportsMediaRecorder')
const MicrophoneIcon = require('./MicrophoneIcon')
const MicrophoneScreen = require('./MicrophoneScreen')
const PermissionsScreen = require('./PermissionsScreen')

/**
 * Normalize a MIME type or file extension into a MIME type.
 *
 * @param {string} fileType - MIME type or a file extension prefixed with `.`.
 * @returns {string|undefined} The MIME type or `undefined` if the fileType is an extension and is not known.
 */
function toMimeType (fileType) {
  if (fileType[0] === '.') {
    return mimeTypes[fileType.slice(1)]
  }
  return fileType
}
/**
 * Setup getUserMedia, with polyfill for older browsers
 * Adapted from: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 */
function getMediaDevices () {
  // eslint-disable-next-line compat/compat
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // eslint-disable-next-line compat/compat
    return navigator.mediaDevices
  }

  const getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia
  if (!getUserMedia) {
    return null
  }

  return {
    getUserMedia (opts) {
      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, opts, resolve, reject)
      })
    }
  }
}
/**
 * Audio
 */
module.exports = class Audio extends Plugin {
  static VERSION = require('../package.json').version

  constructor (uppy, opts) {
    super(uppy, opts)
    this.mediaDevices = getMediaDevices()
    this.supportsUserMedia = !!this.mediaDevices
    this.protocol = location.protocol.match(/https/i) ? 'https' : 'http'
    this.id = this.opts.id || 'Audio'
    this.title = this.opts.title || 'Audio'
    this.type = 'acquirer'
    // TODO: Replace this camera icon to a microphone icon
    this.icon = () => (
      <svg aria-hidden="true" focusable="false" width="32" height="32" viewBox="0 0 32 32">
        <g fill="none" fill-rule="evenodd">
          <rect fill="#03BFEF" width="32" height="32" rx="16" />
          <path d="M22 11c1.133 0 2 .867 2 2v7.333c0 1.134-.867 2-2 2H10c-1.133 0-2-.866-2-2V13c0-1.133.867-2 2-2h2.333l1.134-1.733C13.6 9.133 13.8 9 14 9h4c.2 0 .4.133.533.267L19.667 11H22zm-6 1.533a3.764 3.764 0 0 0-3.8 3.8c0 2.129 1.672 3.801 3.8 3.801s3.8-1.672 3.8-3.8c0-2.13-1.672-3.801-3.8-3.801zm0 6.261c-1.395 0-2.46-1.066-2.46-2.46 0-1.395 1.065-2.461 2.46-2.461s2.46 1.066 2.46 2.46c0 1.395-1.065 2.461-2.46 2.461z" fill="#FFF" fill-rule="nonzero" />
        </g>
      </svg>
    )

    this.defaultLocale = {
      strings: {
        startRecording: 'Begin audio recording',
        stopRecording: 'Stop audio recording',
        allowAccessTitle: 'Please allow access to your microphone',
        allowAccessDescription: 'In order to record audio with your microphone, please allow microphone access for this site.',
        noMicrophoneTitle: 'Microphone Not Available',
        noMicrophoneDescription: 'In order to record audio, please connect a microphone device',
        recordingStoppedMaxSize: 'Recording stopped because the file size is about to exceed the limit',
        recordingLength: 'Recording length %{recording_length}'
      }
    }

    // set default options
    const defaultOptions = {
      modes: [
        'wav',
      ],
      showRecordingLength: false,
      workerPath: '/static/waveWorker.min.js',
    }

    this.opts = { ...defaultOptions, ...opts }

    this.i18nInit()

    this.install = this.install.bind(this)
    this.setPluginState = this.setPluginState.bind(this)

    this.render = this.render.bind(this)

    // Microphone controls
    this._start = this._start.bind(this)
    this._stop = this._stop.bind(this)
    this._startRecording = this._startRecording.bind(this)
    this._stopRecording = this._stopRecording.bind(this)
    this._focus = this._focus.bind(this)

    this.audioActive = false
  }

  setOptions (newOpts) {
    super.setOptions(newOpts)
    this.i18nInit()
  }

  i18nInit () {
    this.translator = new Translator([this.defaultLocale, this.uppy.locale, this.opts.locale])
    this.i18n = this.translator.translate.bind(this.translator)
    this.i18nArray = this.translator.translateArray.bind(this.translator)
    this.setPluginState() // so that UI re-renders and we see the updated locale
  }

  hasMicrophoneCheck () {
    if (!this.mediaDevices) {
      return Promise.resolve(false)
    }

    return this.mediaDevices.enumerateDevices().then(devices => {
      return devices.some(device => device.kind === 'audioinput')
    })
  }

  getConstraints () {
    return {
      audio: true,
    }
  }

  _start () {
    if (!this.supportsUserMedia) {
      return Promise.reject(new Error('Webcam access not supported'))
    }

    this.audioActive = true
    const constraints = this.getConstraints()

    this.hasMicrophoneCheck().then(hasMicrophone => {
      this.setPluginState({
        hasMicrophone: hasMicrophone
      })

      // ask user for access to their microphone
      return this.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          this.stream = stream
          this.setPluginState({
            microphoneReady: true
          })
        })
        .catch((err) => {
          this.setPluginState({
            microphoneError: err
          })
        })
    })
  }

  /**
   * @returns {object}
   */
  _getMediaRecorderOptions () {
    const options = {}

    // Try to use the `opts.preferredVideoMimeType` or one of the `allowedFileTypes` for the recording.
    // If the browser doesn't support it, we'll fall back to the browser default instead.
    // Safari doesn't have the `isTypeSupported` API.

    // TODO: Reimplement that part for opus-recorder
    // See https://github.com/chris-rudmin/opus-recorder#general-config-options

    // if (MediaRecorder.isTypeSupported) {
    //   const { restrictions } = this.uppy.opts
    //   let preferredVideoMimeTypes = []
    //   if (this.opts.preferredVideoMimeType) {
    //     preferredVideoMimeTypes = [this.opts.preferredVideoMimeType]
    //   } else if (restrictions.allowedFileTypes) {
    //     preferredVideoMimeTypes = restrictions.allowedFileTypes.map(toMimeType).filter(isVideoMimeType)
    //   }

    //   const acceptableMimeTypes = preferredVideoMimeTypes.filter((candidateType) =>
    //     MediaRecorder.isTypeSupported(candidateType) &&
    //       getFileTypeExtension(candidateType))
    //   if (acceptableMimeTypes.length > 0) {
    //     options.mimeType = acceptableMimeTypes[0]
    //   }
    // }
    options.workerPath = this.opts.workerPath
    options.mimeType = "audio/wav"
    options.mediaTrackConstraints = true // https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
    options.monitorGain = 0
    options.numberOfChannels = 1
    options.recordingGain = 1
    options.wavBitDepth = 16
    options.streamPages = true
    return options
  }

  _startRecording () {
    this.recorder = new Recorder(this._getRecorderOptions())

    this.recordingChunks = []
    let stoppingBecauseOfMaxSize = false

    this.recorder.ondataavailable = (data) => {
      this.recordingChunks.push(new Blob( [data], { type: 'audio/wav' }))

      const { restrictions } = this.uppy.opts
      if (this.recordingChunks.length > 1 &&
          restrictions.maxFileSize != null &&
          !stoppingBecauseOfMaxSize) {
        const totalSize = this.recordingChunks.reduce((acc, chunk) => acc + chunk.size, 0)
        // Exclude the initial chunk from the average size calculation because it is likely to be a very small outlier
        const averageChunkSize = (totalSize - this.recordingChunks[0].size) / (this.recordingChunks.length - 1)
        const expectedEndChunkSize = averageChunkSize * 3
        const maxSize = Math.max(0, restrictions.maxFileSize - expectedEndChunkSize)

        if (totalSize > maxSize) {
          stoppingBecauseOfMaxSize = true
          this.uppy.info(this.i18n('recordingStoppedMaxSize'), 'warning', 4000)
          this._stopRecording()
        }
      }
    }

    // use a "time slice" of 500ms: ondataavailable will be called each 500ms
    // smaller time slices mean we can more accurately check the max file size restriction
    // this.recorder.start(500)
    // FIXME: time slice is not supported by opus-recorder
    this.recorder.start(this.stream)

    if (this.opts.showRecordingLength) {
      // Start the recordingLengthTimer if we are showing the recording length.
      this.recordingLengthTimer = setInterval(() => {
        const currentRecordingLength = this.getPluginState().recordingLengthSeconds
        this.setPluginState({ recordingLengthSeconds: currentRecordingLength + 1 })
      }, 1000)
    }

    this.setPluginState({
      isRecording: true
    })
  }

  _stopRecording () {
    const stopped = new Promise((resolve, reject) => {
      this.recorder.onstop = () => {
        resolve()
      }
      this.recorder.stop()

      if (this.opts.showRecordingLength) {
        // Stop the recordingLengthTimer if we are showing the recording length.
        clearInterval(this.recordingLengthTimer)
        this.setPluginState({ recordingLengthSeconds: 0 })
      }
    })

    return stopped.then(() => {
      this.setPluginState({
        isRecording: false
      })
      return this.getAudio()
    }).then((file) => {
      try {
        this.uppy.addFile(file)
      } catch (err) {
        // Logging the error, exept restrictions, which is handled in Core
        if (!err.isRestriction) {
          this.uppy.log(err)
        }
      }
    }).then(() => {
      this.recordingChunks = null
      this.recorder = null
    }, (error) => {
      this.recordingChunks = null
      this.recorder = null
      throw error
    })
  }

  _stop () {
    this.stream.getAudioTracks().forEach((track) => {
      track.stop()
    })
    this.stream.getVideoTracks().forEach((track) => {
      track.stop()
    })
    this.audioActive = false
    this.stream = null
  }

  getVideo () {
    const mimeType = this.recordingChunks[0].type
    const fileExtension = getFileTypeExtension(mimeType)

    if (!fileExtension) {
      return Promise.reject(new Error(`Could not retrieve recording: Unsupported media type "${mimeType}"`))
    }

    const name = `audio-${Date.now()}.${fileExtension}`
    const blob = new Blob(this.recordingChunks, { type: mimeType })
    const file = {
      source: this.id,
      name: name,
      data: new Blob([blob], { type: mimeType }),
      type: mimeType,
    }

    return Promise.resolve(file)
  }

  render () {
    if (!this.audioActive) {
      this._start()
    }

    const audioState = this.getPluginState()

    if (!audioState.microphoneReady || !audioState.hasMicrophone) {
      return (
        <PermissionsScreen
          icon={MicrophoneIcon}
          i18n={this.i18n}
          hadMicrophone={audioState.hasMicrophone}
        />
      )
    }

    return (
      <MicrophoneScreen
        {...audioState}
        onStartRecording={this._startRecording}
        onStopRecording={this._stopRecording}
        onStop={this._stop}
        i18n={this.i18n}
        modes={this.opts.modes}
        showRecordingLength={this.opts.showRecordingLength}
        supportsRecording={supportsMediaRecorder()}
        recording={audioState.isRecording}
        src={this.stream}
      />
    )
  }

  install () {
    this.setPluginState({
      microphoneReady: false,
      recordingLengthSeconds: 0
    })

    const target = this.opts.target
    if (target) {
      this.mount(target, this)
    }
  }

  uninstall () {
    if (this.stream) {
      this._stop()
    }

    this.unmount()
  }
}

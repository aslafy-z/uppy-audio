const { h } = require('preact')
const { Plugin } = require('@uppy/core')
const Translator = require('@uppy/utils/lib/Translator')
const mimeTypes = require('@uppy/utils/lib/mimeTypes')
const canvasToBlob = require('@uppy/utils/lib/canvasToBlob')
const Recorder = require('opus-recorder/dist/recorder.min.js')
const getFileTypeExtension = require('./getFileTypeExtension')
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
    this.icon = () => (
      <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="microphone" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512" class="svg-inline--fa fa-microphone fa-w-11">
        <path fill="currentColor" d="M176 352c53.02 0 96-42.98 96-96V96c0-53.02-42.98-96-96-96S80 42.98 80 96v160c0 53.02 42.98 96 96 96zm160-160h-16c-8.84 0-16 7.16-16 16v48c0 74.8-64.49 134.82-140.79 127.38C96.71 376.89 48 317.11 48 250.3V208c0-8.84-7.16-16-16-16H16c-8.84 0-16 7.16-16 16v40.16c0 89.64 63.97 169.55 152 181.69V464H96c-8.84 0-16 7.16-16 16v16c0 8.84 7.16 16 16 16h160c8.84 0 16-7.16 16-16v-16c0-8.84-7.16-16-16-16h-56v-33.77C285.71 418.47 352 344.9 352 256v-48c0-8.84-7.16-16-16-16z" class="">
        </path>
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
      encoderPath: 'waveWorker.min.js',
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
  _getRecorderOptions () {
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
    options.encoderPath = this.opts.encoderPath
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
    this.audioActive = false
    this.stream = null
  }

  getAudio () {
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

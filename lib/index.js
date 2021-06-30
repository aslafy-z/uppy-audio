var _class, _temp;

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _require = require('preact'),
    h = _require.h;

var _require2 = require('@uppy/core'),
    Plugin = _require2.Plugin;

var Translator = require('@uppy/utils/lib/Translator');

var mimeTypes = require('@uppy/utils/lib/mimeTypes');

var canvasToBlob = require('@uppy/utils/lib/canvasToBlob');

var Recorder = require('opus-recorder/dist/recorder.min.js');

var getFileTypeExtension = require('./getFileTypeExtension');

var supportsMediaRecorder = require('./supportsMediaRecorder');

var MicrophoneIcon = require('./MicrophoneIcon');

var MicrophoneScreen = require('./MicrophoneScreen');

var PermissionsScreen = require('./PermissionsScreen');
/**
 * Normalize a MIME type or file extension into a MIME type.
 *
 * @param {string} fileType - MIME type or a file extension prefixed with `.`.
 * @returns {string|undefined} The MIME type or `undefined` if the fileType is an extension and is not known.
 */


function toMimeType(fileType) {
  if (fileType[0] === '.') {
    return mimeTypes[fileType.slice(1)];
  }

  return fileType;
}
/**
 * Setup getUserMedia, with polyfill for older browsers
 * Adapted from: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
 */


function getMediaDevices() {
  // eslint-disable-next-line compat/compat
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    // eslint-disable-next-line compat/compat
    return navigator.mediaDevices;
  }

  var _getUserMedia = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

  if (!_getUserMedia) {
    return null;
  }

  return {
    getUserMedia: function getUserMedia(opts) {
      return new Promise(function (resolve, reject) {
        _getUserMedia.call(navigator, opts, resolve, reject);
      });
    }
  };
}
/**
 * Audio
 */


module.exports = (_temp = _class = /*#__PURE__*/function (_Plugin) {
  _inheritsLoose(Audio, _Plugin);

  function Audio(uppy, opts) {
    var _this;

    _this = _Plugin.call(this, uppy, opts) || this;
    _this.mediaDevices = getMediaDevices();
    _this.supportsUserMedia = !!_this.mediaDevices;
    _this.protocol = location.protocol.match(/https/i) ? 'https' : 'http';
    _this.id = _this.opts.id || 'Audio';
    _this.title = _this.opts.title || 'Audio';
    _this.type = 'acquirer';

    _this.icon = function () {
      return h("svg", {
        "aria-hidden": "true",
        focusable: "false",
        "data-prefix": "fas",
        "data-icon": "microphone",
        role: "img",
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 352 512",
        "class": "svg-inline--fa fa-microphone fa-w-11"
      }, h("path", {
        fill: "currentColor",
        d: "M176 352c53.02 0 96-42.98 96-96V96c0-53.02-42.98-96-96-96S80 42.98 80 96v160c0 53.02 42.98 96 96 96zm160-160h-16c-8.84 0-16 7.16-16 16v48c0 74.8-64.49 134.82-140.79 127.38C96.71 376.89 48 317.11 48 250.3V208c0-8.84-7.16-16-16-16H16c-8.84 0-16 7.16-16 16v40.16c0 89.64 63.97 169.55 152 181.69V464H96c-8.84 0-16 7.16-16 16v16c0 8.84 7.16 16 16 16h160c8.84 0 16-7.16 16-16v-16c0-8.84-7.16-16-16-16h-56v-33.77C285.71 418.47 352 344.9 352 256v-48c0-8.84-7.16-16-16-16z",
        "class": ""
      }));
    };

    _this.defaultLocale = {
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
    }; // set default options

    var defaultOptions = {
      modes: ['wav'],
      showRecordingLength: false,
      encoderPath: 'waveWorker.min.js'
    };
    _this.opts = _extends({}, defaultOptions, opts);

    _this.i18nInit();

    _this.install = _this.install.bind(_assertThisInitialized(_this));
    _this.setPluginState = _this.setPluginState.bind(_assertThisInitialized(_this));
    _this.render = _this.render.bind(_assertThisInitialized(_this)); // Microphone controls

    _this._start = _this._start.bind(_assertThisInitialized(_this));
    _this._stop = _this._stop.bind(_assertThisInitialized(_this));
    _this._startRecording = _this._startRecording.bind(_assertThisInitialized(_this));
    _this._stopRecording = _this._stopRecording.bind(_assertThisInitialized(_this));
    _this.audioActive = false;
    return _this;
  }

  var _proto = Audio.prototype;

  _proto.setOptions = function setOptions(newOpts) {
    _Plugin.prototype.setOptions.call(this, newOpts);

    this.i18nInit();
  };

  _proto.i18nInit = function i18nInit() {
    this.translator = new Translator([this.defaultLocale, this.uppy.locale, this.opts.locale]);
    this.i18n = this.translator.translate.bind(this.translator);
    this.i18nArray = this.translator.translateArray.bind(this.translator);
    this.setPluginState(); // so that UI re-renders and we see the updated locale
  };

  _proto.hasMicrophoneCheck = function hasMicrophoneCheck() {
    if (!this.mediaDevices) {
      return Promise.resolve(false);
    }

    return this.mediaDevices.enumerateDevices().then(function (devices) {
      return devices.some(function (device) {
        return device.kind === 'audioinput';
      });
    });
  };

  _proto.getConstraints = function getConstraints() {
    return {
      audio: true
    };
  };

  _proto._start = function _start() {
    var _this2 = this;

    if (!this.supportsUserMedia) {
      return Promise.reject(new Error('Webcam access not supported'));
    }

    this.audioActive = true;
    var constraints = this.getConstraints();
    this.hasMicrophoneCheck().then(function (hasMicrophone) {
      _this2.setPluginState({
        hasMicrophone: hasMicrophone
      }); // ask user for access to their microphone


      return _this2.mediaDevices.getUserMedia(constraints).then(function (stream) {
        _this2.stream = stream;

        _this2.setPluginState({
          microphoneReady: true
        });
      })["catch"](function (err) {
        _this2.setPluginState({
          microphoneError: err
        });
      });
    });
  }
  /**
   * @returns {object}
   */
  ;

  _proto._getRecorderOptions = function _getRecorderOptions() {
    var options = {}; // Try to use the `opts.preferredVideoMimeType` or one of the `allowedFileTypes` for the recording.
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

    options.encoderPath = this.opts.encoderPath;
    options.mimeType = "audio/wav";
    options.mediaTrackConstraints = true; // https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints

    options.monitorGain = 0;
    options.numberOfChannels = 1;
    options.recordingGain = 1;
    options.wavBitDepth = 16;
    options.streamPages = true;
    return options;
  };

  _proto._startRecording = function _startRecording() {
    var _this3 = this;

    this.recorder = new Recorder(this._getRecorderOptions());
    this.recordingChunks = [];
    var stoppingBecauseOfMaxSize = false;

    this.recorder.ondataavailable = function (data) {
      _this3.recordingChunks.push(new Blob([data], {
        type: 'audio/wav'
      }));

      var restrictions = _this3.uppy.opts.restrictions;

      if (_this3.recordingChunks.length > 1 && restrictions.maxFileSize != null && !stoppingBecauseOfMaxSize) {
        var totalSize = _this3.recordingChunks.reduce(function (acc, chunk) {
          return acc + chunk.size;
        }, 0); // Exclude the initial chunk from the average size calculation because it is likely to be a very small outlier


        var averageChunkSize = (totalSize - _this3.recordingChunks[0].size) / (_this3.recordingChunks.length - 1);
        var expectedEndChunkSize = averageChunkSize * 3;
        var maxSize = Math.max(0, restrictions.maxFileSize - expectedEndChunkSize);

        if (totalSize > maxSize) {
          stoppingBecauseOfMaxSize = true;

          _this3.uppy.info(_this3.i18n('recordingStoppedMaxSize'), 'warning', 4000);

          _this3._stopRecording();
        }
      }
    }; // use a "time slice" of 500ms: ondataavailable will be called each 500ms
    // smaller time slices mean we can more accurately check the max file size restriction
    // this.recorder.start(500)
    // FIXME: time slice is not supported by opus-recorder


    this.recorder.start(this.stream);

    if (this.opts.showRecordingLength) {
      // Start the recordingLengthTimer if we are showing the recording length.
      this.recordingLengthTimer = setInterval(function () {
        var currentRecordingLength = _this3.getPluginState().recordingLengthSeconds;

        _this3.setPluginState({
          recordingLengthSeconds: currentRecordingLength + 1
        });
      }, 1000);
    }

    this.setPluginState({
      isRecording: true
    });
  };

  _proto._stopRecording = function _stopRecording() {
    var _this4 = this;

    var stopped = new Promise(function (resolve, reject) {
      _this4.recorder.onstop = function () {
        resolve();
      };

      _this4.recorder.stop();

      if (_this4.opts.showRecordingLength) {
        // Stop the recordingLengthTimer if we are showing the recording length.
        clearInterval(_this4.recordingLengthTimer);

        _this4.setPluginState({
          recordingLengthSeconds: 0
        });
      }
    });
    return stopped.then(function () {
      _this4.setPluginState({
        isRecording: false
      });

      return _this4.getAudio();
    }).then(function (file) {
      try {
        _this4.uppy.addFile(file);
      } catch (err) {
        // Logging the error, exept restrictions, which is handled in Core
        if (!err.isRestriction) {
          _this4.uppy.log(err);
        }
      }
    }).then(function () {
      _this4.recordingChunks = null;
      _this4.recorder = null;
    }, function (error) {
      _this4.recordingChunks = null;
      _this4.recorder = null;
      throw error;
    });
  };

  _proto._stop = function _stop() {
    this.stream.getAudioTracks().forEach(function (track) {
      track.stop();
    });
    this.audioActive = false;
    this.stream = null;
  };

  _proto.getAudio = function getAudio() {
    var mimeType = this.recordingChunks[0].type;
    var fileExtension = getFileTypeExtension(mimeType);

    if (!fileExtension) {
      return Promise.reject(new Error("Could not retrieve recording: Unsupported media type \"" + mimeType + "\""));
    }

    var name = "audio-" + Date.now() + "." + fileExtension;
    var blob = new Blob(this.recordingChunks, {
      type: mimeType
    });
    var file = {
      source: this.id,
      name: name,
      data: new Blob([blob], {
        type: mimeType
      }),
      type: mimeType
    };
    return Promise.resolve(file);
  };

  _proto.render = function render() {
    if (!this.audioActive) {
      this._start();
    }

    var audioState = this.getPluginState();

    if (!audioState.microphoneReady || !audioState.hasMicrophone) {
      return h(PermissionsScreen, {
        icon: MicrophoneIcon,
        i18n: this.i18n,
        hadMicrophone: audioState.hasMicrophone
      });
    }

    return h(MicrophoneScreen, _extends({}, audioState, {
      onStartRecording: this._startRecording,
      onStopRecording: this._stopRecording,
      onStop: this._stop,
      i18n: this.i18n,
      modes: this.opts.modes,
      showRecordingLength: this.opts.showRecordingLength,
      supportsRecording: supportsMediaRecorder(),
      recording: audioState.isRecording,
      src: this.stream
    }));
  };

  _proto.install = function install() {
    this.setPluginState({
      microphoneReady: false,
      recordingLengthSeconds: 0
    });
    var target = this.opts.target;

    if (target) {
      this.mount(target, this);
    }
  };

  _proto.uninstall = function uninstall() {
    if (this.stream) {
      this._stop();
    }

    this.unmount();
  };

  return Audio;
}(Plugin), _defineProperty(_class, "VERSION", require('../package.json').version), _temp);
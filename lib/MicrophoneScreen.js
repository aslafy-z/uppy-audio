function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var _require = require('preact'),
    h = _require.h,
    Component = _require.Component;

var RecordButton = require('./RecordButton');

var RecordingLength = require('./RecordingLength');

function isModeAvailable(modes, mode) {
  return modes.indexOf(mode) !== -1;
}

var MicrophoneScreen = /*#__PURE__*/function (_Component) {
  _inheritsLoose(MicrophoneScreen, _Component);

  function MicrophoneScreen() {
    return _Component.apply(this, arguments) || this;
  }

  var _proto = MicrophoneScreen.prototype;

  _proto.componentWillUnmount = function componentWillUnmount() {
    this.props.onStop();
  };

  _proto.render = function render() {
    var shouldShowRecordButton = this.props.supportsRecording;
    var shouldShowRecordingLength = this.props.supportsRecording && this.props.showRecordingLength;
    return h("div", {
      "class": "uppy uppy-Audio-container"
    }, h("div", {
      "class": "uppy-Webcam-buttonContainer"
    }, shouldShowRecordingLength ? RecordingLength(this.props) : null, ' ', shouldShowRecordButton ? RecordButton(this.props) : null));
  };

  return MicrophoneScreen;
}(Component);

module.exports = MicrophoneScreen;
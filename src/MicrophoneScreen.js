const { h, Component } = require('preact')
const SnapshotButton = require('./SnapshotButton')
const RecordButton = require('./RecordButton')
const RecordingLength = require('./RecordingLength')

function isModeAvailable (modes, mode) {
  return modes.indexOf(mode) !== -1
}

class MicrophoneScreen extends Component {
  componentDidMount () {
    this.props.onFocus()
  }

  componentWillUnmount () {
    this.props.onStop()
  }

  render () {
    const shouldShowRecordButton = this.props.supportsRecording
    const shouldShowRecordingLength = this.props.supportsRecording && this.props.showRecordingLength

    return (
      <div class="uppy uppy-Audio-container">
        <div class="uppy-Webcam-buttonContainer">
          {shouldShowRecordingLength ? RecordingLength(this.props) : null}
          {' '}
          {shouldShowRecordButton ? RecordButton(this.props) : null}
        </div>
      </div>
    )
  }
}

module.exports = AudioScreen

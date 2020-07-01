import Uppy = require('@uppy/core')

type AudioLocale = Uppy.Locale<
  | 'startRecording'
  | 'stopRecording'
  | 'allowAccessTitle'
  | 'allowAccessDescription'
  | 'noMicrophoneTitle'
  | 'noMicrophoneDescription'
  | 'recordingStoppedMaxSize'
  | 'recordingLength'
>

export = AudioLocale

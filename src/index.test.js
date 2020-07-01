const Uppy = require('@uppy/core')
const Audio = require('./index')

describe('Audio', () => {
  describe('_getMediaRecorderOptions', () => {
    it('should not have a mimeType set if no preferences given', () => {
      global.MediaRecorder = {
        isTypeSupported: () => true
      }

      const uppy = Uppy().use(Audio)
      expect(
        uppy.getPlugin('Audio')._getMediaRecorderOptions().mimeType
      ).not.toBeDefined()
    })

    it('should use preferredVideoMimeType', () => {
      global.MediaRecorder = {
        isTypeSupported: (ty) => ty === 'audio/wav'
      }

      const uppy = Uppy().use(Audio, { preferredVideoMimeType: 'audio/wav' })
      expect(
        uppy.getPlugin('Audio')._getMediaRecorderOptions().mimeType
      ).toEqual('audio/wav')
    })

    it('should not use preferredVideoMimeType if it is not supported', () => {
      global.MediaRecorder = {
        isTypeSupported: (ty) => ty === 'audio/wav'
      }

      const uppy = Uppy().use(Audio, { preferredVideoMimeType: 'audio/mp3' })
      expect(
        uppy.getPlugin('Audio')._getMediaRecorderOptions().mimeType
      ).not.toBeDefined()
    })

    it('should pick type based on `allowedFileTypes`', () => {
      global.MediaRecorder = {
        isTypeSupported: () => true
      }

      const uppy = Uppy({
        restrictions: { allowedFileTypes: ['audio/wav', 'audio/mp3'] }
      }).use(Audio)
      expect(
        uppy.getPlugin('Audio')._getMediaRecorderOptions().mimeType
      ).toEqual('audio/wav')
    })

    it('should use first supported type from allowedFileTypes', () => {
      global.MediaRecorder = {
        isTypeSupported: (ty) => ty === 'audio/wav'
      }

      const uppy = Uppy({
        restrictions: { allowedFileTypes: ['audio/mp3', 'audio/wav'] }
      }).use(Audio)
      expect(
        uppy.getPlugin('Audio')._getMediaRecorderOptions().mimeType
      ).toEqual('audio/wav')
    })

    it('should prefer preferredVideoMimeType over allowedFileTypes', () => {
      global.MediaRecorder = {
        isTypeSupported: () => true
      }

      const uppy = Uppy({
        restrictions: { allowedFileTypes: ['audio/mp3', 'audio/wav'] }
      })
        .use(Audio, { preferredVideoMimeType: 'audio/wav' })
      expect(
        uppy.getPlugin('Audio')._getMediaRecorderOptions().mimeType
      ).toEqual('audio/wav')
    })

    it('should not use allowedFileTypes if they are unsupported', () => {
      global.MediaRecorder = {
        isTypeSupported: () => false
      }

      const uppy = Uppy({
        restrictions: { allowedFileTypes: ['audio/mp3', 'audio/wav'] }
      }).use(Audio)
      expect(
        uppy.getPlugin('Audio')._getMediaRecorderOptions().mimeType
      ).toEqual(undefined)
    })
  })
})

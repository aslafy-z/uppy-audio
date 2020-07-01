import Uppy = require('@uppy/core')
import AudioLocale = require('./generatedLocale')

declare module Audio {
  export type AudioMode =
    | 'wav'

  export interface AudioOptions extends Uppy.PluginOptions {
    replaceTargetContent?: boolean
    target?: Uppy.PluginTarget
    modes?: AudioMode[]
    locale?: AudioLocale
    title?: string,
    workerPath?: string,
  }
}

declare class Audio extends Uppy.Plugin<Audio.AudioOptions> {}

export = Audio

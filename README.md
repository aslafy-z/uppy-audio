# @zadkiel/uppy-audio

<img src="https://uppy.io/images/logos/uppy-dog-head-arrow.svg" width="120" alt="Uppy logo: a superman puppy in a pink suit" align="right">

<a href="https://www.npmjs.com/package/@zadkiel/uppy-audio"><img src="https://img.shields.io/npm/v/@zadkiel/uppy-audio.svg?style=flat-square"></a>
<a href="https://travis-ci.org/transloadit/uppy"><img src="https://img.shields.io/travis/transloadit/uppy/master.svg?style=flat-square" alt="Build Status"></a>

The Audio plugin for Uppy lets you record audio with a built-in microphone.

Uppy is being developed by the folks at [Transloadit](https://transloadit.com), a versatile file encoding service.

## Example

```js
const Uppy = require('@uppy/core')
const Audio = require('@zadkiel/uppy-audio')

const uppy = Uppy()
uppy.use(Audio, {
  showRecordingLength: true,
  encoderPath: '/path/to/waveWorker.min.js'
})
```

You should host [`waveWorker.min.js` from opus-recorder project](https://github.com/chris-rudmin/opus-recorder/blob/master/dist/waveWorker.min.js) file on same-origin and then precise its path with `encoderPath` configuration variable. 

## Installation

```bash
$ npm install @zadkiel/uppy-audio --save
```

We recommend installing from npm and then using a module bundler such as [Webpack](https://webpack.js.org/), [Browserify](http://browserify.org/) or [Rollup.js](http://rollupjs.org/).

Alternatively, you can also use this plugin in a pre-built bundle from Transloadit's CDN: Edgly. In that case `Uppy` will attach itself to the global `window.Uppy` object. See the [main Uppy documentation](https://uppy.io/docs/#Installation) for instructions.

## Documentation

Documentation for this plugin can be found on the [Uppy website](https://uppy.io/docs/audio).

## License

[The MIT License](./LICENSE).

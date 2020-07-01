const { h } = require('preact')

module.exports = (props) => {
  return (
    <div class="uppy-Audio-permissons">
      <div class="uppy-Audio-permissonsIcon">{props.icon()}</div>
      <h1 class="uppy-Audio-title">{props.hasMicrophone ? props.i18n('allowAccessTitle') : props.i18n('noMicrophoneTitle')}</h1>
      <p>{props.hasMicrophone ? props.i18n('allowAccessDescription') : props.i18n('noMicrophoneDescription')}</p>
    </div>
  )
}

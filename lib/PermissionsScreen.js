var _require = require('preact'),
    h = _require.h;

module.exports = function (props) {
  return h("div", {
    "class": "uppy-Audio-permissons"
  }, h("div", {
    "class": "uppy-Audio-permissonsIcon"
  }, props.icon()), h("h1", {
    "class": "uppy-Audio-title"
  }, props.hasMicrophone ? props.i18n('allowAccessTitle') : props.i18n('noMicrophoneTitle')), h("p", null, props.hasMicrophone ? props.i18n('allowAccessDescription') : props.i18n('noMicrophoneDescription')));
};
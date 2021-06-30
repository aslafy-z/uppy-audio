// Patched https://github.com/transloadit/uppy/blob/master/packages/%40uppy/utils/src/getFileTypeExtension.js
// Adds wav support
var mimeToExtensions = {
  'audio/wav': 'wav'
};

module.exports = function getFileTypeExtension(mimeType) {
  // Remove the ; bit in 'video/x-matroska;codecs=avc1'
  mimeType = mimeType.replace(/;.*$/, '');
  return mimeToExtensions[mimeType] || null;
};
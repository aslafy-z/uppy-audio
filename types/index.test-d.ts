import Uppy = require('@uppy/core')
import Audio = require('../')

{
  Uppy<Uppy.StrictTypes>().use(Audio, {
    modes: ['wav']
  })
}

/*
* image
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const serveStatic = require('serve-static')
const { paths } = require('@dimerapp/utils')
const ow = require('ow')

/**
 * Middleware to serve images from the assets directory
 *
 * @method exports
 *
 * @param  {String} basePath
 *
 * @return {Function}
 */
module.exports = function (basePath) {
  ow(basePath, ow.string.label('basePath').nonEmpty)

  const serve = serveStatic(paths(basePath).assetsPath(), {
    fallthrough: false
  })

  return function (req, res, next) {
    if (!req.url.startsWith('/__assets')) {
      next()
      return
    }

    req.url = req.url.replace(/^\/__assets/, '')
    serve(req, res, next)
  }
}

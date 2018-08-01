/*
* image
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const { extname, resolve, join } = require('path')
const { createHash } = require('crypto')
const ow = require('ow')
const fs = require('fs-extra')
const sizeOf = require('image-size')
const resizeImg = require('resize-img')

/**
 * Process the image detected inside markdown, by computing
 * their hash and write to the dest dir.
 *
 * @class Images
 *
 * @param {String} destPath
 * @param {Object} options
 */
class Image {
  constructor (ctx) {
    this.ctx = ctx
    this.paths = ctx.get('paths')
    this.compilerOptions = ctx.get('config').compilerOptions

    /**
     * Array of allowed extensions.
     */
    this._allowedExtensions = [ '.png', '.jpg', '.svg', '.jpeg' ]

    /**
     * Whether or not to generate thumbnails
     */
    this._thumbs = this.compilerOptions.generateThumbs !== false ? ['.jpg', '.png'] : []

    /**
     * A map of files already processed
     *
     * @type {Map}
     */
    this._processedFiles = new Map()
  }

  /**
   * Returns the hash of a buffer
   *
   * @method _getHash
   *
   * @param  {Buffer} buff
   *
   * @return {String}
   *
   * @private
   */
  _getHash (buff) {
    return createHash('sha1').update(buff).digest('hex')
  }

  /**
   * Writes buffer to the disk for the given filename
   *
   * @method _writeBuff
   *
   * @param  {Buffer}   buff
   * @param  {String}   filename
   *
   * @return {void}
   *
   * @private
   */
  async _writeBuff (buff, filename) {
    const absPath = join(this.paths.assetsPath(), filename)
    const exists = await fs.exists(absPath)

    if (!exists) {
      await fs.outputFile(absPath, buff)
    }
  }

  /**
   * Writes the thumb file to the disk by resizing it
   *
   * @method _generateThumb
   *
   * @param  {Buffer}       buff
   * @param  {String}       thumbname
   *
   * @return {void}
   *
   * @private
   */
  async _generateThumb (buff, thumbname) {
    if (!thumbname) {
      return
    }

    const thumbBuff = await resizeImg(buff, { width: 60 })
    await fs.outputFile(join(this.paths.assetsPath(), thumbname), thumbBuff)
  }

  /**
   * Returns a boolean telling if file is a valid image
   * as per the allowed extensions
   *
   * @method isImage
   *
   * @param  {String}  relativePath
   *
   * @return {Boolean}
   */
  isImage (relativePath) {
    ow(relativePath, ow.string.label('relativePath').nonEmpty)

    const ext = extname(relativePath)
    return this._allowedExtensions.indexOf(ext) > -1
  }

  /**
   * Moves the file to th disk by computing it's hash. Hash
   * ensures that no duplicate files are moved
   *
   * @method move
   *
   * @param  {String} relativePath
   * @param  {String} referencedPath
   *
   * @return {Object} { size, filename }
   *
   * @throws {Error} If referenced file is missing
   */
  async move (relativePath, referencedPath) {
    ow(relativePath, ow.string.label('relativePath').nonEmpty)
    ow(referencedPath, ow.string.label('referencedPath').nonEmpty)

    const absPath = resolve(referencedPath, relativePath)

    /**
     * if file has already been processed, then do not move it
     */
    if (this._processedFiles.has(absPath)) {
      return Object.assign({ cache: true }, this._processedFiles.get(absPath))
    }

    /**
     * Compute file buffer, size, ext, filename, dimensions and hash
     */
    const buff = await fs.readFile(absPath)
    const hash = this._getHash(buff)
    const size = Buffer.byteLength(hash)
    const ext = extname(relativePath)
    const filename = `${hash}${ext}`
    const { width, height } = await sizeOf(buff)

    /**
     * Write the actual file
     */
    await this._writeBuff(buff, filename)

    /**
     * Generate thumbnail if required
     */
    const thumb = this._thumbs.indexOf(ext) > -1 ? `${hash}-thumb${ext}` : null
    await this._generateThumb(buff, thumb)

    /**
     * Update cache
     */
    this._processedFiles.set(absPath, { size, filename, dimensions: { width, height }, thumb })

    return Object.assign({ cache: false }, this._processedFiles.get(absPath))
  }

  /**
   * Returns the node to patch image node detected in markdown
   *
   * @method toDimerNode
   *
   * @param  {Object}    imageResponse
   *
   * @return {Object}
   */
  toDimerNode (response) {
    ow(response, ow.object.label('response').hasKeys('filename', 'dimensions', 'thumb'))
    ow(response.filename, ow.string.label('response.filename').nonEmpty)

    const assetsUrl = this.compilerOptions.assetsUrl
    const url = response.thumb ? `${assetsUrl}/${response.thumb}` : `${assetsUrl}/${response.filename}`
    const lazyUrl = response.thumb ? `${assetsUrl}/${response.filename}` : null

    return {
      url: url,
      data: {
        hProperties: {
          dataSrc: lazyUrl,
          width: response.dimensions.width,
          height: response.dimensions.height
        }
      }
    }
  }

  /**
   * Cleans the assets directory
   *
   * @method clean
   *
   * @return {void}
   */
  async clean () {
    await fs.remove(this.paths.assetsPath())
  }
}

module.exports = Image

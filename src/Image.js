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
const { paths } = require('@dimerapp/utils')

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
  constructor (basePath, options) {
    ow(basePath, ow.string.label('basePath').nonEmpty)
    this.paths = paths(basePath)

    this.options = Object.assign({
      generateThumbs: true,
      allowedExtensions: [ '.png', '.jpg', '.svg', '.jpeg' ]
    }, options)

    this._thumbs = this.options.generateThumbs ? ['.jpg', '.png'] : []
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
    return this.options.allowedExtensions.indexOf(ext) > -1
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

    if (!this._processedFiles.has(absPath)) {
      const buff = await fs.readFile(absPath)
      const hash = this._getHash(buff)
      const size = Buffer.byteLength(hash)
      const ext = extname(relativePath)
      const filename = `${hash}${ext}`
      const thumb = this._thumbs.indexOf(ext) > -1 ? `${hash}-thumb${ext}` : null
      const { width, height } = await sizeOf(buff)

      await this._writeBuff(buff, filename)
      await this._generateThumb(buff, thumb)

      this._processedFiles.set(absPath, { size, filename, dimensions: { width, height }, thumb })
    }

    return this._processedFiles.get(absPath)
  }

  /**
   * Returns the node to patch image node detected in markdown
   *
   * @method toDimerNode
   *
   * @param  {Object}    imageResponse
   * @param  {String}    assetsUrl
   *
   * @return {Object}
   */
  toDimerNode (imageResponse, assetsUrl) {
    ow(imageResponse, ow.object.label('imageResponse').hasKeys('filename', 'dimensions', 'thumb'))
    ow(assetsUrl, ow.string.label('assetsUrl').nonEmpty)
    ow(imageResponse.filename, ow.string.label('imageResponse.filename').nonEmpty)

    const baseUrl = `${assetsUrl}/${this.paths.assetsPathRef}`
    const url = imageResponse.thumb ? `${baseUrl}/${imageResponse.thumb}` : `${baseUrl}/${imageResponse.filename}`
    const lazyUrl = imageResponse.thumb ? `${baseUrl}/${imageResponse.filename}` : null

    return {
      url: url,
      data: {
        hProperties: {
          dataSrc: lazyUrl,
          width: imageResponse.dimensions.width,
          height: imageResponse.dimensions.height
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

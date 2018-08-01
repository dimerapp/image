/*
* image
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const { join } = require('path')
const test = require('japa')
const fs = require('fs-extra')
const { createHash } = require('crypto')
const Context = require('@dimerapp/context')
const basePath = join(__dirname, 'app')

const Image = require('..')
const ctx = new Context(basePath)

ctx.set('test', 'config', {
  compilerOptions: {
    assetsUrl: 'https://api.dimerapp.com/__assets'
  }
})

test.group('Image', (group) => {
  group.afterEach(async () => {
    await fs.remove(basePath)
  })

  test('return true when file ends with allowed image extensions', (assert) => {
    const img = new Image(ctx)
    assert.isTrue(img.isImage('../hello.jpg'))
  })

  test('return false when file ends with un-allowed image extensions', (assert) => {
    const img = new Image(ctx)
    assert.isFalse(img.isImage('../hello.txt'))
  })

  test('move file to the dest path', async (assert) => {
    const img = new Image(ctx)
    const { size, filename, dimensions, thumb } = await img.move('../logo-beta.svg', __dirname)

    const buff = createHash('sha1').update(fs.readFileSync(join(__dirname, '../logo-beta.svg'))).digest('hex')

    assert.deepEqual(dimensions, { width: 118, height: 32 })
    assert.isNull(thumb)
    assert.equal(filename, `${buff}.svg`)
    assert.equal(size, Buffer.byteLength(buff))
  })

  test('return error when file is missing', async (assert) => {
    assert.plan(1)

    const img = new Image(ctx)

    try {
      await img.move('../hello.jpg', __dirname)
    } catch ({ code }) {
      assert.equal(code, 'ENOENT')
    }
  })

  test('do not move file if already exists', async (assert) => {
    const img = new Image(ctx)
    const { filename, cache } = await img.move('../logo-beta.svg', __dirname)
    assert.isFalse(cache)

    const exists = await fs.exists(join(basePath, 'dist', '__assets', filename))
    assert.isTrue(exists)

    img._writeBuff = function () {
      throw new Error('Didn\'t expected to be invoked')
    }

    const { cache: reCache } = await img.move('../logo-beta.svg', __dirname)
    assert.isTrue(reCache)
  })

  test('do not move file if already exists on disk and not in mem cache', async (assert) => {
    const img = new Image(ctx)
    const { filename } = await img.move('../logo-beta.svg', __dirname)

    const exists = await fs.exists(join(basePath, 'dist', '__assets', filename))
    assert.isTrue(exists)

    const _outputFile = fs.outputFile
    fs.outputFile = function () {
      throw new Error('Didn\'t expected to be invoked')
    }

    img._processedFiles.clear()
    await img.move('../logo-beta.svg', __dirname)
    fs.outputFile = _outputFile
  })

  test('move file with thumbnail when file is png', async (assert) => {
    const img = new Image(ctx)
    const { size, filename, dimensions, thumb } = await img.move('../logo-beta.png', __dirname)

    const buff = createHash('sha1').update(fs.readFileSync(join(__dirname, '../logo-beta.png'))).digest('hex')

    assert.deepEqual(dimensions, { width: 118, height: 32 })
    assert.equal(filename, `${buff}.png`)
    assert.equal(thumb, `${buff}-thumb.png`)
    assert.equal(size, Buffer.byteLength(buff))

    const fileExists = await fs.exists(join(basePath, 'dist', '__assets', filename))
    const thumbExists = await fs.exists(join(basePath, 'dist', '__assets', thumb))

    assert.isTrue(fileExists)
    assert.isTrue(thumbExists)
  })

  test('do not create thumb when generateThumbs is set to false', async (assert) => {
    const ctx = new Context(basePath)
    ctx.set('test', 'config', {
      compilerOptions: {
        generateThumbs: false
      }
    })

    const img = new Image(ctx)

    const { size, filename, dimensions, thumb } = await img.move('../logo-beta.png', __dirname)
    const buff = createHash('sha1').update(fs.readFileSync(join(__dirname, '../logo-beta.png'))).digest('hex')

    assert.deepEqual(dimensions, { width: 118, height: 32 })
    assert.equal(filename, `${buff}.png`)
    assert.isNull(thumb)
    assert.equal(size, Buffer.byteLength(buff))

    const fileExists = await fs.exists(join(basePath, 'dist', '__assets', filename))
    const thumbExists = await fs.exists(join(basePath, 'dist', '__assets', `${filename}-thumb.png`))

    assert.isTrue(fileExists)
    assert.isFalse(thumbExists)
  })

  test('return dimer node for image with thumb', async (assert) => {
    const img = new Image(ctx)
    const { filename, dimensions, thumb } = await img.move('../logo-beta.png', __dirname)

    assert.deepEqual(img.toDimerNode({ filename, dimensions, thumb }), {
      url: `https://api.dimerapp.com/__assets/${thumb}`,
      data: {
        hProperties: {
          dataSrc: `https://api.dimerapp.com/__assets/${filename}`,
          width: dimensions.width,
          height: dimensions.height
        }
      }
    })
  })

  test('return dimer node for image without thumb', async (assert) => {
    const img = new Image(ctx)
    const { filename, dimensions, thumb } = await img.move('../logo-beta.svg', __dirname)

    assert.deepEqual(img.toDimerNode({ filename, dimensions, thumb }), {
      url: `https://api.dimerapp.com/__assets/${filename}`,
      data: {
        hProperties: {
          dataSrc: null,
          width: dimensions.width,
          height: dimensions.height
        }
      }
    })
  })

  test('clear assets directory', async (assert) => {
    const img = new Image(ctx)
    await fs.copy(join(__dirname, '../logo-beta.svg'), join(ctx.get('paths').assetsPath(), 'logo-beta.svg'))

    let exists = await fs.exists(join(ctx.get('paths').assetsPath(), 'logo-beta.svg'))
    assert.isTrue(exists)

    await img.clean()

    exists = await fs.exists(join(ctx.get('paths').assetsPath(), 'logo-beta.svg'))
    assert.isFalse(exists)
  })
})

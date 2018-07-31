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
const http = require('http')
const supertest = require('supertest')

const staticServer = require('../src/staticServer')

const basePath = join(__dirname, 'app')

test.group('Image', (group) => {
  group.afterEach(async () => {
    await fs.remove(basePath)
  })

  test('serve files from the static directory', async (assert) => {
    const middleware = staticServer(basePath)
    await fs.copy(join(__dirname, '../logo-beta.svg'), join(basePath, 'dist', '__assets', 'logo-beta.svg'))

    const server = http.createServer((req, res) => {
      middleware(req, res, function (error) {
        res.writeHead(error.statusCode)
        res.end(error.message)
      })
    })

    await supertest(server).get('/__assets/logo-beta.svg').expect(200)
  })

  test('do not serve file when not prefixed with __assets', async (assert) => {
    const middleware = staticServer(basePath)
    await fs.copy(join(__dirname, '../logo-beta.svg'), join(basePath, 'dist', 'logo-beta.svg'))

    const server = http.createServer((req, res) => {
      middleware(req, res, function (error = {}) {
        res.writeHead(error.statusCode || 200)
        res.end(error.message || 'Passed through')
      })
    })

    const { text } = await supertest(server).get('/logo-beta.svg').expect(200)
    assert.equal(text, 'Passed through')
  })

  test('return 404 when file is missing', async (assert) => {
    const middleware = staticServer(basePath)

    const server = http.createServer((req, res) => {
      middleware(req, res, function (error = {}) {
        res.writeHead(error.statusCode || 200)
        res.end(error.message || 'Passed through')
      })
    })

    const { text } = await supertest(server).get('/__assets/logo-beta.svg').expect(404)
    assert.match(text, /ENOENT: no such file or directory/)
  })
})

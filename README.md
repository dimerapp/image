<div align="center">
  <div>
    <img width="500" src="https://res.cloudinary.com/adonisjs/image/upload/q_100/v1532274184/Dimer_Readme_Banner_lyy7wv.svg" alt="Dimer App">
  </div>
  <br>
  <p>
    <a href="https://dimerapp.com/what-is-dimer">
      Dimer is an open source project and CMS to help you publish your documentation online.
    </a>
  </p>
  <br>
  <p>
    <sub>We believe every project/product is incomplete without documentation. <br /> We want to help you publish user facing documentation, without worrying <code>about tools or code</code> to write.</sub>
  </p>
  <br>
</div>

# Dimer Image
> Handle images detected inside markdown and process them to be server via HTTP server

[@dimerapp/markdown](https://npm.im/@dimerapp/markdown) can detect assets (aka images) inside the Markdown documents. This package can be used to process those images and serve them via HTTP server.

## How it works?

Let's start with the example markdown document and understand the flow on how images are processed.

```md
This is an image reference ![](../images/dropdown.png)
```

1. The image `../images/dropdown.png` will be converted a buffer and moved inside `dist/__assets` folder.
2. During `move` operation, a HASH of file contents will be generated to avoid duplicate files.
3. A thumbnail for `jpg` and `png` images is generated to render blur images and load actual image in background (has to be handled on Frontend).

## Installation

```shell
npm i @dimerapp/image

# yarn
yarn add @dimerapp/image
```


## Usage

```js
const Markdown = require('@dimerapp/markdown')
const { dirname } = require('path')

const img = new Image(basePath)

const markdown = new Markdown(contents, {
  onUrl: function (url) {
    if (img.isImage(url)) {
      const response = await img.move(url, dirname(filePath))

      return img.toDimerNode(response)
    }
  }
})
```

[![travis-image]][travis-url]
[![appveyor-image]][appveyor-url]
[![npm-image]][npm-url]

## Change log

The change log can be found in the [CHANGELOG.md](https://github.com/dimerapp/image/CHANGELOG.md) file.

## Contributing

Everyone is welcome to contribute. Please take a moment to review the [contributing guidelines](CONTRIBUTING.md).

## Authors & License
[thetutlage](https://github.com/thetutlage) and [contributors](https://github.com/dimerapp/image/graphs/contributors).

MIT License, see the included [MIT](LICENSE.md) file.

[travis-image]: https://img.shields.io/travis/dimerapp/image/master.svg?style=flat-square&logo=travis
[travis-url]: https://travis-ci.org/dimerapp/image "travis"

[appveyor-image]: https://img.shields.io/appveyor/ci/thetutlage/image/master.svg?style=flat-square&logo=appveyor
[appveyor-url]: https://ci.appveyor.com/project/thetutlage/image "appveyor"

[npm-image]: https://img.shields.io/npm/v/@dimerapp/image.svg?style=flat-square&logo=npm
[npm-url]: https://npmjs.org/package/@dimerapp/image "npm"

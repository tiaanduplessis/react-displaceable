
# react-displaceable
[![package version](https://img.shields.io/npm/v/react-displaceable.svg?style=flat-square)](https://npmjs.org/package/react-displaceable)
[![package downloads](https://img.shields.io/npm/dm/react-displaceable.svg?style=flat-square)](https://npmjs.org/package/react-displaceable)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)
[![package license](https://img.shields.io/npm/l/react-displaceable.svg?style=flat-square)](https://npmjs.org/package/react-displaceable)
[![make a pull request](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> React component for [displaceable](https://github.com/dinohamzic/displaceable)

## Table of Contents

- [react-displaceable](#react-displaceable)
  - [Table of Contents](#table-of-contents)
  - [Install](#install)
  - [Usage](#usage)
  - [Contribute](#contribute)
  - [License](#license)

## Install

This project uses [node](https://nodejs.org) and [npm](https://www.npmjs.com). 

```sh
$ npm install react-displaceable
$ # OR
$ yarn add react-displaceable
```

## Usage

```js
import React from "react";
import ReactDOM from "react-dom";
import Displaceable from "react-displaceable";

import "./styles.css";

function App() {
  return (
    <div className="App">
      <Displaceable
        displaceFactor={5}
        // Other options are also supported
        // See: https://github.com/dinohamzic/displaceable#configuration
      >
        <h1>Hello There!</h1>
      </Displaceable>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);

```

## Contribute

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am "Add some feature"`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT
    
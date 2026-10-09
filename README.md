
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

## Lifecycle

Unmounting removes the mouse handlers and window listeners owned by that
component. Handlers installed afterward by another component or caller are
preserved.

The upstream library assigns mouse handlers directly to its trigger. Multiple
components sharing a trigger, including the default `window`, therefore still
use the most recently mounted component's mouse handlers. Use separate triggers
when components need independent mouse behavior. Unmounting does not restore an
older component's handlers.

Animation frames queued before unmount may still update the removed element.
The dependency does not expose cancellation for those pending frames.

## Development

The dependency is pinned to `displaceable` 0.5.0 because listener cleanup relies
on that version's bound callback identities. Dependency updates need to preserve
the ownership and failed-initialization checks.

`npm test` runs the lifecycle and rendering regressions on Node 16 or newer using
React, ReactDOM and the actual dependency. It checks source, CommonJS, native ESM
and UMD entry points with owned event and animation fixtures. Browser validation
is still needed for native mouse-handler ordering and geometry.

The distribution files can be rebuilt on Node 24.11 or newer with the isolated compiler:

```sh
npm install --prefix .build-tools --ignore-scripts --no-fund @babel/core@8.0.7 @babel/preset-env@8.0.7 @babel/plugin-transform-react-jsx@8.0.1 rollup@4.64.3
npm run build:verified
```

The build keeps React and displaceable external and emits ES5 CommonJS/UMD files
plus an ES module. The compiler's Node requirement does not change the library's
runtime requirement. Audit the isolated tool graph before executing it.

## Contribute

1. Fork it and create your feature branch: `git checkout -b my-new-feature`
2. Commit your changes: `git commit -am "Add some feature"`
3. Push to the branch: `git push origin my-new-feature`
4. Submit a pull request

## License

MIT
    

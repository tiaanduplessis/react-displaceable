'use strict'

// Native Node 16+ regression suite; no test runner or legacy build tooling required.
// Run with an independently installed/audited React + displaceable dependency graph:
// node --experimental-vm-modules test/index.js --dependencies /path/to/runtime
// Optional: --root /path/to/unpacked/package --entry src/index.js --format source
// Formats: source, cjs, esm, umd (browser globals), umd-cjs, umd-amd.
// --compatibility-only checks the pre-existing public behavior against older code.
// Source evaluation adapts only its imports/export and single JSX expression;
// all distribution files and the actual displaceable dependency execute unchanged.

const assert = require('assert').strict
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const { createRequire } = require('module')

function argumentsFrom(argv) {
  const options = { root: path.resolve(__dirname, '..') }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--compatibility-only') options.compatibilityOnly = true
    else {
      assert(['--root', '--entry', '--format', '--dependencies'].includes(argument),
        'Unknown argument: ' + argument)
      assert(argv[index + 1], 'Missing value for ' + argument)
      options[argument.slice(2)] = argv[++index]
    }
  }
  options.root = path.resolve(options.root)
  options.dependencies = path.resolve(options.dependencies || options.root)
  return options
}

const options = argumentsFrom(process.argv.slice(2))
const dependencyRequire = createRequire(path.join(options.dependencies, 'package.json'))
const React = dependencyRequire('react')
const ReactDOMServer = dependencyRequire('react-dom/server')
const dependencyEntry = dependencyRequire.resolve('displaceable')
const dependencyCode = fs.readFileSync(dependencyEntry, 'utf8')
const dependencyVersion = dependencyRequire('displaceable/package.json').version
const packageJson = JSON.parse(fs.readFileSync(path.join(options.root, 'package.json'), 'utf8'))
const trackedGlobals = ['window', 'document', 'Node', 'NodeList', 'requestAnimationFrame',
  'fetch', 'XMLHttpRequest', 'WebSocket']
const globalDescriptors = trackedGlobals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)])

class ObservedTarget extends EventTarget {
  constructor() {
    super()
    this.registrations = []
    this.operations = []
    this.onmousemove = null
    this.onmouseout = null
  }

  addEventListener(type, callback, eventOptions) {
    const capture = typeof eventOptions === 'boolean' ? eventOptions : !!(eventOptions && eventOptions.capture)
    this.operations.push({ action: 'add', type, callback, capture })
    if (!this.registrations.some(item => item.type === type &&
      item.callback === callback && item.capture === capture)) {
      this.registrations.push({ type, callback, capture })
    }
    super.addEventListener(type, callback, eventOptions)
  }

  removeEventListener(type, callback, eventOptions) {
    const capture = typeof eventOptions === 'boolean' ? eventOptions : !!(eventOptions && eventOptions.capture)
    this.operations.push({ action: 'remove', type, callback, capture })
    this.registrations = this.registrations.filter(item => !(item.type === type &&
      item.callback === callback && item.capture === capture))
    super.removeEventListener(type, callback, eventOptions)
  }

  listeners(type) {
    return this.registrations.filter(item => item.type === type).map(item => item.callback)
  }

  fire(type) {
    return this.dispatchEvent(new Event(type))
  }
}

function fixture(browser = true) {
  const order = []
  const frames = []
  const errors = []
  const warnings = []
  class FixtureNode extends ObservedTarget {
    constructor(name = 'node') {
      super()
      this.name = name
      this.style = {}
      this.dataset = {}
      this.rect = { x: 10, y: 20, width: 200, height: 100 }
      this.reads = 0
    }

    getBoundingClientRect() {
      this.reads += 1
      order.push(this.name)
      return { ...this.rect }
    }

    toString() { return '[fixture ' + this.name + ']' }
  }
  const ownerWindow = new ObservedTarget()
  Object.assign(ownerWindow, {
    innerWidth: 1000,
    innerHeight: 800,
    scrollY: 0,
    requestAnimationFrame(callback) {
      frames.push(callback)
      return frames.length
    },
    cancelAnimationFrame() {
      throw new Error('The existing upstream animation contract does not cancel frames')
    },
  })
  const blocked = name => () => { throw new Error('Unexpected external access: ' + name) }
  const context = vm.createContext({
    window: ownerWindow,
    Node: FixtureNode,
    NodeList: class FixtureNodeList extends Array {},
    console: { error: (...args) => errors.push(args), warn: (...args) => warnings.push(args) },
    fetch: blocked('fetch'),
    XMLHttpRequest: blocked('XMLHttpRequest'),
    WebSocket: blocked('WebSocket'),
    setTimeout: blocked('setTimeout'),
    setInterval: blocked('setInterval'),
  }, { codeGeneration: { strings: false, wasm: false } })
  if (!browser) {
    delete context.window
    delete context.Node
    delete context.NodeList
  }
  const runtimeModule = { exports: {} }
  context.module = runtimeModule
  context.exports = runtimeModule.exports
  context.require = blocked('dependency require')
  new vm.Script(dependencyCode, { filename: dependencyEntry }).runInContext(context, { timeout: 1000 })
  delete context.module
  delete context.exports
  delete context.require
  return {
    context, window: ownerWindow, Node: FixtureNode, errors, warnings, frames, order,
    runtimeExports: runtimeModule.exports,
    flushFrames() {
      const queued = frames.splice(0)
      queued.forEach(callback => callback(16))
      return queued.length
    },
  }
}

function sourceAdapter(code) {
  const replacements = [
    [/import React, \{ Component, createRef \} from 'react'[^\n]*/, "const React = require('react'); const { Component, createRef } = React"],
    [/import DisplaceableLib from 'displaceable'/, "const DisplaceableLib = require('displaceable').default"],
    [/export default class Displaceable extends Component/, 'module.exports = class Displaceable extends Component'],
    [/<div ref=\{this\.ref\} \{\.\.\.rest\}>\s*\{children\}\s*<\/div>/,
      "React.createElement('div', { ref: this.ref, ...rest }, children)"],
  ]
  replacements.forEach(([pattern, replacement]) => {
    assert(pattern.test(code), 'Source syntax changed; review the narrow source adapter: ' + pattern)
    code = code.replace(pattern, replacement)
  })
  return code
}

async function loadComponent(target, state) {
  const filename = path.resolve(options.root, target.entry)
  const code = fs.readFileSync(filename, 'utf8')
  const { context } = state
  const restrictedRequire = name => {
    if (name === 'react') return React
    if (name === 'displaceable') return state.runtimeExports
    throw new Error('Unexpected wrapper import: ' + name)
  }
  let result
  if (target.format === 'esm') {
    assert.equal(typeof vm.SourceTextModule, 'function', 'Use node --experimental-vm-modules for unchanged ESM validation')
    const modules = {
      react: new vm.SyntheticModule(['default', 'Component', 'createRef'], function () {
        this.setExport('default', React)
        this.setExport('Component', React.Component)
        this.setExport('createRef', React.createRef)
      }, { context }),
      displaceable: new vm.SyntheticModule(['default'], function () {
        this.setExport('default', state.runtimeExports.default)
      }, { context }),
    }
    const module = new vm.SourceTextModule(code, { context, identifier: filename })
    await module.link(name => {
      assert(modules[name], 'Unexpected ESM import: ' + name)
      return modules[name]
    })
    await module.evaluate({ timeout: 1000 })
    result = module.namespace.default
  } else if (target.format === 'umd') {
    context.react = React
    context.React = React
    context.displaceable = state.runtimeExports
    context.Displaceable = state.runtimeExports
    new vm.Script(code, { filename }).runInContext(context, { timeout: 1000 })
    result = context.reactDisplaceable || context.ReactDisplaceable
  } else if (target.format === 'umd-amd') {
    context.define = (names, factory) => {
      result = factory(...Array.from(names, restrictedRequire))
    }
    context.define.amd = {}
    new vm.Script(code, { filename }).runInContext(context, { timeout: 1000 })
  } else {
    const module = { exports: {} }
    context.module = module
    context.exports = module.exports
    context.require = restrictedRequire
    new vm.Script(target.format === 'source' ? sourceAdapter(code) : code, { filename })
      .runInContext(context, { timeout: 1000 })
    result = module.exports
  }
  assert.equal(typeof result, 'function', 'Expected the component as the default export')
  assert(result.prototype instanceof React.Component, 'Use the actual React Component base class')
  state.target = target
  state.Component = result
  state.create = (props = {}, node = new state.Node('content')) => {
    const component = new result()
    component.props = props
    component.ref.current = node
    return component
  }
  state.mount = (props, node) => {
    const component = state.create(props, node)
    component.componentDidMount()
    return component
  }
  return state
}

const tests = []
function test(name, run, compatible = false) { tests.push({ name, run, compatible }) }
function unmount(component) {
  if (component.componentWillUnmount) component.componentWillUnmount()
}
function assertNoListeners(state) {
  assert.deepEqual(state.window.listeners('resize'), [])
  assert.deepEqual(state.window.listeners('onscroll'), [])
}
function assertNoErrors(state) {
  assert.deepEqual(state.errors, [])
  assert.deepEqual(state.warnings, [])
}

test('React ref and render preserve children, DOM props and event handlers', state => {
  const child = React.createElement('span', { title: 'child' }, 'content')
  const onClick = () => {}
  const style = { opacity: 0.5 }
  const props = Object.freeze({ children: child, id: 'wrapper', className: 'box',
    'data-owner': 'fixture', style, onClick, displaceFactor: 7 })
  const component = state.create(props)
  const rendered = component.render()
  assert(React.isValidElement(rendered))
  assert.equal(rendered.type, 'div')
  assert.equal(rendered.ref, component.ref)
  assert.equal(rendered.props.children, child)
  Object.keys(props).forEach(key => assert.equal(rendered.props[key], props[key]))
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(state.Component,
    { id: 'server', className: 'box', 'data-owner': 'fixture' }, child))
  assert.equal(html, '<div id="server" class="box" data-owner="fixture"><span title="child">content</span></div>')
  assertNoListeners(state)
  assertNoErrors(state)
}, true)

test('import and server rendering need no window, document or DOM constructors', async state => {
  const server = await loadComponent(state.target, fixture(false))
  assert.equal(vm.runInContext('typeof window', server.context), 'undefined')
  assert.equal(vm.runInContext('typeof document', server.context), 'undefined')
  assert.equal(vm.runInContext('typeof Node', server.context), 'undefined')
  assert.equal(ReactDOMServer.renderToStaticMarkup(React.createElement(server.Component,
    { id: 'server-only' }, 'content')), '<div id="server-only">content</div>')
  assertNoListeners(server)
  assertNoErrors(server)
}, true)

test('missing, undefined and null options retain upstream defaults without mutating props', state => {
  for (const supplied of [{}, { displaceFactor: undefined, lockY: null, resetTime: null,
    skewFactor: undefined, trigger: null }]) {
    const props = Object.freeze(supplied)
    const before = { ...props }
    const component = state.mount(props)
    const settings = component.displaceable.settings
    assert.equal(settings.displaceFactor, 3)
    assert.equal(settings.lockX, false)
    assert.equal(settings.lockY, false)
    assert.equal(settings.resetTime, 1000)
    assert.equal(settings.skewFactor, 5)
    assert.equal(settings.trigger, state.window)
    assert.deepEqual(props, before)
    assert.equal(component.ref.current.style.pointerEvents, 'none')
    assert.equal(component.ref.current.style.willChange, 'transform')
    unmount(component)
  }
  assertNoErrors(state)
}, true)

test('explicit zero and false options, movement and mouse-out behavior remain intact', state => {
  const trigger = new state.Node('trigger')
  const component = state.mount({ trigger, displaceFactor: 0, lockY: false, resetTime: 0, skewFactor: 0 })
  const node = component.ref.current
  assert.equal(component.displaceable.settings.displaceFactor, 0)
  assert.equal(component.displaceable.settings.lockY, false)
  assert.equal(component.displaceable.settings.resetTime, 0)
  assert.equal(component.displaceable.settings.skewFactor, 0)
  assert.equal(component.displaceable.settings.trigger, trigger)
  trigger.onmousemove({ clientX: 200, clientY: 150 })
  assert.equal(state.flushFrames(), 1)
  assert.equal(node.style.transform, 'translate(0px, 0px) skew(0deg, 0deg)')
  assert.equal(node.style.transition, 'transform .05s linear')
  trigger.onmouseout()
  assert.equal(state.flushFrames(), 1)
  assert.equal(node.style.transform, '')
  assert.equal(node.style.transition, 'transform 0ms')
  unmount(component)
  assertNoErrors(state)
}, true)

test('nonzero movement, lockY and per-node dataset overrides retain upstream behavior', state => {
  const trigger = new state.Node('trigger')
  const node = new state.Node('content')
  node.dataset = { displaceFactor: '2', skewFactor: '10' }
  const component = state.mount({ trigger, lockY: true, displaceFactor: 8, skewFactor: 7 }, node)
  trigger.onmousemove({ clientX: 135, clientY: 106 })
  state.flushFrames()
  assert.equal(node.style.transform, 'translate(10px, 0px) skew(0deg, 0.5deg)')
  unmount(component)
  assertNoErrors(state)
}, true)

test('native resize and literal onscroll update geometry; actual scroll remains the upstream no-op', state => {
  const trigger = new state.Node('trigger')
  const component = state.mount({ trigger })
  assert.equal(component.displaceable.triggerCenterX, 110)
  assert.equal(component.displaceable.triggerCenterY, 70)
  trigger.rect.x = 60
  trigger.rect.y = 80
  state.window.scrollY = 25
  state.window.fire('scroll')
  assert.equal(component.displaceable.triggerCenterX, 110)
  assert.equal(component.displaceable.triggerCenterY, 70)
  state.window.fire('resize')
  assert.equal(component.displaceable.triggerCenterX, 160)
  assert.equal(component.displaceable.triggerCenterY, 155)
  trigger.rect.y = 100
  state.window.fire('onscroll')
  assert.equal(component.displaceable.triggerCenterY, 175)
  assert.equal(state.window.listeners('scroll').length, 0)
  unmount(component)
  assertNoErrors(state)
}, true)

for (const firstUnmounted of [0, 1]) {
  test('distinct triggers keep the other owner live; unmount order ' + firstUnmounted, state => {
    const triggers = [new state.Node('A'), new state.Node('B')]
    const components = triggers.map(trigger => state.mount({ trigger }))
    const updates = components.map(component => component.displaceable.initializeTrigger)
    const remaining = 1 - firstUnmounted
    const remainingMove = triggers[remaining].onmousemove
    const remainingOut = triggers[remaining].onmouseout
    unmount(components[firstUnmounted])
    assert.equal(triggers[firstUnmounted].onmousemove, null)
    assert.equal(triggers[firstUnmounted].onmouseout, null)
    assert.equal(triggers[remaining].onmousemove, remainingMove)
    assert.equal(triggers[remaining].onmouseout, remainingOut)
    assert.deepEqual(state.window.listeners('resize'), [updates[remaining]])
    assert.deepEqual(state.window.listeners('onscroll'), [updates[remaining]])
    state.order.length = 0
    state.window.fire('resize')
    state.window.fire('onscroll')
    assert.deepEqual(state.order, [triggers[remaining].name, triggers[remaining].name])
    remainingMove({ clientX: 200, clientY: 150 })
    assert.equal(state.flushFrames(), 1)
    assert.match(components[remaining].ref.current.style.transform, /^translate\(/)
    unmount(components[remaining])
    assertNoListeners(state)
    assertNoErrors(state)
  })

  for (const triggerKind of ['node', 'default window', 'explicit window']) {
    test('shared ' + triggerKind + ' ownership; unmount order ' + firstUnmounted, state => {
      const trigger = triggerKind === 'node' ? new state.Node('shared') : state.window
      const props = triggerKind === 'default window' ? {} : { trigger }
      const first = state.mount(props)
      const firstMove = trigger.onmousemove
      const firstOut = trigger.onmouseout
      const second = state.mount(props)
      const secondMove = trigger.onmousemove
      const secondOut = trigger.onmouseout
      const components = [first, second]
      const remaining = 1 - firstUnmounted
      assert.notEqual(firstMove, secondMove)
      assert.notEqual(firstOut, secondOut)
      unmount(components[firstUnmounted])
      assert.deepEqual(state.window.listeners('resize'), [components[remaining].displaceable.initializeTrigger])
      assert.deepEqual(state.window.listeners('onscroll'), [components[remaining].displaceable.initializeTrigger])
      if (firstUnmounted === 0) {
        assert.equal(trigger.onmousemove, secondMove)
        assert.equal(trigger.onmouseout, secondOut)
        trigger.onmousemove({ clientX: 200, clientY: 150 })
        assert.equal(state.flushFrames(), 1)
        assert.equal(first.ref.current.style.transform, undefined)
        assert.match(second.ref.current.style.transform, /^translate\(/)
      } else {
        assert.equal(trigger.onmousemove, null, 'Do not resurrect an overwritten older handler')
        assert.equal(trigger.onmouseout, null)
      }
      unmount(components[remaining])
      assert.equal(trigger.onmousemove, null)
      assert.equal(trigger.onmouseout, null)
      assertNoListeners(state)
      assertNoErrors(state)
    })
  }
}

for (const replaced of ['onmousemove', 'onmouseout', 'both']) {
  test('caller replacement of ' + replaced + ' survives cleanup independently', state => {
    const trigger = new state.Node('trigger')
    const component = state.mount({ trigger })
    const callerMove = () => {}
    const callerOut = () => {}
    if (replaced !== 'onmouseout') trigger.onmousemove = callerMove
    if (replaced !== 'onmousemove') trigger.onmouseout = callerOut
    unmount(component)
    assert.equal(trigger.onmousemove, replaced === 'onmouseout' ? null : callerMove)
    assert.equal(trigger.onmouseout, replaced === 'onmousemove' ? null : callerOut)
    assertNoListeners(state)
    assertNoErrors(state)
  })
}

test('cleanup removes captured callbacks only and preserves third-party listener identity/order', state => {
  const before = () => state.order.push('before')
  const middle = () => state.order.push('middle')
  const after = () => state.order.push('after')
  for (const type of ['resize', 'onscroll']) state.window.addEventListener(type, before)
  const first = state.mount({ trigger: new state.Node('A') })
  const firstUpdate = first.displaceable.initializeTrigger
  for (const type of ['resize', 'onscroll']) state.window.addEventListener(type, middle)
  const second = state.mount({ trigger: new state.Node('B') })
  const secondUpdate = second.displaceable.initializeTrigger
  for (const type of ['resize', 'onscroll']) state.window.addEventListener(type, after)
  for (const type of ['resize', 'onscroll']) {
    assert.deepEqual(state.window.listeners(type), [before, firstUpdate, middle, secondUpdate, after])
    state.order.length = 0
    state.window.fire(type)
    assert.deepEqual(state.order, ['before', 'A', 'middle', 'B', 'after'])
  }
  const operationStart = state.window.operations.length
  first.displaceable.initializeTrigger = () => { throw new Error('Replacement must not be consulted during cleanup') }
  first.displaceable.destroy = () => { throw new Error('Unsafe upstream destroy must not run') }
  unmount(first)
  assert.deepEqual(state.window.operations.slice(operationStart), [
    { action: 'remove', type: 'resize', callback: firstUpdate, capture: false },
    { action: 'remove', type: 'onscroll', callback: firstUpdate, capture: false },
  ])
  for (const type of ['resize', 'onscroll']) {
    assert.deepEqual(state.window.listeners(type), [before, middle, secondUpdate, after])
    state.order.length = 0
    state.window.fire(type)
    assert.deepEqual(state.order, ['before', 'middle', 'B', 'after'])
  }
  unmount(second)
  for (const type of ['resize', 'onscroll']) {
    assert.deepEqual(state.window.listeners(type), [before, middle, after])
    state.order.length = 0
    state.window.fire(type)
    assert.deepEqual(state.order, ['before', 'middle', 'after'])
  }
  assertNoErrors(state)
})

for (const failure of ['null ref', 'invalid trigger', 'zero width', 'zero height', 'invalid ref']) {
  test('failed ' + failure + ' initialization cannot claim another active owner', state => {
    const trigger = new state.Node('shared')
    const active = state.mount({ trigger })
    const move = trigger.onmousemove
    const out = trigger.onmouseout
    const resize = state.window.listeners('resize')
    const scroll = state.window.listeners('onscroll')
    const before = state.window.operations.length
    let badTrigger = trigger
    let badNode = new state.Node('bad-content')
    if (failure === 'null ref') badNode = null
    if (failure === 'invalid ref') badNode = {}
    if (failure === 'invalid trigger') badTrigger = { onmousemove: move, onmouseout: out }
    if (failure === 'zero width') trigger.rect.width = 0
    if (failure === 'zero height') trigger.rect.height = 0
    const failed = state.create({ trigger: badTrigger }, badNode)
    if (failure === 'invalid ref') {
      assert.throws(() => failed.componentDidMount(), /forEach/)
      assert.equal(state.errors.length, 0, 'Preserve the upstream uncaught invalid-ref error')
    } else {
      assert.doesNotThrow(() => failed.componentDidMount())
      assert.equal(state.errors.length, 1, 'Preserve the upstream caught constructor error')
      const expected = failure === 'null ref' ? /Unable to initialize Displaceable/ :
        failure === 'invalid trigger' ? /valid displacement trigger/ : /invalid dimensions/
      assert.match(String(state.errors[0][0]), expected)
    }
    assert.equal(failed.listenerCleanup, undefined)
    assert.doesNotThrow(() => unmount(failed))
    assert.doesNotThrow(() => unmount(failed))
    assert.equal(trigger.onmousemove, move)
    assert.equal(trigger.onmouseout, out)
    assert.deepEqual(state.window.listeners('resize'), resize)
    assert.deepEqual(state.window.listeners('onscroll'), scroll)
    assert.deepEqual(state.window.operations.slice(before), [])
    trigger.rect.width = 200
    trigger.rect.height = 100
    state.order.length = 0
    state.window.fire('resize')
    assert.deepEqual(state.order, ['shared'])
    move({ clientX: 200, clientY: 150 })
    assert.equal(state.flushFrames(), 1)
    assert.match(active.ref.current.style.transform, /^translate\(/)
    unmount(active)
    assertNoListeners(state)
  })
}

test('unmount before mount, double unmount and repeated mount/unmount do not leak', state => {
  const component = state.create({ trigger: new state.Node('trigger') })
  assert.doesNotThrow(() => unmount(component))
  for (let iteration = 0; iteration < 12; iteration += 1) {
    component.componentDidMount()
    assert.equal(state.window.listeners('resize').length, 1)
    assert.equal(state.window.listeners('onscroll').length, 1)
    unmount(component)
    assertNoListeners(state)
    const operations = state.window.operations.length
    unmount(component)
    assert.equal(state.window.operations.length, operations)
    assert.equal(component.props.trigger.onmousemove, null)
    assert.equal(component.props.trigger.onmouseout, null)
  }
  assertNoErrors(state)
})

test('cleanup retains the mounting window and original trigger if globals/settings change', state => {
  const trigger = new state.Node('original')
  const component = state.mount({ trigger })
  const replacement = new state.Node('replacement')
  const caller = () => {}
  replacement.onmousemove = caller
  replacement.onmouseout = caller
  component.displaceable.settings.trigger = replacement
  state.context.window = new ObservedTarget()
  unmount(component)
  assert.equal(trigger.onmousemove, null)
  assert.equal(trigger.onmouseout, null)
  assert.equal(replacement.onmousemove, caller)
  assert.equal(replacement.onmouseout, caller)
  assertNoListeners(state)
  assert.deepEqual(state.context.window.operations, [])
  assertNoErrors(state)
})

test('already queued animation frames still execute after unmount without scheduling new input', state => {
  const trigger = new state.Node('trigger')
  const component = state.mount({ trigger })
  const node = component.ref.current
  trigger.onmousemove({ clientX: 135, clientY: 106 })
  trigger.onmouseout()
  assert.equal(state.frames.length, 2)
  assert.equal(node.style.transform, undefined)
  unmount(component)
  assert.equal(state.frames.length, 2, 'Listener cleanup must not claim to cancel existing RAF work')
  state.frames.shift()(16)
  assert.equal(node.style.transform, 'translate(15px, 18px) skew(0.30000000000000004deg, 0.25deg)')
  state.frames.shift()(32)
  assert.equal(node.style.transform, '')
  assert.equal(node.style.transition, 'transform 1000ms')
  assert.equal(trigger.onmousemove, null)
  assert.equal(trigger.onmouseout, null)
  assertNoListeners(state)
  assertNoErrors(state)
})

async function main() {
  let targets
  if (options.entry) {
    assert(options.format, '--entry requires --format')
    targets = [{ entry: options.entry, format: options.format }]
  } else {
    targets = [
      { entry: packageJson.source || 'src/index.js', format: 'source' },
      { entry: packageJson.main, format: 'cjs' },
      { entry: packageJson.module, format: 'esm' },
      { entry: packageJson['umd:main'], format: 'umd' },
      { entry: packageJson['umd:main'], format: 'umd-cjs' },
      { entry: packageJson['umd:main'], format: 'umd-amd' },
    ].filter(target => target.entry)
  }
  targets.forEach(target => assert(['source', 'cjs', 'esm', 'umd', 'umd-cjs', 'umd-amd'].includes(target.format),
    'Unknown format: ' + target.format))
  let passed = 0
  let failed = 0
  const selected = tests.filter(item => !options.compatibilityOnly || item.compatible)
  process.stdout.write('Node ' + process.version + '; React ' + React.version + '; displaceable ' + dependencyVersion + '\n')
  for (const target of targets) {
    for (const item of selected) {
      try {
        const state = await loadComponent(target, fixture())
        await item.run(state)
        passed += 1
      } catch (error) {
        failed += 1
        process.stderr.write('FAIL [' + target.format + '] ' + item.name + '\n' + error.stack + '\n')
      }
    }
    process.stdout.write(target.format + ': ' + selected.length + ' scenarios evaluated (' + target.entry + ')\n')
  }
  globalDescriptors.forEach(([key, descriptor]) => {
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, key), descriptor,
      'Tests must not alter host global ' + key)
  })
  process.stdout.write(passed + ' passed; ' + failed + ' failed\n')
  if (failed) process.exitCode = 1
}

main().catch(error => {
  process.stderr.write(error.stack + '\n')
  process.exitCode = 1
})

import React, { Component, createRef } from 'react' // eslint-disable-line
import DisplaceableLib from 'displaceable'

function removeUndefinedProps(obj) {
  Object.keys(obj).forEach((key) => {
    const value = obj[key]
    if (value === undefined || value === null) {
      delete obj[key]
    }
  })
}

export default class Displaceable extends Component {
  constructor() {
    super()
    this.ref = createRef()
  }

  componentDidMount() {
    const {
      displaceFactor,
      lockY,
      resetTime,
      skewFactor,
      trigger,
    } = this.props

    const opts = {
      displaceFactor,
      lockY,
      resetTime,
      skewFactor,
      trigger,
    }

    removeUndefinedProps(opts)

    const ownerWindow = typeof window === 'undefined' ? undefined : window
    const triggerNode = opts.trigger === undefined ? ownerWindow : opts.trigger
    const canTrack = ownerWindow && (
      triggerNode === ownerWindow ||
      (typeof Node !== 'undefined' && triggerNode instanceof Node)
    )
    const previousMove = canTrack ? triggerNode.onmousemove : undefined
    const previousOut = canTrack ? triggerNode.onmouseout : undefined

    this.displaceable = new DisplaceableLib(this.ref.current, opts)

    // In pinned displaceable 0.5.0, caught initialization failures return an
    // instance before binding initializeTrigger or installing mouse handlers.
    if (
      canTrack &&
      Object.prototype.hasOwnProperty.call(this.displaceable, 'initializeTrigger')
    ) {
      const move = triggerNode.onmousemove
      const out = triggerNode.onmouseout
      const update = this.displaceable.initializeTrigger

      if (
        typeof move === 'function' && move !== previousMove &&
        typeof out === 'function' && out !== previousOut &&
        typeof update === 'function'
      ) {
        this.listenerCleanup = { ownerWindow, triggerNode, move, out, update }
      }
    }
  }

  componentWillUnmount() {
    const cleanup = this.listenerCleanup
    this.listenerCleanup = undefined
    if (!cleanup) {
      return
    }

    const { ownerWindow, triggerNode, move, out, update } = cleanup
    // destroy() clears both mouse properties unconditionally. Preserve any
    // handlers installed by another instance or caller after this one mounted.
    if (triggerNode.onmousemove === move) {
      triggerNode.onmousemove = null
    }
    if (triggerNode.onmouseout === out) {
      triggerNode.onmouseout = null
    }
    ownerWindow.removeEventListener('resize', update, false)
    ownerWindow.removeEventListener('onscroll', update, false)
  }

  render() {
    const { children, ...rest } = this.props
    return (
      <div ref={this.ref} {...rest}>
        {children}
      </div>
    )
  }
}

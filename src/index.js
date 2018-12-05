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

    this.displaceable = new DisplaceableLib(this.ref.current, opts)
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

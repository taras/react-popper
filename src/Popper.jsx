import React, { Component, createElement } from 'react'
import PropTypes from 'prop-types'
import PopperJS from 'popper.js'

const noop = () => null

class Popper extends Component {
  static contextTypes = {
    popperManager: PropTypes.object,
  }

  static childContextTypes = {
    popper: PropTypes.object.isRequired,
  }

  static propTypes = {
    component: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
    innerRef: PropTypes.func,
    placement: PropTypes.oneOf(PopperJS.placements),
    eventsEnabled: PropTypes.bool,
    modifiers: PropTypes.object,
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
    target: PropTypes.element
  }

  static defaultProps = {
    component: 'div',
    placement: 'bottom',
    eventsEnabled: true,
    modifiers: {},
  }

  state = {}

  getChildContext() {
    return {
      popper: {
        setArrowNode: this._setArrowNode,
        getArrowStyle: this._getArrowStyle,
      },
    }
  }

  componentDidMount() {
    this._updatePopper()
  }

  componentDidUpdate(lastProps) {
    if (
      lastProps.placement !== this.props.placement ||
      lastProps.eventsEnabled !== this.props.eventsEnabled
    ) {
      this._updatePopper()
    }

    if (this._popper && lastProps.children !== this.props.children) {
      this._popper.scheduleUpdate()
    }
  }

  componentWillUnmount() {
    this._destroyPopper()
  }

  _setArrowNode = node => {
    this._arrowNode = node
  }

  _getTargetNode = () => {
    if (this.props.target) {
      return this.props.target;
    }
    return this.context.popperManager.getTargetNode()
  }

  _getOffsets = data => {
    return Object.keys(data.offsets).map(key => data.offsets[key])
  }

  _isDataDirty = data => {
    if (this.state.data) {
      return (
        JSON.stringify(this._getOffsets(this.state.data)) !==
        JSON.stringify(this._getOffsets(data))
      )
    } else {
      return true
    }
  }

  _updateStateModifier = {
    enabled: true,
    order: 900,
    fn: data => {
      if (this._isDataDirty(data)) {
        this.setState({ data })
      }
      return data
    },
  }

  _updatePopper() {
    this._destroyPopper()
    if (this._node) {
      this._createPopper()
    }
  }

  _createPopper() {
    const { placement, eventsEnabled } = this.props
    const modifiers = {
      ...this.props.modifiers,
      applyStyle: { enabled: false },
      updateState: this._updateStateModifier,
    }

    if (this._arrowNode) {
      modifiers.arrow = {
        element: this._arrowNode,
      }
    }

    this._popper = new PopperJS(this._getTargetNode(), this._node, {
      placement,
      eventsEnabled,
      modifiers,
    })

    // schedule an update to make sure everything gets positioned correct
    // after being instantiated
    this._popper.scheduleUpdate()
  }

  _destroyPopper() {
    if (this._popper) {
      this._popper.destroy()
    }
  }

  _getPopperStyle = () => {
    const { data } = this.state

    // If Popper isn't instantiated, hide the popperElement
    // to avoid flash of unstyled content
    if (!this._popper || !data) {
      return {
        position: 'absolute',
        pointerEvents: 'none',
        opacity: 0,
      }
    }

    const { top, left, position } = data.offsets.popper

    return {
      position,
      ...data.styles,
    }
  }

  _getPopperPlacement = () => {
    return !!this.state.data ? this.state.data.placement : undefined
  }

  _getPopperHide = () => {
    return !!this.state.data && this.state.data.hide ? '' : undefined
  }

  _getArrowStyle = () => {
    if (!this.state.data || !this.state.data.offsets.arrow) {
      return {}
    } else {
      const { top, left } = this.state.data.offsets.arrow
      return { top, left }
    }
  }

  render() {
    const {
      component,
      innerRef,
      placement,
      eventsEnabled,
      modifiers,
      children,
      ...restProps
    } = this.props

    const popperRef = node => {
      this._node = node
      if (typeof innerRef === 'function') {
        innerRef(node)
      }
    }
    const popperStyle = this._getPopperStyle()
    const popperPlacement = this._getPopperPlacement()
    const popperHide = this._getPopperHide()

    if (typeof children === 'function') {
      const popperProps = {
        ref: popperRef,
        style: popperStyle,
        ['data-placement']: popperPlacement,
        ['data-x-out-of-boundaries']: popperHide,
      }
      return children({
        popperProps,
        restProps,
        scheduleUpdate: this._popper && this._popper.scheduleUpdate,
      })
    }

    const componentProps = {
      ...restProps,
      style: {
        ...restProps.style,
        ...popperStyle,
      },
      'data-placement': popperPlacement,
      'data-x-out-of-boundaries': popperHide,
    }

    if (typeof component === 'string') {
      componentProps.ref = popperRef
    } else {
      componentProps.innerRef = popperRef
    }

    return createElement(component, componentProps, children)
  }
}

export default Popper

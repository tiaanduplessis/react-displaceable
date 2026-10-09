import React, { Component, createRef } from 'react';
import DisplaceableLib from 'displaceable';

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
var _excluded = ["children"];
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || false, o.configurable = true, "value" in o && (o.writable = true), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), Object.defineProperty(e, "prototype", { writable: false }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, e) { if ("object" != _typeof(t) || !t) return t; var r; if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) { var i = r.call(t, e); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return (String )(t); }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: true, configurable: true } }), Object.defineProperty(t, "prototype", { writable: false }), e && _setPrototypeOf(t, e); }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == _typeof(e) || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function removeUndefinedProps(obj) {
  Object.keys(obj).forEach(function (key) {
    var value = obj[key];
    if (value === undefined || value === null) {
      delete obj[key];
    }
  });
}
var Displaceable = /*#__PURE__*/function (_Component) {
  function Displaceable() {
    var _this;
    _classCallCheck(this, Displaceable);
    _this = _callSuper(this, Displaceable);
    _this.ref = createRef();
    return _this;
  }
  _inherits(Displaceable, _Component);
  return _createClass(Displaceable, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      var _this$props = this.props,
        displaceFactor = _this$props.displaceFactor,
        lockY = _this$props.lockY,
        resetTime = _this$props.resetTime,
        skewFactor = _this$props.skewFactor,
        trigger = _this$props.trigger;
      var opts = {
        displaceFactor: displaceFactor,
        lockY: lockY,
        resetTime: resetTime,
        skewFactor: skewFactor,
        trigger: trigger
      };
      removeUndefinedProps(opts);
      var ownerWindow = typeof window === 'undefined' ? undefined : window;
      var triggerNode = opts.trigger === undefined ? ownerWindow : opts.trigger;
      var canTrack = ownerWindow && (triggerNode === ownerWindow || typeof Node !== 'undefined' && triggerNode instanceof Node);
      var previousMove = canTrack ? triggerNode.onmousemove : undefined;
      var previousOut = canTrack ? triggerNode.onmouseout : undefined;
      this.displaceable = new DisplaceableLib(this.ref.current, opts);

      // In pinned displaceable 0.5.0, caught initialization failures return an
      // instance before binding initializeTrigger or installing mouse handlers.
      if (canTrack && Object.prototype.hasOwnProperty.call(this.displaceable, 'initializeTrigger')) {
        var move = triggerNode.onmousemove;
        var out = triggerNode.onmouseout;
        var update = this.displaceable.initializeTrigger;
        if (typeof move === 'function' && move !== previousMove && typeof out === 'function' && out !== previousOut && typeof update === 'function') {
          this.listenerCleanup = {
            ownerWindow: ownerWindow,
            triggerNode: triggerNode,
            move: move,
            out: out,
            update: update
          };
        }
      }
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      var cleanup = this.listenerCleanup;
      this.listenerCleanup = undefined;
      if (!cleanup) {
        return;
      }
      var ownerWindow = cleanup.ownerWindow,
        triggerNode = cleanup.triggerNode,
        move = cleanup.move,
        out = cleanup.out,
        update = cleanup.update;
      // destroy() clears both mouse properties unconditionally. Preserve any
      // handlers installed by another instance or caller after this one mounted.
      if (triggerNode.onmousemove === move) {
        triggerNode.onmousemove = null;
      }
      if (triggerNode.onmouseout === out) {
        triggerNode.onmouseout = null;
      }
      ownerWindow.removeEventListener('resize', update, false);
      ownerWindow.removeEventListener('onscroll', update, false);
    }
  }, {
    key: "render",
    value: function render() {
      var _this$props2 = this.props,
        children = _this$props2.children,
        rest = _objectWithoutProperties(_this$props2, _excluded);
      return /*#__PURE__*/React.createElement("div", _objectSpread({
        ref: this.ref
      }, rest), children);
    }
  }]);
}(Component);

export { Displaceable as default };

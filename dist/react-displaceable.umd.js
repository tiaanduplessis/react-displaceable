!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t(require("react"),require("displaceable")):"function"==typeof define&&define.amd?define(["react","displaceable"],t):e.reactDisplaceable=t(e.react,e.displaceable)}(this,function(e,t){return t=t&&t.hasOwnProperty("default")?t.default:t,function(r){function o(){r.call(this),this.ref=e.createRef()}return r&&(o.__proto__=r),(o.prototype=Object.create(r&&r.prototype)).constructor=o,o.prototype.componentDidMount=function(){var e,r=this.props,o={displaceFactor:r.displaceFactor,lockY:r.lockY,resetTime:r.resetTime,skewFactor:r.skewFactor,trigger:r.trigger};e=o,Object.keys(e).forEach(function(t){var r=e[t];null==r&&delete e[t]}),this.displaceable=new t(this.ref.current,o)},o.prototype.render=function(){var e=this.props,t=e.children,r=function(e,t){var r={};for(var o in e)Object.prototype.hasOwnProperty.call(e,o)&&-1===t.indexOf(o)&&(r[o]=e[o]);return r}(e,["children"]);return h("div",Object.assign({},{ref:this.ref},r),t)},o}(e.Component)});

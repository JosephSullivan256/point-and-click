/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/graphology-shortest-path/dijkstra.js":
/*!***********************************************************!*\
  !*** ./node_modules/graphology-shortest-path/dijkstra.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/**
 * Graphology Dijkstra Shortest Path
 * ==================================
 *
 * Graphology implementation of Dijkstra shortest path for weighted graphs.
 */
var isGraph = __webpack_require__(/*! graphology-utils/is-graph */ "./node_modules/graphology-utils/is-graph.js");
var createEdgeWeightGetter =
  (__webpack_require__(/*! graphology-utils/getters */ "./node_modules/graphology-utils/getters.js").createEdgeWeightGetter);
var Heap = __webpack_require__(/*! mnemonist/heap */ "./node_modules/mnemonist/heap.js");

/**
 * Defaults & helpers.
 */
var DEFAULT_WEIGHT_ATTRIBUTE = 'weight';

function DIJKSTRA_HEAP_COMPARATOR(a, b) {
  if (a[0] > b[0]) return 1;
  if (a[0] < b[0]) return -1;

  if (a[1] > b[1]) return 1;
  if (a[1] < b[1]) return -1;

  if (a[2] > b[2]) return 1;
  if (a[2] < b[2]) return -1;

  return 0;
}

function BRANDES_DIJKSTRA_HEAP_COMPARATOR(a, b) {
  if (a[0] > b[0]) return 1;
  if (a[0] < b[0]) return -1;

  if (a[1] > b[1]) return 1;
  if (a[1] < b[1]) return -1;

  if (a[2] > b[2]) return 1;
  if (a[2] < b[2]) return -1;

  if (a[3] > b[3]) return 1;
  if (a[3] < b[3]) return -1;

  return 0;
}

/**
 * Bidirectional Dijkstra shortest path between source & target node abstract.
 *
 * Note that this implementation was basically copied from networkx.
 *
 * @param  {Graph}  graph         - The graphology instance.
 * @param  {string} source        - Source node.
 * @param  {string} target        - Target node.
 * @param  {string} getEdgeWeight - Name of the weight attribute or getter function.
 * @param  {array}                - The found path if any and its cost.
 */
function abstractBidirectionalDijkstra(graph, source, target, getEdgeWeight) {
  source = '' + source;
  target = '' + target;

  // Sanity checks
  if (!isGraph(graph))
    throw new Error(
      'graphology-shortest-path/dijkstra: invalid graphology instance.'
    );

  if (source && !graph.hasNode(source))
    throw new Error(
      'graphology-shortest-path/dijkstra: the "' +
        source +
        '" source node does not exist in the given graph.'
    );

  if (target && !graph.hasNode(target))
    throw new Error(
      'graphology-shortest-path/dijkstra: the "' +
        target +
        '" target node does not exist in the given graph.'
    );

  getEdgeWeight = createEdgeWeightGetter(
    getEdgeWeight || DEFAULT_WEIGHT_ATTRIBUTE
  ).fromMinimalEntry;

  if (source === target) return [0, [source]];

  var distances = [{}, {}],
    paths = [{}, {}],
    fringe = [
      new Heap(DIJKSTRA_HEAP_COMPARATOR),
      new Heap(DIJKSTRA_HEAP_COMPARATOR)
    ],
    seen = [{}, {}];

  paths[0][source] = [source];
  paths[1][target] = [target];

  seen[0][source] = 0;
  seen[1][target] = 0;

  var finalPath = [],
    finalDistance = Infinity;

  var count = 0,
    dir = 1,
    item,
    edges,
    cost,
    d,
    v,
    u,
    e,
    i,
    l;

  fringe[0].push([0, count++, source]);
  fringe[1].push([0, count++, target]);

  while (fringe[0].size && fringe[1].size) {
    // Swapping direction
    dir = 1 - dir;

    item = fringe[dir].pop();
    d = item[0];
    v = item[2];

    if (v in distances[dir]) continue;

    distances[dir][v] = d;

    // Shortest path is found?
    if (v in distances[1 - dir]) return [finalDistance, finalPath];

    edges = dir === 1 ? graph.inboundEdges(v) : graph.outboundEdges(v);

    for (i = 0, l = edges.length; i < l; i++) {
      e = edges[i];
      u = graph.opposite(v, e);
      cost = distances[dir][v] + getEdgeWeight(e, graph.getEdgeAttributes(e));

      if (u in distances[dir] && cost < distances[dir][u]) {
        throw Error(
          'graphology-shortest-path/dijkstra: contradictory paths found. Do some of your edges have a negative weight?'
        );
      } else if (!(u in seen[dir]) || cost < seen[dir][u]) {
        seen[dir][u] = cost;
        fringe[dir].push([cost, count++, u]);
        paths[dir][u] = paths[dir][v].concat(u);

        if (u in seen[0] && u in seen[1]) {
          d = seen[0][u] + seen[1][u];

          if (finalPath.length === 0 || finalDistance > d) {
            finalDistance = d;
            finalPath = paths[0][u].concat(paths[1][u].slice(0, -1).reverse());
          }
        }
      }
    }
  }

  // No path was found
  return [Infinity, null];
}

/**
 * Multisource Dijkstra shortest path abstract function. This function is the
 * basis of the algorithm that every other will use.
 *
 * Note that this implementation was basically copied from networkx.
 * TODO: it might be more performant to use a dedicated objet for the heap's
 * items.
 *
 * @param  {Graph}  graph         - The graphology instance.
 * @param  {array}  sources       - A list of sources.
 * @param  {string} getEdgeWeight - Name of the weight attribute or getter function.
 * @param  {number} cutoff        - Maximum depth of the search.
 * @param  {string} target        - Optional target to reach.
 * @param  {object} paths         - Optional paths object to maintain.
 * @return {object}               - Returns the paths.
 */
function abstractDijkstraMultisource(
  graph,
  sources,
  getEdgeWeight,
  cutoff,
  target,
  paths
) {
  if (!isGraph(graph))
    throw new Error(
      'graphology-shortest-path/dijkstra: invalid graphology instance.'
    );

  if (target && !graph.hasNode(target))
    throw new Error(
      'graphology-shortest-path/dijkstra: the "' +
        target +
        '" target node does not exist in the given graph.'
    );

  getEdgeWeight = createEdgeWeightGetter(
    getEdgeWeight || DEFAULT_WEIGHT_ATTRIBUTE
  ).fromMinimalEntry;

  var distances = {},
    seen = {},
    fringe = new Heap(DIJKSTRA_HEAP_COMPARATOR);

  var count = 0,
    edges,
    item,
    cost,
    v,
    u,
    e,
    d,
    i,
    j,
    l,
    m;

  for (i = 0, l = sources.length; i < l; i++) {
    v = sources[i];
    seen[v] = 0;
    fringe.push([0, count++, v]);

    if (paths) paths[v] = [v];
  }

  while (fringe.size) {
    item = fringe.pop();
    d = item[0];
    v = item[2];

    if (v in distances) continue;

    distances[v] = d;

    if (v === target) break;

    edges = graph.outboundEdges(v);

    for (j = 0, m = edges.length; j < m; j++) {
      e = edges[j];
      u = graph.opposite(v, e);
      cost = getEdgeWeight(e, graph.getEdgeAttributes(e)) + distances[v];

      if (cutoff && cost > cutoff) continue;

      if (u in distances && cost < distances[u]) {
        throw Error(
          'graphology-shortest-path/dijkstra: contradictory paths found. Do some of your edges have a negative weight?'
        );
      } else if (!(u in seen) || cost < seen[u]) {
        seen[u] = cost;
        fringe.push([cost, count++, u]);

        if (paths) paths[u] = paths[v].concat(u);
      }
    }
  }

  return distances;
}

/**
 * Single source Dijkstra shortest path between given node & other nodes in
 * the graph.
 *
 * @param  {Graph}  graph         - The graphology instance.
 * @param  {string} source        - Source node.
 * @param  {string} getEdgeWeight - Name of the weight attribute or getter function.
 * @return {object}               - An object of found paths.
 */
function singleSourceDijkstra(graph, source, getEdgeWeight) {
  var paths = {};

  abstractDijkstraMultisource(graph, [source], getEdgeWeight, 0, null, paths);

  return paths;
}

function bidirectionalDijkstra(graph, source, target, getEdgeWeight) {
  return abstractBidirectionalDijkstra(graph, source, target, getEdgeWeight)[1];
}

/**
 * Function using Ulrik Brandes' method to map single source shortest paths
 * from selected node.
 *
 * [Reference]:
 * Ulrik Brandes: A Faster Algorithm for Betweenness Centrality.
 * Journal of Mathematical Sociology 25(2):163-177, 2001.
 *
 * @param  {Graph}  graph         - Target graph.
 * @param  {any}    source        - Source node.
 * @param  {string} getEdgeWeight - Name of the weight attribute or getter function.
 * @return {array}                - [Stack, Paths, Sigma]
 */
function brandes(graph, source, getEdgeWeight) {
  source = '' + source;

  getEdgeWeight = createEdgeWeightGetter(
    getEdgeWeight || DEFAULT_WEIGHT_ATTRIBUTE
  ).fromMinimalEntry;

  var S = [],
    P = {},
    sigma = {};

  var nodes = graph.nodes(),
    edges,
    item,
    pred,
    dist,
    cost,
    v,
    w,
    e,
    i,
    l;

  for (i = 0, l = nodes.length; i < l; i++) {
    v = nodes[i];
    P[v] = [];
    sigma[v] = 0;
  }

  var D = {};

  sigma[source] = 1;

  var seen = {};
  seen[source] = 0;

  var count = 0;

  var Q = new Heap(BRANDES_DIJKSTRA_HEAP_COMPARATOR);
  Q.push([0, count++, source, source]);

  while (Q.size) {
    item = Q.pop();
    dist = item[0];
    pred = item[2];
    v = item[3];

    if (v in D) continue;

    sigma[v] += sigma[pred];
    S.push(v);
    D[v] = dist;

    edges = graph.outboundEdges(v);

    for (i = 0, l = edges.length; i < l; i++) {
      e = edges[i];
      w = graph.opposite(v, e);
      cost = dist + getEdgeWeight(e, graph.getEdgeAttributes(e));

      if (!(w in D) && (!(w in seen) || cost < seen[w])) {
        seen[w] = cost;
        Q.push([cost, count++, v, w]);
        sigma[w] = 0;
        P[w] = [v];
      } else if (cost === seen[w]) {
        sigma[w] += sigma[v];
        P[w].push(v);
      }
    }
  }

  return [S, P, sigma];
}

/**
 * Exporting.
 */
exports.bidirectional = bidirectionalDijkstra;
exports.singleSource = singleSourceDijkstra;
exports.brandes = brandes;


/***/ }),

/***/ "./node_modules/graphology-utils/getters.js":
/*!**************************************************!*\
  !*** ./node_modules/graphology-utils/getters.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports) => {

/**
 * Graphology Weight Getter
 * =========================
 *
 * Function creating weight getters.
 */
function coerceWeight(value) {
  // Ensuring target value is a correct number
  if (typeof value !== 'number' || isNaN(value)) return 1;

  return value;
}

function createNodeValueGetter(nameOrFunction, defaultValue) {
  var getter = {};

  var coerceToDefault = function (v) {
    if (typeof v === 'undefined') return defaultValue;

    return v;
  };

  if (typeof defaultValue === 'function') coerceToDefault = defaultValue;

  var get = function (attributes) {
    return coerceToDefault(attributes[nameOrFunction]);
  };

  var returnDefault = function () {
    return coerceToDefault(undefined);
  };

  if (typeof nameOrFunction === 'string') {
    getter.fromAttributes = get;
    getter.fromGraph = function (graph, node) {
      return get(graph.getNodeAttributes(node));
    };
    getter.fromEntry = function (node, attributes) {
      return get(attributes);
    };
  } else if (typeof nameOrFunction === 'function') {
    getter.fromAttributes = function () {
      throw new Error(
        'graphology-utils/getters/createNodeValueGetter: irrelevant usage.'
      );
    };
    getter.fromGraph = function (graph, node) {
      return coerceToDefault(
        nameOrFunction(node, graph.getNodeAttributes(node))
      );
    };
    getter.fromEntry = function (node, attributes) {
      return coerceToDefault(nameOrFunction(node, attributes));
    };
  } else {
    getter.fromAttributes = returnDefault;
    getter.fromGraph = returnDefault;
    getter.fromEntry = returnDefault;
  }

  return getter;
}

function createEdgeValueGetter(nameOrFunction, defaultValue) {
  var getter = {};

  var coerceToDefault = function (v) {
    if (typeof v === 'undefined') return defaultValue;

    return v;
  };

  if (typeof defaultValue === 'function') coerceToDefault = defaultValue;

  var get = function (attributes) {
    return coerceToDefault(attributes[nameOrFunction]);
  };

  var returnDefault = function () {
    return coerceToDefault(undefined);
  };

  if (typeof nameOrFunction === 'string') {
    getter.fromAttributes = get;
    getter.fromGraph = function (graph, edge) {
      return get(graph.getEdgeAttributes(edge));
    };
    getter.fromEntry = function (edge, attributes) {
      return get(attributes);
    };
    getter.fromPartialEntry = getter.fromEntry;
    getter.fromMinimalEntry = getter.fromEntry;
  } else if (typeof nameOrFunction === 'function') {
    getter.fromAttributes = function () {
      throw new Error(
        'graphology-utils/getters/createEdgeValueGetter: irrelevant usage.'
      );
    };
    getter.fromGraph = function (graph, edge) {
      // TODO: we can do better, check #310
      var extremities = graph.extremities(edge);
      return coerceToDefault(
        nameOrFunction(
          edge,
          graph.getEdgeAttributes(edge),
          extremities[0],
          extremities[1],
          graph.getNodeAttributes(extremities[0]),
          graph.getNodeAttributes(extremities[1]),
          graph.isUndirected(edge)
        )
      );
    };
    getter.fromEntry = function (e, a, s, t, sa, ta, u) {
      return coerceToDefault(nameOrFunction(e, a, s, t, sa, ta, u));
    };
    getter.fromPartialEntry = function (e, a, s, t) {
      return coerceToDefault(nameOrFunction(e, a, s, t));
    };
    getter.fromMinimalEntry = function (e, a) {
      return coerceToDefault(nameOrFunction(e, a));
    };
  } else {
    getter.fromAttributes = returnDefault;
    getter.fromGraph = returnDefault;
    getter.fromEntry = returnDefault;
    getter.fromMinimalEntry = returnDefault;
  }

  return getter;
}

exports.createNodeValueGetter = createNodeValueGetter;
exports.createEdgeValueGetter = createEdgeValueGetter;
exports.createEdgeWeightGetter = function (name) {
  return createEdgeValueGetter(name, coerceWeight);
};


/***/ }),

/***/ "./node_modules/graphology-utils/is-graph.js":
/*!***************************************************!*\
  !*** ./node_modules/graphology-utils/is-graph.js ***!
  \***************************************************/
/***/ ((module) => {

/**
 * Graphology isGraph
 * ===================
 *
 * Very simple function aiming at ensuring the given variable is a
 * graphology instance.
 */

/**
 * Checking the value is a graphology instance.
 *
 * @param  {any}     value - Target value.
 * @return {boolean}
 */
module.exports = function isGraph(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.addUndirectedEdgeWithKey === 'function' &&
    typeof value.dropNode === 'function' &&
    typeof value.multi === 'boolean'
  );
};


/***/ }),

/***/ "./node_modules/graphology/dist/graphology.umd.min.js":
/*!************************************************************!*\
  !*** ./node_modules/graphology/dist/graphology.umd.min.js ***!
  \************************************************************/
/***/ (function(module) {

!function(t,e){ true?module.exports=e():0}(this,(function(){"use strict";function t(e){return t="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},t(e)}function e(t,e){t.prototype=Object.create(e.prototype),t.prototype.constructor=t,r(t,e)}function n(t){return n=Object.setPrototypeOf?Object.getPrototypeOf:function(t){return t.__proto__||Object.getPrototypeOf(t)},n(t)}function r(t,e){return r=Object.setPrototypeOf||function(t,e){return t.__proto__=e,t},r(t,e)}function i(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(t){return!1}}function o(t,e,n){return o=i()?Reflect.construct:function(t,e,n){var i=[null];i.push.apply(i,e);var o=new(Function.bind.apply(t,i));return n&&r(o,n.prototype),o},o.apply(null,arguments)}function a(t){var e="function"==typeof Map?new Map:void 0;return a=function(t){if(null===t||(i=t,-1===Function.toString.call(i).indexOf("[native code]")))return t;var i;if("function"!=typeof t)throw new TypeError("Super expression must either be null or a function");if(void 0!==e){if(e.has(t))return e.get(t);e.set(t,a)}function a(){return o(t,arguments,n(this).constructor)}return a.prototype=Object.create(t.prototype,{constructor:{value:a,enumerable:!1,writable:!0,configurable:!0}}),r(a,t)},a(t)}function u(t){if(void 0===t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return t}var c=function(){for(var t=arguments[0],e=1,n=arguments.length;e<n;e++)if(arguments[e])for(var r in arguments[e])t[r]=arguments[e][r];return t};function s(t,e,n,r){var i=t._nodes.get(e),o=null;return i?o="mixed"===r?i.out&&i.out[n]||i.undirected&&i.undirected[n]:"directed"===r?i.out&&i.out[n]:i.undirected&&i.undirected[n]:o}function d(e){return null!==e&&"object"===t(e)&&"function"==typeof e.addUndirectedEdgeWithKey&&"function"==typeof e.dropNode}function h(e){return"object"===t(e)&&null!==e&&e.constructor===Object}function p(t){var e;for(e in t)return!1;return!0}function f(t,e,n){Object.defineProperty(t,e,{enumerable:!1,configurable:!1,writable:!0,value:n})}function l(t,e,n){var r={enumerable:!0,configurable:!0};"function"==typeof n?r.get=n:(r.value=n,r.writable=!1),Object.defineProperty(t,e,r)}function g(t){return!!h(t)&&!(t.attributes&&!Array.isArray(t.attributes))}"function"==typeof Object.assign&&(c=Object.assign);var y,w={exports:{}},v="object"==typeof Reflect?Reflect:null,b=v&&"function"==typeof v.apply?v.apply:function(t,e,n){return Function.prototype.apply.call(t,e,n)};y=v&&"function"==typeof v.ownKeys?v.ownKeys:Object.getOwnPropertySymbols?function(t){return Object.getOwnPropertyNames(t).concat(Object.getOwnPropertySymbols(t))}:function(t){return Object.getOwnPropertyNames(t)};var m=Number.isNaN||function(t){return t!=t};function k(){k.init.call(this)}w.exports=k,w.exports.once=function(t,e){return new Promise((function(n,r){function i(n){t.removeListener(e,o),r(n)}function o(){"function"==typeof t.removeListener&&t.removeListener("error",i),n([].slice.call(arguments))}N(t,e,o,{once:!0}),"error"!==e&&function(t,e,n){"function"==typeof t.on&&N(t,"error",e,n)}(t,i,{once:!0})}))},k.EventEmitter=k,k.prototype._events=void 0,k.prototype._eventsCount=0,k.prototype._maxListeners=void 0;var _=10;function G(t){if("function"!=typeof t)throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof t)}function x(t){return void 0===t._maxListeners?k.defaultMaxListeners:t._maxListeners}function E(t,e,n,r){var i,o,a,u;if(G(n),void 0===(o=t._events)?(o=t._events=Object.create(null),t._eventsCount=0):(void 0!==o.newListener&&(t.emit("newListener",e,n.listener?n.listener:n),o=t._events),a=o[e]),void 0===a)a=o[e]=n,++t._eventsCount;else if("function"==typeof a?a=o[e]=r?[n,a]:[a,n]:r?a.unshift(n):a.push(n),(i=x(t))>0&&a.length>i&&!a.warned){a.warned=!0;var c=new Error("Possible EventEmitter memory leak detected. "+a.length+" "+String(e)+" listeners added. Use emitter.setMaxListeners() to increase limit");c.name="MaxListenersExceededWarning",c.emitter=t,c.type=e,c.count=a.length,u=c,console&&console.warn&&console.warn(u)}return t}function A(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,0===arguments.length?this.listener.call(this.target):this.listener.apply(this.target,arguments)}function S(t,e,n){var r={fired:!1,wrapFn:void 0,target:t,type:e,listener:n},i=A.bind(r);return i.listener=n,r.wrapFn=i,i}function D(t,e,n){var r=t._events;if(void 0===r)return[];var i=r[e];return void 0===i?[]:"function"==typeof i?n?[i.listener||i]:[i]:n?function(t){for(var e=new Array(t.length),n=0;n<e.length;++n)e[n]=t[n].listener||t[n];return e}(i):U(i,i.length)}function L(t){var e=this._events;if(void 0!==e){var n=e[t];if("function"==typeof n)return 1;if(void 0!==n)return n.length}return 0}function U(t,e){for(var n=new Array(e),r=0;r<e;++r)n[r]=t[r];return n}function N(t,e,n,r){if("function"==typeof t.on)r.once?t.once(e,n):t.on(e,n);else{if("function"!=typeof t.addEventListener)throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type '+typeof t);t.addEventListener(e,(function i(o){r.once&&t.removeEventListener(e,i),n(o)}))}}function j(t){if("function"!=typeof t)throw new Error("obliterator/iterator: expecting a function!");this.next=t}Object.defineProperty(k,"defaultMaxListeners",{enumerable:!0,get:function(){return _},set:function(t){if("number"!=typeof t||t<0||m(t))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+t+".");_=t}}),k.init=function(){void 0!==this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0},k.prototype.setMaxListeners=function(t){if("number"!=typeof t||t<0||m(t))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+t+".");return this._maxListeners=t,this},k.prototype.getMaxListeners=function(){return x(this)},k.prototype.emit=function(t){for(var e=[],n=1;n<arguments.length;n++)e.push(arguments[n]);var r="error"===t,i=this._events;if(void 0!==i)r=r&&void 0===i.error;else if(!r)return!1;if(r){var o;if(e.length>0&&(o=e[0]),o instanceof Error)throw o;var a=new Error("Unhandled error."+(o?" ("+o.message+")":""));throw a.context=o,a}var u=i[t];if(void 0===u)return!1;if("function"==typeof u)b(u,this,e);else{var c=u.length,s=U(u,c);for(n=0;n<c;++n)b(s[n],this,e)}return!0},k.prototype.addListener=function(t,e){return E(this,t,e,!1)},k.prototype.on=k.prototype.addListener,k.prototype.prependListener=function(t,e){return E(this,t,e,!0)},k.prototype.once=function(t,e){return G(e),this.on(t,S(this,t,e)),this},k.prototype.prependOnceListener=function(t,e){return G(e),this.prependListener(t,S(this,t,e)),this},k.prototype.removeListener=function(t,e){var n,r,i,o,a;if(G(e),void 0===(r=this._events))return this;if(void 0===(n=r[t]))return this;if(n===e||n.listener===e)0==--this._eventsCount?this._events=Object.create(null):(delete r[t],r.removeListener&&this.emit("removeListener",t,n.listener||e));else if("function"!=typeof n){for(i=-1,o=n.length-1;o>=0;o--)if(n[o]===e||n[o].listener===e){a=n[o].listener,i=o;break}if(i<0)return this;0===i?n.shift():function(t,e){for(;e+1<t.length;e++)t[e]=t[e+1];t.pop()}(n,i),1===n.length&&(r[t]=n[0]),void 0!==r.removeListener&&this.emit("removeListener",t,a||e)}return this},k.prototype.off=k.prototype.removeListener,k.prototype.removeAllListeners=function(t){var e,n,r;if(void 0===(n=this._events))return this;if(void 0===n.removeListener)return 0===arguments.length?(this._events=Object.create(null),this._eventsCount=0):void 0!==n[t]&&(0==--this._eventsCount?this._events=Object.create(null):delete n[t]),this;if(0===arguments.length){var i,o=Object.keys(n);for(r=0;r<o.length;++r)"removeListener"!==(i=o[r])&&this.removeAllListeners(i);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if("function"==typeof(e=n[t]))this.removeListener(t,e);else if(void 0!==e)for(r=e.length-1;r>=0;r--)this.removeListener(t,e[r]);return this},k.prototype.listeners=function(t){return D(this,t,!0)},k.prototype.rawListeners=function(t){return D(this,t,!1)},k.listenerCount=function(t,e){return"function"==typeof t.listenerCount?t.listenerCount(e):L.call(t,e)},k.prototype.listenerCount=L,k.prototype.eventNames=function(){return this._eventsCount>0?y(this._events):[]},"undefined"!=typeof Symbol&&(j.prototype[Symbol.iterator]=function(){return this}),j.of=function(){var t=arguments,e=t.length,n=0;return new j((function(){return n>=e?{done:!0}:{done:!1,value:t[n++]}}))},j.empty=function(){return new j((function(){return{done:!0}}))},j.fromSequence=function(t){var e=0,n=t.length;return new j((function(){return e>=n?{done:!0}:{done:!1,value:t[e++]}}))},j.is=function(t){return t instanceof j||"object"==typeof t&&null!==t&&"function"==typeof t.next};var O=j,C={};C.ARRAY_BUFFER_SUPPORT="undefined"!=typeof ArrayBuffer,C.SYMBOL_SUPPORT="undefined"!=typeof Symbol;var z=O,M=C,W=M.ARRAY_BUFFER_SUPPORT,P=M.SYMBOL_SUPPORT;var R=function(t){var e=function(t){return"string"==typeof t||Array.isArray(t)||W&&ArrayBuffer.isView(t)?z.fromSequence(t):"object"!=typeof t||null===t?null:P&&"function"==typeof t[Symbol.iterator]?t[Symbol.iterator]():"function"==typeof t.next?t:null}(t);if(!e)throw new Error("obliterator: target is not iterable nor a valid iterator.");return e},K=R,T=function(t,e){for(var n,r=arguments.length>1?e:1/0,i=r!==1/0?new Array(r):[],o=0,a=K(t);;){if(o===r)return i;if((n=a.next()).done)return o!==e&&(i.length=o),i;i[o++]=n.value}},B=function(t){function n(e){var n;return(n=t.call(this)||this).name="GraphError",n.message=e,n}return e(n,t),n}(a(Error)),F=function(t){function n(e){var r;return(r=t.call(this,e)||this).name="InvalidArgumentsGraphError","function"==typeof Error.captureStackTrace&&Error.captureStackTrace(u(r),n.prototype.constructor),r}return e(n,t),n}(B),I=function(t){function n(e){var r;return(r=t.call(this,e)||this).name="NotFoundGraphError","function"==typeof Error.captureStackTrace&&Error.captureStackTrace(u(r),n.prototype.constructor),r}return e(n,t),n}(B),Y=function(t){function n(e){var r;return(r=t.call(this,e)||this).name="UsageGraphError","function"==typeof Error.captureStackTrace&&Error.captureStackTrace(u(r),n.prototype.constructor),r}return e(n,t),n}(B);function q(t,e){this.key=t,this.attributes=e,this.clear()}function J(t,e){this.key=t,this.attributes=e,this.clear()}function V(t,e){this.key=t,this.attributes=e,this.clear()}function H(t,e,n,r,i){this.key=e,this.attributes=i,this.undirected=t,this.source=n,this.target=r}q.prototype.clear=function(){this.inDegree=0,this.outDegree=0,this.undirectedDegree=0,this.in={},this.out={},this.undirected={}},J.prototype.clear=function(){this.inDegree=0,this.outDegree=0,this.in={},this.out={}},V.prototype.clear=function(){this.undirectedDegree=0,this.undirected={}},H.prototype.attach=function(){var t="out",e="in";this.undirected&&(t=e="undirected");var n=this.source.key,r=this.target.key;this.source[t][r]=this,this.undirected&&n===r||(this.target[e][n]=this)},H.prototype.attachMulti=function(){var t="out",e="in",n=this.source.key,r=this.target.key;this.undirected&&(t=e="undirected");var i=this.source[t],o=i[r];if(void 0===o)return i[r]=this,void(this.undirected&&n===r||(this.target[e][n]=this));o.previous=this,this.next=o,i[r]=this,this.target[e][n]=this},H.prototype.detach=function(){var t=this.source.key,e=this.target.key,n="out",r="in";this.undirected&&(n=r="undirected"),delete this.source[n][e],delete this.target[r][t]},H.prototype.detachMulti=function(){var t=this.source.key,e=this.target.key,n="out",r="in";this.undirected&&(n=r="undirected"),void 0===this.previous?void 0===this.next?(delete this.source[n][e],delete this.target[r][t]):(this.next.previous=void 0,this.source[n][e]=this.next,this.target[r][t]=this.next):(this.previous.next=this.next,void 0!==this.next&&(this.next.previous=this.previous))};function Q(t,e,n,r,i,o,a){var u,c,s,d;if(r=""+r,0===n){if(!(u=t._nodes.get(r)))throw new I("Graph.".concat(e,': could not find the "').concat(r,'" node in the graph.'));s=i,d=o}else if(3===n){if(i=""+i,!(c=t._edges.get(i)))throw new I("Graph.".concat(e,': could not find the "').concat(i,'" edge in the graph.'));var h=c.source.key,p=c.target.key;if(r===h)u=c.target;else{if(r!==p)throw new I("Graph.".concat(e,': the "').concat(r,'" node is not attached to the "').concat(i,'" edge (').concat(h,", ").concat(p,")."));u=c.source}s=o,d=a}else{if(!(c=t._edges.get(r)))throw new I("Graph.".concat(e,': could not find the "').concat(r,'" edge in the graph.'));u=1===n?c.source:c.target,s=i,d=o}return[u,s,d]}var X=[{name:function(t){return"get".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i){var o=Q(this,e,n,t,r,i),a=o[0],u=o[1];return a.attributes[u]}}},{name:function(t){return"get".concat(t,"Attributes")},attacher:function(t,e,n){t.prototype[e]=function(t,r){return Q(this,e,n,t,r)[0].attributes}}},{name:function(t){return"has".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i){var o=Q(this,e,n,t,r,i),a=o[0],u=o[1];return a.attributes.hasOwnProperty(u)}}},{name:function(t){return"set".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i,o){var a=Q(this,e,n,t,r,i,o),u=a[0],c=a[1],s=a[2];return u.attributes[c]=s,this.emit("nodeAttributesUpdated",{key:u.key,type:"set",attributes:u.attributes,name:c}),this}}},{name:function(t){return"update".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i,o){var a=Q(this,e,n,t,r,i,o),u=a[0],c=a[1],s=a[2];if("function"!=typeof s)throw new F("Graph.".concat(e,": updater should be a function."));var d=u.attributes,h=s(d[c]);return d[c]=h,this.emit("nodeAttributesUpdated",{key:u.key,type:"set",attributes:u.attributes,name:c}),this}}},{name:function(t){return"remove".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i){var o=Q(this,e,n,t,r,i),a=o[0],u=o[1];return delete a.attributes[u],this.emit("nodeAttributesUpdated",{key:a.key,type:"remove",attributes:a.attributes,name:u}),this}}},{name:function(t){return"replace".concat(t,"Attributes")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i){var o=Q(this,e,n,t,r,i),a=o[0],u=o[1];if(!h(u))throw new F("Graph.".concat(e,": provided attributes are not a plain object."));return a.attributes=u,this.emit("nodeAttributesUpdated",{key:a.key,type:"replace",attributes:a.attributes}),this}}},{name:function(t){return"merge".concat(t,"Attributes")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i){var o=Q(this,e,n,t,r,i),a=o[0],u=o[1];if(!h(u))throw new F("Graph.".concat(e,": provided attributes are not a plain object."));return c(a.attributes,u),this.emit("nodeAttributesUpdated",{key:a.key,type:"merge",attributes:a.attributes,data:u}),this}}},{name:function(t){return"update".concat(t,"Attributes")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i){var o=Q(this,e,n,t,r,i),a=o[0],u=o[1];if("function"!=typeof u)throw new F("Graph.".concat(e,": provided updater is not a function."));return a.attributes=u(a.attributes),this.emit("nodeAttributesUpdated",{key:a.key,type:"update",attributes:a.attributes}),this}}}];var Z=[{name:function(t){return"get".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r){var i;if("mixed"!==this.type&&"mixed"!==n&&n!==this.type)throw new Y("Graph.".concat(e,": cannot find this type of edges in your ").concat(this.type," graph."));if(arguments.length>2){if(this.multi)throw new Y("Graph.".concat(e,": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));var o=""+t,a=""+r;if(r=arguments[2],!(i=s(this,o,a,n)))throw new I("Graph.".concat(e,': could not find an edge for the given path ("').concat(o,'" - "').concat(a,'").'))}else{if("mixed"!==n)throw new Y("Graph.".concat(e,": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));if(t=""+t,!(i=this._edges.get(t)))throw new I("Graph.".concat(e,': could not find the "').concat(t,'" edge in the graph.'))}return i.attributes[r]}}},{name:function(t){return"get".concat(t,"Attributes")},attacher:function(t,e,n){t.prototype[e]=function(t){var r;if("mixed"!==this.type&&"mixed"!==n&&n!==this.type)throw new Y("Graph.".concat(e,": cannot find this type of edges in your ").concat(this.type," graph."));if(arguments.length>1){if(this.multi)throw new Y("Graph.".concat(e,": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));var i=""+t,o=""+arguments[1];if(!(r=s(this,i,o,n)))throw new I("Graph.".concat(e,': could not find an edge for the given path ("').concat(i,'" - "').concat(o,'").'))}else{if("mixed"!==n)throw new Y("Graph.".concat(e,": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));if(t=""+t,!(r=this._edges.get(t)))throw new I("Graph.".concat(e,': could not find the "').concat(t,'" edge in the graph.'))}return r.attributes}}},{name:function(t){return"has".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r){var i;if("mixed"!==this.type&&"mixed"!==n&&n!==this.type)throw new Y("Graph.".concat(e,": cannot find this type of edges in your ").concat(this.type," graph."));if(arguments.length>2){if(this.multi)throw new Y("Graph.".concat(e,": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));var o=""+t,a=""+r;if(r=arguments[2],!(i=s(this,o,a,n)))throw new I("Graph.".concat(e,': could not find an edge for the given path ("').concat(o,'" - "').concat(a,'").'))}else{if("mixed"!==n)throw new Y("Graph.".concat(e,": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));if(t=""+t,!(i=this._edges.get(t)))throw new I("Graph.".concat(e,': could not find the "').concat(t,'" edge in the graph.'))}return i.attributes.hasOwnProperty(r)}}},{name:function(t){return"set".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i){var o;if("mixed"!==this.type&&"mixed"!==n&&n!==this.type)throw new Y("Graph.".concat(e,": cannot find this type of edges in your ").concat(this.type," graph."));if(arguments.length>3){if(this.multi)throw new Y("Graph.".concat(e,": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));var a=""+t,u=""+r;if(r=arguments[2],i=arguments[3],!(o=s(this,a,u,n)))throw new I("Graph.".concat(e,': could not find an edge for the given path ("').concat(a,'" - "').concat(u,'").'))}else{if("mixed"!==n)throw new Y("Graph.".concat(e,": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));if(t=""+t,!(o=this._edges.get(t)))throw new I("Graph.".concat(e,': could not find the "').concat(t,'" edge in the graph.'))}return o.attributes[r]=i,this.emit("edgeAttributesUpdated",{key:o.key,type:"set",attributes:o.attributes,name:r}),this}}},{name:function(t){return"update".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r,i){var o;if("mixed"!==this.type&&"mixed"!==n&&n!==this.type)throw new Y("Graph.".concat(e,": cannot find this type of edges in your ").concat(this.type," graph."));if(arguments.length>3){if(this.multi)throw new Y("Graph.".concat(e,": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));var a=""+t,u=""+r;if(r=arguments[2],i=arguments[3],!(o=s(this,a,u,n)))throw new I("Graph.".concat(e,': could not find an edge for the given path ("').concat(a,'" - "').concat(u,'").'))}else{if("mixed"!==n)throw new Y("Graph.".concat(e,": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));if(t=""+t,!(o=this._edges.get(t)))throw new I("Graph.".concat(e,': could not find the "').concat(t,'" edge in the graph.'))}if("function"!=typeof i)throw new F("Graph.".concat(e,": updater should be a function."));return o.attributes[r]=i(o.attributes[r]),this.emit("edgeAttributesUpdated",{key:o.key,type:"set",attributes:o.attributes,name:r}),this}}},{name:function(t){return"remove".concat(t,"Attribute")},attacher:function(t,e,n){t.prototype[e]=function(t,r){var i;if("mixed"!==this.type&&"mixed"!==n&&n!==this.type)throw new Y("Graph.".concat(e,": cannot find this type of edges in your ").concat(this.type," graph."));if(arguments.length>2){if(this.multi)throw new Y("Graph.".concat(e,": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));var o=""+t,a=""+r;if(r=arguments[2],!(i=s(this,o,a,n)))throw new I("Graph.".concat(e,': could not find an edge for the given path ("').concat(o,'" - "').concat(a,'").'))}else{if("mixed"!==n)throw new Y("Graph.".concat(e,": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));if(t=""+t,!(i=this._edges.get(t)))throw new I("Graph.".concat(e,': could not find the "').concat(t,'" edge in the graph.'))}return delete i.attributes[r],this.emit("edgeAttributesUpdated",{key:i.key,type:"remove",attributes:i.attributes,name:r}),this}}},{name:function(t){return"replace".concat(t,"Attributes")},attacher:function(t,e,n){t.prototype[e]=function(t,r){var i;if("mixed"!==this.type&&"mixed"!==n&&n!==this.type)throw new Y("Graph.".concat(e,": cannot find this type of edges in your ").concat(this.type," graph."));if(arguments.length>2){if(this.multi)throw new Y("Graph.".concat(e,": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));var o=""+t,a=""+r;if(r=arguments[2],!(i=s(this,o,a,n)))throw new I("Graph.".concat(e,': could not find an edge for the given path ("').concat(o,'" - "').concat(a,'").'))}else{if("mixed"!==n)throw new Y("Graph.".concat(e,": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));if(t=""+t,!(i=this._edges.get(t)))throw new I("Graph.".concat(e,': could not find the "').concat(t,'" edge in the graph.'))}if(!h(r))throw new F("Graph.".concat(e,": provided attributes are not a plain object."));return i.attributes=r,this.emit("edgeAttributesUpdated",{key:i.key,type:"replace",attributes:i.attributes}),this}}},{name:function(t){return"merge".concat(t,"Attributes")},attacher:function(t,e,n){t.prototype[e]=function(t,r){var i;if("mixed"!==this.type&&"mixed"!==n&&n!==this.type)throw new Y("Graph.".concat(e,": cannot find this type of edges in your ").concat(this.type," graph."));if(arguments.length>2){if(this.multi)throw new Y("Graph.".concat(e,": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));var o=""+t,a=""+r;if(r=arguments[2],!(i=s(this,o,a,n)))throw new I("Graph.".concat(e,': could not find an edge for the given path ("').concat(o,'" - "').concat(a,'").'))}else{if("mixed"!==n)throw new Y("Graph.".concat(e,": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));if(t=""+t,!(i=this._edges.get(t)))throw new I("Graph.".concat(e,': could not find the "').concat(t,'" edge in the graph.'))}if(!h(r))throw new F("Graph.".concat(e,": provided attributes are not a plain object."));return c(i.attributes,r),this.emit("edgeAttributesUpdated",{key:i.key,type:"merge",attributes:i.attributes,data:r}),this}}},{name:function(t){return"update".concat(t,"Attributes")},attacher:function(t,e,n){t.prototype[e]=function(t,r){var i;if("mixed"!==this.type&&"mixed"!==n&&n!==this.type)throw new Y("Graph.".concat(e,": cannot find this type of edges in your ").concat(this.type," graph."));if(arguments.length>2){if(this.multi)throw new Y("Graph.".concat(e,": cannot use a {source,target} combo when asking about an edge's attributes in a MultiGraph since we cannot infer the one you want information about."));var o=""+t,a=""+r;if(r=arguments[2],!(i=s(this,o,a,n)))throw new I("Graph.".concat(e,': could not find an edge for the given path ("').concat(o,'" - "').concat(a,'").'))}else{if("mixed"!==n)throw new Y("Graph.".concat(e,": calling this method with only a key (vs. a source and target) does not make sense since an edge with this key could have the other type."));if(t=""+t,!(i=this._edges.get(t)))throw new I("Graph.".concat(e,': could not find the "').concat(t,'" edge in the graph.'))}if("function"!=typeof r)throw new F("Graph.".concat(e,": provided updater is not a function."));return i.attributes=r(i.attributes),this.emit("edgeAttributesUpdated",{key:i.key,type:"update",attributes:i.attributes}),this}}}];var $=O,tt=R,et=function(){var t=arguments,e=null,n=-1;return new $((function(){for(var r=null;;){if(null===e){if(++n>=t.length)return{done:!0};e=tt(t[n])}if(!0!==(r=e.next()).done)break;e=null}return r}))},nt=[{name:"edges",type:"mixed"},{name:"inEdges",type:"directed",direction:"in"},{name:"outEdges",type:"directed",direction:"out"},{name:"inboundEdges",type:"mixed",direction:"in"},{name:"outboundEdges",type:"mixed",direction:"out"},{name:"directedEdges",type:"directed"},{name:"undirectedEdges",type:"undirected"}];function rt(t,e,n,r){var i=!1;for(var o in e)if(o!==r){var a=e[o];if(i=n(a.key,a.attributes,a.source.key,a.target.key,a.source.attributes,a.target.attributes,a.undirected),t&&i)return a.key}}function it(t,e,n,r){var i,o,a,u=!1;for(var c in e)if(c!==r){i=e[c];do{if(o=i.source,a=i.target,u=n(i.key,i.attributes,o.key,a.key,o.attributes,a.attributes,i.undirected),t&&u)return i.key;i=i.next}while(void 0!==i)}}function ot(t,e){var n,r=Object.keys(t),i=r.length,o=0;return new O((function(){do{if(n)n=n.next;else{if(o>=i)return{done:!0};var a=r[o++];if(a===e){n=void 0;continue}n=t[a]}}while(!n);return{done:!1,value:{edge:n.key,attributes:n.attributes,source:n.source.key,target:n.target.key,sourceAttributes:n.source.attributes,targetAttributes:n.target.attributes,undirected:n.undirected}}}))}function at(t,e,n,r){var i=e[n];if(i){var o=i.source,a=i.target;return r(i.key,i.attributes,o.key,a.key,o.attributes,a.attributes,i.undirected)&&t?i.key:void 0}}function ut(t,e,n,r){var i=e[n];if(i){var o=!1;do{if(o=r(i.key,i.attributes,i.source.key,i.target.key,i.source.attributes,i.target.attributes,i.undirected),t&&o)return i.key;i=i.next}while(void 0!==i)}}function ct(t,e){var n=t[e];return void 0!==n.next?new O((function(){if(!n)return{done:!0};var t={edge:n.key,attributes:n.attributes,source:n.source.key,target:n.target.key,sourceAttributes:n.source.attributes,targetAttributes:n.target.attributes,undirected:n.undirected};return n=n.next,{done:!1,value:t}})):O.of({edge:n.key,attributes:n.attributes,source:n.source.key,target:n.target.key,sourceAttributes:n.source.attributes,targetAttributes:n.target.attributes,undirected:n.undirected})}function st(t,e){if(0===t.size)return[];if("mixed"===e||e===t.type)return"function"==typeof Array.from?Array.from(t._edges.keys()):T(t._edges.keys(),t._edges.size);for(var n,r,i="undirected"===e?t.undirectedSize:t.directedSize,o=new Array(i),a="undirected"===e,u=t._edges.values(),c=0;!0!==(n=u.next()).done;)(r=n.value).undirected===a&&(o[c++]=r.key);return o}function dt(t,e,n,r){if(0!==e.size)for(var i,o,a="mixed"!==n&&n!==e.type,u="undirected"===n,c=!1,s=e._edges.values();!0!==(i=s.next()).done;)if(o=i.value,!a||o.undirected===u){var d=o,h=d.key,p=d.attributes,f=d.source,l=d.target;if(c=r(h,p,f.key,l.key,f.attributes,l.attributes,o.undirected),t&&c)return h}}function ht(t,e){if(0===t.size)return O.empty();var n="mixed"!==e&&e!==t.type,r="undirected"===e,i=t._edges.values();return new O((function(){for(var t,e;;){if((t=i.next()).done)return t;if(e=t.value,!n||e.undirected===r)break}return{value:{edge:e.key,attributes:e.attributes,source:e.source.key,target:e.target.key,sourceAttributes:e.source.attributes,targetAttributes:e.target.attributes,undirected:e.undirected},done:!1}}))}function pt(t,e,n,r,i,o){var a,u=e?it:rt;if("undirected"!==n){if("out"!==r&&(a=u(t,i.in,o),t&&a))return a;if("in"!==r&&(a=u(t,i.out,o,r?void 0:i.key),t&&a))return a}if("directed"!==n&&(a=u(t,i.undirected,o),t&&a))return a}function ft(t,e,n,r){var i=[];return pt(!1,t,e,n,r,(function(t){i.push(t)})),i}function lt(t,e,n){var r=O.empty();return"undirected"!==t&&("out"!==e&&void 0!==n.in&&(r=et(r,ot(n.in))),"in"!==e&&void 0!==n.out&&(r=et(r,ot(n.out,e?void 0:n.key)))),"directed"!==t&&void 0!==n.undirected&&(r=et(r,ot(n.undirected))),r}function gt(t,e,n,r,i,o,a){var u,c=n?ut:at;if("undirected"!==e){if(void 0!==i.in&&"out"!==r&&(u=c(t,i.in,o,a),t&&u))return u;if(void 0!==i.out&&"in"!==r&&(r||i.key!==o)&&(u=c(t,i.out,o,a),t&&u))return u}if("directed"!==e&&void 0!==i.undirected&&(u=c(t,i.undirected,o,a),t&&u))return u}function yt(t,e,n,r,i){var o=[];return gt(!1,t,e,n,r,i,(function(t){o.push(t)})),o}function wt(t,e,n,r){var i=O.empty();return"undirected"!==t&&(void 0!==n.in&&"out"!==e&&r in n.in&&(i=et(i,ct(n.in,r))),void 0!==n.out&&"in"!==e&&r in n.out&&(e||n.key!==r)&&(i=et(i,ct(n.out,r)))),"directed"!==t&&void 0!==n.undirected&&r in n.undirected&&(i=et(i,ct(n.undirected,r))),i}var vt=[{name:"neighbors",type:"mixed"},{name:"inNeighbors",type:"directed",direction:"in"},{name:"outNeighbors",type:"directed",direction:"out"},{name:"inboundNeighbors",type:"mixed",direction:"in"},{name:"outboundNeighbors",type:"mixed",direction:"out"},{name:"directedNeighbors",type:"directed"},{name:"undirectedNeighbors",type:"undirected"}];function bt(){this.A=null,this.B=null}function mt(t,e,n,r,i){for(var o in r){var a=r[o],u=a.source,c=a.target,s=u===n?c:u;if(!e||!e.has(s.key)){var d=i(s.key,s.attributes);if(t&&d)return s.key}}}function kt(t,e,n,r,i){if("mixed"!==e){if("undirected"===e)return mt(t,null,r,r.undirected,i);if("string"==typeof n)return mt(t,null,r,r[n],i)}var o,a=new bt;if("undirected"!==e){if("out"!==n){if(o=mt(t,null,r,r.in,i),t&&o)return o;a.wrap(r.in)}if("in"!==n){if(o=mt(t,a,r,r.out,i),t&&o)return o;a.wrap(r.out)}}if("directed"!==e&&(o=mt(t,a,r,r.undirected,i),t&&o))return o}function _t(t,e,n){var r=Object.keys(n),i=r.length,o=0;return new O((function(){var a=null;do{if(o>=i)return t&&t.wrap(n),{done:!0};var u=n[r[o++]],c=u.source,s=u.target;a=c===e?s:c,t&&t.has(a.key)&&(a=null)}while(null===a);return{done:!1,value:{neighbor:a.key,attributes:a.attributes}}}))}function Gt(t,e){var n=e.name,r=e.type,i=e.direction;t.prototype[n]=function(t){if("mixed"!==r&&"mixed"!==this.type&&r!==this.type)return[];t=""+t;var e=this._nodes.get(t);if(void 0===e)throw new I("Graph.".concat(n,': could not find the "').concat(t,'" node in the graph.'));return function(t,e,n){if("mixed"!==t){if("undirected"===t)return Object.keys(n.undirected);if("string"==typeof e)return Object.keys(n[e])}var r=[];return kt(!1,t,e,n,(function(t){r.push(t)})),r}("mixed"===r?this.type:r,i,e)}}function xt(t,e){var n=e.name,r=e.type,i=e.direction,o=n.slice(0,-1)+"Entries";t.prototype[o]=function(t){if("mixed"!==r&&"mixed"!==this.type&&r!==this.type)return O.empty();t=""+t;var e=this._nodes.get(t);if(void 0===e)throw new I("Graph.".concat(o,': could not find the "').concat(t,'" node in the graph.'));return function(t,e,n){if("mixed"!==t){if("undirected"===t)return _t(null,n,n.undirected);if("string"==typeof e)return _t(null,n,n[e])}var r=O.empty(),i=new bt;return"undirected"!==t&&("out"!==e&&(r=et(r,_t(i,n,n.in))),"in"!==e&&(r=et(r,_t(i,n,n.out)))),"directed"!==t&&(r=et(r,_t(i,n,n.undirected))),r}("mixed"===r?this.type:r,i,e)}}function Et(t,e,n,r,i){for(var o,a,u,c,s,d,h,p=r._nodes.values(),f=r.type;!0!==(o=p.next()).done;){var l=!1;if(a=o.value,"undirected"!==f)for(u in c=a.out){s=c[u];do{if(d=s.target,l=!0,h=i(a.key,d.key,a.attributes,d.attributes,s.key,s.attributes,s.undirected),t&&h)return s;s=s.next}while(s)}if("directed"!==f)for(u in c=a.undirected)if(!(e&&a.key>u)){s=c[u];do{if((d=s.target).key!==u&&(d=s.source),l=!0,h=i(a.key,d.key,a.attributes,d.attributes,s.key,s.attributes,s.undirected),t&&h)return s;s=s.next}while(s)}if(n&&!l&&(h=i(a.key,null,a.attributes,null,null,null,null),t&&h))return null}}function At(t){if(!h(t))throw new F('Graph.import: invalid serialized node. A serialized node should be a plain object with at least a "key" property.');if(!("key"in t))throw new F("Graph.import: serialized node is missing its key.");if("attributes"in t&&(!h(t.attributes)||null===t.attributes))throw new F("Graph.import: invalid attributes. Attributes should be a plain object, null or omitted.")}function St(t){if(!h(t))throw new F('Graph.import: invalid serialized edge. A serialized edge should be a plain object with at least a "source" & "target" property.');if(!("source"in t))throw new F("Graph.import: serialized edge is missing its source.");if(!("target"in t))throw new F("Graph.import: serialized edge is missing its target.");if("attributes"in t&&(!h(t.attributes)||null===t.attributes))throw new F("Graph.import: invalid attributes. Attributes should be a plain object, null or omitted.");if("undirected"in t&&"boolean"!=typeof t.undirected)throw new F("Graph.import: invalid undirectedness information. Undirected should be boolean or omitted.")}bt.prototype.wrap=function(t){null===this.A?this.A=t:null===this.B&&(this.B=t)},bt.prototype.has=function(t){return null!==this.A&&t in this.A||null!==this.B&&t in this.B};var Dt,Lt=(Dt=255&Math.floor(256*Math.random()),function(){return Dt++}),Ut=new Set(["directed","undirected","mixed"]),Nt=new Set(["domain","_events","_eventsCount","_maxListeners"]),jt={allowSelfLoops:!0,multi:!1,type:"mixed"};function Ot(t,e,n){var r=new t.NodeDataClass(e,n);return t._nodes.set(e,r),t.emit("nodeAdded",{key:e,attributes:n}),r}function Ct(t,e,n,r,i,o,a,u){if(!r&&"undirected"===t.type)throw new Y("Graph.".concat(e,": you cannot add a directed edge to an undirected graph. Use the #.addEdge or #.addUndirectedEdge instead."));if(r&&"directed"===t.type)throw new Y("Graph.".concat(e,": you cannot add an undirected edge to a directed graph. Use the #.addEdge or #.addDirectedEdge instead."));if(u&&!h(u))throw new F("Graph.".concat(e,': invalid attributes. Expecting an object but got "').concat(u,'"'));if(o=""+o,a=""+a,u=u||{},!t.allowSelfLoops&&o===a)throw new Y("Graph.".concat(e,': source & target are the same ("').concat(o,"\"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false."));var c=t._nodes.get(o),s=t._nodes.get(a);if(!c)throw new I("Graph.".concat(e,': source node "').concat(o,'" not found.'));if(!s)throw new I("Graph.".concat(e,': target node "').concat(a,'" not found.'));var d={key:null,undirected:r,source:o,target:a,attributes:u};if(n)i=t._edgeKeyGenerator();else if(i=""+i,t._edges.has(i))throw new Y("Graph.".concat(e,': the "').concat(i,'" edge already exists in the graph.'));if(!t.multi&&(r?void 0!==c.undirected[a]:void 0!==c.out[a]))throw new Y("Graph.".concat(e,': an edge linking "').concat(o,'" to "').concat(a,"\" already exists. If you really want to add multiple edges linking those nodes, you should create a multi graph by using the 'multi' option."));var p=new H(r,i,c,s,u);t._edges.set(i,p);var f=o===a;return r?(c.undirectedDegree++,s.undirectedDegree++,f&&t._undirectedSelfLoopCount++):(c.outDegree++,s.inDegree++,f&&t._directedSelfLoopCount++),t.multi?p.attachMulti():p.attach(),r?t._undirectedSize++:t._directedSize++,d.key=i,t.emit("edgeAdded",d),i}function zt(t,e,n,r,i,o,a,u,s){if(!r&&"undirected"===t.type)throw new Y("Graph.".concat(e,": you cannot merge/update a directed edge to an undirected graph. Use the #.mergeEdge/#.updateEdge or #.addUndirectedEdge instead."));if(r&&"directed"===t.type)throw new Y("Graph.".concat(e,": you cannot merge/update an undirected edge to a directed graph. Use the #.mergeEdge/#.updateEdge or #.addDirectedEdge instead."));if(u)if(s){if("function"!=typeof u)throw new F("Graph.".concat(e,': invalid updater function. Expecting a function but got "').concat(u,'"'))}else if(!h(u))throw new F("Graph.".concat(e,': invalid attributes. Expecting an object but got "').concat(u,'"'));var d;if(o=""+o,a=""+a,s&&(d=u,u=void 0),!t.allowSelfLoops&&o===a)throw new Y("Graph.".concat(e,': source & target are the same ("').concat(o,"\"), thus creating a loop explicitly forbidden by this graph 'allowSelfLoops' option set to false."));var p,f,l=t._nodes.get(o),g=t._nodes.get(a);if(!n&&(p=t._edges.get(i))){if(!(p.source.key===o&&p.target.key===a||r&&p.source.key===a&&p.target.key===o))throw new Y("Graph.".concat(e,': inconsistency detected when attempting to merge the "').concat(i,'" edge with "').concat(o,'" source & "').concat(a,'" target vs. ("').concat(p.source.key,'", "').concat(p.target.key,'").'));f=p}if(f||t.multi||!l||(f=r?l.undirected[a]:l.out[a]),f){var y=[f.key,!1,!1,!1];if(s?!d:!u)return y;if(s){var w=f.attributes;f.attributes=d(w),t.emit("edgeAttributesUpdated",{type:"replace",key:f.key,attributes:f.attributes})}else c(f.attributes,u),t.emit("edgeAttributesUpdated",{type:"merge",key:f.key,attributes:f.attributes,data:u});return y}u=u||{},s&&d&&(u=d(u));var v={key:null,undirected:r,source:o,target:a,attributes:u};if(n)i=t._edgeKeyGenerator();else if(i=""+i,t._edges.has(i))throw new Y("Graph.".concat(e,': the "').concat(i,'" edge already exists in the graph.'));var b=!1,m=!1;l||(l=Ot(t,o,{}),b=!0,o===a&&(g=l,m=!0)),g||(g=Ot(t,a,{}),m=!0),p=new H(r,i,l,g,u),t._edges.set(i,p);var k=o===a;return r?(l.undirectedDegree++,g.undirectedDegree++,k&&t._undirectedSelfLoopCount++):(l.outDegree++,g.inDegree++,k&&t._directedSelfLoopCount++),t.multi?p.attachMulti():p.attach(),r?t._undirectedSize++:t._directedSize++,v.key=i,t.emit("edgeAdded",v),[i,!0,b,m]}function Mt(t,e){t._edges.delete(e.key);var n=e.source,r=e.target,i=e.attributes,o=e.undirected,a=n===r;o?(n.undirectedDegree--,r.undirectedDegree--,a&&t._undirectedSelfLoopCount--):(n.outDegree--,r.inDegree--,a&&t._directedSelfLoopCount--),t.multi?e.detachMulti():e.detach(),o?t._undirectedSize--:t._directedSize--,t.emit("edgeDropped",{key:e.key,attributes:i,source:n.key,target:r.key,undirected:o})}var Wt=function(n){function r(t){var e;if(e=n.call(this)||this,"boolean"!=typeof(t=c({},jt,t)).multi)throw new F("Graph.constructor: invalid 'multi' option. Expecting a boolean but got \"".concat(t.multi,'".'));if(!Ut.has(t.type))throw new F('Graph.constructor: invalid \'type\' option. Should be one of "mixed", "directed" or "undirected" but got "'.concat(t.type,'".'));if("boolean"!=typeof t.allowSelfLoops)throw new F("Graph.constructor: invalid 'allowSelfLoops' option. Expecting a boolean but got \"".concat(t.allowSelfLoops,'".'));var r="mixed"===t.type?q:"directed"===t.type?J:V;f(u(e),"NodeDataClass",r);var i="geid_"+Lt()+"_",o=0;return f(u(e),"_attributes",{}),f(u(e),"_nodes",new Map),f(u(e),"_edges",new Map),f(u(e),"_directedSize",0),f(u(e),"_undirectedSize",0),f(u(e),"_directedSelfLoopCount",0),f(u(e),"_undirectedSelfLoopCount",0),f(u(e),"_edgeKeyGenerator",(function(){var t;do{t=i+o++}while(e._edges.has(t));return t})),f(u(e),"_options",t),Nt.forEach((function(t){return f(u(e),t,e[t])})),l(u(e),"order",(function(){return e._nodes.size})),l(u(e),"size",(function(){return e._edges.size})),l(u(e),"directedSize",(function(){return e._directedSize})),l(u(e),"undirectedSize",(function(){return e._undirectedSize})),l(u(e),"selfLoopCount",(function(){return e._directedSelfLoopCount+e._undirectedSelfLoopCount})),l(u(e),"directedSelfLoopCount",(function(){return e._directedSelfLoopCount})),l(u(e),"undirectedSelfLoopCount",(function(){return e._undirectedSelfLoopCount})),l(u(e),"multi",e._options.multi),l(u(e),"type",e._options.type),l(u(e),"allowSelfLoops",e._options.allowSelfLoops),l(u(e),"implementation",(function(){return"graphology"})),e}e(r,n);var i=r.prototype;return i._resetInstanceCounters=function(){this._directedSize=0,this._undirectedSize=0,this._directedSelfLoopCount=0,this._undirectedSelfLoopCount=0},i.hasNode=function(t){return this._nodes.has(""+t)},i.hasDirectedEdge=function(t,e){if("undirected"===this.type)return!1;if(1===arguments.length){var n=""+t,r=this._edges.get(n);return!!r&&!r.undirected}if(2===arguments.length){t=""+t,e=""+e;var i=this._nodes.get(t);if(!i)return!1;var o=i.out[e];return!!o&&(!this.multi||!!o.size)}throw new F("Graph.hasDirectedEdge: invalid arity (".concat(arguments.length,", instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target."))},i.hasUndirectedEdge=function(t,e){if("directed"===this.type)return!1;if(1===arguments.length){var n=""+t,r=this._edges.get(n);return!!r&&r.undirected}if(2===arguments.length){t=""+t,e=""+e;var i=this._nodes.get(t);if(!i)return!1;var o=i.undirected[e];return!!o&&(!this.multi||!!o.size)}throw new F("Graph.hasDirectedEdge: invalid arity (".concat(arguments.length,", instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target."))},i.hasEdge=function(t,e){if(1===arguments.length){var n=""+t;return this._edges.has(n)}if(2===arguments.length){t=""+t,e=""+e;var r=this._nodes.get(t);if(!r)return!1;var i=void 0!==r.out&&r.out[e];return i||(i=void 0!==r.undirected&&r.undirected[e]),!!i&&(!this.multi||!!i.size)}throw new F("Graph.hasEdge: invalid arity (".concat(arguments.length,", instead of 1 or 2). You can either ask for an edge id or for the existence of an edge between a source & a target."))},i.directedEdge=function(t,e){if("undirected"!==this.type){if(t=""+t,e=""+e,this.multi)throw new Y("Graph.directedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.directedEdges instead.");var n=this._nodes.get(t);if(!n)throw new I('Graph.directedEdge: could not find the "'.concat(t,'" source node in the graph.'));if(!this._nodes.has(e))throw new I('Graph.directedEdge: could not find the "'.concat(e,'" target node in the graph.'));var r=n.out&&n.out[e]||void 0;return r?r.key:void 0}},i.undirectedEdge=function(t,e){if("directed"!==this.type){if(t=""+t,e=""+e,this.multi)throw new Y("Graph.undirectedEdge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.undirectedEdges instead.");var n=this._nodes.get(t);if(!n)throw new I('Graph.undirectedEdge: could not find the "'.concat(t,'" source node in the graph.'));if(!this._nodes.has(e))throw new I('Graph.undirectedEdge: could not find the "'.concat(e,'" target node in the graph.'));var r=n.undirected&&n.undirected[e]||void 0;return r?r.key:void 0}},i.edge=function(t,e){if(this.multi)throw new Y("Graph.edge: this method is irrelevant with multigraphs since there might be multiple edges between source & target. See #.edges instead.");t=""+t,e=""+e;var n=this._nodes.get(t);if(!n)throw new I('Graph.edge: could not find the "'.concat(t,'" source node in the graph.'));if(!this._nodes.has(e))throw new I('Graph.edge: could not find the "'.concat(e,'" target node in the graph.'));var r=n.out&&n.out[e]||n.undirected&&n.undirected[e]||void 0;if(r)return r.key},i.areDirectedNeighbors=function(t,e){t=""+t,e=""+e;var n=this._nodes.get(t);if(!n)throw new I('Graph.areDirectedNeighbors: could not find the "'.concat(t,'" node in the graph.'));return"undirected"!==this.type&&(e in n.in||e in n.out)},i.areOutNeighbors=function(t,e){t=""+t,e=""+e;var n=this._nodes.get(t);if(!n)throw new I('Graph.areOutNeighbors: could not find the "'.concat(t,'" node in the graph.'));return"undirected"!==this.type&&e in n.out},i.areInNeighbors=function(t,e){t=""+t,e=""+e;var n=this._nodes.get(t);if(!n)throw new I('Graph.areInNeighbors: could not find the "'.concat(t,'" node in the graph.'));return"undirected"!==this.type&&e in n.in},i.areUndirectedNeighbors=function(t,e){t=""+t,e=""+e;var n=this._nodes.get(t);if(!n)throw new I('Graph.areUndirectedNeighbors: could not find the "'.concat(t,'" node in the graph.'));return"directed"!==this.type&&e in n.undirected},i.areNeighbors=function(t,e){t=""+t,e=""+e;var n=this._nodes.get(t);if(!n)throw new I('Graph.areNeighbors: could not find the "'.concat(t,'" node in the graph.'));return"undirected"!==this.type&&(e in n.in||e in n.out)||"directed"!==this.type&&e in n.undirected},i.areInboundNeighbors=function(t,e){t=""+t,e=""+e;var n=this._nodes.get(t);if(!n)throw new I('Graph.areInboundNeighbors: could not find the "'.concat(t,'" node in the graph.'));return"undirected"!==this.type&&e in n.in||"directed"!==this.type&&e in n.undirected},i.areOutboundNeighbors=function(t,e){t=""+t,e=""+e;var n=this._nodes.get(t);if(!n)throw new I('Graph.areOutboundNeighbors: could not find the "'.concat(t,'" node in the graph.'));return"undirected"!==this.type&&e in n.out||"directed"!==this.type&&e in n.undirected},i.inDegree=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.inDegree: could not find the "'.concat(t,'" node in the graph.'));return"undirected"===this.type?0:e.inDegree},i.outDegree=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.outDegree: could not find the "'.concat(t,'" node in the graph.'));return"undirected"===this.type?0:e.outDegree},i.directedDegree=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.directedDegree: could not find the "'.concat(t,'" node in the graph.'));return"undirected"===this.type?0:e.inDegree+e.outDegree},i.undirectedDegree=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.undirectedDegree: could not find the "'.concat(t,'" node in the graph.'));return"directed"===this.type?0:e.undirectedDegree},i.inboundDegree=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.inboundDegree: could not find the "'.concat(t,'" node in the graph.'));var n=0;return"directed"!==this.type&&(n+=e.undirectedDegree),"undirected"!==this.type&&(n+=e.inDegree),n},i.outboundDegree=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.outboundDegree: could not find the "'.concat(t,'" node in the graph.'));var n=0;return"directed"!==this.type&&(n+=e.undirectedDegree),"undirected"!==this.type&&(n+=e.outDegree),n},i.degree=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.degree: could not find the "'.concat(t,'" node in the graph.'));var n=0;return"directed"!==this.type&&(n+=e.undirectedDegree),"undirected"!==this.type&&(n+=e.inDegree+e.outDegree),n},i.inDegreeWithoutSelfLoops=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.inDegreeWithoutSelfLoops: could not find the "'.concat(t,'" node in the graph.'));if("undirected"===this.type)return 0;var n=e.in[t],r=n?this.multi?n.size:1:0;return e.inDegree-r},i.outDegreeWithoutSelfLoops=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.outDegreeWithoutSelfLoops: could not find the "'.concat(t,'" node in the graph.'));if("undirected"===this.type)return 0;var n=e.out[t],r=n?this.multi?n.size:1:0;return e.outDegree-r},i.directedDegreeWithoutSelfLoops=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.directedDegreeWithoutSelfLoops: could not find the "'.concat(t,'" node in the graph.'));if("undirected"===this.type)return 0;var n=e.out[t],r=n?this.multi?n.size:1:0;return e.inDegree+e.outDegree-2*r},i.undirectedDegreeWithoutSelfLoops=function(t){t=""+t;var e=this._nodes.get(t);if(!e)throw new I('Graph.undirectedDegreeWithoutSelfLoops: could not find the "'.concat(t,'" node in the graph.'));if("directed"===this.type)return 0;var n=e.undirected[t],r=n?this.multi?n.size:1:0;return e.undirectedDegree-2*r},i.inboundDegreeWithoutSelfLoops=function(t){t=""+t;var e,n=this._nodes.get(t);if(!n)throw new I('Graph.inboundDegreeWithoutSelfLoops: could not find the "'.concat(t,'" node in the graph.'));var r=0,i=0;return"directed"!==this.type&&(r+=n.undirectedDegree,i+=2*((e=n.undirected[t])?this.multi?e.size:1:0)),"undirected"!==this.type&&(r+=n.inDegree,i+=(e=n.out[t])?this.multi?e.size:1:0),r-i},i.outboundDegreeWithoutSelfLoops=function(t){t=""+t;var e,n=this._nodes.get(t);if(!n)throw new I('Graph.outboundDegreeWithoutSelfLoops: could not find the "'.concat(t,'" node in the graph.'));var r=0,i=0;return"directed"!==this.type&&(r+=n.undirectedDegree,i+=2*((e=n.undirected[t])?this.multi?e.size:1:0)),"undirected"!==this.type&&(r+=n.outDegree,i+=(e=n.in[t])?this.multi?e.size:1:0),r-i},i.degreeWithoutSelfLoops=function(t){t=""+t;var e,n=this._nodes.get(t);if(!n)throw new I('Graph.degreeWithoutSelfLoops: could not find the "'.concat(t,'" node in the graph.'));var r=0,i=0;return"directed"!==this.type&&(r+=n.undirectedDegree,i+=2*((e=n.undirected[t])?this.multi?e.size:1:0)),"undirected"!==this.type&&(r+=n.inDegree+n.outDegree,i+=2*((e=n.out[t])?this.multi?e.size:1:0)),r-i},i.source=function(t){t=""+t;var e=this._edges.get(t);if(!e)throw new I('Graph.source: could not find the "'.concat(t,'" edge in the graph.'));return e.source.key},i.target=function(t){t=""+t;var e=this._edges.get(t);if(!e)throw new I('Graph.target: could not find the "'.concat(t,'" edge in the graph.'));return e.target.key},i.extremities=function(t){t=""+t;var e=this._edges.get(t);if(!e)throw new I('Graph.extremities: could not find the "'.concat(t,'" edge in the graph.'));return[e.source.key,e.target.key]},i.opposite=function(t,e){t=""+t,e=""+e;var n=this._edges.get(e);if(!n)throw new I('Graph.opposite: could not find the "'.concat(e,'" edge in the graph.'));var r=n.source.key,i=n.target.key;if(t===r)return i;if(t===i)return r;throw new I('Graph.opposite: the "'.concat(t,'" node is not attached to the "').concat(e,'" edge (').concat(r,", ").concat(i,")."))},i.hasExtremity=function(t,e){t=""+t,e=""+e;var n=this._edges.get(t);if(!n)throw new I('Graph.hasExtremity: could not find the "'.concat(t,'" edge in the graph.'));return n.source.key===e||n.target.key===e},i.isUndirected=function(t){t=""+t;var e=this._edges.get(t);if(!e)throw new I('Graph.isUndirected: could not find the "'.concat(t,'" edge in the graph.'));return e.undirected},i.isDirected=function(t){t=""+t;var e=this._edges.get(t);if(!e)throw new I('Graph.isDirected: could not find the "'.concat(t,'" edge in the graph.'));return!e.undirected},i.isSelfLoop=function(t){t=""+t;var e=this._edges.get(t);if(!e)throw new I('Graph.isSelfLoop: could not find the "'.concat(t,'" edge in the graph.'));return e.source===e.target},i.addNode=function(t,e){var n=function(t,e,n){if(n&&!h(n))throw new F('Graph.addNode: invalid attributes. Expecting an object but got "'.concat(n,'"'));if(e=""+e,n=n||{},t._nodes.has(e))throw new Y('Graph.addNode: the "'.concat(e,'" node already exist in the graph.'));var r=new t.NodeDataClass(e,n);return t._nodes.set(e,r),t.emit("nodeAdded",{key:e,attributes:n}),r}(this,t,e);return n.key},i.mergeNode=function(t,e){if(e&&!h(e))throw new F('Graph.mergeNode: invalid attributes. Expecting an object but got "'.concat(e,'"'));t=""+t,e=e||{};var n=this._nodes.get(t);return n?(e&&(c(n.attributes,e),this.emit("nodeAttributesUpdated",{type:"merge",key:t,attributes:n.attributes,data:e})),[t,!1]):(n=new this.NodeDataClass(t,e),this._nodes.set(t,n),this.emit("nodeAdded",{key:t,attributes:e}),[t,!0])},i.updateNode=function(t,e){if(e&&"function"!=typeof e)throw new F('Graph.updateNode: invalid updater function. Expecting a function but got "'.concat(e,'"'));t=""+t;var n=this._nodes.get(t);if(n){if(e){var r=n.attributes;n.attributes=e(r),this.emit("nodeAttributesUpdated",{type:"replace",key:t,attributes:n.attributes})}return[t,!1]}var i=e?e({}):{};return n=new this.NodeDataClass(t,i),this._nodes.set(t,n),this.emit("nodeAdded",{key:t,attributes:i}),[t,!0]},i.dropNode=function(t){t=""+t;var e,n=this._nodes.get(t);if(!n)throw new I('Graph.dropNode: could not find the "'.concat(t,'" node in the graph.'));if("undirected"!==this.type){for(var r in n.out){e=n.out[r];do{Mt(this,e),e=e.next}while(e)}for(var i in n.in){e=n.in[i];do{Mt(this,e),e=e.next}while(e)}}if("directed"!==this.type)for(var o in n.undirected){e=n.undirected[o];do{Mt(this,e),e=e.next}while(e)}this._nodes.delete(t),this.emit("nodeDropped",{key:t,attributes:n.attributes})},i.dropEdge=function(t){var e;if(arguments.length>1){var n=""+arguments[0],r=""+arguments[1];if(!(e=s(this,n,r,this.type)))throw new I('Graph.dropEdge: could not find the "'.concat(n,'" -> "').concat(r,'" edge in the graph.'))}else if(t=""+t,!(e=this._edges.get(t)))throw new I('Graph.dropEdge: could not find the "'.concat(t,'" edge in the graph.'));return Mt(this,e),this},i.dropDirectedEdge=function(t,e){if(arguments.length<2)throw new Y("Graph.dropDirectedEdge: it does not make sense to try and drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead.");if(this.multi)throw new Y("Graph.dropDirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones.");var n=s(this,t=""+t,e=""+e,"directed");if(!n)throw new I('Graph.dropDirectedEdge: could not find a "'.concat(t,'" -> "').concat(e,'" edge in the graph.'));return Mt(this,n),this},i.dropUndirectedEdge=function(t,e){if(arguments.length<2)throw new Y("Graph.dropUndirectedEdge: it does not make sense to drop a directed edge by key. What if the edge with this key is undirected? Use #.dropEdge for this purpose instead.");if(this.multi)throw new Y("Graph.dropUndirectedEdge: cannot use a {source,target} combo when dropping an edge in a MultiGraph since we cannot infer the one you want to delete as there could be multiple ones.");var n=s(this,t,e,"undirected");if(!n)throw new I('Graph.dropUndirectedEdge: could not find a "'.concat(t,'" -> "').concat(e,'" edge in the graph.'));return Mt(this,n),this},i.clear=function(){this._edges.clear(),this._nodes.clear(),this._resetInstanceCounters(),this.emit("cleared")},i.clearEdges=function(){for(var t,e=this._nodes.values();!0!==(t=e.next()).done;)t.value.clear();this._edges.clear(),this._resetInstanceCounters(),this.emit("edgesCleared")},i.getAttribute=function(t){return this._attributes[t]},i.getAttributes=function(){return this._attributes},i.hasAttribute=function(t){return this._attributes.hasOwnProperty(t)},i.setAttribute=function(t,e){return this._attributes[t]=e,this.emit("attributesUpdated",{type:"set",attributes:this._attributes,name:t}),this},i.updateAttribute=function(t,e){if("function"!=typeof e)throw new F("Graph.updateAttribute: updater should be a function.");var n=this._attributes[t];return this._attributes[t]=e(n),this.emit("attributesUpdated",{type:"set",attributes:this._attributes,name:t}),this},i.removeAttribute=function(t){return delete this._attributes[t],this.emit("attributesUpdated",{type:"remove",attributes:this._attributes,name:t}),this},i.replaceAttributes=function(t){if(!h(t))throw new F("Graph.replaceAttributes: provided attributes are not a plain object.");return this._attributes=t,this.emit("attributesUpdated",{type:"replace",attributes:this._attributes}),this},i.mergeAttributes=function(t){if(!h(t))throw new F("Graph.mergeAttributes: provided attributes are not a plain object.");return c(this._attributes,t),this.emit("attributesUpdated",{type:"merge",attributes:this._attributes,data:t}),this},i.updateAttributes=function(t){if("function"!=typeof t)throw new F("Graph.updateAttributes: provided updater is not a function.");return this._attributes=t(this._attributes),this.emit("attributesUpdated",{type:"update",attributes:this._attributes}),this},i.updateEachNodeAttributes=function(t,e){if("function"!=typeof t)throw new F("Graph.updateEachNodeAttributes: expecting an updater function.");if(e&&!g(e))throw new F("Graph.updateEachNodeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}");for(var n,r,i=this._nodes.values();!0!==(n=i.next()).done;)(r=n.value).attributes=t(r.key,r.attributes);this.emit("eachNodeAttributesUpdated",{hints:e||null})},i.updateEachEdgeAttributes=function(t,e){if("function"!=typeof t)throw new F("Graph.updateEachEdgeAttributes: expecting an updater function.");if(e&&!g(e))throw new F("Graph.updateEachEdgeAttributes: invalid hints. Expecting an object having the following shape: {attributes?: [string]}");for(var n,r,i,o,a=this._edges.values();!0!==(n=a.next()).done;)i=(r=n.value).source,o=r.target,r.attributes=t(r.key,r.attributes,i.key,o.key,i.attributes,o.attributes,r.undirected);this.emit("eachEdgeAttributesUpdated",{hints:e||null})},i.forEachAdjacencyEntry=function(t){if("function"!=typeof t)throw new F("Graph.forEachAdjacencyEntry: expecting a callback.");Et(!1,!1,!1,this,t)},i.forEachAdjacencyEntryWithOrphans=function(t){if("function"!=typeof t)throw new F("Graph.forEachAdjacencyEntryWithOrphans: expecting a callback.");Et(!1,!1,!0,this,t)},i.forEachAssymetricAdjacencyEntry=function(t){if("function"!=typeof t)throw new F("Graph.forEachAssymetricAdjacencyEntry: expecting a callback.");Et(!1,!0,!1,this,t)},i.forEachAssymetricAdjacencyEntryWithOrphans=function(t){if("function"!=typeof t)throw new F("Graph.forEachAssymetricAdjacencyEntryWithOrphans: expecting a callback.");Et(!1,!0,!0,this,t)},i.nodes=function(){return"function"==typeof Array.from?Array.from(this._nodes.keys()):T(this._nodes.keys(),this._nodes.size)},i.forEachNode=function(t){if("function"!=typeof t)throw new F("Graph.forEachNode: expecting a callback.");for(var e,n,r=this._nodes.values();!0!==(e=r.next()).done;)t((n=e.value).key,n.attributes)},i.findNode=function(t){if("function"!=typeof t)throw new F("Graph.findNode: expecting a callback.");for(var e,n,r=this._nodes.values();!0!==(e=r.next()).done;)if(t((n=e.value).key,n.attributes))return n.key},i.mapNodes=function(t){if("function"!=typeof t)throw new F("Graph.mapNode: expecting a callback.");for(var e,n,r=this._nodes.values(),i=new Array(this.order),o=0;!0!==(e=r.next()).done;)n=e.value,i[o++]=t(n.key,n.attributes);return i},i.someNode=function(t){if("function"!=typeof t)throw new F("Graph.someNode: expecting a callback.");for(var e,n,r=this._nodes.values();!0!==(e=r.next()).done;)if(t((n=e.value).key,n.attributes))return!0;return!1},i.everyNode=function(t){if("function"!=typeof t)throw new F("Graph.everyNode: expecting a callback.");for(var e,n,r=this._nodes.values();!0!==(e=r.next()).done;)if(!t((n=e.value).key,n.attributes))return!1;return!0},i.filterNodes=function(t){if("function"!=typeof t)throw new F("Graph.filterNodes: expecting a callback.");for(var e,n,r=this._nodes.values(),i=[];!0!==(e=r.next()).done;)t((n=e.value).key,n.attributes)&&i.push(n.key);return i},i.reduceNodes=function(t,e){if("function"!=typeof t)throw new F("Graph.reduceNodes: expecting a callback.");if(arguments.length<2)throw new F("Graph.reduceNodes: missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array.");for(var n,r,i=e,o=this._nodes.values();!0!==(n=o.next()).done;)i=t(i,(r=n.value).key,r.attributes);return i},i.nodeEntries=function(){var t=this._nodes.values();return new O((function(){var e=t.next();if(e.done)return e;var n=e.value;return{value:{node:n.key,attributes:n.attributes},done:!1}}))},i.export=function(){var t=new Array(this._nodes.size),e=0;this._nodes.forEach((function(n,r){t[e++]=function(t,e){var n={key:t};return p(e.attributes)||(n.attributes=c({},e.attributes)),n}(r,n)}));var n=new Array(this._edges.size);return e=0,this._edges.forEach((function(t,r){n[e++]=function(t,e){var n={key:t,source:e.source.key,target:e.target.key};return p(e.attributes)||(n.attributes=c({},e.attributes)),e.undirected&&(n.undirected=!0),n}(r,t)})),{options:{type:this.type,multi:this.multi,allowSelfLoops:this.allowSelfLoops},attributes:this.getAttributes(),nodes:t,edges:n}},i.import=function(t){var e,n,r,i,o,a=this,u=arguments.length>1&&void 0!==arguments[1]&&arguments[1];if(d(t))return t.forEachNode((function(t,e){u?a.mergeNode(t,e):a.addNode(t,e)})),t.forEachEdge((function(t,e,n,r,i,o,c){u?c?a.mergeUndirectedEdgeWithKey(t,n,r,e):a.mergeDirectedEdgeWithKey(t,n,r,e):c?a.addUndirectedEdgeWithKey(t,n,r,e):a.addDirectedEdgeWithKey(t,n,r,e)})),this;if(!h(t))throw new F("Graph.import: invalid argument. Expecting a serialized graph or, alternatively, a Graph instance.");if(t.attributes){if(!h(t.attributes))throw new F("Graph.import: invalid attributes. Expecting a plain object.");u?this.mergeAttributes(t.attributes):this.replaceAttributes(t.attributes)}if(t.nodes){if(r=t.nodes,!Array.isArray(r))throw new F("Graph.import: invalid nodes. Expecting an array.");for(e=0,n=r.length;e<n;e++){At(i=r[e]);var c=i,s=c.key,p=c.attributes;u?this.mergeNode(s,p):this.addNode(s,p)}}if(t.edges){if(r=t.edges,!Array.isArray(r))throw new F("Graph.import: invalid edges. Expecting an array.");for(e=0,n=r.length;e<n;e++){St(o=r[e]);var f=o,l=f.source,g=f.target,y=f.attributes,w=f.undirected,v=void 0!==w&&w;"key"in o?(u?v?this.mergeUndirectedEdgeWithKey:this.mergeDirectedEdgeWithKey:v?this.addUndirectedEdgeWithKey:this.addDirectedEdgeWithKey).call(this,o.key,l,g,y):(u?v?this.mergeUndirectedEdge:this.mergeDirectedEdge:v?this.addUndirectedEdge:this.addDirectedEdge).call(this,l,g,y)}}return this},i.nullCopy=function(t){var e=new r(c({},this._options,t));return e.replaceAttributes(c({},this.getAttributes())),e},i.emptyCopy=function(t){var e=this.nullCopy(t);return this._nodes.forEach((function(t,n){var r=c({},t.attributes);t=new e.NodeDataClass(n,r),e._nodes.set(n,t)})),e},i.copy=function(t){if("string"==typeof(t=t||{}).type&&t.type!==this.type&&"mixed"!==t.type)throw new Y('Graph.copy: cannot create an incompatible copy from "'.concat(this.type,'" type to "').concat(t.type,'" because this would mean losing information about the current graph.'));if("boolean"==typeof t.multi&&t.multi!==this.multi&&!0!==t.multi)throw new Y("Graph.copy: cannot create an incompatible copy by downgrading a multi graph to a simple one because this would mean losing information about the current graph.");if("boolean"==typeof t.allowSelfLoops&&t.allowSelfLoops!==this.allowSelfLoops&&!0!==t.allowSelfLoops)throw new Y("Graph.copy: cannot create an incompatible copy from a graph allowing self loops to one that does not because this would mean losing information about the current graph.");for(var e,n,r=this.emptyCopy(t),i=this._edges.values();!0!==(e=i.next()).done;)Ct(r,"copy",!1,(n=e.value).undirected,n.key,n.source.key,n.target.key,c({},n.attributes));return r},i.toJSON=function(){return this.export()},i.toString=function(){return"[object Graph]"},i.inspect=function(){var e=this,n={};this._nodes.forEach((function(t,e){n[e]=t.attributes}));var r={},i={};this._edges.forEach((function(t,n){var o,a=t.undirected?"--":"->",u="",c=t.source.key,s=t.target.key;t.undirected&&c>s&&(o=c,c=s,s=o);var d="(".concat(c,")").concat(a,"(").concat(s,")");n.startsWith("geid_")?e.multi&&(void 0===i[d]?i[d]=0:i[d]++,u+="".concat(i[d],". ")):u+="[".concat(n,"]: "),r[u+=d]=t.attributes}));var o={};for(var a in this)this.hasOwnProperty(a)&&!Nt.has(a)&&"function"!=typeof this[a]&&"symbol"!==t(a)&&(o[a]=this[a]);return o.attributes=this._attributes,o.nodes=n,o.edges=r,f(o,"constructor",this.constructor),o},r}(w.exports.EventEmitter);"undefined"!=typeof Symbol&&(Wt.prototype[Symbol.for("nodejs.util.inspect.custom")]=Wt.prototype.inspect),[{name:function(t){return"".concat(t,"Edge")},generateKey:!0},{name:function(t){return"".concat(t,"DirectedEdge")},generateKey:!0,type:"directed"},{name:function(t){return"".concat(t,"UndirectedEdge")},generateKey:!0,type:"undirected"},{name:function(t){return"".concat(t,"EdgeWithKey")}},{name:function(t){return"".concat(t,"DirectedEdgeWithKey")},type:"directed"},{name:function(t){return"".concat(t,"UndirectedEdgeWithKey")},type:"undirected"}].forEach((function(t){["add","merge","update"].forEach((function(e){var n=t.name(e),r="add"===e?Ct:zt;t.generateKey?Wt.prototype[n]=function(i,o,a){return r(this,n,!0,"undirected"===(t.type||this.type),null,i,o,a,"update"===e)}:Wt.prototype[n]=function(i,o,a,u){return r(this,n,!1,"undirected"===(t.type||this.type),i,o,a,u,"update"===e)}}))})),function(t){X.forEach((function(e){var n=e.name,r=e.attacher;r(t,n("Node"),0),r(t,n("Source"),1),r(t,n("Target"),2),r(t,n("Opposite"),3)}))}(Wt),function(t){Z.forEach((function(e){var n=e.name,r=e.attacher;r(t,n("Edge"),"mixed"),r(t,n("DirectedEdge"),"directed"),r(t,n("UndirectedEdge"),"undirected")}))}(Wt),function(t){nt.forEach((function(e){!function(t,e){var n=e.name,r=e.type,i=e.direction;t.prototype[n]=function(t,e){if("mixed"!==r&&"mixed"!==this.type&&r!==this.type)return[];if(!arguments.length)return st(this,r);if(1===arguments.length){t=""+t;var o=this._nodes.get(t);if(void 0===o)throw new I("Graph.".concat(n,': could not find the "').concat(t,'" node in the graph.'));return ft(this.multi,"mixed"===r?this.type:r,i,o)}if(2===arguments.length){t=""+t,e=""+e;var a=this._nodes.get(t);if(!a)throw new I("Graph.".concat(n,':  could not find the "').concat(t,'" source node in the graph.'));if(!this._nodes.has(e))throw new I("Graph.".concat(n,':  could not find the "').concat(e,'" target node in the graph.'));return yt(r,this.multi,i,a,e)}throw new F("Graph.".concat(n,": too many arguments (expecting 0, 1 or 2 and got ").concat(arguments.length,")."))}}(t,e),function(t,e){var n=e.name,r=e.type,i=e.direction,o="forEach"+n[0].toUpperCase()+n.slice(1,-1);t.prototype[o]=function(t,e,n){if("mixed"===r||"mixed"===this.type||r===this.type){if(1===arguments.length)return dt(!1,this,r,n=t);if(2===arguments.length){t=""+t,n=e;var a=this._nodes.get(t);if(void 0===a)throw new I("Graph.".concat(o,': could not find the "').concat(t,'" node in the graph.'));return pt(!1,this.multi,"mixed"===r?this.type:r,i,a,n)}if(3===arguments.length){t=""+t,e=""+e;var u=this._nodes.get(t);if(!u)throw new I("Graph.".concat(o,':  could not find the "').concat(t,'" source node in the graph.'));if(!this._nodes.has(e))throw new I("Graph.".concat(o,':  could not find the "').concat(e,'" target node in the graph.'));return gt(!1,r,this.multi,i,u,e,n)}throw new F("Graph.".concat(o,": too many arguments (expecting 1, 2 or 3 and got ").concat(arguments.length,")."))}};var a="map"+n[0].toUpperCase()+n.slice(1);t.prototype[a]=function(){var t,e=Array.prototype.slice.call(arguments),n=e.pop();if(0===e.length){var i=0;"directed"!==r&&(i+=this.undirectedSize),"undirected"!==r&&(i+=this.directedSize),t=new Array(i);var a=0;e.push((function(e,r,i,o,u,c,s){t[a++]=n(e,r,i,o,u,c,s)}))}else t=[],e.push((function(e,r,i,o,a,u,c){t.push(n(e,r,i,o,a,u,c))}));return this[o].apply(this,e),t};var u="filter"+n[0].toUpperCase()+n.slice(1);t.prototype[u]=function(){var t=Array.prototype.slice.call(arguments),e=t.pop(),n=[];return t.push((function(t,r,i,o,a,u,c){e(t,r,i,o,a,u,c)&&n.push(t)})),this[o].apply(this,t),n};var c="reduce"+n[0].toUpperCase()+n.slice(1);t.prototype[c]=function(){var t,e,n=Array.prototype.slice.call(arguments);if(n.length<2||n.length>4)throw new F("Graph.".concat(c,": invalid number of arguments (expecting 2, 3 or 4 and got ").concat(n.length,")."));if("function"==typeof n[n.length-1]&&"function"!=typeof n[n.length-2])throw new F("Graph.".concat(c,": missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array."));2===n.length?(t=n[0],e=n[1],n=[]):3===n.length?(t=n[1],e=n[2],n=[n[0]]):4===n.length&&(t=n[2],e=n[3],n=[n[0],n[1]]);var r=e;return n.push((function(e,n,i,o,a,u,c){r=t(r,e,n,i,o,a,u,c)})),this[o].apply(this,n),r}}(t,e),function(t,e){var n=e.name,r=e.type,i=e.direction,o="find"+n[0].toUpperCase()+n.slice(1,-1);t.prototype[o]=function(t,e,n){if("mixed"!==r&&"mixed"!==this.type&&r!==this.type)return!1;if(1===arguments.length)return dt(!0,this,r,n=t);if(2===arguments.length){t=""+t,n=e;var a=this._nodes.get(t);if(void 0===a)throw new I("Graph.".concat(o,': could not find the "').concat(t,'" node in the graph.'));return pt(!0,this.multi,"mixed"===r?this.type:r,i,a,n)}if(3===arguments.length){t=""+t,e=""+e;var u=this._nodes.get(t);if(!u)throw new I("Graph.".concat(o,':  could not find the "').concat(t,'" source node in the graph.'));if(!this._nodes.has(e))throw new I("Graph.".concat(o,':  could not find the "').concat(e,'" target node in the graph.'));return gt(!0,r,this.multi,i,u,e,n)}throw new F("Graph.".concat(o,": too many arguments (expecting 1, 2 or 3 and got ").concat(arguments.length,")."))};var a="some"+n[0].toUpperCase()+n.slice(1,-1);t.prototype[a]=function(){var t=Array.prototype.slice.call(arguments),e=t.pop();return t.push((function(t,n,r,i,o,a,u){return e(t,n,r,i,o,a,u)})),!!this[o].apply(this,t)};var u="every"+n[0].toUpperCase()+n.slice(1,-1);t.prototype[u]=function(){var t=Array.prototype.slice.call(arguments),e=t.pop();return t.push((function(t,n,r,i,o,a,u){return!e(t,n,r,i,o,a,u)})),!this[o].apply(this,t)}}(t,e),function(t,e){var n=e.name,r=e.type,i=e.direction,o=n.slice(0,-1)+"Entries";t.prototype[o]=function(t,e){if("mixed"!==r&&"mixed"!==this.type&&r!==this.type)return O.empty();if(!arguments.length)return ht(this,r);if(1===arguments.length){t=""+t;var n=this._nodes.get(t);if(!n)throw new I("Graph.".concat(o,': could not find the "').concat(t,'" node in the graph.'));return lt(r,i,n)}if(2===arguments.length){t=""+t,e=""+e;var a=this._nodes.get(t);if(!a)throw new I("Graph.".concat(o,':  could not find the "').concat(t,'" source node in the graph.'));if(!this._nodes.has(e))throw new I("Graph.".concat(o,':  could not find the "').concat(e,'" target node in the graph.'));return wt(r,i,a,e)}throw new F("Graph.".concat(o,": too many arguments (expecting 0, 1 or 2 and got ").concat(arguments.length,")."))}}(t,e)}))}(Wt),function(t){vt.forEach((function(e){Gt(t,e),function(t,e){var n=e.name,r=e.type,i=e.direction,o="forEach"+n[0].toUpperCase()+n.slice(1,-1);t.prototype[o]=function(t,e){if("mixed"===r||"mixed"===this.type||r===this.type){t=""+t;var n=this._nodes.get(t);if(void 0===n)throw new I("Graph.".concat(o,': could not find the "').concat(t,'" node in the graph.'));kt(!1,"mixed"===r?this.type:r,i,n,e)}};var a="map"+n[0].toUpperCase()+n.slice(1);t.prototype[a]=function(t,e){var n=[];return this[o](t,(function(t,r){n.push(e(t,r))})),n};var u="filter"+n[0].toUpperCase()+n.slice(1);t.prototype[u]=function(t,e){var n=[];return this[o](t,(function(t,r){e(t,r)&&n.push(t)})),n};var c="reduce"+n[0].toUpperCase()+n.slice(1);t.prototype[c]=function(t,e,n){if(arguments.length<3)throw new F("Graph.".concat(c,": missing initial value. You must provide it because the callback takes more than one argument and we cannot infer the initial value from the first iteration, as you could with a simple array."));var r=n;return this[o](t,(function(t,n){r=e(r,t,n)})),r}}(t,e),function(t,e){var n=e.name,r=e.type,i=e.direction,o=n[0].toUpperCase()+n.slice(1,-1),a="find"+o;t.prototype[a]=function(t,e){if("mixed"===r||"mixed"===this.type||r===this.type){t=""+t;var n=this._nodes.get(t);if(void 0===n)throw new I("Graph.".concat(a,': could not find the "').concat(t,'" node in the graph.'));return kt(!0,"mixed"===r?this.type:r,i,n,e)}};var u="some"+o;t.prototype[u]=function(t,e){return!!this[a](t,e)};var c="every"+o;t.prototype[c]=function(t,e){return!this[a](t,(function(t,n){return!e(t,n)}))}}(t,e),xt(t,e)}))}(Wt);var Pt=function(t){function n(e){var n=c({type:"directed"},e);if("multi"in n&&!1!==n.multi)throw new F("DirectedGraph.from: inconsistent indication that the graph should be multi in given options!");if("directed"!==n.type)throw new F('DirectedGraph.from: inconsistent "'+n.type+'" type in given options!');return t.call(this,n)||this}return e(n,t),n}(Wt),Rt=function(t){function n(e){var n=c({type:"undirected"},e);if("multi"in n&&!1!==n.multi)throw new F("UndirectedGraph.from: inconsistent indication that the graph should be multi in given options!");if("undirected"!==n.type)throw new F('UndirectedGraph.from: inconsistent "'+n.type+'" type in given options!');return t.call(this,n)||this}return e(n,t),n}(Wt),Kt=function(t){function n(e){var n=c({multi:!0},e);if("multi"in n&&!0!==n.multi)throw new F("MultiGraph.from: inconsistent indication that the graph should be simple in given options!");return t.call(this,n)||this}return e(n,t),n}(Wt),Tt=function(t){function n(e){var n=c({type:"directed",multi:!0},e);if("multi"in n&&!0!==n.multi)throw new F("MultiDirectedGraph.from: inconsistent indication that the graph should be simple in given options!");if("directed"!==n.type)throw new F('MultiDirectedGraph.from: inconsistent "'+n.type+'" type in given options!');return t.call(this,n)||this}return e(n,t),n}(Wt),Bt=function(t){function n(e){var n=c({type:"undirected",multi:!0},e);if("multi"in n&&!0!==n.multi)throw new F("MultiUndirectedGraph.from: inconsistent indication that the graph should be simple in given options!");if("undirected"!==n.type)throw new F('MultiUndirectedGraph.from: inconsistent "'+n.type+'" type in given options!');return t.call(this,n)||this}return e(n,t),n}(Wt);function Ft(t){t.from=function(e,n){var r=c({},e.options,n),i=new t(r);return i.import(e),i}}return Ft(Wt),Ft(Pt),Ft(Rt),Ft(Kt),Ft(Tt),Ft(Bt),Wt.Graph=Wt,Wt.DirectedGraph=Pt,Wt.UndirectedGraph=Rt,Wt.MultiGraph=Kt,Wt.MultiDirectedGraph=Tt,Wt.MultiUndirectedGraph=Bt,Wt.InvalidArgumentsGraphError=F,Wt.NotFoundGraphError=I,Wt.UsageGraphError=Y,Wt}));
//# sourceMappingURL=graphology.umd.min.js.map


/***/ }),

/***/ "./node_modules/mnemonist/heap.js":
/*!****************************************!*\
  !*** ./node_modules/mnemonist/heap.js ***!
  \****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Mnemonist Binary Heap
 * ======================
 *
 * Binary heap implementation.
 */
var forEach = __webpack_require__(/*! obliterator/foreach */ "./node_modules/obliterator/foreach.js"),
    comparators = __webpack_require__(/*! ./utils/comparators.js */ "./node_modules/mnemonist/utils/comparators.js"),
    iterables = __webpack_require__(/*! ./utils/iterables.js */ "./node_modules/mnemonist/utils/iterables.js");

var DEFAULT_COMPARATOR = comparators.DEFAULT_COMPARATOR,
    reverseComparator = comparators.reverseComparator;

/**
 * Heap helper functions.
 */

/**
 * Function used to sift down.
 *
 * @param {function} compare    - Comparison function.
 * @param {array}    heap       - Array storing the heap's data.
 * @param {number}   startIndex - Starting index.
 * @param {number}   i          - Index.
 */
function siftDown(compare, heap, startIndex, i) {
  var item = heap[i],
      parentIndex,
      parent;

  while (i > startIndex) {
    parentIndex = (i - 1) >> 1;
    parent = heap[parentIndex];

    if (compare(item, parent) < 0) {
      heap[i] = parent;
      i = parentIndex;
      continue;
    }

    break;
  }

  heap[i] = item;
}

/**
 * Function used to sift up.
 *
 * @param {function} compare - Comparison function.
 * @param {array}    heap    - Array storing the heap's data.
 * @param {number}   i       - Index.
 */
function siftUp(compare, heap, i) {
  var endIndex = heap.length,
      startIndex = i,
      item = heap[i],
      childIndex = 2 * i + 1,
      rightIndex;

  while (childIndex < endIndex) {
    rightIndex = childIndex + 1;

    if (
      rightIndex < endIndex &&
      compare(heap[childIndex], heap[rightIndex]) >= 0
    ) {
      childIndex = rightIndex;
    }

    heap[i] = heap[childIndex];
    i = childIndex;
    childIndex = 2 * i + 1;
  }

  heap[i] = item;
  siftDown(compare, heap, startIndex, i);
}

/**
 * Function used to push an item into a heap represented by a raw array.
 *
 * @param {function} compare - Comparison function.
 * @param {array}    heap    - Array storing the heap's data.
 * @param {any}      item    - Item to push.
 */
function push(compare, heap, item) {
  heap.push(item);
  siftDown(compare, heap, 0, heap.length - 1);
}

/**
 * Function used to pop an item from a heap represented by a raw array.
 *
 * @param  {function} compare - Comparison function.
 * @param  {array}    heap    - Array storing the heap's data.
 * @return {any}
 */
function pop(compare, heap) {
  var lastItem = heap.pop();

  if (heap.length !== 0) {
    var item = heap[0];
    heap[0] = lastItem;
    siftUp(compare, heap, 0);

    return item;
  }

  return lastItem;
}

/**
 * Function used to pop the heap then push a new value into it, thus "replacing"
 * it.
 *
 * @param  {function} compare - Comparison function.
 * @param  {array}    heap    - Array storing the heap's data.
 * @param  {any}      item    - The item to push.
 * @return {any}
 */
function replace(compare, heap, item) {
  if (heap.length === 0)
    throw new Error('mnemonist/heap.replace: cannot pop an empty heap.');

  var popped = heap[0];
  heap[0] = item;
  siftUp(compare, heap, 0);

  return popped;
}

/**
 * Function used to push an item in the heap then pop the heap and return the
 * popped value.
 *
 * @param  {function} compare - Comparison function.
 * @param  {array}    heap    - Array storing the heap's data.
 * @param  {any}      item    - The item to push.
 * @return {any}
 */
function pushpop(compare, heap, item) {
  var tmp;

  if (heap.length !== 0 && compare(heap[0], item) < 0) {
    tmp = heap[0];
    heap[0] = item;
    item = tmp;
    siftUp(compare, heap, 0);
  }

  return item;
}

/**
 * Converts and array into an abstract heap in linear time.
 *
 * @param {function} compare - Comparison function.
 * @param {array}    array   - Target array.
 */
function heapify(compare, array) {
  var n = array.length,
      l = n >> 1,
      i = l;

  while (--i >= 0)
    siftUp(compare, array, i);
}

/**
 * Fully consumes the given heap.
 *
 * @param  {function} compare - Comparison function.
 * @param  {array}    heap    - Array storing the heap's data.
 * @return {array}
 */
function consume(compare, heap) {
  var l = heap.length,
      i = 0;

  var array = new Array(l);

  while (i < l)
    array[i++] = pop(compare, heap);

  return array;
}

/**
 * Function used to retrieve the n smallest items from the given iterable.
 *
 * @param {function} compare  - Comparison function.
 * @param {number}   n        - Number of top items to retrieve.
 * @param {any}      iterable - Arbitrary iterable.
 * @param {array}
 */
function nsmallest(compare, n, iterable) {
  if (arguments.length === 2) {
    iterable = n;
    n = compare;
    compare = DEFAULT_COMPARATOR;
  }

  var reverseCompare = reverseComparator(compare);

  var i, l, v;

  var min = Infinity;

  var result;

  // If n is equal to 1, it's just a matter of finding the minimum
  if (n === 1) {
    if (iterables.isArrayLike(iterable)) {
      for (i = 0, l = iterable.length; i < l; i++) {
        v = iterable[i];

        if (min === Infinity || compare(v, min) < 0)
          min = v;
      }

      result = new iterable.constructor(1);
      result[0] = min;

      return result;
    }

    forEach(iterable, function(value) {
      if (min === Infinity || compare(value, min) < 0)
        min = value;
    });

    return [min];
  }

  if (iterables.isArrayLike(iterable)) {

    // If n > iterable length, we just clone and sort
    if (n >= iterable.length)
      return iterable.slice().sort(compare);

    result = iterable.slice(0, n);
    heapify(reverseCompare, result);

    for (i = n, l = iterable.length; i < l; i++)
      if (reverseCompare(iterable[i], result[0]) > 0)
        replace(reverseCompare, result, iterable[i]);

    // NOTE: if n is over some number, it becomes faster to consume the heap
    return result.sort(compare);
  }

  // Correct for size
  var size = iterables.guessLength(iterable);

  if (size !== null && size < n)
    n = size;

  result = new Array(n);
  i = 0;

  forEach(iterable, function(value) {
    if (i < n) {
      result[i] = value;
    }
    else {
      if (i === n)
        heapify(reverseCompare, result);

      if (reverseCompare(value, result[0]) > 0)
        replace(reverseCompare, result, value);
    }

    i++;
  });

  if (result.length > i)
    result.length = i;

  // NOTE: if n is over some number, it becomes faster to consume the heap
  return result.sort(compare);
}

/**
 * Function used to retrieve the n largest items from the given iterable.
 *
 * @param {function} compare  - Comparison function.
 * @param {number}   n        - Number of top items to retrieve.
 * @param {any}      iterable - Arbitrary iterable.
 * @param {array}
 */
function nlargest(compare, n, iterable) {
  if (arguments.length === 2) {
    iterable = n;
    n = compare;
    compare = DEFAULT_COMPARATOR;
  }

  var reverseCompare = reverseComparator(compare);

  var i, l, v;

  var max = -Infinity;

  var result;

  // If n is equal to 1, it's just a matter of finding the maximum
  if (n === 1) {
    if (iterables.isArrayLike(iterable)) {
      for (i = 0, l = iterable.length; i < l; i++) {
        v = iterable[i];

        if (max === -Infinity || compare(v, max) > 0)
          max = v;
      }

      result = new iterable.constructor(1);
      result[0] = max;

      return result;
    }

    forEach(iterable, function(value) {
      if (max === -Infinity || compare(value, max) > 0)
        max = value;
    });

    return [max];
  }

  if (iterables.isArrayLike(iterable)) {

    // If n > iterable length, we just clone and sort
    if (n >= iterable.length)
      return iterable.slice().sort(reverseCompare);

    result = iterable.slice(0, n);
    heapify(compare, result);

    for (i = n, l = iterable.length; i < l; i++)
      if (compare(iterable[i], result[0]) > 0)
        replace(compare, result, iterable[i]);

    // NOTE: if n is over some number, it becomes faster to consume the heap
    return result.sort(reverseCompare);
  }

  // Correct for size
  var size = iterables.guessLength(iterable);

  if (size !== null && size < n)
    n = size;

  result = new Array(n);
  i = 0;

  forEach(iterable, function(value) {
    if (i < n) {
      result[i] = value;
    }
    else {
      if (i === n)
        heapify(compare, result);

      if (compare(value, result[0]) > 0)
        replace(compare, result, value);
    }

    i++;
  });

  if (result.length > i)
    result.length = i;

  // NOTE: if n is over some number, it becomes faster to consume the heap
  return result.sort(reverseCompare);
}

/**
 * Binary Minimum Heap.
 *
 * @constructor
 * @param {function} comparator - Comparator function to use.
 */
function Heap(comparator) {
  this.clear();
  this.comparator = comparator || DEFAULT_COMPARATOR;

  if (typeof this.comparator !== 'function')
    throw new Error('mnemonist/Heap.constructor: given comparator should be a function.');
}

/**
 * Method used to clear the heap.
 *
 * @return {undefined}
 */
Heap.prototype.clear = function() {

  // Properties
  this.items = [];
  this.size = 0;
};

/**
 * Method used to push an item into the heap.
 *
 * @param  {any}    item - Item to push.
 * @return {number}
 */
Heap.prototype.push = function(item) {
  push(this.comparator, this.items, item);
  return ++this.size;
};

/**
 * Method used to retrieve the "first" item of the heap.
 *
 * @return {any}
 */
Heap.prototype.peek = function() {
  return this.items[0];
};

/**
 * Method used to retrieve & remove the "first" item of the heap.
 *
 * @return {any}
 */
Heap.prototype.pop = function() {
  if (this.size !== 0)
    this.size--;

  return pop(this.comparator, this.items);
};

/**
 * Method used to pop the heap, then push an item and return the popped
 * item.
 *
 * @param  {any} item - Item to push into the heap.
 * @return {any}
 */
Heap.prototype.replace = function(item) {
  return replace(this.comparator, this.items, item);
};

/**
 * Method used to push the heap, the pop it and return the pooped item.
 *
 * @param  {any} item - Item to push into the heap.
 * @return {any}
 */
Heap.prototype.pushpop = function(item) {
  return pushpop(this.comparator, this.items, item);
};

/**
 * Method used to consume the heap fully and return its items as a sorted array.
 *
 * @return {array}
 */
Heap.prototype.consume = function() {
  this.size = 0;
  return consume(this.comparator, this.items);
};

/**
 * Method used to convert the heap to an array. Note that it basically clone
 * the heap and consumes it completely. This is hardly performant.
 *
 * @return {array}
 */
Heap.prototype.toArray = function() {
  return consume(this.comparator, this.items.slice());
};

/**
 * Convenience known methods.
 */
Heap.prototype.inspect = function() {
  var proxy = this.toArray();

  // Trick so that node displays the name of the constructor
  Object.defineProperty(proxy, 'constructor', {
    value: Heap,
    enumerable: false
  });

  return proxy;
};

if (typeof Symbol !== 'undefined')
  Heap.prototype[Symbol.for('nodejs.util.inspect.custom')] = Heap.prototype.inspect;

/**
 * Binary Maximum Heap.
 *
 * @constructor
 * @param {function} comparator - Comparator function to use.
 */
function MaxHeap(comparator) {
  this.clear();
  this.comparator = comparator || DEFAULT_COMPARATOR;

  if (typeof this.comparator !== 'function')
    throw new Error('mnemonist/MaxHeap.constructor: given comparator should be a function.');

  this.comparator = reverseComparator(this.comparator);
}

MaxHeap.prototype = Heap.prototype;

/**
 * Static @.from function taking an arbitrary iterable & converting it into
 * a heap.
 *
 * @param  {Iterable} iterable   - Target iterable.
 * @param  {function} comparator - Custom comparator function.
 * @return {Heap}
 */
Heap.from = function(iterable, comparator) {
  var heap = new Heap(comparator);

  var items;

  // If iterable is an array, we can be clever about it
  if (iterables.isArrayLike(iterable))
    items = iterable.slice();
  else
    items = iterables.toArray(iterable);

  heapify(heap.comparator, items);
  heap.items = items;
  heap.size = items.length;

  return heap;
};

MaxHeap.from = function(iterable, comparator) {
  var heap = new MaxHeap(comparator);

  var items;

  // If iterable is an array, we can be clever about it
  if (iterables.isArrayLike(iterable))
    items = iterable.slice();
  else
    items = iterables.toArray(iterable);

  heapify(heap.comparator, items);
  heap.items = items;
  heap.size = items.length;

  return heap;
};

/**
 * Exporting.
 */
Heap.siftUp = siftUp;
Heap.siftDown = siftDown;
Heap.push = push;
Heap.pop = pop;
Heap.replace = replace;
Heap.pushpop = pushpop;
Heap.heapify = heapify;
Heap.consume = consume;

Heap.nsmallest = nsmallest;
Heap.nlargest = nlargest;

Heap.MinHeap = Heap;
Heap.MaxHeap = MaxHeap;

module.exports = Heap;


/***/ }),

/***/ "./node_modules/mnemonist/utils/comparators.js":
/*!*****************************************************!*\
  !*** ./node_modules/mnemonist/utils/comparators.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports) => {

/**
 * Mnemonist Heap Comparators
 * ===========================
 *
 * Default comparators & functions dealing with comparators reversing etc.
 */
var DEFAULT_COMPARATOR = function(a, b) {
  if (a < b)
    return -1;
  if (a > b)
    return 1;

  return 0;
};

var DEFAULT_REVERSE_COMPARATOR = function(a, b) {
  if (a < b)
    return 1;
  if (a > b)
    return -1;

  return 0;
};

/**
 * Function used to reverse a comparator.
 */
function reverseComparator(comparator) {
  return function(a, b) {
    return comparator(b, a);
  };
}

/**
 * Function returning a tuple comparator.
 */
function createTupleComparator(size) {
  if (size === 2) {
    return function(a, b) {
      if (a[0] < b[0])
        return -1;

      if (a[0] > b[0])
        return 1;

      if (a[1] < b[1])
        return -1;

      if (a[1] > b[1])
        return 1;

      return 0;
    };
  }

  return function(a, b) {
    var i = 0;

    while (i < size) {
      if (a[i] < b[i])
        return -1;

      if (a[i] > b[i])
        return 1;

      i++;
    }

    return 0;
  };
}

/**
 * Exporting.
 */
exports.DEFAULT_COMPARATOR = DEFAULT_COMPARATOR;
exports.DEFAULT_REVERSE_COMPARATOR = DEFAULT_REVERSE_COMPARATOR;
exports.reverseComparator = reverseComparator;
exports.createTupleComparator = createTupleComparator;


/***/ }),

/***/ "./node_modules/mnemonist/utils/iterables.js":
/*!***************************************************!*\
  !*** ./node_modules/mnemonist/utils/iterables.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/**
 * Mnemonist Iterable Function
 * ============================
 *
 * Harmonized iteration helpers over mixed iterable targets.
 */
var forEach = __webpack_require__(/*! obliterator/foreach */ "./node_modules/obliterator/foreach.js");

var typed = __webpack_require__(/*! ./typed-arrays.js */ "./node_modules/mnemonist/utils/typed-arrays.js");

/**
 * Function used to determine whether the given object supports array-like
 * random access.
 *
 * @param  {any} target - Target object.
 * @return {boolean}
 */
function isArrayLike(target) {
  return Array.isArray(target) || typed.isTypedArray(target);
}

/**
 * Function used to guess the length of the structure over which we are going
 * to iterate.
 *
 * @param  {any} target - Target object.
 * @return {number|undefined}
 */
function guessLength(target) {
  if (typeof target.length === 'number')
    return target.length;

  if (typeof target.size === 'number')
    return target.size;

  return;
}

/**
 * Function used to convert an iterable to an array.
 *
 * @param  {any}   target - Iteration target.
 * @return {array}
 */
function toArray(target) {
  var l = guessLength(target);

  var array = typeof l === 'number' ? new Array(l) : [];

  var i = 0;

  // TODO: we could optimize when given target is array like
  forEach(target, function(value) {
    array[i++] = value;
  });

  return array;
}

/**
 * Same as above but returns a supplementary indices array.
 *
 * @param  {any}   target - Iteration target.
 * @return {array}
 */
function toArrayWithIndices(target) {
  var l = guessLength(target);

  var IndexArray = typeof l === 'number' ?
    typed.getPointerArray(l) :
    Array;

  var array = typeof l === 'number' ? new Array(l) : [];
  var indices = typeof l === 'number' ? new IndexArray(l) : [];

  var i = 0;

  // TODO: we could optimize when given target is array like
  forEach(target, function(value) {
    array[i] = value;
    indices[i] = i++;
  });

  return [array, indices];
}

/**
 * Exporting.
 */
exports.isArrayLike = isArrayLike;
exports.guessLength = guessLength;
exports.toArray = toArray;
exports.toArrayWithIndices = toArrayWithIndices;


/***/ }),

/***/ "./node_modules/mnemonist/utils/typed-arrays.js":
/*!******************************************************!*\
  !*** ./node_modules/mnemonist/utils/typed-arrays.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports) => {

/**
 * Mnemonist Typed Array Helpers
 * ==============================
 *
 * Miscellaneous helpers related to typed arrays.
 */

/**
 * When using an unsigned integer array to store pointers, one might want to
 * choose the optimal word size in regards to the actual numbers of pointers
 * to store.
 *
 * This helpers does just that.
 *
 * @param  {number} size - Expected size of the array to map.
 * @return {TypedArray}
 */
var MAX_8BIT_INTEGER = Math.pow(2, 8) - 1,
    MAX_16BIT_INTEGER = Math.pow(2, 16) - 1,
    MAX_32BIT_INTEGER = Math.pow(2, 32) - 1;

var MAX_SIGNED_8BIT_INTEGER = Math.pow(2, 7) - 1,
    MAX_SIGNED_16BIT_INTEGER = Math.pow(2, 15) - 1,
    MAX_SIGNED_32BIT_INTEGER = Math.pow(2, 31) - 1;

exports.getPointerArray = function(size) {
  var maxIndex = size - 1;

  if (maxIndex <= MAX_8BIT_INTEGER)
    return Uint8Array;

  if (maxIndex <= MAX_16BIT_INTEGER)
    return Uint16Array;

  if (maxIndex <= MAX_32BIT_INTEGER)
    return Uint32Array;

  throw new Error('mnemonist: Pointer Array of size > 4294967295 is not supported.');
};

exports.getSignedPointerArray = function(size) {
  var maxIndex = size - 1;

  if (maxIndex <= MAX_SIGNED_8BIT_INTEGER)
    return Int8Array;

  if (maxIndex <= MAX_SIGNED_16BIT_INTEGER)
    return Int16Array;

  if (maxIndex <= MAX_SIGNED_32BIT_INTEGER)
    return Int32Array;

  return Float64Array;
};

/**
 * Function returning the minimal type able to represent the given number.
 *
 * @param  {number} value - Value to test.
 * @return {TypedArrayClass}
 */
exports.getNumberType = function(value) {

  // <= 32 bits itnteger?
  if (value === (value | 0)) {

    // Negative
    if (Math.sign(value) === -1) {
      if (value <= 127 && value >= -128)
        return Int8Array;

      if (value <= 32767 && value >= -32768)
        return Int16Array;

      return Int32Array;
    }
    else {

      if (value <= 255)
        return Uint8Array;

      if (value <= 65535)
        return Uint16Array;

      return Uint32Array;
    }
  }

  // 53 bits integer & floats
  // NOTE: it's kinda hard to tell whether we could use 32bits or not...
  return Float64Array;
};

/**
 * Function returning the minimal type able to represent the given array
 * of JavaScript numbers.
 *
 * @param  {array}    array  - Array to represent.
 * @param  {function} getter - Optional getter.
 * @return {TypedArrayClass}
 */
var TYPE_PRIORITY = {
  Uint8Array: 1,
  Int8Array: 2,
  Uint16Array: 3,
  Int16Array: 4,
  Uint32Array: 5,
  Int32Array: 6,
  Float32Array: 7,
  Float64Array: 8
};

// TODO: make this a one-shot for one value
exports.getMinimalRepresentation = function(array, getter) {
  var maxType = null,
      maxPriority = 0,
      p,
      t,
      v,
      i,
      l;

  for (i = 0, l = array.length; i < l; i++) {
    v = getter ? getter(array[i]) : array[i];
    t = exports.getNumberType(v);
    p = TYPE_PRIORITY[t.name];

    if (p > maxPriority) {
      maxPriority = p;
      maxType = t;
    }
  }

  return maxType;
};

/**
 * Function returning whether the given value is a typed array.
 *
 * @param  {any} value - Value to test.
 * @return {boolean}
 */
exports.isTypedArray = function(value) {
  return typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value);
};

/**
 * Function used to concat byte arrays.
 *
 * @param  {...ByteArray}
 * @return {ByteArray}
 */
exports.concat = function() {
  var length = 0,
      i,
      o,
      l;

  for (i = 0, l = arguments.length; i < l; i++)
    length += arguments[i].length;

  var array = new (arguments[0].constructor)(length);

  for (i = 0, o = 0; i < l; i++) {
    array.set(arguments[i], o);
    o += arguments[i].length;
  }

  return array;
};

/**
 * Function used to initialize a byte array of indices.
 *
 * @param  {number}    length - Length of target.
 * @return {ByteArray}
 */
exports.indices = function(length) {
  var PointerArray = exports.getPointerArray(length);

  var array = new PointerArray(length);

  for (var i = 0; i < length; i++)
    array[i] = i;

  return array;
};


/***/ }),

/***/ "./node_modules/obliterator/foreach.js":
/*!*********************************************!*\
  !*** ./node_modules/obliterator/foreach.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/**
 * Obliterator ForEach Function
 * =============================
 *
 * Helper function used to easily iterate over mixed values.
 */
var support = __webpack_require__(/*! ./support.js */ "./node_modules/obliterator/support.js");

var ARRAY_BUFFER_SUPPORT = support.ARRAY_BUFFER_SUPPORT;
var SYMBOL_SUPPORT = support.SYMBOL_SUPPORT;

/**
 * Function able to iterate over almost any iterable JS value.
 *
 * @param  {any}      iterable - Iterable value.
 * @param  {function} callback - Callback function.
 */
module.exports = function forEach(iterable, callback) {
  var iterator, k, i, l, s;

  if (!iterable) throw new Error('obliterator/forEach: invalid iterable.');

  if (typeof callback !== 'function')
    throw new Error('obliterator/forEach: expecting a callback.');

  // The target is an array or a string or function arguments
  if (
    Array.isArray(iterable) ||
    (ARRAY_BUFFER_SUPPORT && ArrayBuffer.isView(iterable)) ||
    typeof iterable === 'string' ||
    iterable.toString() === '[object Arguments]'
  ) {
    for (i = 0, l = iterable.length; i < l; i++) callback(iterable[i], i);
    return;
  }

  // The target has a #.forEach method
  if (typeof iterable.forEach === 'function') {
    iterable.forEach(callback);
    return;
  }

  // The target is iterable
  if (
    SYMBOL_SUPPORT &&
    Symbol.iterator in iterable &&
    typeof iterable.next !== 'function'
  ) {
    iterable = iterable[Symbol.iterator]();
  }

  // The target is an iterator
  if (typeof iterable.next === 'function') {
    iterator = iterable;
    i = 0;

    while (((s = iterator.next()), s.done !== true)) {
      callback(s.value, i);
      i++;
    }

    return;
  }

  // The target is a plain object
  for (k in iterable) {
    if (iterable.hasOwnProperty(k)) {
      callback(iterable[k], k);
    }
  }

  return;
};


/***/ }),

/***/ "./node_modules/obliterator/support.js":
/*!*********************************************!*\
  !*** ./node_modules/obliterator/support.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports) => {

exports.ARRAY_BUFFER_SUPPORT = typeof ArrayBuffer !== 'undefined';
exports.SYMBOL_SUPPORT = typeof Symbol !== 'undefined';


/***/ }),

/***/ "./src/fish.js":
/*!*********************!*\
  !*** ./src/fish.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Fish)
/* harmony export */ });
/* harmony import */ var _assets_fish_png__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./assets/fish.png */ "./src/assets/fish.png");
/* harmony import */ var _assets_fish_walk_fish0000_png__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./assets/fish_walk/fish0000.png */ "./src/assets/fish_walk/fish0000.png");
/* harmony import */ var _assets_fish_walk_fish0001_png__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./assets/fish_walk/fish0001.png */ "./src/assets/fish_walk/fish0001.png");
/* harmony import */ var _assets_fish_walk_fish0002_png__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./assets/fish_walk/fish0002.png */ "./src/assets/fish_walk/fish0002.png");
/* harmony import */ var _assets_fish_walk_fish0003_png__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./assets/fish_walk/fish0003.png */ "./src/assets/fish_walk/fish0003.png");
/* harmony import */ var _assets_fish_walk_fish0004_png__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./assets/fish_walk/fish0004.png */ "./src/assets/fish_walk/fish0004.png");
/* harmony import */ var _assets_fish_walk_fish0005_png__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./assets/fish_walk/fish0005.png */ "./src/assets/fish_walk/fish0005.png");
/* harmony import */ var _assets_fish_walk_fish0006_png__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./assets/fish_walk/fish0006.png */ "./src/assets/fish_walk/fish0006.png");
/* harmony import */ var _assets_fish_walk_fish0007_png__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./assets/fish_walk/fish0007.png */ "./src/assets/fish_walk/fish0007.png");










let NSIZE = 10;
let defaultState = {
	init(fish) {
		fish.img = fish.img_standing;
	},
	update(fish, dt) {}
};

class Fish {
	// position of fish is given by two vertices and a weight
	constructor(nav, n1, n2, weight){
		this.img_standing = new Image();
		this.img_standing.src=_assets_fish_png__WEBPACK_IMPORTED_MODULE_0__;
		this.img_walking = [];
		for(let i = 0; i<8; i++){
			this.img_walking.push(new Image());
		}
		this.img_walking[0].src=_assets_fish_walk_fish0000_png__WEBPACK_IMPORTED_MODULE_1__;
		this.img_walking[1].src=_assets_fish_walk_fish0001_png__WEBPACK_IMPORTED_MODULE_2__;
		this.img_walking[2].src=_assets_fish_walk_fish0002_png__WEBPACK_IMPORTED_MODULE_3__;
		this.img_walking[3].src=_assets_fish_walk_fish0003_png__WEBPACK_IMPORTED_MODULE_4__;
		this.img_walking[4].src=_assets_fish_walk_fish0004_png__WEBPACK_IMPORTED_MODULE_5__;
		this.img_walking[5].src=_assets_fish_walk_fish0005_png__WEBPACK_IMPORTED_MODULE_6__;
		this.img_walking[6].src=_assets_fish_walk_fish0006_png__WEBPACK_IMPORTED_MODULE_7__;
		this.img_walking[7].src=_assets_fish_walk_fish0007_png__WEBPACK_IMPORTED_MODULE_8__;
		this.img = this.img_standing;
		
		this.nav = nav;

		this.active = false;

		this.n1 = n1;
		this.n2 = n2;
		this.weight = weight;

		this.target = null;
		this.state = defaultState;
		this.facingRight = true;
	}

	setState(state){
		state.init(this);
		this.state = state;
	}

	getPos() {
		let v1 = this.nav.graph.getNodeAttributes(this.n1);
		let v2 = this.nav.graph.getNodeAttributes(this.n2);
		return v1.pos.scaledBy(1.0-this.weight).plus(v2.pos.scaledBy(this.weight));
	}

	update(eventQueue, dt){
		let i = eventQueue.length;
		while(i--){
			let [e, name] = eventQueue[i];
			if(e.changeState){
				this.active = (name==="control");
			}

			if(this.active){
				if(name==="dblclick"){
					// 1. get closest point on graph

					let [n1, n2, d2, v, weight] = this.nav.closest(e.pos);

					// 2. if distance too large, give up
					if(d2 < 30*30){
						// 3. calculate route to closest point (route is in reverse order for popping)
						this.target = v;
						let route = this.nav.calculateRoute(n1,n2,weight, this.n1,this.n2,this.weight);

						if(route !== null){
							// 4. flip n1/n2 so that increasing weight follows route
							if(route.length != 0) {
								if(this.n1 === route[route.length-1]){
									let temp_n = this.n1;
									this.n1 = this.n2;
									this.n2 = temp_n;
									this.weight = 1-this.weight;
								}
								if(n2 === route[0]){
									let temp_n = n1;
									n1 = n2;
									n2 = temp_n;
									weight = 1-weight;
								}
							} else {
								if(this.n1 != n1){
									console.log("hi")
									this.n1 = n1;
									this.n2 = n2;
									this.weight = 1-this.weight;
								}
								if(weight < this.weight){
									let temp_n = n1;
									n1 = n2;
									n2 = temp_n;
									weight = 1-weight;

									temp_n = this.n1;
									this.n1 = this.n2;
									this.n2 = temp_n;
									this.weight = 1-this.weight;
								}
							}

							// 5. set state to follow route
							this.setState(new RouteState(route, n1, n2, weight));
						}
					}
					
					eventQueue.splice(i, 1);
				}
			}
		}

		this.state.update(this, dt);
	}

	setOrientation(){
		this.facingRight = (this.nav.graph.getNodeAttributes(this.n2).pos.minus(this.nav.graph.getNodeAttributes(this.n1).pos).x >=0);
	}

	draw(ctx) {
		let pos = this.getPos();

		if(this.target){
			ctx.fillStyle = "red";
			ctx.fillRect(this.target.x - NSIZE/2, this.target.y - NSIZE/2, NSIZE, NSIZE);
		}

		ctx.save();

		ctx.translate(pos.x, pos.y);
		ctx.scale(0.15, 0.15);
		if(!this.facingRight){
			ctx.scale(-1,1);
		}
		ctx.drawImage(this.img, -this.img.width/2, 50-2*this.img.height/2);

		ctx.restore();
	}
}

let vel = 60;
class RouteState {
	constructor(route, n1, n2, weight) {
		this.route = route;
		route.unshift(n2);
		route.pop();
		this.n1 = n1;
		this.n2 = n2;
		this.weight = weight;

		this.accumulator = 0;
	}

	init(fish) {
		fish.setOrientation();
	}

	update(fish, dt) {
		if(this.route.length>=1){
			if(fish.weight<1){
				this.step(fish,dt);
			} else {
				fish.weight = 0;
				let old_n = fish.n2;
				fish.n2 = this.route[this.route.length-1];
				fish.n1 = old_n;
				this.route.pop();
				fish.setOrientation();
			}
		} else {
			if(fish.weight < this.weight){
				this.step(fish,dt)
			} else {
				fish.setState(defaultState);
			}
		}
	}

	step(fish, dt) {
		fish.weight += vel*dt/fish.nav.graph.getEdgeAttributes(fish.n1,fish.n2).weight
		fish.weight = Math.min(fish.weight, 1.0);

		this.accumulator += 6*dt;
		if(this.accumulator>=8){
			this.accumulator = 0;
		}
		fish.img = fish.img_walking[Math.floor(this.accumulator)]
	}
}

/***/ }),

/***/ "./src/navgraph.js":
/*!*************************!*\
  !*** ./src/navgraph.js ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ NavGraph)
/* harmony export */ });
/* harmony import */ var graphology__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! graphology */ "./node_modules/graphology/dist/graphology.umd.min.js");
/* harmony import */ var graphology__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(graphology__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var graphology_shortest_path_dijkstra__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! graphology-shortest-path/dijkstra */ "./node_modules/graphology-shortest-path/dijkstra.js");



let NSIZE = 10;
class NavGraph {
	constructor() {
		this.graph = new graphology__WEBPACK_IMPORTED_MODULE_0__.UndirectedGraph();
		this.active_n = null;
		this.last_n = null;
		this.index = 10; //DEBUG
		this.state = "select";
	}

	update(eventQueue){
		let i = eventQueue.length;
		while(i--){
			let [e, name] = eventQueue[i];

			if(e.changeState){
				this.active_n = null;
				this.last_n = null;
				this.state = name;
				this.calculateWeights();
			}

			switch(this.state){
				case "select":
					if(name==="mousedown"){
						this.last_n = null;
		
						let [n, d] = this.closestNode(e.pos);
						if(d < 30*30) {
							this.active_n = n;
							console.log(this.active_n);
						}
		
						eventQueue.splice(i, 1);
					}
		
					if(name==="mouseup"){
						this.last_n = this.active_n;
						this.active_n = null;
		
						eventQueue.splice(i, 1);
					}
		
					if(name==="mousemove"){
						if(this.active_n){
							this.graph.getNodeAttributes(this.active_n).pos = e.pos;
							eventQueue.splice(i, 1);
						}
		
						eventQueue.splice(i, 1);
					}
					break;
				case "add":
					if(name==="mousedown"){
						this.addNode(e.pos);
						eventQueue.splice(i, 1);
					}
					break;
				case "add edge":
					if(name==="mousedown"){
						let [n, d] = this.closestNode(e.pos);
						if(d < 30*30) {
							this.active_n = n;
							if(this.last_n && !this.graph.hasEdge(this.last_n, this.active_n)){
								this.graph.addEdge(this.last_n, this.active_n);
							}
							this.last_n = null;
						}
		
						eventQueue.splice(i, 1);
					}
					if(name==="mouseup"){
						this.last_n = this.active_n;
						this.active_n = null;
		
						eventQueue.splice(i, 1);
					}
					break;
				case "delete":
					if(name==="mousedown"){
						let [n, d] = this.closestNode(e.pos);
						if(d < 30*30) {
							this.graph.dropNode(n);
						}

						eventQueue.splice(i, 1);
					}
					break;
			}
		}
	}

	calculateWeights() {
		for (let {edge, attributes: e, source, target, sourceAttributes: v1, targetAttributes: v2} of this.graph.edgeEntries()) {
			e.weight = Math.sqrt(v2.pos.minus(v1.pos).d2());
		}
	}

	closestNode(pos) {
		let nmin = null;
		let d2min = Number.POSITIVE_INFINITY;
		for (let {node: n, attributes: v} of this.graph.nodeEntries()) {
			let td = v.pos.minus(pos).d2();
			if(td <= d2min) {
				d2min = td;
				nmin = n;
			}
		}

		return [nmin, d2min];
	}

	closest(pos) {
		let n1_min = null;
		let n2_min = null;
		let d2_min = Number.POSITIVE_INFINITY;
		let v_min = null;
		let w_min = null;

		// try projecting point onto each line segment, see what is closest.
		for (let {edge, attributes, source: n1, target: n2, sourceAttributes: v1, targetAttributes: v2} of this.graph.edgeEntries()) {
			let delta = v2.pos.minus(v1.pos);
			let weight = delta.dot(pos.minus(v1.pos));
			weight /= delta.d2();

			// clamp weight to [0,1]
			weight = Math.min(Math.max(weight, 0.0), 1.0);

			// get point
			let v = v1.pos.scaledBy(1-weight).plus(v2.pos.scaledBy(weight));
			let d2 = v.minus(pos).d2();

			if(d2 <= d2_min) {
				d2_min = d2;
				n1_min = n1;
				n2_min = n2;
				v_min = v;
				w_min = weight;
			}
		}

		return [n1_min, n2_min, d2_min, v_min, w_min];
	}

	addNode(pos){
		this.graph.addNode(this.index, {pos: pos});
		return this.index++;
	}

	addEdge(n1, n2){
		let d = Math.sqrt(
			this.graph.getNodeAttributes(n2).pos
				.minus(this.graph.getNodeAttributes(n1).pos).d2()
			);
		this.graph.addEdge(n1, n2, {weight: d});
	}

	calculateRoute(n11,n12,w1, n21,n22,w2){
		let v11 = this.graph.getNodeAttributes(n11);
		let v12 = this.graph.getNodeAttributes(n12);
		let v21 = this.graph.getNodeAttributes(n21);
		let v22 = this.graph.getNodeAttributes(n22);

		let n1 = this.addNode(v11.pos.scaledBy(1-w1).plus(v12.pos.scaledBy(w1)));
		let n2 = this.addNode(v21.pos.scaledBy(1-w2).plus(v22.pos.scaledBy(w2)));
		this.addEdge(n11,n1);
		this.addEdge(n1,n12);
		this.addEdge(n21,n2);
		this.addEdge(n2,n22);

		if((n11==n21 && n12==n22) || (n11==n22 && n12==n21)) {
			this.addEdge(n1,n2);
		}

		let route = graphology_shortest_path_dijkstra__WEBPACK_IMPORTED_MODULE_1__.bidirectional(this.graph, n1, n2);
		console.log(route);
		if(route) {
			route.splice(0,1);
			route.pop();
		}

		this.graph.dropNode(n1);
		this.graph.dropNode(n2);

		return route;
	}

	draw(ctx) {
		ctx.fillStyle = "black";
		for(let {node: n, attributes: v} of this.graph.nodeEntries()){
			ctx.fillRect(v.pos.x - NSIZE/2, v.pos.y - NSIZE/2, NSIZE, NSIZE);
			ctx.font = '12px serif';
			ctx.fillText(n,v.pos.x, v.pos.y+2*NSIZE);
		}

		if(this.active_n){
			let v = this.graph.getNodeAttributes(this.active_n);
			ctx.fillStyle = "green";
			ctx.fillRect(v.pos.x - NSIZE/2, v.pos.y - NSIZE/2, NSIZE, NSIZE);
		}
		if(this.last_n){
			let v = this.graph.getNodeAttributes(this.last_n);
			ctx.fillStyle = "blue";
			ctx.fillRect(v.pos.x - NSIZE/2, v.pos.y - NSIZE/2, NSIZE, NSIZE);
		}
		
		ctx.fillStyle = "black";
		for (let {edge, attributes: e, source, target, sourceAttributes: v1, targetAttributes: v2} of this.graph.edgeEntries()) {
			ctx.beginPath();
			ctx.moveTo(v1.pos.x, v1.pos.y);
			ctx.lineTo(v2.pos.x, v2.pos.y);
			ctx.stroke();

			let avg = v1.pos.plus(v2.pos).scaledBy(0.5);
			ctx.font = '12px serif';
  			ctx.fillText(
				new Intl.NumberFormat('en-IN', { maximumSignificantDigits: 3 }).format(e.weight),
				avg.x, avg.y
			);
		}
	}
}

/***/ }),

/***/ "./src/vec2.js":
/*!*********************!*\
  !*** ./src/vec2.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Vec2)
/* harmony export */ });
class Vec2 {
	constructor(x, y) { this.x = x; this.y = y;}

	plus(v) { return new Vec2(this.x+v.x, this.y+v.y); }
	scaledBy(f) { return new Vec2(f*this.x, f*this.y); }
	minus(v) { return this.plus(v.scaledBy(-1.0)); }

	dot(v) { return this.x*v.x + this.y*v.y; }
	d2() { return this.dot(this); }
}

/***/ }),

/***/ "./src/assets/cinqueterre.png":
/*!************************************!*\
  !*** ./src/assets/cinqueterre.png ***!
  \************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "b8b811783cea8ccb7cc9.png";

/***/ }),

/***/ "./src/assets/fish.png":
/*!*****************************!*\
  !*** ./src/assets/fish.png ***!
  \*****************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "209a8e148ae0380d9161.png";

/***/ }),

/***/ "./src/assets/fish_walk/fish0000.png":
/*!*******************************************!*\
  !*** ./src/assets/fish_walk/fish0000.png ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "5941422c5e54275b5ee6.png";

/***/ }),

/***/ "./src/assets/fish_walk/fish0001.png":
/*!*******************************************!*\
  !*** ./src/assets/fish_walk/fish0001.png ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "bd4652b2ab90010a77c7.png";

/***/ }),

/***/ "./src/assets/fish_walk/fish0002.png":
/*!*******************************************!*\
  !*** ./src/assets/fish_walk/fish0002.png ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "8be1b6678adbecde2928.png";

/***/ }),

/***/ "./src/assets/fish_walk/fish0003.png":
/*!*******************************************!*\
  !*** ./src/assets/fish_walk/fish0003.png ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "ec4fa90cad867916992f.png";

/***/ }),

/***/ "./src/assets/fish_walk/fish0004.png":
/*!*******************************************!*\
  !*** ./src/assets/fish_walk/fish0004.png ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "b00c2d8148be96719fab.png";

/***/ }),

/***/ "./src/assets/fish_walk/fish0005.png":
/*!*******************************************!*\
  !*** ./src/assets/fish_walk/fish0005.png ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "29c65dfc4f04ac2e90bc.png";

/***/ }),

/***/ "./src/assets/fish_walk/fish0006.png":
/*!*******************************************!*\
  !*** ./src/assets/fish_walk/fish0006.png ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "d9fd97e6c8f2b274d7b9.png";

/***/ }),

/***/ "./src/assets/fish_walk/fish0007.png":
/*!*******************************************!*\
  !*** ./src/assets/fish_walk/fish0007.png ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
module.exports = __webpack_require__.p + "f6d46afd90ec73c31ea3.png";

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) scriptUrl = scripts[scripts.length - 1].src
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!*********************!*\
  !*** ./src/main.js ***!
  \*********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _vec2__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./vec2 */ "./src/vec2.js");
/* harmony import */ var _navgraph__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./navgraph */ "./src/navgraph.js");
/* harmony import */ var _fish__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./fish */ "./src/fish.js");
/* harmony import */ var _assets_cinqueterre_png__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./assets/cinqueterre.png */ "./src/assets/cinqueterre.png");





/*

TODO:
- figure out what to do next!!

*/

window.addEventListener("load", ()=>{
	new Main();
});

class Main {
	constructor() {
		// time stuff
		this.current_time = Date.now();
		this.old_time = this.current_time;
		this.dt = 0;

		// events
		this.event_queue = [];
		window.addEventListener("mousedown", (e)=>{this.mousedown(e)});
		window.addEventListener("mousemove", (e)=>{this.mousemove(e)});
		window.addEventListener("mouseup", (e)=>{this.mouseup(e)});
		window.addEventListener("dblclick", (e)=>{this.dblclick(e)});
		document.getElementById("select").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"select"]);
		});
		document.getElementById("add").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"add"]);
		});
		document.getElementById("add edge").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"add edge"]);
		});
		document.getElementById("delete").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"delete"]);
		});
		document.getElementById("control").addEventListener("click", (e)=>{
			e.changeState = true;
			this.event_queue.push([e,"control"]);
		});

		// canvas stuff
		this.canvas = document.getElementById("canvas");
		this.canvas.width = 1600;
		this.canvas.height= 1200;
		this.ctx = this.canvas.getContext("2d");
		this.mat = this.ctx.getTransform();

		// test stuff
		this.nav = new _navgraph__WEBPACK_IMPORTED_MODULE_1__["default"]();
		this.nav.graph.addNode(0, {pos: new _vec2__WEBPACK_IMPORTED_MODULE_0__["default"](120, 420)});
		this.nav.graph.addNode(1, {pos: new _vec2__WEBPACK_IMPORTED_MODULE_0__["default"](240, 460)});
		this.nav.addEdge(0, 1);

		this.fish = new _fish__WEBPACK_IMPORTED_MODULE_2__["default"](this.nav, 0, 1, 0.5);
		this.village = new Background(_assets_cinqueterre_png__WEBPACK_IMPORTED_MODULE_3__);

		this.step();
	}

	step() {
		this.current_time = Date.now()/1000.0;
		this.dt = this.current_time - this.old_time;
		this.old_time = this.current_time;

		this.draw();
		this.update();
		// restore to default transformations (I do this now so that the matrix for the canvas is good)
		this.ctx.restore();

		window.requestAnimationFrame(()=>this.step());
	}

	update() {
		this.nav.update(this.event_queue);
		this.fish.update(this.event_queue, this.dt);

		// even though we clear the event queue here anyways, do make an effort to pop events
		// off when reacting to them, so that events aren't accepted by multiple things
		// unintentionally.
		this.event_queue.length = 0;
	}

	draw() {
		// reset canvas
		this.ctx.fillStyle = "white";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		// setup initial transformations
		this.ctx.save();
		this.ctx.translate(0,-175);
		this.ctx.scale(1.5,1.5);

		this.mat = this.ctx.getTransform();

		// draw things
		this.village.draw(this.ctx);
		this.nav.draw(this.ctx);
		this.fish.draw(this.ctx);
	}

	mousedown(e){
		e.pos = this.getCursorPosition(e);
		this.event_queue.push([e,"mousedown"]);
	}

	mouseup(e){
		e.pos = this.getCursorPosition(e);
		this.event_queue.push([e,"mouseup"]);
	}

	mousemove(e){
		e.pos = this.getCursorPosition(e);
		this.event_queue.push([e,"mousemove"]);
	}

	dblclick(e){
		e.pos = this.getCursorPosition(e);
		this.event_queue.push([e,"dblclick"]);
	}

	getCursorPositionRaw(e) {
		let rect = this.canvas.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		return new _vec2__WEBPACK_IMPORTED_MODULE_0__["default"](x,y);
	}

	getCursorPosition(e) {
		return this.getTransformed(this.getCursorPositionRaw(e));
	}

	getTransformed(v) {
		let m = this.mat;
		let det_inv = 1.0/(m.a*m.d - m.b*m.c);
		// we need to do inverse of m, which i've done by hand
		return new _vec2__WEBPACK_IMPORTED_MODULE_0__["default"](
			(m.d * (v.x - m.e) - m.c * (v.y - m.f)) * det_inv,
			(-m.b * (v.x - m.e) + m.a * (v.y - m.f)) * det_inv
		);
	}
}

class Background {
	constructor(src){
		this.img = new Image();
		this.img.src = src;
	}

	draw(ctx) {
		ctx.save();

		ctx.scale(0.2, 0.2);
		ctx.drawImage(this.img, 0, 0);

		ctx.restore();
	}
}
})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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V0FBVyxVQUFVO0FBQ3JCLFdBQVcsVUFBVTtBQUNyQixXQUFXLFVBQVU7QUFDckIsV0FBVyxVQUFVO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsVUFBVTtBQUNyQixXQUFXLFVBQVU7QUFDckIsV0FBVyxVQUFVO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLFVBQVU7QUFDckIsV0FBVyxVQUFVO0FBQ3JCLFdBQVcsVUFBVTtBQUNyQjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFlBQVksVUFBVTtBQUN0QixZQUFZLFVBQVU7QUFDdEIsWUFBWTtBQUNaO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLFVBQVU7QUFDdEIsWUFBWSxVQUFVO0FBQ3RCLFlBQVksVUFBVTtBQUN0QixZQUFZO0FBQ1o7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLFVBQVU7QUFDdEIsWUFBWSxVQUFVO0FBQ3RCLFlBQVksVUFBVTtBQUN0QixZQUFZO0FBQ1o7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsVUFBVTtBQUNyQixXQUFXLFVBQVU7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsWUFBWSxVQUFVO0FBQ3RCLFlBQVksVUFBVTtBQUN0QixZQUFZO0FBQ1o7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsVUFBVTtBQUNyQixXQUFXLFVBQVU7QUFDckIsV0FBVyxVQUFVO0FBQ3JCLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx1Q0FBdUMsT0FBTztBQUM5Qzs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxxQ0FBcUMsT0FBTztBQUM1QztBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxHQUFHOztBQUVIO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsVUFBVTtBQUNyQixXQUFXLFVBQVU7QUFDckIsV0FBVyxVQUFVO0FBQ3JCLFdBQVc7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx1Q0FBdUMsT0FBTztBQUM5Qzs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxxQ0FBcUMsT0FBTztBQUM1QztBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxHQUFHOztBQUVIO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxVQUFVO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxZQUFZO0FBQ1o7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLFFBQVE7QUFDcEIsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWSxLQUFLO0FBQ2pCLFlBQVk7QUFDWjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLEtBQUs7QUFDakIsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFlBQVk7QUFDWjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFdBQVcsVUFBVTtBQUNyQjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLFVBQVU7QUFDdEIsWUFBWSxVQUFVO0FBQ3RCLFlBQVk7QUFDWjtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7Ozs7Ozs7Ozs7O0FDL2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSwwQkFBMEI7QUFDMUIsa0NBQWtDO0FBQ2xDLHlCQUF5QjtBQUN6Qiw2QkFBNkI7Ozs7Ozs7Ozs7O0FDOUU3QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxjQUFjLG1CQUFPLENBQUMsa0VBQXFCOztBQUUzQyxZQUFZLG1CQUFPLENBQUMseUVBQW1COztBQUV2QztBQUNBO0FBQ0E7QUFDQTtBQUNBLFlBQVksS0FBSztBQUNqQixZQUFZO0FBQ1o7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLEtBQUs7QUFDakIsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLE9BQU87QUFDbkIsWUFBWTtBQUNaO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsWUFBWSxPQUFPO0FBQ25CLFlBQVk7QUFDWjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUJBQW1CO0FBQ25CLG1CQUFtQjtBQUNuQixlQUFlO0FBQ2YsMEJBQTBCOzs7Ozs7Ozs7OztBQzVGMUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWSxRQUFRO0FBQ3BCLFlBQVk7QUFDWjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsdUJBQXVCO0FBQ3ZCOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsNkJBQTZCO0FBQzdCOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsWUFBWSxRQUFRO0FBQ3BCLFlBQVk7QUFDWjtBQUNBLHFCQUFxQjs7QUFFckI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWSxVQUFVO0FBQ3RCLFlBQVksVUFBVTtBQUN0QixZQUFZO0FBQ1o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLGdDQUFnQztBQUNoQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxnQ0FBZ0MsT0FBTztBQUN2QztBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFlBQVksS0FBSztBQUNqQixZQUFZO0FBQ1o7QUFDQSxvQkFBb0I7QUFDcEI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxZQUFZO0FBQ1osWUFBWTtBQUNaO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBOztBQUVBLG9DQUFvQyxPQUFPO0FBQzNDOztBQUVBOztBQUVBLHFCQUFxQixPQUFPO0FBQzVCO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFlBQVksV0FBVztBQUN2QixZQUFZO0FBQ1o7QUFDQSxlQUFlO0FBQ2Y7O0FBRUE7O0FBRUEsa0JBQWtCLFlBQVk7QUFDOUI7O0FBRUE7QUFDQTs7Ozs7Ozs7Ozs7QUMxTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsY0FBYyxtQkFBTyxDQUFDLDJEQUFjOztBQUVwQztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFlBQVksVUFBVTtBQUN0QixZQUFZLFVBQVU7QUFDdEI7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQ0FBcUMsT0FBTztBQUM1QztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOzs7Ozs7Ozs7OztBQ3hFQSw0QkFBNEI7QUFDNUIsc0JBQXNCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDRHdCO0FBQ2M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUM1RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUFBRTtBQUNGO0FBQ0E7QUFDQTtBQUNlO0FBQ2Y7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLDZDQUFhO0FBQ3JDO0FBQ0EsaUJBQWlCLEtBQUs7QUFDdEI7QUFDQTtBQUNBLDBCQUEwQiwyREFBYTtBQUN2QywwQkFBMEIsMkRBQWE7QUFDdkMsMEJBQTBCLDJEQUFhO0FBQ3ZDLDBCQUEwQiwyREFBYTtBQUN2QywwQkFBMEIsMkRBQWE7QUFDdkMsMEJBQTBCLDJEQUFhO0FBQ3ZDLDBCQUEwQiwyREFBYTtBQUN2QywwQkFBMEIsMkRBQWE7QUFDdkM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Es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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYSw2Q0FBSTtBQUNqQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsNkNBQUk7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9wb2ludC1hbmQtY2xpY2svLi9ub2RlX21vZHVsZXMvZ3JhcGhvbG9neS1zaG9ydGVzdC1wYXRoL2RpamtzdHJhLmpzIiwid2VicGFjazovL3BvaW50LWFuZC1jbGljay8uL25vZGVfbW9kdWxlcy9ncmFwaG9sb2d5LXV0aWxzL2dldHRlcnMuanMiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vbm9kZV9tb2R1bGVzL2dyYXBob2xvZ3ktdXRpbHMvaXMtZ3JhcGguanMiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vbm9kZV9tb2R1bGVzL2dyYXBob2xvZ3kvZGlzdC9ncmFwaG9sb2d5LnVtZC5taW4uanMiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vbm9kZV9tb2R1bGVzL21uZW1vbmlzdC9oZWFwLmpzIiwid2VicGFjazovL3BvaW50LWFuZC1jbGljay8uL25vZGVfbW9kdWxlcy9tbmVtb25pc3QvdXRpbHMvY29tcGFyYXRvcnMuanMiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vbm9kZV9tb2R1bGVzL21uZW1vbmlzdC91dGlscy9pdGVyYWJsZXMuanMiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vbm9kZV9tb2R1bGVzL21uZW1vbmlzdC91dGlscy90eXBlZC1hcnJheXMuanMiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vbm9kZV9tb2R1bGVzL29ibGl0ZXJhdG9yL2ZvcmVhY2guanMiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vbm9kZV9tb2R1bGVzL29ibGl0ZXJhdG9yL3N1cHBvcnQuanMiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vc3JjL2Zpc2guanMiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vc3JjL25hdmdyYXBoLmpzIiwid2VicGFjazovL3BvaW50LWFuZC1jbGljay8uL3NyYy92ZWMyLmpzIiwid2VicGFjazovL3BvaW50LWFuZC1jbGljay93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9wb2ludC1hbmQtY2xpY2svd2VicGFjay9ydW50aW1lL2NvbXBhdCBnZXQgZGVmYXVsdCBleHBvcnQiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9wb2ludC1hbmQtY2xpY2svd2VicGFjay9ydW50aW1lL2dsb2JhbCIsIndlYnBhY2s6Ly9wb2ludC1hbmQtY2xpY2svd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCIsIndlYnBhY2s6Ly9wb2ludC1hbmQtY2xpY2svd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9wb2ludC1hbmQtY2xpY2svd2VicGFjay9ydW50aW1lL3B1YmxpY1BhdGgiLCJ3ZWJwYWNrOi8vcG9pbnQtYW5kLWNsaWNrLy4vc3JjL21haW4uanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBHcmFwaG9sb2d5IERpamtzdHJhIFNob3J0ZXN0IFBhdGhcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqXG4gKiBHcmFwaG9sb2d5IGltcGxlbWVudGF0aW9uIG9mIERpamtzdHJhIHNob3J0ZXN0IHBhdGggZm9yIHdlaWdodGVkIGdyYXBocy5cbiAqL1xudmFyIGlzR3JhcGggPSByZXF1aXJlKCdncmFwaG9sb2d5LXV0aWxzL2lzLWdyYXBoJyk7XG52YXIgY3JlYXRlRWRnZVdlaWdodEdldHRlciA9XG4gIHJlcXVpcmUoJ2dyYXBob2xvZ3ktdXRpbHMvZ2V0dGVycycpLmNyZWF0ZUVkZ2VXZWlnaHRHZXR0ZXI7XG52YXIgSGVhcCA9IHJlcXVpcmUoJ21uZW1vbmlzdC9oZWFwJyk7XG5cbi8qKlxuICogRGVmYXVsdHMgJiBoZWxwZXJzLlxuICovXG52YXIgREVGQVVMVF9XRUlHSFRfQVRUUklCVVRFID0gJ3dlaWdodCc7XG5cbmZ1bmN0aW9uIERJSktTVFJBX0hFQVBfQ09NUEFSQVRPUihhLCBiKSB7XG4gIGlmIChhWzBdID4gYlswXSkgcmV0dXJuIDE7XG4gIGlmIChhWzBdIDwgYlswXSkgcmV0dXJuIC0xO1xuXG4gIGlmIChhWzFdID4gYlsxXSkgcmV0dXJuIDE7XG4gIGlmIChhWzFdIDwgYlsxXSkgcmV0dXJuIC0xO1xuXG4gIGlmIChhWzJdID4gYlsyXSkgcmV0dXJuIDE7XG4gIGlmIChhWzJdIDwgYlsyXSkgcmV0dXJuIC0xO1xuXG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBCUkFOREVTX0RJSktTVFJBX0hFQVBfQ09NUEFSQVRPUihhLCBiKSB7XG4gIGlmIChhWzBdID4gYlswXSkgcmV0dXJuIDE7XG4gIGlmIChhWzBdIDwgYlswXSkgcmV0dXJuIC0xO1xuXG4gIGlmIChhWzFdID4gYlsxXSkgcmV0dXJuIDE7XG4gIGlmIChhWzFdIDwgYlsxXSkgcmV0dXJuIC0xO1xuXG4gIGlmIChhWzJdID4gYlsyXSkgcmV0dXJuIDE7XG4gIGlmIChhWzJdIDwgYlsyXSkgcmV0dXJuIC0xO1xuXG4gIGlmIChhWzNdID4gYlszXSkgcmV0dXJuIDE7XG4gIGlmIChhWzNdIDwgYlszXSkgcmV0dXJuIC0xO1xuXG4gIHJldHVybiAwO1xufVxuXG4vKipcbiAqIEJpZGlyZWN0aW9uYWwgRGlqa3N0cmEgc2hvcnRlc3QgcGF0aCBiZXR3ZWVuIHNvdXJjZSAmIHRhcmdldCBub2RlIGFic3RyYWN0LlxuICpcbiAqIE5vdGUgdGhhdCB0aGlzIGltcGxlbWVudGF0aW9uIHdhcyBiYXNpY2FsbHkgY29waWVkIGZyb20gbmV0d29ya3guXG4gKlxuICogQHBhcmFtICB7R3JhcGh9ICBncmFwaCAgICAgICAgIC0gVGhlIGdyYXBob2xvZ3kgaW5zdGFuY2UuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHNvdXJjZSAgICAgICAgLSBTb3VyY2Ugbm9kZS5cbiAqIEBwYXJhbSAge3N0cmluZ30gdGFyZ2V0ICAgICAgICAtIFRhcmdldCBub2RlLlxuICogQHBhcmFtICB7c3RyaW5nfSBnZXRFZGdlV2VpZ2h0IC0gTmFtZSBvZiB0aGUgd2VpZ2h0IGF0dHJpYnV0ZSBvciBnZXR0ZXIgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHthcnJheX0gICAgICAgICAgICAgICAgLSBUaGUgZm91bmQgcGF0aCBpZiBhbnkgYW5kIGl0cyBjb3N0LlxuICovXG5mdW5jdGlvbiBhYnN0cmFjdEJpZGlyZWN0aW9uYWxEaWprc3RyYShncmFwaCwgc291cmNlLCB0YXJnZXQsIGdldEVkZ2VXZWlnaHQpIHtcbiAgc291cmNlID0gJycgKyBzb3VyY2U7XG4gIHRhcmdldCA9ICcnICsgdGFyZ2V0O1xuXG4gIC8vIFNhbml0eSBjaGVja3NcbiAgaWYgKCFpc0dyYXBoKGdyYXBoKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnZ3JhcGhvbG9neS1zaG9ydGVzdC1wYXRoL2RpamtzdHJhOiBpbnZhbGlkIGdyYXBob2xvZ3kgaW5zdGFuY2UuJ1xuICAgICk7XG5cbiAgaWYgKHNvdXJjZSAmJiAhZ3JhcGguaGFzTm9kZShzb3VyY2UpKVxuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICdncmFwaG9sb2d5LXNob3J0ZXN0LXBhdGgvZGlqa3N0cmE6IHRoZSBcIicgK1xuICAgICAgICBzb3VyY2UgK1xuICAgICAgICAnXCIgc291cmNlIG5vZGUgZG9lcyBub3QgZXhpc3QgaW4gdGhlIGdpdmVuIGdyYXBoLidcbiAgICApO1xuXG4gIGlmICh0YXJnZXQgJiYgIWdyYXBoLmhhc05vZGUodGFyZ2V0KSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnZ3JhcGhvbG9neS1zaG9ydGVzdC1wYXRoL2RpamtzdHJhOiB0aGUgXCInICtcbiAgICAgICAgdGFyZ2V0ICtcbiAgICAgICAgJ1wiIHRhcmdldCBub2RlIGRvZXMgbm90IGV4aXN0IGluIHRoZSBnaXZlbiBncmFwaC4nXG4gICAgKTtcblxuICBnZXRFZGdlV2VpZ2h0ID0gY3JlYXRlRWRnZVdlaWdodEdldHRlcihcbiAgICBnZXRFZGdlV2VpZ2h0IHx8IERFRkFVTFRfV0VJR0hUX0FUVFJJQlVURVxuICApLmZyb21NaW5pbWFsRW50cnk7XG5cbiAgaWYgKHNvdXJjZSA9PT0gdGFyZ2V0KSByZXR1cm4gWzAsIFtzb3VyY2VdXTtcblxuICB2YXIgZGlzdGFuY2VzID0gW3t9LCB7fV0sXG4gICAgcGF0aHMgPSBbe30sIHt9XSxcbiAgICBmcmluZ2UgPSBbXG4gICAgICBuZXcgSGVhcChESUpLU1RSQV9IRUFQX0NPTVBBUkFUT1IpLFxuICAgICAgbmV3IEhlYXAoRElKS1NUUkFfSEVBUF9DT01QQVJBVE9SKVxuICAgIF0sXG4gICAgc2VlbiA9IFt7fSwge31dO1xuXG4gIHBhdGhzWzBdW3NvdXJjZV0gPSBbc291cmNlXTtcbiAgcGF0aHNbMV1bdGFyZ2V0XSA9IFt0YXJnZXRdO1xuXG4gIHNlZW5bMF1bc291cmNlXSA9IDA7XG4gIHNlZW5bMV1bdGFyZ2V0XSA9IDA7XG5cbiAgdmFyIGZpbmFsUGF0aCA9IFtdLFxuICAgIGZpbmFsRGlzdGFuY2UgPSBJbmZpbml0eTtcblxuICB2YXIgY291bnQgPSAwLFxuICAgIGRpciA9IDEsXG4gICAgaXRlbSxcbiAgICBlZGdlcyxcbiAgICBjb3N0LFxuICAgIGQsXG4gICAgdixcbiAgICB1LFxuICAgIGUsXG4gICAgaSxcbiAgICBsO1xuXG4gIGZyaW5nZVswXS5wdXNoKFswLCBjb3VudCsrLCBzb3VyY2VdKTtcbiAgZnJpbmdlWzFdLnB1c2goWzAsIGNvdW50KyssIHRhcmdldF0pO1xuXG4gIHdoaWxlIChmcmluZ2VbMF0uc2l6ZSAmJiBmcmluZ2VbMV0uc2l6ZSkge1xuICAgIC8vIFN3YXBwaW5nIGRpcmVjdGlvblxuICAgIGRpciA9IDEgLSBkaXI7XG5cbiAgICBpdGVtID0gZnJpbmdlW2Rpcl0ucG9wKCk7XG4gICAgZCA9IGl0ZW1bMF07XG4gICAgdiA9IGl0ZW1bMl07XG5cbiAgICBpZiAodiBpbiBkaXN0YW5jZXNbZGlyXSkgY29udGludWU7XG5cbiAgICBkaXN0YW5jZXNbZGlyXVt2XSA9IGQ7XG5cbiAgICAvLyBTaG9ydGVzdCBwYXRoIGlzIGZvdW5kP1xuICAgIGlmICh2IGluIGRpc3RhbmNlc1sxIC0gZGlyXSkgcmV0dXJuIFtmaW5hbERpc3RhbmNlLCBmaW5hbFBhdGhdO1xuXG4gICAgZWRnZXMgPSBkaXIgPT09IDEgPyBncmFwaC5pbmJvdW5kRWRnZXModikgOiBncmFwaC5vdXRib3VuZEVkZ2VzKHYpO1xuXG4gICAgZm9yIChpID0gMCwgbCA9IGVkZ2VzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgZSA9IGVkZ2VzW2ldO1xuICAgICAgdSA9IGdyYXBoLm9wcG9zaXRlKHYsIGUpO1xuICAgICAgY29zdCA9IGRpc3RhbmNlc1tkaXJdW3ZdICsgZ2V0RWRnZVdlaWdodChlLCBncmFwaC5nZXRFZGdlQXR0cmlidXRlcyhlKSk7XG5cbiAgICAgIGlmICh1IGluIGRpc3RhbmNlc1tkaXJdICYmIGNvc3QgPCBkaXN0YW5jZXNbZGlyXVt1XSkge1xuICAgICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICAnZ3JhcGhvbG9neS1zaG9ydGVzdC1wYXRoL2RpamtzdHJhOiBjb250cmFkaWN0b3J5IHBhdGhzIGZvdW5kLiBEbyBzb21lIG9mIHlvdXIgZWRnZXMgaGF2ZSBhIG5lZ2F0aXZlIHdlaWdodD8nXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKCEodSBpbiBzZWVuW2Rpcl0pIHx8IGNvc3QgPCBzZWVuW2Rpcl1bdV0pIHtcbiAgICAgICAgc2VlbltkaXJdW3VdID0gY29zdDtcbiAgICAgICAgZnJpbmdlW2Rpcl0ucHVzaChbY29zdCwgY291bnQrKywgdV0pO1xuICAgICAgICBwYXRoc1tkaXJdW3VdID0gcGF0aHNbZGlyXVt2XS5jb25jYXQodSk7XG5cbiAgICAgICAgaWYgKHUgaW4gc2VlblswXSAmJiB1IGluIHNlZW5bMV0pIHtcbiAgICAgICAgICBkID0gc2VlblswXVt1XSArIHNlZW5bMV1bdV07XG5cbiAgICAgICAgICBpZiAoZmluYWxQYXRoLmxlbmd0aCA9PT0gMCB8fCBmaW5hbERpc3RhbmNlID4gZCkge1xuICAgICAgICAgICAgZmluYWxEaXN0YW5jZSA9IGQ7XG4gICAgICAgICAgICBmaW5hbFBhdGggPSBwYXRoc1swXVt1XS5jb25jYXQocGF0aHNbMV1bdV0uc2xpY2UoMCwgLTEpLnJldmVyc2UoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gTm8gcGF0aCB3YXMgZm91bmRcbiAgcmV0dXJuIFtJbmZpbml0eSwgbnVsbF07XG59XG5cbi8qKlxuICogTXVsdGlzb3VyY2UgRGlqa3N0cmEgc2hvcnRlc3QgcGF0aCBhYnN0cmFjdCBmdW5jdGlvbi4gVGhpcyBmdW5jdGlvbiBpcyB0aGVcbiAqIGJhc2lzIG9mIHRoZSBhbGdvcml0aG0gdGhhdCBldmVyeSBvdGhlciB3aWxsIHVzZS5cbiAqXG4gKiBOb3RlIHRoYXQgdGhpcyBpbXBsZW1lbnRhdGlvbiB3YXMgYmFzaWNhbGx5IGNvcGllZCBmcm9tIG5ldHdvcmt4LlxuICogVE9ETzogaXQgbWlnaHQgYmUgbW9yZSBwZXJmb3JtYW50IHRvIHVzZSBhIGRlZGljYXRlZCBvYmpldCBmb3IgdGhlIGhlYXAnc1xuICogaXRlbXMuXG4gKlxuICogQHBhcmFtICB7R3JhcGh9ICBncmFwaCAgICAgICAgIC0gVGhlIGdyYXBob2xvZ3kgaW5zdGFuY2UuXG4gKiBAcGFyYW0gIHthcnJheX0gIHNvdXJjZXMgICAgICAgLSBBIGxpc3Qgb2Ygc291cmNlcy5cbiAqIEBwYXJhbSAge3N0cmluZ30gZ2V0RWRnZVdlaWdodCAtIE5hbWUgb2YgdGhlIHdlaWdodCBhdHRyaWJ1dGUgb3IgZ2V0dGVyIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7bnVtYmVyfSBjdXRvZmYgICAgICAgIC0gTWF4aW11bSBkZXB0aCBvZiB0aGUgc2VhcmNoLlxuICogQHBhcmFtICB7c3RyaW5nfSB0YXJnZXQgICAgICAgIC0gT3B0aW9uYWwgdGFyZ2V0IHRvIHJlYWNoLlxuICogQHBhcmFtICB7b2JqZWN0fSBwYXRocyAgICAgICAgIC0gT3B0aW9uYWwgcGF0aHMgb2JqZWN0IHRvIG1haW50YWluLlxuICogQHJldHVybiB7b2JqZWN0fSAgICAgICAgICAgICAgIC0gUmV0dXJucyB0aGUgcGF0aHMuXG4gKi9cbmZ1bmN0aW9uIGFic3RyYWN0RGlqa3N0cmFNdWx0aXNvdXJjZShcbiAgZ3JhcGgsXG4gIHNvdXJjZXMsXG4gIGdldEVkZ2VXZWlnaHQsXG4gIGN1dG9mZixcbiAgdGFyZ2V0LFxuICBwYXRoc1xuKSB7XG4gIGlmICghaXNHcmFwaChncmFwaCkpXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ2dyYXBob2xvZ3ktc2hvcnRlc3QtcGF0aC9kaWprc3RyYTogaW52YWxpZCBncmFwaG9sb2d5IGluc3RhbmNlLidcbiAgICApO1xuXG4gIGlmICh0YXJnZXQgJiYgIWdyYXBoLmhhc05vZGUodGFyZ2V0KSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnZ3JhcGhvbG9neS1zaG9ydGVzdC1wYXRoL2RpamtzdHJhOiB0aGUgXCInICtcbiAgICAgICAgdGFyZ2V0ICtcbiAgICAgICAgJ1wiIHRhcmdldCBub2RlIGRvZXMgbm90IGV4aXN0IGluIHRoZSBnaXZlbiBncmFwaC4nXG4gICAgKTtcblxuICBnZXRFZGdlV2VpZ2h0ID0gY3JlYXRlRWRnZVdlaWdodEdldHRlcihcbiAgICBnZXRFZGdlV2VpZ2h0IHx8IERFRkFVTFRfV0VJR0hUX0FUVFJJQlVURVxuICApLmZyb21NaW5pbWFsRW50cnk7XG5cbiAgdmFyIGRpc3RhbmNlcyA9IHt9LFxuICAgIHNlZW4gPSB7fSxcbiAgICBmcmluZ2UgPSBuZXcgSGVhcChESUpLU1RSQV9IRUFQX0NPTVBBUkFUT1IpO1xuXG4gIHZhciBjb3VudCA9IDAsXG4gICAgZWRnZXMsXG4gICAgaXRlbSxcbiAgICBjb3N0LFxuICAgIHYsXG4gICAgdSxcbiAgICBlLFxuICAgIGQsXG4gICAgaSxcbiAgICBqLFxuICAgIGwsXG4gICAgbTtcblxuICBmb3IgKGkgPSAwLCBsID0gc291cmNlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2ID0gc291cmNlc1tpXTtcbiAgICBzZWVuW3ZdID0gMDtcbiAgICBmcmluZ2UucHVzaChbMCwgY291bnQrKywgdl0pO1xuXG4gICAgaWYgKHBhdGhzKSBwYXRoc1t2XSA9IFt2XTtcbiAgfVxuXG4gIHdoaWxlIChmcmluZ2Uuc2l6ZSkge1xuICAgIGl0ZW0gPSBmcmluZ2UucG9wKCk7XG4gICAgZCA9IGl0ZW1bMF07XG4gICAgdiA9IGl0ZW1bMl07XG5cbiAgICBpZiAodiBpbiBkaXN0YW5jZXMpIGNvbnRpbnVlO1xuXG4gICAgZGlzdGFuY2VzW3ZdID0gZDtcblxuICAgIGlmICh2ID09PSB0YXJnZXQpIGJyZWFrO1xuXG4gICAgZWRnZXMgPSBncmFwaC5vdXRib3VuZEVkZ2VzKHYpO1xuXG4gICAgZm9yIChqID0gMCwgbSA9IGVkZ2VzLmxlbmd0aDsgaiA8IG07IGorKykge1xuICAgICAgZSA9IGVkZ2VzW2pdO1xuICAgICAgdSA9IGdyYXBoLm9wcG9zaXRlKHYsIGUpO1xuICAgICAgY29zdCA9IGdldEVkZ2VXZWlnaHQoZSwgZ3JhcGguZ2V0RWRnZUF0dHJpYnV0ZXMoZSkpICsgZGlzdGFuY2VzW3ZdO1xuXG4gICAgICBpZiAoY3V0b2ZmICYmIGNvc3QgPiBjdXRvZmYpIGNvbnRpbnVlO1xuXG4gICAgICBpZiAodSBpbiBkaXN0YW5jZXMgJiYgY29zdCA8IGRpc3RhbmNlc1t1XSkge1xuICAgICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICAnZ3JhcGhvbG9neS1zaG9ydGVzdC1wYXRoL2RpamtzdHJhOiBjb250cmFkaWN0b3J5IHBhdGhzIGZvdW5kLiBEbyBzb21lIG9mIHlvdXIgZWRnZXMgaGF2ZSBhIG5lZ2F0aXZlIHdlaWdodD8nXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKCEodSBpbiBzZWVuKSB8fCBjb3N0IDwgc2Vlblt1XSkge1xuICAgICAgICBzZWVuW3VdID0gY29zdDtcbiAgICAgICAgZnJpbmdlLnB1c2goW2Nvc3QsIGNvdW50KyssIHVdKTtcblxuICAgICAgICBpZiAocGF0aHMpIHBhdGhzW3VdID0gcGF0aHNbdl0uY29uY2F0KHUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkaXN0YW5jZXM7XG59XG5cbi8qKlxuICogU2luZ2xlIHNvdXJjZSBEaWprc3RyYSBzaG9ydGVzdCBwYXRoIGJldHdlZW4gZ2l2ZW4gbm9kZSAmIG90aGVyIG5vZGVzIGluXG4gKiB0aGUgZ3JhcGguXG4gKlxuICogQHBhcmFtICB7R3JhcGh9ICBncmFwaCAgICAgICAgIC0gVGhlIGdyYXBob2xvZ3kgaW5zdGFuY2UuXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHNvdXJjZSAgICAgICAgLSBTb3VyY2Ugbm9kZS5cbiAqIEBwYXJhbSAge3N0cmluZ30gZ2V0RWRnZVdlaWdodCAtIE5hbWUgb2YgdGhlIHdlaWdodCBhdHRyaWJ1dGUgb3IgZ2V0dGVyIGZ1bmN0aW9uLlxuICogQHJldHVybiB7b2JqZWN0fSAgICAgICAgICAgICAgIC0gQW4gb2JqZWN0IG9mIGZvdW5kIHBhdGhzLlxuICovXG5mdW5jdGlvbiBzaW5nbGVTb3VyY2VEaWprc3RyYShncmFwaCwgc291cmNlLCBnZXRFZGdlV2VpZ2h0KSB7XG4gIHZhciBwYXRocyA9IHt9O1xuXG4gIGFic3RyYWN0RGlqa3N0cmFNdWx0aXNvdXJjZShncmFwaCwgW3NvdXJjZV0sIGdldEVkZ2VXZWlnaHQsIDAsIG51bGwsIHBhdGhzKTtcblxuICByZXR1cm4gcGF0aHM7XG59XG5cbmZ1bmN0aW9uIGJpZGlyZWN0aW9uYWxEaWprc3RyYShncmFwaCwgc291cmNlLCB0YXJnZXQsIGdldEVkZ2VXZWlnaHQpIHtcbiAgcmV0dXJuIGFic3RyYWN0QmlkaXJlY3Rpb25hbERpamtzdHJhKGdyYXBoLCBzb3VyY2UsIHRhcmdldCwgZ2V0RWRnZVdlaWdodClbMV07XG59XG5cbi8qKlxuICogRnVuY3Rpb24gdXNpbmcgVWxyaWsgQnJhbmRlcycgbWV0aG9kIHRvIG1hcCBzaW5nbGUgc291cmNlIHNob3J0ZXN0IHBhdGhzXG4gKiBmcm9tIHNlbGVjdGVkIG5vZGUuXG4gKlxuICogW1JlZmVyZW5jZV06XG4gKiBVbHJpayBCcmFuZGVzOiBBIEZhc3RlciBBbGdvcml0aG0gZm9yIEJldHdlZW5uZXNzIENlbnRyYWxpdHkuXG4gKiBKb3VybmFsIG9mIE1hdGhlbWF0aWNhbCBTb2Npb2xvZ3kgMjUoMik6MTYzLTE3NywgMjAwMS5cbiAqXG4gKiBAcGFyYW0gIHtHcmFwaH0gIGdyYXBoICAgICAgICAgLSBUYXJnZXQgZ3JhcGguXG4gKiBAcGFyYW0gIHthbnl9ICAgIHNvdXJjZSAgICAgICAgLSBTb3VyY2Ugbm9kZS5cbiAqIEBwYXJhbSAge3N0cmluZ30gZ2V0RWRnZVdlaWdodCAtIE5hbWUgb2YgdGhlIHdlaWdodCBhdHRyaWJ1dGUgb3IgZ2V0dGVyIGZ1bmN0aW9uLlxuICogQHJldHVybiB7YXJyYXl9ICAgICAgICAgICAgICAgIC0gW1N0YWNrLCBQYXRocywgU2lnbWFdXG4gKi9cbmZ1bmN0aW9uIGJyYW5kZXMoZ3JhcGgsIHNvdXJjZSwgZ2V0RWRnZVdlaWdodCkge1xuICBzb3VyY2UgPSAnJyArIHNvdXJjZTtcblxuICBnZXRFZGdlV2VpZ2h0ID0gY3JlYXRlRWRnZVdlaWdodEdldHRlcihcbiAgICBnZXRFZGdlV2VpZ2h0IHx8IERFRkFVTFRfV0VJR0hUX0FUVFJJQlVURVxuICApLmZyb21NaW5pbWFsRW50cnk7XG5cbiAgdmFyIFMgPSBbXSxcbiAgICBQID0ge30sXG4gICAgc2lnbWEgPSB7fTtcblxuICB2YXIgbm9kZXMgPSBncmFwaC5ub2RlcygpLFxuICAgIGVkZ2VzLFxuICAgIGl0ZW0sXG4gICAgcHJlZCxcbiAgICBkaXN0LFxuICAgIGNvc3QsXG4gICAgdixcbiAgICB3LFxuICAgIGUsXG4gICAgaSxcbiAgICBsO1xuXG4gIGZvciAoaSA9IDAsIGwgPSBub2Rlcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2ID0gbm9kZXNbaV07XG4gICAgUFt2XSA9IFtdO1xuICAgIHNpZ21hW3ZdID0gMDtcbiAgfVxuXG4gIHZhciBEID0ge307XG5cbiAgc2lnbWFbc291cmNlXSA9IDE7XG5cbiAgdmFyIHNlZW4gPSB7fTtcbiAgc2Vlbltzb3VyY2VdID0gMDtcblxuICB2YXIgY291bnQgPSAwO1xuXG4gIHZhciBRID0gbmV3IEhlYXAoQlJBTkRFU19ESUpLU1RSQV9IRUFQX0NPTVBBUkFUT1IpO1xuICBRLnB1c2goWzAsIGNvdW50KyssIHNvdXJjZSwgc291cmNlXSk7XG5cbiAgd2hpbGUgKFEuc2l6ZSkge1xuICAgIGl0ZW0gPSBRLnBvcCgpO1xuICAgIGRpc3QgPSBpdGVtWzBdO1xuICAgIHByZWQgPSBpdGVtWzJdO1xuICAgIHYgPSBpdGVtWzNdO1xuXG4gICAgaWYgKHYgaW4gRCkgY29udGludWU7XG5cbiAgICBzaWdtYVt2XSArPSBzaWdtYVtwcmVkXTtcbiAgICBTLnB1c2godik7XG4gICAgRFt2XSA9IGRpc3Q7XG5cbiAgICBlZGdlcyA9IGdyYXBoLm91dGJvdW5kRWRnZXModik7XG5cbiAgICBmb3IgKGkgPSAwLCBsID0gZWRnZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBlID0gZWRnZXNbaV07XG4gICAgICB3ID0gZ3JhcGgub3Bwb3NpdGUodiwgZSk7XG4gICAgICBjb3N0ID0gZGlzdCArIGdldEVkZ2VXZWlnaHQoZSwgZ3JhcGguZ2V0RWRnZUF0dHJpYnV0ZXMoZSkpO1xuXG4gICAgICBpZiAoISh3IGluIEQpICYmICghKHcgaW4gc2VlbikgfHwgY29zdCA8IHNlZW5bd10pKSB7XG4gICAgICAgIHNlZW5bd10gPSBjb3N0O1xuICAgICAgICBRLnB1c2goW2Nvc3QsIGNvdW50KyssIHYsIHddKTtcbiAgICAgICAgc2lnbWFbd10gPSAwO1xuICAgICAgICBQW3ddID0gW3ZdO1xuICAgICAgfSBlbHNlIGlmIChjb3N0ID09PSBzZWVuW3ddKSB7XG4gICAgICAgIHNpZ21hW3ddICs9IHNpZ21hW3ZdO1xuICAgICAgICBQW3ddLnB1c2godik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIFtTLCBQLCBzaWdtYV07XG59XG5cbi8qKlxuICogRXhwb3J0aW5nLlxuICovXG5leHBvcnRzLmJpZGlyZWN0aW9uYWwgPSBiaWRpcmVjdGlvbmFsRGlqa3N0cmE7XG5leHBvcnRzLnNpbmdsZVNvdXJjZSA9IHNpbmdsZVNvdXJjZURpamtzdHJhO1xuZXhwb3J0cy5icmFuZGVzID0gYnJhbmRlcztcbiIsIi8qKlxuICogR3JhcGhvbG9neSBXZWlnaHQgR2V0dGVyXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09XG4gKlxuICogRnVuY3Rpb24gY3JlYXRpbmcgd2VpZ2h0IGdldHRlcnMuXG4gKi9cbmZ1bmN0aW9uIGNvZXJjZVdlaWdodCh2YWx1ZSkge1xuICAvLyBFbnN1cmluZyB0YXJnZXQgdmFsdWUgaXMgYSBjb3JyZWN0IG51bWJlclxuICBpZiAodHlwZW9mIHZhbHVlICE9PSAnbnVtYmVyJyB8fCBpc05hTih2YWx1ZSkpIHJldHVybiAxO1xuXG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlTm9kZVZhbHVlR2V0dGVyKG5hbWVPckZ1bmN0aW9uLCBkZWZhdWx0VmFsdWUpIHtcbiAgdmFyIGdldHRlciA9IHt9O1xuXG4gIHZhciBjb2VyY2VUb0RlZmF1bHQgPSBmdW5jdGlvbiAodikge1xuICAgIGlmICh0eXBlb2YgdiA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBkZWZhdWx0VmFsdWU7XG5cbiAgICByZXR1cm4gdjtcbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmF1bHRWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykgY29lcmNlVG9EZWZhdWx0ID0gZGVmYXVsdFZhbHVlO1xuXG4gIHZhciBnZXQgPSBmdW5jdGlvbiAoYXR0cmlidXRlcykge1xuICAgIHJldHVybiBjb2VyY2VUb0RlZmF1bHQoYXR0cmlidXRlc1tuYW1lT3JGdW5jdGlvbl0pO1xuICB9O1xuXG4gIHZhciByZXR1cm5EZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBjb2VyY2VUb0RlZmF1bHQodW5kZWZpbmVkKTtcbiAgfTtcblxuICBpZiAodHlwZW9mIG5hbWVPckZ1bmN0aW9uID09PSAnc3RyaW5nJykge1xuICAgIGdldHRlci5mcm9tQXR0cmlidXRlcyA9IGdldDtcbiAgICBnZXR0ZXIuZnJvbUdyYXBoID0gZnVuY3Rpb24gKGdyYXBoLCBub2RlKSB7XG4gICAgICByZXR1cm4gZ2V0KGdyYXBoLmdldE5vZGVBdHRyaWJ1dGVzKG5vZGUpKTtcbiAgICB9O1xuICAgIGdldHRlci5mcm9tRW50cnkgPSBmdW5jdGlvbiAobm9kZSwgYXR0cmlidXRlcykge1xuICAgICAgcmV0dXJuIGdldChhdHRyaWJ1dGVzKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKHR5cGVvZiBuYW1lT3JGdW5jdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGdldHRlci5mcm9tQXR0cmlidXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ2dyYXBob2xvZ3ktdXRpbHMvZ2V0dGVycy9jcmVhdGVOb2RlVmFsdWVHZXR0ZXI6IGlycmVsZXZhbnQgdXNhZ2UuJ1xuICAgICAgKTtcbiAgICB9O1xuICAgIGdldHRlci5mcm9tR3JhcGggPSBmdW5jdGlvbiAoZ3JhcGgsIG5vZGUpIHtcbiAgICAgIHJldHVybiBjb2VyY2VUb0RlZmF1bHQoXG4gICAgICAgIG5hbWVPckZ1bmN0aW9uKG5vZGUsIGdyYXBoLmdldE5vZGVBdHRyaWJ1dGVzKG5vZGUpKVxuICAgICAgKTtcbiAgICB9O1xuICAgIGdldHRlci5mcm9tRW50cnkgPSBmdW5jdGlvbiAobm9kZSwgYXR0cmlidXRlcykge1xuICAgICAgcmV0dXJuIGNvZXJjZVRvRGVmYXVsdChuYW1lT3JGdW5jdGlvbihub2RlLCBhdHRyaWJ1dGVzKSk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBnZXR0ZXIuZnJvbUF0dHJpYnV0ZXMgPSByZXR1cm5EZWZhdWx0O1xuICAgIGdldHRlci5mcm9tR3JhcGggPSByZXR1cm5EZWZhdWx0O1xuICAgIGdldHRlci5mcm9tRW50cnkgPSByZXR1cm5EZWZhdWx0O1xuICB9XG5cbiAgcmV0dXJuIGdldHRlcjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlRWRnZVZhbHVlR2V0dGVyKG5hbWVPckZ1bmN0aW9uLCBkZWZhdWx0VmFsdWUpIHtcbiAgdmFyIGdldHRlciA9IHt9O1xuXG4gIHZhciBjb2VyY2VUb0RlZmF1bHQgPSBmdW5jdGlvbiAodikge1xuICAgIGlmICh0eXBlb2YgdiA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBkZWZhdWx0VmFsdWU7XG5cbiAgICByZXR1cm4gdjtcbiAgfTtcblxuICBpZiAodHlwZW9mIGRlZmF1bHRWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykgY29lcmNlVG9EZWZhdWx0ID0gZGVmYXVsdFZhbHVlO1xuXG4gIHZhciBnZXQgPSBmdW5jdGlvbiAoYXR0cmlidXRlcykge1xuICAgIHJldHVybiBjb2VyY2VUb0RlZmF1bHQoYXR0cmlidXRlc1tuYW1lT3JGdW5jdGlvbl0pO1xuICB9O1xuXG4gIHZhciByZXR1cm5EZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBjb2VyY2VUb0RlZmF1bHQodW5kZWZpbmVkKTtcbiAgfTtcblxuICBpZiAodHlwZW9mIG5hbWVPckZ1bmN0aW9uID09PSAnc3RyaW5nJykge1xuICAgIGdldHRlci5mcm9tQXR0cmlidXRlcyA9IGdldDtcbiAgICBnZXR0ZXIuZnJvbUdyYXBoID0gZnVuY3Rpb24gKGdyYXBoLCBlZGdlKSB7XG4gICAgICByZXR1cm4gZ2V0KGdyYXBoLmdldEVkZ2VBdHRyaWJ1dGVzKGVkZ2UpKTtcbiAgICB9O1xuICAgIGdldHRlci5mcm9tRW50cnkgPSBmdW5jdGlvbiAoZWRnZSwgYXR0cmlidXRlcykge1xuICAgICAgcmV0dXJuIGdldChhdHRyaWJ1dGVzKTtcbiAgICB9O1xuICAgIGdldHRlci5mcm9tUGFydGlhbEVudHJ5ID0gZ2V0dGVyLmZyb21FbnRyeTtcbiAgICBnZXR0ZXIuZnJvbU1pbmltYWxFbnRyeSA9IGdldHRlci5mcm9tRW50cnk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG5hbWVPckZ1bmN0aW9uID09PSAnZnVuY3Rpb24nKSB7XG4gICAgZ2V0dGVyLmZyb21BdHRyaWJ1dGVzID0gZnVuY3Rpb24gKCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnZ3JhcGhvbG9neS11dGlscy9nZXR0ZXJzL2NyZWF0ZUVkZ2VWYWx1ZUdldHRlcjogaXJyZWxldmFudCB1c2FnZS4nXG4gICAgICApO1xuICAgIH07XG4gICAgZ2V0dGVyLmZyb21HcmFwaCA9IGZ1bmN0aW9uIChncmFwaCwgZWRnZSkge1xuICAgICAgLy8gVE9ETzogd2UgY2FuIGRvIGJldHRlciwgY2hlY2sgIzMxMFxuICAgICAgdmFyIGV4dHJlbWl0aWVzID0gZ3JhcGguZXh0cmVtaXRpZXMoZWRnZSk7XG4gICAgICByZXR1cm4gY29lcmNlVG9EZWZhdWx0KFxuICAgICAgICBuYW1lT3JGdW5jdGlvbihcbiAgICAgICAgICBlZGdlLFxuICAgICAgICAgIGdyYXBoLmdldEVkZ2VBdHRyaWJ1dGVzKGVkZ2UpLFxuICAgICAgICAgIGV4dHJlbWl0aWVzWzBdLFxuICAgICAgICAgIGV4dHJlbWl0aWVzWzFdLFxuICAgICAgICAgIGdyYXBoLmdldE5vZGVBdHRyaWJ1dGVzKGV4dHJlbWl0aWVzWzBdKSxcbiAgICAgICAgICBncmFwaC5nZXROb2RlQXR0cmlidXRlcyhleHRyZW1pdGllc1sxXSksXG4gICAgICAgICAgZ3JhcGguaXNVbmRpcmVjdGVkKGVkZ2UpXG4gICAgICAgIClcbiAgICAgICk7XG4gICAgfTtcbiAgICBnZXR0ZXIuZnJvbUVudHJ5ID0gZnVuY3Rpb24gKGUsIGEsIHMsIHQsIHNhLCB0YSwgdSkge1xuICAgICAgcmV0dXJuIGNvZXJjZVRvRGVmYXVsdChuYW1lT3JGdW5jdGlvbihlLCBhLCBzLCB0LCBzYSwgdGEsIHUpKTtcbiAgICB9O1xuICAgIGdldHRlci5mcm9tUGFydGlhbEVudHJ5ID0gZnVuY3Rpb24gKGUsIGEsIHMsIHQpIHtcbiAgICAgIHJldHVybiBjb2VyY2VUb0RlZmF1bHQobmFtZU9yRnVuY3Rpb24oZSwgYSwgcywgdCkpO1xuICAgIH07XG4gICAgZ2V0dGVyLmZyb21NaW5pbWFsRW50cnkgPSBmdW5jdGlvbiAoZSwgYSkge1xuICAgICAgcmV0dXJuIGNvZXJjZVRvRGVmYXVsdChuYW1lT3JGdW5jdGlvbihlLCBhKSk7XG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBnZXR0ZXIuZnJvbUF0dHJpYnV0ZXMgPSByZXR1cm5EZWZhdWx0O1xuICAgIGdldHRlci5mcm9tR3JhcGggPSByZXR1cm5EZWZhdWx0O1xuICAgIGdldHRlci5mcm9tRW50cnkgPSByZXR1cm5EZWZhdWx0O1xuICAgIGdldHRlci5mcm9tTWluaW1hbEVudHJ5ID0gcmV0dXJuRGVmYXVsdDtcbiAgfVxuXG4gIHJldHVybiBnZXR0ZXI7XG59XG5cbmV4cG9ydHMuY3JlYXRlTm9kZVZhbHVlR2V0dGVyID0gY3JlYXRlTm9kZVZhbHVlR2V0dGVyO1xuZXhwb3J0cy5jcmVhdGVFZGdlVmFsdWVHZXR0ZXIgPSBjcmVhdGVFZGdlVmFsdWVHZXR0ZXI7XG5leHBvcnRzLmNyZWF0ZUVkZ2VXZWlnaHRHZXR0ZXIgPSBmdW5jdGlvbiAobmFtZSkge1xuICByZXR1cm4gY3JlYXRlRWRnZVZhbHVlR2V0dGVyKG5hbWUsIGNvZXJjZVdlaWdodCk7XG59O1xuIiwiLyoqXG4gKiBHcmFwaG9sb2d5IGlzR3JhcGhcbiAqID09PT09PT09PT09PT09PT09PT1cbiAqXG4gKiBWZXJ5IHNpbXBsZSBmdW5jdGlvbiBhaW1pbmcgYXQgZW5zdXJpbmcgdGhlIGdpdmVuIHZhcmlhYmxlIGlzIGFcbiAqIGdyYXBob2xvZ3kgaW5zdGFuY2UuXG4gKi9cblxuLyoqXG4gKiBDaGVja2luZyB0aGUgdmFsdWUgaXMgYSBncmFwaG9sb2d5IGluc3RhbmNlLlxuICpcbiAqIEBwYXJhbSAge2FueX0gICAgIHZhbHVlIC0gVGFyZ2V0IHZhbHVlLlxuICogQHJldHVybiB7Ym9vbGVhbn1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0dyYXBoKHZhbHVlKSB7XG4gIHJldHVybiAoXG4gICAgdmFsdWUgIT09IG51bGwgJiZcbiAgICB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmXG4gICAgdHlwZW9mIHZhbHVlLmFkZFVuZGlyZWN0ZWRFZGdlV2l0aEtleSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIHR5cGVvZiB2YWx1ZS5kcm9wTm9kZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIHR5cGVvZiB2YWx1ZS5tdWx0aSA9PT0gJ2Jvb2xlYW4nXG4gICk7XG59O1xuIiwiIWZ1bmN0aW9uKHQsZSl7XCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBtb2R1bGU/bW9kdWxlLmV4cG9ydHM9ZSgpOlwiZnVuY3Rpb25cIj09dHlwZW9mIGRlZmluZSYmZGVmaW5lLmFtZD9kZWZpbmUoZSk6KHQ9XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbFRoaXM/Z2xvYmFsVGhpczp0fHxzZWxmKS5ncmFwaG9sb2d5PWUoKX0odGhpcywoZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiB0KGUpe3JldHVybiB0PVwiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmXCJzeW1ib2xcIj09dHlwZW9mIFN5bWJvbC5pdGVyYXRvcj9mdW5jdGlvbih0KXtyZXR1cm4gdHlwZW9mIHR9OmZ1bmN0aW9uKHQpe3JldHVybiB0JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiBTeW1ib2wmJnQuY29uc3RydWN0b3I9PT1TeW1ib2wmJnQhPT1TeW1ib2wucHJvdG90eXBlP1wic3ltYm9sXCI6dHlwZW9mIHR9LHQoZSl9ZnVuY3Rpb24gZSh0LGUpe3QucHJvdG90eXBlPU9iamVjdC5jcmVhdGUoZS5wcm90b3R5cGUpLHQucHJvdG90eXBlLmNvbnN0cnVjdG9yPXQscih0LGUpfWZ1bmN0aW9uIG4odCl7cmV0dXJuIG49T2JqZWN0LnNldFByb3RvdHlwZU9mP09iamVjdC5nZXRQcm90b3R5cGVPZjpmdW5jdGlvbih0KXtyZXR1cm4gdC5fX3Byb3RvX198fE9iamVjdC5nZXRQcm90b3R5cGVPZih0KX0sbih0KX1mdW5jdGlvbiByKHQsZSl7cmV0dXJuIHI9T2JqZWN0LnNldFByb3RvdHlwZU9mfHxmdW5jdGlvbih0LGUpe3JldHVybiB0Ll9fcHJvdG9fXz1lLHR9LHIodCxlKX1mdW5jdGlvbiBpKCl7aWYoXCJ1bmRlZmluZWRcIj09dHlwZW9mIFJlZmxlY3R8fCFSZWZsZWN0LmNvbnN0cnVjdClyZXR1cm4hMTtpZihSZWZsZWN0LmNvbnN0cnVjdC5zaGFtKXJldHVybiExO2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIFByb3h5KXJldHVybiEwO3RyeXtyZXR1cm4gQm9vbGVhbi5wcm90b3R5cGUudmFsdWVPZi5jYWxsKFJlZmxlY3QuY29uc3RydWN0KEJvb2xlYW4sW10sKGZ1bmN0aW9uKCl7fSkpKSwhMH1jYXRjaCh0KXtyZXR1cm4hMX19ZnVuY3Rpb24gbyh0LGUsbil7cmV0dXJuIG89aSgpP1JlZmxlY3QuY29uc3RydWN0OmZ1bmN0aW9uKHQsZSxuKXt2YXIgaT1bbnVsbF07aS5wdXNoLmFwcGx5KGksZSk7dmFyIG89bmV3KEZ1bmN0aW9uLmJpbmQuYXBwbHkodCxpKSk7cmV0dXJuIG4mJnIobyxuLnByb3RvdHlwZSksb30sby5hcHBseShudWxsLGFyZ3VtZW50cyl9ZnVuY3Rpb24gYSh0KXt2YXIgZT1cImZ1bmN0aW9uXCI9PXR5cGVvZiBNYXA/bmV3IE1hcDp2b2lkIDA7cmV0dXJuIGE9ZnVuY3Rpb24odCl7aWYobnVsbD09PXR8fChpPXQsLTE9PT1GdW5jdGlvbi50b1N0cmluZy5jYWxsKGkpLmluZGV4T2YoXCJbbmF0aXZlIGNvZGVdXCIpKSlyZXR1cm4gdDt2YXIgaTtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiB0KXRocm93IG5ldyBUeXBlRXJyb3IoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvblwiKTtpZih2b2lkIDAhPT1lKXtpZihlLmhhcyh0KSlyZXR1cm4gZS5nZXQodCk7ZS5zZXQodCxhKX1mdW5jdGlvbiBhKCl7cmV0dXJuIG8odCxhcmd1bWVudHMsbih0aGlzKS5jb25zdHJ1Y3Rvcil9cmV0dXJuIGEucHJvdG90eXBlPU9iamVjdC5jcmVhdGUodC5wcm90b3R5cGUse2NvbnN0cnVjdG9yOnt2YWx1ZTphLGVudW1lcmFibGU6ITEsd3JpdGFibGU6ITAsY29uZmlndXJhYmxlOiEwfX0pLHIoYSx0KX0sYSh0KX1mdW5jdGlvbiB1KHQpe2lmKHZvaWQgMD09PXQpdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwidGhpcyBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCAtIHN1cGVyKCkgaGFzbid0IGJlZW4gY2FsbGVkXCIpO3JldHVybiB0fXZhciBjPWZ1bmN0aW9uKCl7Zm9yKHZhciB0PWFyZ3VtZW50c1swXSxlPTEsbj1hcmd1bWVudHMubGVuZ3RoO2U8bjtlKyspaWYoYXJndW1lbnRzW2VdKWZvcih2YXIgciBpbiBhcmd1bWVudHNbZV0pdFtyXT1hcmd1bWVudHNbZV1bcl07cmV0dXJuIHR9O2Z1bmN0aW9uIHModCxlLG4scil7dmFyIGk9dC5fbm9kZXMuZ2V0KGUpLG89bnVsbDtyZXR1cm4gaT9vPVwibWl4ZWRcIj09PXI/aS5vdXQmJmkub3V0W25dfHxpLnVuZGlyZWN0ZWQmJmkudW5kaXJlY3RlZFtuXTpcImRpcmVjdGVkXCI9PT1yP2kub3V0JiZpLm91dFtuXTppLnVuZGlyZWN0ZWQmJmkudW5kaXJlY3RlZFtuXTpvfWZ1bmN0aW9uIGQoZSl7cmV0dXJuIG51bGwhPT1lJiZcIm9iamVjdFwiPT09dChlKSYmXCJmdW5jdGlvblwiPT10eXBlb2YgZS5hZGRVbmRpcmVjdGVkRWRnZVdpdGhLZXkmJlwiZnVuY3Rpb25cIj09dHlwZW9mIGUuZHJvcE5vZGV9ZnVuY3Rpb24gaChlKXtyZXR1cm5cIm9iamVjdFwiPT09dChlKSYmbnVsbCE9PWUmJmUuY29uc3RydWN0b3I9PT1PYmplY3R9ZnVuY3Rpb24gcCh0KXt2YXIgZTtmb3IoZSBpbiB0KXJldHVybiExO3JldHVybiEwfWZ1bmN0aW9uIGYodCxlLG4pe09iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LGUse2VudW1lcmFibGU6ITEsY29uZmlndXJhYmxlOiExLHdyaXRhYmxlOiEwLHZhbHVlOm59KX1mdW5jdGlvbiBsKHQsZSxuKXt2YXIgcj17ZW51bWVyYWJsZTohMCxjb25maWd1cmFibGU6ITB9O1wiZnVuY3Rpb25cIj09dHlwZW9mIG4/ci5nZXQ9bjooci52YWx1ZT1uLHIud3JpdGFibGU9ITEpLE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0LGUscil9ZnVuY3Rpb24gZyh0KXtyZXR1cm4hIWgodCkmJiEodC5hdHRyaWJ1dGVzJiYhQXJyYXkuaXNBcnJheSh0LmF0dHJpYnV0ZXMpKX1cImZ1bmN0aW9uXCI9PXR5cGVvZiBPYmplY3QuYXNzaWduJiYoYz1PYmplY3QuYXNzaWduKTt2YXIgeSx3PXtleHBvcnRzOnt9fSx2PVwib2JqZWN0XCI9PXR5cGVvZiBSZWZsZWN0P1JlZmxlY3Q6bnVsbCxiPXYmJlwiZnVuY3Rpb25cIj09dHlwZW9mIHYuYXBwbHk/di5hcHBseTpmdW5jdGlvbih0LGUsbil7cmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKHQsZSxuKX07eT12JiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB2Lm93bktleXM/di5vd25LZXlzOk9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHM/ZnVuY3Rpb24odCl7cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHQpLmNvbmNhdChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHQpKX06ZnVuY3Rpb24odCl7cmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHQpfTt2YXIgbT1OdW1iZXIuaXNOYU58fGZ1bmN0aW9uKHQpe3JldHVybiB0IT10fTtmdW5jdGlvbiBrKCl7ay5pbml0LmNhbGwodGhpcyl9dy5leHBvcnRzPWssdy5leHBvcnRzLm9uY2U9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbmV3IFByb21pc2UoKGZ1bmN0aW9uKG4scil7ZnVuY3Rpb24gaShuKXt0LnJlbW92ZUxpc3RlbmVyKGUsbykscihuKX1mdW5jdGlvbiBvKCl7XCJmdW5jdGlvblwiPT10eXBlb2YgdC5yZW1vdmVMaXN0ZW5lciYmdC5yZW1vdmVMaXN0ZW5lcihcImVycm9yXCIsaSksbihbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpfU4odCxlLG8se29uY2U6ITB9KSxcImVycm9yXCIhPT1lJiZmdW5jdGlvbih0LGUsbil7XCJmdW5jdGlvblwiPT10eXBlb2YgdC5vbiYmTih0LFwiZXJyb3JcIixlLG4pfSh0LGkse29uY2U6ITB9KX0pKX0say5FdmVudEVtaXR0ZXI9ayxrLnByb3RvdHlwZS5fZXZlbnRzPXZvaWQgMCxrLnByb3RvdHlwZS5fZXZlbnRzQ291bnQ9MCxrLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzPXZvaWQgMDt2YXIgXz0xMDtmdW5jdGlvbiBHKHQpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHQpdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIG9mIHR5cGUgRnVuY3Rpb24uIFJlY2VpdmVkIHR5cGUgJyt0eXBlb2YgdCl9ZnVuY3Rpb24geCh0KXtyZXR1cm4gdm9pZCAwPT09dC5fbWF4TGlzdGVuZXJzP2suZGVmYXVsdE1heExpc3RlbmVyczp0Ll9tYXhMaXN0ZW5lcnN9ZnVuY3Rpb24gRSh0LGUsbixyKXt2YXIgaSxvLGEsdTtpZihHKG4pLHZvaWQgMD09PShvPXQuX2V2ZW50cyk/KG89dC5fZXZlbnRzPU9iamVjdC5jcmVhdGUobnVsbCksdC5fZXZlbnRzQ291bnQ9MCk6KHZvaWQgMCE9PW8ubmV3TGlzdGVuZXImJih0LmVtaXQoXCJuZXdMaXN0ZW5lclwiLGUsbi5saXN0ZW5lcj9uLmxpc3RlbmVyOm4pLG89dC5fZXZlbnRzKSxhPW9bZV0pLHZvaWQgMD09PWEpYT1vW2VdPW4sKyt0Ll9ldmVudHNDb3VudDtlbHNlIGlmKFwiZnVuY3Rpb25cIj09dHlwZW9mIGE/YT1vW2VdPXI/W24sYV06W2Esbl06cj9hLnVuc2hpZnQobik6YS5wdXNoKG4pLChpPXgodCkpPjAmJmEubGVuZ3RoPmkmJiFhLndhcm5lZCl7YS53YXJuZWQ9ITA7dmFyIGM9bmV3IEVycm9yKFwiUG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSBsZWFrIGRldGVjdGVkLiBcIithLmxlbmd0aCtcIiBcIitTdHJpbmcoZSkrXCIgbGlzdGVuZXJzIGFkZGVkLiBVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdFwiKTtjLm5hbWU9XCJNYXhMaXN0ZW5lcnNFeGNlZWRlZFdhcm5pbmdcIixjLmVtaXR0ZXI9dCxjLnR5cGU9ZSxjLmNvdW50PWEubGVuZ3RoLHU9Yyxjb25zb2xlJiZjb25zb2xlLndhcm4mJmNvbnNvbGUud2Fybih1KX1yZXR1cm4gdH1mdW5jdGlvbiBBKCl7aWYoIXRoaXMuZmlyZWQpcmV0dXJuIHRoaXMudGFyZ2V0LnJlbW92ZUxpc3RlbmVyKHRoaXMudHlwZSx0aGlzLndyYXBGbiksdGhpcy5maXJlZD0hMCwwPT09YXJndW1lbnRzLmxlbmd0aD90aGlzLmxpc3RlbmVyLmNhbGwodGhpcy50YXJnZXQpOnRoaXMubGlzdGVuZXIuYXBwbHkodGhpcy50YXJnZXQsYXJndW1lbnRzKX1mdW5jdGlvbiBTKHQsZSxuKXt2YXIgcj17ZmlyZWQ6ITEsd3JhcEZuOnZvaWQgMCx0YXJnZXQ6dCx0eXBlOmUsbGlzdGVuZXI6bn0saT1BLmJpbmQocik7cmV0dXJuIGkubGlzdGVuZXI9bixyLndyYXBGbj1pLGl9ZnVuY3Rpb24gRCh0LGUsbil7dmFyIHI9dC5fZXZlbnRzO2lmKHZvaWQgMD09PXIpcmV0dXJuW107dmFyIGk9cltlXTtyZXR1cm4gdm9pZCAwPT09aT9bXTpcImZ1bmN0aW9uXCI9PXR5cGVvZiBpP24/W2kubGlzdGVuZXJ8fGldOltpXTpuP2Z1bmN0aW9uKHQpe2Zvcih2YXIgZT1uZXcgQXJyYXkodC5sZW5ndGgpLG49MDtuPGUubGVuZ3RoOysrbillW25dPXRbbl0ubGlzdGVuZXJ8fHRbbl07cmV0dXJuIGV9KGkpOlUoaSxpLmxlbmd0aCl9ZnVuY3Rpb24gTCh0KXt2YXIgZT10aGlzLl9ldmVudHM7aWYodm9pZCAwIT09ZSl7dmFyIG49ZVt0XTtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBuKXJldHVybiAxO2lmKHZvaWQgMCE9PW4pcmV0dXJuIG4ubGVuZ3RofXJldHVybiAwfWZ1bmN0aW9uIFUodCxlKXtmb3IodmFyIG49bmV3IEFycmF5KGUpLHI9MDtyPGU7KytyKW5bcl09dFtyXTtyZXR1cm4gbn1mdW5jdGlvbiBOKHQsZSxuLHIpe2lmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHQub24pci5vbmNlP3Qub25jZShlLG4pOnQub24oZSxuKTtlbHNle2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHQuYWRkRXZlbnRMaXN0ZW5lcil0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJlbWl0dGVyXCIgYXJndW1lbnQgbXVzdCBiZSBvZiB0eXBlIEV2ZW50RW1pdHRlci4gUmVjZWl2ZWQgdHlwZSAnK3R5cGVvZiB0KTt0LmFkZEV2ZW50TGlzdGVuZXIoZSwoZnVuY3Rpb24gaShvKXtyLm9uY2UmJnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihlLGkpLG4obyl9KSl9fWZ1bmN0aW9uIGoodCl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdCl0aHJvdyBuZXcgRXJyb3IoXCJvYmxpdGVyYXRvci9pdGVyYXRvcjogZXhwZWN0aW5nIGEgZnVuY3Rpb24hXCIpO3RoaXMubmV4dD10fU9iamVjdC5kZWZpbmVQcm9wZXJ0eShrLFwiZGVmYXVsdE1heExpc3RlbmVyc1wiLHtlbnVtZXJhYmxlOiEwLGdldDpmdW5jdGlvbigpe3JldHVybiBffSxzZXQ6ZnVuY3Rpb24odCl7aWYoXCJudW1iZXJcIiE9dHlwZW9mIHR8fHQ8MHx8bSh0KSl0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIHZhbHVlIG9mIFwiZGVmYXVsdE1heExpc3RlbmVyc1wiIGlzIG91dCBvZiByYW5nZS4gSXQgbXVzdCBiZSBhIG5vbi1uZWdhdGl2ZSBudW1iZXIuIFJlY2VpdmVkICcrdCtcIi5cIik7Xz10fX0pLGsuaW5pdD1mdW5jdGlvbigpe3ZvaWQgMCE9PXRoaXMuX2V2ZW50cyYmdGhpcy5fZXZlbnRzIT09T2JqZWN0LmdldFByb3RvdHlwZU9mKHRoaXMpLl9ldmVudHN8fCh0aGlzLl9ldmVudHM9T2JqZWN0LmNyZWF0ZShudWxsKSx0aGlzLl9ldmVudHNDb3VudD0wKSx0aGlzLl9tYXhMaXN0ZW5lcnM9dGhpcy5fbWF4TGlzdGVuZXJzfHx2b2lkIDB9LGsucHJvdG90eXBlLnNldE1heExpc3RlbmVycz1mdW5jdGlvbih0KXtpZihcIm51bWJlclwiIT10eXBlb2YgdHx8dDwwfHxtKHQpKXRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgdmFsdWUgb2YgXCJuXCIgaXMgb3V0IG9mIHJhbmdlLiBJdCBtdXN0IGJlIGEgbm9uLW5lZ2F0aXZlIG51bWJlci4gUmVjZWl2ZWQgJyt0K1wiLlwiKTtyZXR1cm4gdGhpcy5fbWF4TGlzdGVuZXJzPXQsdGhpc30say5wcm90b3R5cGUuZ2V0TWF4TGlzdGVuZXJzPWZ1bmN0aW9uKCl7cmV0dXJuIHgodGhpcyl9LGsucHJvdG90eXBlLmVtaXQ9ZnVuY3Rpb24odCl7Zm9yKHZhciBlPVtdLG49MTtuPGFyZ3VtZW50cy5sZW5ndGg7bisrKWUucHVzaChhcmd1bWVudHNbbl0pO3ZhciByPVwiZXJyb3JcIj09PXQsaT10aGlzLl9ldmVudHM7aWYodm9pZCAwIT09aSlyPXImJnZvaWQgMD09PWkuZXJyb3I7ZWxzZSBpZighcilyZXR1cm4hMTtpZihyKXt2YXIgbztpZihlLmxlbmd0aD4wJiYobz1lWzBdKSxvIGluc3RhbmNlb2YgRXJyb3IpdGhyb3cgbzt2YXIgYT1uZXcgRXJyb3IoXCJVbmhhbmRsZWQgZXJyb3IuXCIrKG8/XCIgKFwiK28ubWVzc2FnZStcIilcIjpcIlwiKSk7dGhyb3cgYS5jb250ZXh0PW8sYX12YXIgdT1pW3RdO2lmKHZvaWQgMD09PXUpcmV0dXJuITE7aWYoXCJmdW5jdGlvblwiPT10eXBlb2YgdSliKHUsdGhpcyxlKTtlbHNle3ZhciBjPXUubGVuZ3RoLHM9VSh1LGMpO2ZvcihuPTA7bjxjOysrbiliKHNbbl0sdGhpcyxlKX1yZXR1cm4hMH0say5wcm90b3R5cGUuYWRkTGlzdGVuZXI9ZnVuY3Rpb24odCxlKXtyZXR1cm4gRSh0aGlzLHQsZSwhMSl9LGsucHJvdG90eXBlLm9uPWsucHJvdG90eXBlLmFkZExpc3RlbmVyLGsucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lcj1mdW5jdGlvbih0LGUpe3JldHVybiBFKHRoaXMsdCxlLCEwKX0say5wcm90b3R5cGUub25jZT1mdW5jdGlvbih0LGUpe3JldHVybiBHKGUpLHRoaXMub24odCxTKHRoaXMsdCxlKSksdGhpc30say5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lcj1mdW5jdGlvbih0LGUpe3JldHVybiBHKGUpLHRoaXMucHJlcGVuZExpc3RlbmVyKHQsUyh0aGlzLHQsZSkpLHRoaXN9LGsucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyPWZ1bmN0aW9uKHQsZSl7dmFyIG4scixpLG8sYTtpZihHKGUpLHZvaWQgMD09PShyPXRoaXMuX2V2ZW50cykpcmV0dXJuIHRoaXM7aWYodm9pZCAwPT09KG49clt0XSkpcmV0dXJuIHRoaXM7aWYobj09PWV8fG4ubGlzdGVuZXI9PT1lKTA9PS0tdGhpcy5fZXZlbnRzQ291bnQ/dGhpcy5fZXZlbnRzPU9iamVjdC5jcmVhdGUobnVsbCk6KGRlbGV0ZSByW3RdLHIucmVtb3ZlTGlzdGVuZXImJnRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsdCxuLmxpc3RlbmVyfHxlKSk7ZWxzZSBpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiBuKXtmb3IoaT0tMSxvPW4ubGVuZ3RoLTE7bz49MDtvLS0paWYobltvXT09PWV8fG5bb10ubGlzdGVuZXI9PT1lKXthPW5bb10ubGlzdGVuZXIsaT1vO2JyZWFrfWlmKGk8MClyZXR1cm4gdGhpczswPT09aT9uLnNoaWZ0KCk6ZnVuY3Rpb24odCxlKXtmb3IoO2UrMTx0Lmxlbmd0aDtlKyspdFtlXT10W2UrMV07dC5wb3AoKX0obixpKSwxPT09bi5sZW5ndGgmJihyW3RdPW5bMF0pLHZvaWQgMCE9PXIucmVtb3ZlTGlzdGVuZXImJnRoaXMuZW1pdChcInJlbW92ZUxpc3RlbmVyXCIsdCxhfHxlKX1yZXR1cm4gdGhpc30say5wcm90b3R5cGUub2ZmPWsucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyLGsucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycz1mdW5jdGlvbih0KXt2YXIgZSxuLHI7aWYodm9pZCAwPT09KG49dGhpcy5fZXZlbnRzKSlyZXR1cm4gdGhpcztpZih2b2lkIDA9PT1uLnJlbW92ZUxpc3RlbmVyKXJldHVybiAwPT09YXJndW1lbnRzLmxlbmd0aD8odGhpcy5fZXZlbnRzPU9iamVjdC5jcmVhdGUobnVsbCksdGhpcy5fZXZlbnRzQ291bnQ9MCk6dm9pZCAwIT09blt0XSYmKDA9PS0tdGhpcy5fZXZlbnRzQ291bnQ/dGhpcy5fZXZlbnRzPU9iamVjdC5jcmVhdGUobnVsbCk6ZGVsZXRlIG5bdF0pLHRoaXM7aWYoMD09PWFyZ3VtZW50cy5sZW5ndGgpe3ZhciBpLG89T2JqZWN0LmtleXMobik7Zm9yKHI9MDtyPG8ubGVuZ3RoOysrcilcInJlbW92ZUxpc3RlbmVyXCIhPT0oaT1vW3JdKSYmdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoaSk7cmV0dXJuIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKFwicmVtb3ZlTGlzdGVuZXJcIiksdGhpcy5fZXZlbnRzPU9iamVjdC5jcmVhdGUobnVsbCksdGhpcy5fZXZlbnRzQ291bnQ9MCx0aGlzfWlmKFwiZnVuY3Rpb25cIj09dHlwZW9mKGU9blt0XSkpdGhpcy5yZW1vdmVMaXN0ZW5lcih0LGUpO2Vsc2UgaWYodm9pZCAwIT09ZSlmb3Iocj1lLmxlbmd0aC0xO3I+PTA7ci0tKXRoaXMucmVtb3ZlTGlzdGVuZXIodCxlW3JdKTtyZXR1cm4gdGhpc30say5wcm90b3R5cGUubGlzdGVuZXJzPWZ1bmN0aW9uKHQpe3JldHVybiBEKHRoaXMsdCwhMCl9LGsucHJvdG90eXBlLnJhd0xpc3RlbmVycz1mdW5jdGlvbih0KXtyZXR1cm4gRCh0aGlzLHQsITEpfSxrLmxpc3RlbmVyQ291bnQ9ZnVuY3Rpb24odCxlKXtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0Lmxpc3RlbmVyQ291bnQ/dC5saXN0ZW5lckNvdW50KGUpOkwuY2FsbCh0LGUpfSxrLnByb3RvdHlwZS5saXN0ZW5lckNvdW50PUwsay5wcm90b3R5cGUuZXZlbnROYW1lcz1mdW5jdGlvbigpe3JldHVybiB0aGlzLl9ldmVudHNDb3VudD4wP3kodGhpcy5fZXZlbnRzKTpbXX0sXCJ1bmRlZmluZWRcIiE9dHlwZW9mIFN5bWJvbCYmKGoucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl09ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30pLGoub2Y9ZnVuY3Rpb24oKXt2YXIgdD1hcmd1bWVudHMsZT10Lmxlbmd0aCxuPTA7cmV0dXJuIG5ldyBqKChmdW5jdGlvbigpe3JldHVybiBuPj1lP3tkb25lOiEwfTp7ZG9uZTohMSx2YWx1ZTp0W24rK119fSkpfSxqLmVtcHR5PWZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBqKChmdW5jdGlvbigpe3JldHVybntkb25lOiEwfX0pKX0sai5mcm9tU2VxdWVuY2U9ZnVuY3Rpb24odCl7dmFyIGU9MCxuPXQubGVuZ3RoO3JldHVybiBuZXcgaigoZnVuY3Rpb24oKXtyZXR1cm4gZT49bj97ZG9uZTohMH06e2RvbmU6ITEsdmFsdWU6dFtlKytdfX0pKX0sai5pcz1mdW5jdGlvbih0KXtyZXR1cm4gdCBpbnN0YW5jZW9mIGp8fFwib2JqZWN0XCI9PXR5cGVvZiB0JiZudWxsIT09dCYmXCJmdW5jdGlvblwiPT10eXBlb2YgdC5uZXh0fTt2YXIgTz1qLEM9e307Qy5BUlJBWV9CVUZGRVJfU1VQUE9SVD1cInVuZGVmaW5lZFwiIT10eXBlb2YgQXJyYXlCdWZmZXIsQy5TWU1CT0xfU1VQUE9SVD1cInVuZGVmaW5lZFwiIT10eXBlb2YgU3ltYm9sO3ZhciB6PU8sTT1DLFc9TS5BUlJBWV9CVUZGRVJfU1VQUE9SVCxQPU0uU1lNQk9MX1NVUFBPUlQ7dmFyIFI9ZnVuY3Rpb24odCl7dmFyIGU9ZnVuY3Rpb24odCl7cmV0dXJuXCJzdHJpbmdcIj09dHlwZW9mIHR8fEFycmF5LmlzQXJyYXkodCl8fFcmJkFycmF5QnVmZmVyLmlzVmlldyh0KT96LmZyb21TZXF1ZW5jZSh0KTpcIm9iamVjdFwiIT10eXBlb2YgdHx8bnVsbD09PXQ/bnVsbDpQJiZcImZ1bmN0aW9uXCI9PXR5cGVvZiB0W1N5bWJvbC5pdGVyYXRvcl0/dFtTeW1ib2wuaXRlcmF0b3JdKCk6XCJmdW5jdGlvblwiPT10eXBlb2YgdC5uZXh0P3Q6bnVsbH0odCk7aWYoIWUpdGhyb3cgbmV3IEVycm9yKFwib2JsaXRlcmF0b3I6IHRhcmdldCBpcyBub3QgaXRlcmFibGUgbm9yIGEgdmFsaWQgaXRlcmF0b3IuXCIpO3JldHVybiBlfSxLPVIsVD1mdW5jdGlvbih0LGUpe2Zvcih2YXIgbixyPWFyZ3VtZW50cy5sZW5ndGg+MT9lOjEvMCxpPXIhPT0xLzA/bmV3IEFycmF5KHIpOltdLG89MCxhPUsodCk7Oyl7aWYobz09PXIpcmV0dXJuIGk7aWYoKG49YS5uZXh0KCkpLmRvbmUpcmV0dXJuIG8hPT1lJiYoaS5sZW5ndGg9byksaTtpW28rK109bi52YWx1ZX19LEI9ZnVuY3Rpb24odCl7ZnVuY3Rpb24gbihlKXt2YXIgbjtyZXR1cm4obj10LmNhbGwodGhpcyl8fHRoaXMpLm5hbWU9XCJHcmFwaEVycm9yXCIsbi5tZXNzYWdlPWUsbn1yZXR1cm4gZShuLHQpLG59KGEoRXJyb3IpKSxGPWZ1bmN0aW9uKHQpe2Z1bmN0aW9uIG4oZSl7dmFyIHI7cmV0dXJuKHI9dC5jYWxsKHRoaXMsZSl8fHRoaXMpLm5hbWU9XCJJbnZhbGlkQXJndW1lbnRzR3JhcGhFcnJvclwiLFwiZnVuY3Rpb25cIj09dHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlJiZFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh1KHIpLG4ucHJvdG90eXBlLmNvbnN0cnVjdG9yKSxyfXJldHVybiBlKG4sdCksbn0oQiksST1mdW5jdGlvbih0KXtmdW5jdGlvbiBuKGUpe3ZhciByO3JldHVybihyPXQuY2FsbCh0aGlzLGUpfHx0aGlzKS5uYW1lPVwiTm90Rm91bmRHcmFwaEVycm9yXCIsXCJmdW5jdGlvblwiPT10eXBlb2YgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UmJkVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHUociksbi5wcm90b3R5cGUuY29uc3RydWN0b3IpLHJ9cmV0dXJuIGUobix0KSxufShCKSxZPWZ1bmN0aW9uKHQpe2Z1bmN0aW9uIG4oZSl7dmFyIHI7cmV0dXJuKHI9dC5jYWxsKHRoaXMsZSl8fHRoaXMpLm5hbWU9XCJVc2FnZUdyYXBoRXJyb3JcIixcImZ1bmN0aW9uXCI9PXR5cGVvZiBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSYmRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodShyKSxuLnByb3RvdHlwZS5jb25zdHJ1Y3Rvcikscn1yZXR1cm4gZShuLHQpLG59KEIpO2Z1bmN0aW9uIHEodCxlKXt0aGlzLmtleT10LHRoaXMuYXR0cmlidXRlcz1lLHRoaXMuY2xlYXIoKX1mdW5jdGlvbiBKKHQsZSl7dGhpcy5rZXk9dCx0aGlzLmF0dHJpYnV0ZXM9ZSx0aGlzLmNsZWFyKCl9ZnVuY3Rpb24gVih0LGUpe3RoaXMua2V5PXQsdGhpcy5hdHRyaWJ1dGVzPWUsdGhpcy5jbGVhcigpfWZ1bmN0aW9uIEgodCxlLG4scixpKXt0aGlzLmtleT1lLHRoaXMuYXR0cmlidXRlcz1pLHRoaXMudW5kaXJlY3RlZD10LHRoaXMuc291cmNlPW4sdGhpcy50YXJnZXQ9cn1xLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3RoaXMuaW5EZWdyZWU9MCx0aGlzLm91dERlZ3JlZT0wLHRoaXMudW5kaXJlY3RlZERlZ3JlZT0wLHRoaXMuaW49e30sdGhpcy5vdXQ9e30sdGhpcy51bmRpcmVjdGVkPXt9fSxKLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbigpe3RoaXMuaW5EZWdyZWU9MCx0aGlzLm91dERlZ3JlZT0wLHRoaXMuaW49e30sdGhpcy5vdXQ9e319LFYucHJvdG90eXBlLmNsZWFyPWZ1bmN0aW9uKCl7dGhpcy51bmRpcmVjdGVkRGVncmVlPTAsdGhpcy51bmRpcmVjdGVkPXt9fSxILnByb3RvdHlwZS5hdHRhY2g9ZnVuY3Rpb24oKXt2YXIgdD1cIm91dFwiLGU9XCJpblwiO3RoaXMudW5kaXJlY3RlZCYmKHQ9ZT1cInVuZGlyZWN0ZWRcIik7dmFyIG49dGhpcy5zb3VyY2Uua2V5LHI9dGhpcy50YXJnZXQua2V5O3RoaXMuc291cmNlW3RdW3JdPXRoaXMsdGhpcy51bmRpcmVjdGVkJiZuPT09cnx8KHRoaXMudGFyZ2V0W2VdW25dPXRoaXMpfSxILnByb3RvdHlwZS5hdHRhY2hNdWx0aT1mdW5jdGlvbigpe3ZhciB0PVwib3V0XCIsZT1cImluXCIsbj10aGlzLnNvdXJjZS5rZXkscj10aGlzLnRhcmdldC5rZXk7dGhpcy51bmRpcmVjdGVkJiYodD1lPVwidW5kaXJlY3RlZFwiKTt2YXIgaT10aGlzLnNvdXJjZVt0XSxvPWlbcl07aWYodm9pZCAwPT09bylyZXR1cm4gaVtyXT10aGlzLHZvaWQodGhpcy51bmRpcmVjdGVkJiZuPT09cnx8KHRoaXMudGFyZ2V0W2VdW25dPXRoaXMpKTtvLnByZXZpb3VzPXRoaXMsdGhpcy5uZXh0PW8saVtyXT10aGlzLHRoaXMudGFyZ2V0W2VdW25dPXRoaXN9LEgucHJvdG90eXBlLmRldGFjaD1mdW5jdGlvbigpe3ZhciB0PXRoaXMuc291cmNlLmtleSxlPXRoaXMudGFyZ2V0LmtleSxuPVwib3V0XCIscj1cImluXCI7dGhpcy51bmRpcmVjdGVkJiYobj1yPVwidW5kaXJlY3RlZFwiKSxkZWxldGUgdGhpcy5zb3VyY2Vbbl1bZV0sZGVsZXRlIHRoaXMudGFyZ2V0W3JdW3RdfSxILnByb3RvdHlwZS5kZXRhY2hNdWx0aT1mdW5jdGlvbigpe3ZhciB0PXRoaXMuc291cmNlLmtleSxlPXRoaXMudGFyZ2V0LmtleSxuPVwib3V0XCIscj1cImluXCI7dGhpcy51bmRpcmVjdGVkJiYobj1yPVwidW5kaXJlY3RlZFwiKSx2b2lkIDA9PT10aGlzLnByZXZpb3VzP3ZvaWQgMD09PXRoaXMubmV4dD8oZGVsZXRlIHRoaXMuc291cmNlW25dW2VdLGRlbGV0ZSB0aGlzLnRhcmdldFtyXVt0XSk6KHRoaXMubmV4dC5wcmV2aW91cz12b2lkIDAsdGhpcy5zb3VyY2Vbbl1bZV09dGhpcy5uZXh0LHRoaXMudGFyZ2V0W3JdW3RdPXRoaXMubmV4dCk6KHRoaXMucHJldmlvdXMubmV4dD10aGlzLm5leHQsdm9pZCAwIT09dGhpcy5uZXh0JiYodGhpcy5uZXh0LnByZXZpb3VzPXRoaXMucHJldmlvdXMpKX07ZnVuY3Rpb24gUSh0LGUsbixyLGksbyxhKXt2YXIgdSxjLHMsZDtpZihyPVwiXCIrciwwPT09bil7aWYoISh1PXQuX25vZGVzLmdldChyKSkpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQociwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3M9aSxkPW99ZWxzZSBpZigzPT09bil7aWYoaT1cIlwiK2ksIShjPXQuX2VkZ2VzLmdldChpKSkpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQoaSwnXCIgZWRnZSBpbiB0aGUgZ3JhcGguJykpO3ZhciBoPWMuc291cmNlLmtleSxwPWMudGFyZ2V0LmtleTtpZihyPT09aCl1PWMudGFyZ2V0O2Vsc2V7aWYociE9PXApdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiB0aGUgXCInKS5jb25jYXQociwnXCIgbm9kZSBpcyBub3QgYXR0YWNoZWQgdG8gdGhlIFwiJykuY29uY2F0KGksJ1wiIGVkZ2UgKCcpLmNvbmNhdChoLFwiLCBcIikuY29uY2F0KHAsXCIpLlwiKSk7dT1jLnNvdXJjZX1zPW8sZD1hfWVsc2V7aWYoIShjPXQuX2VkZ2VzLmdldChyKSkpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQociwnXCIgZWRnZSBpbiB0aGUgZ3JhcGguJykpO3U9MT09PW4/Yy5zb3VyY2U6Yy50YXJnZXQscz1pLGQ9b31yZXR1cm5bdSxzLGRdfXZhciBYPVt7bmFtZTpmdW5jdGlvbih0KXtyZXR1cm5cImdldFwiLmNvbmNhdCh0LFwiQXR0cmlidXRlXCIpfSxhdHRhY2hlcjpmdW5jdGlvbih0LGUsbil7dC5wcm90b3R5cGVbZV09ZnVuY3Rpb24odCxyLGkpe3ZhciBvPVEodGhpcyxlLG4sdCxyLGkpLGE9b1swXSx1PW9bMV07cmV0dXJuIGEuYXR0cmlidXRlc1t1XX19fSx7bmFtZTpmdW5jdGlvbih0KXtyZXR1cm5cImdldFwiLmNvbmNhdCh0LFwiQXR0cmlidXRlc1wiKX0sYXR0YWNoZXI6ZnVuY3Rpb24odCxlLG4pe3QucHJvdG90eXBlW2VdPWZ1bmN0aW9uKHQscil7cmV0dXJuIFEodGhpcyxlLG4sdCxyKVswXS5hdHRyaWJ1dGVzfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwiaGFzXCIuY29uY2F0KHQsXCJBdHRyaWJ1dGVcIil9LGF0dGFjaGVyOmZ1bmN0aW9uKHQsZSxuKXt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbih0LHIsaSl7dmFyIG89USh0aGlzLGUsbix0LHIsaSksYT1vWzBdLHU9b1sxXTtyZXR1cm4gYS5hdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KHUpfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwic2V0XCIuY29uY2F0KHQsXCJBdHRyaWJ1dGVcIil9LGF0dGFjaGVyOmZ1bmN0aW9uKHQsZSxuKXt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbih0LHIsaSxvKXt2YXIgYT1RKHRoaXMsZSxuLHQscixpLG8pLHU9YVswXSxjPWFbMV0scz1hWzJdO3JldHVybiB1LmF0dHJpYnV0ZXNbY109cyx0aGlzLmVtaXQoXCJub2RlQXR0cmlidXRlc1VwZGF0ZWRcIix7a2V5OnUua2V5LHR5cGU6XCJzZXRcIixhdHRyaWJ1dGVzOnUuYXR0cmlidXRlcyxuYW1lOmN9KSx0aGlzfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwidXBkYXRlXCIuY29uY2F0KHQsXCJBdHRyaWJ1dGVcIil9LGF0dGFjaGVyOmZ1bmN0aW9uKHQsZSxuKXt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbih0LHIsaSxvKXt2YXIgYT1RKHRoaXMsZSxuLHQscixpLG8pLHU9YVswXSxjPWFbMV0scz1hWzJdO2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHMpdGhyb3cgbmV3IEYoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogdXBkYXRlciBzaG91bGQgYmUgYSBmdW5jdGlvbi5cIikpO3ZhciBkPXUuYXR0cmlidXRlcyxoPXMoZFtjXSk7cmV0dXJuIGRbY109aCx0aGlzLmVtaXQoXCJub2RlQXR0cmlidXRlc1VwZGF0ZWRcIix7a2V5OnUua2V5LHR5cGU6XCJzZXRcIixhdHRyaWJ1dGVzOnUuYXR0cmlidXRlcyxuYW1lOmN9KSx0aGlzfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwicmVtb3ZlXCIuY29uY2F0KHQsXCJBdHRyaWJ1dGVcIil9LGF0dGFjaGVyOmZ1bmN0aW9uKHQsZSxuKXt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbih0LHIsaSl7dmFyIG89USh0aGlzLGUsbix0LHIsaSksYT1vWzBdLHU9b1sxXTtyZXR1cm4gZGVsZXRlIGEuYXR0cmlidXRlc1t1XSx0aGlzLmVtaXQoXCJub2RlQXR0cmlidXRlc1VwZGF0ZWRcIix7a2V5OmEua2V5LHR5cGU6XCJyZW1vdmVcIixhdHRyaWJ1dGVzOmEuYXR0cmlidXRlcyxuYW1lOnV9KSx0aGlzfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwicmVwbGFjZVwiLmNvbmNhdCh0LFwiQXR0cmlidXRlc1wiKX0sYXR0YWNoZXI6ZnVuY3Rpb24odCxlLG4pe3QucHJvdG90eXBlW2VdPWZ1bmN0aW9uKHQscixpKXt2YXIgbz1RKHRoaXMsZSxuLHQscixpKSxhPW9bMF0sdT1vWzFdO2lmKCFoKHUpKXRocm93IG5ldyBGKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IHByb3ZpZGVkIGF0dHJpYnV0ZXMgYXJlIG5vdCBhIHBsYWluIG9iamVjdC5cIikpO3JldHVybiBhLmF0dHJpYnV0ZXM9dSx0aGlzLmVtaXQoXCJub2RlQXR0cmlidXRlc1VwZGF0ZWRcIix7a2V5OmEua2V5LHR5cGU6XCJyZXBsYWNlXCIsYXR0cmlidXRlczphLmF0dHJpYnV0ZXN9KSx0aGlzfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwibWVyZ2VcIi5jb25jYXQodCxcIkF0dHJpYnV0ZXNcIil9LGF0dGFjaGVyOmZ1bmN0aW9uKHQsZSxuKXt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbih0LHIsaSl7dmFyIG89USh0aGlzLGUsbix0LHIsaSksYT1vWzBdLHU9b1sxXTtpZighaCh1KSl0aHJvdyBuZXcgRihcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiBwcm92aWRlZCBhdHRyaWJ1dGVzIGFyZSBub3QgYSBwbGFpbiBvYmplY3QuXCIpKTtyZXR1cm4gYyhhLmF0dHJpYnV0ZXMsdSksdGhpcy5lbWl0KFwibm9kZUF0dHJpYnV0ZXNVcGRhdGVkXCIse2tleTphLmtleSx0eXBlOlwibWVyZ2VcIixhdHRyaWJ1dGVzOmEuYXR0cmlidXRlcyxkYXRhOnV9KSx0aGlzfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwidXBkYXRlXCIuY29uY2F0KHQsXCJBdHRyaWJ1dGVzXCIpfSxhdHRhY2hlcjpmdW5jdGlvbih0LGUsbil7dC5wcm90b3R5cGVbZV09ZnVuY3Rpb24odCxyLGkpe3ZhciBvPVEodGhpcyxlLG4sdCxyLGkpLGE9b1swXSx1PW9bMV07aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdSl0aHJvdyBuZXcgRihcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiBwcm92aWRlZCB1cGRhdGVyIGlzIG5vdCBhIGZ1bmN0aW9uLlwiKSk7cmV0dXJuIGEuYXR0cmlidXRlcz11KGEuYXR0cmlidXRlcyksdGhpcy5lbWl0KFwibm9kZUF0dHJpYnV0ZXNVcGRhdGVkXCIse2tleTphLmtleSx0eXBlOlwidXBkYXRlXCIsYXR0cmlidXRlczphLmF0dHJpYnV0ZXN9KSx0aGlzfX19XTt2YXIgWj1be25hbWU6ZnVuY3Rpb24odCl7cmV0dXJuXCJnZXRcIi5jb25jYXQodCxcIkF0dHJpYnV0ZVwiKX0sYXR0YWNoZXI6ZnVuY3Rpb24odCxlLG4pe3QucHJvdG90eXBlW2VdPWZ1bmN0aW9uKHQscil7dmFyIGk7aWYoXCJtaXhlZFwiIT09dGhpcy50eXBlJiZcIm1peGVkXCIhPT1uJiZuIT09dGhpcy50eXBlKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCBmaW5kIHRoaXMgdHlwZSBvZiBlZGdlcyBpbiB5b3VyIFwiKS5jb25jYXQodGhpcy50eXBlLFwiIGdyYXBoLlwiKSk7aWYoYXJndW1lbnRzLmxlbmd0aD4yKXtpZih0aGlzLm11bHRpKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCB1c2UgYSB7c291cmNlLHRhcmdldH0gY29tYm8gd2hlbiBhc2tpbmcgYWJvdXQgYW4gZWRnZSdzIGF0dHJpYnV0ZXMgaW4gYSBNdWx0aUdyYXBoIHNpbmNlIHdlIGNhbm5vdCBpbmZlciB0aGUgb25lIHlvdSB3YW50IGluZm9ybWF0aW9uIGFib3V0LlwiKSk7dmFyIG89XCJcIit0LGE9XCJcIityO2lmKHI9YXJndW1lbnRzWzJdLCEoaT1zKHRoaXMsbyxhLG4pKSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChlLCc6IGNvdWxkIG5vdCBmaW5kIGFuIGVkZ2UgZm9yIHRoZSBnaXZlbiBwYXRoIChcIicpLmNvbmNhdChvLCdcIiAtIFwiJykuY29uY2F0KGEsJ1wiKS4nKSl9ZWxzZXtpZihcIm1peGVkXCIhPT1uKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbGxpbmcgdGhpcyBtZXRob2Qgd2l0aCBvbmx5IGEga2V5ICh2cy4gYSBzb3VyY2UgYW5kIHRhcmdldCkgZG9lcyBub3QgbWFrZSBzZW5zZSBzaW5jZSBhbiBlZGdlIHdpdGggdGhpcyBrZXkgY291bGQgaGF2ZSB0aGUgb3RoZXIgdHlwZS5cIikpO2lmKHQ9XCJcIit0LCEoaT10aGlzLl9lZGdlcy5nZXQodCkpKXRocm93IG5ldyBJKFwiR3JhcGguXCIuY29uY2F0KGUsJzogY291bGQgbm90IGZpbmQgdGhlIFwiJykuY29uY2F0KHQsJ1wiIGVkZ2UgaW4gdGhlIGdyYXBoLicpKX1yZXR1cm4gaS5hdHRyaWJ1dGVzW3JdfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwiZ2V0XCIuY29uY2F0KHQsXCJBdHRyaWJ1dGVzXCIpfSxhdHRhY2hlcjpmdW5jdGlvbih0LGUsbil7dC5wcm90b3R5cGVbZV09ZnVuY3Rpb24odCl7dmFyIHI7aWYoXCJtaXhlZFwiIT09dGhpcy50eXBlJiZcIm1peGVkXCIhPT1uJiZuIT09dGhpcy50eXBlKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCBmaW5kIHRoaXMgdHlwZSBvZiBlZGdlcyBpbiB5b3VyIFwiKS5jb25jYXQodGhpcy50eXBlLFwiIGdyYXBoLlwiKSk7aWYoYXJndW1lbnRzLmxlbmd0aD4xKXtpZih0aGlzLm11bHRpKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCB1c2UgYSB7c291cmNlLHRhcmdldH0gY29tYm8gd2hlbiBhc2tpbmcgYWJvdXQgYW4gZWRnZSdzIGF0dHJpYnV0ZXMgaW4gYSBNdWx0aUdyYXBoIHNpbmNlIHdlIGNhbm5vdCBpbmZlciB0aGUgb25lIHlvdSB3YW50IGluZm9ybWF0aW9uIGFib3V0LlwiKSk7dmFyIGk9XCJcIit0LG89XCJcIithcmd1bWVudHNbMV07aWYoIShyPXModGhpcyxpLG8sbikpKXRocm93IG5ldyBJKFwiR3JhcGguXCIuY29uY2F0KGUsJzogY291bGQgbm90IGZpbmQgYW4gZWRnZSBmb3IgdGhlIGdpdmVuIHBhdGggKFwiJykuY29uY2F0KGksJ1wiIC0gXCInKS5jb25jYXQobywnXCIpLicpKX1lbHNle2lmKFwibWl4ZWRcIiE9PW4pdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogY2FsbGluZyB0aGlzIG1ldGhvZCB3aXRoIG9ubHkgYSBrZXkgKHZzLiBhIHNvdXJjZSBhbmQgdGFyZ2V0KSBkb2VzIG5vdCBtYWtlIHNlbnNlIHNpbmNlIGFuIGVkZ2Ugd2l0aCB0aGlzIGtleSBjb3VsZCBoYXZlIHRoZSBvdGhlciB0eXBlLlwiKSk7aWYodD1cIlwiK3QsIShyPXRoaXMuX2VkZ2VzLmdldCh0KSkpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQodCwnXCIgZWRnZSBpbiB0aGUgZ3JhcGguJykpfXJldHVybiByLmF0dHJpYnV0ZXN9fX0se25hbWU6ZnVuY3Rpb24odCl7cmV0dXJuXCJoYXNcIi5jb25jYXQodCxcIkF0dHJpYnV0ZVwiKX0sYXR0YWNoZXI6ZnVuY3Rpb24odCxlLG4pe3QucHJvdG90eXBlW2VdPWZ1bmN0aW9uKHQscil7dmFyIGk7aWYoXCJtaXhlZFwiIT09dGhpcy50eXBlJiZcIm1peGVkXCIhPT1uJiZuIT09dGhpcy50eXBlKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCBmaW5kIHRoaXMgdHlwZSBvZiBlZGdlcyBpbiB5b3VyIFwiKS5jb25jYXQodGhpcy50eXBlLFwiIGdyYXBoLlwiKSk7aWYoYXJndW1lbnRzLmxlbmd0aD4yKXtpZih0aGlzLm11bHRpKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCB1c2UgYSB7c291cmNlLHRhcmdldH0gY29tYm8gd2hlbiBhc2tpbmcgYWJvdXQgYW4gZWRnZSdzIGF0dHJpYnV0ZXMgaW4gYSBNdWx0aUdyYXBoIHNpbmNlIHdlIGNhbm5vdCBpbmZlciB0aGUgb25lIHlvdSB3YW50IGluZm9ybWF0aW9uIGFib3V0LlwiKSk7dmFyIG89XCJcIit0LGE9XCJcIityO2lmKHI9YXJndW1lbnRzWzJdLCEoaT1zKHRoaXMsbyxhLG4pKSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChlLCc6IGNvdWxkIG5vdCBmaW5kIGFuIGVkZ2UgZm9yIHRoZSBnaXZlbiBwYXRoIChcIicpLmNvbmNhdChvLCdcIiAtIFwiJykuY29uY2F0KGEsJ1wiKS4nKSl9ZWxzZXtpZihcIm1peGVkXCIhPT1uKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbGxpbmcgdGhpcyBtZXRob2Qgd2l0aCBvbmx5IGEga2V5ICh2cy4gYSBzb3VyY2UgYW5kIHRhcmdldCkgZG9lcyBub3QgbWFrZSBzZW5zZSBzaW5jZSBhbiBlZGdlIHdpdGggdGhpcyBrZXkgY291bGQgaGF2ZSB0aGUgb3RoZXIgdHlwZS5cIikpO2lmKHQ9XCJcIit0LCEoaT10aGlzLl9lZGdlcy5nZXQodCkpKXRocm93IG5ldyBJKFwiR3JhcGguXCIuY29uY2F0KGUsJzogY291bGQgbm90IGZpbmQgdGhlIFwiJykuY29uY2F0KHQsJ1wiIGVkZ2UgaW4gdGhlIGdyYXBoLicpKX1yZXR1cm4gaS5hdHRyaWJ1dGVzLmhhc093blByb3BlcnR5KHIpfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwic2V0XCIuY29uY2F0KHQsXCJBdHRyaWJ1dGVcIil9LGF0dGFjaGVyOmZ1bmN0aW9uKHQsZSxuKXt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbih0LHIsaSl7dmFyIG87aWYoXCJtaXhlZFwiIT09dGhpcy50eXBlJiZcIm1peGVkXCIhPT1uJiZuIT09dGhpcy50eXBlKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCBmaW5kIHRoaXMgdHlwZSBvZiBlZGdlcyBpbiB5b3VyIFwiKS5jb25jYXQodGhpcy50eXBlLFwiIGdyYXBoLlwiKSk7aWYoYXJndW1lbnRzLmxlbmd0aD4zKXtpZih0aGlzLm11bHRpKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCB1c2UgYSB7c291cmNlLHRhcmdldH0gY29tYm8gd2hlbiBhc2tpbmcgYWJvdXQgYW4gZWRnZSdzIGF0dHJpYnV0ZXMgaW4gYSBNdWx0aUdyYXBoIHNpbmNlIHdlIGNhbm5vdCBpbmZlciB0aGUgb25lIHlvdSB3YW50IGluZm9ybWF0aW9uIGFib3V0LlwiKSk7dmFyIGE9XCJcIit0LHU9XCJcIityO2lmKHI9YXJndW1lbnRzWzJdLGk9YXJndW1lbnRzWzNdLCEobz1zKHRoaXMsYSx1LG4pKSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChlLCc6IGNvdWxkIG5vdCBmaW5kIGFuIGVkZ2UgZm9yIHRoZSBnaXZlbiBwYXRoIChcIicpLmNvbmNhdChhLCdcIiAtIFwiJykuY29uY2F0KHUsJ1wiKS4nKSl9ZWxzZXtpZihcIm1peGVkXCIhPT1uKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbGxpbmcgdGhpcyBtZXRob2Qgd2l0aCBvbmx5IGEga2V5ICh2cy4gYSBzb3VyY2UgYW5kIHRhcmdldCkgZG9lcyBub3QgbWFrZSBzZW5zZSBzaW5jZSBhbiBlZGdlIHdpdGggdGhpcyBrZXkgY291bGQgaGF2ZSB0aGUgb3RoZXIgdHlwZS5cIikpO2lmKHQ9XCJcIit0LCEobz10aGlzLl9lZGdlcy5nZXQodCkpKXRocm93IG5ldyBJKFwiR3JhcGguXCIuY29uY2F0KGUsJzogY291bGQgbm90IGZpbmQgdGhlIFwiJykuY29uY2F0KHQsJ1wiIGVkZ2UgaW4gdGhlIGdyYXBoLicpKX1yZXR1cm4gby5hdHRyaWJ1dGVzW3JdPWksdGhpcy5lbWl0KFwiZWRnZUF0dHJpYnV0ZXNVcGRhdGVkXCIse2tleTpvLmtleSx0eXBlOlwic2V0XCIsYXR0cmlidXRlczpvLmF0dHJpYnV0ZXMsbmFtZTpyfSksdGhpc319fSx7bmFtZTpmdW5jdGlvbih0KXtyZXR1cm5cInVwZGF0ZVwiLmNvbmNhdCh0LFwiQXR0cmlidXRlXCIpfSxhdHRhY2hlcjpmdW5jdGlvbih0LGUsbil7dC5wcm90b3R5cGVbZV09ZnVuY3Rpb24odCxyLGkpe3ZhciBvO2lmKFwibWl4ZWRcIiE9PXRoaXMudHlwZSYmXCJtaXhlZFwiIT09biYmbiE9PXRoaXMudHlwZSl0aHJvdyBuZXcgWShcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiBjYW5ub3QgZmluZCB0aGlzIHR5cGUgb2YgZWRnZXMgaW4geW91ciBcIikuY29uY2F0KHRoaXMudHlwZSxcIiBncmFwaC5cIikpO2lmKGFyZ3VtZW50cy5sZW5ndGg+Myl7aWYodGhpcy5tdWx0aSl0aHJvdyBuZXcgWShcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiBjYW5ub3QgdXNlIGEge3NvdXJjZSx0YXJnZXR9IGNvbWJvIHdoZW4gYXNraW5nIGFib3V0IGFuIGVkZ2UncyBhdHRyaWJ1dGVzIGluIGEgTXVsdGlHcmFwaCBzaW5jZSB3ZSBjYW5ub3QgaW5mZXIgdGhlIG9uZSB5b3Ugd2FudCBpbmZvcm1hdGlvbiBhYm91dC5cIikpO3ZhciBhPVwiXCIrdCx1PVwiXCIrcjtpZihyPWFyZ3VtZW50c1syXSxpPWFyZ3VtZW50c1szXSwhKG89cyh0aGlzLGEsdSxuKSkpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiBjb3VsZCBub3QgZmluZCBhbiBlZGdlIGZvciB0aGUgZ2l2ZW4gcGF0aCAoXCInKS5jb25jYXQoYSwnXCIgLSBcIicpLmNvbmNhdCh1LCdcIikuJykpfWVsc2V7aWYoXCJtaXhlZFwiIT09bil0aHJvdyBuZXcgWShcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiBjYWxsaW5nIHRoaXMgbWV0aG9kIHdpdGggb25seSBhIGtleSAodnMuIGEgc291cmNlIGFuZCB0YXJnZXQpIGRvZXMgbm90IG1ha2Ugc2Vuc2Ugc2luY2UgYW4gZWRnZSB3aXRoIHRoaXMga2V5IGNvdWxkIGhhdmUgdGhlIG90aGVyIHR5cGUuXCIpKTtpZih0PVwiXCIrdCwhKG89dGhpcy5fZWRnZXMuZ2V0KHQpKSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChlLCc6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicpLmNvbmNhdCh0LCdcIiBlZGdlIGluIHRoZSBncmFwaC4nKSl9aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgaSl0aHJvdyBuZXcgRihcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiB1cGRhdGVyIHNob3VsZCBiZSBhIGZ1bmN0aW9uLlwiKSk7cmV0dXJuIG8uYXR0cmlidXRlc1tyXT1pKG8uYXR0cmlidXRlc1tyXSksdGhpcy5lbWl0KFwiZWRnZUF0dHJpYnV0ZXNVcGRhdGVkXCIse2tleTpvLmtleSx0eXBlOlwic2V0XCIsYXR0cmlidXRlczpvLmF0dHJpYnV0ZXMsbmFtZTpyfSksdGhpc319fSx7bmFtZTpmdW5jdGlvbih0KXtyZXR1cm5cInJlbW92ZVwiLmNvbmNhdCh0LFwiQXR0cmlidXRlXCIpfSxhdHRhY2hlcjpmdW5jdGlvbih0LGUsbil7dC5wcm90b3R5cGVbZV09ZnVuY3Rpb24odCxyKXt2YXIgaTtpZihcIm1peGVkXCIhPT10aGlzLnR5cGUmJlwibWl4ZWRcIiE9PW4mJm4hPT10aGlzLnR5cGUpdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogY2Fubm90IGZpbmQgdGhpcyB0eXBlIG9mIGVkZ2VzIGluIHlvdXIgXCIpLmNvbmNhdCh0aGlzLnR5cGUsXCIgZ3JhcGguXCIpKTtpZihhcmd1bWVudHMubGVuZ3RoPjIpe2lmKHRoaXMubXVsdGkpdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogY2Fubm90IHVzZSBhIHtzb3VyY2UsdGFyZ2V0fSBjb21ibyB3aGVuIGFza2luZyBhYm91dCBhbiBlZGdlJ3MgYXR0cmlidXRlcyBpbiBhIE11bHRpR3JhcGggc2luY2Ugd2UgY2Fubm90IGluZmVyIHRoZSBvbmUgeW91IHdhbnQgaW5mb3JtYXRpb24gYWJvdXQuXCIpKTt2YXIgbz1cIlwiK3QsYT1cIlwiK3I7aWYocj1hcmd1bWVudHNbMl0sIShpPXModGhpcyxvLGEsbikpKXRocm93IG5ldyBJKFwiR3JhcGguXCIuY29uY2F0KGUsJzogY291bGQgbm90IGZpbmQgYW4gZWRnZSBmb3IgdGhlIGdpdmVuIHBhdGggKFwiJykuY29uY2F0KG8sJ1wiIC0gXCInKS5jb25jYXQoYSwnXCIpLicpKX1lbHNle2lmKFwibWl4ZWRcIiE9PW4pdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogY2FsbGluZyB0aGlzIG1ldGhvZCB3aXRoIG9ubHkgYSBrZXkgKHZzLiBhIHNvdXJjZSBhbmQgdGFyZ2V0KSBkb2VzIG5vdCBtYWtlIHNlbnNlIHNpbmNlIGFuIGVkZ2Ugd2l0aCB0aGlzIGtleSBjb3VsZCBoYXZlIHRoZSBvdGhlciB0eXBlLlwiKSk7aWYodD1cIlwiK3QsIShpPXRoaXMuX2VkZ2VzLmdldCh0KSkpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQodCwnXCIgZWRnZSBpbiB0aGUgZ3JhcGguJykpfXJldHVybiBkZWxldGUgaS5hdHRyaWJ1dGVzW3JdLHRoaXMuZW1pdChcImVkZ2VBdHRyaWJ1dGVzVXBkYXRlZFwiLHtrZXk6aS5rZXksdHlwZTpcInJlbW92ZVwiLGF0dHJpYnV0ZXM6aS5hdHRyaWJ1dGVzLG5hbWU6cn0pLHRoaXN9fX0se25hbWU6ZnVuY3Rpb24odCl7cmV0dXJuXCJyZXBsYWNlXCIuY29uY2F0KHQsXCJBdHRyaWJ1dGVzXCIpfSxhdHRhY2hlcjpmdW5jdGlvbih0LGUsbil7dC5wcm90b3R5cGVbZV09ZnVuY3Rpb24odCxyKXt2YXIgaTtpZihcIm1peGVkXCIhPT10aGlzLnR5cGUmJlwibWl4ZWRcIiE9PW4mJm4hPT10aGlzLnR5cGUpdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogY2Fubm90IGZpbmQgdGhpcyB0eXBlIG9mIGVkZ2VzIGluIHlvdXIgXCIpLmNvbmNhdCh0aGlzLnR5cGUsXCIgZ3JhcGguXCIpKTtpZihhcmd1bWVudHMubGVuZ3RoPjIpe2lmKHRoaXMubXVsdGkpdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogY2Fubm90IHVzZSBhIHtzb3VyY2UsdGFyZ2V0fSBjb21ibyB3aGVuIGFza2luZyBhYm91dCBhbiBlZGdlJ3MgYXR0cmlidXRlcyBpbiBhIE11bHRpR3JhcGggc2luY2Ugd2UgY2Fubm90IGluZmVyIHRoZSBvbmUgeW91IHdhbnQgaW5mb3JtYXRpb24gYWJvdXQuXCIpKTt2YXIgbz1cIlwiK3QsYT1cIlwiK3I7aWYocj1hcmd1bWVudHNbMl0sIShpPXModGhpcyxvLGEsbikpKXRocm93IG5ldyBJKFwiR3JhcGguXCIuY29uY2F0KGUsJzogY291bGQgbm90IGZpbmQgYW4gZWRnZSBmb3IgdGhlIGdpdmVuIHBhdGggKFwiJykuY29uY2F0KG8sJ1wiIC0gXCInKS5jb25jYXQoYSwnXCIpLicpKX1lbHNle2lmKFwibWl4ZWRcIiE9PW4pdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogY2FsbGluZyB0aGlzIG1ldGhvZCB3aXRoIG9ubHkgYSBrZXkgKHZzLiBhIHNvdXJjZSBhbmQgdGFyZ2V0KSBkb2VzIG5vdCBtYWtlIHNlbnNlIHNpbmNlIGFuIGVkZ2Ugd2l0aCB0aGlzIGtleSBjb3VsZCBoYXZlIHRoZSBvdGhlciB0eXBlLlwiKSk7aWYodD1cIlwiK3QsIShpPXRoaXMuX2VkZ2VzLmdldCh0KSkpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQodCwnXCIgZWRnZSBpbiB0aGUgZ3JhcGguJykpfWlmKCFoKHIpKXRocm93IG5ldyBGKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IHByb3ZpZGVkIGF0dHJpYnV0ZXMgYXJlIG5vdCBhIHBsYWluIG9iamVjdC5cIikpO3JldHVybiBpLmF0dHJpYnV0ZXM9cix0aGlzLmVtaXQoXCJlZGdlQXR0cmlidXRlc1VwZGF0ZWRcIix7a2V5Omkua2V5LHR5cGU6XCJyZXBsYWNlXCIsYXR0cmlidXRlczppLmF0dHJpYnV0ZXN9KSx0aGlzfX19LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwibWVyZ2VcIi5jb25jYXQodCxcIkF0dHJpYnV0ZXNcIil9LGF0dGFjaGVyOmZ1bmN0aW9uKHQsZSxuKXt0LnByb3RvdHlwZVtlXT1mdW5jdGlvbih0LHIpe3ZhciBpO2lmKFwibWl4ZWRcIiE9PXRoaXMudHlwZSYmXCJtaXhlZFwiIT09biYmbiE9PXRoaXMudHlwZSl0aHJvdyBuZXcgWShcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiBjYW5ub3QgZmluZCB0aGlzIHR5cGUgb2YgZWRnZXMgaW4geW91ciBcIikuY29uY2F0KHRoaXMudHlwZSxcIiBncmFwaC5cIikpO2lmKGFyZ3VtZW50cy5sZW5ndGg+Mil7aWYodGhpcy5tdWx0aSl0aHJvdyBuZXcgWShcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiBjYW5ub3QgdXNlIGEge3NvdXJjZSx0YXJnZXR9IGNvbWJvIHdoZW4gYXNraW5nIGFib3V0IGFuIGVkZ2UncyBhdHRyaWJ1dGVzIGluIGEgTXVsdGlHcmFwaCBzaW5jZSB3ZSBjYW5ub3QgaW5mZXIgdGhlIG9uZSB5b3Ugd2FudCBpbmZvcm1hdGlvbiBhYm91dC5cIikpO3ZhciBvPVwiXCIrdCxhPVwiXCIrcjtpZihyPWFyZ3VtZW50c1syXSwhKGk9cyh0aGlzLG8sYSxuKSkpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiBjb3VsZCBub3QgZmluZCBhbiBlZGdlIGZvciB0aGUgZ2l2ZW4gcGF0aCAoXCInKS5jb25jYXQobywnXCIgLSBcIicpLmNvbmNhdChhLCdcIikuJykpfWVsc2V7aWYoXCJtaXhlZFwiIT09bil0aHJvdyBuZXcgWShcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiBjYWxsaW5nIHRoaXMgbWV0aG9kIHdpdGggb25seSBhIGtleSAodnMuIGEgc291cmNlIGFuZCB0YXJnZXQpIGRvZXMgbm90IG1ha2Ugc2Vuc2Ugc2luY2UgYW4gZWRnZSB3aXRoIHRoaXMga2V5IGNvdWxkIGhhdmUgdGhlIG90aGVyIHR5cGUuXCIpKTtpZih0PVwiXCIrdCwhKGk9dGhpcy5fZWRnZXMuZ2V0KHQpKSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChlLCc6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicpLmNvbmNhdCh0LCdcIiBlZGdlIGluIHRoZSBncmFwaC4nKSl9aWYoIWgocikpdGhyb3cgbmV3IEYoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogcHJvdmlkZWQgYXR0cmlidXRlcyBhcmUgbm90IGEgcGxhaW4gb2JqZWN0LlwiKSk7cmV0dXJuIGMoaS5hdHRyaWJ1dGVzLHIpLHRoaXMuZW1pdChcImVkZ2VBdHRyaWJ1dGVzVXBkYXRlZFwiLHtrZXk6aS5rZXksdHlwZTpcIm1lcmdlXCIsYXR0cmlidXRlczppLmF0dHJpYnV0ZXMsZGF0YTpyfSksdGhpc319fSx7bmFtZTpmdW5jdGlvbih0KXtyZXR1cm5cInVwZGF0ZVwiLmNvbmNhdCh0LFwiQXR0cmlidXRlc1wiKX0sYXR0YWNoZXI6ZnVuY3Rpb24odCxlLG4pe3QucHJvdG90eXBlW2VdPWZ1bmN0aW9uKHQscil7dmFyIGk7aWYoXCJtaXhlZFwiIT09dGhpcy50eXBlJiZcIm1peGVkXCIhPT1uJiZuIT09dGhpcy50eXBlKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCBmaW5kIHRoaXMgdHlwZSBvZiBlZGdlcyBpbiB5b3VyIFwiKS5jb25jYXQodGhpcy50eXBlLFwiIGdyYXBoLlwiKSk7aWYoYXJndW1lbnRzLmxlbmd0aD4yKXtpZih0aGlzLm11bHRpKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbm5vdCB1c2UgYSB7c291cmNlLHRhcmdldH0gY29tYm8gd2hlbiBhc2tpbmcgYWJvdXQgYW4gZWRnZSdzIGF0dHJpYnV0ZXMgaW4gYSBNdWx0aUdyYXBoIHNpbmNlIHdlIGNhbm5vdCBpbmZlciB0aGUgb25lIHlvdSB3YW50IGluZm9ybWF0aW9uIGFib3V0LlwiKSk7dmFyIG89XCJcIit0LGE9XCJcIityO2lmKHI9YXJndW1lbnRzWzJdLCEoaT1zKHRoaXMsbyxhLG4pKSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChlLCc6IGNvdWxkIG5vdCBmaW5kIGFuIGVkZ2UgZm9yIHRoZSBnaXZlbiBwYXRoIChcIicpLmNvbmNhdChvLCdcIiAtIFwiJykuY29uY2F0KGEsJ1wiKS4nKSl9ZWxzZXtpZihcIm1peGVkXCIhPT1uKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IGNhbGxpbmcgdGhpcyBtZXRob2Qgd2l0aCBvbmx5IGEga2V5ICh2cy4gYSBzb3VyY2UgYW5kIHRhcmdldCkgZG9lcyBub3QgbWFrZSBzZW5zZSBzaW5jZSBhbiBlZGdlIHdpdGggdGhpcyBrZXkgY291bGQgaGF2ZSB0aGUgb3RoZXIgdHlwZS5cIikpO2lmKHQ9XCJcIit0LCEoaT10aGlzLl9lZGdlcy5nZXQodCkpKXRocm93IG5ldyBJKFwiR3JhcGguXCIuY29uY2F0KGUsJzogY291bGQgbm90IGZpbmQgdGhlIFwiJykuY29uY2F0KHQsJ1wiIGVkZ2UgaW4gdGhlIGdyYXBoLicpKX1pZihcImZ1bmN0aW9uXCIhPXR5cGVvZiByKXRocm93IG5ldyBGKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IHByb3ZpZGVkIHVwZGF0ZXIgaXMgbm90IGEgZnVuY3Rpb24uXCIpKTtyZXR1cm4gaS5hdHRyaWJ1dGVzPXIoaS5hdHRyaWJ1dGVzKSx0aGlzLmVtaXQoXCJlZGdlQXR0cmlidXRlc1VwZGF0ZWRcIix7a2V5Omkua2V5LHR5cGU6XCJ1cGRhdGVcIixhdHRyaWJ1dGVzOmkuYXR0cmlidXRlc30pLHRoaXN9fX1dO3ZhciAkPU8sdHQ9UixldD1mdW5jdGlvbigpe3ZhciB0PWFyZ3VtZW50cyxlPW51bGwsbj0tMTtyZXR1cm4gbmV3ICQoKGZ1bmN0aW9uKCl7Zm9yKHZhciByPW51bGw7Oyl7aWYobnVsbD09PWUpe2lmKCsrbj49dC5sZW5ndGgpcmV0dXJue2RvbmU6ITB9O2U9dHQodFtuXSl9aWYoITAhPT0ocj1lLm5leHQoKSkuZG9uZSlicmVhaztlPW51bGx9cmV0dXJuIHJ9KSl9LG50PVt7bmFtZTpcImVkZ2VzXCIsdHlwZTpcIm1peGVkXCJ9LHtuYW1lOlwiaW5FZGdlc1wiLHR5cGU6XCJkaXJlY3RlZFwiLGRpcmVjdGlvbjpcImluXCJ9LHtuYW1lOlwib3V0RWRnZXNcIix0eXBlOlwiZGlyZWN0ZWRcIixkaXJlY3Rpb246XCJvdXRcIn0se25hbWU6XCJpbmJvdW5kRWRnZXNcIix0eXBlOlwibWl4ZWRcIixkaXJlY3Rpb246XCJpblwifSx7bmFtZTpcIm91dGJvdW5kRWRnZXNcIix0eXBlOlwibWl4ZWRcIixkaXJlY3Rpb246XCJvdXRcIn0se25hbWU6XCJkaXJlY3RlZEVkZ2VzXCIsdHlwZTpcImRpcmVjdGVkXCJ9LHtuYW1lOlwidW5kaXJlY3RlZEVkZ2VzXCIsdHlwZTpcInVuZGlyZWN0ZWRcIn1dO2Z1bmN0aW9uIHJ0KHQsZSxuLHIpe3ZhciBpPSExO2Zvcih2YXIgbyBpbiBlKWlmKG8hPT1yKXt2YXIgYT1lW29dO2lmKGk9bihhLmtleSxhLmF0dHJpYnV0ZXMsYS5zb3VyY2Uua2V5LGEudGFyZ2V0LmtleSxhLnNvdXJjZS5hdHRyaWJ1dGVzLGEudGFyZ2V0LmF0dHJpYnV0ZXMsYS51bmRpcmVjdGVkKSx0JiZpKXJldHVybiBhLmtleX19ZnVuY3Rpb24gaXQodCxlLG4scil7dmFyIGksbyxhLHU9ITE7Zm9yKHZhciBjIGluIGUpaWYoYyE9PXIpe2k9ZVtjXTtkb3tpZihvPWkuc291cmNlLGE9aS50YXJnZXQsdT1uKGkua2V5LGkuYXR0cmlidXRlcyxvLmtleSxhLmtleSxvLmF0dHJpYnV0ZXMsYS5hdHRyaWJ1dGVzLGkudW5kaXJlY3RlZCksdCYmdSlyZXR1cm4gaS5rZXk7aT1pLm5leHR9d2hpbGUodm9pZCAwIT09aSl9fWZ1bmN0aW9uIG90KHQsZSl7dmFyIG4scj1PYmplY3Qua2V5cyh0KSxpPXIubGVuZ3RoLG89MDtyZXR1cm4gbmV3IE8oKGZ1bmN0aW9uKCl7ZG97aWYobiluPW4ubmV4dDtlbHNle2lmKG8+PWkpcmV0dXJue2RvbmU6ITB9O3ZhciBhPXJbbysrXTtpZihhPT09ZSl7bj12b2lkIDA7Y29udGludWV9bj10W2FdfX13aGlsZSghbik7cmV0dXJue2RvbmU6ITEsdmFsdWU6e2VkZ2U6bi5rZXksYXR0cmlidXRlczpuLmF0dHJpYnV0ZXMsc291cmNlOm4uc291cmNlLmtleSx0YXJnZXQ6bi50YXJnZXQua2V5LHNvdXJjZUF0dHJpYnV0ZXM6bi5zb3VyY2UuYXR0cmlidXRlcyx0YXJnZXRBdHRyaWJ1dGVzOm4udGFyZ2V0LmF0dHJpYnV0ZXMsdW5kaXJlY3RlZDpuLnVuZGlyZWN0ZWR9fX0pKX1mdW5jdGlvbiBhdCh0LGUsbixyKXt2YXIgaT1lW25dO2lmKGkpe3ZhciBvPWkuc291cmNlLGE9aS50YXJnZXQ7cmV0dXJuIHIoaS5rZXksaS5hdHRyaWJ1dGVzLG8ua2V5LGEua2V5LG8uYXR0cmlidXRlcyxhLmF0dHJpYnV0ZXMsaS51bmRpcmVjdGVkKSYmdD9pLmtleTp2b2lkIDB9fWZ1bmN0aW9uIHV0KHQsZSxuLHIpe3ZhciBpPWVbbl07aWYoaSl7dmFyIG89ITE7ZG97aWYobz1yKGkua2V5LGkuYXR0cmlidXRlcyxpLnNvdXJjZS5rZXksaS50YXJnZXQua2V5LGkuc291cmNlLmF0dHJpYnV0ZXMsaS50YXJnZXQuYXR0cmlidXRlcyxpLnVuZGlyZWN0ZWQpLHQmJm8pcmV0dXJuIGkua2V5O2k9aS5uZXh0fXdoaWxlKHZvaWQgMCE9PWkpfX1mdW5jdGlvbiBjdCh0LGUpe3ZhciBuPXRbZV07cmV0dXJuIHZvaWQgMCE9PW4ubmV4dD9uZXcgTygoZnVuY3Rpb24oKXtpZighbilyZXR1cm57ZG9uZTohMH07dmFyIHQ9e2VkZ2U6bi5rZXksYXR0cmlidXRlczpuLmF0dHJpYnV0ZXMsc291cmNlOm4uc291cmNlLmtleSx0YXJnZXQ6bi50YXJnZXQua2V5LHNvdXJjZUF0dHJpYnV0ZXM6bi5zb3VyY2UuYXR0cmlidXRlcyx0YXJnZXRBdHRyaWJ1dGVzOm4udGFyZ2V0LmF0dHJpYnV0ZXMsdW5kaXJlY3RlZDpuLnVuZGlyZWN0ZWR9O3JldHVybiBuPW4ubmV4dCx7ZG9uZTohMSx2YWx1ZTp0fX0pKTpPLm9mKHtlZGdlOm4ua2V5LGF0dHJpYnV0ZXM6bi5hdHRyaWJ1dGVzLHNvdXJjZTpuLnNvdXJjZS5rZXksdGFyZ2V0Om4udGFyZ2V0LmtleSxzb3VyY2VBdHRyaWJ1dGVzOm4uc291cmNlLmF0dHJpYnV0ZXMsdGFyZ2V0QXR0cmlidXRlczpuLnRhcmdldC5hdHRyaWJ1dGVzLHVuZGlyZWN0ZWQ6bi51bmRpcmVjdGVkfSl9ZnVuY3Rpb24gc3QodCxlKXtpZigwPT09dC5zaXplKXJldHVybltdO2lmKFwibWl4ZWRcIj09PWV8fGU9PT10LnR5cGUpcmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2YgQXJyYXkuZnJvbT9BcnJheS5mcm9tKHQuX2VkZ2VzLmtleXMoKSk6VCh0Ll9lZGdlcy5rZXlzKCksdC5fZWRnZXMuc2l6ZSk7Zm9yKHZhciBuLHIsaT1cInVuZGlyZWN0ZWRcIj09PWU/dC51bmRpcmVjdGVkU2l6ZTp0LmRpcmVjdGVkU2l6ZSxvPW5ldyBBcnJheShpKSxhPVwidW5kaXJlY3RlZFwiPT09ZSx1PXQuX2VkZ2VzLnZhbHVlcygpLGM9MDshMCE9PShuPXUubmV4dCgpKS5kb25lOykocj1uLnZhbHVlKS51bmRpcmVjdGVkPT09YSYmKG9bYysrXT1yLmtleSk7cmV0dXJuIG99ZnVuY3Rpb24gZHQodCxlLG4scil7aWYoMCE9PWUuc2l6ZSlmb3IodmFyIGksbyxhPVwibWl4ZWRcIiE9PW4mJm4hPT1lLnR5cGUsdT1cInVuZGlyZWN0ZWRcIj09PW4sYz0hMSxzPWUuX2VkZ2VzLnZhbHVlcygpOyEwIT09KGk9cy5uZXh0KCkpLmRvbmU7KWlmKG89aS52YWx1ZSwhYXx8by51bmRpcmVjdGVkPT09dSl7dmFyIGQ9byxoPWQua2V5LHA9ZC5hdHRyaWJ1dGVzLGY9ZC5zb3VyY2UsbD1kLnRhcmdldDtpZihjPXIoaCxwLGYua2V5LGwua2V5LGYuYXR0cmlidXRlcyxsLmF0dHJpYnV0ZXMsby51bmRpcmVjdGVkKSx0JiZjKXJldHVybiBofX1mdW5jdGlvbiBodCh0LGUpe2lmKDA9PT10LnNpemUpcmV0dXJuIE8uZW1wdHkoKTt2YXIgbj1cIm1peGVkXCIhPT1lJiZlIT09dC50eXBlLHI9XCJ1bmRpcmVjdGVkXCI9PT1lLGk9dC5fZWRnZXMudmFsdWVzKCk7cmV0dXJuIG5ldyBPKChmdW5jdGlvbigpe2Zvcih2YXIgdCxlOzspe2lmKCh0PWkubmV4dCgpKS5kb25lKXJldHVybiB0O2lmKGU9dC52YWx1ZSwhbnx8ZS51bmRpcmVjdGVkPT09cilicmVha31yZXR1cm57dmFsdWU6e2VkZ2U6ZS5rZXksYXR0cmlidXRlczplLmF0dHJpYnV0ZXMsc291cmNlOmUuc291cmNlLmtleSx0YXJnZXQ6ZS50YXJnZXQua2V5LHNvdXJjZUF0dHJpYnV0ZXM6ZS5zb3VyY2UuYXR0cmlidXRlcyx0YXJnZXRBdHRyaWJ1dGVzOmUudGFyZ2V0LmF0dHJpYnV0ZXMsdW5kaXJlY3RlZDplLnVuZGlyZWN0ZWR9LGRvbmU6ITF9fSkpfWZ1bmN0aW9uIHB0KHQsZSxuLHIsaSxvKXt2YXIgYSx1PWU/aXQ6cnQ7aWYoXCJ1bmRpcmVjdGVkXCIhPT1uKXtpZihcIm91dFwiIT09ciYmKGE9dSh0LGkuaW4sbyksdCYmYSkpcmV0dXJuIGE7aWYoXCJpblwiIT09ciYmKGE9dSh0LGkub3V0LG8scj92b2lkIDA6aS5rZXkpLHQmJmEpKXJldHVybiBhfWlmKFwiZGlyZWN0ZWRcIiE9PW4mJihhPXUodCxpLnVuZGlyZWN0ZWQsbyksdCYmYSkpcmV0dXJuIGF9ZnVuY3Rpb24gZnQodCxlLG4scil7dmFyIGk9W107cmV0dXJuIHB0KCExLHQsZSxuLHIsKGZ1bmN0aW9uKHQpe2kucHVzaCh0KX0pKSxpfWZ1bmN0aW9uIGx0KHQsZSxuKXt2YXIgcj1PLmVtcHR5KCk7cmV0dXJuXCJ1bmRpcmVjdGVkXCIhPT10JiYoXCJvdXRcIiE9PWUmJnZvaWQgMCE9PW4uaW4mJihyPWV0KHIsb3Qobi5pbikpKSxcImluXCIhPT1lJiZ2b2lkIDAhPT1uLm91dCYmKHI9ZXQocixvdChuLm91dCxlP3ZvaWQgMDpuLmtleSkpKSksXCJkaXJlY3RlZFwiIT09dCYmdm9pZCAwIT09bi51bmRpcmVjdGVkJiYocj1ldChyLG90KG4udW5kaXJlY3RlZCkpKSxyfWZ1bmN0aW9uIGd0KHQsZSxuLHIsaSxvLGEpe3ZhciB1LGM9bj91dDphdDtpZihcInVuZGlyZWN0ZWRcIiE9PWUpe2lmKHZvaWQgMCE9PWkuaW4mJlwib3V0XCIhPT1yJiYodT1jKHQsaS5pbixvLGEpLHQmJnUpKXJldHVybiB1O2lmKHZvaWQgMCE9PWkub3V0JiZcImluXCIhPT1yJiYocnx8aS5rZXkhPT1vKSYmKHU9Yyh0LGkub3V0LG8sYSksdCYmdSkpcmV0dXJuIHV9aWYoXCJkaXJlY3RlZFwiIT09ZSYmdm9pZCAwIT09aS51bmRpcmVjdGVkJiYodT1jKHQsaS51bmRpcmVjdGVkLG8sYSksdCYmdSkpcmV0dXJuIHV9ZnVuY3Rpb24geXQodCxlLG4scixpKXt2YXIgbz1bXTtyZXR1cm4gZ3QoITEsdCxlLG4scixpLChmdW5jdGlvbih0KXtvLnB1c2godCl9KSksb31mdW5jdGlvbiB3dCh0LGUsbixyKXt2YXIgaT1PLmVtcHR5KCk7cmV0dXJuXCJ1bmRpcmVjdGVkXCIhPT10JiYodm9pZCAwIT09bi5pbiYmXCJvdXRcIiE9PWUmJnIgaW4gbi5pbiYmKGk9ZXQoaSxjdChuLmluLHIpKSksdm9pZCAwIT09bi5vdXQmJlwiaW5cIiE9PWUmJnIgaW4gbi5vdXQmJihlfHxuLmtleSE9PXIpJiYoaT1ldChpLGN0KG4ub3V0LHIpKSkpLFwiZGlyZWN0ZWRcIiE9PXQmJnZvaWQgMCE9PW4udW5kaXJlY3RlZCYmciBpbiBuLnVuZGlyZWN0ZWQmJihpPWV0KGksY3Qobi51bmRpcmVjdGVkLHIpKSksaX12YXIgdnQ9W3tuYW1lOlwibmVpZ2hib3JzXCIsdHlwZTpcIm1peGVkXCJ9LHtuYW1lOlwiaW5OZWlnaGJvcnNcIix0eXBlOlwiZGlyZWN0ZWRcIixkaXJlY3Rpb246XCJpblwifSx7bmFtZTpcIm91dE5laWdoYm9yc1wiLHR5cGU6XCJkaXJlY3RlZFwiLGRpcmVjdGlvbjpcIm91dFwifSx7bmFtZTpcImluYm91bmROZWlnaGJvcnNcIix0eXBlOlwibWl4ZWRcIixkaXJlY3Rpb246XCJpblwifSx7bmFtZTpcIm91dGJvdW5kTmVpZ2hib3JzXCIsdHlwZTpcIm1peGVkXCIsZGlyZWN0aW9uOlwib3V0XCJ9LHtuYW1lOlwiZGlyZWN0ZWROZWlnaGJvcnNcIix0eXBlOlwiZGlyZWN0ZWRcIn0se25hbWU6XCJ1bmRpcmVjdGVkTmVpZ2hib3JzXCIsdHlwZTpcInVuZGlyZWN0ZWRcIn1dO2Z1bmN0aW9uIGJ0KCl7dGhpcy5BPW51bGwsdGhpcy5CPW51bGx9ZnVuY3Rpb24gbXQodCxlLG4scixpKXtmb3IodmFyIG8gaW4gcil7dmFyIGE9cltvXSx1PWEuc291cmNlLGM9YS50YXJnZXQscz11PT09bj9jOnU7aWYoIWV8fCFlLmhhcyhzLmtleSkpe3ZhciBkPWkocy5rZXkscy5hdHRyaWJ1dGVzKTtpZih0JiZkKXJldHVybiBzLmtleX19fWZ1bmN0aW9uIGt0KHQsZSxuLHIsaSl7aWYoXCJtaXhlZFwiIT09ZSl7aWYoXCJ1bmRpcmVjdGVkXCI9PT1lKXJldHVybiBtdCh0LG51bGwscixyLnVuZGlyZWN0ZWQsaSk7aWYoXCJzdHJpbmdcIj09dHlwZW9mIG4pcmV0dXJuIG10KHQsbnVsbCxyLHJbbl0saSl9dmFyIG8sYT1uZXcgYnQ7aWYoXCJ1bmRpcmVjdGVkXCIhPT1lKXtpZihcIm91dFwiIT09bil7aWYobz1tdCh0LG51bGwscixyLmluLGkpLHQmJm8pcmV0dXJuIG87YS53cmFwKHIuaW4pfWlmKFwiaW5cIiE9PW4pe2lmKG89bXQodCxhLHIsci5vdXQsaSksdCYmbylyZXR1cm4gbzthLndyYXAoci5vdXQpfX1pZihcImRpcmVjdGVkXCIhPT1lJiYobz1tdCh0LGEscixyLnVuZGlyZWN0ZWQsaSksdCYmbykpcmV0dXJuIG99ZnVuY3Rpb24gX3QodCxlLG4pe3ZhciByPU9iamVjdC5rZXlzKG4pLGk9ci5sZW5ndGgsbz0wO3JldHVybiBuZXcgTygoZnVuY3Rpb24oKXt2YXIgYT1udWxsO2Rve2lmKG8+PWkpcmV0dXJuIHQmJnQud3JhcChuKSx7ZG9uZTohMH07dmFyIHU9bltyW28rK11dLGM9dS5zb3VyY2Uscz11LnRhcmdldDthPWM9PT1lP3M6Yyx0JiZ0LmhhcyhhLmtleSkmJihhPW51bGwpfXdoaWxlKG51bGw9PT1hKTtyZXR1cm57ZG9uZTohMSx2YWx1ZTp7bmVpZ2hib3I6YS5rZXksYXR0cmlidXRlczphLmF0dHJpYnV0ZXN9fX0pKX1mdW5jdGlvbiBHdCh0LGUpe3ZhciBuPWUubmFtZSxyPWUudHlwZSxpPWUuZGlyZWN0aW9uO3QucHJvdG90eXBlW25dPWZ1bmN0aW9uKHQpe2lmKFwibWl4ZWRcIiE9PXImJlwibWl4ZWRcIiE9PXRoaXMudHlwZSYmciE9PXRoaXMudHlwZSlyZXR1cm5bXTt0PVwiXCIrdDt2YXIgZT10aGlzLl9ub2Rlcy5nZXQodCk7aWYodm9pZCAwPT09ZSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChuLCc6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicpLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuIGZ1bmN0aW9uKHQsZSxuKXtpZihcIm1peGVkXCIhPT10KXtpZihcInVuZGlyZWN0ZWRcIj09PXQpcmV0dXJuIE9iamVjdC5rZXlzKG4udW5kaXJlY3RlZCk7aWYoXCJzdHJpbmdcIj09dHlwZW9mIGUpcmV0dXJuIE9iamVjdC5rZXlzKG5bZV0pfXZhciByPVtdO3JldHVybiBrdCghMSx0LGUsbiwoZnVuY3Rpb24odCl7ci5wdXNoKHQpfSkpLHJ9KFwibWl4ZWRcIj09PXI/dGhpcy50eXBlOnIsaSxlKX19ZnVuY3Rpb24geHQodCxlKXt2YXIgbj1lLm5hbWUscj1lLnR5cGUsaT1lLmRpcmVjdGlvbixvPW4uc2xpY2UoMCwtMSkrXCJFbnRyaWVzXCI7dC5wcm90b3R5cGVbb109ZnVuY3Rpb24odCl7aWYoXCJtaXhlZFwiIT09ciYmXCJtaXhlZFwiIT09dGhpcy50eXBlJiZyIT09dGhpcy50eXBlKXJldHVybiBPLmVtcHR5KCk7dD1cIlwiK3Q7dmFyIGU9dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKHZvaWQgMD09PWUpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQobywnOiBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3JldHVybiBmdW5jdGlvbih0LGUsbil7aWYoXCJtaXhlZFwiIT09dCl7aWYoXCJ1bmRpcmVjdGVkXCI9PT10KXJldHVybiBfdChudWxsLG4sbi51bmRpcmVjdGVkKTtpZihcInN0cmluZ1wiPT10eXBlb2YgZSlyZXR1cm4gX3QobnVsbCxuLG5bZV0pfXZhciByPU8uZW1wdHkoKSxpPW5ldyBidDtyZXR1cm5cInVuZGlyZWN0ZWRcIiE9PXQmJihcIm91dFwiIT09ZSYmKHI9ZXQocixfdChpLG4sbi5pbikpKSxcImluXCIhPT1lJiYocj1ldChyLF90KGksbixuLm91dCkpKSksXCJkaXJlY3RlZFwiIT09dCYmKHI9ZXQocixfdChpLG4sbi51bmRpcmVjdGVkKSkpLHJ9KFwibWl4ZWRcIj09PXI/dGhpcy50eXBlOnIsaSxlKX19ZnVuY3Rpb24gRXQodCxlLG4scixpKXtmb3IodmFyIG8sYSx1LGMscyxkLGgscD1yLl9ub2Rlcy52YWx1ZXMoKSxmPXIudHlwZTshMCE9PShvPXAubmV4dCgpKS5kb25lOyl7dmFyIGw9ITE7aWYoYT1vLnZhbHVlLFwidW5kaXJlY3RlZFwiIT09Zilmb3IodSBpbiBjPWEub3V0KXtzPWNbdV07ZG97aWYoZD1zLnRhcmdldCxsPSEwLGg9aShhLmtleSxkLmtleSxhLmF0dHJpYnV0ZXMsZC5hdHRyaWJ1dGVzLHMua2V5LHMuYXR0cmlidXRlcyxzLnVuZGlyZWN0ZWQpLHQmJmgpcmV0dXJuIHM7cz1zLm5leHR9d2hpbGUocyl9aWYoXCJkaXJlY3RlZFwiIT09Zilmb3IodSBpbiBjPWEudW5kaXJlY3RlZClpZighKGUmJmEua2V5PnUpKXtzPWNbdV07ZG97aWYoKGQ9cy50YXJnZXQpLmtleSE9PXUmJihkPXMuc291cmNlKSxsPSEwLGg9aShhLmtleSxkLmtleSxhLmF0dHJpYnV0ZXMsZC5hdHRyaWJ1dGVzLHMua2V5LHMuYXR0cmlidXRlcyxzLnVuZGlyZWN0ZWQpLHQmJmgpcmV0dXJuIHM7cz1zLm5leHR9d2hpbGUocyl9aWYobiYmIWwmJihoPWkoYS5rZXksbnVsbCxhLmF0dHJpYnV0ZXMsbnVsbCxudWxsLG51bGwsbnVsbCksdCYmaCkpcmV0dXJuIG51bGx9fWZ1bmN0aW9uIEF0KHQpe2lmKCFoKHQpKXRocm93IG5ldyBGKCdHcmFwaC5pbXBvcnQ6IGludmFsaWQgc2VyaWFsaXplZCBub2RlLiBBIHNlcmlhbGl6ZWQgbm9kZSBzaG91bGQgYmUgYSBwbGFpbiBvYmplY3Qgd2l0aCBhdCBsZWFzdCBhIFwia2V5XCIgcHJvcGVydHkuJyk7aWYoIShcImtleVwiaW4gdCkpdGhyb3cgbmV3IEYoXCJHcmFwaC5pbXBvcnQ6IHNlcmlhbGl6ZWQgbm9kZSBpcyBtaXNzaW5nIGl0cyBrZXkuXCIpO2lmKFwiYXR0cmlidXRlc1wiaW4gdCYmKCFoKHQuYXR0cmlidXRlcyl8fG51bGw9PT10LmF0dHJpYnV0ZXMpKXRocm93IG5ldyBGKFwiR3JhcGguaW1wb3J0OiBpbnZhbGlkIGF0dHJpYnV0ZXMuIEF0dHJpYnV0ZXMgc2hvdWxkIGJlIGEgcGxhaW4gb2JqZWN0LCBudWxsIG9yIG9taXR0ZWQuXCIpfWZ1bmN0aW9uIFN0KHQpe2lmKCFoKHQpKXRocm93IG5ldyBGKCdHcmFwaC5pbXBvcnQ6IGludmFsaWQgc2VyaWFsaXplZCBlZGdlLiBBIHNlcmlhbGl6ZWQgZWRnZSBzaG91bGQgYmUgYSBwbGFpbiBvYmplY3Qgd2l0aCBhdCBsZWFzdCBhIFwic291cmNlXCIgJiBcInRhcmdldFwiIHByb3BlcnR5LicpO2lmKCEoXCJzb3VyY2VcImluIHQpKXRocm93IG5ldyBGKFwiR3JhcGguaW1wb3J0OiBzZXJpYWxpemVkIGVkZ2UgaXMgbWlzc2luZyBpdHMgc291cmNlLlwiKTtpZighKFwidGFyZ2V0XCJpbiB0KSl0aHJvdyBuZXcgRihcIkdyYXBoLmltcG9ydDogc2VyaWFsaXplZCBlZGdlIGlzIG1pc3NpbmcgaXRzIHRhcmdldC5cIik7aWYoXCJhdHRyaWJ1dGVzXCJpbiB0JiYoIWgodC5hdHRyaWJ1dGVzKXx8bnVsbD09PXQuYXR0cmlidXRlcykpdGhyb3cgbmV3IEYoXCJHcmFwaC5pbXBvcnQ6IGludmFsaWQgYXR0cmlidXRlcy4gQXR0cmlidXRlcyBzaG91bGQgYmUgYSBwbGFpbiBvYmplY3QsIG51bGwgb3Igb21pdHRlZC5cIik7aWYoXCJ1bmRpcmVjdGVkXCJpbiB0JiZcImJvb2xlYW5cIiE9dHlwZW9mIHQudW5kaXJlY3RlZCl0aHJvdyBuZXcgRihcIkdyYXBoLmltcG9ydDogaW52YWxpZCB1bmRpcmVjdGVkbmVzcyBpbmZvcm1hdGlvbi4gVW5kaXJlY3RlZCBzaG91bGQgYmUgYm9vbGVhbiBvciBvbWl0dGVkLlwiKX1idC5wcm90b3R5cGUud3JhcD1mdW5jdGlvbih0KXtudWxsPT09dGhpcy5BP3RoaXMuQT10Om51bGw9PT10aGlzLkImJih0aGlzLkI9dCl9LGJ0LnByb3RvdHlwZS5oYXM9ZnVuY3Rpb24odCl7cmV0dXJuIG51bGwhPT10aGlzLkEmJnQgaW4gdGhpcy5BfHxudWxsIT09dGhpcy5CJiZ0IGluIHRoaXMuQn07dmFyIER0LEx0PShEdD0yNTUmTWF0aC5mbG9vcigyNTYqTWF0aC5yYW5kb20oKSksZnVuY3Rpb24oKXtyZXR1cm4gRHQrK30pLFV0PW5ldyBTZXQoW1wiZGlyZWN0ZWRcIixcInVuZGlyZWN0ZWRcIixcIm1peGVkXCJdKSxOdD1uZXcgU2V0KFtcImRvbWFpblwiLFwiX2V2ZW50c1wiLFwiX2V2ZW50c0NvdW50XCIsXCJfbWF4TGlzdGVuZXJzXCJdKSxqdD17YWxsb3dTZWxmTG9vcHM6ITAsbXVsdGk6ITEsdHlwZTpcIm1peGVkXCJ9O2Z1bmN0aW9uIE90KHQsZSxuKXt2YXIgcj1uZXcgdC5Ob2RlRGF0YUNsYXNzKGUsbik7cmV0dXJuIHQuX25vZGVzLnNldChlLHIpLHQuZW1pdChcIm5vZGVBZGRlZFwiLHtrZXk6ZSxhdHRyaWJ1dGVzOm59KSxyfWZ1bmN0aW9uIEN0KHQsZSxuLHIsaSxvLGEsdSl7aWYoIXImJlwidW5kaXJlY3RlZFwiPT09dC50eXBlKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsXCI6IHlvdSBjYW5ub3QgYWRkIGEgZGlyZWN0ZWQgZWRnZSB0byBhbiB1bmRpcmVjdGVkIGdyYXBoLiBVc2UgdGhlICMuYWRkRWRnZSBvciAjLmFkZFVuZGlyZWN0ZWRFZGdlIGluc3RlYWQuXCIpKTtpZihyJiZcImRpcmVjdGVkXCI9PT10LnR5cGUpdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogeW91IGNhbm5vdCBhZGQgYW4gdW5kaXJlY3RlZCBlZGdlIHRvIGEgZGlyZWN0ZWQgZ3JhcGguIFVzZSB0aGUgIy5hZGRFZGdlIG9yICMuYWRkRGlyZWN0ZWRFZGdlIGluc3RlYWQuXCIpKTtpZih1JiYhaCh1KSl0aHJvdyBuZXcgRihcIkdyYXBoLlwiLmNvbmNhdChlLCc6IGludmFsaWQgYXR0cmlidXRlcy4gRXhwZWN0aW5nIGFuIG9iamVjdCBidXQgZ290IFwiJykuY29uY2F0KHUsJ1wiJykpO2lmKG89XCJcIitvLGE9XCJcIithLHU9dXx8e30sIXQuYWxsb3dTZWxmTG9vcHMmJm89PT1hKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsJzogc291cmNlICYgdGFyZ2V0IGFyZSB0aGUgc2FtZSAoXCInKS5jb25jYXQobyxcIlxcXCIpLCB0aHVzIGNyZWF0aW5nIGEgbG9vcCBleHBsaWNpdGx5IGZvcmJpZGRlbiBieSB0aGlzIGdyYXBoICdhbGxvd1NlbGZMb29wcycgb3B0aW9uIHNldCB0byBmYWxzZS5cIikpO3ZhciBjPXQuX25vZGVzLmdldChvKSxzPXQuX25vZGVzLmdldChhKTtpZighYyl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChlLCc6IHNvdXJjZSBub2RlIFwiJykuY29uY2F0KG8sJ1wiIG5vdCBmb3VuZC4nKSk7aWYoIXMpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiB0YXJnZXQgbm9kZSBcIicpLmNvbmNhdChhLCdcIiBub3QgZm91bmQuJykpO3ZhciBkPXtrZXk6bnVsbCx1bmRpcmVjdGVkOnIsc291cmNlOm8sdGFyZ2V0OmEsYXR0cmlidXRlczp1fTtpZihuKWk9dC5fZWRnZUtleUdlbmVyYXRvcigpO2Vsc2UgaWYoaT1cIlwiK2ksdC5fZWRnZXMuaGFzKGkpKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsJzogdGhlIFwiJykuY29uY2F0KGksJ1wiIGVkZ2UgYWxyZWFkeSBleGlzdHMgaW4gdGhlIGdyYXBoLicpKTtpZighdC5tdWx0aSYmKHI/dm9pZCAwIT09Yy51bmRpcmVjdGVkW2FdOnZvaWQgMCE9PWMub3V0W2FdKSl0aHJvdyBuZXcgWShcIkdyYXBoLlwiLmNvbmNhdChlLCc6IGFuIGVkZ2UgbGlua2luZyBcIicpLmNvbmNhdChvLCdcIiB0byBcIicpLmNvbmNhdChhLFwiXFxcIiBhbHJlYWR5IGV4aXN0cy4gSWYgeW91IHJlYWxseSB3YW50IHRvIGFkZCBtdWx0aXBsZSBlZGdlcyBsaW5raW5nIHRob3NlIG5vZGVzLCB5b3Ugc2hvdWxkIGNyZWF0ZSBhIG11bHRpIGdyYXBoIGJ5IHVzaW5nIHRoZSAnbXVsdGknIG9wdGlvbi5cIikpO3ZhciBwPW5ldyBIKHIsaSxjLHMsdSk7dC5fZWRnZXMuc2V0KGkscCk7dmFyIGY9bz09PWE7cmV0dXJuIHI/KGMudW5kaXJlY3RlZERlZ3JlZSsrLHMudW5kaXJlY3RlZERlZ3JlZSsrLGYmJnQuX3VuZGlyZWN0ZWRTZWxmTG9vcENvdW50KyspOihjLm91dERlZ3JlZSsrLHMuaW5EZWdyZWUrKyxmJiZ0Ll9kaXJlY3RlZFNlbGZMb29wQ291bnQrKyksdC5tdWx0aT9wLmF0dGFjaE11bHRpKCk6cC5hdHRhY2goKSxyP3QuX3VuZGlyZWN0ZWRTaXplKys6dC5fZGlyZWN0ZWRTaXplKyssZC5rZXk9aSx0LmVtaXQoXCJlZGdlQWRkZWRcIixkKSxpfWZ1bmN0aW9uIHp0KHQsZSxuLHIsaSxvLGEsdSxzKXtpZighciYmXCJ1bmRpcmVjdGVkXCI9PT10LnR5cGUpdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSxcIjogeW91IGNhbm5vdCBtZXJnZS91cGRhdGUgYSBkaXJlY3RlZCBlZGdlIHRvIGFuIHVuZGlyZWN0ZWQgZ3JhcGguIFVzZSB0aGUgIy5tZXJnZUVkZ2UvIy51cGRhdGVFZGdlIG9yICMuYWRkVW5kaXJlY3RlZEVkZ2UgaW5zdGVhZC5cIikpO2lmKHImJlwiZGlyZWN0ZWRcIj09PXQudHlwZSl0aHJvdyBuZXcgWShcIkdyYXBoLlwiLmNvbmNhdChlLFwiOiB5b3UgY2Fubm90IG1lcmdlL3VwZGF0ZSBhbiB1bmRpcmVjdGVkIGVkZ2UgdG8gYSBkaXJlY3RlZCBncmFwaC4gVXNlIHRoZSAjLm1lcmdlRWRnZS8jLnVwZGF0ZUVkZ2Ugb3IgIy5hZGREaXJlY3RlZEVkZ2UgaW5zdGVhZC5cIikpO2lmKHUpaWYocyl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdSl0aHJvdyBuZXcgRihcIkdyYXBoLlwiLmNvbmNhdChlLCc6IGludmFsaWQgdXBkYXRlciBmdW5jdGlvbi4gRXhwZWN0aW5nIGEgZnVuY3Rpb24gYnV0IGdvdCBcIicpLmNvbmNhdCh1LCdcIicpKX1lbHNlIGlmKCFoKHUpKXRocm93IG5ldyBGKFwiR3JhcGguXCIuY29uY2F0KGUsJzogaW52YWxpZCBhdHRyaWJ1dGVzLiBFeHBlY3RpbmcgYW4gb2JqZWN0IGJ1dCBnb3QgXCInKS5jb25jYXQodSwnXCInKSk7dmFyIGQ7aWYobz1cIlwiK28sYT1cIlwiK2EscyYmKGQ9dSx1PXZvaWQgMCksIXQuYWxsb3dTZWxmTG9vcHMmJm89PT1hKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsJzogc291cmNlICYgdGFyZ2V0IGFyZSB0aGUgc2FtZSAoXCInKS5jb25jYXQobyxcIlxcXCIpLCB0aHVzIGNyZWF0aW5nIGEgbG9vcCBleHBsaWNpdGx5IGZvcmJpZGRlbiBieSB0aGlzIGdyYXBoICdhbGxvd1NlbGZMb29wcycgb3B0aW9uIHNldCB0byBmYWxzZS5cIikpO3ZhciBwLGYsbD10Ll9ub2Rlcy5nZXQobyksZz10Ll9ub2Rlcy5nZXQoYSk7aWYoIW4mJihwPXQuX2VkZ2VzLmdldChpKSkpe2lmKCEocC5zb3VyY2Uua2V5PT09byYmcC50YXJnZXQua2V5PT09YXx8ciYmcC5zb3VyY2Uua2V5PT09YSYmcC50YXJnZXQua2V5PT09bykpdGhyb3cgbmV3IFkoXCJHcmFwaC5cIi5jb25jYXQoZSwnOiBpbmNvbnNpc3RlbmN5IGRldGVjdGVkIHdoZW4gYXR0ZW1wdGluZyB0byBtZXJnZSB0aGUgXCInKS5jb25jYXQoaSwnXCIgZWRnZSB3aXRoIFwiJykuY29uY2F0KG8sJ1wiIHNvdXJjZSAmIFwiJykuY29uY2F0KGEsJ1wiIHRhcmdldCB2cy4gKFwiJykuY29uY2F0KHAuc291cmNlLmtleSwnXCIsIFwiJykuY29uY2F0KHAudGFyZ2V0LmtleSwnXCIpLicpKTtmPXB9aWYoZnx8dC5tdWx0aXx8IWx8fChmPXI/bC51bmRpcmVjdGVkW2FdOmwub3V0W2FdKSxmKXt2YXIgeT1bZi5rZXksITEsITEsITFdO2lmKHM/IWQ6IXUpcmV0dXJuIHk7aWYocyl7dmFyIHc9Zi5hdHRyaWJ1dGVzO2YuYXR0cmlidXRlcz1kKHcpLHQuZW1pdChcImVkZ2VBdHRyaWJ1dGVzVXBkYXRlZFwiLHt0eXBlOlwicmVwbGFjZVwiLGtleTpmLmtleSxhdHRyaWJ1dGVzOmYuYXR0cmlidXRlc30pfWVsc2UgYyhmLmF0dHJpYnV0ZXMsdSksdC5lbWl0KFwiZWRnZUF0dHJpYnV0ZXNVcGRhdGVkXCIse3R5cGU6XCJtZXJnZVwiLGtleTpmLmtleSxhdHRyaWJ1dGVzOmYuYXR0cmlidXRlcyxkYXRhOnV9KTtyZXR1cm4geX11PXV8fHt9LHMmJmQmJih1PWQodSkpO3ZhciB2PXtrZXk6bnVsbCx1bmRpcmVjdGVkOnIsc291cmNlOm8sdGFyZ2V0OmEsYXR0cmlidXRlczp1fTtpZihuKWk9dC5fZWRnZUtleUdlbmVyYXRvcigpO2Vsc2UgaWYoaT1cIlwiK2ksdC5fZWRnZXMuaGFzKGkpKXRocm93IG5ldyBZKFwiR3JhcGguXCIuY29uY2F0KGUsJzogdGhlIFwiJykuY29uY2F0KGksJ1wiIGVkZ2UgYWxyZWFkeSBleGlzdHMgaW4gdGhlIGdyYXBoLicpKTt2YXIgYj0hMSxtPSExO2x8fChsPU90KHQsbyx7fSksYj0hMCxvPT09YSYmKGc9bCxtPSEwKSksZ3x8KGc9T3QodCxhLHt9KSxtPSEwKSxwPW5ldyBIKHIsaSxsLGcsdSksdC5fZWRnZXMuc2V0KGkscCk7dmFyIGs9bz09PWE7cmV0dXJuIHI/KGwudW5kaXJlY3RlZERlZ3JlZSsrLGcudW5kaXJlY3RlZERlZ3JlZSsrLGsmJnQuX3VuZGlyZWN0ZWRTZWxmTG9vcENvdW50KyspOihsLm91dERlZ3JlZSsrLGcuaW5EZWdyZWUrKyxrJiZ0Ll9kaXJlY3RlZFNlbGZMb29wQ291bnQrKyksdC5tdWx0aT9wLmF0dGFjaE11bHRpKCk6cC5hdHRhY2goKSxyP3QuX3VuZGlyZWN0ZWRTaXplKys6dC5fZGlyZWN0ZWRTaXplKyssdi5rZXk9aSx0LmVtaXQoXCJlZGdlQWRkZWRcIix2KSxbaSwhMCxiLG1dfWZ1bmN0aW9uIE10KHQsZSl7dC5fZWRnZXMuZGVsZXRlKGUua2V5KTt2YXIgbj1lLnNvdXJjZSxyPWUudGFyZ2V0LGk9ZS5hdHRyaWJ1dGVzLG89ZS51bmRpcmVjdGVkLGE9bj09PXI7bz8obi51bmRpcmVjdGVkRGVncmVlLS0sci51bmRpcmVjdGVkRGVncmVlLS0sYSYmdC5fdW5kaXJlY3RlZFNlbGZMb29wQ291bnQtLSk6KG4ub3V0RGVncmVlLS0sci5pbkRlZ3JlZS0tLGEmJnQuX2RpcmVjdGVkU2VsZkxvb3BDb3VudC0tKSx0Lm11bHRpP2UuZGV0YWNoTXVsdGkoKTplLmRldGFjaCgpLG8/dC5fdW5kaXJlY3RlZFNpemUtLTp0Ll9kaXJlY3RlZFNpemUtLSx0LmVtaXQoXCJlZGdlRHJvcHBlZFwiLHtrZXk6ZS5rZXksYXR0cmlidXRlczppLHNvdXJjZTpuLmtleSx0YXJnZXQ6ci5rZXksdW5kaXJlY3RlZDpvfSl9dmFyIFd0PWZ1bmN0aW9uKG4pe2Z1bmN0aW9uIHIodCl7dmFyIGU7aWYoZT1uLmNhbGwodGhpcyl8fHRoaXMsXCJib29sZWFuXCIhPXR5cGVvZih0PWMoe30sanQsdCkpLm11bHRpKXRocm93IG5ldyBGKFwiR3JhcGguY29uc3RydWN0b3I6IGludmFsaWQgJ211bHRpJyBvcHRpb24uIEV4cGVjdGluZyBhIGJvb2xlYW4gYnV0IGdvdCBcXFwiXCIuY29uY2F0KHQubXVsdGksJ1wiLicpKTtpZighVXQuaGFzKHQudHlwZSkpdGhyb3cgbmV3IEYoJ0dyYXBoLmNvbnN0cnVjdG9yOiBpbnZhbGlkIFxcJ3R5cGVcXCcgb3B0aW9uLiBTaG91bGQgYmUgb25lIG9mIFwibWl4ZWRcIiwgXCJkaXJlY3RlZFwiIG9yIFwidW5kaXJlY3RlZFwiIGJ1dCBnb3QgXCInLmNvbmNhdCh0LnR5cGUsJ1wiLicpKTtpZihcImJvb2xlYW5cIiE9dHlwZW9mIHQuYWxsb3dTZWxmTG9vcHMpdGhyb3cgbmV3IEYoXCJHcmFwaC5jb25zdHJ1Y3RvcjogaW52YWxpZCAnYWxsb3dTZWxmTG9vcHMnIG9wdGlvbi4gRXhwZWN0aW5nIGEgYm9vbGVhbiBidXQgZ290IFxcXCJcIi5jb25jYXQodC5hbGxvd1NlbGZMb29wcywnXCIuJykpO3ZhciByPVwibWl4ZWRcIj09PXQudHlwZT9xOlwiZGlyZWN0ZWRcIj09PXQudHlwZT9KOlY7Zih1KGUpLFwiTm9kZURhdGFDbGFzc1wiLHIpO3ZhciBpPVwiZ2VpZF9cIitMdCgpK1wiX1wiLG89MDtyZXR1cm4gZih1KGUpLFwiX2F0dHJpYnV0ZXNcIix7fSksZih1KGUpLFwiX25vZGVzXCIsbmV3IE1hcCksZih1KGUpLFwiX2VkZ2VzXCIsbmV3IE1hcCksZih1KGUpLFwiX2RpcmVjdGVkU2l6ZVwiLDApLGYodShlKSxcIl91bmRpcmVjdGVkU2l6ZVwiLDApLGYodShlKSxcIl9kaXJlY3RlZFNlbGZMb29wQ291bnRcIiwwKSxmKHUoZSksXCJfdW5kaXJlY3RlZFNlbGZMb29wQ291bnRcIiwwKSxmKHUoZSksXCJfZWRnZUtleUdlbmVyYXRvclwiLChmdW5jdGlvbigpe3ZhciB0O2Rve3Q9aStvKyt9d2hpbGUoZS5fZWRnZXMuaGFzKHQpKTtyZXR1cm4gdH0pKSxmKHUoZSksXCJfb3B0aW9uc1wiLHQpLE50LmZvckVhY2goKGZ1bmN0aW9uKHQpe3JldHVybiBmKHUoZSksdCxlW3RdKX0pKSxsKHUoZSksXCJvcmRlclwiLChmdW5jdGlvbigpe3JldHVybiBlLl9ub2Rlcy5zaXplfSkpLGwodShlKSxcInNpemVcIiwoZnVuY3Rpb24oKXtyZXR1cm4gZS5fZWRnZXMuc2l6ZX0pKSxsKHUoZSksXCJkaXJlY3RlZFNpemVcIiwoZnVuY3Rpb24oKXtyZXR1cm4gZS5fZGlyZWN0ZWRTaXplfSkpLGwodShlKSxcInVuZGlyZWN0ZWRTaXplXCIsKGZ1bmN0aW9uKCl7cmV0dXJuIGUuX3VuZGlyZWN0ZWRTaXplfSkpLGwodShlKSxcInNlbGZMb29wQ291bnRcIiwoZnVuY3Rpb24oKXtyZXR1cm4gZS5fZGlyZWN0ZWRTZWxmTG9vcENvdW50K2UuX3VuZGlyZWN0ZWRTZWxmTG9vcENvdW50fSkpLGwodShlKSxcImRpcmVjdGVkU2VsZkxvb3BDb3VudFwiLChmdW5jdGlvbigpe3JldHVybiBlLl9kaXJlY3RlZFNlbGZMb29wQ291bnR9KSksbCh1KGUpLFwidW5kaXJlY3RlZFNlbGZMb29wQ291bnRcIiwoZnVuY3Rpb24oKXtyZXR1cm4gZS5fdW5kaXJlY3RlZFNlbGZMb29wQ291bnR9KSksbCh1KGUpLFwibXVsdGlcIixlLl9vcHRpb25zLm11bHRpKSxsKHUoZSksXCJ0eXBlXCIsZS5fb3B0aW9ucy50eXBlKSxsKHUoZSksXCJhbGxvd1NlbGZMb29wc1wiLGUuX29wdGlvbnMuYWxsb3dTZWxmTG9vcHMpLGwodShlKSxcImltcGxlbWVudGF0aW9uXCIsKGZ1bmN0aW9uKCl7cmV0dXJuXCJncmFwaG9sb2d5XCJ9KSksZX1lKHIsbik7dmFyIGk9ci5wcm90b3R5cGU7cmV0dXJuIGkuX3Jlc2V0SW5zdGFuY2VDb3VudGVycz1mdW5jdGlvbigpe3RoaXMuX2RpcmVjdGVkU2l6ZT0wLHRoaXMuX3VuZGlyZWN0ZWRTaXplPTAsdGhpcy5fZGlyZWN0ZWRTZWxmTG9vcENvdW50PTAsdGhpcy5fdW5kaXJlY3RlZFNlbGZMb29wQ291bnQ9MH0saS5oYXNOb2RlPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9ub2Rlcy5oYXMoXCJcIit0KX0saS5oYXNEaXJlY3RlZEVkZ2U9ZnVuY3Rpb24odCxlKXtpZihcInVuZGlyZWN0ZWRcIj09PXRoaXMudHlwZSlyZXR1cm4hMTtpZigxPT09YXJndW1lbnRzLmxlbmd0aCl7dmFyIG49XCJcIit0LHI9dGhpcy5fZWRnZXMuZ2V0KG4pO3JldHVybiEhciYmIXIudW5kaXJlY3RlZH1pZigyPT09YXJndW1lbnRzLmxlbmd0aCl7dD1cIlwiK3QsZT1cIlwiK2U7dmFyIGk9dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKCFpKXJldHVybiExO3ZhciBvPWkub3V0W2VdO3JldHVybiEhbyYmKCF0aGlzLm11bHRpfHwhIW8uc2l6ZSl9dGhyb3cgbmV3IEYoXCJHcmFwaC5oYXNEaXJlY3RlZEVkZ2U6IGludmFsaWQgYXJpdHkgKFwiLmNvbmNhdChhcmd1bWVudHMubGVuZ3RoLFwiLCBpbnN0ZWFkIG9mIDEgb3IgMikuIFlvdSBjYW4gZWl0aGVyIGFzayBmb3IgYW4gZWRnZSBpZCBvciBmb3IgdGhlIGV4aXN0ZW5jZSBvZiBhbiBlZGdlIGJldHdlZW4gYSBzb3VyY2UgJiBhIHRhcmdldC5cIikpfSxpLmhhc1VuZGlyZWN0ZWRFZGdlPWZ1bmN0aW9uKHQsZSl7aWYoXCJkaXJlY3RlZFwiPT09dGhpcy50eXBlKXJldHVybiExO2lmKDE9PT1hcmd1bWVudHMubGVuZ3RoKXt2YXIgbj1cIlwiK3Qscj10aGlzLl9lZGdlcy5nZXQobik7cmV0dXJuISFyJiZyLnVuZGlyZWN0ZWR9aWYoMj09PWFyZ3VtZW50cy5sZW5ndGgpe3Q9XCJcIit0LGU9XCJcIitlO3ZhciBpPXRoaXMuX25vZGVzLmdldCh0KTtpZighaSlyZXR1cm4hMTt2YXIgbz1pLnVuZGlyZWN0ZWRbZV07cmV0dXJuISFvJiYoIXRoaXMubXVsdGl8fCEhby5zaXplKX10aHJvdyBuZXcgRihcIkdyYXBoLmhhc0RpcmVjdGVkRWRnZTogaW52YWxpZCBhcml0eSAoXCIuY29uY2F0KGFyZ3VtZW50cy5sZW5ndGgsXCIsIGluc3RlYWQgb2YgMSBvciAyKS4gWW91IGNhbiBlaXRoZXIgYXNrIGZvciBhbiBlZGdlIGlkIG9yIGZvciB0aGUgZXhpc3RlbmNlIG9mIGFuIGVkZ2UgYmV0d2VlbiBhIHNvdXJjZSAmIGEgdGFyZ2V0LlwiKSl9LGkuaGFzRWRnZT1mdW5jdGlvbih0LGUpe2lmKDE9PT1hcmd1bWVudHMubGVuZ3RoKXt2YXIgbj1cIlwiK3Q7cmV0dXJuIHRoaXMuX2VkZ2VzLmhhcyhuKX1pZigyPT09YXJndW1lbnRzLmxlbmd0aCl7dD1cIlwiK3QsZT1cIlwiK2U7dmFyIHI9dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKCFyKXJldHVybiExO3ZhciBpPXZvaWQgMCE9PXIub3V0JiZyLm91dFtlXTtyZXR1cm4gaXx8KGk9dm9pZCAwIT09ci51bmRpcmVjdGVkJiZyLnVuZGlyZWN0ZWRbZV0pLCEhaSYmKCF0aGlzLm11bHRpfHwhIWkuc2l6ZSl9dGhyb3cgbmV3IEYoXCJHcmFwaC5oYXNFZGdlOiBpbnZhbGlkIGFyaXR5IChcIi5jb25jYXQoYXJndW1lbnRzLmxlbmd0aCxcIiwgaW5zdGVhZCBvZiAxIG9yIDIpLiBZb3UgY2FuIGVpdGhlciBhc2sgZm9yIGFuIGVkZ2UgaWQgb3IgZm9yIHRoZSBleGlzdGVuY2Ugb2YgYW4gZWRnZSBiZXR3ZWVuIGEgc291cmNlICYgYSB0YXJnZXQuXCIpKX0saS5kaXJlY3RlZEVkZ2U9ZnVuY3Rpb24odCxlKXtpZihcInVuZGlyZWN0ZWRcIiE9PXRoaXMudHlwZSl7aWYodD1cIlwiK3QsZT1cIlwiK2UsdGhpcy5tdWx0aSl0aHJvdyBuZXcgWShcIkdyYXBoLmRpcmVjdGVkRWRnZTogdGhpcyBtZXRob2QgaXMgaXJyZWxldmFudCB3aXRoIG11bHRpZ3JhcGhzIHNpbmNlIHRoZXJlIG1pZ2h0IGJlIG11bHRpcGxlIGVkZ2VzIGJldHdlZW4gc291cmNlICYgdGFyZ2V0LiBTZWUgIy5kaXJlY3RlZEVkZ2VzIGluc3RlYWQuXCIpO3ZhciBuPXRoaXMuX25vZGVzLmdldCh0KTtpZighbil0aHJvdyBuZXcgSSgnR3JhcGguZGlyZWN0ZWRFZGdlOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBzb3VyY2Ugbm9kZSBpbiB0aGUgZ3JhcGguJykpO2lmKCF0aGlzLl9ub2Rlcy5oYXMoZSkpdGhyb3cgbmV3IEkoJ0dyYXBoLmRpcmVjdGVkRWRnZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQoZSwnXCIgdGFyZ2V0IG5vZGUgaW4gdGhlIGdyYXBoLicpKTt2YXIgcj1uLm91dCYmbi5vdXRbZV18fHZvaWQgMDtyZXR1cm4gcj9yLmtleTp2b2lkIDB9fSxpLnVuZGlyZWN0ZWRFZGdlPWZ1bmN0aW9uKHQsZSl7aWYoXCJkaXJlY3RlZFwiIT09dGhpcy50eXBlKXtpZih0PVwiXCIrdCxlPVwiXCIrZSx0aGlzLm11bHRpKXRocm93IG5ldyBZKFwiR3JhcGgudW5kaXJlY3RlZEVkZ2U6IHRoaXMgbWV0aG9kIGlzIGlycmVsZXZhbnQgd2l0aCBtdWx0aWdyYXBocyBzaW5jZSB0aGVyZSBtaWdodCBiZSBtdWx0aXBsZSBlZGdlcyBiZXR3ZWVuIHNvdXJjZSAmIHRhcmdldC4gU2VlICMudW5kaXJlY3RlZEVkZ2VzIGluc3RlYWQuXCIpO3ZhciBuPXRoaXMuX25vZGVzLmdldCh0KTtpZighbil0aHJvdyBuZXcgSSgnR3JhcGgudW5kaXJlY3RlZEVkZ2U6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicuY29uY2F0KHQsJ1wiIHNvdXJjZSBub2RlIGluIHRoZSBncmFwaC4nKSk7aWYoIXRoaXMuX25vZGVzLmhhcyhlKSl0aHJvdyBuZXcgSSgnR3JhcGgudW5kaXJlY3RlZEVkZ2U6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicuY29uY2F0KGUsJ1wiIHRhcmdldCBub2RlIGluIHRoZSBncmFwaC4nKSk7dmFyIHI9bi51bmRpcmVjdGVkJiZuLnVuZGlyZWN0ZWRbZV18fHZvaWQgMDtyZXR1cm4gcj9yLmtleTp2b2lkIDB9fSxpLmVkZ2U9ZnVuY3Rpb24odCxlKXtpZih0aGlzLm11bHRpKXRocm93IG5ldyBZKFwiR3JhcGguZWRnZTogdGhpcyBtZXRob2QgaXMgaXJyZWxldmFudCB3aXRoIG11bHRpZ3JhcGhzIHNpbmNlIHRoZXJlIG1pZ2h0IGJlIG11bHRpcGxlIGVkZ2VzIGJldHdlZW4gc291cmNlICYgdGFyZ2V0LiBTZWUgIy5lZGdlcyBpbnN0ZWFkLlwiKTt0PVwiXCIrdCxlPVwiXCIrZTt2YXIgbj10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIW4pdGhyb3cgbmV3IEkoJ0dyYXBoLmVkZ2U6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicuY29uY2F0KHQsJ1wiIHNvdXJjZSBub2RlIGluIHRoZSBncmFwaC4nKSk7aWYoIXRoaXMuX25vZGVzLmhhcyhlKSl0aHJvdyBuZXcgSSgnR3JhcGguZWRnZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQoZSwnXCIgdGFyZ2V0IG5vZGUgaW4gdGhlIGdyYXBoLicpKTt2YXIgcj1uLm91dCYmbi5vdXRbZV18fG4udW5kaXJlY3RlZCYmbi51bmRpcmVjdGVkW2VdfHx2b2lkIDA7aWYocilyZXR1cm4gci5rZXl9LGkuYXJlRGlyZWN0ZWROZWlnaGJvcnM9ZnVuY3Rpb24odCxlKXt0PVwiXCIrdCxlPVwiXCIrZTt2YXIgbj10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIW4pdGhyb3cgbmV3IEkoJ0dyYXBoLmFyZURpcmVjdGVkTmVpZ2hib3JzOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuXCJ1bmRpcmVjdGVkXCIhPT10aGlzLnR5cGUmJihlIGluIG4uaW58fGUgaW4gbi5vdXQpfSxpLmFyZU91dE5laWdoYm9ycz1mdW5jdGlvbih0LGUpe3Q9XCJcIit0LGU9XCJcIitlO3ZhciBuPXRoaXMuX25vZGVzLmdldCh0KTtpZighbil0aHJvdyBuZXcgSSgnR3JhcGguYXJlT3V0TmVpZ2hib3JzOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuXCJ1bmRpcmVjdGVkXCIhPT10aGlzLnR5cGUmJmUgaW4gbi5vdXR9LGkuYXJlSW5OZWlnaGJvcnM9ZnVuY3Rpb24odCxlKXt0PVwiXCIrdCxlPVwiXCIrZTt2YXIgbj10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIW4pdGhyb3cgbmV3IEkoJ0dyYXBoLmFyZUluTmVpZ2hib3JzOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuXCJ1bmRpcmVjdGVkXCIhPT10aGlzLnR5cGUmJmUgaW4gbi5pbn0saS5hcmVVbmRpcmVjdGVkTmVpZ2hib3JzPWZ1bmN0aW9uKHQsZSl7dD1cIlwiK3QsZT1cIlwiK2U7dmFyIG49dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKCFuKXRocm93IG5ldyBJKCdHcmFwaC5hcmVVbmRpcmVjdGVkTmVpZ2hib3JzOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuXCJkaXJlY3RlZFwiIT09dGhpcy50eXBlJiZlIGluIG4udW5kaXJlY3RlZH0saS5hcmVOZWlnaGJvcnM9ZnVuY3Rpb24odCxlKXt0PVwiXCIrdCxlPVwiXCIrZTt2YXIgbj10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIW4pdGhyb3cgbmV3IEkoJ0dyYXBoLmFyZU5laWdoYm9yczogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3JldHVyblwidW5kaXJlY3RlZFwiIT09dGhpcy50eXBlJiYoZSBpbiBuLmlufHxlIGluIG4ub3V0KXx8XCJkaXJlY3RlZFwiIT09dGhpcy50eXBlJiZlIGluIG4udW5kaXJlY3RlZH0saS5hcmVJbmJvdW5kTmVpZ2hib3JzPWZ1bmN0aW9uKHQsZSl7dD1cIlwiK3QsZT1cIlwiK2U7dmFyIG49dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKCFuKXRocm93IG5ldyBJKCdHcmFwaC5hcmVJbmJvdW5kTmVpZ2hib3JzOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuXCJ1bmRpcmVjdGVkXCIhPT10aGlzLnR5cGUmJmUgaW4gbi5pbnx8XCJkaXJlY3RlZFwiIT09dGhpcy50eXBlJiZlIGluIG4udW5kaXJlY3RlZH0saS5hcmVPdXRib3VuZE5laWdoYm9ycz1mdW5jdGlvbih0LGUpe3Q9XCJcIit0LGU9XCJcIitlO3ZhciBuPXRoaXMuX25vZGVzLmdldCh0KTtpZighbil0aHJvdyBuZXcgSSgnR3JhcGguYXJlT3V0Ym91bmROZWlnaGJvcnM6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicuY29uY2F0KHQsJ1wiIG5vZGUgaW4gdGhlIGdyYXBoLicpKTtyZXR1cm5cInVuZGlyZWN0ZWRcIiE9PXRoaXMudHlwZSYmZSBpbiBuLm91dHx8XCJkaXJlY3RlZFwiIT09dGhpcy50eXBlJiZlIGluIG4udW5kaXJlY3RlZH0saS5pbkRlZ3JlZT1mdW5jdGlvbih0KXt0PVwiXCIrdDt2YXIgZT10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIWUpdGhyb3cgbmV3IEkoJ0dyYXBoLmluRGVncmVlOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuXCJ1bmRpcmVjdGVkXCI9PT10aGlzLnR5cGU/MDplLmluRGVncmVlfSxpLm91dERlZ3JlZT1mdW5jdGlvbih0KXt0PVwiXCIrdDt2YXIgZT10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIWUpdGhyb3cgbmV3IEkoJ0dyYXBoLm91dERlZ3JlZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3JldHVyblwidW5kaXJlY3RlZFwiPT09dGhpcy50eXBlPzA6ZS5vdXREZWdyZWV9LGkuZGlyZWN0ZWREZWdyZWU9ZnVuY3Rpb24odCl7dD1cIlwiK3Q7dmFyIGU9dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKCFlKXRocm93IG5ldyBJKCdHcmFwaC5kaXJlY3RlZERlZ3JlZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3JldHVyblwidW5kaXJlY3RlZFwiPT09dGhpcy50eXBlPzA6ZS5pbkRlZ3JlZStlLm91dERlZ3JlZX0saS51bmRpcmVjdGVkRGVncmVlPWZ1bmN0aW9uKHQpe3Q9XCJcIit0O3ZhciBlPXRoaXMuX25vZGVzLmdldCh0KTtpZighZSl0aHJvdyBuZXcgSSgnR3JhcGgudW5kaXJlY3RlZERlZ3JlZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3JldHVyblwiZGlyZWN0ZWRcIj09PXRoaXMudHlwZT8wOmUudW5kaXJlY3RlZERlZ3JlZX0saS5pbmJvdW5kRGVncmVlPWZ1bmN0aW9uKHQpe3Q9XCJcIit0O3ZhciBlPXRoaXMuX25vZGVzLmdldCh0KTtpZighZSl0aHJvdyBuZXcgSSgnR3JhcGguaW5ib3VuZERlZ3JlZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3ZhciBuPTA7cmV0dXJuXCJkaXJlY3RlZFwiIT09dGhpcy50eXBlJiYobis9ZS51bmRpcmVjdGVkRGVncmVlKSxcInVuZGlyZWN0ZWRcIiE9PXRoaXMudHlwZSYmKG4rPWUuaW5EZWdyZWUpLG59LGkub3V0Ym91bmREZWdyZWU9ZnVuY3Rpb24odCl7dD1cIlwiK3Q7dmFyIGU9dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKCFlKXRocm93IG5ldyBJKCdHcmFwaC5vdXRib3VuZERlZ3JlZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3ZhciBuPTA7cmV0dXJuXCJkaXJlY3RlZFwiIT09dGhpcy50eXBlJiYobis9ZS51bmRpcmVjdGVkRGVncmVlKSxcInVuZGlyZWN0ZWRcIiE9PXRoaXMudHlwZSYmKG4rPWUub3V0RGVncmVlKSxufSxpLmRlZ3JlZT1mdW5jdGlvbih0KXt0PVwiXCIrdDt2YXIgZT10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIWUpdGhyb3cgbmV3IEkoJ0dyYXBoLmRlZ3JlZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3ZhciBuPTA7cmV0dXJuXCJkaXJlY3RlZFwiIT09dGhpcy50eXBlJiYobis9ZS51bmRpcmVjdGVkRGVncmVlKSxcInVuZGlyZWN0ZWRcIiE9PXRoaXMudHlwZSYmKG4rPWUuaW5EZWdyZWUrZS5vdXREZWdyZWUpLG59LGkuaW5EZWdyZWVXaXRob3V0U2VsZkxvb3BzPWZ1bmN0aW9uKHQpe3Q9XCJcIit0O3ZhciBlPXRoaXMuX25vZGVzLmdldCh0KTtpZighZSl0aHJvdyBuZXcgSSgnR3JhcGguaW5EZWdyZWVXaXRob3V0U2VsZkxvb3BzOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7aWYoXCJ1bmRpcmVjdGVkXCI9PT10aGlzLnR5cGUpcmV0dXJuIDA7dmFyIG49ZS5pblt0XSxyPW4/dGhpcy5tdWx0aT9uLnNpemU6MTowO3JldHVybiBlLmluRGVncmVlLXJ9LGkub3V0RGVncmVlV2l0aG91dFNlbGZMb29wcz1mdW5jdGlvbih0KXt0PVwiXCIrdDt2YXIgZT10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIWUpdGhyb3cgbmV3IEkoJ0dyYXBoLm91dERlZ3JlZVdpdGhvdXRTZWxmTG9vcHM6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicuY29uY2F0KHQsJ1wiIG5vZGUgaW4gdGhlIGdyYXBoLicpKTtpZihcInVuZGlyZWN0ZWRcIj09PXRoaXMudHlwZSlyZXR1cm4gMDt2YXIgbj1lLm91dFt0XSxyPW4/dGhpcy5tdWx0aT9uLnNpemU6MTowO3JldHVybiBlLm91dERlZ3JlZS1yfSxpLmRpcmVjdGVkRGVncmVlV2l0aG91dFNlbGZMb29wcz1mdW5jdGlvbih0KXt0PVwiXCIrdDt2YXIgZT10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIWUpdGhyb3cgbmV3IEkoJ0dyYXBoLmRpcmVjdGVkRGVncmVlV2l0aG91dFNlbGZMb29wczogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO2lmKFwidW5kaXJlY3RlZFwiPT09dGhpcy50eXBlKXJldHVybiAwO3ZhciBuPWUub3V0W3RdLHI9bj90aGlzLm11bHRpP24uc2l6ZToxOjA7cmV0dXJuIGUuaW5EZWdyZWUrZS5vdXREZWdyZWUtMipyfSxpLnVuZGlyZWN0ZWREZWdyZWVXaXRob3V0U2VsZkxvb3BzPWZ1bmN0aW9uKHQpe3Q9XCJcIit0O3ZhciBlPXRoaXMuX25vZGVzLmdldCh0KTtpZighZSl0aHJvdyBuZXcgSSgnR3JhcGgudW5kaXJlY3RlZERlZ3JlZVdpdGhvdXRTZWxmTG9vcHM6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicuY29uY2F0KHQsJ1wiIG5vZGUgaW4gdGhlIGdyYXBoLicpKTtpZihcImRpcmVjdGVkXCI9PT10aGlzLnR5cGUpcmV0dXJuIDA7dmFyIG49ZS51bmRpcmVjdGVkW3RdLHI9bj90aGlzLm11bHRpP24uc2l6ZToxOjA7cmV0dXJuIGUudW5kaXJlY3RlZERlZ3JlZS0yKnJ9LGkuaW5ib3VuZERlZ3JlZVdpdGhvdXRTZWxmTG9vcHM9ZnVuY3Rpb24odCl7dD1cIlwiK3Q7dmFyIGUsbj10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIW4pdGhyb3cgbmV3IEkoJ0dyYXBoLmluYm91bmREZWdyZWVXaXRob3V0U2VsZkxvb3BzOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7dmFyIHI9MCxpPTA7cmV0dXJuXCJkaXJlY3RlZFwiIT09dGhpcy50eXBlJiYocis9bi51bmRpcmVjdGVkRGVncmVlLGkrPTIqKChlPW4udW5kaXJlY3RlZFt0XSk/dGhpcy5tdWx0aT9lLnNpemU6MTowKSksXCJ1bmRpcmVjdGVkXCIhPT10aGlzLnR5cGUmJihyKz1uLmluRGVncmVlLGkrPShlPW4ub3V0W3RdKT90aGlzLm11bHRpP2Uuc2l6ZToxOjApLHItaX0saS5vdXRib3VuZERlZ3JlZVdpdGhvdXRTZWxmTG9vcHM9ZnVuY3Rpb24odCl7dD1cIlwiK3Q7dmFyIGUsbj10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIW4pdGhyb3cgbmV3IEkoJ0dyYXBoLm91dGJvdW5kRGVncmVlV2l0aG91dFNlbGZMb29wczogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3ZhciByPTAsaT0wO3JldHVyblwiZGlyZWN0ZWRcIiE9PXRoaXMudHlwZSYmKHIrPW4udW5kaXJlY3RlZERlZ3JlZSxpKz0yKigoZT1uLnVuZGlyZWN0ZWRbdF0pP3RoaXMubXVsdGk/ZS5zaXplOjE6MCkpLFwidW5kaXJlY3RlZFwiIT09dGhpcy50eXBlJiYocis9bi5vdXREZWdyZWUsaSs9KGU9bi5pblt0XSk/dGhpcy5tdWx0aT9lLnNpemU6MTowKSxyLWl9LGkuZGVncmVlV2l0aG91dFNlbGZMb29wcz1mdW5jdGlvbih0KXt0PVwiXCIrdDt2YXIgZSxuPXRoaXMuX25vZGVzLmdldCh0KTtpZighbil0aHJvdyBuZXcgSSgnR3JhcGguZGVncmVlV2l0aG91dFNlbGZMb29wczogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3ZhciByPTAsaT0wO3JldHVyblwiZGlyZWN0ZWRcIiE9PXRoaXMudHlwZSYmKHIrPW4udW5kaXJlY3RlZERlZ3JlZSxpKz0yKigoZT1uLnVuZGlyZWN0ZWRbdF0pP3RoaXMubXVsdGk/ZS5zaXplOjE6MCkpLFwidW5kaXJlY3RlZFwiIT09dGhpcy50eXBlJiYocis9bi5pbkRlZ3JlZStuLm91dERlZ3JlZSxpKz0yKigoZT1uLm91dFt0XSk/dGhpcy5tdWx0aT9lLnNpemU6MTowKSksci1pfSxpLnNvdXJjZT1mdW5jdGlvbih0KXt0PVwiXCIrdDt2YXIgZT10aGlzLl9lZGdlcy5nZXQodCk7aWYoIWUpdGhyb3cgbmV3IEkoJ0dyYXBoLnNvdXJjZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgZWRnZSBpbiB0aGUgZ3JhcGguJykpO3JldHVybiBlLnNvdXJjZS5rZXl9LGkudGFyZ2V0PWZ1bmN0aW9uKHQpe3Q9XCJcIit0O3ZhciBlPXRoaXMuX2VkZ2VzLmdldCh0KTtpZighZSl0aHJvdyBuZXcgSSgnR3JhcGgudGFyZ2V0OiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBlZGdlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuIGUudGFyZ2V0LmtleX0saS5leHRyZW1pdGllcz1mdW5jdGlvbih0KXt0PVwiXCIrdDt2YXIgZT10aGlzLl9lZGdlcy5nZXQodCk7aWYoIWUpdGhyb3cgbmV3IEkoJ0dyYXBoLmV4dHJlbWl0aWVzOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBlZGdlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuW2Uuc291cmNlLmtleSxlLnRhcmdldC5rZXldfSxpLm9wcG9zaXRlPWZ1bmN0aW9uKHQsZSl7dD1cIlwiK3QsZT1cIlwiK2U7dmFyIG49dGhpcy5fZWRnZXMuZ2V0KGUpO2lmKCFuKXRocm93IG5ldyBJKCdHcmFwaC5vcHBvc2l0ZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQoZSwnXCIgZWRnZSBpbiB0aGUgZ3JhcGguJykpO3ZhciByPW4uc291cmNlLmtleSxpPW4udGFyZ2V0LmtleTtpZih0PT09cilyZXR1cm4gaTtpZih0PT09aSlyZXR1cm4gcjt0aHJvdyBuZXcgSSgnR3JhcGgub3Bwb3NpdGU6IHRoZSBcIicuY29uY2F0KHQsJ1wiIG5vZGUgaXMgbm90IGF0dGFjaGVkIHRvIHRoZSBcIicpLmNvbmNhdChlLCdcIiBlZGdlICgnKS5jb25jYXQocixcIiwgXCIpLmNvbmNhdChpLFwiKS5cIikpfSxpLmhhc0V4dHJlbWl0eT1mdW5jdGlvbih0LGUpe3Q9XCJcIit0LGU9XCJcIitlO3ZhciBuPXRoaXMuX2VkZ2VzLmdldCh0KTtpZighbil0aHJvdyBuZXcgSSgnR3JhcGguaGFzRXh0cmVtaXR5OiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBlZGdlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuIG4uc291cmNlLmtleT09PWV8fG4udGFyZ2V0LmtleT09PWV9LGkuaXNVbmRpcmVjdGVkPWZ1bmN0aW9uKHQpe3Q9XCJcIit0O3ZhciBlPXRoaXMuX2VkZ2VzLmdldCh0KTtpZighZSl0aHJvdyBuZXcgSSgnR3JhcGguaXNVbmRpcmVjdGVkOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBlZGdlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuIGUudW5kaXJlY3RlZH0saS5pc0RpcmVjdGVkPWZ1bmN0aW9uKHQpe3Q9XCJcIit0O3ZhciBlPXRoaXMuX2VkZ2VzLmdldCh0KTtpZighZSl0aHJvdyBuZXcgSSgnR3JhcGguaXNEaXJlY3RlZDogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQodCwnXCIgZWRnZSBpbiB0aGUgZ3JhcGguJykpO3JldHVybiFlLnVuZGlyZWN0ZWR9LGkuaXNTZWxmTG9vcD1mdW5jdGlvbih0KXt0PVwiXCIrdDt2YXIgZT10aGlzLl9lZGdlcy5nZXQodCk7aWYoIWUpdGhyb3cgbmV3IEkoJ0dyYXBoLmlzU2VsZkxvb3A6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicuY29uY2F0KHQsJ1wiIGVkZ2UgaW4gdGhlIGdyYXBoLicpKTtyZXR1cm4gZS5zb3VyY2U9PT1lLnRhcmdldH0saS5hZGROb2RlPWZ1bmN0aW9uKHQsZSl7dmFyIG49ZnVuY3Rpb24odCxlLG4pe2lmKG4mJiFoKG4pKXRocm93IG5ldyBGKCdHcmFwaC5hZGROb2RlOiBpbnZhbGlkIGF0dHJpYnV0ZXMuIEV4cGVjdGluZyBhbiBvYmplY3QgYnV0IGdvdCBcIicuY29uY2F0KG4sJ1wiJykpO2lmKGU9XCJcIitlLG49bnx8e30sdC5fbm9kZXMuaGFzKGUpKXRocm93IG5ldyBZKCdHcmFwaC5hZGROb2RlOiB0aGUgXCInLmNvbmNhdChlLCdcIiBub2RlIGFscmVhZHkgZXhpc3QgaW4gdGhlIGdyYXBoLicpKTt2YXIgcj1uZXcgdC5Ob2RlRGF0YUNsYXNzKGUsbik7cmV0dXJuIHQuX25vZGVzLnNldChlLHIpLHQuZW1pdChcIm5vZGVBZGRlZFwiLHtrZXk6ZSxhdHRyaWJ1dGVzOm59KSxyfSh0aGlzLHQsZSk7cmV0dXJuIG4ua2V5fSxpLm1lcmdlTm9kZT1mdW5jdGlvbih0LGUpe2lmKGUmJiFoKGUpKXRocm93IG5ldyBGKCdHcmFwaC5tZXJnZU5vZGU6IGludmFsaWQgYXR0cmlidXRlcy4gRXhwZWN0aW5nIGFuIG9iamVjdCBidXQgZ290IFwiJy5jb25jYXQoZSwnXCInKSk7dD1cIlwiK3QsZT1lfHx7fTt2YXIgbj10aGlzLl9ub2Rlcy5nZXQodCk7cmV0dXJuIG4/KGUmJihjKG4uYXR0cmlidXRlcyxlKSx0aGlzLmVtaXQoXCJub2RlQXR0cmlidXRlc1VwZGF0ZWRcIix7dHlwZTpcIm1lcmdlXCIsa2V5OnQsYXR0cmlidXRlczpuLmF0dHJpYnV0ZXMsZGF0YTplfSkpLFt0LCExXSk6KG49bmV3IHRoaXMuTm9kZURhdGFDbGFzcyh0LGUpLHRoaXMuX25vZGVzLnNldCh0LG4pLHRoaXMuZW1pdChcIm5vZGVBZGRlZFwiLHtrZXk6dCxhdHRyaWJ1dGVzOmV9KSxbdCwhMF0pfSxpLnVwZGF0ZU5vZGU9ZnVuY3Rpb24odCxlKXtpZihlJiZcImZ1bmN0aW9uXCIhPXR5cGVvZiBlKXRocm93IG5ldyBGKCdHcmFwaC51cGRhdGVOb2RlOiBpbnZhbGlkIHVwZGF0ZXIgZnVuY3Rpb24uIEV4cGVjdGluZyBhIGZ1bmN0aW9uIGJ1dCBnb3QgXCInLmNvbmNhdChlLCdcIicpKTt0PVwiXCIrdDt2YXIgbj10aGlzLl9ub2Rlcy5nZXQodCk7aWYobil7aWYoZSl7dmFyIHI9bi5hdHRyaWJ1dGVzO24uYXR0cmlidXRlcz1lKHIpLHRoaXMuZW1pdChcIm5vZGVBdHRyaWJ1dGVzVXBkYXRlZFwiLHt0eXBlOlwicmVwbGFjZVwiLGtleTp0LGF0dHJpYnV0ZXM6bi5hdHRyaWJ1dGVzfSl9cmV0dXJuW3QsITFdfXZhciBpPWU/ZSh7fSk6e307cmV0dXJuIG49bmV3IHRoaXMuTm9kZURhdGFDbGFzcyh0LGkpLHRoaXMuX25vZGVzLnNldCh0LG4pLHRoaXMuZW1pdChcIm5vZGVBZGRlZFwiLHtrZXk6dCxhdHRyaWJ1dGVzOml9KSxbdCwhMF19LGkuZHJvcE5vZGU9ZnVuY3Rpb24odCl7dD1cIlwiK3Q7dmFyIGUsbj10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIW4pdGhyb3cgbmV3IEkoJ0dyYXBoLmRyb3BOb2RlOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7aWYoXCJ1bmRpcmVjdGVkXCIhPT10aGlzLnR5cGUpe2Zvcih2YXIgciBpbiBuLm91dCl7ZT1uLm91dFtyXTtkb3tNdCh0aGlzLGUpLGU9ZS5uZXh0fXdoaWxlKGUpfWZvcih2YXIgaSBpbiBuLmluKXtlPW4uaW5baV07ZG97TXQodGhpcyxlKSxlPWUubmV4dH13aGlsZShlKX19aWYoXCJkaXJlY3RlZFwiIT09dGhpcy50eXBlKWZvcih2YXIgbyBpbiBuLnVuZGlyZWN0ZWQpe2U9bi51bmRpcmVjdGVkW29dO2Rve010KHRoaXMsZSksZT1lLm5leHR9d2hpbGUoZSl9dGhpcy5fbm9kZXMuZGVsZXRlKHQpLHRoaXMuZW1pdChcIm5vZGVEcm9wcGVkXCIse2tleTp0LGF0dHJpYnV0ZXM6bi5hdHRyaWJ1dGVzfSl9LGkuZHJvcEVkZ2U9ZnVuY3Rpb24odCl7dmFyIGU7aWYoYXJndW1lbnRzLmxlbmd0aD4xKXt2YXIgbj1cIlwiK2FyZ3VtZW50c1swXSxyPVwiXCIrYXJndW1lbnRzWzFdO2lmKCEoZT1zKHRoaXMsbixyLHRoaXMudHlwZSkpKXRocm93IG5ldyBJKCdHcmFwaC5kcm9wRWRnZTogY291bGQgbm90IGZpbmQgdGhlIFwiJy5jb25jYXQobiwnXCIgLT4gXCInKS5jb25jYXQociwnXCIgZWRnZSBpbiB0aGUgZ3JhcGguJykpfWVsc2UgaWYodD1cIlwiK3QsIShlPXRoaXMuX2VkZ2VzLmdldCh0KSkpdGhyb3cgbmV3IEkoJ0dyYXBoLmRyb3BFZGdlOiBjb3VsZCBub3QgZmluZCB0aGUgXCInLmNvbmNhdCh0LCdcIiBlZGdlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuIE10KHRoaXMsZSksdGhpc30saS5kcm9wRGlyZWN0ZWRFZGdlPWZ1bmN0aW9uKHQsZSl7aWYoYXJndW1lbnRzLmxlbmd0aDwyKXRocm93IG5ldyBZKFwiR3JhcGguZHJvcERpcmVjdGVkRWRnZTogaXQgZG9lcyBub3QgbWFrZSBzZW5zZSB0byB0cnkgYW5kIGRyb3AgYSBkaXJlY3RlZCBlZGdlIGJ5IGtleS4gV2hhdCBpZiB0aGUgZWRnZSB3aXRoIHRoaXMga2V5IGlzIHVuZGlyZWN0ZWQ/IFVzZSAjLmRyb3BFZGdlIGZvciB0aGlzIHB1cnBvc2UgaW5zdGVhZC5cIik7aWYodGhpcy5tdWx0aSl0aHJvdyBuZXcgWShcIkdyYXBoLmRyb3BEaXJlY3RlZEVkZ2U6IGNhbm5vdCB1c2UgYSB7c291cmNlLHRhcmdldH0gY29tYm8gd2hlbiBkcm9wcGluZyBhbiBlZGdlIGluIGEgTXVsdGlHcmFwaCBzaW5jZSB3ZSBjYW5ub3QgaW5mZXIgdGhlIG9uZSB5b3Ugd2FudCB0byBkZWxldGUgYXMgdGhlcmUgY291bGQgYmUgbXVsdGlwbGUgb25lcy5cIik7dmFyIG49cyh0aGlzLHQ9XCJcIit0LGU9XCJcIitlLFwiZGlyZWN0ZWRcIik7aWYoIW4pdGhyb3cgbmV3IEkoJ0dyYXBoLmRyb3BEaXJlY3RlZEVkZ2U6IGNvdWxkIG5vdCBmaW5kIGEgXCInLmNvbmNhdCh0LCdcIiAtPiBcIicpLmNvbmNhdChlLCdcIiBlZGdlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuIE10KHRoaXMsbiksdGhpc30saS5kcm9wVW5kaXJlY3RlZEVkZ2U9ZnVuY3Rpb24odCxlKXtpZihhcmd1bWVudHMubGVuZ3RoPDIpdGhyb3cgbmV3IFkoXCJHcmFwaC5kcm9wVW5kaXJlY3RlZEVkZ2U6IGl0IGRvZXMgbm90IG1ha2Ugc2Vuc2UgdG8gZHJvcCBhIGRpcmVjdGVkIGVkZ2UgYnkga2V5LiBXaGF0IGlmIHRoZSBlZGdlIHdpdGggdGhpcyBrZXkgaXMgdW5kaXJlY3RlZD8gVXNlICMuZHJvcEVkZ2UgZm9yIHRoaXMgcHVycG9zZSBpbnN0ZWFkLlwiKTtpZih0aGlzLm11bHRpKXRocm93IG5ldyBZKFwiR3JhcGguZHJvcFVuZGlyZWN0ZWRFZGdlOiBjYW5ub3QgdXNlIGEge3NvdXJjZSx0YXJnZXR9IGNvbWJvIHdoZW4gZHJvcHBpbmcgYW4gZWRnZSBpbiBhIE11bHRpR3JhcGggc2luY2Ugd2UgY2Fubm90IGluZmVyIHRoZSBvbmUgeW91IHdhbnQgdG8gZGVsZXRlIGFzIHRoZXJlIGNvdWxkIGJlIG11bHRpcGxlIG9uZXMuXCIpO3ZhciBuPXModGhpcyx0LGUsXCJ1bmRpcmVjdGVkXCIpO2lmKCFuKXRocm93IG5ldyBJKCdHcmFwaC5kcm9wVW5kaXJlY3RlZEVkZ2U6IGNvdWxkIG5vdCBmaW5kIGEgXCInLmNvbmNhdCh0LCdcIiAtPiBcIicpLmNvbmNhdChlLCdcIiBlZGdlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuIE10KHRoaXMsbiksdGhpc30saS5jbGVhcj1mdW5jdGlvbigpe3RoaXMuX2VkZ2VzLmNsZWFyKCksdGhpcy5fbm9kZXMuY2xlYXIoKSx0aGlzLl9yZXNldEluc3RhbmNlQ291bnRlcnMoKSx0aGlzLmVtaXQoXCJjbGVhcmVkXCIpfSxpLmNsZWFyRWRnZXM9ZnVuY3Rpb24oKXtmb3IodmFyIHQsZT10aGlzLl9ub2Rlcy52YWx1ZXMoKTshMCE9PSh0PWUubmV4dCgpKS5kb25lOyl0LnZhbHVlLmNsZWFyKCk7dGhpcy5fZWRnZXMuY2xlYXIoKSx0aGlzLl9yZXNldEluc3RhbmNlQ291bnRlcnMoKSx0aGlzLmVtaXQoXCJlZGdlc0NsZWFyZWRcIil9LGkuZ2V0QXR0cmlidXRlPWZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9hdHRyaWJ1dGVzW3RdfSxpLmdldEF0dHJpYnV0ZXM9ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fYXR0cmlidXRlc30saS5oYXNBdHRyaWJ1dGU9ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2F0dHJpYnV0ZXMuaGFzT3duUHJvcGVydHkodCl9LGkuc2V0QXR0cmlidXRlPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX2F0dHJpYnV0ZXNbdF09ZSx0aGlzLmVtaXQoXCJhdHRyaWJ1dGVzVXBkYXRlZFwiLHt0eXBlOlwic2V0XCIsYXR0cmlidXRlczp0aGlzLl9hdHRyaWJ1dGVzLG5hbWU6dH0pLHRoaXN9LGkudXBkYXRlQXR0cmlidXRlPWZ1bmN0aW9uKHQsZSl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgZSl0aHJvdyBuZXcgRihcIkdyYXBoLnVwZGF0ZUF0dHJpYnV0ZTogdXBkYXRlciBzaG91bGQgYmUgYSBmdW5jdGlvbi5cIik7dmFyIG49dGhpcy5fYXR0cmlidXRlc1t0XTtyZXR1cm4gdGhpcy5fYXR0cmlidXRlc1t0XT1lKG4pLHRoaXMuZW1pdChcImF0dHJpYnV0ZXNVcGRhdGVkXCIse3R5cGU6XCJzZXRcIixhdHRyaWJ1dGVzOnRoaXMuX2F0dHJpYnV0ZXMsbmFtZTp0fSksdGhpc30saS5yZW1vdmVBdHRyaWJ1dGU9ZnVuY3Rpb24odCl7cmV0dXJuIGRlbGV0ZSB0aGlzLl9hdHRyaWJ1dGVzW3RdLHRoaXMuZW1pdChcImF0dHJpYnV0ZXNVcGRhdGVkXCIse3R5cGU6XCJyZW1vdmVcIixhdHRyaWJ1dGVzOnRoaXMuX2F0dHJpYnV0ZXMsbmFtZTp0fSksdGhpc30saS5yZXBsYWNlQXR0cmlidXRlcz1mdW5jdGlvbih0KXtpZighaCh0KSl0aHJvdyBuZXcgRihcIkdyYXBoLnJlcGxhY2VBdHRyaWJ1dGVzOiBwcm92aWRlZCBhdHRyaWJ1dGVzIGFyZSBub3QgYSBwbGFpbiBvYmplY3QuXCIpO3JldHVybiB0aGlzLl9hdHRyaWJ1dGVzPXQsdGhpcy5lbWl0KFwiYXR0cmlidXRlc1VwZGF0ZWRcIix7dHlwZTpcInJlcGxhY2VcIixhdHRyaWJ1dGVzOnRoaXMuX2F0dHJpYnV0ZXN9KSx0aGlzfSxpLm1lcmdlQXR0cmlidXRlcz1mdW5jdGlvbih0KXtpZighaCh0KSl0aHJvdyBuZXcgRihcIkdyYXBoLm1lcmdlQXR0cmlidXRlczogcHJvdmlkZWQgYXR0cmlidXRlcyBhcmUgbm90IGEgcGxhaW4gb2JqZWN0LlwiKTtyZXR1cm4gYyh0aGlzLl9hdHRyaWJ1dGVzLHQpLHRoaXMuZW1pdChcImF0dHJpYnV0ZXNVcGRhdGVkXCIse3R5cGU6XCJtZXJnZVwiLGF0dHJpYnV0ZXM6dGhpcy5fYXR0cmlidXRlcyxkYXRhOnR9KSx0aGlzfSxpLnVwZGF0ZUF0dHJpYnV0ZXM9ZnVuY3Rpb24odCl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdCl0aHJvdyBuZXcgRihcIkdyYXBoLnVwZGF0ZUF0dHJpYnV0ZXM6IHByb3ZpZGVkIHVwZGF0ZXIgaXMgbm90IGEgZnVuY3Rpb24uXCIpO3JldHVybiB0aGlzLl9hdHRyaWJ1dGVzPXQodGhpcy5fYXR0cmlidXRlcyksdGhpcy5lbWl0KFwiYXR0cmlidXRlc1VwZGF0ZWRcIix7dHlwZTpcInVwZGF0ZVwiLGF0dHJpYnV0ZXM6dGhpcy5fYXR0cmlidXRlc30pLHRoaXN9LGkudXBkYXRlRWFjaE5vZGVBdHRyaWJ1dGVzPWZ1bmN0aW9uKHQsZSl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdCl0aHJvdyBuZXcgRihcIkdyYXBoLnVwZGF0ZUVhY2hOb2RlQXR0cmlidXRlczogZXhwZWN0aW5nIGFuIHVwZGF0ZXIgZnVuY3Rpb24uXCIpO2lmKGUmJiFnKGUpKXRocm93IG5ldyBGKFwiR3JhcGgudXBkYXRlRWFjaE5vZGVBdHRyaWJ1dGVzOiBpbnZhbGlkIGhpbnRzLiBFeHBlY3RpbmcgYW4gb2JqZWN0IGhhdmluZyB0aGUgZm9sbG93aW5nIHNoYXBlOiB7YXR0cmlidXRlcz86IFtzdHJpbmddfVwiKTtmb3IodmFyIG4scixpPXRoaXMuX25vZGVzLnZhbHVlcygpOyEwIT09KG49aS5uZXh0KCkpLmRvbmU7KShyPW4udmFsdWUpLmF0dHJpYnV0ZXM9dChyLmtleSxyLmF0dHJpYnV0ZXMpO3RoaXMuZW1pdChcImVhY2hOb2RlQXR0cmlidXRlc1VwZGF0ZWRcIix7aGludHM6ZXx8bnVsbH0pfSxpLnVwZGF0ZUVhY2hFZGdlQXR0cmlidXRlcz1mdW5jdGlvbih0LGUpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHQpdGhyb3cgbmV3IEYoXCJHcmFwaC51cGRhdGVFYWNoRWRnZUF0dHJpYnV0ZXM6IGV4cGVjdGluZyBhbiB1cGRhdGVyIGZ1bmN0aW9uLlwiKTtpZihlJiYhZyhlKSl0aHJvdyBuZXcgRihcIkdyYXBoLnVwZGF0ZUVhY2hFZGdlQXR0cmlidXRlczogaW52YWxpZCBoaW50cy4gRXhwZWN0aW5nIGFuIG9iamVjdCBoYXZpbmcgdGhlIGZvbGxvd2luZyBzaGFwZToge2F0dHJpYnV0ZXM/OiBbc3RyaW5nXX1cIik7Zm9yKHZhciBuLHIsaSxvLGE9dGhpcy5fZWRnZXMudmFsdWVzKCk7ITAhPT0obj1hLm5leHQoKSkuZG9uZTspaT0ocj1uLnZhbHVlKS5zb3VyY2Usbz1yLnRhcmdldCxyLmF0dHJpYnV0ZXM9dChyLmtleSxyLmF0dHJpYnV0ZXMsaS5rZXksby5rZXksaS5hdHRyaWJ1dGVzLG8uYXR0cmlidXRlcyxyLnVuZGlyZWN0ZWQpO3RoaXMuZW1pdChcImVhY2hFZGdlQXR0cmlidXRlc1VwZGF0ZWRcIix7aGludHM6ZXx8bnVsbH0pfSxpLmZvckVhY2hBZGphY2VuY3lFbnRyeT1mdW5jdGlvbih0KXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiB0KXRocm93IG5ldyBGKFwiR3JhcGguZm9yRWFjaEFkamFjZW5jeUVudHJ5OiBleHBlY3RpbmcgYSBjYWxsYmFjay5cIik7RXQoITEsITEsITEsdGhpcyx0KX0saS5mb3JFYWNoQWRqYWNlbmN5RW50cnlXaXRoT3JwaGFucz1mdW5jdGlvbih0KXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiB0KXRocm93IG5ldyBGKFwiR3JhcGguZm9yRWFjaEFkamFjZW5jeUVudHJ5V2l0aE9ycGhhbnM6IGV4cGVjdGluZyBhIGNhbGxiYWNrLlwiKTtFdCghMSwhMSwhMCx0aGlzLHQpfSxpLmZvckVhY2hBc3N5bWV0cmljQWRqYWNlbmN5RW50cnk9ZnVuY3Rpb24odCl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdCl0aHJvdyBuZXcgRihcIkdyYXBoLmZvckVhY2hBc3N5bWV0cmljQWRqYWNlbmN5RW50cnk6IGV4cGVjdGluZyBhIGNhbGxiYWNrLlwiKTtFdCghMSwhMCwhMSx0aGlzLHQpfSxpLmZvckVhY2hBc3N5bWV0cmljQWRqYWNlbmN5RW50cnlXaXRoT3JwaGFucz1mdW5jdGlvbih0KXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiB0KXRocm93IG5ldyBGKFwiR3JhcGguZm9yRWFjaEFzc3ltZXRyaWNBZGphY2VuY3lFbnRyeVdpdGhPcnBoYW5zOiBleHBlY3RpbmcgYSBjYWxsYmFjay5cIik7RXQoITEsITAsITAsdGhpcyx0KX0saS5ub2Rlcz1mdW5jdGlvbigpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIEFycmF5LmZyb20/QXJyYXkuZnJvbSh0aGlzLl9ub2Rlcy5rZXlzKCkpOlQodGhpcy5fbm9kZXMua2V5cygpLHRoaXMuX25vZGVzLnNpemUpfSxpLmZvckVhY2hOb2RlPWZ1bmN0aW9uKHQpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHQpdGhyb3cgbmV3IEYoXCJHcmFwaC5mb3JFYWNoTm9kZTogZXhwZWN0aW5nIGEgY2FsbGJhY2suXCIpO2Zvcih2YXIgZSxuLHI9dGhpcy5fbm9kZXMudmFsdWVzKCk7ITAhPT0oZT1yLm5leHQoKSkuZG9uZTspdCgobj1lLnZhbHVlKS5rZXksbi5hdHRyaWJ1dGVzKX0saS5maW5kTm9kZT1mdW5jdGlvbih0KXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiB0KXRocm93IG5ldyBGKFwiR3JhcGguZmluZE5vZGU6IGV4cGVjdGluZyBhIGNhbGxiYWNrLlwiKTtmb3IodmFyIGUsbixyPXRoaXMuX25vZGVzLnZhbHVlcygpOyEwIT09KGU9ci5uZXh0KCkpLmRvbmU7KWlmKHQoKG49ZS52YWx1ZSkua2V5LG4uYXR0cmlidXRlcykpcmV0dXJuIG4ua2V5fSxpLm1hcE5vZGVzPWZ1bmN0aW9uKHQpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHQpdGhyb3cgbmV3IEYoXCJHcmFwaC5tYXBOb2RlOiBleHBlY3RpbmcgYSBjYWxsYmFjay5cIik7Zm9yKHZhciBlLG4scj10aGlzLl9ub2Rlcy52YWx1ZXMoKSxpPW5ldyBBcnJheSh0aGlzLm9yZGVyKSxvPTA7ITAhPT0oZT1yLm5leHQoKSkuZG9uZTspbj1lLnZhbHVlLGlbbysrXT10KG4ua2V5LG4uYXR0cmlidXRlcyk7cmV0dXJuIGl9LGkuc29tZU5vZGU9ZnVuY3Rpb24odCl7aWYoXCJmdW5jdGlvblwiIT10eXBlb2YgdCl0aHJvdyBuZXcgRihcIkdyYXBoLnNvbWVOb2RlOiBleHBlY3RpbmcgYSBjYWxsYmFjay5cIik7Zm9yKHZhciBlLG4scj10aGlzLl9ub2Rlcy52YWx1ZXMoKTshMCE9PShlPXIubmV4dCgpKS5kb25lOylpZih0KChuPWUudmFsdWUpLmtleSxuLmF0dHJpYnV0ZXMpKXJldHVybiEwO3JldHVybiExfSxpLmV2ZXJ5Tm9kZT1mdW5jdGlvbih0KXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiB0KXRocm93IG5ldyBGKFwiR3JhcGguZXZlcnlOb2RlOiBleHBlY3RpbmcgYSBjYWxsYmFjay5cIik7Zm9yKHZhciBlLG4scj10aGlzLl9ub2Rlcy52YWx1ZXMoKTshMCE9PShlPXIubmV4dCgpKS5kb25lOylpZighdCgobj1lLnZhbHVlKS5rZXksbi5hdHRyaWJ1dGVzKSlyZXR1cm4hMTtyZXR1cm4hMH0saS5maWx0ZXJOb2Rlcz1mdW5jdGlvbih0KXtpZihcImZ1bmN0aW9uXCIhPXR5cGVvZiB0KXRocm93IG5ldyBGKFwiR3JhcGguZmlsdGVyTm9kZXM6IGV4cGVjdGluZyBhIGNhbGxiYWNrLlwiKTtmb3IodmFyIGUsbixyPXRoaXMuX25vZGVzLnZhbHVlcygpLGk9W107ITAhPT0oZT1yLm5leHQoKSkuZG9uZTspdCgobj1lLnZhbHVlKS5rZXksbi5hdHRyaWJ1dGVzKSYmaS5wdXNoKG4ua2V5KTtyZXR1cm4gaX0saS5yZWR1Y2VOb2Rlcz1mdW5jdGlvbih0LGUpe2lmKFwiZnVuY3Rpb25cIiE9dHlwZW9mIHQpdGhyb3cgbmV3IEYoXCJHcmFwaC5yZWR1Y2VOb2RlczogZXhwZWN0aW5nIGEgY2FsbGJhY2suXCIpO2lmKGFyZ3VtZW50cy5sZW5ndGg8Mil0aHJvdyBuZXcgRihcIkdyYXBoLnJlZHVjZU5vZGVzOiBtaXNzaW5nIGluaXRpYWwgdmFsdWUuIFlvdSBtdXN0IHByb3ZpZGUgaXQgYmVjYXVzZSB0aGUgY2FsbGJhY2sgdGFrZXMgbW9yZSB0aGFuIG9uZSBhcmd1bWVudCBhbmQgd2UgY2Fubm90IGluZmVyIHRoZSBpbml0aWFsIHZhbHVlIGZyb20gdGhlIGZpcnN0IGl0ZXJhdGlvbiwgYXMgeW91IGNvdWxkIHdpdGggYSBzaW1wbGUgYXJyYXkuXCIpO2Zvcih2YXIgbixyLGk9ZSxvPXRoaXMuX25vZGVzLnZhbHVlcygpOyEwIT09KG49by5uZXh0KCkpLmRvbmU7KWk9dChpLChyPW4udmFsdWUpLmtleSxyLmF0dHJpYnV0ZXMpO3JldHVybiBpfSxpLm5vZGVFbnRyaWVzPWZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fbm9kZXMudmFsdWVzKCk7cmV0dXJuIG5ldyBPKChmdW5jdGlvbigpe3ZhciBlPXQubmV4dCgpO2lmKGUuZG9uZSlyZXR1cm4gZTt2YXIgbj1lLnZhbHVlO3JldHVybnt2YWx1ZTp7bm9kZTpuLmtleSxhdHRyaWJ1dGVzOm4uYXR0cmlidXRlc30sZG9uZTohMX19KSl9LGkuZXhwb3J0PWZ1bmN0aW9uKCl7dmFyIHQ9bmV3IEFycmF5KHRoaXMuX25vZGVzLnNpemUpLGU9MDt0aGlzLl9ub2Rlcy5mb3JFYWNoKChmdW5jdGlvbihuLHIpe3RbZSsrXT1mdW5jdGlvbih0LGUpe3ZhciBuPXtrZXk6dH07cmV0dXJuIHAoZS5hdHRyaWJ1dGVzKXx8KG4uYXR0cmlidXRlcz1jKHt9LGUuYXR0cmlidXRlcykpLG59KHIsbil9KSk7dmFyIG49bmV3IEFycmF5KHRoaXMuX2VkZ2VzLnNpemUpO3JldHVybiBlPTAsdGhpcy5fZWRnZXMuZm9yRWFjaCgoZnVuY3Rpb24odCxyKXtuW2UrK109ZnVuY3Rpb24odCxlKXt2YXIgbj17a2V5OnQsc291cmNlOmUuc291cmNlLmtleSx0YXJnZXQ6ZS50YXJnZXQua2V5fTtyZXR1cm4gcChlLmF0dHJpYnV0ZXMpfHwobi5hdHRyaWJ1dGVzPWMoe30sZS5hdHRyaWJ1dGVzKSksZS51bmRpcmVjdGVkJiYobi51bmRpcmVjdGVkPSEwKSxufShyLHQpfSkpLHtvcHRpb25zOnt0eXBlOnRoaXMudHlwZSxtdWx0aTp0aGlzLm11bHRpLGFsbG93U2VsZkxvb3BzOnRoaXMuYWxsb3dTZWxmTG9vcHN9LGF0dHJpYnV0ZXM6dGhpcy5nZXRBdHRyaWJ1dGVzKCksbm9kZXM6dCxlZGdlczpufX0saS5pbXBvcnQ9ZnVuY3Rpb24odCl7dmFyIGUsbixyLGksbyxhPXRoaXMsdT1hcmd1bWVudHMubGVuZ3RoPjEmJnZvaWQgMCE9PWFyZ3VtZW50c1sxXSYmYXJndW1lbnRzWzFdO2lmKGQodCkpcmV0dXJuIHQuZm9yRWFjaE5vZGUoKGZ1bmN0aW9uKHQsZSl7dT9hLm1lcmdlTm9kZSh0LGUpOmEuYWRkTm9kZSh0LGUpfSkpLHQuZm9yRWFjaEVkZ2UoKGZ1bmN0aW9uKHQsZSxuLHIsaSxvLGMpe3U/Yz9hLm1lcmdlVW5kaXJlY3RlZEVkZ2VXaXRoS2V5KHQsbixyLGUpOmEubWVyZ2VEaXJlY3RlZEVkZ2VXaXRoS2V5KHQsbixyLGUpOmM/YS5hZGRVbmRpcmVjdGVkRWRnZVdpdGhLZXkodCxuLHIsZSk6YS5hZGREaXJlY3RlZEVkZ2VXaXRoS2V5KHQsbixyLGUpfSkpLHRoaXM7aWYoIWgodCkpdGhyb3cgbmV3IEYoXCJHcmFwaC5pbXBvcnQ6IGludmFsaWQgYXJndW1lbnQuIEV4cGVjdGluZyBhIHNlcmlhbGl6ZWQgZ3JhcGggb3IsIGFsdGVybmF0aXZlbHksIGEgR3JhcGggaW5zdGFuY2UuXCIpO2lmKHQuYXR0cmlidXRlcyl7aWYoIWgodC5hdHRyaWJ1dGVzKSl0aHJvdyBuZXcgRihcIkdyYXBoLmltcG9ydDogaW52YWxpZCBhdHRyaWJ1dGVzLiBFeHBlY3RpbmcgYSBwbGFpbiBvYmplY3QuXCIpO3U/dGhpcy5tZXJnZUF0dHJpYnV0ZXModC5hdHRyaWJ1dGVzKTp0aGlzLnJlcGxhY2VBdHRyaWJ1dGVzKHQuYXR0cmlidXRlcyl9aWYodC5ub2Rlcyl7aWYocj10Lm5vZGVzLCFBcnJheS5pc0FycmF5KHIpKXRocm93IG5ldyBGKFwiR3JhcGguaW1wb3J0OiBpbnZhbGlkIG5vZGVzLiBFeHBlY3RpbmcgYW4gYXJyYXkuXCIpO2ZvcihlPTAsbj1yLmxlbmd0aDtlPG47ZSsrKXtBdChpPXJbZV0pO3ZhciBjPWkscz1jLmtleSxwPWMuYXR0cmlidXRlczt1P3RoaXMubWVyZ2VOb2RlKHMscCk6dGhpcy5hZGROb2RlKHMscCl9fWlmKHQuZWRnZXMpe2lmKHI9dC5lZGdlcywhQXJyYXkuaXNBcnJheShyKSl0aHJvdyBuZXcgRihcIkdyYXBoLmltcG9ydDogaW52YWxpZCBlZGdlcy4gRXhwZWN0aW5nIGFuIGFycmF5LlwiKTtmb3IoZT0wLG49ci5sZW5ndGg7ZTxuO2UrKyl7U3Qobz1yW2VdKTt2YXIgZj1vLGw9Zi5zb3VyY2UsZz1mLnRhcmdldCx5PWYuYXR0cmlidXRlcyx3PWYudW5kaXJlY3RlZCx2PXZvaWQgMCE9PXcmJnc7XCJrZXlcImluIG8/KHU/dj90aGlzLm1lcmdlVW5kaXJlY3RlZEVkZ2VXaXRoS2V5OnRoaXMubWVyZ2VEaXJlY3RlZEVkZ2VXaXRoS2V5OnY/dGhpcy5hZGRVbmRpcmVjdGVkRWRnZVdpdGhLZXk6dGhpcy5hZGREaXJlY3RlZEVkZ2VXaXRoS2V5KS5jYWxsKHRoaXMsby5rZXksbCxnLHkpOih1P3Y/dGhpcy5tZXJnZVVuZGlyZWN0ZWRFZGdlOnRoaXMubWVyZ2VEaXJlY3RlZEVkZ2U6dj90aGlzLmFkZFVuZGlyZWN0ZWRFZGdlOnRoaXMuYWRkRGlyZWN0ZWRFZGdlKS5jYWxsKHRoaXMsbCxnLHkpfX1yZXR1cm4gdGhpc30saS5udWxsQ29weT1mdW5jdGlvbih0KXt2YXIgZT1uZXcgcihjKHt9LHRoaXMuX29wdGlvbnMsdCkpO3JldHVybiBlLnJlcGxhY2VBdHRyaWJ1dGVzKGMoe30sdGhpcy5nZXRBdHRyaWJ1dGVzKCkpKSxlfSxpLmVtcHR5Q29weT1mdW5jdGlvbih0KXt2YXIgZT10aGlzLm51bGxDb3B5KHQpO3JldHVybiB0aGlzLl9ub2Rlcy5mb3JFYWNoKChmdW5jdGlvbih0LG4pe3ZhciByPWMoe30sdC5hdHRyaWJ1dGVzKTt0PW5ldyBlLk5vZGVEYXRhQ2xhc3MobixyKSxlLl9ub2Rlcy5zZXQobix0KX0pKSxlfSxpLmNvcHk9ZnVuY3Rpb24odCl7aWYoXCJzdHJpbmdcIj09dHlwZW9mKHQ9dHx8e30pLnR5cGUmJnQudHlwZSE9PXRoaXMudHlwZSYmXCJtaXhlZFwiIT09dC50eXBlKXRocm93IG5ldyBZKCdHcmFwaC5jb3B5OiBjYW5ub3QgY3JlYXRlIGFuIGluY29tcGF0aWJsZSBjb3B5IGZyb20gXCInLmNvbmNhdCh0aGlzLnR5cGUsJ1wiIHR5cGUgdG8gXCInKS5jb25jYXQodC50eXBlLCdcIiBiZWNhdXNlIHRoaXMgd291bGQgbWVhbiBsb3NpbmcgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnQgZ3JhcGguJykpO2lmKFwiYm9vbGVhblwiPT10eXBlb2YgdC5tdWx0aSYmdC5tdWx0aSE9PXRoaXMubXVsdGkmJiEwIT09dC5tdWx0aSl0aHJvdyBuZXcgWShcIkdyYXBoLmNvcHk6IGNhbm5vdCBjcmVhdGUgYW4gaW5jb21wYXRpYmxlIGNvcHkgYnkgZG93bmdyYWRpbmcgYSBtdWx0aSBncmFwaCB0byBhIHNpbXBsZSBvbmUgYmVjYXVzZSB0aGlzIHdvdWxkIG1lYW4gbG9zaW5nIGluZm9ybWF0aW9uIGFib3V0IHRoZSBjdXJyZW50IGdyYXBoLlwiKTtpZihcImJvb2xlYW5cIj09dHlwZW9mIHQuYWxsb3dTZWxmTG9vcHMmJnQuYWxsb3dTZWxmTG9vcHMhPT10aGlzLmFsbG93U2VsZkxvb3BzJiYhMCE9PXQuYWxsb3dTZWxmTG9vcHMpdGhyb3cgbmV3IFkoXCJHcmFwaC5jb3B5OiBjYW5ub3QgY3JlYXRlIGFuIGluY29tcGF0aWJsZSBjb3B5IGZyb20gYSBncmFwaCBhbGxvd2luZyBzZWxmIGxvb3BzIHRvIG9uZSB0aGF0IGRvZXMgbm90IGJlY2F1c2UgdGhpcyB3b3VsZCBtZWFuIGxvc2luZyBpbmZvcm1hdGlvbiBhYm91dCB0aGUgY3VycmVudCBncmFwaC5cIik7Zm9yKHZhciBlLG4scj10aGlzLmVtcHR5Q29weSh0KSxpPXRoaXMuX2VkZ2VzLnZhbHVlcygpOyEwIT09KGU9aS5uZXh0KCkpLmRvbmU7KUN0KHIsXCJjb3B5XCIsITEsKG49ZS52YWx1ZSkudW5kaXJlY3RlZCxuLmtleSxuLnNvdXJjZS5rZXksbi50YXJnZXQua2V5LGMoe30sbi5hdHRyaWJ1dGVzKSk7cmV0dXJuIHJ9LGkudG9KU09OPWZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZXhwb3J0KCl9LGkudG9TdHJpbmc9ZnVuY3Rpb24oKXtyZXR1cm5cIltvYmplY3QgR3JhcGhdXCJ9LGkuaW5zcGVjdD1mdW5jdGlvbigpe3ZhciBlPXRoaXMsbj17fTt0aGlzLl9ub2Rlcy5mb3JFYWNoKChmdW5jdGlvbih0LGUpe25bZV09dC5hdHRyaWJ1dGVzfSkpO3ZhciByPXt9LGk9e307dGhpcy5fZWRnZXMuZm9yRWFjaCgoZnVuY3Rpb24odCxuKXt2YXIgbyxhPXQudW5kaXJlY3RlZD9cIi0tXCI6XCItPlwiLHU9XCJcIixjPXQuc291cmNlLmtleSxzPXQudGFyZ2V0LmtleTt0LnVuZGlyZWN0ZWQmJmM+cyYmKG89YyxjPXMscz1vKTt2YXIgZD1cIihcIi5jb25jYXQoYyxcIilcIikuY29uY2F0KGEsXCIoXCIpLmNvbmNhdChzLFwiKVwiKTtuLnN0YXJ0c1dpdGgoXCJnZWlkX1wiKT9lLm11bHRpJiYodm9pZCAwPT09aVtkXT9pW2RdPTA6aVtkXSsrLHUrPVwiXCIuY29uY2F0KGlbZF0sXCIuIFwiKSk6dSs9XCJbXCIuY29uY2F0KG4sXCJdOiBcIiksclt1Kz1kXT10LmF0dHJpYnV0ZXN9KSk7dmFyIG89e307Zm9yKHZhciBhIGluIHRoaXMpdGhpcy5oYXNPd25Qcm9wZXJ0eShhKSYmIU50LmhhcyhhKSYmXCJmdW5jdGlvblwiIT10eXBlb2YgdGhpc1thXSYmXCJzeW1ib2xcIiE9PXQoYSkmJihvW2FdPXRoaXNbYV0pO3JldHVybiBvLmF0dHJpYnV0ZXM9dGhpcy5fYXR0cmlidXRlcyxvLm5vZGVzPW4sby5lZGdlcz1yLGYobyxcImNvbnN0cnVjdG9yXCIsdGhpcy5jb25zdHJ1Y3Rvciksb30scn0ody5leHBvcnRzLkV2ZW50RW1pdHRlcik7XCJ1bmRlZmluZWRcIiE9dHlwZW9mIFN5bWJvbCYmKFd0LnByb3RvdHlwZVtTeW1ib2wuZm9yKFwibm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b21cIildPVd0LnByb3RvdHlwZS5pbnNwZWN0KSxbe25hbWU6ZnVuY3Rpb24odCl7cmV0dXJuXCJcIi5jb25jYXQodCxcIkVkZ2VcIil9LGdlbmVyYXRlS2V5OiEwfSx7bmFtZTpmdW5jdGlvbih0KXtyZXR1cm5cIlwiLmNvbmNhdCh0LFwiRGlyZWN0ZWRFZGdlXCIpfSxnZW5lcmF0ZUtleTohMCx0eXBlOlwiZGlyZWN0ZWRcIn0se25hbWU6ZnVuY3Rpb24odCl7cmV0dXJuXCJcIi5jb25jYXQodCxcIlVuZGlyZWN0ZWRFZGdlXCIpfSxnZW5lcmF0ZUtleTohMCx0eXBlOlwidW5kaXJlY3RlZFwifSx7bmFtZTpmdW5jdGlvbih0KXtyZXR1cm5cIlwiLmNvbmNhdCh0LFwiRWRnZVdpdGhLZXlcIil9fSx7bmFtZTpmdW5jdGlvbih0KXtyZXR1cm5cIlwiLmNvbmNhdCh0LFwiRGlyZWN0ZWRFZGdlV2l0aEtleVwiKX0sdHlwZTpcImRpcmVjdGVkXCJ9LHtuYW1lOmZ1bmN0aW9uKHQpe3JldHVyblwiXCIuY29uY2F0KHQsXCJVbmRpcmVjdGVkRWRnZVdpdGhLZXlcIil9LHR5cGU6XCJ1bmRpcmVjdGVkXCJ9XS5mb3JFYWNoKChmdW5jdGlvbih0KXtbXCJhZGRcIixcIm1lcmdlXCIsXCJ1cGRhdGVcIl0uZm9yRWFjaCgoZnVuY3Rpb24oZSl7dmFyIG49dC5uYW1lKGUpLHI9XCJhZGRcIj09PWU/Q3Q6enQ7dC5nZW5lcmF0ZUtleT9XdC5wcm90b3R5cGVbbl09ZnVuY3Rpb24oaSxvLGEpe3JldHVybiByKHRoaXMsbiwhMCxcInVuZGlyZWN0ZWRcIj09PSh0LnR5cGV8fHRoaXMudHlwZSksbnVsbCxpLG8sYSxcInVwZGF0ZVwiPT09ZSl9Old0LnByb3RvdHlwZVtuXT1mdW5jdGlvbihpLG8sYSx1KXtyZXR1cm4gcih0aGlzLG4sITEsXCJ1bmRpcmVjdGVkXCI9PT0odC50eXBlfHx0aGlzLnR5cGUpLGksbyxhLHUsXCJ1cGRhdGVcIj09PWUpfX0pKX0pKSxmdW5jdGlvbih0KXtYLmZvckVhY2goKGZ1bmN0aW9uKGUpe3ZhciBuPWUubmFtZSxyPWUuYXR0YWNoZXI7cih0LG4oXCJOb2RlXCIpLDApLHIodCxuKFwiU291cmNlXCIpLDEpLHIodCxuKFwiVGFyZ2V0XCIpLDIpLHIodCxuKFwiT3Bwb3NpdGVcIiksMyl9KSl9KFd0KSxmdW5jdGlvbih0KXtaLmZvckVhY2goKGZ1bmN0aW9uKGUpe3ZhciBuPWUubmFtZSxyPWUuYXR0YWNoZXI7cih0LG4oXCJFZGdlXCIpLFwibWl4ZWRcIikscih0LG4oXCJEaXJlY3RlZEVkZ2VcIiksXCJkaXJlY3RlZFwiKSxyKHQsbihcIlVuZGlyZWN0ZWRFZGdlXCIpLFwidW5kaXJlY3RlZFwiKX0pKX0oV3QpLGZ1bmN0aW9uKHQpe250LmZvckVhY2goKGZ1bmN0aW9uKGUpeyFmdW5jdGlvbih0LGUpe3ZhciBuPWUubmFtZSxyPWUudHlwZSxpPWUuZGlyZWN0aW9uO3QucHJvdG90eXBlW25dPWZ1bmN0aW9uKHQsZSl7aWYoXCJtaXhlZFwiIT09ciYmXCJtaXhlZFwiIT09dGhpcy50eXBlJiZyIT09dGhpcy50eXBlKXJldHVybltdO2lmKCFhcmd1bWVudHMubGVuZ3RoKXJldHVybiBzdCh0aGlzLHIpO2lmKDE9PT1hcmd1bWVudHMubGVuZ3RoKXt0PVwiXCIrdDt2YXIgbz10aGlzLl9ub2Rlcy5nZXQodCk7aWYodm9pZCAwPT09byl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChuLCc6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicpLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuIGZ0KHRoaXMubXVsdGksXCJtaXhlZFwiPT09cj90aGlzLnR5cGU6cixpLG8pfWlmKDI9PT1hcmd1bWVudHMubGVuZ3RoKXt0PVwiXCIrdCxlPVwiXCIrZTt2YXIgYT10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIWEpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQobiwnOiAgY291bGQgbm90IGZpbmQgdGhlIFwiJykuY29uY2F0KHQsJ1wiIHNvdXJjZSBub2RlIGluIHRoZSBncmFwaC4nKSk7aWYoIXRoaXMuX25vZGVzLmhhcyhlKSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChuLCc6ICBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQoZSwnXCIgdGFyZ2V0IG5vZGUgaW4gdGhlIGdyYXBoLicpKTtyZXR1cm4geXQocix0aGlzLm11bHRpLGksYSxlKX10aHJvdyBuZXcgRihcIkdyYXBoLlwiLmNvbmNhdChuLFwiOiB0b28gbWFueSBhcmd1bWVudHMgKGV4cGVjdGluZyAwLCAxIG9yIDIgYW5kIGdvdCBcIikuY29uY2F0KGFyZ3VtZW50cy5sZW5ndGgsXCIpLlwiKSl9fSh0LGUpLGZ1bmN0aW9uKHQsZSl7dmFyIG49ZS5uYW1lLHI9ZS50eXBlLGk9ZS5kaXJlY3Rpb24sbz1cImZvckVhY2hcIituWzBdLnRvVXBwZXJDYXNlKCkrbi5zbGljZSgxLC0xKTt0LnByb3RvdHlwZVtvXT1mdW5jdGlvbih0LGUsbil7aWYoXCJtaXhlZFwiPT09cnx8XCJtaXhlZFwiPT09dGhpcy50eXBlfHxyPT09dGhpcy50eXBlKXtpZigxPT09YXJndW1lbnRzLmxlbmd0aClyZXR1cm4gZHQoITEsdGhpcyxyLG49dCk7aWYoMj09PWFyZ3VtZW50cy5sZW5ndGgpe3Q9XCJcIit0LG49ZTt2YXIgYT10aGlzLl9ub2Rlcy5nZXQodCk7aWYodm9pZCAwPT09YSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChvLCc6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicpLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7cmV0dXJuIHB0KCExLHRoaXMubXVsdGksXCJtaXhlZFwiPT09cj90aGlzLnR5cGU6cixpLGEsbil9aWYoMz09PWFyZ3VtZW50cy5sZW5ndGgpe3Q9XCJcIit0LGU9XCJcIitlO3ZhciB1PXRoaXMuX25vZGVzLmdldCh0KTtpZighdSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChvLCc6ICBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQodCwnXCIgc291cmNlIG5vZGUgaW4gdGhlIGdyYXBoLicpKTtpZighdGhpcy5fbm9kZXMuaGFzKGUpKXRocm93IG5ldyBJKFwiR3JhcGguXCIuY29uY2F0KG8sJzogIGNvdWxkIG5vdCBmaW5kIHRoZSBcIicpLmNvbmNhdChlLCdcIiB0YXJnZXQgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3JldHVybiBndCghMSxyLHRoaXMubXVsdGksaSx1LGUsbil9dGhyb3cgbmV3IEYoXCJHcmFwaC5cIi5jb25jYXQobyxcIjogdG9vIG1hbnkgYXJndW1lbnRzIChleHBlY3RpbmcgMSwgMiBvciAzIGFuZCBnb3QgXCIpLmNvbmNhdChhcmd1bWVudHMubGVuZ3RoLFwiKS5cIikpfX07dmFyIGE9XCJtYXBcIituWzBdLnRvVXBwZXJDYXNlKCkrbi5zbGljZSgxKTt0LnByb3RvdHlwZVthXT1mdW5jdGlvbigpe3ZhciB0LGU9QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxuPWUucG9wKCk7aWYoMD09PWUubGVuZ3RoKXt2YXIgaT0wO1wiZGlyZWN0ZWRcIiE9PXImJihpKz10aGlzLnVuZGlyZWN0ZWRTaXplKSxcInVuZGlyZWN0ZWRcIiE9PXImJihpKz10aGlzLmRpcmVjdGVkU2l6ZSksdD1uZXcgQXJyYXkoaSk7dmFyIGE9MDtlLnB1c2goKGZ1bmN0aW9uKGUscixpLG8sdSxjLHMpe3RbYSsrXT1uKGUscixpLG8sdSxjLHMpfSkpfWVsc2UgdD1bXSxlLnB1c2goKGZ1bmN0aW9uKGUscixpLG8sYSx1LGMpe3QucHVzaChuKGUscixpLG8sYSx1LGMpKX0pKTtyZXR1cm4gdGhpc1tvXS5hcHBseSh0aGlzLGUpLHR9O3ZhciB1PVwiZmlsdGVyXCIrblswXS50b1VwcGVyQ2FzZSgpK24uc2xpY2UoMSk7dC5wcm90b3R5cGVbdV09ZnVuY3Rpb24oKXt2YXIgdD1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLGU9dC5wb3AoKSxuPVtdO3JldHVybiB0LnB1c2goKGZ1bmN0aW9uKHQscixpLG8sYSx1LGMpe2UodCxyLGksbyxhLHUsYykmJm4ucHVzaCh0KX0pKSx0aGlzW29dLmFwcGx5KHRoaXMsdCksbn07dmFyIGM9XCJyZWR1Y2VcIituWzBdLnRvVXBwZXJDYXNlKCkrbi5zbGljZSgxKTt0LnByb3RvdHlwZVtjXT1mdW5jdGlvbigpe3ZhciB0LGUsbj1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO2lmKG4ubGVuZ3RoPDJ8fG4ubGVuZ3RoPjQpdGhyb3cgbmV3IEYoXCJHcmFwaC5cIi5jb25jYXQoYyxcIjogaW52YWxpZCBudW1iZXIgb2YgYXJndW1lbnRzIChleHBlY3RpbmcgMiwgMyBvciA0IGFuZCBnb3QgXCIpLmNvbmNhdChuLmxlbmd0aCxcIikuXCIpKTtpZihcImZ1bmN0aW9uXCI9PXR5cGVvZiBuW24ubGVuZ3RoLTFdJiZcImZ1bmN0aW9uXCIhPXR5cGVvZiBuW24ubGVuZ3RoLTJdKXRocm93IG5ldyBGKFwiR3JhcGguXCIuY29uY2F0KGMsXCI6IG1pc3NpbmcgaW5pdGlhbCB2YWx1ZS4gWW91IG11c3QgcHJvdmlkZSBpdCBiZWNhdXNlIHRoZSBjYWxsYmFjayB0YWtlcyBtb3JlIHRoYW4gb25lIGFyZ3VtZW50IGFuZCB3ZSBjYW5ub3QgaW5mZXIgdGhlIGluaXRpYWwgdmFsdWUgZnJvbSB0aGUgZmlyc3QgaXRlcmF0aW9uLCBhcyB5b3UgY291bGQgd2l0aCBhIHNpbXBsZSBhcnJheS5cIikpOzI9PT1uLmxlbmd0aD8odD1uWzBdLGU9blsxXSxuPVtdKTozPT09bi5sZW5ndGg/KHQ9blsxXSxlPW5bMl0sbj1bblswXV0pOjQ9PT1uLmxlbmd0aCYmKHQ9blsyXSxlPW5bM10sbj1bblswXSxuWzFdXSk7dmFyIHI9ZTtyZXR1cm4gbi5wdXNoKChmdW5jdGlvbihlLG4saSxvLGEsdSxjKXtyPXQocixlLG4saSxvLGEsdSxjKX0pKSx0aGlzW29dLmFwcGx5KHRoaXMsbikscn19KHQsZSksZnVuY3Rpb24odCxlKXt2YXIgbj1lLm5hbWUscj1lLnR5cGUsaT1lLmRpcmVjdGlvbixvPVwiZmluZFwiK25bMF0udG9VcHBlckNhc2UoKStuLnNsaWNlKDEsLTEpO3QucHJvdG90eXBlW29dPWZ1bmN0aW9uKHQsZSxuKXtpZihcIm1peGVkXCIhPT1yJiZcIm1peGVkXCIhPT10aGlzLnR5cGUmJnIhPT10aGlzLnR5cGUpcmV0dXJuITE7aWYoMT09PWFyZ3VtZW50cy5sZW5ndGgpcmV0dXJuIGR0KCEwLHRoaXMscixuPXQpO2lmKDI9PT1hcmd1bWVudHMubGVuZ3RoKXt0PVwiXCIrdCxuPWU7dmFyIGE9dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKHZvaWQgMD09PWEpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQobywnOiBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3JldHVybiBwdCghMCx0aGlzLm11bHRpLFwibWl4ZWRcIj09PXI/dGhpcy50eXBlOnIsaSxhLG4pfWlmKDM9PT1hcmd1bWVudHMubGVuZ3RoKXt0PVwiXCIrdCxlPVwiXCIrZTt2YXIgdT10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIXUpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQobywnOiAgY291bGQgbm90IGZpbmQgdGhlIFwiJykuY29uY2F0KHQsJ1wiIHNvdXJjZSBub2RlIGluIHRoZSBncmFwaC4nKSk7aWYoIXRoaXMuX25vZGVzLmhhcyhlKSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChvLCc6ICBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQoZSwnXCIgdGFyZ2V0IG5vZGUgaW4gdGhlIGdyYXBoLicpKTtyZXR1cm4gZ3QoITAscix0aGlzLm11bHRpLGksdSxlLG4pfXRocm93IG5ldyBGKFwiR3JhcGguXCIuY29uY2F0KG8sXCI6IHRvbyBtYW55IGFyZ3VtZW50cyAoZXhwZWN0aW5nIDEsIDIgb3IgMyBhbmQgZ290IFwiKS5jb25jYXQoYXJndW1lbnRzLmxlbmd0aCxcIikuXCIpKX07dmFyIGE9XCJzb21lXCIrblswXS50b1VwcGVyQ2FzZSgpK24uc2xpY2UoMSwtMSk7dC5wcm90b3R5cGVbYV09ZnVuY3Rpb24oKXt2YXIgdD1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLGU9dC5wb3AoKTtyZXR1cm4gdC5wdXNoKChmdW5jdGlvbih0LG4scixpLG8sYSx1KXtyZXR1cm4gZSh0LG4scixpLG8sYSx1KX0pKSwhIXRoaXNbb10uYXBwbHkodGhpcyx0KX07dmFyIHU9XCJldmVyeVwiK25bMF0udG9VcHBlckNhc2UoKStuLnNsaWNlKDEsLTEpO3QucHJvdG90eXBlW3VdPWZ1bmN0aW9uKCl7dmFyIHQ9QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxlPXQucG9wKCk7cmV0dXJuIHQucHVzaCgoZnVuY3Rpb24odCxuLHIsaSxvLGEsdSl7cmV0dXJuIWUodCxuLHIsaSxvLGEsdSl9KSksIXRoaXNbb10uYXBwbHkodGhpcyx0KX19KHQsZSksZnVuY3Rpb24odCxlKXt2YXIgbj1lLm5hbWUscj1lLnR5cGUsaT1lLmRpcmVjdGlvbixvPW4uc2xpY2UoMCwtMSkrXCJFbnRyaWVzXCI7dC5wcm90b3R5cGVbb109ZnVuY3Rpb24odCxlKXtpZihcIm1peGVkXCIhPT1yJiZcIm1peGVkXCIhPT10aGlzLnR5cGUmJnIhPT10aGlzLnR5cGUpcmV0dXJuIE8uZW1wdHkoKTtpZighYXJndW1lbnRzLmxlbmd0aClyZXR1cm4gaHQodGhpcyxyKTtpZigxPT09YXJndW1lbnRzLmxlbmd0aCl7dD1cIlwiK3Q7dmFyIG49dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKCFuKXRocm93IG5ldyBJKFwiR3JhcGguXCIuY29uY2F0KG8sJzogY291bGQgbm90IGZpbmQgdGhlIFwiJykuY29uY2F0KHQsJ1wiIG5vZGUgaW4gdGhlIGdyYXBoLicpKTtyZXR1cm4gbHQocixpLG4pfWlmKDI9PT1hcmd1bWVudHMubGVuZ3RoKXt0PVwiXCIrdCxlPVwiXCIrZTt2YXIgYT10aGlzLl9ub2Rlcy5nZXQodCk7aWYoIWEpdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQobywnOiAgY291bGQgbm90IGZpbmQgdGhlIFwiJykuY29uY2F0KHQsJ1wiIHNvdXJjZSBub2RlIGluIHRoZSBncmFwaC4nKSk7aWYoIXRoaXMuX25vZGVzLmhhcyhlKSl0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChvLCc6ICBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQoZSwnXCIgdGFyZ2V0IG5vZGUgaW4gdGhlIGdyYXBoLicpKTtyZXR1cm4gd3QocixpLGEsZSl9dGhyb3cgbmV3IEYoXCJHcmFwaC5cIi5jb25jYXQobyxcIjogdG9vIG1hbnkgYXJndW1lbnRzIChleHBlY3RpbmcgMCwgMSBvciAyIGFuZCBnb3QgXCIpLmNvbmNhdChhcmd1bWVudHMubGVuZ3RoLFwiKS5cIikpfX0odCxlKX0pKX0oV3QpLGZ1bmN0aW9uKHQpe3Z0LmZvckVhY2goKGZ1bmN0aW9uKGUpe0d0KHQsZSksZnVuY3Rpb24odCxlKXt2YXIgbj1lLm5hbWUscj1lLnR5cGUsaT1lLmRpcmVjdGlvbixvPVwiZm9yRWFjaFwiK25bMF0udG9VcHBlckNhc2UoKStuLnNsaWNlKDEsLTEpO3QucHJvdG90eXBlW29dPWZ1bmN0aW9uKHQsZSl7aWYoXCJtaXhlZFwiPT09cnx8XCJtaXhlZFwiPT09dGhpcy50eXBlfHxyPT09dGhpcy50eXBlKXt0PVwiXCIrdDt2YXIgbj10aGlzLl9ub2Rlcy5nZXQodCk7aWYodm9pZCAwPT09bil0aHJvdyBuZXcgSShcIkdyYXBoLlwiLmNvbmNhdChvLCc6IGNvdWxkIG5vdCBmaW5kIHRoZSBcIicpLmNvbmNhdCh0LCdcIiBub2RlIGluIHRoZSBncmFwaC4nKSk7a3QoITEsXCJtaXhlZFwiPT09cj90aGlzLnR5cGU6cixpLG4sZSl9fTt2YXIgYT1cIm1hcFwiK25bMF0udG9VcHBlckNhc2UoKStuLnNsaWNlKDEpO3QucHJvdG90eXBlW2FdPWZ1bmN0aW9uKHQsZSl7dmFyIG49W107cmV0dXJuIHRoaXNbb10odCwoZnVuY3Rpb24odCxyKXtuLnB1c2goZSh0LHIpKX0pKSxufTt2YXIgdT1cImZpbHRlclwiK25bMF0udG9VcHBlckNhc2UoKStuLnNsaWNlKDEpO3QucHJvdG90eXBlW3VdPWZ1bmN0aW9uKHQsZSl7dmFyIG49W107cmV0dXJuIHRoaXNbb10odCwoZnVuY3Rpb24odCxyKXtlKHQscikmJm4ucHVzaCh0KX0pKSxufTt2YXIgYz1cInJlZHVjZVwiK25bMF0udG9VcHBlckNhc2UoKStuLnNsaWNlKDEpO3QucHJvdG90eXBlW2NdPWZ1bmN0aW9uKHQsZSxuKXtpZihhcmd1bWVudHMubGVuZ3RoPDMpdGhyb3cgbmV3IEYoXCJHcmFwaC5cIi5jb25jYXQoYyxcIjogbWlzc2luZyBpbml0aWFsIHZhbHVlLiBZb3UgbXVzdCBwcm92aWRlIGl0IGJlY2F1c2UgdGhlIGNhbGxiYWNrIHRha2VzIG1vcmUgdGhhbiBvbmUgYXJndW1lbnQgYW5kIHdlIGNhbm5vdCBpbmZlciB0aGUgaW5pdGlhbCB2YWx1ZSBmcm9tIHRoZSBmaXJzdCBpdGVyYXRpb24sIGFzIHlvdSBjb3VsZCB3aXRoIGEgc2ltcGxlIGFycmF5LlwiKSk7dmFyIHI9bjtyZXR1cm4gdGhpc1tvXSh0LChmdW5jdGlvbih0LG4pe3I9ZShyLHQsbil9KSkscn19KHQsZSksZnVuY3Rpb24odCxlKXt2YXIgbj1lLm5hbWUscj1lLnR5cGUsaT1lLmRpcmVjdGlvbixvPW5bMF0udG9VcHBlckNhc2UoKStuLnNsaWNlKDEsLTEpLGE9XCJmaW5kXCIrbzt0LnByb3RvdHlwZVthXT1mdW5jdGlvbih0LGUpe2lmKFwibWl4ZWRcIj09PXJ8fFwibWl4ZWRcIj09PXRoaXMudHlwZXx8cj09PXRoaXMudHlwZSl7dD1cIlwiK3Q7dmFyIG49dGhpcy5fbm9kZXMuZ2V0KHQpO2lmKHZvaWQgMD09PW4pdGhyb3cgbmV3IEkoXCJHcmFwaC5cIi5jb25jYXQoYSwnOiBjb3VsZCBub3QgZmluZCB0aGUgXCInKS5jb25jYXQodCwnXCIgbm9kZSBpbiB0aGUgZ3JhcGguJykpO3JldHVybiBrdCghMCxcIm1peGVkXCI9PT1yP3RoaXMudHlwZTpyLGksbixlKX19O3ZhciB1PVwic29tZVwiK287dC5wcm90b3R5cGVbdV09ZnVuY3Rpb24odCxlKXtyZXR1cm4hIXRoaXNbYV0odCxlKX07dmFyIGM9XCJldmVyeVwiK287dC5wcm90b3R5cGVbY109ZnVuY3Rpb24odCxlKXtyZXR1cm4hdGhpc1thXSh0LChmdW5jdGlvbih0LG4pe3JldHVybiFlKHQsbil9KSl9fSh0LGUpLHh0KHQsZSl9KSl9KFd0KTt2YXIgUHQ9ZnVuY3Rpb24odCl7ZnVuY3Rpb24gbihlKXt2YXIgbj1jKHt0eXBlOlwiZGlyZWN0ZWRcIn0sZSk7aWYoXCJtdWx0aVwiaW4gbiYmITEhPT1uLm11bHRpKXRocm93IG5ldyBGKFwiRGlyZWN0ZWRHcmFwaC5mcm9tOiBpbmNvbnNpc3RlbnQgaW5kaWNhdGlvbiB0aGF0IHRoZSBncmFwaCBzaG91bGQgYmUgbXVsdGkgaW4gZ2l2ZW4gb3B0aW9ucyFcIik7aWYoXCJkaXJlY3RlZFwiIT09bi50eXBlKXRocm93IG5ldyBGKCdEaXJlY3RlZEdyYXBoLmZyb206IGluY29uc2lzdGVudCBcIicrbi50eXBlKydcIiB0eXBlIGluIGdpdmVuIG9wdGlvbnMhJyk7cmV0dXJuIHQuY2FsbCh0aGlzLG4pfHx0aGlzfXJldHVybiBlKG4sdCksbn0oV3QpLFJ0PWZ1bmN0aW9uKHQpe2Z1bmN0aW9uIG4oZSl7dmFyIG49Yyh7dHlwZTpcInVuZGlyZWN0ZWRcIn0sZSk7aWYoXCJtdWx0aVwiaW4gbiYmITEhPT1uLm11bHRpKXRocm93IG5ldyBGKFwiVW5kaXJlY3RlZEdyYXBoLmZyb206IGluY29uc2lzdGVudCBpbmRpY2F0aW9uIHRoYXQgdGhlIGdyYXBoIHNob3VsZCBiZSBtdWx0aSBpbiBnaXZlbiBvcHRpb25zIVwiKTtpZihcInVuZGlyZWN0ZWRcIiE9PW4udHlwZSl0aHJvdyBuZXcgRignVW5kaXJlY3RlZEdyYXBoLmZyb206IGluY29uc2lzdGVudCBcIicrbi50eXBlKydcIiB0eXBlIGluIGdpdmVuIG9wdGlvbnMhJyk7cmV0dXJuIHQuY2FsbCh0aGlzLG4pfHx0aGlzfXJldHVybiBlKG4sdCksbn0oV3QpLEt0PWZ1bmN0aW9uKHQpe2Z1bmN0aW9uIG4oZSl7dmFyIG49Yyh7bXVsdGk6ITB9LGUpO2lmKFwibXVsdGlcImluIG4mJiEwIT09bi5tdWx0aSl0aHJvdyBuZXcgRihcIk11bHRpR3JhcGguZnJvbTogaW5jb25zaXN0ZW50IGluZGljYXRpb24gdGhhdCB0aGUgZ3JhcGggc2hvdWxkIGJlIHNpbXBsZSBpbiBnaXZlbiBvcHRpb25zIVwiKTtyZXR1cm4gdC5jYWxsKHRoaXMsbil8fHRoaXN9cmV0dXJuIGUobix0KSxufShXdCksVHQ9ZnVuY3Rpb24odCl7ZnVuY3Rpb24gbihlKXt2YXIgbj1jKHt0eXBlOlwiZGlyZWN0ZWRcIixtdWx0aTohMH0sZSk7aWYoXCJtdWx0aVwiaW4gbiYmITAhPT1uLm11bHRpKXRocm93IG5ldyBGKFwiTXVsdGlEaXJlY3RlZEdyYXBoLmZyb206IGluY29uc2lzdGVudCBpbmRpY2F0aW9uIHRoYXQgdGhlIGdyYXBoIHNob3VsZCBiZSBzaW1wbGUgaW4gZ2l2ZW4gb3B0aW9ucyFcIik7aWYoXCJkaXJlY3RlZFwiIT09bi50eXBlKXRocm93IG5ldyBGKCdNdWx0aURpcmVjdGVkR3JhcGguZnJvbTogaW5jb25zaXN0ZW50IFwiJytuLnR5cGUrJ1wiIHR5cGUgaW4gZ2l2ZW4gb3B0aW9ucyEnKTtyZXR1cm4gdC5jYWxsKHRoaXMsbil8fHRoaXN9cmV0dXJuIGUobix0KSxufShXdCksQnQ9ZnVuY3Rpb24odCl7ZnVuY3Rpb24gbihlKXt2YXIgbj1jKHt0eXBlOlwidW5kaXJlY3RlZFwiLG11bHRpOiEwfSxlKTtpZihcIm11bHRpXCJpbiBuJiYhMCE9PW4ubXVsdGkpdGhyb3cgbmV3IEYoXCJNdWx0aVVuZGlyZWN0ZWRHcmFwaC5mcm9tOiBpbmNvbnNpc3RlbnQgaW5kaWNhdGlvbiB0aGF0IHRoZSBncmFwaCBzaG91bGQgYmUgc2ltcGxlIGluIGdpdmVuIG9wdGlvbnMhXCIpO2lmKFwidW5kaXJlY3RlZFwiIT09bi50eXBlKXRocm93IG5ldyBGKCdNdWx0aVVuZGlyZWN0ZWRHcmFwaC5mcm9tOiBpbmNvbnNpc3RlbnQgXCInK24udHlwZSsnXCIgdHlwZSBpbiBnaXZlbiBvcHRpb25zIScpO3JldHVybiB0LmNhbGwodGhpcyxuKXx8dGhpc31yZXR1cm4gZShuLHQpLG59KFd0KTtmdW5jdGlvbiBGdCh0KXt0LmZyb209ZnVuY3Rpb24oZSxuKXt2YXIgcj1jKHt9LGUub3B0aW9ucyxuKSxpPW5ldyB0KHIpO3JldHVybiBpLmltcG9ydChlKSxpfX1yZXR1cm4gRnQoV3QpLEZ0KFB0KSxGdChSdCksRnQoS3QpLEZ0KFR0KSxGdChCdCksV3QuR3JhcGg9V3QsV3QuRGlyZWN0ZWRHcmFwaD1QdCxXdC5VbmRpcmVjdGVkR3JhcGg9UnQsV3QuTXVsdGlHcmFwaD1LdCxXdC5NdWx0aURpcmVjdGVkR3JhcGg9VHQsV3QuTXVsdGlVbmRpcmVjdGVkR3JhcGg9QnQsV3QuSW52YWxpZEFyZ3VtZW50c0dyYXBoRXJyb3I9RixXdC5Ob3RGb3VuZEdyYXBoRXJyb3I9SSxXdC5Vc2FnZUdyYXBoRXJyb3I9WSxXdH0pKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWdyYXBob2xvZ3kudW1kLm1pbi5qcy5tYXBcbiIsIi8qKlxuICogTW5lbW9uaXN0IEJpbmFyeSBIZWFwXG4gKiA9PT09PT09PT09PT09PT09PT09PT09XG4gKlxuICogQmluYXJ5IGhlYXAgaW1wbGVtZW50YXRpb24uXG4gKi9cbnZhciBmb3JFYWNoID0gcmVxdWlyZSgnb2JsaXRlcmF0b3IvZm9yZWFjaCcpLFxuICAgIGNvbXBhcmF0b3JzID0gcmVxdWlyZSgnLi91dGlscy9jb21wYXJhdG9ycy5qcycpLFxuICAgIGl0ZXJhYmxlcyA9IHJlcXVpcmUoJy4vdXRpbHMvaXRlcmFibGVzLmpzJyk7XG5cbnZhciBERUZBVUxUX0NPTVBBUkFUT1IgPSBjb21wYXJhdG9ycy5ERUZBVUxUX0NPTVBBUkFUT1IsXG4gICAgcmV2ZXJzZUNvbXBhcmF0b3IgPSBjb21wYXJhdG9ycy5yZXZlcnNlQ29tcGFyYXRvcjtcblxuLyoqXG4gKiBIZWFwIGhlbHBlciBmdW5jdGlvbnMuXG4gKi9cblxuLyoqXG4gKiBGdW5jdGlvbiB1c2VkIHRvIHNpZnQgZG93bi5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjb21wYXJlICAgIC0gQ29tcGFyaXNvbiBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7YXJyYXl9ICAgIGhlYXAgICAgICAgLSBBcnJheSBzdG9yaW5nIHRoZSBoZWFwJ3MgZGF0YS5cbiAqIEBwYXJhbSB7bnVtYmVyfSAgIHN0YXJ0SW5kZXggLSBTdGFydGluZyBpbmRleC5cbiAqIEBwYXJhbSB7bnVtYmVyfSAgIGkgICAgICAgICAgLSBJbmRleC5cbiAqL1xuZnVuY3Rpb24gc2lmdERvd24oY29tcGFyZSwgaGVhcCwgc3RhcnRJbmRleCwgaSkge1xuICB2YXIgaXRlbSA9IGhlYXBbaV0sXG4gICAgICBwYXJlbnRJbmRleCxcbiAgICAgIHBhcmVudDtcblxuICB3aGlsZSAoaSA+IHN0YXJ0SW5kZXgpIHtcbiAgICBwYXJlbnRJbmRleCA9IChpIC0gMSkgPj4gMTtcbiAgICBwYXJlbnQgPSBoZWFwW3BhcmVudEluZGV4XTtcblxuICAgIGlmIChjb21wYXJlKGl0ZW0sIHBhcmVudCkgPCAwKSB7XG4gICAgICBoZWFwW2ldID0gcGFyZW50O1xuICAgICAgaSA9IHBhcmVudEluZGV4O1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgYnJlYWs7XG4gIH1cblxuICBoZWFwW2ldID0gaXRlbTtcbn1cblxuLyoqXG4gKiBGdW5jdGlvbiB1c2VkIHRvIHNpZnQgdXAuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY29tcGFyZSAtIENvbXBhcmlzb24gZnVuY3Rpb24uXG4gKiBAcGFyYW0ge2FycmF5fSAgICBoZWFwICAgIC0gQXJyYXkgc3RvcmluZyB0aGUgaGVhcCdzIGRhdGEuXG4gKiBAcGFyYW0ge251bWJlcn0gICBpICAgICAgIC0gSW5kZXguXG4gKi9cbmZ1bmN0aW9uIHNpZnRVcChjb21wYXJlLCBoZWFwLCBpKSB7XG4gIHZhciBlbmRJbmRleCA9IGhlYXAubGVuZ3RoLFxuICAgICAgc3RhcnRJbmRleCA9IGksXG4gICAgICBpdGVtID0gaGVhcFtpXSxcbiAgICAgIGNoaWxkSW5kZXggPSAyICogaSArIDEsXG4gICAgICByaWdodEluZGV4O1xuXG4gIHdoaWxlIChjaGlsZEluZGV4IDwgZW5kSW5kZXgpIHtcbiAgICByaWdodEluZGV4ID0gY2hpbGRJbmRleCArIDE7XG5cbiAgICBpZiAoXG4gICAgICByaWdodEluZGV4IDwgZW5kSW5kZXggJiZcbiAgICAgIGNvbXBhcmUoaGVhcFtjaGlsZEluZGV4XSwgaGVhcFtyaWdodEluZGV4XSkgPj0gMFxuICAgICkge1xuICAgICAgY2hpbGRJbmRleCA9IHJpZ2h0SW5kZXg7XG4gICAgfVxuXG4gICAgaGVhcFtpXSA9IGhlYXBbY2hpbGRJbmRleF07XG4gICAgaSA9IGNoaWxkSW5kZXg7XG4gICAgY2hpbGRJbmRleCA9IDIgKiBpICsgMTtcbiAgfVxuXG4gIGhlYXBbaV0gPSBpdGVtO1xuICBzaWZ0RG93bihjb21wYXJlLCBoZWFwLCBzdGFydEluZGV4LCBpKTtcbn1cblxuLyoqXG4gKiBGdW5jdGlvbiB1c2VkIHRvIHB1c2ggYW4gaXRlbSBpbnRvIGEgaGVhcCByZXByZXNlbnRlZCBieSBhIHJhdyBhcnJheS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjb21wYXJlIC0gQ29tcGFyaXNvbiBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7YXJyYXl9ICAgIGhlYXAgICAgLSBBcnJheSBzdG9yaW5nIHRoZSBoZWFwJ3MgZGF0YS5cbiAqIEBwYXJhbSB7YW55fSAgICAgIGl0ZW0gICAgLSBJdGVtIHRvIHB1c2guXG4gKi9cbmZ1bmN0aW9uIHB1c2goY29tcGFyZSwgaGVhcCwgaXRlbSkge1xuICBoZWFwLnB1c2goaXRlbSk7XG4gIHNpZnREb3duKGNvbXBhcmUsIGhlYXAsIDAsIGhlYXAubGVuZ3RoIC0gMSk7XG59XG5cbi8qKlxuICogRnVuY3Rpb24gdXNlZCB0byBwb3AgYW4gaXRlbSBmcm9tIGEgaGVhcCByZXByZXNlbnRlZCBieSBhIHJhdyBhcnJheS5cbiAqXG4gKiBAcGFyYW0gIHtmdW5jdGlvbn0gY29tcGFyZSAtIENvbXBhcmlzb24gZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHthcnJheX0gICAgaGVhcCAgICAtIEFycmF5IHN0b3JpbmcgdGhlIGhlYXAncyBkYXRhLlxuICogQHJldHVybiB7YW55fVxuICovXG5mdW5jdGlvbiBwb3AoY29tcGFyZSwgaGVhcCkge1xuICB2YXIgbGFzdEl0ZW0gPSBoZWFwLnBvcCgpO1xuXG4gIGlmIChoZWFwLmxlbmd0aCAhPT0gMCkge1xuICAgIHZhciBpdGVtID0gaGVhcFswXTtcbiAgICBoZWFwWzBdID0gbGFzdEl0ZW07XG4gICAgc2lmdFVwKGNvbXBhcmUsIGhlYXAsIDApO1xuXG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cblxuICByZXR1cm4gbGFzdEl0ZW07XG59XG5cbi8qKlxuICogRnVuY3Rpb24gdXNlZCB0byBwb3AgdGhlIGhlYXAgdGhlbiBwdXNoIGEgbmV3IHZhbHVlIGludG8gaXQsIHRodXMgXCJyZXBsYWNpbmdcIlxuICogaXQuXG4gKlxuICogQHBhcmFtICB7ZnVuY3Rpb259IGNvbXBhcmUgLSBDb21wYXJpc29uIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7YXJyYXl9ICAgIGhlYXAgICAgLSBBcnJheSBzdG9yaW5nIHRoZSBoZWFwJ3MgZGF0YS5cbiAqIEBwYXJhbSAge2FueX0gICAgICBpdGVtICAgIC0gVGhlIGl0ZW0gdG8gcHVzaC5cbiAqIEByZXR1cm4ge2FueX1cbiAqL1xuZnVuY3Rpb24gcmVwbGFjZShjb21wYXJlLCBoZWFwLCBpdGVtKSB7XG4gIGlmIChoZWFwLmxlbmd0aCA9PT0gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ21uZW1vbmlzdC9oZWFwLnJlcGxhY2U6IGNhbm5vdCBwb3AgYW4gZW1wdHkgaGVhcC4nKTtcblxuICB2YXIgcG9wcGVkID0gaGVhcFswXTtcbiAgaGVhcFswXSA9IGl0ZW07XG4gIHNpZnRVcChjb21wYXJlLCBoZWFwLCAwKTtcblxuICByZXR1cm4gcG9wcGVkO1xufVxuXG4vKipcbiAqIEZ1bmN0aW9uIHVzZWQgdG8gcHVzaCBhbiBpdGVtIGluIHRoZSBoZWFwIHRoZW4gcG9wIHRoZSBoZWFwIGFuZCByZXR1cm4gdGhlXG4gKiBwb3BwZWQgdmFsdWUuXG4gKlxuICogQHBhcmFtICB7ZnVuY3Rpb259IGNvbXBhcmUgLSBDb21wYXJpc29uIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7YXJyYXl9ICAgIGhlYXAgICAgLSBBcnJheSBzdG9yaW5nIHRoZSBoZWFwJ3MgZGF0YS5cbiAqIEBwYXJhbSAge2FueX0gICAgICBpdGVtICAgIC0gVGhlIGl0ZW0gdG8gcHVzaC5cbiAqIEByZXR1cm4ge2FueX1cbiAqL1xuZnVuY3Rpb24gcHVzaHBvcChjb21wYXJlLCBoZWFwLCBpdGVtKSB7XG4gIHZhciB0bXA7XG5cbiAgaWYgKGhlYXAubGVuZ3RoICE9PSAwICYmIGNvbXBhcmUoaGVhcFswXSwgaXRlbSkgPCAwKSB7XG4gICAgdG1wID0gaGVhcFswXTtcbiAgICBoZWFwWzBdID0gaXRlbTtcbiAgICBpdGVtID0gdG1wO1xuICAgIHNpZnRVcChjb21wYXJlLCBoZWFwLCAwKTtcbiAgfVxuXG4gIHJldHVybiBpdGVtO1xufVxuXG4vKipcbiAqIENvbnZlcnRzIGFuZCBhcnJheSBpbnRvIGFuIGFic3RyYWN0IGhlYXAgaW4gbGluZWFyIHRpbWUuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY29tcGFyZSAtIENvbXBhcmlzb24gZnVuY3Rpb24uXG4gKiBAcGFyYW0ge2FycmF5fSAgICBhcnJheSAgIC0gVGFyZ2V0IGFycmF5LlxuICovXG5mdW5jdGlvbiBoZWFwaWZ5KGNvbXBhcmUsIGFycmF5KSB7XG4gIHZhciBuID0gYXJyYXkubGVuZ3RoLFxuICAgICAgbCA9IG4gPj4gMSxcbiAgICAgIGkgPSBsO1xuXG4gIHdoaWxlICgtLWkgPj0gMClcbiAgICBzaWZ0VXAoY29tcGFyZSwgYXJyYXksIGkpO1xufVxuXG4vKipcbiAqIEZ1bGx5IGNvbnN1bWVzIHRoZSBnaXZlbiBoZWFwLlxuICpcbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBjb21wYXJlIC0gQ29tcGFyaXNvbiBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge2FycmF5fSAgICBoZWFwICAgIC0gQXJyYXkgc3RvcmluZyB0aGUgaGVhcCdzIGRhdGEuXG4gKiBAcmV0dXJuIHthcnJheX1cbiAqL1xuZnVuY3Rpb24gY29uc3VtZShjb21wYXJlLCBoZWFwKSB7XG4gIHZhciBsID0gaGVhcC5sZW5ndGgsXG4gICAgICBpID0gMDtcblxuICB2YXIgYXJyYXkgPSBuZXcgQXJyYXkobCk7XG5cbiAgd2hpbGUgKGkgPCBsKVxuICAgIGFycmF5W2krK10gPSBwb3AoY29tcGFyZSwgaGVhcCk7XG5cbiAgcmV0dXJuIGFycmF5O1xufVxuXG4vKipcbiAqIEZ1bmN0aW9uIHVzZWQgdG8gcmV0cmlldmUgdGhlIG4gc21hbGxlc3QgaXRlbXMgZnJvbSB0aGUgZ2l2ZW4gaXRlcmFibGUuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY29tcGFyZSAgLSBDb21wYXJpc29uIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtudW1iZXJ9ICAgbiAgICAgICAgLSBOdW1iZXIgb2YgdG9wIGl0ZW1zIHRvIHJldHJpZXZlLlxuICogQHBhcmFtIHthbnl9ICAgICAgaXRlcmFibGUgLSBBcmJpdHJhcnkgaXRlcmFibGUuXG4gKiBAcGFyYW0ge2FycmF5fVxuICovXG5mdW5jdGlvbiBuc21hbGxlc3QoY29tcGFyZSwgbiwgaXRlcmFibGUpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICBpdGVyYWJsZSA9IG47XG4gICAgbiA9IGNvbXBhcmU7XG4gICAgY29tcGFyZSA9IERFRkFVTFRfQ09NUEFSQVRPUjtcbiAgfVxuXG4gIHZhciByZXZlcnNlQ29tcGFyZSA9IHJldmVyc2VDb21wYXJhdG9yKGNvbXBhcmUpO1xuXG4gIHZhciBpLCBsLCB2O1xuXG4gIHZhciBtaW4gPSBJbmZpbml0eTtcblxuICB2YXIgcmVzdWx0O1xuXG4gIC8vIElmIG4gaXMgZXF1YWwgdG8gMSwgaXQncyBqdXN0IGEgbWF0dGVyIG9mIGZpbmRpbmcgdGhlIG1pbmltdW1cbiAgaWYgKG4gPT09IDEpIHtcbiAgICBpZiAoaXRlcmFibGVzLmlzQXJyYXlMaWtlKGl0ZXJhYmxlKSkge1xuICAgICAgZm9yIChpID0gMCwgbCA9IGl0ZXJhYmxlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2ID0gaXRlcmFibGVbaV07XG5cbiAgICAgICAgaWYgKG1pbiA9PT0gSW5maW5pdHkgfHwgY29tcGFyZSh2LCBtaW4pIDwgMClcbiAgICAgICAgICBtaW4gPSB2O1xuICAgICAgfVxuXG4gICAgICByZXN1bHQgPSBuZXcgaXRlcmFibGUuY29uc3RydWN0b3IoMSk7XG4gICAgICByZXN1bHRbMF0gPSBtaW47XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgZm9yRWFjaChpdGVyYWJsZSwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmIChtaW4gPT09IEluZmluaXR5IHx8IGNvbXBhcmUodmFsdWUsIG1pbikgPCAwKVxuICAgICAgICBtaW4gPSB2YWx1ZTtcbiAgICB9KTtcblxuICAgIHJldHVybiBbbWluXTtcbiAgfVxuXG4gIGlmIChpdGVyYWJsZXMuaXNBcnJheUxpa2UoaXRlcmFibGUpKSB7XG5cbiAgICAvLyBJZiBuID4gaXRlcmFibGUgbGVuZ3RoLCB3ZSBqdXN0IGNsb25lIGFuZCBzb3J0XG4gICAgaWYgKG4gPj0gaXRlcmFibGUubGVuZ3RoKVxuICAgICAgcmV0dXJuIGl0ZXJhYmxlLnNsaWNlKCkuc29ydChjb21wYXJlKTtcblxuICAgIHJlc3VsdCA9IGl0ZXJhYmxlLnNsaWNlKDAsIG4pO1xuICAgIGhlYXBpZnkocmV2ZXJzZUNvbXBhcmUsIHJlc3VsdCk7XG5cbiAgICBmb3IgKGkgPSBuLCBsID0gaXRlcmFibGUubGVuZ3RoOyBpIDwgbDsgaSsrKVxuICAgICAgaWYgKHJldmVyc2VDb21wYXJlKGl0ZXJhYmxlW2ldLCByZXN1bHRbMF0pID4gMClcbiAgICAgICAgcmVwbGFjZShyZXZlcnNlQ29tcGFyZSwgcmVzdWx0LCBpdGVyYWJsZVtpXSk7XG5cbiAgICAvLyBOT1RFOiBpZiBuIGlzIG92ZXIgc29tZSBudW1iZXIsIGl0IGJlY29tZXMgZmFzdGVyIHRvIGNvbnN1bWUgdGhlIGhlYXBcbiAgICByZXR1cm4gcmVzdWx0LnNvcnQoY29tcGFyZSk7XG4gIH1cblxuICAvLyBDb3JyZWN0IGZvciBzaXplXG4gIHZhciBzaXplID0gaXRlcmFibGVzLmd1ZXNzTGVuZ3RoKGl0ZXJhYmxlKTtcblxuICBpZiAoc2l6ZSAhPT0gbnVsbCAmJiBzaXplIDwgbilcbiAgICBuID0gc2l6ZTtcblxuICByZXN1bHQgPSBuZXcgQXJyYXkobik7XG4gIGkgPSAwO1xuXG4gIGZvckVhY2goaXRlcmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKGkgPCBuKSB7XG4gICAgICByZXN1bHRbaV0gPSB2YWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBpZiAoaSA9PT0gbilcbiAgICAgICAgaGVhcGlmeShyZXZlcnNlQ29tcGFyZSwgcmVzdWx0KTtcblxuICAgICAgaWYgKHJldmVyc2VDb21wYXJlKHZhbHVlLCByZXN1bHRbMF0pID4gMClcbiAgICAgICAgcmVwbGFjZShyZXZlcnNlQ29tcGFyZSwgcmVzdWx0LCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgaSsrO1xuICB9KTtcblxuICBpZiAocmVzdWx0Lmxlbmd0aCA+IGkpXG4gICAgcmVzdWx0Lmxlbmd0aCA9IGk7XG5cbiAgLy8gTk9URTogaWYgbiBpcyBvdmVyIHNvbWUgbnVtYmVyLCBpdCBiZWNvbWVzIGZhc3RlciB0byBjb25zdW1lIHRoZSBoZWFwXG4gIHJldHVybiByZXN1bHQuc29ydChjb21wYXJlKTtcbn1cblxuLyoqXG4gKiBGdW5jdGlvbiB1c2VkIHRvIHJldHJpZXZlIHRoZSBuIGxhcmdlc3QgaXRlbXMgZnJvbSB0aGUgZ2l2ZW4gaXRlcmFibGUuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY29tcGFyZSAgLSBDb21wYXJpc29uIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtudW1iZXJ9ICAgbiAgICAgICAgLSBOdW1iZXIgb2YgdG9wIGl0ZW1zIHRvIHJldHJpZXZlLlxuICogQHBhcmFtIHthbnl9ICAgICAgaXRlcmFibGUgLSBBcmJpdHJhcnkgaXRlcmFibGUuXG4gKiBAcGFyYW0ge2FycmF5fVxuICovXG5mdW5jdGlvbiBubGFyZ2VzdChjb21wYXJlLCBuLCBpdGVyYWJsZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIGl0ZXJhYmxlID0gbjtcbiAgICBuID0gY29tcGFyZTtcbiAgICBjb21wYXJlID0gREVGQVVMVF9DT01QQVJBVE9SO1xuICB9XG5cbiAgdmFyIHJldmVyc2VDb21wYXJlID0gcmV2ZXJzZUNvbXBhcmF0b3IoY29tcGFyZSk7XG5cbiAgdmFyIGksIGwsIHY7XG5cbiAgdmFyIG1heCA9IC1JbmZpbml0eTtcblxuICB2YXIgcmVzdWx0O1xuXG4gIC8vIElmIG4gaXMgZXF1YWwgdG8gMSwgaXQncyBqdXN0IGEgbWF0dGVyIG9mIGZpbmRpbmcgdGhlIG1heGltdW1cbiAgaWYgKG4gPT09IDEpIHtcbiAgICBpZiAoaXRlcmFibGVzLmlzQXJyYXlMaWtlKGl0ZXJhYmxlKSkge1xuICAgICAgZm9yIChpID0gMCwgbCA9IGl0ZXJhYmxlLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2ID0gaXRlcmFibGVbaV07XG5cbiAgICAgICAgaWYgKG1heCA9PT0gLUluZmluaXR5IHx8IGNvbXBhcmUodiwgbWF4KSA+IDApXG4gICAgICAgICAgbWF4ID0gdjtcbiAgICAgIH1cblxuICAgICAgcmVzdWx0ID0gbmV3IGl0ZXJhYmxlLmNvbnN0cnVjdG9yKDEpO1xuICAgICAgcmVzdWx0WzBdID0gbWF4O1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIGZvckVhY2goaXRlcmFibGUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAobWF4ID09PSAtSW5maW5pdHkgfHwgY29tcGFyZSh2YWx1ZSwgbWF4KSA+IDApXG4gICAgICAgIG1heCA9IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIFttYXhdO1xuICB9XG5cbiAgaWYgKGl0ZXJhYmxlcy5pc0FycmF5TGlrZShpdGVyYWJsZSkpIHtcblxuICAgIC8vIElmIG4gPiBpdGVyYWJsZSBsZW5ndGgsIHdlIGp1c3QgY2xvbmUgYW5kIHNvcnRcbiAgICBpZiAobiA+PSBpdGVyYWJsZS5sZW5ndGgpXG4gICAgICByZXR1cm4gaXRlcmFibGUuc2xpY2UoKS5zb3J0KHJldmVyc2VDb21wYXJlKTtcblxuICAgIHJlc3VsdCA9IGl0ZXJhYmxlLnNsaWNlKDAsIG4pO1xuICAgIGhlYXBpZnkoY29tcGFyZSwgcmVzdWx0KTtcblxuICAgIGZvciAoaSA9IG4sIGwgPSBpdGVyYWJsZS5sZW5ndGg7IGkgPCBsOyBpKyspXG4gICAgICBpZiAoY29tcGFyZShpdGVyYWJsZVtpXSwgcmVzdWx0WzBdKSA+IDApXG4gICAgICAgIHJlcGxhY2UoY29tcGFyZSwgcmVzdWx0LCBpdGVyYWJsZVtpXSk7XG5cbiAgICAvLyBOT1RFOiBpZiBuIGlzIG92ZXIgc29tZSBudW1iZXIsIGl0IGJlY29tZXMgZmFzdGVyIHRvIGNvbnN1bWUgdGhlIGhlYXBcbiAgICByZXR1cm4gcmVzdWx0LnNvcnQocmV2ZXJzZUNvbXBhcmUpO1xuICB9XG5cbiAgLy8gQ29ycmVjdCBmb3Igc2l6ZVxuICB2YXIgc2l6ZSA9IGl0ZXJhYmxlcy5ndWVzc0xlbmd0aChpdGVyYWJsZSk7XG5cbiAgaWYgKHNpemUgIT09IG51bGwgJiYgc2l6ZSA8IG4pXG4gICAgbiA9IHNpemU7XG5cbiAgcmVzdWx0ID0gbmV3IEFycmF5KG4pO1xuICBpID0gMDtcblxuICBmb3JFYWNoKGl0ZXJhYmxlLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmIChpIDwgbikge1xuICAgICAgcmVzdWx0W2ldID0gdmFsdWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaWYgKGkgPT09IG4pXG4gICAgICAgIGhlYXBpZnkoY29tcGFyZSwgcmVzdWx0KTtcblxuICAgICAgaWYgKGNvbXBhcmUodmFsdWUsIHJlc3VsdFswXSkgPiAwKVxuICAgICAgICByZXBsYWNlKGNvbXBhcmUsIHJlc3VsdCwgdmFsdWUpO1xuICAgIH1cblxuICAgIGkrKztcbiAgfSk7XG5cbiAgaWYgKHJlc3VsdC5sZW5ndGggPiBpKVxuICAgIHJlc3VsdC5sZW5ndGggPSBpO1xuXG4gIC8vIE5PVEU6IGlmIG4gaXMgb3ZlciBzb21lIG51bWJlciwgaXQgYmVjb21lcyBmYXN0ZXIgdG8gY29uc3VtZSB0aGUgaGVhcFxuICByZXR1cm4gcmVzdWx0LnNvcnQocmV2ZXJzZUNvbXBhcmUpO1xufVxuXG4vKipcbiAqIEJpbmFyeSBNaW5pbXVtIEhlYXAuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjb21wYXJhdG9yIC0gQ29tcGFyYXRvciBmdW5jdGlvbiB0byB1c2UuXG4gKi9cbmZ1bmN0aW9uIEhlYXAoY29tcGFyYXRvcikge1xuICB0aGlzLmNsZWFyKCk7XG4gIHRoaXMuY29tcGFyYXRvciA9IGNvbXBhcmF0b3IgfHwgREVGQVVMVF9DT01QQVJBVE9SO1xuXG4gIGlmICh0eXBlb2YgdGhpcy5jb21wYXJhdG9yICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBFcnJvcignbW5lbW9uaXN0L0hlYXAuY29uc3RydWN0b3I6IGdpdmVuIGNvbXBhcmF0b3Igc2hvdWxkIGJlIGEgZnVuY3Rpb24uJyk7XG59XG5cbi8qKlxuICogTWV0aG9kIHVzZWQgdG8gY2xlYXIgdGhlIGhlYXAuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfVxuICovXG5IZWFwLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuXG4gIC8vIFByb3BlcnRpZXNcbiAgdGhpcy5pdGVtcyA9IFtdO1xuICB0aGlzLnNpemUgPSAwO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdXNlZCB0byBwdXNoIGFuIGl0ZW0gaW50byB0aGUgaGVhcC5cbiAqXG4gKiBAcGFyYW0gIHthbnl9ICAgIGl0ZW0gLSBJdGVtIHRvIHB1c2guXG4gKiBAcmV0dXJuIHtudW1iZXJ9XG4gKi9cbkhlYXAucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbihpdGVtKSB7XG4gIHB1c2godGhpcy5jb21wYXJhdG9yLCB0aGlzLml0ZW1zLCBpdGVtKTtcbiAgcmV0dXJuICsrdGhpcy5zaXplO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdXNlZCB0byByZXRyaWV2ZSB0aGUgXCJmaXJzdFwiIGl0ZW0gb2YgdGhlIGhlYXAuXG4gKlxuICogQHJldHVybiB7YW55fVxuICovXG5IZWFwLnByb3RvdHlwZS5wZWVrID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLml0ZW1zWzBdO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdXNlZCB0byByZXRyaWV2ZSAmIHJlbW92ZSB0aGUgXCJmaXJzdFwiIGl0ZW0gb2YgdGhlIGhlYXAuXG4gKlxuICogQHJldHVybiB7YW55fVxuICovXG5IZWFwLnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuc2l6ZSAhPT0gMClcbiAgICB0aGlzLnNpemUtLTtcblxuICByZXR1cm4gcG9wKHRoaXMuY29tcGFyYXRvciwgdGhpcy5pdGVtcyk7XG59O1xuXG4vKipcbiAqIE1ldGhvZCB1c2VkIHRvIHBvcCB0aGUgaGVhcCwgdGhlbiBwdXNoIGFuIGl0ZW0gYW5kIHJldHVybiB0aGUgcG9wcGVkXG4gKiBpdGVtLlxuICpcbiAqIEBwYXJhbSAge2FueX0gaXRlbSAtIEl0ZW0gdG8gcHVzaCBpbnRvIHRoZSBoZWFwLlxuICogQHJldHVybiB7YW55fVxuICovXG5IZWFwLnByb3RvdHlwZS5yZXBsYWNlID0gZnVuY3Rpb24oaXRlbSkge1xuICByZXR1cm4gcmVwbGFjZSh0aGlzLmNvbXBhcmF0b3IsIHRoaXMuaXRlbXMsIGl0ZW0pO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdXNlZCB0byBwdXNoIHRoZSBoZWFwLCB0aGUgcG9wIGl0IGFuZCByZXR1cm4gdGhlIHBvb3BlZCBpdGVtLlxuICpcbiAqIEBwYXJhbSAge2FueX0gaXRlbSAtIEl0ZW0gdG8gcHVzaCBpbnRvIHRoZSBoZWFwLlxuICogQHJldHVybiB7YW55fVxuICovXG5IZWFwLnByb3RvdHlwZS5wdXNocG9wID0gZnVuY3Rpb24oaXRlbSkge1xuICByZXR1cm4gcHVzaHBvcCh0aGlzLmNvbXBhcmF0b3IsIHRoaXMuaXRlbXMsIGl0ZW0pO1xufTtcblxuLyoqXG4gKiBNZXRob2QgdXNlZCB0byBjb25zdW1lIHRoZSBoZWFwIGZ1bGx5IGFuZCByZXR1cm4gaXRzIGl0ZW1zIGFzIGEgc29ydGVkIGFycmF5LlxuICpcbiAqIEByZXR1cm4ge2FycmF5fVxuICovXG5IZWFwLnByb3RvdHlwZS5jb25zdW1lID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuc2l6ZSA9IDA7XG4gIHJldHVybiBjb25zdW1lKHRoaXMuY29tcGFyYXRvciwgdGhpcy5pdGVtcyk7XG59O1xuXG4vKipcbiAqIE1ldGhvZCB1c2VkIHRvIGNvbnZlcnQgdGhlIGhlYXAgdG8gYW4gYXJyYXkuIE5vdGUgdGhhdCBpdCBiYXNpY2FsbHkgY2xvbmVcbiAqIHRoZSBoZWFwIGFuZCBjb25zdW1lcyBpdCBjb21wbGV0ZWx5LiBUaGlzIGlzIGhhcmRseSBwZXJmb3JtYW50LlxuICpcbiAqIEByZXR1cm4ge2FycmF5fVxuICovXG5IZWFwLnByb3RvdHlwZS50b0FycmF5ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBjb25zdW1lKHRoaXMuY29tcGFyYXRvciwgdGhpcy5pdGVtcy5zbGljZSgpKTtcbn07XG5cbi8qKlxuICogQ29udmVuaWVuY2Uga25vd24gbWV0aG9kcy5cbiAqL1xuSGVhcC5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcHJveHkgPSB0aGlzLnRvQXJyYXkoKTtcblxuICAvLyBUcmljayBzbyB0aGF0IG5vZGUgZGlzcGxheXMgdGhlIG5hbWUgb2YgdGhlIGNvbnN0cnVjdG9yXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm94eSwgJ2NvbnN0cnVjdG9yJywge1xuICAgIHZhbHVlOiBIZWFwLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pO1xuXG4gIHJldHVybiBwcm94eTtcbn07XG5cbmlmICh0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJylcbiAgSGVhcC5wcm90b3R5cGVbU3ltYm9sLmZvcignbm9kZWpzLnV0aWwuaW5zcGVjdC5jdXN0b20nKV0gPSBIZWFwLnByb3RvdHlwZS5pbnNwZWN0O1xuXG4vKipcbiAqIEJpbmFyeSBNYXhpbXVtIEhlYXAuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjb21wYXJhdG9yIC0gQ29tcGFyYXRvciBmdW5jdGlvbiB0byB1c2UuXG4gKi9cbmZ1bmN0aW9uIE1heEhlYXAoY29tcGFyYXRvcikge1xuICB0aGlzLmNsZWFyKCk7XG4gIHRoaXMuY29tcGFyYXRvciA9IGNvbXBhcmF0b3IgfHwgREVGQVVMVF9DT01QQVJBVE9SO1xuXG4gIGlmICh0eXBlb2YgdGhpcy5jb21wYXJhdG9yICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBFcnJvcignbW5lbW9uaXN0L01heEhlYXAuY29uc3RydWN0b3I6IGdpdmVuIGNvbXBhcmF0b3Igc2hvdWxkIGJlIGEgZnVuY3Rpb24uJyk7XG5cbiAgdGhpcy5jb21wYXJhdG9yID0gcmV2ZXJzZUNvbXBhcmF0b3IodGhpcy5jb21wYXJhdG9yKTtcbn1cblxuTWF4SGVhcC5wcm90b3R5cGUgPSBIZWFwLnByb3RvdHlwZTtcblxuLyoqXG4gKiBTdGF0aWMgQC5mcm9tIGZ1bmN0aW9uIHRha2luZyBhbiBhcmJpdHJhcnkgaXRlcmFibGUgJiBjb252ZXJ0aW5nIGl0IGludG9cbiAqIGEgaGVhcC5cbiAqXG4gKiBAcGFyYW0gIHtJdGVyYWJsZX0gaXRlcmFibGUgICAtIFRhcmdldCBpdGVyYWJsZS5cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBjb21wYXJhdG9yIC0gQ3VzdG9tIGNvbXBhcmF0b3IgZnVuY3Rpb24uXG4gKiBAcmV0dXJuIHtIZWFwfVxuICovXG5IZWFwLmZyb20gPSBmdW5jdGlvbihpdGVyYWJsZSwgY29tcGFyYXRvcikge1xuICB2YXIgaGVhcCA9IG5ldyBIZWFwKGNvbXBhcmF0b3IpO1xuXG4gIHZhciBpdGVtcztcblxuICAvLyBJZiBpdGVyYWJsZSBpcyBhbiBhcnJheSwgd2UgY2FuIGJlIGNsZXZlciBhYm91dCBpdFxuICBpZiAoaXRlcmFibGVzLmlzQXJyYXlMaWtlKGl0ZXJhYmxlKSlcbiAgICBpdGVtcyA9IGl0ZXJhYmxlLnNsaWNlKCk7XG4gIGVsc2VcbiAgICBpdGVtcyA9IGl0ZXJhYmxlcy50b0FycmF5KGl0ZXJhYmxlKTtcblxuICBoZWFwaWZ5KGhlYXAuY29tcGFyYXRvciwgaXRlbXMpO1xuICBoZWFwLml0ZW1zID0gaXRlbXM7XG4gIGhlYXAuc2l6ZSA9IGl0ZW1zLmxlbmd0aDtcblxuICByZXR1cm4gaGVhcDtcbn07XG5cbk1heEhlYXAuZnJvbSA9IGZ1bmN0aW9uKGl0ZXJhYmxlLCBjb21wYXJhdG9yKSB7XG4gIHZhciBoZWFwID0gbmV3IE1heEhlYXAoY29tcGFyYXRvcik7XG5cbiAgdmFyIGl0ZW1zO1xuXG4gIC8vIElmIGl0ZXJhYmxlIGlzIGFuIGFycmF5LCB3ZSBjYW4gYmUgY2xldmVyIGFib3V0IGl0XG4gIGlmIChpdGVyYWJsZXMuaXNBcnJheUxpa2UoaXRlcmFibGUpKVxuICAgIGl0ZW1zID0gaXRlcmFibGUuc2xpY2UoKTtcbiAgZWxzZVxuICAgIGl0ZW1zID0gaXRlcmFibGVzLnRvQXJyYXkoaXRlcmFibGUpO1xuXG4gIGhlYXBpZnkoaGVhcC5jb21wYXJhdG9yLCBpdGVtcyk7XG4gIGhlYXAuaXRlbXMgPSBpdGVtcztcbiAgaGVhcC5zaXplID0gaXRlbXMubGVuZ3RoO1xuXG4gIHJldHVybiBoZWFwO1xufTtcblxuLyoqXG4gKiBFeHBvcnRpbmcuXG4gKi9cbkhlYXAuc2lmdFVwID0gc2lmdFVwO1xuSGVhcC5zaWZ0RG93biA9IHNpZnREb3duO1xuSGVhcC5wdXNoID0gcHVzaDtcbkhlYXAucG9wID0gcG9wO1xuSGVhcC5yZXBsYWNlID0gcmVwbGFjZTtcbkhlYXAucHVzaHBvcCA9IHB1c2hwb3A7XG5IZWFwLmhlYXBpZnkgPSBoZWFwaWZ5O1xuSGVhcC5jb25zdW1lID0gY29uc3VtZTtcblxuSGVhcC5uc21hbGxlc3QgPSBuc21hbGxlc3Q7XG5IZWFwLm5sYXJnZXN0ID0gbmxhcmdlc3Q7XG5cbkhlYXAuTWluSGVhcCA9IEhlYXA7XG5IZWFwLk1heEhlYXAgPSBNYXhIZWFwO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhlYXA7XG4iLCIvKipcbiAqIE1uZW1vbmlzdCBIZWFwIENvbXBhcmF0b3JzXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqXG4gKiBEZWZhdWx0IGNvbXBhcmF0b3JzICYgZnVuY3Rpb25zIGRlYWxpbmcgd2l0aCBjb21wYXJhdG9ycyByZXZlcnNpbmcgZXRjLlxuICovXG52YXIgREVGQVVMVF9DT01QQVJBVE9SID0gZnVuY3Rpb24oYSwgYikge1xuICBpZiAoYSA8IGIpXG4gICAgcmV0dXJuIC0xO1xuICBpZiAoYSA+IGIpXG4gICAgcmV0dXJuIDE7XG5cbiAgcmV0dXJuIDA7XG59O1xuXG52YXIgREVGQVVMVF9SRVZFUlNFX0NPTVBBUkFUT1IgPSBmdW5jdGlvbihhLCBiKSB7XG4gIGlmIChhIDwgYilcbiAgICByZXR1cm4gMTtcbiAgaWYgKGEgPiBiKVxuICAgIHJldHVybiAtMTtcblxuICByZXR1cm4gMDtcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gdXNlZCB0byByZXZlcnNlIGEgY29tcGFyYXRvci5cbiAqL1xuZnVuY3Rpb24gcmV2ZXJzZUNvbXBhcmF0b3IoY29tcGFyYXRvcikge1xuICByZXR1cm4gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBjb21wYXJhdG9yKGIsIGEpO1xuICB9O1xufVxuXG4vKipcbiAqIEZ1bmN0aW9uIHJldHVybmluZyBhIHR1cGxlIGNvbXBhcmF0b3IuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVR1cGxlQ29tcGFyYXRvcihzaXplKSB7XG4gIGlmIChzaXplID09PSAyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIGlmIChhWzBdIDwgYlswXSlcbiAgICAgICAgcmV0dXJuIC0xO1xuXG4gICAgICBpZiAoYVswXSA+IGJbMF0pXG4gICAgICAgIHJldHVybiAxO1xuXG4gICAgICBpZiAoYVsxXSA8IGJbMV0pXG4gICAgICAgIHJldHVybiAtMTtcblxuICAgICAgaWYgKGFbMV0gPiBiWzFdKVxuICAgICAgICByZXR1cm4gMTtcblxuICAgICAgcmV0dXJuIDA7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihhLCBiKSB7XG4gICAgdmFyIGkgPSAwO1xuXG4gICAgd2hpbGUgKGkgPCBzaXplKSB7XG4gICAgICBpZiAoYVtpXSA8IGJbaV0pXG4gICAgICAgIHJldHVybiAtMTtcblxuICAgICAgaWYgKGFbaV0gPiBiW2ldKVxuICAgICAgICByZXR1cm4gMTtcblxuICAgICAgaSsrO1xuICAgIH1cblxuICAgIHJldHVybiAwO1xuICB9O1xufVxuXG4vKipcbiAqIEV4cG9ydGluZy5cbiAqL1xuZXhwb3J0cy5ERUZBVUxUX0NPTVBBUkFUT1IgPSBERUZBVUxUX0NPTVBBUkFUT1I7XG5leHBvcnRzLkRFRkFVTFRfUkVWRVJTRV9DT01QQVJBVE9SID0gREVGQVVMVF9SRVZFUlNFX0NPTVBBUkFUT1I7XG5leHBvcnRzLnJldmVyc2VDb21wYXJhdG9yID0gcmV2ZXJzZUNvbXBhcmF0b3I7XG5leHBvcnRzLmNyZWF0ZVR1cGxlQ29tcGFyYXRvciA9IGNyZWF0ZVR1cGxlQ29tcGFyYXRvcjtcbiIsIi8qKlxuICogTW5lbW9uaXN0IEl0ZXJhYmxlIEZ1bmN0aW9uXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKlxuICogSGFybW9uaXplZCBpdGVyYXRpb24gaGVscGVycyBvdmVyIG1peGVkIGl0ZXJhYmxlIHRhcmdldHMuXG4gKi9cbnZhciBmb3JFYWNoID0gcmVxdWlyZSgnb2JsaXRlcmF0b3IvZm9yZWFjaCcpO1xuXG52YXIgdHlwZWQgPSByZXF1aXJlKCcuL3R5cGVkLWFycmF5cy5qcycpO1xuXG4vKipcbiAqIEZ1bmN0aW9uIHVzZWQgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBzdXBwb3J0cyBhcnJheS1saWtlXG4gKiByYW5kb20gYWNjZXNzLlxuICpcbiAqIEBwYXJhbSAge2FueX0gdGFyZ2V0IC0gVGFyZ2V0IG9iamVjdC5cbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cbmZ1bmN0aW9uIGlzQXJyYXlMaWtlKHRhcmdldCkge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh0YXJnZXQpIHx8IHR5cGVkLmlzVHlwZWRBcnJheSh0YXJnZXQpO1xufVxuXG4vKipcbiAqIEZ1bmN0aW9uIHVzZWQgdG8gZ3Vlc3MgdGhlIGxlbmd0aCBvZiB0aGUgc3RydWN0dXJlIG92ZXIgd2hpY2ggd2UgYXJlIGdvaW5nXG4gKiB0byBpdGVyYXRlLlxuICpcbiAqIEBwYXJhbSAge2FueX0gdGFyZ2V0IC0gVGFyZ2V0IG9iamVjdC5cbiAqIEByZXR1cm4ge251bWJlcnx1bmRlZmluZWR9XG4gKi9cbmZ1bmN0aW9uIGd1ZXNzTGVuZ3RoKHRhcmdldCkge1xuICBpZiAodHlwZW9mIHRhcmdldC5sZW5ndGggPT09ICdudW1iZXInKVxuICAgIHJldHVybiB0YXJnZXQubGVuZ3RoO1xuXG4gIGlmICh0eXBlb2YgdGFyZ2V0LnNpemUgPT09ICdudW1iZXInKVxuICAgIHJldHVybiB0YXJnZXQuc2l6ZTtcblxuICByZXR1cm47XG59XG5cbi8qKlxuICogRnVuY3Rpb24gdXNlZCB0byBjb252ZXJ0IGFuIGl0ZXJhYmxlIHRvIGFuIGFycmF5LlxuICpcbiAqIEBwYXJhbSAge2FueX0gICB0YXJnZXQgLSBJdGVyYXRpb24gdGFyZ2V0LlxuICogQHJldHVybiB7YXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHRvQXJyYXkodGFyZ2V0KSB7XG4gIHZhciBsID0gZ3Vlc3NMZW5ndGgodGFyZ2V0KTtcblxuICB2YXIgYXJyYXkgPSB0eXBlb2YgbCA9PT0gJ251bWJlcicgPyBuZXcgQXJyYXkobCkgOiBbXTtcblxuICB2YXIgaSA9IDA7XG5cbiAgLy8gVE9ETzogd2UgY291bGQgb3B0aW1pemUgd2hlbiBnaXZlbiB0YXJnZXQgaXMgYXJyYXkgbGlrZVxuICBmb3JFYWNoKHRhcmdldCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICBhcnJheVtpKytdID0gdmFsdWU7XG4gIH0pO1xuXG4gIHJldHVybiBhcnJheTtcbn1cblxuLyoqXG4gKiBTYW1lIGFzIGFib3ZlIGJ1dCByZXR1cm5zIGEgc3VwcGxlbWVudGFyeSBpbmRpY2VzIGFycmF5LlxuICpcbiAqIEBwYXJhbSAge2FueX0gICB0YXJnZXQgLSBJdGVyYXRpb24gdGFyZ2V0LlxuICogQHJldHVybiB7YXJyYXl9XG4gKi9cbmZ1bmN0aW9uIHRvQXJyYXlXaXRoSW5kaWNlcyh0YXJnZXQpIHtcbiAgdmFyIGwgPSBndWVzc0xlbmd0aCh0YXJnZXQpO1xuXG4gIHZhciBJbmRleEFycmF5ID0gdHlwZW9mIGwgPT09ICdudW1iZXInID9cbiAgICB0eXBlZC5nZXRQb2ludGVyQXJyYXkobCkgOlxuICAgIEFycmF5O1xuXG4gIHZhciBhcnJheSA9IHR5cGVvZiBsID09PSAnbnVtYmVyJyA/IG5ldyBBcnJheShsKSA6IFtdO1xuICB2YXIgaW5kaWNlcyA9IHR5cGVvZiBsID09PSAnbnVtYmVyJyA/IG5ldyBJbmRleEFycmF5KGwpIDogW107XG5cbiAgdmFyIGkgPSAwO1xuXG4gIC8vIFRPRE86IHdlIGNvdWxkIG9wdGltaXplIHdoZW4gZ2l2ZW4gdGFyZ2V0IGlzIGFycmF5IGxpa2VcbiAgZm9yRWFjaCh0YXJnZXQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgYXJyYXlbaV0gPSB2YWx1ZTtcbiAgICBpbmRpY2VzW2ldID0gaSsrO1xuICB9KTtcblxuICByZXR1cm4gW2FycmF5LCBpbmRpY2VzXTtcbn1cblxuLyoqXG4gKiBFeHBvcnRpbmcuXG4gKi9cbmV4cG9ydHMuaXNBcnJheUxpa2UgPSBpc0FycmF5TGlrZTtcbmV4cG9ydHMuZ3Vlc3NMZW5ndGggPSBndWVzc0xlbmd0aDtcbmV4cG9ydHMudG9BcnJheSA9IHRvQXJyYXk7XG5leHBvcnRzLnRvQXJyYXlXaXRoSW5kaWNlcyA9IHRvQXJyYXlXaXRoSW5kaWNlcztcbiIsIi8qKlxuICogTW5lbW9uaXN0IFR5cGVkIEFycmF5IEhlbHBlcnNcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICpcbiAqIE1pc2NlbGxhbmVvdXMgaGVscGVycyByZWxhdGVkIHRvIHR5cGVkIGFycmF5cy5cbiAqL1xuXG4vKipcbiAqIFdoZW4gdXNpbmcgYW4gdW5zaWduZWQgaW50ZWdlciBhcnJheSB0byBzdG9yZSBwb2ludGVycywgb25lIG1pZ2h0IHdhbnQgdG9cbiAqIGNob29zZSB0aGUgb3B0aW1hbCB3b3JkIHNpemUgaW4gcmVnYXJkcyB0byB0aGUgYWN0dWFsIG51bWJlcnMgb2YgcG9pbnRlcnNcbiAqIHRvIHN0b3JlLlxuICpcbiAqIFRoaXMgaGVscGVycyBkb2VzIGp1c3QgdGhhdC5cbiAqXG4gKiBAcGFyYW0gIHtudW1iZXJ9IHNpemUgLSBFeHBlY3RlZCBzaXplIG9mIHRoZSBhcnJheSB0byBtYXAuXG4gKiBAcmV0dXJuIHtUeXBlZEFycmF5fVxuICovXG52YXIgTUFYXzhCSVRfSU5URUdFUiA9IE1hdGgucG93KDIsIDgpIC0gMSxcbiAgICBNQVhfMTZCSVRfSU5URUdFUiA9IE1hdGgucG93KDIsIDE2KSAtIDEsXG4gICAgTUFYXzMyQklUX0lOVEVHRVIgPSBNYXRoLnBvdygyLCAzMikgLSAxO1xuXG52YXIgTUFYX1NJR05FRF84QklUX0lOVEVHRVIgPSBNYXRoLnBvdygyLCA3KSAtIDEsXG4gICAgTUFYX1NJR05FRF8xNkJJVF9JTlRFR0VSID0gTWF0aC5wb3coMiwgMTUpIC0gMSxcbiAgICBNQVhfU0lHTkVEXzMyQklUX0lOVEVHRVIgPSBNYXRoLnBvdygyLCAzMSkgLSAxO1xuXG5leHBvcnRzLmdldFBvaW50ZXJBcnJheSA9IGZ1bmN0aW9uKHNpemUpIHtcbiAgdmFyIG1heEluZGV4ID0gc2l6ZSAtIDE7XG5cbiAgaWYgKG1heEluZGV4IDw9IE1BWF84QklUX0lOVEVHRVIpXG4gICAgcmV0dXJuIFVpbnQ4QXJyYXk7XG5cbiAgaWYgKG1heEluZGV4IDw9IE1BWF8xNkJJVF9JTlRFR0VSKVxuICAgIHJldHVybiBVaW50MTZBcnJheTtcblxuICBpZiAobWF4SW5kZXggPD0gTUFYXzMyQklUX0lOVEVHRVIpXG4gICAgcmV0dXJuIFVpbnQzMkFycmF5O1xuXG4gIHRocm93IG5ldyBFcnJvcignbW5lbW9uaXN0OiBQb2ludGVyIEFycmF5IG9mIHNpemUgPiA0Mjk0OTY3Mjk1IGlzIG5vdCBzdXBwb3J0ZWQuJyk7XG59O1xuXG5leHBvcnRzLmdldFNpZ25lZFBvaW50ZXJBcnJheSA9IGZ1bmN0aW9uKHNpemUpIHtcbiAgdmFyIG1heEluZGV4ID0gc2l6ZSAtIDE7XG5cbiAgaWYgKG1heEluZGV4IDw9IE1BWF9TSUdORURfOEJJVF9JTlRFR0VSKVxuICAgIHJldHVybiBJbnQ4QXJyYXk7XG5cbiAgaWYgKG1heEluZGV4IDw9IE1BWF9TSUdORURfMTZCSVRfSU5URUdFUilcbiAgICByZXR1cm4gSW50MTZBcnJheTtcblxuICBpZiAobWF4SW5kZXggPD0gTUFYX1NJR05FRF8zMkJJVF9JTlRFR0VSKVxuICAgIHJldHVybiBJbnQzMkFycmF5O1xuXG4gIHJldHVybiBGbG9hdDY0QXJyYXk7XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHJldHVybmluZyB0aGUgbWluaW1hbCB0eXBlIGFibGUgdG8gcmVwcmVzZW50IHRoZSBnaXZlbiBudW1iZXIuXG4gKlxuICogQHBhcmFtICB7bnVtYmVyfSB2YWx1ZSAtIFZhbHVlIHRvIHRlc3QuXG4gKiBAcmV0dXJuIHtUeXBlZEFycmF5Q2xhc3N9XG4gKi9cbmV4cG9ydHMuZ2V0TnVtYmVyVHlwZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cbiAgLy8gPD0gMzIgYml0cyBpdG50ZWdlcj9cbiAgaWYgKHZhbHVlID09PSAodmFsdWUgfCAwKSkge1xuXG4gICAgLy8gTmVnYXRpdmVcbiAgICBpZiAoTWF0aC5zaWduKHZhbHVlKSA9PT0gLTEpIHtcbiAgICAgIGlmICh2YWx1ZSA8PSAxMjcgJiYgdmFsdWUgPj0gLTEyOClcbiAgICAgICAgcmV0dXJuIEludDhBcnJheTtcblxuICAgICAgaWYgKHZhbHVlIDw9IDMyNzY3ICYmIHZhbHVlID49IC0zMjc2OClcbiAgICAgICAgcmV0dXJuIEludDE2QXJyYXk7XG5cbiAgICAgIHJldHVybiBJbnQzMkFycmF5O1xuICAgIH1cbiAgICBlbHNlIHtcblxuICAgICAgaWYgKHZhbHVlIDw9IDI1NSlcbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXk7XG5cbiAgICAgIGlmICh2YWx1ZSA8PSA2NTUzNSlcbiAgICAgICAgcmV0dXJuIFVpbnQxNkFycmF5O1xuXG4gICAgICByZXR1cm4gVWludDMyQXJyYXk7XG4gICAgfVxuICB9XG5cbiAgLy8gNTMgYml0cyBpbnRlZ2VyICYgZmxvYXRzXG4gIC8vIE5PVEU6IGl0J3Mga2luZGEgaGFyZCB0byB0ZWxsIHdoZXRoZXIgd2UgY291bGQgdXNlIDMyYml0cyBvciBub3QuLi5cbiAgcmV0dXJuIEZsb2F0NjRBcnJheTtcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gcmV0dXJuaW5nIHRoZSBtaW5pbWFsIHR5cGUgYWJsZSB0byByZXByZXNlbnQgdGhlIGdpdmVuIGFycmF5XG4gKiBvZiBKYXZhU2NyaXB0IG51bWJlcnMuXG4gKlxuICogQHBhcmFtICB7YXJyYXl9ICAgIGFycmF5ICAtIEFycmF5IHRvIHJlcHJlc2VudC5cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBnZXR0ZXIgLSBPcHRpb25hbCBnZXR0ZXIuXG4gKiBAcmV0dXJuIHtUeXBlZEFycmF5Q2xhc3N9XG4gKi9cbnZhciBUWVBFX1BSSU9SSVRZID0ge1xuICBVaW50OEFycmF5OiAxLFxuICBJbnQ4QXJyYXk6IDIsXG4gIFVpbnQxNkFycmF5OiAzLFxuICBJbnQxNkFycmF5OiA0LFxuICBVaW50MzJBcnJheTogNSxcbiAgSW50MzJBcnJheTogNixcbiAgRmxvYXQzMkFycmF5OiA3LFxuICBGbG9hdDY0QXJyYXk6IDhcbn07XG5cbi8vIFRPRE86IG1ha2UgdGhpcyBhIG9uZS1zaG90IGZvciBvbmUgdmFsdWVcbmV4cG9ydHMuZ2V0TWluaW1hbFJlcHJlc2VudGF0aW9uID0gZnVuY3Rpb24oYXJyYXksIGdldHRlcikge1xuICB2YXIgbWF4VHlwZSA9IG51bGwsXG4gICAgICBtYXhQcmlvcml0eSA9IDAsXG4gICAgICBwLFxuICAgICAgdCxcbiAgICAgIHYsXG4gICAgICBpLFxuICAgICAgbDtcblxuICBmb3IgKGkgPSAwLCBsID0gYXJyYXkubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgdiA9IGdldHRlciA/IGdldHRlcihhcnJheVtpXSkgOiBhcnJheVtpXTtcbiAgICB0ID0gZXhwb3J0cy5nZXROdW1iZXJUeXBlKHYpO1xuICAgIHAgPSBUWVBFX1BSSU9SSVRZW3QubmFtZV07XG5cbiAgICBpZiAocCA+IG1heFByaW9yaXR5KSB7XG4gICAgICBtYXhQcmlvcml0eSA9IHA7XG4gICAgICBtYXhUeXBlID0gdDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWF4VHlwZTtcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gcmV0dXJuaW5nIHdoZXRoZXIgdGhlIGdpdmVuIHZhbHVlIGlzIGEgdHlwZWQgYXJyYXkuXG4gKlxuICogQHBhcmFtICB7YW55fSB2YWx1ZSAtIFZhbHVlIHRvIHRlc3QuXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICovXG5leHBvcnRzLmlzVHlwZWRBcnJheSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnICYmIEFycmF5QnVmZmVyLmlzVmlldyh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHVzZWQgdG8gY29uY2F0IGJ5dGUgYXJyYXlzLlxuICpcbiAqIEBwYXJhbSAgey4uLkJ5dGVBcnJheX1cbiAqIEByZXR1cm4ge0J5dGVBcnJheX1cbiAqL1xuZXhwb3J0cy5jb25jYXQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGxlbmd0aCA9IDAsXG4gICAgICBpLFxuICAgICAgbyxcbiAgICAgIGw7XG5cbiAgZm9yIChpID0gMCwgbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspXG4gICAgbGVuZ3RoICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XG5cbiAgdmFyIGFycmF5ID0gbmV3IChhcmd1bWVudHNbMF0uY29uc3RydWN0b3IpKGxlbmd0aCk7XG5cbiAgZm9yIChpID0gMCwgbyA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICBhcnJheS5zZXQoYXJndW1lbnRzW2ldLCBvKTtcbiAgICBvICs9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XG4gIH1cblxuICByZXR1cm4gYXJyYXk7XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHVzZWQgdG8gaW5pdGlhbGl6ZSBhIGJ5dGUgYXJyYXkgb2YgaW5kaWNlcy5cbiAqXG4gKiBAcGFyYW0gIHtudW1iZXJ9ICAgIGxlbmd0aCAtIExlbmd0aCBvZiB0YXJnZXQuXG4gKiBAcmV0dXJuIHtCeXRlQXJyYXl9XG4gKi9cbmV4cG9ydHMuaW5kaWNlcyA9IGZ1bmN0aW9uKGxlbmd0aCkge1xuICB2YXIgUG9pbnRlckFycmF5ID0gZXhwb3J0cy5nZXRQb2ludGVyQXJyYXkobGVuZ3RoKTtcblxuICB2YXIgYXJyYXkgPSBuZXcgUG9pbnRlckFycmF5KGxlbmd0aCk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICBhcnJheVtpXSA9IGk7XG5cbiAgcmV0dXJuIGFycmF5O1xufTtcbiIsIi8qKlxuICogT2JsaXRlcmF0b3IgRm9yRWFjaCBGdW5jdGlvblxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBlYXNpbHkgaXRlcmF0ZSBvdmVyIG1peGVkIHZhbHVlcy5cbiAqL1xudmFyIHN1cHBvcnQgPSByZXF1aXJlKCcuL3N1cHBvcnQuanMnKTtcblxudmFyIEFSUkFZX0JVRkZFUl9TVVBQT1JUID0gc3VwcG9ydC5BUlJBWV9CVUZGRVJfU1VQUE9SVDtcbnZhciBTWU1CT0xfU1VQUE9SVCA9IHN1cHBvcnQuU1lNQk9MX1NVUFBPUlQ7XG5cbi8qKlxuICogRnVuY3Rpb24gYWJsZSB0byBpdGVyYXRlIG92ZXIgYWxtb3N0IGFueSBpdGVyYWJsZSBKUyB2YWx1ZS5cbiAqXG4gKiBAcGFyYW0gIHthbnl9ICAgICAgaXRlcmFibGUgLSBJdGVyYWJsZSB2YWx1ZS5cbiAqIEBwYXJhbSAge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZvckVhY2goaXRlcmFibGUsIGNhbGxiYWNrKSB7XG4gIHZhciBpdGVyYXRvciwgaywgaSwgbCwgcztcblxuICBpZiAoIWl0ZXJhYmxlKSB0aHJvdyBuZXcgRXJyb3IoJ29ibGl0ZXJhdG9yL2ZvckVhY2g6IGludmFsaWQgaXRlcmFibGUuJyk7XG5cbiAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ29ibGl0ZXJhdG9yL2ZvckVhY2g6IGV4cGVjdGluZyBhIGNhbGxiYWNrLicpO1xuXG4gIC8vIFRoZSB0YXJnZXQgaXMgYW4gYXJyYXkgb3IgYSBzdHJpbmcgb3IgZnVuY3Rpb24gYXJndW1lbnRzXG4gIGlmIChcbiAgICBBcnJheS5pc0FycmF5KGl0ZXJhYmxlKSB8fFxuICAgIChBUlJBWV9CVUZGRVJfU1VQUE9SVCAmJiBBcnJheUJ1ZmZlci5pc1ZpZXcoaXRlcmFibGUpKSB8fFxuICAgIHR5cGVvZiBpdGVyYWJsZSA9PT0gJ3N0cmluZycgfHxcbiAgICBpdGVyYWJsZS50b1N0cmluZygpID09PSAnW29iamVjdCBBcmd1bWVudHNdJ1xuICApIHtcbiAgICBmb3IgKGkgPSAwLCBsID0gaXRlcmFibGUubGVuZ3RoOyBpIDwgbDsgaSsrKSBjYWxsYmFjayhpdGVyYWJsZVtpXSwgaSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gVGhlIHRhcmdldCBoYXMgYSAjLmZvckVhY2ggbWV0aG9kXG4gIGlmICh0eXBlb2YgaXRlcmFibGUuZm9yRWFjaCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGl0ZXJhYmxlLmZvckVhY2goY2FsbGJhY2spO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFRoZSB0YXJnZXQgaXMgaXRlcmFibGVcbiAgaWYgKFxuICAgIFNZTUJPTF9TVVBQT1JUICYmXG4gICAgU3ltYm9sLml0ZXJhdG9yIGluIGl0ZXJhYmxlICYmXG4gICAgdHlwZW9mIGl0ZXJhYmxlLm5leHQgIT09ICdmdW5jdGlvbidcbiAgKSB7XG4gICAgaXRlcmFibGUgPSBpdGVyYWJsZVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cblxuICAvLyBUaGUgdGFyZ2V0IGlzIGFuIGl0ZXJhdG9yXG4gIGlmICh0eXBlb2YgaXRlcmFibGUubmV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGl0ZXJhdG9yID0gaXRlcmFibGU7XG4gICAgaSA9IDA7XG5cbiAgICB3aGlsZSAoKChzID0gaXRlcmF0b3IubmV4dCgpKSwgcy5kb25lICE9PSB0cnVlKSkge1xuICAgICAgY2FsbGJhY2socy52YWx1ZSwgaSk7XG4gICAgICBpKys7XG4gICAgfVxuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gVGhlIHRhcmdldCBpcyBhIHBsYWluIG9iamVjdFxuICBmb3IgKGsgaW4gaXRlcmFibGUpIHtcbiAgICBpZiAoaXRlcmFibGUuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgIGNhbGxiYWNrKGl0ZXJhYmxlW2tdLCBrKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm47XG59O1xuIiwiZXhwb3J0cy5BUlJBWV9CVUZGRVJfU1VQUE9SVCA9IHR5cGVvZiBBcnJheUJ1ZmZlciAhPT0gJ3VuZGVmaW5lZCc7XG5leHBvcnRzLlNZTUJPTF9TVVBQT1JUID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCc7XG4iLCJpbXBvcnQgZmlzaF9zdGFuZGluZyBmcm9tIFwiLi9hc3NldHMvZmlzaC5wbmdcIjtcclxuaW1wb3J0IGZpc2hfd2Fsa2luZzAgZnJvbSBcIi4vYXNzZXRzL2Zpc2hfd2Fsay9maXNoMDAwMC5wbmdcIjtcclxuaW1wb3J0IGZpc2hfd2Fsa2luZzEgZnJvbSBcIi4vYXNzZXRzL2Zpc2hfd2Fsay9maXNoMDAwMS5wbmdcIjtcclxuaW1wb3J0IGZpc2hfd2Fsa2luZzIgZnJvbSBcIi4vYXNzZXRzL2Zpc2hfd2Fsay9maXNoMDAwMi5wbmdcIjtcclxuaW1wb3J0IGZpc2hfd2Fsa2luZzMgZnJvbSBcIi4vYXNzZXRzL2Zpc2hfd2Fsay9maXNoMDAwMy5wbmdcIjtcclxuaW1wb3J0IGZpc2hfd2Fsa2luZzQgZnJvbSBcIi4vYXNzZXRzL2Zpc2hfd2Fsay9maXNoMDAwNC5wbmdcIjtcclxuaW1wb3J0IGZpc2hfd2Fsa2luZzUgZnJvbSBcIi4vYXNzZXRzL2Zpc2hfd2Fsay9maXNoMDAwNS5wbmdcIjtcclxuaW1wb3J0IGZpc2hfd2Fsa2luZzYgZnJvbSBcIi4vYXNzZXRzL2Zpc2hfd2Fsay9maXNoMDAwNi5wbmdcIjtcclxuaW1wb3J0IGZpc2hfd2Fsa2luZzcgZnJvbSBcIi4vYXNzZXRzL2Zpc2hfd2Fsay9maXNoMDAwNy5wbmdcIjtcclxuXHJcbmxldCBOU0laRSA9IDEwO1xyXG5sZXQgZGVmYXVsdFN0YXRlID0ge1xyXG5cdGluaXQoZmlzaCkge1xyXG5cdFx0ZmlzaC5pbWcgPSBmaXNoLmltZ19zdGFuZGluZztcclxuXHR9LFxyXG5cdHVwZGF0ZShmaXNoLCBkdCkge31cclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEZpc2gge1xyXG5cdC8vIHBvc2l0aW9uIG9mIGZpc2ggaXMgZ2l2ZW4gYnkgdHdvIHZlcnRpY2VzIGFuZCBhIHdlaWdodFxyXG5cdGNvbnN0cnVjdG9yKG5hdiwgbjEsIG4yLCB3ZWlnaHQpe1xyXG5cdFx0dGhpcy5pbWdfc3RhbmRpbmcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdHRoaXMuaW1nX3N0YW5kaW5nLnNyYz1maXNoX3N0YW5kaW5nO1xyXG5cdFx0dGhpcy5pbWdfd2Fsa2luZyA9IFtdO1xyXG5cdFx0Zm9yKGxldCBpID0gMDsgaTw4OyBpKyspe1xyXG5cdFx0XHR0aGlzLmltZ193YWxraW5nLnB1c2gobmV3IEltYWdlKCkpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5pbWdfd2Fsa2luZ1swXS5zcmM9ZmlzaF93YWxraW5nMDtcclxuXHRcdHRoaXMuaW1nX3dhbGtpbmdbMV0uc3JjPWZpc2hfd2Fsa2luZzE7XHJcblx0XHR0aGlzLmltZ193YWxraW5nWzJdLnNyYz1maXNoX3dhbGtpbmcyO1xyXG5cdFx0dGhpcy5pbWdfd2Fsa2luZ1szXS5zcmM9ZmlzaF93YWxraW5nMztcclxuXHRcdHRoaXMuaW1nX3dhbGtpbmdbNF0uc3JjPWZpc2hfd2Fsa2luZzQ7XHJcblx0XHR0aGlzLmltZ193YWxraW5nWzVdLnNyYz1maXNoX3dhbGtpbmc1O1xyXG5cdFx0dGhpcy5pbWdfd2Fsa2luZ1s2XS5zcmM9ZmlzaF93YWxraW5nNjtcclxuXHRcdHRoaXMuaW1nX3dhbGtpbmdbN10uc3JjPWZpc2hfd2Fsa2luZzc7XHJcblx0XHR0aGlzLmltZyA9IHRoaXMuaW1nX3N0YW5kaW5nO1xyXG5cdFx0XHJcblx0XHR0aGlzLm5hdiA9IG5hdjtcclxuXHJcblx0XHR0aGlzLmFjdGl2ZSA9IGZhbHNlO1xyXG5cclxuXHRcdHRoaXMubjEgPSBuMTtcclxuXHRcdHRoaXMubjIgPSBuMjtcclxuXHRcdHRoaXMud2VpZ2h0ID0gd2VpZ2h0O1xyXG5cclxuXHRcdHRoaXMudGFyZ2V0ID0gbnVsbDtcclxuXHRcdHRoaXMuc3RhdGUgPSBkZWZhdWx0U3RhdGU7XHJcblx0XHR0aGlzLmZhY2luZ1JpZ2h0ID0gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdHNldFN0YXRlKHN0YXRlKXtcclxuXHRcdHN0YXRlLmluaXQodGhpcyk7XHJcblx0XHR0aGlzLnN0YXRlID0gc3RhdGU7XHJcblx0fVxyXG5cclxuXHRnZXRQb3MoKSB7XHJcblx0XHRsZXQgdjEgPSB0aGlzLm5hdi5ncmFwaC5nZXROb2RlQXR0cmlidXRlcyh0aGlzLm4xKTtcclxuXHRcdGxldCB2MiA9IHRoaXMubmF2LmdyYXBoLmdldE5vZGVBdHRyaWJ1dGVzKHRoaXMubjIpO1xyXG5cdFx0cmV0dXJuIHYxLnBvcy5zY2FsZWRCeSgxLjAtdGhpcy53ZWlnaHQpLnBsdXModjIucG9zLnNjYWxlZEJ5KHRoaXMud2VpZ2h0KSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoZXZlbnRRdWV1ZSwgZHQpe1xyXG5cdFx0bGV0IGkgPSBldmVudFF1ZXVlLmxlbmd0aDtcclxuXHRcdHdoaWxlKGktLSl7XHJcblx0XHRcdGxldCBbZSwgbmFtZV0gPSBldmVudFF1ZXVlW2ldO1xyXG5cdFx0XHRpZihlLmNoYW5nZVN0YXRlKXtcclxuXHRcdFx0XHR0aGlzLmFjdGl2ZSA9IChuYW1lPT09XCJjb250cm9sXCIpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZih0aGlzLmFjdGl2ZSl7XHJcblx0XHRcdFx0aWYobmFtZT09PVwiZGJsY2xpY2tcIil7XHJcblx0XHRcdFx0XHQvLyAxLiBnZXQgY2xvc2VzdCBwb2ludCBvbiBncmFwaFxyXG5cclxuXHRcdFx0XHRcdGxldCBbbjEsIG4yLCBkMiwgdiwgd2VpZ2h0XSA9IHRoaXMubmF2LmNsb3Nlc3QoZS5wb3MpO1xyXG5cclxuXHRcdFx0XHRcdC8vIDIuIGlmIGRpc3RhbmNlIHRvbyBsYXJnZSwgZ2l2ZSB1cFxyXG5cdFx0XHRcdFx0aWYoZDIgPCAzMCozMCl7XHJcblx0XHRcdFx0XHRcdC8vIDMuIGNhbGN1bGF0ZSByb3V0ZSB0byBjbG9zZXN0IHBvaW50IChyb3V0ZSBpcyBpbiByZXZlcnNlIG9yZGVyIGZvciBwb3BwaW5nKVxyXG5cdFx0XHRcdFx0XHR0aGlzLnRhcmdldCA9IHY7XHJcblx0XHRcdFx0XHRcdGxldCByb3V0ZSA9IHRoaXMubmF2LmNhbGN1bGF0ZVJvdXRlKG4xLG4yLHdlaWdodCwgdGhpcy5uMSx0aGlzLm4yLHRoaXMud2VpZ2h0KTtcclxuXHJcblx0XHRcdFx0XHRcdGlmKHJvdXRlICE9PSBudWxsKXtcclxuXHRcdFx0XHRcdFx0XHQvLyA0LiBmbGlwIG4xL24yIHNvIHRoYXQgaW5jcmVhc2luZyB3ZWlnaHQgZm9sbG93cyByb3V0ZVxyXG5cdFx0XHRcdFx0XHRcdGlmKHJvdXRlLmxlbmd0aCAhPSAwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZih0aGlzLm4xID09PSByb3V0ZVtyb3V0ZS5sZW5ndGgtMV0pe1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRsZXQgdGVtcF9uID0gdGhpcy5uMTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5uMSA9IHRoaXMubjI7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubjIgPSB0ZW1wX247XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMud2VpZ2h0ID0gMS10aGlzLndlaWdodDtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdGlmKG4yID09PSByb3V0ZVswXSl7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGxldCB0ZW1wX24gPSBuMTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bjEgPSBuMjtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bjIgPSB0ZW1wX247XHJcblx0XHRcdFx0XHRcdFx0XHRcdHdlaWdodCA9IDEtd2VpZ2h0O1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRpZih0aGlzLm4xICE9IG4xKXtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJoaVwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLm4xID0gbjE7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubjIgPSBuMjtcclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy53ZWlnaHQgPSAxLXRoaXMud2VpZ2h0O1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0aWYod2VpZ2h0IDwgdGhpcy53ZWlnaHQpe1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRsZXQgdGVtcF9uID0gbjE7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG4xID0gbjI7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG4yID0gdGVtcF9uO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR3ZWlnaHQgPSAxLXdlaWdodDtcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRlbXBfbiA9IHRoaXMubjE7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMubjEgPSB0aGlzLm4yO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLm4yID0gdGVtcF9uO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLndlaWdodCA9IDEtdGhpcy53ZWlnaHQ7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyA1LiBzZXQgc3RhdGUgdG8gZm9sbG93IHJvdXRlXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zZXRTdGF0ZShuZXcgUm91dGVTdGF0ZShyb3V0ZSwgbjEsIG4yLCB3ZWlnaHQpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHJcblx0XHRcdFx0XHRldmVudFF1ZXVlLnNwbGljZShpLCAxKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnN0YXRlLnVwZGF0ZSh0aGlzLCBkdCk7XHJcblx0fVxyXG5cclxuXHRzZXRPcmllbnRhdGlvbigpe1xyXG5cdFx0dGhpcy5mYWNpbmdSaWdodCA9ICh0aGlzLm5hdi5ncmFwaC5nZXROb2RlQXR0cmlidXRlcyh0aGlzLm4yKS5wb3MubWludXModGhpcy5uYXYuZ3JhcGguZ2V0Tm9kZUF0dHJpYnV0ZXModGhpcy5uMSkucG9zKS54ID49MCk7XHJcblx0fVxyXG5cclxuXHRkcmF3KGN0eCkge1xyXG5cdFx0bGV0IHBvcyA9IHRoaXMuZ2V0UG9zKCk7XHJcblxyXG5cdFx0aWYodGhpcy50YXJnZXQpe1xyXG5cdFx0XHRjdHguZmlsbFN0eWxlID0gXCJyZWRcIjtcclxuXHRcdFx0Y3R4LmZpbGxSZWN0KHRoaXMudGFyZ2V0LnggLSBOU0laRS8yLCB0aGlzLnRhcmdldC55IC0gTlNJWkUvMiwgTlNJWkUsIE5TSVpFKTtcclxuXHRcdH1cclxuXHJcblx0XHRjdHguc2F2ZSgpO1xyXG5cclxuXHRcdGN0eC50cmFuc2xhdGUocG9zLngsIHBvcy55KTtcclxuXHRcdGN0eC5zY2FsZSgwLjE1LCAwLjE1KTtcclxuXHRcdGlmKCF0aGlzLmZhY2luZ1JpZ2h0KXtcclxuXHRcdFx0Y3R4LnNjYWxlKC0xLDEpO1xyXG5cdFx0fVxyXG5cdFx0Y3R4LmRyYXdJbWFnZSh0aGlzLmltZywgLXRoaXMuaW1nLndpZHRoLzIsIDUwLTIqdGhpcy5pbWcuaGVpZ2h0LzIpO1xyXG5cclxuXHRcdGN0eC5yZXN0b3JlKCk7XHJcblx0fVxyXG59XHJcblxyXG5sZXQgdmVsID0gNjA7XHJcbmNsYXNzIFJvdXRlU3RhdGUge1xyXG5cdGNvbnN0cnVjdG9yKHJvdXRlLCBuMSwgbjIsIHdlaWdodCkge1xyXG5cdFx0dGhpcy5yb3V0ZSA9IHJvdXRlO1xyXG5cdFx0cm91dGUudW5zaGlmdChuMik7XHJcblx0XHRyb3V0ZS5wb3AoKTtcclxuXHRcdHRoaXMubjEgPSBuMTtcclxuXHRcdHRoaXMubjIgPSBuMjtcclxuXHRcdHRoaXMud2VpZ2h0ID0gd2VpZ2h0O1xyXG5cclxuXHRcdHRoaXMuYWNjdW11bGF0b3IgPSAwO1xyXG5cdH1cclxuXHJcblx0aW5pdChmaXNoKSB7XHJcblx0XHRmaXNoLnNldE9yaWVudGF0aW9uKCk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoZmlzaCwgZHQpIHtcclxuXHRcdGlmKHRoaXMucm91dGUubGVuZ3RoPj0xKXtcclxuXHRcdFx0aWYoZmlzaC53ZWlnaHQ8MSl7XHJcblx0XHRcdFx0dGhpcy5zdGVwKGZpc2gsZHQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGZpc2gud2VpZ2h0ID0gMDtcclxuXHRcdFx0XHRsZXQgb2xkX24gPSBmaXNoLm4yO1xyXG5cdFx0XHRcdGZpc2gubjIgPSB0aGlzLnJvdXRlW3RoaXMucm91dGUubGVuZ3RoLTFdO1xyXG5cdFx0XHRcdGZpc2gubjEgPSBvbGRfbjtcclxuXHRcdFx0XHR0aGlzLnJvdXRlLnBvcCgpO1xyXG5cdFx0XHRcdGZpc2guc2V0T3JpZW50YXRpb24oKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0aWYoZmlzaC53ZWlnaHQgPCB0aGlzLndlaWdodCl7XHJcblx0XHRcdFx0dGhpcy5zdGVwKGZpc2gsZHQpXHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0ZmlzaC5zZXRTdGF0ZShkZWZhdWx0U3RhdGUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzdGVwKGZpc2gsIGR0KSB7XHJcblx0XHRmaXNoLndlaWdodCArPSB2ZWwqZHQvZmlzaC5uYXYuZ3JhcGguZ2V0RWRnZUF0dHJpYnV0ZXMoZmlzaC5uMSxmaXNoLm4yKS53ZWlnaHRcclxuXHRcdGZpc2gud2VpZ2h0ID0gTWF0aC5taW4oZmlzaC53ZWlnaHQsIDEuMCk7XHJcblxyXG5cdFx0dGhpcy5hY2N1bXVsYXRvciArPSA2KmR0O1xyXG5cdFx0aWYodGhpcy5hY2N1bXVsYXRvcj49OCl7XHJcblx0XHRcdHRoaXMuYWNjdW11bGF0b3IgPSAwO1xyXG5cdFx0fVxyXG5cdFx0ZmlzaC5pbWcgPSBmaXNoLmltZ193YWxraW5nW01hdGguZmxvb3IodGhpcy5hY2N1bXVsYXRvcildXHJcblx0fVxyXG59IiwiaW1wb3J0IHtVbmRpcmVjdGVkR3JhcGh9IGZyb20gJ2dyYXBob2xvZ3knO1xyXG5pbXBvcnQgZGlqa3N0cmEgZnJvbSAnZ3JhcGhvbG9neS1zaG9ydGVzdC1wYXRoL2RpamtzdHJhJztcclxuXHJcbmxldCBOU0laRSA9IDEwO1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBOYXZHcmFwaCB7XHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLmdyYXBoID0gbmV3IFVuZGlyZWN0ZWRHcmFwaCgpO1xyXG5cdFx0dGhpcy5hY3RpdmVfbiA9IG51bGw7XHJcblx0XHR0aGlzLmxhc3RfbiA9IG51bGw7XHJcblx0XHR0aGlzLmluZGV4ID0gMTA7IC8vREVCVUdcclxuXHRcdHRoaXMuc3RhdGUgPSBcInNlbGVjdFwiO1xyXG5cdH1cclxuXHJcblx0dXBkYXRlKGV2ZW50UXVldWUpe1xyXG5cdFx0bGV0IGkgPSBldmVudFF1ZXVlLmxlbmd0aDtcclxuXHRcdHdoaWxlKGktLSl7XHJcblx0XHRcdGxldCBbZSwgbmFtZV0gPSBldmVudFF1ZXVlW2ldO1xyXG5cclxuXHRcdFx0aWYoZS5jaGFuZ2VTdGF0ZSl7XHJcblx0XHRcdFx0dGhpcy5hY3RpdmVfbiA9IG51bGw7XHJcblx0XHRcdFx0dGhpcy5sYXN0X24gPSBudWxsO1xyXG5cdFx0XHRcdHRoaXMuc3RhdGUgPSBuYW1lO1xyXG5cdFx0XHRcdHRoaXMuY2FsY3VsYXRlV2VpZ2h0cygpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzd2l0Y2godGhpcy5zdGF0ZSl7XHJcblx0XHRcdFx0Y2FzZSBcInNlbGVjdFwiOlxyXG5cdFx0XHRcdFx0aWYobmFtZT09PVwibW91c2Vkb3duXCIpe1xyXG5cdFx0XHRcdFx0XHR0aGlzLmxhc3RfbiA9IG51bGw7XHJcblx0XHRcclxuXHRcdFx0XHRcdFx0bGV0IFtuLCBkXSA9IHRoaXMuY2xvc2VzdE5vZGUoZS5wb3MpO1xyXG5cdFx0XHRcdFx0XHRpZihkIDwgMzAqMzApIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmFjdGl2ZV9uID0gbjtcclxuXHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh0aGlzLmFjdGl2ZV9uKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHJcblx0XHRcdFx0XHRcdGV2ZW50UXVldWUuc3BsaWNlKGksIDEpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHJcblx0XHRcdFx0XHRpZihuYW1lPT09XCJtb3VzZXVwXCIpe1xyXG5cdFx0XHRcdFx0XHR0aGlzLmxhc3RfbiA9IHRoaXMuYWN0aXZlX247XHJcblx0XHRcdFx0XHRcdHRoaXMuYWN0aXZlX24gPSBudWxsO1xyXG5cdFx0XHJcblx0XHRcdFx0XHRcdGV2ZW50UXVldWUuc3BsaWNlKGksIDEpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHJcblx0XHRcdFx0XHRpZihuYW1lPT09XCJtb3VzZW1vdmVcIil7XHJcblx0XHRcdFx0XHRcdGlmKHRoaXMuYWN0aXZlX24pe1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZ3JhcGguZ2V0Tm9kZUF0dHJpYnV0ZXModGhpcy5hY3RpdmVfbikucG9zID0gZS5wb3M7XHJcblx0XHRcdFx0XHRcdFx0ZXZlbnRRdWV1ZS5zcGxpY2UoaSwgMSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFxyXG5cdFx0XHRcdFx0XHRldmVudFF1ZXVlLnNwbGljZShpLCAxKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJhZGRcIjpcclxuXHRcdFx0XHRcdGlmKG5hbWU9PT1cIm1vdXNlZG93blwiKXtcclxuXHRcdFx0XHRcdFx0dGhpcy5hZGROb2RlKGUucG9zKTtcclxuXHRcdFx0XHRcdFx0ZXZlbnRRdWV1ZS5zcGxpY2UoaSwgMSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiYWRkIGVkZ2VcIjpcclxuXHRcdFx0XHRcdGlmKG5hbWU9PT1cIm1vdXNlZG93blwiKXtcclxuXHRcdFx0XHRcdFx0bGV0IFtuLCBkXSA9IHRoaXMuY2xvc2VzdE5vZGUoZS5wb3MpO1xyXG5cdFx0XHRcdFx0XHRpZihkIDwgMzAqMzApIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmFjdGl2ZV9uID0gbjtcclxuXHRcdFx0XHRcdFx0XHRpZih0aGlzLmxhc3RfbiAmJiAhdGhpcy5ncmFwaC5oYXNFZGdlKHRoaXMubGFzdF9uLCB0aGlzLmFjdGl2ZV9uKSl7XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmdyYXBoLmFkZEVkZ2UodGhpcy5sYXN0X24sIHRoaXMuYWN0aXZlX24pO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR0aGlzLmxhc3RfbiA9IG51bGw7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFxyXG5cdFx0XHRcdFx0XHRldmVudFF1ZXVlLnNwbGljZShpLCAxKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmKG5hbWU9PT1cIm1vdXNldXBcIil7XHJcblx0XHRcdFx0XHRcdHRoaXMubGFzdF9uID0gdGhpcy5hY3RpdmVfbjtcclxuXHRcdFx0XHRcdFx0dGhpcy5hY3RpdmVfbiA9IG51bGw7XHJcblx0XHRcclxuXHRcdFx0XHRcdFx0ZXZlbnRRdWV1ZS5zcGxpY2UoaSwgMSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiZGVsZXRlXCI6XHJcblx0XHRcdFx0XHRpZihuYW1lPT09XCJtb3VzZWRvd25cIil7XHJcblx0XHRcdFx0XHRcdGxldCBbbiwgZF0gPSB0aGlzLmNsb3Nlc3ROb2RlKGUucG9zKTtcclxuXHRcdFx0XHRcdFx0aWYoZCA8IDMwKjMwKSB7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5ncmFwaC5kcm9wTm9kZShuKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0ZXZlbnRRdWV1ZS5zcGxpY2UoaSwgMSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Y2FsY3VsYXRlV2VpZ2h0cygpIHtcclxuXHRcdGZvciAobGV0IHtlZGdlLCBhdHRyaWJ1dGVzOiBlLCBzb3VyY2UsIHRhcmdldCwgc291cmNlQXR0cmlidXRlczogdjEsIHRhcmdldEF0dHJpYnV0ZXM6IHYyfSBvZiB0aGlzLmdyYXBoLmVkZ2VFbnRyaWVzKCkpIHtcclxuXHRcdFx0ZS53ZWlnaHQgPSBNYXRoLnNxcnQodjIucG9zLm1pbnVzKHYxLnBvcykuZDIoKSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRjbG9zZXN0Tm9kZShwb3MpIHtcclxuXHRcdGxldCBubWluID0gbnVsbDtcclxuXHRcdGxldCBkMm1pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcclxuXHRcdGZvciAobGV0IHtub2RlOiBuLCBhdHRyaWJ1dGVzOiB2fSBvZiB0aGlzLmdyYXBoLm5vZGVFbnRyaWVzKCkpIHtcclxuXHRcdFx0bGV0IHRkID0gdi5wb3MubWludXMocG9zKS5kMigpO1xyXG5cdFx0XHRpZih0ZCA8PSBkMm1pbikge1xyXG5cdFx0XHRcdGQybWluID0gdGQ7XHJcblx0XHRcdFx0bm1pbiA9IG47XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gW25taW4sIGQybWluXTtcclxuXHR9XHJcblxyXG5cdGNsb3Nlc3QocG9zKSB7XHJcblx0XHRsZXQgbjFfbWluID0gbnVsbDtcclxuXHRcdGxldCBuMl9taW4gPSBudWxsO1xyXG5cdFx0bGV0IGQyX21pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcclxuXHRcdGxldCB2X21pbiA9IG51bGw7XHJcblx0XHRsZXQgd19taW4gPSBudWxsO1xyXG5cclxuXHRcdC8vIHRyeSBwcm9qZWN0aW5nIHBvaW50IG9udG8gZWFjaCBsaW5lIHNlZ21lbnQsIHNlZSB3aGF0IGlzIGNsb3Nlc3QuXHJcblx0XHRmb3IgKGxldCB7ZWRnZSwgYXR0cmlidXRlcywgc291cmNlOiBuMSwgdGFyZ2V0OiBuMiwgc291cmNlQXR0cmlidXRlczogdjEsIHRhcmdldEF0dHJpYnV0ZXM6IHYyfSBvZiB0aGlzLmdyYXBoLmVkZ2VFbnRyaWVzKCkpIHtcclxuXHRcdFx0bGV0IGRlbHRhID0gdjIucG9zLm1pbnVzKHYxLnBvcyk7XHJcblx0XHRcdGxldCB3ZWlnaHQgPSBkZWx0YS5kb3QocG9zLm1pbnVzKHYxLnBvcykpO1xyXG5cdFx0XHR3ZWlnaHQgLz0gZGVsdGEuZDIoKTtcclxuXHJcblx0XHRcdC8vIGNsYW1wIHdlaWdodCB0byBbMCwxXVxyXG5cdFx0XHR3ZWlnaHQgPSBNYXRoLm1pbihNYXRoLm1heCh3ZWlnaHQsIDAuMCksIDEuMCk7XHJcblxyXG5cdFx0XHQvLyBnZXQgcG9pbnRcclxuXHRcdFx0bGV0IHYgPSB2MS5wb3Muc2NhbGVkQnkoMS13ZWlnaHQpLnBsdXModjIucG9zLnNjYWxlZEJ5KHdlaWdodCkpO1xyXG5cdFx0XHRsZXQgZDIgPSB2Lm1pbnVzKHBvcykuZDIoKTtcclxuXHJcblx0XHRcdGlmKGQyIDw9IGQyX21pbikge1xyXG5cdFx0XHRcdGQyX21pbiA9IGQyO1xyXG5cdFx0XHRcdG4xX21pbiA9IG4xO1xyXG5cdFx0XHRcdG4yX21pbiA9IG4yO1xyXG5cdFx0XHRcdHZfbWluID0gdjtcclxuXHRcdFx0XHR3X21pbiA9IHdlaWdodDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBbbjFfbWluLCBuMl9taW4sIGQyX21pbiwgdl9taW4sIHdfbWluXTtcclxuXHR9XHJcblxyXG5cdGFkZE5vZGUocG9zKXtcclxuXHRcdHRoaXMuZ3JhcGguYWRkTm9kZSh0aGlzLmluZGV4LCB7cG9zOiBwb3N9KTtcclxuXHRcdHJldHVybiB0aGlzLmluZGV4Kys7XHJcblx0fVxyXG5cclxuXHRhZGRFZGdlKG4xLCBuMil7XHJcblx0XHRsZXQgZCA9IE1hdGguc3FydChcclxuXHRcdFx0dGhpcy5ncmFwaC5nZXROb2RlQXR0cmlidXRlcyhuMikucG9zXHJcblx0XHRcdFx0Lm1pbnVzKHRoaXMuZ3JhcGguZ2V0Tm9kZUF0dHJpYnV0ZXMobjEpLnBvcykuZDIoKVxyXG5cdFx0XHQpO1xyXG5cdFx0dGhpcy5ncmFwaC5hZGRFZGdlKG4xLCBuMiwge3dlaWdodDogZH0pO1xyXG5cdH1cclxuXHJcblx0Y2FsY3VsYXRlUm91dGUobjExLG4xMix3MSwgbjIxLG4yMix3Mil7XHJcblx0XHRsZXQgdjExID0gdGhpcy5ncmFwaC5nZXROb2RlQXR0cmlidXRlcyhuMTEpO1xyXG5cdFx0bGV0IHYxMiA9IHRoaXMuZ3JhcGguZ2V0Tm9kZUF0dHJpYnV0ZXMobjEyKTtcclxuXHRcdGxldCB2MjEgPSB0aGlzLmdyYXBoLmdldE5vZGVBdHRyaWJ1dGVzKG4yMSk7XHJcblx0XHRsZXQgdjIyID0gdGhpcy5ncmFwaC5nZXROb2RlQXR0cmlidXRlcyhuMjIpO1xyXG5cclxuXHRcdGxldCBuMSA9IHRoaXMuYWRkTm9kZSh2MTEucG9zLnNjYWxlZEJ5KDEtdzEpLnBsdXModjEyLnBvcy5zY2FsZWRCeSh3MSkpKTtcclxuXHRcdGxldCBuMiA9IHRoaXMuYWRkTm9kZSh2MjEucG9zLnNjYWxlZEJ5KDEtdzIpLnBsdXModjIyLnBvcy5zY2FsZWRCeSh3MikpKTtcclxuXHRcdHRoaXMuYWRkRWRnZShuMTEsbjEpO1xyXG5cdFx0dGhpcy5hZGRFZGdlKG4xLG4xMik7XHJcblx0XHR0aGlzLmFkZEVkZ2UobjIxLG4yKTtcclxuXHRcdHRoaXMuYWRkRWRnZShuMixuMjIpO1xyXG5cclxuXHRcdGlmKChuMTE9PW4yMSAmJiBuMTI9PW4yMikgfHwgKG4xMT09bjIyICYmIG4xMj09bjIxKSkge1xyXG5cdFx0XHR0aGlzLmFkZEVkZ2UobjEsbjIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCByb3V0ZSA9IGRpamtzdHJhLmJpZGlyZWN0aW9uYWwodGhpcy5ncmFwaCwgbjEsIG4yKTtcclxuXHRcdGNvbnNvbGUubG9nKHJvdXRlKTtcclxuXHRcdGlmKHJvdXRlKSB7XHJcblx0XHRcdHJvdXRlLnNwbGljZSgwLDEpO1xyXG5cdFx0XHRyb3V0ZS5wb3AoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmdyYXBoLmRyb3BOb2RlKG4xKTtcclxuXHRcdHRoaXMuZ3JhcGguZHJvcE5vZGUobjIpO1xyXG5cclxuXHRcdHJldHVybiByb3V0ZTtcclxuXHR9XHJcblxyXG5cdGRyYXcoY3R4KSB7XHJcblx0XHRjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG5cdFx0Zm9yKGxldCB7bm9kZTogbiwgYXR0cmlidXRlczogdn0gb2YgdGhpcy5ncmFwaC5ub2RlRW50cmllcygpKXtcclxuXHRcdFx0Y3R4LmZpbGxSZWN0KHYucG9zLnggLSBOU0laRS8yLCB2LnBvcy55IC0gTlNJWkUvMiwgTlNJWkUsIE5TSVpFKTtcclxuXHRcdFx0Y3R4LmZvbnQgPSAnMTJweCBzZXJpZic7XHJcblx0XHRcdGN0eC5maWxsVGV4dChuLHYucG9zLngsIHYucG9zLnkrMipOU0laRSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYodGhpcy5hY3RpdmVfbil7XHJcblx0XHRcdGxldCB2ID0gdGhpcy5ncmFwaC5nZXROb2RlQXR0cmlidXRlcyh0aGlzLmFjdGl2ZV9uKTtcclxuXHRcdFx0Y3R4LmZpbGxTdHlsZSA9IFwiZ3JlZW5cIjtcclxuXHRcdFx0Y3R4LmZpbGxSZWN0KHYucG9zLnggLSBOU0laRS8yLCB2LnBvcy55IC0gTlNJWkUvMiwgTlNJWkUsIE5TSVpFKTtcclxuXHRcdH1cclxuXHRcdGlmKHRoaXMubGFzdF9uKXtcclxuXHRcdFx0bGV0IHYgPSB0aGlzLmdyYXBoLmdldE5vZGVBdHRyaWJ1dGVzKHRoaXMubGFzdF9uKTtcclxuXHRcdFx0Y3R4LmZpbGxTdHlsZSA9IFwiYmx1ZVwiO1xyXG5cdFx0XHRjdHguZmlsbFJlY3Qodi5wb3MueCAtIE5TSVpFLzIsIHYucG9zLnkgLSBOU0laRS8yLCBOU0laRSwgTlNJWkUpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRjdHguZmlsbFN0eWxlID0gXCJibGFja1wiO1xyXG5cdFx0Zm9yIChsZXQge2VkZ2UsIGF0dHJpYnV0ZXM6IGUsIHNvdXJjZSwgdGFyZ2V0LCBzb3VyY2VBdHRyaWJ1dGVzOiB2MSwgdGFyZ2V0QXR0cmlidXRlczogdjJ9IG9mIHRoaXMuZ3JhcGguZWRnZUVudHJpZXMoKSkge1xyXG5cdFx0XHRjdHguYmVnaW5QYXRoKCk7XHJcblx0XHRcdGN0eC5tb3ZlVG8odjEucG9zLngsIHYxLnBvcy55KTtcclxuXHRcdFx0Y3R4LmxpbmVUbyh2Mi5wb3MueCwgdjIucG9zLnkpO1xyXG5cdFx0XHRjdHguc3Ryb2tlKCk7XHJcblxyXG5cdFx0XHRsZXQgYXZnID0gdjEucG9zLnBsdXModjIucG9zKS5zY2FsZWRCeSgwLjUpO1xyXG5cdFx0XHRjdHguZm9udCA9ICcxMnB4IHNlcmlmJztcclxuICBcdFx0XHRjdHguZmlsbFRleHQoXHJcblx0XHRcdFx0bmV3IEludGwuTnVtYmVyRm9ybWF0KCdlbi1JTicsIHsgbWF4aW11bVNpZ25pZmljYW50RGlnaXRzOiAzIH0pLmZvcm1hdChlLndlaWdodCksXHJcblx0XHRcdFx0YXZnLngsIGF2Zy55XHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG59IiwiZXhwb3J0IGRlZmF1bHQgY2xhc3MgVmVjMiB7XHJcblx0Y29uc3RydWN0b3IoeCwgeSkgeyB0aGlzLnggPSB4OyB0aGlzLnkgPSB5O31cclxuXHJcblx0cGx1cyh2KSB7IHJldHVybiBuZXcgVmVjMih0aGlzLngrdi54LCB0aGlzLnkrdi55KTsgfVxyXG5cdHNjYWxlZEJ5KGYpIHsgcmV0dXJuIG5ldyBWZWMyKGYqdGhpcy54LCBmKnRoaXMueSk7IH1cclxuXHRtaW51cyh2KSB7IHJldHVybiB0aGlzLnBsdXModi5zY2FsZWRCeSgtMS4wKSk7IH1cclxuXHJcblx0ZG90KHYpIHsgcmV0dXJuIHRoaXMueCp2LnggKyB0aGlzLnkqdi55OyB9XHJcblx0ZDIoKSB7IHJldHVybiB0aGlzLmRvdCh0aGlzKTsgfVxyXG59IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXS5jYWxsKG1vZHVsZS5leHBvcnRzLCBtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSAobW9kdWxlKSA9PiB7XG5cdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuXHRcdCgpID0+IChtb2R1bGVbJ2RlZmF1bHQnXSkgOlxuXHRcdCgpID0+IChtb2R1bGUpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCB7IGE6IGdldHRlciB9KTtcblx0cmV0dXJuIGdldHRlcjtcbn07IiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5nID0gKGZ1bmN0aW9uKCkge1xuXHRpZiAodHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnKSByZXR1cm4gZ2xvYmFsVGhpcztcblx0dHJ5IHtcblx0XHRyZXR1cm4gdGhpcyB8fCBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JykgcmV0dXJuIHdpbmRvdztcblx0fVxufSkoKTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwidmFyIHNjcmlwdFVybDtcbmlmIChfX3dlYnBhY2tfcmVxdWlyZV9fLmcuaW1wb3J0U2NyaXB0cykgc2NyaXB0VXJsID0gX193ZWJwYWNrX3JlcXVpcmVfXy5nLmxvY2F0aW9uICsgXCJcIjtcbnZhciBkb2N1bWVudCA9IF9fd2VicGFja19yZXF1aXJlX18uZy5kb2N1bWVudDtcbmlmICghc2NyaXB0VXJsICYmIGRvY3VtZW50KSB7XG5cdGlmIChkb2N1bWVudC5jdXJyZW50U2NyaXB0KVxuXHRcdHNjcmlwdFVybCA9IGRvY3VtZW50LmN1cnJlbnRTY3JpcHQuc3JjXG5cdGlmICghc2NyaXB0VXJsKSB7XG5cdFx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKTtcblx0XHRpZihzY3JpcHRzLmxlbmd0aCkgc2NyaXB0VXJsID0gc2NyaXB0c1tzY3JpcHRzLmxlbmd0aCAtIDFdLnNyY1xuXHR9XG59XG4vLyBXaGVuIHN1cHBvcnRpbmcgYnJvd3NlcnMgd2hlcmUgYW4gYXV0b21hdGljIHB1YmxpY1BhdGggaXMgbm90IHN1cHBvcnRlZCB5b3UgbXVzdCBzcGVjaWZ5IGFuIG91dHB1dC5wdWJsaWNQYXRoIG1hbnVhbGx5IHZpYSBjb25maWd1cmF0aW9uXG4vLyBvciBwYXNzIGFuIGVtcHR5IHN0cmluZyAoXCJcIikgYW5kIHNldCB0aGUgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gdmFyaWFibGUgZnJvbSB5b3VyIGNvZGUgdG8gdXNlIHlvdXIgb3duIGxvZ2ljLlxuaWYgKCFzY3JpcHRVcmwpIHRocm93IG5ldyBFcnJvcihcIkF1dG9tYXRpYyBwdWJsaWNQYXRoIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyXCIpO1xuc2NyaXB0VXJsID0gc2NyaXB0VXJsLnJlcGxhY2UoLyMuKiQvLCBcIlwiKS5yZXBsYWNlKC9cXD8uKiQvLCBcIlwiKS5yZXBsYWNlKC9cXC9bXlxcL10rJC8sIFwiL1wiKTtcbl9fd2VicGFja19yZXF1aXJlX18ucCA9IHNjcmlwdFVybDsiLCJpbXBvcnQgVmVjMiBmcm9tIFwiLi92ZWMyXCI7XHJcbmltcG9ydCBOYXZHcmFwaCBmcm9tIFwiLi9uYXZncmFwaFwiO1xyXG5pbXBvcnQgRmlzaCBmcm9tIFwiLi9maXNoXCI7XHJcbmltcG9ydCB2aWxsYWdlIGZyb20gXCIuL2Fzc2V0cy9jaW5xdWV0ZXJyZS5wbmdcIjtcclxuXHJcbi8qXHJcblxyXG5UT0RPOlxyXG4tIGZpZ3VyZSBvdXQgd2hhdCB0byBkbyBuZXh0ISFcclxuXHJcbiovXHJcblxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCk9PntcclxuXHRuZXcgTWFpbigpO1xyXG59KTtcclxuXHJcbmNsYXNzIE1haW4ge1xyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0Ly8gdGltZSBzdHVmZlxyXG5cdFx0dGhpcy5jdXJyZW50X3RpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0dGhpcy5vbGRfdGltZSA9IHRoaXMuY3VycmVudF90aW1lO1xyXG5cdFx0dGhpcy5kdCA9IDA7XHJcblxyXG5cdFx0Ly8gZXZlbnRzXHJcblx0XHR0aGlzLmV2ZW50X3F1ZXVlID0gW107XHJcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCAoZSk9Pnt0aGlzLm1vdXNlZG93bihlKX0pO1xyXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgKGUpPT57dGhpcy5tb3VzZW1vdmUoZSl9KTtcclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCAoZSk9Pnt0aGlzLm1vdXNldXAoZSl9KTtcclxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiZGJsY2xpY2tcIiwgKGUpPT57dGhpcy5kYmxjbGljayhlKX0pO1xyXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzZWxlY3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKT0+e1xyXG5cdFx0XHRlLmNoYW5nZVN0YXRlID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5ldmVudF9xdWV1ZS5wdXNoKFtlLFwic2VsZWN0XCJdKTtcclxuXHRcdH0pO1xyXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhZGRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKT0+e1xyXG5cdFx0XHRlLmNoYW5nZVN0YXRlID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5ldmVudF9xdWV1ZS5wdXNoKFtlLFwiYWRkXCJdKTtcclxuXHRcdH0pO1xyXG5cdFx0ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhZGQgZWRnZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpPT57XHJcblx0XHRcdGUuY2hhbmdlU3RhdGUgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmV2ZW50X3F1ZXVlLnB1c2goW2UsXCJhZGQgZWRnZVwiXSk7XHJcblx0XHR9KTtcclxuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGVsZXRlXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSk9PntcclxuXHRcdFx0ZS5jaGFuZ2VTdGF0ZSA9IHRydWU7XHJcblx0XHRcdHRoaXMuZXZlbnRfcXVldWUucHVzaChbZSxcImRlbGV0ZVwiXSk7XHJcblx0XHR9KTtcclxuXHRcdGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29udHJvbFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpPT57XHJcblx0XHRcdGUuY2hhbmdlU3RhdGUgPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmV2ZW50X3F1ZXVlLnB1c2goW2UsXCJjb250cm9sXCJdKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIGNhbnZhcyBzdHVmZlxyXG5cdFx0dGhpcy5jYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhbnZhc1wiKTtcclxuXHRcdHRoaXMuY2FudmFzLndpZHRoID0gMTYwMDtcclxuXHRcdHRoaXMuY2FudmFzLmhlaWdodD0gMTIwMDtcclxuXHRcdHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cdFx0dGhpcy5tYXQgPSB0aGlzLmN0eC5nZXRUcmFuc2Zvcm0oKTtcclxuXHJcblx0XHQvLyB0ZXN0IHN0dWZmXHJcblx0XHR0aGlzLm5hdiA9IG5ldyBOYXZHcmFwaCgpO1xyXG5cdFx0dGhpcy5uYXYuZ3JhcGguYWRkTm9kZSgwLCB7cG9zOiBuZXcgVmVjMigxMjAsIDQyMCl9KTtcclxuXHRcdHRoaXMubmF2LmdyYXBoLmFkZE5vZGUoMSwge3BvczogbmV3IFZlYzIoMjQwLCA0NjApfSk7XHJcblx0XHR0aGlzLm5hdi5hZGRFZGdlKDAsIDEpO1xyXG5cclxuXHRcdHRoaXMuZmlzaCA9IG5ldyBGaXNoKHRoaXMubmF2LCAwLCAxLCAwLjUpO1xyXG5cdFx0dGhpcy52aWxsYWdlID0gbmV3IEJhY2tncm91bmQodmlsbGFnZSk7XHJcblxyXG5cdFx0dGhpcy5zdGVwKCk7XHJcblx0fVxyXG5cclxuXHRzdGVwKCkge1xyXG5cdFx0dGhpcy5jdXJyZW50X3RpbWUgPSBEYXRlLm5vdygpLzEwMDAuMDtcclxuXHRcdHRoaXMuZHQgPSB0aGlzLmN1cnJlbnRfdGltZSAtIHRoaXMub2xkX3RpbWU7XHJcblx0XHR0aGlzLm9sZF90aW1lID0gdGhpcy5jdXJyZW50X3RpbWU7XHJcblxyXG5cdFx0dGhpcy5kcmF3KCk7XHJcblx0XHR0aGlzLnVwZGF0ZSgpO1xyXG5cdFx0Ly8gcmVzdG9yZSB0byBkZWZhdWx0IHRyYW5zZm9ybWF0aW9ucyAoSSBkbyB0aGlzIG5vdyBzbyB0aGF0IHRoZSBtYXRyaXggZm9yIHRoZSBjYW52YXMgaXMgZ29vZClcclxuXHRcdHRoaXMuY3R4LnJlc3RvcmUoKTtcclxuXHJcblx0XHR3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpPT50aGlzLnN0ZXAoKSk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoKSB7XHJcblx0XHR0aGlzLm5hdi51cGRhdGUodGhpcy5ldmVudF9xdWV1ZSk7XHJcblx0XHR0aGlzLmZpc2gudXBkYXRlKHRoaXMuZXZlbnRfcXVldWUsIHRoaXMuZHQpO1xyXG5cclxuXHRcdC8vIGV2ZW4gdGhvdWdoIHdlIGNsZWFyIHRoZSBldmVudCBxdWV1ZSBoZXJlIGFueXdheXMsIGRvIG1ha2UgYW4gZWZmb3J0IHRvIHBvcCBldmVudHNcclxuXHRcdC8vIG9mZiB3aGVuIHJlYWN0aW5nIHRvIHRoZW0sIHNvIHRoYXQgZXZlbnRzIGFyZW4ndCBhY2NlcHRlZCBieSBtdWx0aXBsZSB0aGluZ3NcclxuXHRcdC8vIHVuaW50ZW50aW9uYWxseS5cclxuXHRcdHRoaXMuZXZlbnRfcXVldWUubGVuZ3RoID0gMDtcclxuXHR9XHJcblxyXG5cdGRyYXcoKSB7XHJcblx0XHQvLyByZXNldCBjYW52YXNcclxuXHRcdHRoaXMuY3R4LmZpbGxTdHlsZSA9IFwid2hpdGVcIjtcclxuXHRcdHRoaXMuY3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQpO1xyXG5cclxuXHRcdC8vIHNldHVwIGluaXRpYWwgdHJhbnNmb3JtYXRpb25zXHJcblx0XHR0aGlzLmN0eC5zYXZlKCk7XHJcblx0XHR0aGlzLmN0eC50cmFuc2xhdGUoMCwtMTc1KTtcclxuXHRcdHRoaXMuY3R4LnNjYWxlKDEuNSwxLjUpO1xyXG5cclxuXHRcdHRoaXMubWF0ID0gdGhpcy5jdHguZ2V0VHJhbnNmb3JtKCk7XHJcblxyXG5cdFx0Ly8gZHJhdyB0aGluZ3NcclxuXHRcdHRoaXMudmlsbGFnZS5kcmF3KHRoaXMuY3R4KTtcclxuXHRcdHRoaXMubmF2LmRyYXcodGhpcy5jdHgpO1xyXG5cdFx0dGhpcy5maXNoLmRyYXcodGhpcy5jdHgpO1xyXG5cdH1cclxuXHJcblx0bW91c2Vkb3duKGUpe1xyXG5cdFx0ZS5wb3MgPSB0aGlzLmdldEN1cnNvclBvc2l0aW9uKGUpO1xyXG5cdFx0dGhpcy5ldmVudF9xdWV1ZS5wdXNoKFtlLFwibW91c2Vkb3duXCJdKTtcclxuXHR9XHJcblxyXG5cdG1vdXNldXAoZSl7XHJcblx0XHRlLnBvcyA9IHRoaXMuZ2V0Q3Vyc29yUG9zaXRpb24oZSk7XHJcblx0XHR0aGlzLmV2ZW50X3F1ZXVlLnB1c2goW2UsXCJtb3VzZXVwXCJdKTtcclxuXHR9XHJcblxyXG5cdG1vdXNlbW92ZShlKXtcclxuXHRcdGUucG9zID0gdGhpcy5nZXRDdXJzb3JQb3NpdGlvbihlKTtcclxuXHRcdHRoaXMuZXZlbnRfcXVldWUucHVzaChbZSxcIm1vdXNlbW92ZVwiXSk7XHJcblx0fVxyXG5cclxuXHRkYmxjbGljayhlKXtcclxuXHRcdGUucG9zID0gdGhpcy5nZXRDdXJzb3JQb3NpdGlvbihlKTtcclxuXHRcdHRoaXMuZXZlbnRfcXVldWUucHVzaChbZSxcImRibGNsaWNrXCJdKTtcclxuXHR9XHJcblxyXG5cdGdldEN1cnNvclBvc2l0aW9uUmF3KGUpIHtcclxuXHRcdGxldCByZWN0ID0gdGhpcy5jYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRsZXQgeCA9IGUuY2xpZW50WCAtIHJlY3QubGVmdDtcclxuXHRcdGxldCB5ID0gZS5jbGllbnRZIC0gcmVjdC50b3A7XHJcblx0XHRyZXR1cm4gbmV3IFZlYzIoeCx5KTtcclxuXHR9XHJcblxyXG5cdGdldEN1cnNvclBvc2l0aW9uKGUpIHtcclxuXHRcdHJldHVybiB0aGlzLmdldFRyYW5zZm9ybWVkKHRoaXMuZ2V0Q3Vyc29yUG9zaXRpb25SYXcoZSkpO1xyXG5cdH1cclxuXHJcblx0Z2V0VHJhbnNmb3JtZWQodikge1xyXG5cdFx0bGV0IG0gPSB0aGlzLm1hdDtcclxuXHRcdGxldCBkZXRfaW52ID0gMS4wLyhtLmEqbS5kIC0gbS5iKm0uYyk7XHJcblx0XHQvLyB3ZSBuZWVkIHRvIGRvIGludmVyc2Ugb2YgbSwgd2hpY2ggaSd2ZSBkb25lIGJ5IGhhbmRcclxuXHRcdHJldHVybiBuZXcgVmVjMihcclxuXHRcdFx0KG0uZCAqICh2LnggLSBtLmUpIC0gbS5jICogKHYueSAtIG0uZikpICogZGV0X2ludixcclxuXHRcdFx0KC1tLmIgKiAodi54IC0gbS5lKSArIG0uYSAqICh2LnkgLSBtLmYpKSAqIGRldF9pbnZcclxuXHRcdCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBCYWNrZ3JvdW5kIHtcclxuXHRjb25zdHJ1Y3RvcihzcmMpe1xyXG5cdFx0dGhpcy5pbWcgPSBuZXcgSW1hZ2UoKTtcclxuXHRcdHRoaXMuaW1nLnNyYyA9IHNyYztcclxuXHR9XHJcblxyXG5cdGRyYXcoY3R4KSB7XHJcblx0XHRjdHguc2F2ZSgpO1xyXG5cclxuXHRcdGN0eC5zY2FsZSgwLjIsIDAuMik7XHJcblx0XHRjdHguZHJhd0ltYWdlKHRoaXMuaW1nLCAwLCAwKTtcclxuXHJcblx0XHRjdHgucmVzdG9yZSgpO1xyXG5cdH1cclxufSJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==
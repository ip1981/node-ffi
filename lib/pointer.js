var ffi = require('./ffi')
  , util = require('util')
  , Pointer = module.exports = ffi.Bindings.Pointer

/**
 * Returns a new Pointer that is a reference to this pointer.
 */

Pointer.prototype.ref = function ref () {
  if (!this.type) {
    this.type = ffi.Type.pointer
  }
  var ptr = Pointer.alloc('pointer', this)
  // Create a new 'Type', increased by 1 level of indirection
  ptr.type = Object.create(this.type)
  ptr.type.indirection = this.type.indirection + 1
  return ptr
}

/**
 * Attempts to dereference the pointer. If the pointer's current level of
 * indirection is 1, then the raw JS value is attempted to be computed
 */

Pointer.prototype.deref = function deref () {
  if (!this.type) {
    this.type = ffi.Type.pointer
  }
  var parentType = Object.getPrototypeOf(this.type)
    , val = parentType.get(this)
  val.type = parentType
  return val
}

/**
 * `attach()` is used for tracking dependencies among pointers to prevent
 * garbage collection.
 */

Pointer.prototype.attach = function attach (friend) {
  if (!Array.isArray(friend.__attached)) {
    friend.__attached = []
  }
  friend.__attached.push(this)
}

/**
 * Creates and returns a new Pointer that points to the same `address` as this
 * pointer. Usefor for when you want to use a pointer as in iterator, but still
 * want to retain this original pointer's address for use.
 *
 * The returned Pointer's `free` variable is set to `false` by default.
 *
 * @return {Pointer} A new Pointer independent of this one, but points to the same `address`.
 */

Pointer.prototype.clone = function clone () {
  return this.seek(0)
}

/**
 * This wraps _putPointer so it supports direct Struct writing.
 */

Pointer.prototype.putPointer = function putPointer (ptr, seek) {
  var p = ptr && 'pointer' in ptr ? ptr.pointer : ptr
  return this._putPointer(p, seek)
}

/**
 * Custom inspect() function for easier inspecting of Pointers in the REPL
 */

Pointer.prototype.inspect = function inspect (depth, hidden, colors) {
  return '<Pointer address="'
    + util.inspect(this.address, hidden, depth - 1, colors)
    + '" allocated="'
    + util.inspect(this.allocated, hidden, depth - 1, colors)
    + '" free="'
    + util.inspect(this.free, hidden, depth - 1, colors)
    + '">'
}

/**
 * Returns `true` if the given argument is a `Pointer` instance.
 * Returns `false` otherwise.
 *
 * @param {Object} p A pointer object (possibly...)
 * @return {Boolean} `true` if the object is a `Pointer` instance
 */

Pointer.isPointer = function isPointer (p) {
  return p instanceof Pointer
}

/**
 * Allocates a pointer big enough to fit *type* and *value*, writes the value,
 * and returns it.
 */

Pointer.alloc = function alloc (type, value) {
  var t = ffi.getType(type)
  var size = type == 'string'
           ? Buffer.byteLength(value, 'utf8') + 1
           : ffi.sizeOf(type)

  // malloc() the buffer
  var ptr = new Pointer(size)
  if (type == 'string') {
    ptr.type = t
  } else {
    ptr.type = Object.create(t)
    ptr.type.indirection = t.indirection + 1
    ptr.type.get = function (p) { return p.getPointer() }
    ptr.type.put = function (p, v) { return p.putPointer(v) }
  }

  // write the value
  t.put(ptr, value)

  return ptr
}

/**
 * Appends the `NON_SPECIFIC_TYPES` to the `TYPE_TO_POINTER_METHOD_MAP` by
 * discovering the method suffix by type size.
 */

Object.keys(ffi.NON_SPECIFIC_TYPES).forEach(function (type) {
  var method = ffi.NON_SPECIFIC_TYPES[type]
    , suffix = ffi.TYPE_TO_POINTER_METHOD_MAP[type]

  if (!suffix) {
    // No hard mapping, determine by size
    var size = ffi.sizeOf(type)
      , szFunc = ffi.SIZE_TO_POINTER_METHOD_MAP[size]
      , signed = type !== 'byte' && type !== 'size_t' && type[0] !== 'u'
    suffix = (signed ? '' : 'U') + szFunc
  }

  ffi.TYPE_TO_POINTER_METHOD_MAP[type] = suffix

  Pointer.prototype['put' + method] = Pointer.prototype['put' + suffix]
  Pointer.prototype['get' + method] = Pointer.prototype['get' + suffix]
})

/**
 * Define the `NULL` pointer. Used internally in other parts of node-ffi.
 */

Pointer.NULL = new Pointer(0)

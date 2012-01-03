
/**
 * Metainfo class for the libffi types.
 * Extensions on top of these basic types, like "Struct", "Array" and "Union"
 * are implemented as subclasses of their base type ('pointer' in all those
 * cases). This is essentially the `typedef` replacement.
 *
 * There is a basic "Type" interface that these types and subtypes must comply
 * with:
 *
 *   alloc - function - Creates and returns a Pointer containing the type, and
 *   optionally a value to put.
 *
 *   get - function - Calls the getter for this type on the given pointer.
 *
 *   put - function - Calls the setter for this type on the given pointer and
 *   value.
 *
 *   size - Number - The sizeof() for this type.
 *
 *   type - Pointer - The pointer to this FFI_TYPE struct.
 */

var ffi = require('./ffi')

// TODO: Don't be a lazy-mofo. Hard-code these, there's not that many...
Object.keys(ffi.TYPE_TO_POINTER_METHOD_MAP).forEach(function (type) {
  var t = exports[type] = {}
    , suffix = ffi.TYPE_TO_POINTER_METHOD_MAP[type]

  t.type = ffi.Bindings.FFI_TYPES[type]
  t.suffix = suffix
  t.indirection = 0
  t.get = function get (pointer) {
    return pointer['get'+suffix]()
  }
  t.put = function put (pointer, value) {
    return pointer['put'+suffix](value)
  }
})

exports.void = {}
exports.void.size = 0
exports.void.indirection = 0
exports.void.get = function get () {
  return null
}

// 'pointer' is a special case
exports.pointer.__proto__ = exports.void
exports.pointer.indirection = 1

// optimize the 'string' case
//exports.string.__proto__ = ffi.Array(exports.char)
exports.string.indirection = 2

//console.error(exports)

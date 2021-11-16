# matchdom -- extensible declarative template expressions for the DOM

DSL for merging data.

A matchdom expression describes a chain of "filter" functions:
`[func1:param1|func2:param2]`.

Each filter gets the context object, the current value,
can change the context, and returns a new value or current value.

The context object describes source and destination nodes,
and the parsed expression from which the filter is called, see below.

`md.merge(node, data)` mutates `node`.
If `node` is a string that starts with '<' and ends with '>',
it is converted to a DOM fragment (or single node) if `document` is available.

However, explicit parsing can be done through exported `HTML` and `XML` methods.

## usage

```js
import { Matchdom, HTML, XML, Locale } from 'matchdom';
const md = new Matchdom({
 hooks = {},
 symbols = {}
});
md.extend(Locale);
const mergedDom = md.merge(`<div id="model" class="[myclass]">
 <h[n]>Header</h[n]>
 <span>[data.text|as:html] for [data.percent|percent:1]</span>
 <img src="[data.icon|prune:*]">
</div>`, {
 n: 4,
 myclass: "yes",
 data: {
  text: "<em>test</em>"
 }
});
const expectedHTML = `<div id="model" class="yes">
 <h4>Header</h4>
 <span><em>test</em></span>
</div>`;
assert.equal(mergedDom.outerHTML, HTML(expectedHTML).outerHTML);
```

- merge(dom, data, scope)
- extend({filters, types, formats} or an array of plugins)
- Matchdom.HTML, Matchdom.XML use browser api to parse strings into native DOM fragments - feel free to use other ways.

## compatibility

- there is a crucial dependency on `<template>` for the html fragment parser.

Consider using a service like polyfill.io for older browsers support.

## types and formats

Types can be used by filters typings, or by "as:" and "is:" filters.

Basic types (and their shorthands):

- undefined, none: converts null-ish to undefined, leave other values intact
- null: converts falsey to null, leave other values intact
- integer, int: try to parseInt, return null if NaN
- string, str: toString
- boolean, bool: "true", "1" and truey to true, "false", "0", and falsey to false
- float, num, numeric: try to parseFloat, return null if NaN

Custom types (these can be overriden by plugins):

- date: try new Date(val), return null if not a date, accepts 'now'
- array: wrap non-array-like values into an array
- json: parse json string

Default formats:

- text: converts string with newlines by a dom fragment with hard breaks
- html: converts string to a dom fragment
- xml: converts string to an xml fragment
- url: merges source and destination - works well with as: filter.
- keys: array of keys
- values: array of values
- entries: arrays of {key, value}

Additionnal types and formats can be added by passing functions:

```js
import { DateTime } from 'luxon';
// overrides default date type
const types = {
 date(ctx, val) {
  return DateTime.fromISO(val);
 }
};
const md = new Matchdom().extend(types)
```

## filters

### syntax

- no parameters: `name:`
- one parameter: `name:param`
- two parameters: `name:param1:param2`, etc...

### filter function

A filter function takes current value, parameters from expression, and returns a new value.

Signature: `(ctx, val, param1, param2, ...)`

Returns the new value.

Once type-checked, parameters are uri-decoded.

The parameters received by a filter function can be checked/coerced automatically:

```js
const filters = {
 myTypedFilter: ['int', 'int?1', 'bool?false', (val, cte, sub) => {
  // val and cte are guaranteed to be integers, sub a boolean
  // if val is missing or NaN this filter is not called
  return val + sub ? (-cte) : cte;
 }],
 myUntypedFilter(val) {
  return val + 1; // anything can happen here
 }
};
```

If a type is empty or 'any', a value of any type (except undefined) is allowed.

If a type is '?' or 'any?' then even an undefined value is allowed and converted to null.

If a type ends with '*' then an unknown amount of parameters is allowed,
of that type:

- '*' allows any non-null parameters
- '?*' allows any parameters, even null
- 'int?0*' allows integers with a default value of zero

Available types are the same as for the "as:" filter, with the addition of:

- 'filter': checks the parameter is a filter name,
- 'path': converts parameter to a path array

A filter function can have side effects on the document being merged.

`ctx` has the following properties:

- raw: the current value before being casted as a filter parameter
- data: the data object available to expressions
- path: the current path used to get current value from data

- src: initial place of expression (should not be changed by a filter)
- dest: target place of expression
 if dest.node is different than src.node, src.node is removed
 likewise for dest.attr and src.attr.

- expr: expression instance `this.get(this.data, this.path) == val`
- cancel: boolean, cancels merging of expression

And methods:

- write(str): updates node or attr value
- read(): returns node or attr value

### place

A place is an object with these properties related to where the expression sits:

- node: node or text node
- attr: attribute name (boolean attributes and DOMTokenList are supported)
- tag: boolean wether the expression is in a tag name
  Since tag names are case-insensitive, the expression must work in lowercase,
 some filters cannot be used in tag names - it's usually avoidable.
- root: the ancestor node passed to matchdom
- hits: list of strings to process
- index: the current index hits

### expression

A parsed expression has properties:

- path (array of strings)
- filters (array of {name, fn, params} objects where params is an array)
- filter (index of current filter being applied in filters)

and methods:

- clone() return a new expression with the not-yet processed filters
- toString() the original expression with open and closing brackets
- get(data, path, save) get current value and update this.path is save is true
- append(name, params=[]) a filter to the list
- prepend(name, params=[]) a filter at current index
- drop() stop processing following filters, return true if there was any

Expressions can be nested:

```js
<span>[val|or:[otherval]]</span>
```

(see examples in tests).

### escaping brackets

Expressions leading to undefined data are ignored, so the naive use of brackets
in a text won't be merged.
However in some cases brackets that are not expressions must be escaped.

- a couple of bracketed expressions must be escaped:
 Use `[const:%5B]brackets[const:%5D]`

- the document contains lots of bracketed expressions:
 Use custom symbols, see below.

## path accessor filter

### get:path

Returns data as found from path accessor.

FIXME HERE see context.js
When the last item of the path of an expression refers to an `undefined` value,
the value is converted to `null`, so the expression is merged.

When the path refers to an `undefined` value before the last item, the expression
is not merged.

### short syntax

The `get:` filter has a special syntax without colon, instead of

`[get:path.to.data|myFilter:param|get:.prop]`

one can write:

`[path.to.data|myFilter:param|.prop]`

### use multiple times

A path starting with a dot continues the path started in the expression:

- `[path.to|.data]` is equivalent to `[path.to.data]`
- `[path.prop1|path.prop2]` will just output the last value - this is more meaningful with
- `[path.prop1|else:get:path.prop2]` which outputs prop2 if prop1 is falsey (see else: filter).

### alias:path

Returns an object in which current value can be accessed using this path.

Useful when another filter expects data to be accessible under a specific path.

### const:str

Always return str.


## canonical methods filter

### name:param(...)

If the value has a method with that name, call it with the given parameters.

Think about toLowerCase, toUpperCase, toISOString, split, join, slice etc...

This has many limitations and corner cases: for correct handling of parameters, define a custom filter.

## String filters (optional)

If the value is a string, javascript string methods are callable as filters.

### pre:str

Prepends string if value is not null or not empty.

### post:str

Appends string if value is not null or not empty.

### case:low|up|caps

Shorthands for lowercase, uppercase.
Caps means: capitalize each sentence separated by a dot and whitespace (requires unicode support in regexp).

### enc:base64|base64url|url|hex

Encodes to specified encoding.

### dec:base64|base64url|url|hex

Decodes from specified encoding.

## Locale filters (optional)

### digits:min:max

### percent:min:max

### currency:min:max

## flow control filters

### not:name:params:(...)

Runs the named filter with !val instead of val.

### then:name:param:(...)

When value is loosely true, return the value of running the given named filter;
else return the value.

### and:str

Alias for `then:const:str`

Remember to use `required="[isrequired|and:]"` to get a "boolean attribute" right.

### else:name:param:(...)

Same as then but when value is falsey.

### or:str

Alias for `else:const:str`

## Operator filters (optional)

### booleans

These filters return the value if the condition is true, or null if the condition is false:

- eq:str
- neq:str
- has:str (contains str and returns str)
- in:str1:... (contained in list of strings)
- gt:num
- lt:num
- gte:num
- lte:num

### arithmetic

- add:num
- sub:num
- mul:num
- div:num
- mod:num
- pow:num

## type filters

### is:(type)

Checks value is of that type, and returns a boolean.

### as:(type|format)

Coerces value to type, or converts string to format.

- as:null, as:undefined
  returns null, or undefined, if value is falsey - otherwise returns value
- as:date, as:number
  return value as date, or number, or null if it cannot be converted
- as:html
  return value as a DOM node or null if it fails

## array filters

While usual array methods are available by inspection (slice, splice, reverse),
there additional filters allow array transformations before merging.

### filter:str:cond:path

Keep items of a list that satisfy `this.get(item, path) <op> str`.

- cond can be any conditional filter name eq, neq, gt, lt, lte, gte, has,
and defaults to eq
- path is relative to each item, and can be omitted

### map:name:param:(...)

Map an array with the filter `name` and its parameters.

### select:path

Map array items to their paths.

### page:count:index

Returns `array.slice(index * count, (index + 1) * count)`.

### nth:step:offset

Returns every n*step + offset index of the array.

Offset is optional.

For example to get evens and odds: `[list|nth:2]` `[list|nth:2:1]`.

### sort:path:nullsFirst

Calls array.sort on each property specified by path.

nullsFirst can be "1" or "true".

Numeric or dates are compared as such, strings are compared using localeCompare.

## html filters

While repeat and magnet can be used as pure string filters in a limited fashion,
they are meant to manipulate dom nodes.

### at:range

By default an expression is replaced by its value,
without affecting surrounding text, tag name, attribute, or node.

The filter allows one to extend the current selection with:

- empty range: default behavior replaces the expression itself
- `-`: selects the whole text node or attribute surrounding the expression
- selector: the closest selected parent
- `*`: the nth selected parent (one wildcard goes up one parent)
- B+selector+A: selects B siblings before and A siblings after (B and A integers).
  When the integer is 1, it is optional: +parent selects one sibling before.

Using at, prune, then, else, to filters, one can control how a value affects selection.

Examples:

- `at:div.card` selects `closest('div.card')`.
- `at:+div.card+` selects also the previous and next siblings of the ancestor.
- `at:+**+2|to:class` selects one sibling before and two siblings after parent node, and sets the class on them #FIXME

### prune:range

Like "at", without actually writing the value,
this is a shortcut for `at:${range}|const:`.

Useful to test a value and remove selected range if falsey.

To remove selected range but actually merge the value if truey,
use instead `else:at:*`.

### to:target

While `at` filter widens the range around the expression,
`to` restricts it to text content or to another attribute.

- ``: replace selected range (default)
- `-`: selects current node content (especially when used inside an attribute)
- `*`: selects current node. `to:*` and `at:*` are equivalent.
- `attr`: replace content of this attribute

Examples:

- `to:src` fills the src attribute of the current node
- `at:div|to:class` fills the class attribute of the closest `div`
- `val|then:to:class|then:at:p|else:prune:p` fills the class attribute of closest `p` if val is not falsey, else remove `p` entirely. Another way of writing it is: `val|at:p|then:to:class|else:const:`.

### repeat:alias:placer:(...)

Expect the value to be iterable (array, collection, etc...).

Repeats selected range for each item in the value.

The selected range is:

- set by `at:range` filter if called before repeat
- or defaults to `at:*` (the most common case).

The keys in each item become available in the scope of each repeated range.

The alias parameter can name repeated item, so that these two expressions
are equivalent:

- `[items|at:div|repeat:|id] has some [text]`
- `[items|at:div|repeat:my|id] has some [my.text]`

The first case is shorter to write but overwrites current scope with iterated item keys, while the alias allows to avoid that.

The placer parameter may be a custom filter name called *after* the iterated range
has been merged, with (item, cursor, fragment, ...params) signature:

- the iterated item
- cursor node before which the fragment would have been merged
- fragment result of the merge
- other custom params passed to the placer

The place filter may choose to:

- insert fragment before cursor (the default behavior)
- insert it somewhere else
- do nothing in which case the fragment is not inserted

### query: selector

If the current value is a dom node or fragment, runs querySelector(selector) on it.

### queryAll: selector

If the current value is a dom node or fragment, runs querySelectorAll(selector) on it,
and return a fragment of the selected nodes.

## Hooks

Hooks are called before applying filters, or after.

```js
hooks: {
  beforeAll: (ctx, val) => {},
  beforeEach: (ctx, val, filter) => {},
  afterEach: (ctx, val, filter) => {},
  afterAll: (ctx, val) => {}
}
```

The `filter` parameter contains:

- name:string
- params:array

and can be modified.
Also `filter.name` is useful to hook into a specific filter at runtime.

## Custom symbols

Default symbols are:

- open: `[`
- close: `]`,
- path: `.`
- append: `|`
- param: `:`

and can be overriden by passing a symbols object to the constructor.

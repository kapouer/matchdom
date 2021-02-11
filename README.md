# matchdom -- extensible declarative template expressions for the DOM

DSL for merging data.

Features:
- traverses and mutates DOM attributes and nodes - no custom html parser
- powerful accessors and filters syntax
- bundled with filters: attr, magnet, repeat, join, and much more.
- handles nested expressions
- able to merge pure text too (though some filters won't apply)

## usage

```js
import {Matchdom, HTML, XML} from 'matchdom';
const md = new Matchdom({
	hooks = {},
	symbols = {},
	visitor = () => true
});
md.extend({
	filters = {},
	types = {},
	formats = {}
});
const mergedDom = md.merge(HTML(`<div id="model" class="[myclass]">
	<h[n]>Header</h[n]>
	<span>[data.text]</span>
	<img src="[data.icon|orAt:*]">
</div>`)), {
	n: 4,
	myclass: "yes",
	data: {
		text: "test"
	}
});
const expectedHTML = `<div id="model" class="yes">
	<h4>Header</h4>
	<span>test</span>
</div>`;
assert.equal(mergedDom.outerHTML, HTML(expectedHTML).outerHTML);
```

- merge(dom, data, scope)
- extend({filters, types, formats} or an array of plugins)


## compatibility

- there is a crucial dependency on `<template>` for the html fragment parser.

Consider using a service like polyfill.io for older browsers support.



## dom traversal visitor

This can be done by defining
```js
new Matchdom({
	visitor(elementNode, iter, data, scope):boolean
})
```
which is called before processing node, so this function can change it,
or can append/remove next siblings.

See tests for an example.

## types and formats

Types can be used by filters typings, or by "to:" and "is:" filters.

Formats can be used by "to:" filter.

Basic types (and their shorthands):
- undefined, none: converts null-ish to undefined, leave other values intact
- null: converts falsey to null, leave other values intact
- integer, int: try to parseInt, return null if NaN
- string, str: toString
- boolean, bool: "true", "1" and truey to true, "false", "0", and falsey to false
- float, num, numeric: try to parseFloat, return null if NaN

Custom types (these can be overriden by plugins):
- date: try new Date(val), return null if not a date
- array: wrap non-array-like values into an array
- json: parse json string

Default formats:
- text: converts string with newlines by a dom fragment with hard breaks
- html: converts string to a dom fragment
- xml: converts string to an xml fragment
- url: merges source and destination - works well with to: filter.
- keys: array of keys
- values: array of values
- entries: arrays of {key, value}

Additionnal types and formats can be added by passing functions:

```
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

Parameters are uri-decoded.

The parameters received by a filter function can be checked/coerced automatically:

```
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

```
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

The `get:` filter has a special syntax without colon, instead of

`[get:path.to.data|myFilter:param|get:sub.data]`

one can write:

`[path.to.data|myFilter:param|sub.data]`

When the last item of the path of an expression refers to an `undefined` value,
the value is converted to `null`, so the expression is merged.

When the path refers to an `undefined` value before the last item, the expression
is not merged.


## canonical methods filter

### name:param...

If the value has a method with that name, call it with the given parameters.

Think about toLowerCase, toUpperCase, toISOString, split, join, slice etc...

This has many limitations and corner cases: for correct handling of parameters, define a custom filter.


## string filters

If the value is a string, javascript string methods are callable as filters.

### str:str

Always return str.

### pre:str

Prepends string if value is not null or not empty.

### post:str

Appends string if value is not null or not empty.

### lower: and upper:

Shorthands for toLowerCase, toUpperCase string methods.

### cap

Capitalizes the string value.


## flow control filters

### then:name:param:...

When value is loosely true, return the value of running the given named filter;
else return the value.

### and:str

Alias for `then:const:str`

Remember to use `required="[isrequired|and:]"` to get a "boolean attribute" right.


### else:name:param:...

Same as then but when value is falsey.

### or:str

Alias for `else:const:str`


## boolean operators

These filters return the value if the condition is true, or null if the condition is false:

- eq:str
- neq:str
- has:str (contains str)
- in:str (contained in str)
- gt:num
- lt:num
- gte:num
- lte:num

## numeric operators

Standard operations:

- add:num
- sub:num
- mul:num
- div:num
- mod:num
- pow:num


## type filters
### is:<type>

Checks value is of that type, and returns a boolean.

### as:<type|format>

Coerces value to type, or converts string to format.

Returns null when it fails to coerce or format:
- cannot coerce a string (empty or not), or false, or 0, to undefined or null
- cannot coerce a date or number (NaN)
- cannot format to dom for any reason


## array filters

While usual array methods are available by inspection (slice, splice, reverse),
there additional filters allow array transformations before merging.

### filter:str:cond:path

Keep items of a list that satisfy `this.get(item, path) <op> str`.

- cond can be any conditional filter name eq, neq, gt, lt, lte, gte, has,
and defaults to eq
- path is relative to each item, and can be omitted

### map:name:param:...

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

This filter widens the `range` the expression will replace:
- empty range: the whole string, attribute, or text node.
- selector range: the closest selected parent
- wildcard(s): the nth selected parent
- plus sign(s): before or after a parent selector, previous and next siblings of parent

If used in conjunction with the "to:" filter, with allows one to replace an
attribute on selected node(s), instead of replacing the nodes themselves.

Examples:
- `at:div.card` selects `closest('div.card')`.
- `at:+div.card+` selects also the previous and next siblings of the ancestor.
- `at:+**++|to:class` selects one sibling before and two siblings after parent node, and sets the class on them #FIXME

### orAt:range

A shortcut for `else:at:${range}` removes a range when value is null-ish.

### ifAt:range

This is a shortcut for `orAt:${range}|const:`.

If the value is falsey, the range is removed.

The value is never shown.


### to:attrName or *

Moves where the expression is merged:
- `to:` fills the content of the node
- `to:*` replaces the node
- `to:attr` replaces the attribute of the node(s)

Examples:
- `to:src` fills the src attribute of the current node
- `at:div|to:class` fills the class attribute of the closest `div`
- `at:p|then:to:class|else:to:*` fills the class attribute of closest `p` or remove it entirely


### repeat:range:alias:place

Expect the value to be iterable (array, collection, etc...).

Repeats selected range for each item in the value.

The keys in each item become available in the scope of each repeated range.

The alias parameter can name repeated item, so that these two expressions
are equivalent:
- `[items|repeat:div|id] has some [text]`
- `[items|repeat:div:my|id] has some [my.text]`

The first case is shorter to write but overwrites current scope with iterated item keys, while the alias allows to avoid that.

The place parameter may be a custom filter name called *after* the iterated range
has been merged:
- value is iterated item,
- ctx.src.node is the insertion cursor (an empty text node) in ctx.src.root
- ctx.dest.root the fragment containing the merged range
- ctx.dest.node the current node in the fragment.

The place filter may choose to:
- insert ctx.dest.node before ctx.src.node (default behavior)
- insert it somewhere else
- do nothing in which case the node is dropped


### query: selector

If the current value is a dom node or fragment, runs querySelector(selector) on it.

### queryAll: selector

If the current value is a dom node or fragment, runs querySelectorAll(selector) on it,
and return a fragment of the selected nodes.


## Hooks

Hooks are called before applying filters, or after.

```
hooks: {
	before: (val) => {},
	beforeEach: (val, filter) => {},
	afterEach: (val, filter) => {},
	after: (val) => {}
}
```

In hooks, `this` is the same object as in filters.

The `filter` parameter contains:
- name:string
- params:array
and can be modified.


## Custom symbols

Default symbols are:
- open: `[`
- close: `]`,
- path: `.`
- append: `|`
- param: `:`

and can be overriden by passing a symbols object to the constructor.

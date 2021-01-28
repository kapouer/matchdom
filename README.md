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
	filters = {},
	hooks = {},
	symbols = {},
	filterNode = () => true
});
const mergedDom = md.merge(HTML(`<div id="model" class="[myclass]">
	<h[n]>Header</h[n]>
	<span>[data.text]</span>
	<img src="[data.icon|without:*]">
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


## compatibility

- DOM parsing needs: `<template>` for HTML, DOMParser for XML


## dom traversal

A custom function allows advanced traversal:

This can be done by defining
```js
new Matchdom({
	nodeFilter(elementNode, iter, data, scope):boolean
})
```
which is called before processing node, so this function can change it,
or can append/remove next siblings.

See tests for an example.

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

Available types are the same as for the "as:" filter, with the addition of:
- 'filter': checks the parameter is a filter name,
- 'path': converts parameter to a path array

A filter function can have side effects on the document being merged.

`ctx` has the following properties:
- data: the data object available to expressions
- path: the current path used to get current value from data

- src: initial place of expression
- dest: target place of expression

  The initial place is either mutated or removed if the target place is different.
- expr: expression instance
`this.get(this.data, this.path) == val`

And methods:
- write(str): updates node or attr value
- read(): returns node or attr value
- cancel(): drop merging these hits

### place

A place is an object with these properties related to where the expression sits:
- node: node or text node
- attr: attribute name (if any)
- tag: boolean wether the expression is in a tag name
  Since tag names	are case-insensitive, the expression must work in lowercase
- root: the ancestor node passed to matchdom
- hits: list of strings to process
- index: the current index hits


### expression

A parsed expression has properties:
- path (array of strings)
- filters (array of {name, fn, params} objects where params is an array)
- filter (index of current filter being applied in filters)

and methods:
- clone()
- toString()
- get(data, path, save)
- ignoreFilters() ignore following filters

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

Some filters have a `type` parameter used to name a basic javascript type,
or basic document format.

available types (and their shorthands) are:
- undefined: none, undefined
- null: null
- integer: int, integer
- string: str, string
- boolean: bool, boolean
- float
- date
- array

These default formats are supported:
- text: converts string with newlines by a dom fragment with hard breaks
- html: converts string to a dom fragment
- xml: converts string to an xml fragment
- keys: array of keys
- values: array of values
- entries: arrays of {key, value}

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

### with:range

By default an expression is replaced by its value,
without affecting surrounding text, tag name, attribute, or node.

This filter widens what the expression will replace (or not) depending on `range`:
- empty range: the whole string, attribute, or text node.
- selector range: the closest selected parent
- wildcard(s): the nth selected parent
- plus sign(s): before or after a parent selector, previous and next siblings of parent

If used in conjunction with the "to:" filter, with allows one to replace an
attribute on selected node(s), instead of replacing the nodes themselves.

Examples:
- `with:div.card` selects `closest('div.card')`.
- `with:+div.card+` selects also the previous and next siblings of the ancestor.
- `with:+**++|to:class` selects one sibling before and two siblings after parent node,
  and sets the class on them.


### without:range

This is a shortcut for `else:with:${range}|const:`.

If the value is falsey, the range is removed.

The value itself is not shown.


### to:attrName or *

Moves where the expression is merged:
- `to:` fills the content of the node
- `to:*` replaces the node
- `to:attr` replaces the attribute of the node(s)

Examples:
- `to:src` fills the src attribute of the current node
- `with:div|to:class` fills the class attribute of the closest `div`
- `with:p|then:to:class|else:to:*` fills the class attribute of closest `p` or remove it entirely


### repeat:range:alias

Expect the value to be iterable (array, collection, etc...).

Repeats selected range for each item in the value.

The keys in each item become available in the scope of each repeated range.

The alias parameter can name repeated item, so that these two expressions
are equivalent:
- `[items|repeat:div|id]`
- `[items|repeat:div:my|my.id]`

However the alias is useful when merging several properties of the same item.
Compare:
- `<div id="[items|repeat:*|id]" class="[style]">[title]</div>`
- `<div id="[items|repeat:*:my|my.id]" class="[my.style]">[my.title]</div>`

The first case is shorter to write but overwrites current scope with iterated item keys.


### class:method

`node.classList[method](value)` where method is add, remove, toggle.


### url:to

Compose the value-as-url with the target-value-as-url.

- reads the target url value
- replaces target hostname with value hostname
- replaces target pathname with value pathname
- overwrites target query with value query

The "to" attribute name autodetects the presence of src, href, srcset,
so it can be omitted in most cases.

Example:
With a value `/api2?find=test`
`<a href="https://test.com/api?find=str&sort=asc" data-tpl="[request|url]">`
becomes
`<a href="https://test.com/api2?find=testsort=asc">`


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

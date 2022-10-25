# matchdom -- extensible declarative template expressions for the DOM

DSL for merging data.

A matchdom expression describes a chain of "filter" functions:
`[func1:param1|func2:param2]`.

A filter function has signature (see below):
`(ctx, val, param1, param2, ...) -> newVal`
and returns a value handled by the next filter,
until the expression can be merged.

`md.merge(node, data)` mutates `node`.

If `node` is a string that starts with '<' and ends with '>',
it is converted to a DOM fragment (or single node) if `document` is available.

## example

```js
import { Matchdom, TextPlugin, NumPlugin, DomPlugin } from 'matchdom';

const md = new Matchdom(TextPlugin, NumPlugin, DomPlugin);
// or new Matchdom(TextPlugin, NumPlugin).extend(DomPlugin)

// html string is converted to a DOM node, thanks to DomPlugin
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

assert.equal(mergedDom.outerHTML, `<div id="model" class="yes">
 <h4>Header</h4>
 <span><em>test</em></span>
</div>`);
```

- merge(body, data, scope)

A plugin is an object with those properties:

```js
{
  filters: {},
  types: {},
  formats: {},
  hooks: {}
}
```

If a plugin has no filters, types, formats, hooks keys:

- if it has hooks keys, they are used as hooks
- otherwise keys are assumed to be filters, so that
  `new Matchdom({myfilter() {} })`
  and
  `new Matchdom({filters: {myfilter() {} }})`
  are equivalent.

Depending on the types that are made available by the loaded plugins,
body is automatically coerced in a DOM node or kept as a string.

## compatibility

matchdom expects a somewhat modern browser or server environment,
depending on the loaded plugins.

Use runtime or bundled polyfills to meet your particular needs.

## declaring custom filter

Filter functions should be declared with their types.

Since all parameters will be received as strings, declaring the types
allow coercion rules and type checks.

Once type-checked, parameters are uri-decoded (if possible) before filter is called.

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

All plugins types can be used - see `as` filter.

A filter function can:

- return a new value
- change context

## types and formats

Types can be used by filters parameters, or by "as:" and "is:" filters.

Formats are not types - they are only used by "as:" filter.

### simple types (hard-coded)

- undefined, none: converts null-ish to undefined, leave other values intact
- null: converts false-ish to null, leave other values intact
- integer, int: try to parseInt, return null if NaN
- string, str: toString
- boolean, bool: "true", "1" and true-ish to true, "false", "0", and false-ish to false
- float, num, numeric: try to parseFloat, return null if NaN

### complex types (from plugins)

- filter: checks the parameter is a filter name
- path: converts parameter to a path array
- date: try new Date(val), return null if not a date, accepts 'now'
- array: wrap non-array-like values into an array
- json: parse json string

### formats (from plugins)

- text: converts string with newlines by a dom fragment with hard breaks
- html: converts string to a dom fragment
- xml: converts string to an xml fragment
- url: merges source and destination - works well with as: filter.
- keys: array of keys
- values: array of values
- entries: arrays of {key, value}

### format and type declaration

This adds a `simple` type that checks if a value is simple, and a `text` format:

```js
const md = new Matchdom({
  types: {
    simple(ctx, val) {
      if (ctx.isSimpleValue(val)) return val;
      else return null;
    }
  },
  formats: {
    string(ctx, val) {
      if (val == null) return val;
      return val.toString();
    }
  }
});
```

## Internals

### filter

An array of strings

### expression

A parsed expression has properties:

- path: array of strings
- filters: array of filters
- filter: index of current filter in filters

and methods:

- parse(str): parses str and populates this expression
- clone(): return a new expression with the not-yet processed filters
- toString(): the original expression with open and closing brackets
- get(data, path): access data from path
- get(data, path, root): access data or root data from path, save path
- append(filter): a filter to the list
- prepend(filter): a filter at current index
- drop(): stop processing following filters, return true if there was any

### context

- raw: the current value before coercion to a filter parameter
- data: the data object available to expressions
- scope: shallow clone of the scope object passed to matchdom
- src: initial place of expression, should be immutable
- dest: target place of expression
- expr: current expression being merged
- cancel: boolean, stops and cancels merge

Methods are not supposed to be called by other filters.

### place

A `place` holds:

- root: ancestor node
- target: one of Place.TEXT, NODE, CONT, ATTR, TAG
- node: containing node
- attr: attribute name if any
- text: text node, if any

During merge, it also has:

- hits: list of strings to write
- index: current index in hits

And various methods to extend to an ancestor, restrict to a node or attribute, write strings to the place, or read the current strings in place.

## core plugin

### filter, path paths

- filter type checks if the string value is the name of a loaded filter
- path type coerces the string to a list of identifiers

### get:path

Returns data as found from path accessor.

When the path starts with a dot, it applies to current value.

When the path starts with an identifier, it applies to context data.

When the last item of the path of an expression refers to an `undefined` value,
the value is converted to `null`, so the expression is merged:

When the path refers to an `undefined` value before the last item, the expression
is not merged.

```js
assert.equal(md.merge("a[to.nothing]b", {to: {}}), 'ab')
assert.equal(md.merge("a[to.nothing]b", {}), 'a[to.nothing]b')
```

The `get:` filter has a special syntax without colon, instead of

`[get:path.to.data|myFilter:param|get:.prop]`

one can write:

`[path.to.data|myFilter:param|.prop]`

### alias:path

Returns an object in which current value can be accessed using this path.

Useful when another filter expects data to be accessible under a specific path.

### const:str

Always return str.

### canonical name:param(...)

Call the current value method under that name.

This could be handy but lacks type checking and might give unexpected results:
instead, define an adhoc filter.

### is:type

Checks value is of that type, and returns a boolean.

### as:type|format

Coerces value to type, or converts string to format.

- as:null, as:undefined
  returns null, or undefined, if value is false-ish - otherwise returns value
- as:date, as:number
  return value as date, or number, or null if it cannot be converted
- as:html
  return value as a DOM node or null if it fails

## flow plugin (always loaded)

### not then else:filter:param+

Evaluates value loosely, and call named filter with parameters accordingly.

### or and:str

- "or" is a shorthand for "else:const:str"
- "and" is a shorthand for "then:const:str"

## Matchdom.TextPlugin

### pre:str, post:str

Prepends or appends string if value is not null or not empty.

### case:low|up|caps

Uppercase, lowercase, or unicode-capitalize sentences.

### dec enc:base64|base64url|url|hex

Decodes/encodes to specified encoding.

## Matchdom.ArrayPlugin

### array type

Returns:

- nothing if value is undefined
- empty array is value is null
- single item array is value is not an array
- the value itself if iterable

### keys, values, entries formats

Return these Object methods on the array.

### filter:str:op:path

Filter array by applying `get:${path}|${op}:str` to each item in the array.

### map:filter:param+

Map an array by calling named filter on each item, with additional params.

### select:path

Shorthand for `map:get:${path}`.

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

## Matchdom.OpsPlugin

### pass-through filters

These filters return the value if the condition is true, or null if the condition is false:

- eq:str
- neq:str
- has:str (contains str and returns str)
- in:str1:... (contained in list of strings)
- gt:num
- lt:num
- gte:num
- lte:num
- switch:key1:val1:key2:val2:...
  returns matching value by key, or null if last key is empty, or val

### arithmetic filters

- add:num
- sub:num
- mul:num
- div:num
- mod:num
- pow:num

## Matchdom.NumPlugin

All three filters return a localized string,
with at least min digits and at most max digits.

min default to 0, max defaults to min.

### digits:min?0:max?min

Formats a number.

### percent:min?0:max?min

Formats a percent.

### currency:currency:min?0:max?min

Formats a currency.

## Matchdom.DatePlugin

### date type

Converts string or timestamp to date.

### date, time, datetime formats

ISO formatting

### date:format

Localized date formatting

## Matchdom.JsonPlugin

### json type

Converts string to json object

### format or filter ? json

Converts data to json string

## Matchdom.DomPlugin

### text format

Formats string with `<br>` in place of new lines.

### html, xml formats

Parses string as html or xml.

### url format

Fuse source and destination places as if they were url components.

### at:selector:before:after

By default an expression is replaced by its value,
without affecting surrounding text, tag name, attribute, or node.
This filter extends the selected range.

First by changing the selected parent:

- ``: empty selector, selects the expression and the adjacent text to it
- `-`: selects the content of the parent node containing the expression
- `*`: the nth selected parent (one wildcard goes up one parent)
- a css selector: the closest selected parent

Second, by extending to previous or next siblings of the selected parent, using `before` and `after` parameters:

- integer: counts the number of siblings to select (before or after). Empty text nodes are ignored.
- selector: select siblings until they stop matching that selector.

Using at, prune, then, else, to filters, one can control how a value affects selection.

Examples:

- `at::2:1` selects 2 nodes before and one node after the expression
- `<br>a[val|at::1]b` selects the `<br>`, `a` and `b` strings
- it is not possible to not select `a` or `b` in previous example
- `at::b:a` is not defined when destination is an attribute, avoid using it
- `at:div.card` selects `closest('div.card')`.
- `at:div.card:1:1` selects also the previous and next siblings of the ancestor.
- `at:**:1:2|to:class` selects one sibling before and two siblings after parent node, and sets the class on them.
- `at:*::.column` selects parent node and all next siblings until they stop matching `.column`.

### filter prune:range:before:after

Like "at", without actually writing the value,
this is a shortcut for `at:${range}|const:`.

Useful to test a value and remove selected range if false-ish.

To remove selected range but actually merge the value if true-ish,
use instead `else:at:*`.

### filter to:target

While `at` filter widens the range around the expression,
`to` restricts it to text content or to another attribute.

- ``: replace selected range (default)
- `-`: selects current node content (especially when used inside an attribute)
- `*`: selects current node. `to:*` and `at:*` are equivalent.
- `attr`: replace content of this attribute

Examples:

- `to:src` fills the src attribute of the current node
- `at:div|to:class` fills the class attribute of the closest `div`
- `val|then:to:class|then:at:p|else:prune:p` fills the class attribute of closest `p` if val is not false-ish, else remove `p` entirely. Another way of writing it is: `val|at:p|then:to:class|else:const:`.

### filter repeat:alias:placer:(...)

Expect the value to be iterable (array, collection, etc...).

Repeats selected range for each item in the value.

The selected range must be set using `at` filter; if not, the selected range will default to `at:*`.

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

### filter query:selector

If the current value is a dom node or fragment, runs querySelector(selector) on it.

### filter queryAll:selector

If the current value is a dom node or fragment, runs querySelectorAll(selector) on it,
and return a fragment of the selected nodes.

## Hooks

Hooks are called before applying filters, or after.

```js
const md = new Matchdom({
  beforeAll: (ctx, val) => {},
  beforeEach: (ctx, val, filter) => {},
  afterEach: (ctx, val, filter) => {},
  afterAll: (ctx, val) => {}
});
md.merge(...);
```

The `filter` parameter is a list: `[name, param1, param2, ...]`.

It can be modified.

## Custom symbols

Default symbols are:

- open: `[`
- close: `]`,
- path: `.`
- append: `|`
- param: `:`

and can be overriden by passing a symbols object to the constructor.

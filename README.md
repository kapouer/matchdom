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

Types can be used by filters typings, or by "as:" and "is:" filters.

Formats are not types - they are only used by "as:" filter.

### simple types (hard-coded)

- undefined, none: converts null-ish to undefined, leave other values intact
- null: converts falsey to null, leave other values intact
- integer, int: try to parseInt, return null if NaN
- string, str: toString
- boolean, bool: "true", "1" and truey to true, "false", "0", and falsey to false
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

### context

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
  returns null, or undefined, if value is falsey - otherwise returns value
- as:date, as:number
  return value as date, or number, or null if it cannot be converted
- as:html
  return value as a DOM node or null if it fails

## flow plugin

### not then else:filter:param+

Evaluates value loosely, and call named filter with parameters accordingly.

### or and:str

- "or" is a shorthand for "else:const:str"
- "and" is a shorthand for "then:const:str"

## text plugin

### pre:str, post:str

Prepends or appends string if value is not null or not empty.

### case:low|up|caps

Uppercase, lowercase, or unicode-capitalize sentences.

### dec enc:base64|base64url|url|hex

Decodes/encodes to specified encoding.

## array plugin

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

## ops plugin

### booleans filters

These filters return the value if the condition is true, or null if the condition is false:

- eq:str
- neq:str
- has:str (contains str and returns str)
- in:str1:... (contained in list of strings)
- gt:num
- lt:num
- gte:num
- lte:num

### arithmetic filters

- add:num
- sub:num
- mul:num
- div:num
- mod:num
- pow:num

## num plugin

All three filters return a localized string,
with at least min digits and at most max digits.

min default to 0, max defaults to min.

### digits:min?0:max?min

Formats a number.

### percent:min?0:max?min

Formats a percent.

### currency:currency:min?0:max?min

Formats a currency.

## date plugin

### date type

Converts string or timestamp to date.

### date, time, datetime formats

ISO formatting

### date:format

Localized date formatting

## json plugin // TODO

### json type

Converts string to json object

### format or filter ? json

Converts data to json string

## dom plugin

### text format

Formats string with `<br>` in place of new lines.

### html, xml formats

Parses string as html or xml.

### url format

Fuse source and destination places as if they were url components.

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

### filter prune:range

Like "at", without actually writing the value,
this is a shortcut for `at:${range}|const:`.

Useful to test a value and remove selected range if falsey.

To remove selected range but actually merge the value if truey,
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
- `val|then:to:class|then:at:p|else:prune:p` fills the class attribute of closest `p` if val is not falsey, else remove `p` entirely. Another way of writing it is: `val|at:p|then:to:class|else:const:`.

### filter repeat:alias:placer:(...)

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

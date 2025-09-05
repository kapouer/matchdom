# matchdom -- object model template engine

DSL for merging data into HTML, JSON, or Text object models.

A matchdom expression describes a chain of "filter" functions:
`[func1:param1|func2:param2]`.

Filter functions transform passed value until the expression can be merged.

`md.merge(node, data)` mutates `node`.

Using the appropriate plugin, `node` can be an HTML fragment parsed into DOM,
or a JSON object or plain text. If it cannot be modeled, it is returned as-is.

If the node is a fragment, a fragment is returned (even if empty).
Otherwise, if the result is a node or a value, it is returned (and can be null).

Since `merge` mutates nodes in their current document model, it is also possible
to merge multiple nodes, one by one, to avoid a costly search over all the nodes
of the document tree.

## example

```js
import { Matchdom, StringPlugin, NumPlugin, DomPlugin } from 'matchdom';

const md = new Matchdom(StringPlugin, NumPlugin, DomPlugin);
// or new Matchdom(StringPlugin, NumPlugin).extend(DomPlugin)

// html string is first converted to a DOM node (DomPlugin), then data is merged into Object Model.
const mergedDom = md.merge(`<div id="model" class="[myclass]">
 <h[n]>Header</h[n]>
 <span>[data.text|as:html] for [data.percent|locales:en|percent:1]</span>
 <img src="[data.icon|fail:*]">
</div>`, {
 n: 4,
 myclass: "yes",
 data: {
  text: "<em>test</em>",
  percent: 0.54287
 }
});

assert.equal(mergedDom.outerHTML, `<div id="model" class="yes">
 <h4>Header</h4>
 <span><em>test</em> for 54.2%</span>
</div>`);
```

## api

- new Matchdom(...plugins)
  create new instance
- instance.merge(node, data, scope?)
  fuse data into node, optional scope object
- instance.copy()
  creates a new instance with the same plugins
- instance.extend(plugin)
  add a plugin to the instance

## plugin

A plugin is an object with those (default) properties:

```js
{
  filters: {},
  types: {},
  formats: {},
  hooks: {},
  debug: false
}
```

A matchdom instance can be used as a plugin:

```js
const md = new Matchdom(StringPlugin, OpsPlugin);
const emd = new Matchdom(md, ArrayPlugin);
```

If a plugin has no filters, types, formats, hooks keys:

- if it has hooks keys, they are used as hooks
- otherwise keys are assumed to be filters, so that
  `new Matchdom({myfilter() {} })`
  and
  `new Matchdom({filters: {myfilter() {} }})`
  are equivalent.

Depending on the types that are made available by the loaded plugins,
body is automatically parsed into a DOM node or kept as a string,
likewise, an object can be parsed into a JSON model.

The `debug` flag tells matchdom to rethrow filters exceptions, instead of just logging them.

## compatibility

matchdom expects a somewhat modern browser or server environment,
depending on the loaded plugins.

Use polyfills to meet your particular needs.

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

If a type ends with '?' then a null-ish value is allowed and converted to null.

If a type ends with '*' then an unknown amount of parameters is allowed,
of that type:

- '*' allows any non-null parameters
- '?*' allows any parameters, even null
- 'int?1*' allows integers with a default value of one
- 'num' allows a numeric value

All plugins types can be used - see `as` filter.

A filter function can:

- return a new value
- change context

## types

Filters parameters can be given a type.

The `as` and `is` filters are useful to explicitely cast or check a value type.

### simple types (hard-coded)

The string value is obtained using `val.toString()` if it exists, else it is val.

- undefined, none: converts null-ish string value to undefined, or return value
- null: converts false-ish string value to null, or return value
- integer, int: try to parseInt, return 0 if NaN
- string, str: return string value
- boolean, bool: "true", "1" and true-ish to true, "false", "0", and false-ish to false
- float, num, numeric: try to parseFloat, return 0 if NaN
- object: not any of the other simple types

### complex types (from plugins)

- filter: an array, first parameter must be a filter name
- path: converts parameter to a path array
- date: try new Date(val), return null if not a date, accepts 'now'
- array: wrap non-array-like values into an array
- obj: parse json as tree

## formats

Formats are functions names to convert a value into something else.

They are grouped by filters names, in `formats[name]` objects.

Formats are used directly by the corresponding filter.

### as:format added by plugins

- text: converts string with newlines by a dom fragment with hard breaks
- html: converts string to a dom fragment
- xml: converts string to an xml fragment
- url: converts string to an URL instance
- list: convert boolean to last name, or object to list of keys having true-ish values
- keys: array of keys
- values: array of values
- entries: array of {key, value}
- clone: shallow clone of an object. Keeps its type if possible.

### date:format

See date filter.

### format and type declaration

This adds a `simple` type that checks if a value is simple, and a `nosp` format:

```js
const md = new Matchdom({
  types: {
    simple(ctx, val) {
      if (ctx.isSimpleValue(val)) return val;
      else return null;
    }
  },
  formats: {
    as: {
      nosp(ctx, val) {
        if (val == null) return val;
        return val.toString().replace(/\s+/, ' ');
      }
    }
  }
});
```

## Internals

### filter

An array of strings:

- first item is the filter name.
- others are the filter parameters

An array of length one is normalized to be a `get` filter.

The name and parameters only allow specific characters, see Symbols.

Escaping in parameters can be done using percent-encoding.
Decoding is tried with decodeURIComponent.

### expression

A parsed expression has properties:

- path: actual list of keys used to access data
- optional: boolean, when current path ends with optional chaining
- filters: array of filters
- filter: index of current filter in filters
- cancel: boolean, stops and cancels merging of that expression

and methods:

- parse(str): parses str and populates this expression
- clone(): return a new expression with the not-yet processed filters
- toString(): the original expression with open and closing brackets
- get(data, path): access data from path
- append(filter): add a filter to the list
- prepend(filter): insert a filter at current index
- drop(): stop processing following filters, return true if there was any

### context

- raw: the current value before coercion to a filter parameter
- data: the data object available to expressions
- scope: a custom object passed to matchdom, not mutated by filters
- src: initial place of expression, should be immutable
- dest: target place of expression
- expr: current expression being merged

Two methods can be called by other filters:

- filter(value, name, ...params): filter value
- format(value, name, format): format value

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

Methods are for internal use.

## core plugin

### type filter

Checks if the string value is the name of a loaded filter.

### type path

Parses the value into an array of path components.
If the value is empty, returns an empty array.

### get:path

Returns data as found from path accessor.

When the path starts with a dot, it applies to the value returned by previous filter.

When the path starts with an identifier, it applies to context data.

When data being accessed is an Array, the matching path item can be negative or above array length - it is applied modulo array length.
Also, special path item "first" and "last" can be used to specify those array indexes.

#### optional or unresolved path

A path can be partially resolved if an undefined value is encountered before reaching the last component. In this case, `undefined` is returned.

Otherwise, if the path is fully resolved, `ctx.expr.last` is set to true, which will convert an `undefined` value to `null` - after the `afterAll` hook.

Furthermore, a path is not fully resolved if there are unconditional relative paths in the following filters.

When a component of a path ends with a `?` (Symbols.opt), if it is `undefined`, it becomes `null`, changing the previous behavior. In that case, `ctx.expr.optional` is set to `true`.

For example, a variable with a top-level path, like `[prop]`, is merged even if it is undefined, because it starts from defined context data.

However, if a filter declares a required value, and the value is undefined, the expression is not merged.

```js
// non-existent object
assert.equal(md.merge("a[to.nothing]b", {}), 'a[to.nothing]b');

// existent object
assert.equal(md.merge("a[to.nothing]b", { to: {} }), 'ab');

// optional chaining
assert.equal(md.merge("a[to?.nothing]b", {}), 'ab');

// expression is not fully resolved because `to` is not the last component
assert.equal(md.merge("a[to|as:array|.first]b", {}), 'a[to|as:array|.first]b');

// to is optional, null is cast to [], .first is fully resolved and becomes null
assert.equal(md.merge("a[to?|as:array|.first]b", {}), 'ab');

// top level value is resolved, so optional chaining doesn't change the result
assert.equal(md.merge("a[top]b", {}), 'ab');
assert.equal(md.merge("a[top?]b", {}), 'ab');

// list becomes null and cast to []
assert.equal(md.merge("a[list|at:|repeat:]b", {}), 'ab');

// here list is not fully resolved, and repeat filter expects defined value
// so the whole expression is canceled
assert.equal(
  md.merge("a[list|at:-|repeat:|.title]b", {}),
  'a[list|at:-|repeat:|.title]b'
);

// here the list becomes optional, cast to null then []
assert.equal(md.merge("a[list?|at:|repeat:|.title]b", {}), 'ab');
```

#### short syntax

The `get:` filter has a special syntax without colon, instead of

`[get:path.to.data|myFilter:param|get:.prop]`

one can write:

`[path.to.data|myFilter:param|.prop]`

#### rebase

Used without parameters, `get:` stores current value into `expr.rebase`.

The second time it returns `expr.rebase`:

`[obj||.mykey|case:upper||.another|case:lower]`

Rebasing only happens before last filter; thus, if it was used once, the rebased value is returned at the end of the expression.

### path:key

Applies `get:key` to `ctx.expr.path` array.

### as:list:join?

Converts a boolean to its last path name.

If value is an object, each value of its entries is evaluated the same way.

The resulting list is space-separated unless `join` is specified.

Useful for attributesList-type when an attribute has not that type.

### set:mutation*

Apply a set of mutations on current value.

A mutation starts with a path, optionally prefixed by `-` or `+`:

- prefixed by `+` it appends value to the selected path
- prefixed by `-` it removes value from the selected path
- without prefix it sets the selected path to the value in next parameter

Paths are relatives to current value.

This filter supports Object, Set, Map, Array, URLSearchParams instances.

```js
assert.deepEqual(
  md.merge(`[obj|set:name:doe:-years:1800:+id:abc]`, { id: 'f1d3', years: [1700, 1800] }),
  { name: 'doe', years: [1700], id: ['f1d3', 'abc'] }
);
```

### only:key*

Keeps these keys and remove others.

Mutates the original object. Use `select` to build a new object.

Use rebase operator to act on a specific path.

### omit:key*

Remove these keys.

Mutates the original object.

Use rebase operator to act on a specific path.

### pick:path*

Pick values as these paths to build a new object using last keys of the paths.

### assign:path*

Assign values from source path to dest path to build a new object.

Accepts multiple pairs of paths.

Each pair represents a destination path, followed by a source path.

The last pair can omit the source path (defaults to current value).

Paths are relative to current value.

If any source path is undefined, assign returns undefined.

Supports the same types for destinations as the `set` filter.

### const:str

Always return str.

### is:type

Checks value is of that type, and returns a boolean.

### as:type|format

Coerces value to type, or converts string to format.

- as:null, as:undefined
  returns null, or undefined, if value is false-ish - otherwise returns value
  mind that `[obj|as:null|.key]` won't merge if obj is undefined - use `[obj?.key]` instead.
- as:date, as:number
  return value as date, or number, or null if it cannot be converted
- as:html
  return value as a DOM node or null if it fails

### locales:name+

Sets locales in current context, by order of preference.
Used by localized filters.

### at:selector:after:before

By default an expression is replaced by its value,
without affecting surrounding text, tag name, attribute, node, or json object.
This filter extends the selected range.

Note that `at` must be placed:

- *before* `repeat` when used to define the repeated range;
- *after* `get` when changing the destination of a value.

The selector changes the current parent:

- ``: the expression itself
- `-`: the parent node content, or the attribute
- `*`: the nth selected parent (one wildcard goes up one parent)
- `/`: the topmost parent element
- a css selector: the closest selected parent

The meaning of the selector depends on the Object Model (Text, JSON, Document).

Second, by extending to previous or next siblings of the selected parent, using `before` and `after` range parameters with format `Integer?Selector?`.

"Integer" counts the number of siblings to select. Empty text nodes are ignored, but text nodes count as one. `*` means 'Infinity'.

"Selector" selects siblings until they stop matching that selector.

When the range is a string without leading integer, the Integer value defaults to 1.

- `at::2:1` selects 2 nodes after and one node before the expression
- `<br>a[val|at::1]b` selects the `<br>` node and the whole text node containing the expression
- `at::after:before` is not defined when the expression is inside an attribute
- `at:div.card` selects `closest('div.card')`.
- `at:div.card:1:1` selects also the previous and next siblings of the ancestor.
- `at:**:1:2|to:class` selects one sibling after and two siblings before parent node, and sets the class on them.
- `at:*::.column` selects parent node and all next siblings until they stop matching `.column`.
- `at:*:**`: all sibling elements after current node
- `at:*:2*`: next two sibling elements
- `at:tr:*tr` selects all following tr nodes

Using at, fail, prune, then, else, to filters, one can control how a value affects selection.

### fail:selector:after:before

Synonym of `else:at:...`

A very common use case for merging, or removing a range if value is falsey.

### prune:selector:after:before

Like "at", without actually writing the value,
this is a shorthand for `at:...|const:`.

Useful to test a value and remove selected range if false-ish.

Note that `val|prune:` is the same as `val` only if `val` is empty, and differs if `val` is equal to boolean false.

To remove selected range but actually merge the value if true-ish,
use instead `fail:*`.

### to:target:range

`to` changes the destination place where the expression will be merged.

It doesn't change current value. See `from` below for reading the target value.

It can restrict range to another sibling, the inner text content, or an attribute.

This filter must be placed after `at:` filter, when present.

Target can be:

- ``: replace selected range (default)
- `-`: selects current node content (especially when used inside an attribute)
- `*`: selects current node. `to:*` and `at:*` are equivalent.
- `attr`: replace content of this attribute

Range selects a sibling after or before the target using the same range notation as with `at` filter, extended to allow + (following siblings) or - (previous siblings):

- `to::2` jumps two nodes after target ('+' can be omitted)
- `to::-1` gets node before target
- `to::2p` finds the second p after target
- `to:**:-3*` targets third previous element sibling before grand-parent node
- `at:**|to:href:-3a` target href of third previous anchor of grand-parent node
- `to:src` fills the src attribute of the current node
- `at:div|to:class` fills the class attribute of the closest `div`
- `at:*|to:value:-input` sets the value of the input before the current node
- `val|then:to:class|then:at:p|fail:p` fills the class attribute of closest `p` if val is not false-ish, else remove `p` entirely. Another way of writing it is: `val|at:p|then:to:class|else:const:`.

### from:target:range

Like `to:target:range` with the return value being the extracted content from the selected place.

Typical usage:

```html
<a href="/mypath">test[at:a|from:href|as:url|assign:.query.id:id]</a>
<a href="/mypath?id=xx">test</a>
```

## RepeatPlugin

### repeat:path:placer?:(...)

Expect the value to be iterable (array, collection, etc...).

Repeats selected range (by using `at` before) for each item in the value.

The selected range defaults to `at:*`.

The first component of the path is an alias for the repeated item.
The remaining path is used to access the item before merging it.
These expressions are equivalent:

- `[items|at:div|repeat:|.id] has some [text]`
- `[items|at:div|repeat:my|.id] has some [my.text]`
- `[items|as:entries|at:div|repeat:item.value|.id] has some [item.text]`

The placer parameter may be a custom filter name:

- it is called *before* the iterated range has been merged and before it is inserted
- it has (ctx, item, cursor, fragment, ...params) signature
- cursor: node before which the fragment would have been merged
- fragment: the fragment to be merged, to be placed or not
- additional parameters are appended

The placer filter may choose to:

- insert fragment before cursor (the default behavior)
- insert it somewhere else
- do nothing in which case the fragment is not inserted

## flow plugin (always loaded)

### not:filter:param*

Call filter with negated value.

To convert to boolean, use `[str|as:bool]`

To convert val to !val, use `[val|not:]`, which is the same as `[val|not:as:bool]`.

### then:filter:param*

Call filter if value evaluates to true, else return value.

### else:filter:param*

Call filter if value evaluates to false, else return value.

When merging an object, one does often `[obj.opt|else:obj.name]`

Like `not:then:`

### or, and:str

- "or" is a shorthand for "else:const:str"
- "and" is a shorthand for "then:const:str"

### alt:yes:no

Ternary operator, shorthand for "and:yes|or:no"

Second parameter can be omitted, in which case it is null.

Example of usage for non-detected boolean attributes:

```js
md.merge(`<x-el active="[val|alt:]">`, { val: true })
// <x-el active=""> or <x-el> if val is false
```

## TextPlugin

### file type

The text type provides a basic object model for manipulating strings and lines.
It is not meant to be used directly.

Filters will be added to allow multiline manipulations.

## StringPlugin

### format flag

Maps alphabetic letters to regional letters.

Use it to convert ISO 3166-1 country codes to emoji country flags.

### pre:str, post:str

Prepends or appends string if value is not null or not empty.

### case:low|up|caps|kebab

Uppercase, lowercase, unicode capitalize sentences, or unicode kebab-case.

### enc:base64|base64url|url|hex|path

Encodes to specified encoding.

### dec:base64|base64url|url|hex|path

Decodes from specified encoding.

### split:tok

Calls `str.split(tok)`. Return empty array if value is false-ish.

### parts:tok:start:end

Shorthand for "str|split:tok|slice:start:end|join:tok".

### trim:all|line|start|end|out

Trimming:

- all: whitespaces are removed inside too
- line: only empty lines are removed
- start: trim at start
- end: trim at end
- out: trim both sides (the default)

### test:pattern:classes*

Tests if value matches a simplified pattern.

A pattern is built by replacing wildcards *, +, ? like this:

`test:start*end:a-zA-Z` gives this regexp: `/^start[a-zA-Z]*end$/`.

If there is no parameter for the class, the wildcard is not replaced.

To match anything, just use `^` class.

### match:pattern:classes*

Returns the list of matched wildcards against value, or null if there was no match.

Empty matches are just an empty string.

### pad:n:str

Calls padStart for positive n, padEnd for negative n,
or pass through if n is zero.

## ArrayPlugin

### array type

Returns:

- nothing if value is undefined
- empty array is value is null
- single item array is value is not an array
- the value itself if iterable

### keys, values, entries formats

Return these Object methods on the array.

### filter:path:filter:param*

Filter array by applying `get:${path}|${filter}:params...` to each item in the array.
`filter` should be a filter returning a boolean, called with its parameters.
`path` is optional.

### find:path:filter:param*

Return the first item satisfying the filter condition.

### find:str

Return str if current array of values contains that str.

### has:val

Tests if current value (as an array) contains this value.

### group:path:filter:param*

Group items in array by `get:${path}|${filter}:params...` value.
Returns an iterable of arrays.

This groups an array by batch of three items and do a nested repeat:

```html
<div>
  <p>[list|as:entries|group:key:quot:3|at:div|repeat:item.value|repeat:item|.name][item.id]</p>
</div>
```

### map:filter:param*

Map an array by calling named filter on each item, with additional params.

### select:path*

When given a single path, it is a shorthand for `map:get:${path}`.

When given multiple paths, it maps each item to a new object, filled like `assign` filter.

### flat:depth

Calls flat(depth) on an array. No depth means Infinite.

### page:count:index

Returns `array.slice(index * count, (index + 1) * count)`.

### nth:step:offset

Returns every n*step + offset index of the array.

If step is negative, iterates in reverse, starting at last item.

Offset can be negative too.

For example to get evens and odds: `[list|nth:2]` `[list|nth:2:1]`.

### sort:path:nullsFirst

Calls array.sort on each property specified by path.

nullsFirst can be "1" or "true".

Numeric or dates are compared as such, strings are compared using localeCompare.

### join:tok

Calls `list.join(tok)`.

## OpsPlugin

### switch:args*

switch:key1:val1:key2:val2:...

Returns matching value by key, or null if last key is empty, or val.

An empty key match a null value.

### boolean operators

- eq:val
  loose equality
- neq:val
  loose inequality
- in:str1:...
  contained in list of values
- gt:num
  greater
- lt:num
  lesser
- gte:num
  greater or equal
- lte:num
  lesser or equal

### if:filter:param*

Runs the following filter.

If it evaluates to boolean true, returns current value, else return null.

### arithmetic filters

- add:num
- sub:num
- mul:num
- div:num
- quot:num
- mod:num
- pow:num

## NumPlugin

All three filters return a localized string,
with at least min digits and at most max digits.

min default to 0, max defaults to min.

### digits:min?0:max?min

Formats a number.

### percent:min?0:max?min

Formats a percent.

### currency:currency:min?0:max?min

Formats a currency.

## DatePlugin

### type date

Converts string or timestamp to date.

Accepts keyword 'now' to build a date with current timestamp.

### date:format, date:...list

Formats a date, or a date range.

A date range must be an array of two dates, or an object with
start|begin, stop|end keys.

format can be:

- isotime: time from iso output
- isodate: date from iso output
- iso: full iso output
- time: localized time
- date: localized date
- full: localized date time
- weekday: day of the week between 1 (monday) and 7 (sunday)
- days: number of days since Jan 1
- weeks: iso week number

Milliseconds are removed from all these formats.

Custom date formats can be added through a plugin exporting `{format: date: {}}`.

For localization, locales are either set explicitely with:

- locales:en-US:fr-BE

or are a concatenation of:

- documentElement.lang (if it is not empty)
- window.navigator.languages

Localized format accepts shorthands:

- d: narrow weekday
- da: short weekday
- day: long weekday
- Y: year
- YY: two-digits year
- mo: narrow month
- mon: short month
- month: long month
- M: numeric month
- MM: two-digits month
- D: day of month
- DD: two-digits day of month
- H: hours
- HH: two-digits hours
- m: minutes
- mm: two-digits minutes
- s: seconds
- ss: two-digits seconds
- tz: short timezone
- timezone: long timezone
- `country`/`city`: sets a timezone

### clock:offset:unit

Offset a unit of date by an integer value.

`[mydate|clock:3:m]` add 3 minutes to `mydate`.

Units are: Y, M, D, h, m, s.

## JsonPlugin

### type obj

Converts an object into a model that allows it to be merged as a tree.

Example: this would return an array of items with title, num keys:

```json
[{
  "title": "[list|at:**|repeat:item|.title|case:caps]",
  "num": "[item.id]"
}]
```

It is possible to put expressions into keys.

Extending selection using `at:*` has a special meaning when the value is an object, it assigns it to its parent object.

Likewise, `at:**` or `at:<keyname>` replaces target parent with the current object.

The repeated fragment is implicitely converted into array, when needed.

In the above example, removing the enclosing array gives the same result only if there is more than one element to merge.

### format obj

Tries to parse a json string into an object.

### format json

Converts object into json string.

## UrlPlugin

### type url

Converts string to an instance of a subclass of an URL.

By default, such an instance will be serialized as absolute path when it has the same origin as the default location, thus omitting `protocol://hostname:port` part.

The default location is document.location if it exists, or `null://`.

It also exposes the `query` property, which is a URLSearchParams canonically converted to an object where entries with same key are grouped into arrays.
Setting the `query` property to a string actually sets the `search` property, and if given an object (by another filter), it casts it to a query type then sets searchParams.

### type query

Canonically converts an object, or string, into QURLSearchParams, where array values become appended several times.

QURLSearchParams is like URLSearchParams, except that it prepends '?' when converted to string, if the query is not empty.

## DomPlugin

### format text

Formats string with `<br>` in place of new lines.

### format html xml

Parses string as html or xml.

### automatic behaviors related to booleans and attributes

When merging in a boolean attribute (i.e. with a node having a boolean property with same name), the final value is merged as if `|alt:` filter was applied.

```js
md.merge(`<p hidden="[test]">`, { test: true }) == '<p hidden>')
```

When merging a boolean into a DOMTokenList attribute, the DomPlugin appends `as:list`:

```js
md.merge(`<p class="one [test]">`, { test: true }) == '<p class="one test">')
```

If the source expression comes from another place (using a combination of `at` and `to`), it is added to the tokens.

### one:selector

If the current value is a dom node or fragment, runs querySelector(selector) on it.

### all:selector

If the current value is a dom node or fragment, runs querySelectorAll(selector) on it,
and return a fragment of the selected nodes.

## Hooks

- the return value, if not undefined, replaces current value.
- since an undefined return value does nothing, use `ctx.expr.cancel = true` to cancel merge.
- beforeAll and afterAll hooks are run before all filters are applied, and after all filters are applied. Multiple hooks can be appended from plugins.
- before and after hooks can be defined only once for each filter name. A hook gets current value and a modifiable array of parameters passed to the filter.

```js
const md = new Matchdom({
  beforeAll: (ctx, val) => {
    return val + 1;
  },
  before: {
    repeat: (ctx, val, args) => {
      return val.slice(2, 4);
    }
    get: (ctx, val, [path]) => {
      path[0] = "myroot";
    }
  },
  after: {
    get: (ctx, val, args) => {} // does nothing
  },
  afterAll: (ctx, val) => {} // does nothing
});
```

## Custom symbols

Default symbols are defined in `src/symbols.js`.

They can be overriden by passing a symbols object to the constructor.

## Acknowledgement

Skrol29 for its TinyButStrong PHP template engine.

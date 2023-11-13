# matchdom -- extensible declarative template expressions for the DOM

DSL for merging data.

A matchdom expression describes a chain of "filter" functions:
`[func1:param1|func2:param2]`.

Filter functions transform root value until the expression can be merged.

`md.merge(node, data)` mutates `node`.

If `node` is a string that starts with '<' and ends with '>',
it is converted to a DOM fragment (or single node) if `document` is available.

If `node` cannot be parsed as a string or a DOM node, it is treated as if it was already merged.

## example

```js
import { Matchdom, TextPlugin, NumPlugin, DomPlugin } from 'matchdom';

const md = new Matchdom(TextPlugin, NumPlugin, DomPlugin);
// or new Matchdom(TextPlugin, NumPlugin).extend(DomPlugin)

// html string is converted to a DOM node, thanks to DomPlugin
const mergedDom = md.merge(`<div id="model" class="[myclass]">
 <h[n]>Header</h[n]>
 <span>[data.text|as:html] for [data.percent|percent:1]</span>
 <img src="[data.icon|fail:*]">
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

A plugin is an object with those properties:

```js
{
  filters: {},
  types: {},
  formats: {},
  hooks: {}
}
```

A matchdom instance can be used as a plugin:

```js
const md = new Matchdom(TextPlugin, OpsPlugin);
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
body is automatically coerced in a DOM node or kept as a string.

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

- undefined, none: converts null-ish to undefined, leave other values intact
- null: converts false-ish to null, leave other values intact
- integer, int: try to parseInt, return 0 if NaN
- string, str: toString
- boolean, bool: "true", "1" and true-ish to true, "false", "0", and false-ish to false
- float, num, numeric: try to parseFloat, return 0 if NaN
- object: not any of the other simple types

### complex types (from plugins)

- filter: an array, first parameter must be a filter name
- path: converts parameter to a path array
- date: try new Date(val), return null if not a date, accepts 'now'
- array: wrap non-array-like values into an array
- json: parse json string

## formats

Formats are functions names to convert a value into something else.

They are grouped by filters names, in `formats[name]` objects.

Formats are used directly by the corresponding filter.

### as:format added by plugins

- text: converts string with newlines by a dom fragment with hard breaks
- html: converts string to a dom fragment
- xml: converts string to an xml fragment
- url: converts string to an URL instance
- keys: array of keys
- values: array of values
- entries: arrays of {key, value}

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

And various methods to extend to an ancestor, restrict to a node or attribute, write strings to the place, or read the current strings in place.

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

When a component of a path ends with a `?` (Symbols.opt), if it is `undefined`, it becomes `null`, changing the previous behavior.

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

#### rebase value

Used without parameters, `get:` stores current value into `expr.rebase`.

The second time it returns `expr.rebase`:

`[obj||.mykey|case:upper||.another|case:lower]`

Rebasing only happens before last filter; thus, if it was used once, the rebased value is returned at the end of the expression.

This is useful to be able to mutate inner data using multiple filters.

### set:mutation*

Mutates current value with one or several mutations.

A mutation starts with a path, optionally prefixed by `-` or `+`:

- prefixed by `+` it appends next parameter to the selected path
- prefixed by `-` it deletes the selected path from its parent object
- without prefix it sets the selected path to the value in next parameter

Paths are relatives to current value.

This filter supports Object, Set, Map, Array, URLSearchParams instances.

```js
assert.deepEqual(
  md.merge(`[obj|set:name:doe:-year:+id:abc]`, { id: 'f1d3', year: 1700 }),
  { name: 'doe', id: ['f1d3', 'abc'] }
);
```

### pick:key*

Mutates current value to remove all keys that are not listed.
Supports instances with keys() / delete(key) methods.
To remove specific keys from an object, use `set:-name`.

### assign:destination:source?

Assigns value at source path (defaults to current value) to value at destination path.

Paths are relative to current value.

Supports assigning an object to a URLSearchParams instance.

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
  mind that `[obj|as:null|.key]` won't merge if obj is undefined - use `[obj?.key]` instead.
- as:date, as:number
  return value as date, or number, or null if it cannot be converted
- as:html
  return value as a DOM node or null if it fails

### lang:name

Sets lang name in current context.
Used by localized filters.

## flow plugin (always loaded)

### not:filter:param*

Call filter with negated value.

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

Second parameter can be omitted

## TextPlugin

### pre:str, post:str

Prepends or appends string if value is not null or not empty.

### case:low|up|caps

Uppercase, lowercase, or unicode-capitalize sentences.

### dec, enc:base64|base64url|url|hex

Decodes/encodes to specified encoding.

### split:tok

Calls `str.split(tok)`. Return empty array if value is false-ish.

### slice:start:end

Calls `str.slice(start, end)`.

Also works with array.

### parts:tok:start:end

Shorthand for "str|split:tok|slice:start:end|join:tok".

### trim:all|line|start|end|out

Trimming:

- all: whitespaces are removed inside too
- line: only empty lines are removed
- start: trim at start
- end: trim at end
- out: trim both sides (the default)

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

### select:path

Shorthand for `map:get:${path}`.

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

### switch

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

### if filter

- if:filter:param*

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

### date type

Converts string or timestamp to date.

Accepts keyword 'now' to build a date with current timestamp.

### date:format, date:...list

format can be:

- isotime: time from iso output
- isodate: date from iso output
- iso: full iso output
- time: localized time
- date: localized date
- weekday: day of the week between 1 (monday) and 7 (sunday)
- days: number of days since Jan 1
- weeks: iso week number

Milliseconds are removed from all these formats.

Custom date formats can be added through a plugin exporting `{format: date: {}}`.

For localization, lang is searched in this order:

- ctx.lang (which can be set using the `lang:<name>` filter)
- documentElement.lang
- window.navigator.language

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
- full: localized full date, alias for day:D:month:Y:H:m

### clock:offset:unit

Offset a unit of date by an integer value.

`[mydate|clock:3:m]` add 3 minutes to `mydate`.

Units are: Y, M, D, h, m, s.

## JsonPlugin

### json type

Converts string to json object

### format or filter ? json

Converts data to json string

## UrlPlugin

### url type

Converts string to an instance of a subclass of an URL.

By default, such an instance will be serialized as absolute path when it has the same origin as the default location, thus omitting `protocol://hostname:port` part.

The default location is document.location if it exists, or `null://`.

It also exposes the `query` property, which is a URLSearchParams canonically converted to an object where entries with same key are grouped into arrays.
Setting the `query` property to a string actually sets the `search` property, and if given an object (by another filter), it casts it to a query type then sets searchParams.

### query type

Canonically converts an object into URLSearchParams, where array values become appended several times.

## DomPlugin

### text format

Formats string with `<br>` in place of new lines.

### html, xml formats

Parses string as html or xml.

### Special behaviors for merging in attributes

- if it has a DOMTokenList interface like `class`, and if source expression is different from destination, tokens are added. Otherwise the whole attribute is set.
- if the attribute is "boolean", it is set to empty when value is true, and removed when value is false.
- if the value is boolean `true`, merged in a DOMTokenList, the last key
of the expression path is used as the value. If it is `false`, it is replaced by null - this behavior is implemented using an `afterEach` hook.

### filter one:selector

If the current value is a dom node or fragment, runs querySelector(selector) on it.

### filter all:selector

If the current value is a dom node or fragment, runs querySelectorAll(selector) on it,
and return a fragment of the selected nodes.

## RepeatPlugin

Most features of this plugin depend on DomPlugin.

Merging text documents without parsing xml or html is supported and

### filter at:selector:after:before

By default an expression is replaced by its value,
without affecting surrounding text, tag name, attribute, or node.
This filter extends the selected range.

The selector changes the current parent:

- ``: the expression itself
- `-`: the parent node content, or the attribute
- `*`: the nth selected parent (one wildcard goes up one parent)
- a css selector: the closest selected parent

Second, by extending to previous or next siblings of the selected parent, using `before` and `after` parameters:

- integer: counts the number of siblings to select (before or after). Empty text nodes are ignored.
- selector: select siblings until they stop matching that selector.

Note that `after` comes first, since it's the most commonly used parameter, `at:*:br` is prettier than `at:*::br`.

Using at, fail, prune, then, else, to filters, one can control how a value affects selection.

Examples:

- `at::2:1` selects 2 nodes before and one node after the expression
- `<br>a[val|at::1]b` selects the `<br>`, `a` and `b` strings
- it is not possible to not select `a` or `b` in previous example
- `at::b:a` is not defined when destination is an attribute, avoid using it
- `at:div.card` selects `closest('div.card')`.
- `at:div.card:1:1` selects also the previous and next siblings of the ancestor.
- `at:**:1:2|to:class` selects one sibling before and two siblings after parent node, and sets the class on them.
- `at:*::.column` selects parent node and all next siblings until they stop matching `.column`.

### filter fail:range:before:after

Synonym of `else:at:...`

A very common use case for merging, or removing a range if value is falsey.

### filter prune:range:before:after

Like "at", without actually writing the value,
this is a shorthand for `at:${range}|const:`.

Useful to test a value and remove selected range if false-ish.

Note that `val|prune:` is the same as `val` only if `val` is empty, and differs if `val` is equal to boolean false.

To remove selected range but actually merge the value if true-ish,
use instead `fail:*`.

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
- `val|then:to:class|then:at:p|fail:p` fills the class attribute of closest `p` if val is not false-ish, else remove `p` entirely. Another way of writing it is: `val|at:p|then:to:class|else:const:`.

### filter repeat:path?:placer?:(...)

Expect the value to be iterable (array, collection, etc...).

Repeats selected range for each item in the value.

The selected range must be set using `at` filter; if not, the selected range will default to `at:*`.

The first component of the path is an alias for the repeated item.
The remaining path is used to access the item before merging it.
These expressions are equivalent:

- `[items|at:div|repeat:|.id] has some [text]`
- `[items|at:div|repeat:my|.id] has some [my.text]`
- `[items|as:entries|at:div|repeat:item.value|.id] has some [item.text]`

The placer parameter may be a custom filter name:

- it is called *after* the iterated range has been merged, before it is inserted
- it has (ctx, item, cursor, fragment, ...params) signature
- cursor: node before which the fragment would have been merged
- fragment: result of the merge, to be placed or not
- additional parameters are appended

The placer filter may choose to:

- insert fragment before cursor (the default behavior)
- insert it somewhere else
- do nothing in which case the fragment is not inserted

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

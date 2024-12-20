# CHANGES

## Version 17.6.0

- Revert 'at' filter ignores following filters if it gets a nullish value
  because it breaks at|to, whereas to|at is not possible.
- Document the fact that to must be used at least after at

## Version 17.5.0

- 'at' filter ignores following filters if it gets a nullish value
- `to:target` is extended with parameter `:range`.
- Ranges in `at` filter support extended syntax.
- `place` no longer exports undocumented `checkSibling`.
- `assign` now returns undefined if some path returns undefined
- deprecate canonical filters and print a warning

## Version 17.4.0

- Move to node:test module.
- as:flag returns emoji from country code

## Version 17.3.0

- range selector to select topmost parent element
- range can select all after/before siblings

Fix documention of range for prune, fail.

## Version 17.2.0

- enc/dev filters: add path format. Improve hex format.

## Version 17.1.0

- as:null, as:none now call the value toString() method, if any, before comparison.
  In particular, `as:query|as:null` returns null for query.

## Version 17.0.0

- document behavior for DOMTokensList and boolean attributes, and booleans
- drop the DomPlugin format `batt` because `alt:` does the same.
- add the core format `list` to cover the attributes list case.
- path:path allows one to merge ctx.expr.path array

## Version 16.5.0

- as:batt for merging value as boolean attribute.
  Needed when the actual attribute is not known to be a boolean attribute.

## Version 16.4.2

- Detect known boolean attributes that have a different camelCased property

## Version 16.4.1

- Move `at`, `fail`, `prune`, `to` to in core.
- Refactor attributes merging. Fix some edge cases.

## Version 16.3.0

- json: assignment on parent using `at:*` or parent replacement using `at:**` when merging an object (as key or as value, both works).

## Version 16.2.0

- two new filters for pattern matching: test and match
- fix: allow dom fragments to be merged into a DOM attribute (as text content)

## Version 16.1.0

- pick: accepts a list of paths, assigns last key
- get: removes optional symbols in path argument - after.get hook must rely on ctx.expr.optional anyway.

### Version 16.0.0

- json plugin: fix repeat of key:value
- pick: copy keys to a new object - no mutation (BREAKING)
- only: old pick behavior with mutation

### Version 15.5.0

- flat:depth filter added to array plugin
- fix how an empty parameter is transformed to null or to a default value (without changing the API). Allows `num?Infinity` to work.
- remove optional `path?` in all filters: if null, a path is an empty array anyway.

### Version 15.4.0

- ctx.expr.optional is set by `get` filter whenever it has an optional chaining expression.

### Version 15.3.0

- json object model: add support for closest, allowing ranges to be defined by key name.

### Version 15.2.0

- as:clone
  returns a non-recursive shallow clone of the value.

- omit no longer accepts paths. Use `set` for that.

### Version 15.1.0

Breaks untested query type:

- as:query now stringifies with a ? prefix when not empty.
  it also parses the string.

### Version 15.0.0

Breaking changes:

- merge() template can no longer be an array.
- as:json stringifies, as:obj parses
- the old TextPlugin is renamed the StringPlugin.
- the DomPlugin is required to merge DOM Nodes (and parse xhtml strings)
  and it supersedes the TextPlugin.
- the TextPlugin is required to merge plain text files when the DomPlugin is not loaded
- the JsonPlugin is required to merge plain objects and parse json from string.

New: JSON handling is done with an object model: in particular, `repeat` is supported.

### Version 14.3.0

Filter `select` now accepts multiple pairs of [dest, src] paths.

It still considers a single path to get data from current value.

### Version 14.2.0

Filter assign now accepts multiple pairs of [dest, src] paths.

It still considers a single path to get data from current value.

### Version 14.1.0

Shallow copy hooks parameters to prevent possibility for hooks to mutate them.

### Version 14.0.0

set:-key has now the same semantics as set:+key,
it is used to remove a value from a list.

To delete a value at a given path, use the new `omit:path*` filter.

### Version 13.2.1

is:null, is:none did not actually test if value was null or undefined.

### Version 13.2.0

as:array did not convert to array.

### Version 13.1.0

Add `instance.copy()` method.

### Version 13.0.0

Breaking changes: Hooks

- beforeAll, afterAll no longer get a third parameter (ctx.expr.filters is the same)
- before/after hooks is a map by filterName, hence only one hook by filter can be registered. The signature changed to (ctx, val, [param1, ...]). These hooks are not skipped by internal calls.
- return values can be undefined, that means the current value is not modified
- to cancel a merge use ctx.expr.cancel instead.

### Version 12.1.0

Fix assign filter.

### Version 12.0.0

Lots of breaking changes in that version.
Trying to fix how filters and types play together.

- empty get: rebases to current value
- repeat, at, to, fail, prune are in their own RepeatPlugin
- if:filter:params* returns value if filter returns true, else returns null
- comparison operators now only return boolean values
  Use them with if: filter to recover previous behavior (e.g. if:eq:str)
- find:val is a shorthand for find::eq:val
- has: filter now returns the value, not the parameter.
  It is available in ArrayPlugin. Previous behavior can be obtained using `[arr|find:str]`
- optional arguments, when null, are no longer cast to their type, null is passed
- num, int types default to 0 when not a number.
  It exchanges previous behavior with null values: 'as:int' gives 0, 'as:int?' gives null.
- pick: supports .keys() / .delete() methods
- UrlPlugin:
  - url type converts to url
  - query type converts plain object to URLSearchParams
  - url has a shorter `.query` accessor that returns searchParams
  - no longer tries to merge source and destination
  - support for assigning an object to a query is added to assign/set filters.

### Version 11.8.0

- switch filter: let empty param match null value

### Version 11.7.0

- boolean attributes: only honor specific behavior when value is boolean
  this allows one to not lose expressions in those attributes.

### Version 11.6.0

- object type is added to core types
- pick filter is added to core filters

### Version 11.5.0

- is: filter wasn't correctly checking input value type
- support non-mergeable input instead of failing

### Version 11.4.0

- find: filter like filter: but stops to find one item in the array.

### Version 11.3.0

- assign:path filter makes current value available under specified path without changing the original ctx.data.

### Version 11.2.0

- fix has: and in: filters, there were somewhat broken - add tests for them
- new date:full option

### Version 11.1.0

- drop useless alias filter
- quot:num filter for getting a quotient
- repeat:path was treating path as a string. It now uses the first component of the path to get an alias, and the remaining path to get the aliased value from the repeated item.

### Version 11.0.0

- core: set:mutation* filter
- xml, html formats are provided by DomPlugin
- DomPlugin: `queryAll` is renamed to `all`, `query` is renamed to `one`
- UrlPlugin: url type, url and query filters
- date: add weekday, days, weeks (non-trivial) formats

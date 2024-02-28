# CHANGES

## Version 7

No longer compatible with legacy browsers. Use polyfills for that.

matchdom 7 completely breaks previous matchdom templates:

- filters without parameters *must* end with `:`
- all filters are applied where they stand in the chain of transformations of values,
in particular, the __repeat__ filter, which no longer second-guesses the list to iterate upon.
- paths are using a unique filter syntax which is only another way of writing `get:<path>` filter,
and that filter can be used anywhere in the expression (not necessarily at the beginning).
- repeat:target:alias is not at:target|repeat:alias
- use new prune/else:at filters to conditionally remove selection

## Version 8

Non-essential plugins must be loaded explicitly,
allowing tree-shaking to drop some unnecessary code.

```js
import { Matchdom, DomPlugin } from 'matchdom';
new Matchdom().extend(DomPlugin)
```

All range selection by char by char has been dropped.

Ranges are now written as three parameters: ancestor, before, after.
Before and after can be integers as before, and now also css selectors.

`to:attr` can affect all nodes of a range.

`query`, `queryAll` are typed - string is converted to DOM.

It is still possible to run matchdom without a browser environment, as long as no html needs to be parsed.

## Version 9

- `at` filter parameters order is changed to `ancestor:after:before`
- plugins formats are grouped by filter name using those formats
- date filter uses formats.date
- date filter pass null value through to the next plugin

## Version 9.2

- context.scope is no longer a shallow copy
- context.scope is no longer mutated by matchdom filters - that's up to the owner of the scope to change it entirely
- context.lang stores current value

## Version 9.3

- DomPlugin new hook: when merging a boolean value in a DOMTokenList attribute, its path name is used

## Version 9.4

- Ternary '?' operator

## Version 9.5

- easier array indexes: negative values, first/last keywords

## Version 9.6

- nth filter accepts negative values for step, which iterates in reverse order

## Version 9.7

- filter type is normalized to `['get', path]` before passed as argument
- drop old code about scope (use a beforeEach hook to do that)
- add `fail` filter shorthand
- add `split`, `join`, `slice` filters
- replace ternary '?' by 'alt'
- allow one or two parameters for 'alt'
- paths can use optional chaining to force undefined to be evaluated as null
- add trim filter

## Version 9.8

- afterAll receives value before it is 'converted to null if last and undefined'.
- expr.get does change expr.last only if called by get filter

### Version 9.9

- Fix expr.path to match the actual accessed list of keys
- Add TextPlugin `parts:tok:start:end` filter.
- expr.get(data, path, root) is not public api, remove it from README

### Version 9.10.0

- afterAll hook can `ctx.cancel = true`

### Version 10.0.0

- breaking change: an expression is not merged if one of its filters requires a value and the value it receives is undefined.
- move ctx.cancel to ctx.expr.cancel where it belongs (multiples expressions could be present in context hits)
- canceled expression restores context, in particular, modifications made to src and dest by `to` and `at` filters are discarded.

### Version 10.1.0

- consider the whole unconditional path accessor to determine if a path is fully resolved, and thus improve how undefined is converted to null
- convert path shorthand to/from `get` filter in expressions
- update tests

### Version 10.2.0

- allow multiple hooks

### Version 10.3.0

- neq filter fix: returns the parameter and not the value

### Version 10.4.0

- restrict allowed characters for filter names, and also for parameters.
Parameters can still be escaped using percent-encoding.

### Version 10.5.0

- Change order of parameters for filter:op:arg:path (small break...)
- Casting an invalid Date to Boolean makes it false

### Version 10.6.0

- new array filter: group:path:filter:params* to group items by value
- revert change in 10.5.0, use filter:path:filter:params* to match same order.
- fix map:filter:params

### Version 11.0.0

- core: set:mutation* filter
- xml, html formats are provided by DomPlugin
- DomPlugin: `queryAll` is renamed to `all`, `query` is renamed to `one`
- UrlPlugin: url type, url and query filters
- date: add weekday, days, weeks (non-trivial) formats

### Version 11.1.0

- drop useless alias filter
- quot:num filter for getting a quotient
- repeat:path was treating path as a string. It now uses the first component of the path to get an alias, and the remaining path to get the aliased value from the repeated item.

### Version 11.2.0

- fix has: and in: filters, there were somewhat broken - add tests for them
- new date:full option

### Version 11.3.0

- assign:path filter makes current value available under specified path without changing the original ctx.data.

### Version 11.4.0

- find: filter like filter: but stops to find one item in the array.

### Version 11.5.0

- is: filter wasn't correctly checking input value type
- support non-mergeable input instead of failing

### Version 11.6.0

- object type is added to core types
- pick filter is added to core filters

### Version 11.7.0

- boolean attributes: only honor specific behavior when value is boolean
  this allows one to not lose expressions in those attributes.

### Version 11.8.0

- switch filter: let empty param match null value

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

### Version 12.1.0

Fix assign filter.

### Version 13.0.0

Breaking changes: Hooks

- beforeAll, afterAll no longer get a third parameter (ctx.expr.filters is the same)
- before/after hooks is a map by filterName, hence only one hook by filter can be registered. The signature changed to (ctx, val, [param1, ...]). These hooks are not skipped by internal calls.
- return values can be undefined, that means the current value is not modified
- to cancel a merge use ctx.expr.cancel instead.

### Version 13.1.0

Add `instance.copy()` method.

### Version 13.2.0

as:array did not convert to array.

### Version 13.2.1

is:null, is:none did not actually test if value was null or undefined.

### Version 14.0.0

set:-key has now the same semantics as set:+key,
it is used to remove a value from a list.

To delete a value at a given path, use the new `omit:path*` filter.

### Version 14.1.0

Shallow copy hooks parameters to prevent possibility for hooks to mutate them.

### Version 14.2.0

Filter assign now accepts multiple pairs of [dest, src] paths.

It still considers a single path to get data from current value.

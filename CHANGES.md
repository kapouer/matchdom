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

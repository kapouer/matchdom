# matchdom 7 changes

No longer compatible with legacy browsers. Use polyfills for that.

matchdom 7 completely breaks previous matchdom templates:

- filters without parameters *must* end with `:`
- all filters are applied where they stand in the chain of transformations of values,
in particular, the __repeat__ filter, which no longer second-guesses the list to iterate upon.
- paths are using a unique filter syntax which is only another way of writing `get:<path>` filter,
and that filter can be used anywhere in the expression (not necessarily at the beginning).
- repeat:target:alias is not at:target|repeat:alias
- use new prune/else:at filters to conditionally remove selection

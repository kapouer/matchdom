# matchdom 7 changes

No longer compatible with legacy browsers. Use polyfills for that.

matchdom 7 completely breaks previous matchdom templates:

- filters without parameters *must* end with `:`
- all filters are applied where they stand in the chain of transformations of values,
in particular, the __repeat__ filter.
- paths are using a unique filter syntax, however they behave like any other filter,
and can be used in several places in an expression
- the repeat filter no longer repeats the expression itself - the smallest range it repeats is the whole text node the expression is into. To repeat an expression, use array and string filters.


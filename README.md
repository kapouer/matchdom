# matchdom -- tiny DOM data merger for HTML editors

Write expressions in attributes or text nodes and have them merged with the
help of filters for complex or custom cases.

Features:
- DOM only. No serialization or parsing required.
- Super customizable with filters.
- Comes with useful filters: attr, magnet, repeat, join and more.
- Source code is short, simple, and does not require compilation.
- Nested expressions (since 1.6.0).
- Can run without DOM when merging pure strings (since 2.1.0).

## Examples

Run some code on [here](https://runkit.com/kapouer/5acbe92f4299c500122960d1)

## usage

`matchdom(node, data, filters?, scope?) -> node`

`matchdom(string, data, filters?, scope?) -> string`

Given a DOM and placeholders like this:

```html
<div id="model" class="[myclass]">
	<span>[data.text]</span>
</div>
```

matchdom can be used like this to merge data:
```js
matchdom(model, {
	myclass: "yes",
	data: {
		text: "test"
	}
}); // returns model
```

resulting in:

```html
<div id="model" class="yes">
	<span>test</span>
</div>
```

The Node given to matchdom is mutated. Sometimes it is desirable to keep the
model unmodified:

```
var copy = matchdom(model.cloneNode(true), ...);
```


## filters

Full control over how fields are replaced is possible using *filters*:

```html
<div id="model">
	<span>Remove span if empty [text|magnet]</span>
</div>
```

```js
matchdom(model, {some: "data"}, {
	magnet: function(value, what) {
		if (value == null) what.parent.remove();
	}
});
```

The filter always receives the two first arguments where `what` is an object
with the following properties:
- data: the initial data object
- scope: an object representing currently resolved state:
  + data: the current data object, takes precedence for finding values
  + path: the current path used to find the data from the initial data,  
    a filter should find this to be always true:  
    `what.get(what.data, what.scope.path) == val`  
    *This is a breaking change introduced in matchdom 3.0.0.*
  + keys: boolean, set when "keys" filter was applied
  + alias: `scope.data[scope.alias]` is the currently iterated data.
- node: text node when expression was inside one
- attr: attribute name when expression was inside an attribute value
- parent: node containing text node or attribute
- expr: the parsed expression
- filters: the object with custom filters
- hits: the list of strings or expressions that will be concatenated
- index: the current index of expression upon which the filter is called
- val: last known non null value

and the following methods (which are useful to write filters that are
independent of their position inside a text node or an attribute):
- set(str): updates node or attr value
- get(): returns node or attr value

All these properties are *mutable* and changing them have an effect on what's
being merged.

In particular, changing `what.attr` will remove the original attribute and
set a new attribute with that name.

`what` itself is shared by filters of the same field, allowing filters to set
flags picked up by other filters (like the `mode` flag set by `html`, `text`,
and `br` filters).

Filters can receive more string parameters by appending `:param` (once or
multiple times) to the filter name, like this:

```html
<table>
	<tr>
		<td>[text|magnet:tr]</td>
	</tr>
</table>
```

Multiple filters can be appended: `[text|prefix:me|postfix:him]`.

A filter can itself change what.expr.filters, typically the `repeat` filter,
being recursive, empties following filters.

Several default filters are provided, see below.


## expressions

A parsed expression has properties:
- path (array of strings)
- filters (array of {name, fn, params} objects where params is an array)

and two methods:
- clone()
- toString()
- get(data) returns the data accessed by expr.path

Expressions can be modified by filters. See the repeat filter for the most
complex code doing that.

Expressions can be nested:

```
<span>[val|or:[otherval]]</span>
```
(see examples in tests).


## bundled filters

Examples can be found in tests.

### html, br, text

By default all strings are set into text nodes with newlines replaced by  `<br>`.

The `text` filter removes that behavior (newlines won't be replaced).

The `html` filter inserts html code as is.

The `br` filter sets default behavior again.

html filter also works well with join filter.

### fill

Sets current node content to merged field.

If it's used in an attribute, also removes the attribute containing the expression.

Can be used with attr filter to set a value to an attribute and content at the
same time.


### or:str

If value is null or undefined, merge the field with str.

Can be useful also if undefined values are expected since they could be left
unmerged (thus showing template expressions).


### eq:str:to

If value is equal to `str`, replace it with `to`.


### not

If value is falsey, replace it with `null`.


### attr:name:selector

The name parameter is optional for data-* attributes.

The selector parameter is optional and selects an ancestor only when defined
in a text node.

Sometimes the template for an attribute is better kept in another attribute,
so there is a filter just for that:

```html
<div id="model">
	<img data-src="[url|attr]" />
	<img something="[url|attr:src]" />
	<a>test[url|attr:href]</a>
	<div class="test"><p>test[myclass|attr:class:div]</p></div>
</div>
```

gives:
```html
<div id="model">
	<img src="/my.png" />
	<img src="/my.png" />
	<a href="/my.png">test</a>
	<div class="test my"><p>test</p></div>
</div>
```

It's possible to set an attribute with an expression in a text node.

When targeting a class attribute, values are added using `classList.add`.


### url:name

The name parameter is optional as for attr:name (which is called by this filter).

This filter builds a url attribute from a template and merges it into a target
attribute.

- replace target pathname by url pathname
- merge target query with url query

### magnet:selector

Removes the closest node when current value is null or undefined.

The selector attribute is optional, in which case the parent node is removed.


### repeat:selector:alias

Repeats closest repeatable data over closest selected node, with optional alias
parameter.

Multiple repeat filters can be appended, so it is really easy to merge recursively
rows and cells to form a table, see unit tests for examples:
```html
<table><tr>
<td>[rows.cells.value|repeat:tr:cell|repeat]-[cell.unit]</td>
</tr></table>
```

To repeat over the keys of an object as a list of `{key, val}` items,
append `+` to its path name:

```html
<table><tr>
<td>[obj+.key|repeat:tr:pair]</td><td>[pair.val]</td>
</tr></table>
```
This used to be the `keys` filter in matchdom 2, and it is a breaking change
in matchdom 3.

In this case `what.scope.path` is the path to the *value*, however when
it is actually a key being merged, `what.scope.iskey` is set to `true`.

Caveat: won't work if there is actually a property `obj+`, in that case
a warning will be emitted.

Note that if root node is repeated, matchdom returns a fragment.


### padStart, padEnd :len:char

Converts to string and calls `String.prototype.padXxx(len, char)`.


### trim, trimStart, trimEnd, lower, upper, capitalize

Converts to string and calls them.


### date:method:param

Converts to date and calls `Date.prototype[method](param)`.

If no method is given, or method is not found, calls `toLocaleString`.


### join:pre:tag:post

Joins an array with optional tag and characters before/after tag.

Often useful with `[list|join::br]`.


### slice:begin:end

Slices an array with optional end index. Works well with join filter.


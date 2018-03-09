# matchdom -- tiny DOM data merger

Write expressions in attributes or text nodes and have them merged with the
help of filters for complex or custom cases.

Features:
- DOM only. No serialization or parsing required.
- Super customizable with filters.
- Comes with useful filters: attr, magnet, repeat, join and more.
- Source code is short, simple, and does not require compilation.

## usage

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
matchdom(model, {}, {
	magnet: function(value, what) {
		if (value == null) what.parent.remove();
	}
});
```

The filter always receives the two first arguments where `what` is an object
with the following properties:
- data: the initial data object
- node: text node when expression was inside one
- attr: attribute name when expression was inside an attribute value
- parent: node containing text node or attribute
- expr: the parsed expression
- filters: the object with custom filters

and the following methods (which are useful to write filters that are
independent of their position inside a text node or an attribute):
- set(str): updates node or attr value
- get(): returns node or attr value

All these properties are *mutable* and changing them have an effect on what's
being merged.

In particular, changing `what.attr` will remove the original attribute and
set a new attribute with that name.

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


## bundled filters

Examples can be found in tests.

### attr:name

The name parameter is optional for data-* attributes.

Sometimes the template for an attribute is better kept in another attribute,
so there is a filter just for that:

```html
<div id="model">
	<img data-src="[url|attr]" />
	<img something="[url|attr:src]" />
</div>
```

gives:
```html
<div id="model">
	<img src="/my.png" />
	<img src="/my.png" />
</div>
```

### url:name

The name parameter is optional as for attr:name (which is called by this filter).

Merges pathname, query of url to the value of the target attribute.


### magnet:selector

Removes the closest node when current value is null or undefined.

The selector attribute is optional, in which case the parent node is removed.


### repeat:selector

Repeats closest repeatable data over closest selected node.

Multiple repeat filters can be appended, so it is really easy to merge recursively
rows and cells to form a table, see unit tests for examples:
```html
<table><tr>
<td>[rows.cells.val|repeat:tr|repeat]</td>
</tr></table>
```


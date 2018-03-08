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
		if (value == null) what.node.parentNode.remove();
	}
});
```

The filter always receives the two first arguments where `what` is an object
with the following properties:
- data: the initial data object
- node: the current node
- expr: the parsed expression
- attr: the name of the attribute being changed (or nothing if it's a text node)
- filters: the object with custom filters

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

Several default filters are provided, see below.


## expressions

A parsed expression has properties:
- path (array of strings)
- filters (array of {name, fn, params} objects where params is an array)

and two methods:
- removeFilter(name)
- toString()

Expressions can be modified by filters !


## filters

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

### magnet:selector

Removes the closest node when current value is null or undefined.

The selector attribute is optional, in which case the parent node is removed.


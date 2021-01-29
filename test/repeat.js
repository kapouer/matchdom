import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters, scope) => {
	return (new Matchdom({ filters })).merge(node, data, scope);
};


describe('repeating', function () {
	it('should repeat array of strings in string', function () {
		let node = dom(`<div>[arr|repeat:]</div>`);
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom(`<div>onetwo</div>`).outerHTML);
	});
	it('should repeat array-in-object over node', function () {
		let node = dom(`<div>
			<span>[arr|repeat:*]</span>
		</div>`);
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});

	it('should repeat direct array over node', function () {
		let node = dom(`<div>
			<span>[repeat:*|test]</span>
		</div>`);
		let copy = matchdom(node, [{ test: 'one' }, { test: 'two' }]);
		assert.equal(copy.outerHTML, dom(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});

	it('should repeat array over closest node', function () {
		let node = dom(`<table><tbody>
			<th><td>Hello</td></tr><tr><td>[arr|repeat:tr|]</td></tr>
		</tbody></table>`);
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom(`<table><tbody>
			<th><td>Hello</td></tr><tr><td>one</td></tr><tr><td>two</td></tr>
		</tbody></table>`).outerHTML);
	});

	it('should repeat array over parent of attribute', function () {
		let node = dom(`<div>
			<img data-src="[arr|repeat:|to:src]" />
		</div>`);
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<img src="one" /><img src="two" />
		</div>`).outerHTML);
	});

	it('should repeat array', function () {
		let node = dom(`<div>
			<span>[arr|repeat:*|value]</span>
		</div>`);
		let copy = matchdom(node, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});

	it('should repeat array in reverse order', function () {
		let node = dom(`<div>
			<span>[arr|reverse:|repeat:*|value]</span>
		</div>`);
		let copy = matchdom(node, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>two</span><span>one</span>
		</div>`).outerHTML);
	});

	it('should repeat array every odd item', function () {
		let node = dom(`<div>
			<span>[arr|nth:2:1|repeat:*|]</span>
		</div>`);
		let copy = matchdom(node, {
			arr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>1</span><span>3</span><span>5</span><span>7</span><span>9</span>
		</div>`).outerHTML);
	});

	it('should repeat array the second and third even items in reverse order', function () {
		let node = dom(`<div>
			<span>[arr|reverse:|nth:2:1|slice:0:2|repeat:*|]</span>
		</div>`);
		let copy = matchdom(node, {
			arr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>8</span><span>6</span>
		</div>`).outerHTML);
	});

	it('should repeat array and return fragment', function () {
		let node = dom(`<span>[arr|repeat:*|value]</span>`);
		let copy = matchdom(node, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		var parent = dom(`<div></div>`);
		parent.appendChild(copy);
		assert.equal(parent.innerHTML, '<span>one</span><span>two</span>');
	});

	it('should repeat array accessing data after scope', function () {
		let node = dom(`<div><div class="[data.test]"><span>[$arr|repeat:div|data.value]</span></div></div>`);
		let copy = matchdom(node, {
			$arr: [
				{ data: { value: 'one', test: 1 } },
				{ data: { value: 'two', test: 2 } }
			]
		});
		assert.equal(copy.innerHTML, '<div class="1"><span>one</span></div><div class="2"><span>two</span></div>');
	});

	it('should repeat array over previous child and next child', function () {
		let node = dom(`<div><i>*</i><span>[arr|repeat:+span+|value]</span><br></div>`);
		let copy = matchdom(node, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.innerHTML, '<i>*</i><span>one</span><br><i>*</i><span>two</span><br>');
	});

	it('should repeat array over previous child and next child with wildcard selector', function () {
		let node = dom(`<div><i>*</i><span>[arr|repeat:+*+|value]</span><br></div>`);
		let copy = matchdom(node, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.innerHTML, '<i>*</i><span>one</span><br><i>*</i><span>two</span><br>');
	});

	it('should repeat array over previous child and next child with wildcard selector on a text node', function () {
		let node = dom(`<div><i>A</i>[arr|repeat:+-+|value]<br></div>`);
		let copy = matchdom(node, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.innerHTML, '<i>A</i>one<br><i>A</i>two<br>');
	});

	it('should repeat array over previous child and next child and not fail', function () {
		let node = dom(`<div><i>*</i><span>[arr|repeat:+span++|value]</span><br></div>`);
		let copy = matchdom(node, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.innerHTML, '<i>*</i><span>one</span><br><i>*</i><span>two</span><br>');
	});

	it('should repeat array when filter is not the first one', function () {
		let node = dom(`<div>
			<span>[key] [arr|repeat:*|value]</span>
		</div>`);
		let copy = matchdom(node, {
			arr: [{ key: 1, value: 'one' }, { key: 2, value: 'two' }]
		});
		assert.equal(copy.outerHTML, dom(`<div>
			<span>1 one</span><span>2 two</span>
		</div>`).outerHTML);
	});

	it('should repeat array when filter is not the first one and data is array', function () {
		let node = dom(`<div>
			<span>[key] [repeat:span|value]</span>
		</div>`);
		let copy = matchdom(node, [
			{ key: 1, value: 'one' },
			{ key: 2, value: 'two' }
		]);
		assert.equal(copy.outerHTML, dom(`<div>
			<span>1 one</span><span>2 two</span>
		</div>`).outerHTML);
	});

	it('should repeat array when filter is not the first one and data is array and first one is in attribute', function () {
		let node = dom(`<div>
			<span data-class="[it.style|to:class]">[it.key] [repeat:*:it|it.value]</span>
		</div>`);
		let copy = matchdom(node, [
			{ key: 1, value: 'one', style: 'a' },
			{ key: 2, value: 'two', style: 'b' }
		]);
		assert.equal(copy.outerHTML, dom(`<div>
			<span class="a">1 one</span><span class="b">2 two</span>
		</div>`).outerHTML);
	});

	it('should repeat array recursively', function () {
		let node = dom(`<table>
			<tr>
				<td>[rows|repeat:tr|cells|repeat:td|val]</td>
			</tr>
		</table>`);
		let copy = matchdom(node, {
			rows: [
				{ cells: [{ val: 'A1' }, { val: 'A2' }] },
				{ cells: [{ val: 'B1' }, { val: 'B2' }] }
			]
		});
		assert.equal(copy.outerHTML, dom(`<table>
			<tr>
				<td>A1</td><td>A2</td>
			</tr><tr>
				<td>B1</td><td>B2</td>
			</tr>
		</table>`).outerHTML);
	});

	it('should repeat array recursively with direct value', function () {
		let node = dom(`<table>
			<tr>
				<td>[rows|repeat:tr|cells|repeat:td|]</td>
			</tr>
		</table>`);
		let copy = matchdom(node, {
			rows: [
				{ cells: ['A1', 'A2'] },
				{ cells: ['B1', 'B2'] }
			]
		});
		assert.equal(copy.outerHTML, dom(`<table>
			<tr>
				<td>A1</td><td>A2</td>
			</tr><tr>
				<td>B1</td><td>B2</td>
			</tr>
		</table>`).outerHTML);
	});

	it('should repeat aliased array items', function () {
		let node = dom(`<table>
			<tr>
				<td>[cells|repeat:td:cell|cell.txt] [cell.txt]</td>
			</tr>
		</table>`);
		let copy = matchdom(node, {
			cells: [
				{ txt: 'a' },
				{ txt: 'b' }
			]
		});
		assert.equal(copy.outerHTML, dom(`<table>
			<tr>
				<td>a a</td><td>b b</td>
			</tr>
		</table>`).outerHTML);
	});

	it('should repeat array recursively, with data outside scope', function () {
		let node = dom(`<table>
			<tr>
				<td>[rows|repeat:tr|cells|repeat:td|val|scope:][some.data|scope:]</td>
			</tr>
		</table>`);
		let copy = matchdom(node, {
			rows: [
				{ cells: [{ val: 'A1' }, { val: 'A2' }] },
				{ cells: [{ val: 'B1' }, { val: 'B2' }] }
			],
			some: {
				data: "x"
			}
		}, {
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		});
		assert.equal(copy.outerHTML, dom(`<table>
			<tr>
				<td>A1x</td><td>A2x</td>
			</tr><tr>
				<td>B1x</td><td>B2x</td>
			</tr>
		</table>`).outerHTML);
	});

	it('should repeat array recursively, with data outside node and outside scope', function () {
		let node = dom(`<div><span>[data.title]</span><table>
			<tr class="repeat">
				<td><h1>[data.title|scope:]</h1></td>
				<td><h2>[row.data.obj.title|scope:]</h2></td>
				<td><span>[data.text|scope:]</span></td>
				<td><p><span><strong><span>[rows|repeat:.repeat:row|row.data.obj.text|scope:]</span></strong></span></p></td>
				<td>[data.extra|scope:]</td>
			</tr>
		</table></div>`);
		let copy = matchdom(node, {
			rows: [
				{ data: { obj: { title: 'title1', text: 'text1' } } },
				{ data: { obj: { title: 'title2', text: 'text2' } } }
			],
			data: {
				extra: "extra",
				title: "title",
				text: "text",
			}
		}, {
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		});
		assert.equal(copy.outerHTML, dom(`<div><span>title</span><table>
			<tr class="repeat">
				<td><h1>title</h1></td>
				<td><h2>title1</h2></td>
				<td><span>text</span></td>
				<td><p><span><strong><span>text1</span></strong></span></p></td>
				<td>extra</td>
			</tr><tr class="repeat">
				<td><h1>title</h1></td>
				<td><h2>title2</h2></td>
				<td><span>text</span></td>
				<td><p><span><strong><span>text2</span></strong></span></p></td>
				<td>extra</td>
			</tr>
		</table></div>`).outerHTML);
	});

	it('should keep initial context when repeating array', function () {
		let node = dom(`<div><span>[data.title]</span><table>
			<tr class="repeat">
				<td><h1>[data.title]</h1></td>
				<td><h2>[row.data.obj.title]</h2></td>
				<td><span>[data.text]</span></td>
				<td><p><span><strong><span>[rows|repeat:.repeat:row|row.data.obj.text|test:]</span></strong></span></p></td>
				<td>[data.extra]</td>
			</tr>
		</table></div>`);

		let copy = matchdom(node, {
			rows: [
				{ data: { obj: { title: 'title1', text: 'text1' } } },
				{ data: { obj: { title: 'title2', text: 'text2' } } }
			],
			data: {
				extra: "extra",
				title: "title",
				text: "text",
			}
		}, {
			test: function (ctx, val) {
				// var curPath = ctx.expr.path.slice();
				// if (what.scope.alias) {
				// 	assert.equal(what.scope.alias, curPath.shift());
				// }
				//assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		});
		assert.equal(copy.outerHTML, dom(`<div><span>title</span><table>
			<tr class="repeat">
				<td><h1>title</h1></td>
				<td><h2>title1</h2></td>
				<td><span>text</span></td>
				<td><p><span><strong><span>text1</span></strong></span></p></td>
				<td>extra</td>
			</tr><tr class="repeat">
				<td><h1>title</h1></td>
				<td><h2>title2</h2></td>
				<td><span>text</span></td>
				<td><p><span><strong><span>text2</span></strong></span></p></td>
				<td>extra</td>
			</tr>
		</table></div>`).outerHTML);
	});

	it('should repeat array of keys', function () {
		let node = dom(`<div>
			<span>[obj.properties|as:entries|repeat:*:item|item.key|scope:]: [item.value|scope:]</span>
		</div>`);
		let copy = matchdom(node, {
			obj: {
				properties: {
					a: 'one',
					b: 'two'
				}
			}
		}, {
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		});
		assert.equal(copy.innerHTML, dom(`<div>
			<span>a: one</span><span>b: two</span>
		</div>`).innerHTML);
	});

	it('should repeat object then repeat keys', function () {
		let node = dom(`<div>
			<span>[list|repeat:*|props|as:entries|repeat:*|key|scope:]: [value|scope:]</span>
		</div>`);
		let copy = matchdom(node, {
			list: [{
				props: {
					a: 'one',
					b: 'two'
				}
			}, {
				props: {
					c: 'three',
					d: 'four'
				}
			}]
		}, {
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		});
		assert.equal(copy.innerHTML, dom(`<div>
			<span>a: one</span><span>b: two</span><span>c: three</span><span>d: four</span>
		</div>`).innerHTML);
	});

	it('should repeat array of keys and access nested value', function () {
		let node = dom(`<div>
			<span>[obj.properties|as:entries|repeat:*:item|item.key|scope:]: [item.value.nested|scope:]</span>
		</div>`);
		let copy = matchdom(node, {
			obj: {
				properties: {
					a: { nested: 'one' },
					b: { nested: 'two' }
				}
			}
		}, {
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		});
		assert.equal(copy.innerHTML, dom(`<div>
			<span>a: one</span><span>b: two</span>
		</div>`).innerHTML);
	});
});


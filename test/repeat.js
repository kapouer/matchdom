import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, ArrayPlugin, DomPlugin } from 'matchdom';

describe('repeat filter', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom().extend(DomPlugin);

	it('should repeat array of strings in string', () => {
		const html = `<div>a[arr|at:|repeat:]</div>`;
		const copy = md.merge(html, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, `<div>aonetwo</div>`);
	});
	it('should repeat array-in-object over node', () => {
		const html = `<div>
			<span>[arr|repeat:]</span>
		</div>`;
		const copy = md.merge(html, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});

	it('should repeat direct array over node', () => {
		const html = `<div>
			<span>[repeat:|test]</span>
		</div>`;
		const copy = md.merge(html, [{ test: 'one' }, { test: 'two' }]);
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});

	it('should repeat array over closest node', () => {
		const html = `<table><tbody>
			<th><td>Hello</td></tr><tr><td>[arr|at:tr|repeat:]</td></tr>
		</tbody></table>`;
		const copy = md.merge(html, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, md.merge(`<table><tbody>
			<th><td>Hello</td></tr><tr><td>one</td></tr><tr><td>two</td></tr>
		</tbody></table>`).outerHTML);
	});

	it('should repeat array over parent of attribute', () => {
		const html = `<div>
			<img data-src="[arr|repeat:|to:src]" />
		</div>`;
		const copy = md.merge(html, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<img src="one" /><img src="two" />
		</div>`).outerHTML);
	});

	it('should repeat array', () => {
		const html = `<div>
			<span>[arr|repeat:|value]</span>
		</div>`;
		const copy = md.merge(html, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>one</span><span>two</span>
		</div>`).outerHTML);
	});

	it('should merge and insert template content using a custom filter', () => {
		const html = `<div>
			<template data-mode="[template:insert]"><h1>[arr|at:*:1|repeat:item|.title]</h1><p>[item.text]</p></template>
		</div>`;
		const copy = md.extend({filters: {
			template(ctx, data, mode) {
				const node = ctx.dest.node;
				const frag = ctx.md.merge(node.content.cloneNode(true), data);
				node.parentNode.insertBefore(frag, node);
			}
		}}).merge(html, {
			arr: [{ title: 't1', text: 'one' }, { title: 't2', text: 'two' }]
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<h1>t1</h1><p>one</p><h1>t2</h1><p>two</p><template data-mode="[template:insert]"><h1>[arr|at:*:1|repeat:item|.title]</h1><p>[item.text]</p></template>
		</div>`).outerHTML);
	});

	it('should merge and insert template content using custom filter and placer', () => {
		const html = `<div>
			<template data-mode="[template:insert]"><h1>[arr|at:*:1|repeat:item:placer|.title]</h1><p>[item.text]</p></template>
		</div>`;
		const copy = md.extend({filters: {
			template(ctx, data, mode) {
				const node = ctx.dest.node;
				const frag = ctx.md.merge(node.content.cloneNode(true), data, { template: node });
				node.parentNode.insertBefore(frag, node);
			},
			placer(ctx, item, cursor, fragment) {
				const { template } = ctx.scope;
				template.parentNode.insertBefore(fragment, template.parentNode.firstElementChild);
			}
		}}).merge(html, {
			arr: [{ title: 't1', text: 'one' }, { title: 't2', text: 'two' }]
		}, );
		assert.equal(copy.outerHTML, md.merge(`<div>
			<h1>t2</h1><p>two</p><h1>t1</h1><p>one</p><template data-mode="[template:insert]"><h1>[arr|at:*:1|repeat:item:placer|.title]</h1><p>[item.text]</p></template>
		</div>`).outerHTML);
	});

	it('should repeat array in reverse order', () => {
		const html = `<div>
			<span>[arr|reverse:|repeat:|value]</span>
		</div>`;
		const copy = md.merge(html, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>two</span><span>one</span>
		</div>`).outerHTML);
	});

	it('should repeat array in reverse order using nth:-1', () => {
		const html = `<div>
			<span>[arr|nth:-1|repeat:]</span>
		</div>`;
		const copy = md.extend(ArrayPlugin).merge(html, {
			arr: [0, 1, 2]
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>2</span><span>1</span><span>0</span>
		</div>`).outerHTML);
	});

	it('should not repeat empty array', () => {
		const html = `<div><span>[arr|repeat:|value]</span></div>`;
		const copy = md.merge(html, {
			arr: []
		});
		assert.equal(copy.outerHTML, `<div></div>`);
	});

	it('should not merge undefined array', () => {
		const html = `<div><span>[test.arr|repeat:|value]</span></div>`;
		const copy = md.merge(html, {});
		assert.equal(copy.outerHTML, `<div><span>[test.arr|repeat:|value]</span></div>`);
	});

	it('should repeat array every odd item', () => {
		const html = `<div>
			<span>[arr|nth:2:1|repeat:]</span>
		</div>`;
		const copy = md.extend(ArrayPlugin).merge(html, {
			arr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>1</span><span>3</span><span>5</span><span>7</span><span>9</span>
		</div>`).outerHTML);
	});

	it('should repeat array the second and third even items in reverse order', () => {
		const html = `<div>
			<span>[arr|reverse:|nth:2:1|slice:0:2|repeat:]</span>
		</div>`;
		const copy = md.extend(ArrayPlugin).merge(html, {
			arr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>8</span><span>6</span>
		</div>`).outerHTML);
	});

	it('should repeat array and return fragment', () => {
		const html = `<span>[arr|repeat:|value]</span>`;
		const copy = md.merge(html, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		const parent = md.merge(`<div></div>`);
		parent.appendChild(copy);
		assert.equal(parent.innerHTML, '<span>one</span><span>two</span>');
	});

	it('should repeat array accessing data after scope', () => {
		const html = `<div><div class="[data.test]"><span>[$arr|at:div|repeat:|data.value]</span></div></div>`;
		const copy = md.merge(html, {
			$arr: [
				{ data: { value: 'one', test: 1 } },
				{ data: { value: 'two', test: 2 } }
			]
		});
		assert.equal(copy.innerHTML, '<div class="1"><span>one</span></div><div class="2"><span>two</span></div>');
	});

	it('should repeat array over previous child and next child', () => {
		const html = `<div><i>*</i><span>[arr|at:span:1:1|repeat:|value]</span><br></div>`;
		const copy = md.merge(html, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.innerHTML, '<i>*</i><span>one</span><br><i>*</i><span>two</span><br>');
	});

	it('should repeat array over previous child and next child with wildcard selector', () => {
		const html = `<div><i>*</i><span>[arr|at:*:1:1|repeat:|value]</span><br></div>`;
		const copy = md.merge(html, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.innerHTML, '<i>*</i><span>one</span><br><i>*</i><span>two</span><br>');
	});

	it('should repeat array over previous child and next child with wildcard selector on a text node', () => {
		const html = `<div><i>A</i>[arr|at:-:1:1|repeat:|value]<br></div>`;
		const copy = md.merge(html, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.innerHTML, '<i>A</i>one<br><i>A</i>two<br>');
	});

	it('should repeat array over previous child and next child and not fail', () => {
		const html = `<div><i>*</i><span>[arr|at:span:1:2|repeat:|value]</span><br></div>`;
		const copy = md.merge(html, {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy.innerHTML, '<i>*</i><span>one</span><br><i>*</i><span>two</span><br>');
	});

	it('should repeat array when filter is not the first one', () => {
		const html = `<div>
			<span>[key] [arr|repeat:|value]</span>
		</div>`;
		const copy = md.merge(html, {
			arr: [{ key: 1, value: 'one' }, { key: 2, value: 'two' }]
		});
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>1 one</span><span>2 two</span>
		</div>`).outerHTML);
	});

	it('should repeat array when filter is not the first one and data is array', () => {
		const html = `<div>
			<span>[key] [at:span|repeat:|value]</span>
		</div>`;
		const copy = md.merge(html, [
			{ key: 1, value: 'one' },
			{ key: 2, value: 'two' }
		]);
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span>1 one</span><span>2 two</span>
		</div>`).outerHTML);
	});

	it('should repeat array when filter is not the first one and data is array and first one is in attribute', () => {
		const html = `<div>
			<span data-class="[it.style|to:class]">[it.key] [repeat:it|.value]</span>
		</div>`;
		const copy = md.merge(html, [
			{ key: 1, value: 'one', style: 'a' },
			{ key: 2, value: 'two', style: 'b' }
		]);
		assert.equal(copy.outerHTML, md.merge(`<div>
			<span class="a">1 one</span><span class="b">2 two</span>
		</div>`).outerHTML);
	});

	it('should repeat array recursively', () => {
		const html = `<table>
			<tr>
				<td>[rows|at:tr|repeat:|cells|at:td|repeat:|val]</td>
			</tr>
		</table>`;
		const copy = md.merge(html, {
			rows: [
				{ cells: [{ val: 'A1' }, { val: 'A2' }] },
				{ cells: [{ val: 'B1' }, { val: 'B2' }] }
			]
		});
		assert.equal(copy.outerHTML, md.merge(`<table>
			<tr>
				<td>A1</td><td>A2</td>
			</tr><tr>
				<td>B1</td><td>B2</td>
			</tr>
		</table>`).outerHTML);
	});

	it('should repeat array recursively with direct value', () => {
		const html = `<table>
			<tr>
				<td>[rows|at:tr|repeat:|cells|at:td|repeat:]</td>
			</tr>
		</table>`;
		const copy = md.merge(html, {
			rows: [
				{ cells: ['A1', 'A2'] },
				{ cells: ['B1', 'B2'] }
			]
		});
		assert.equal(copy.outerHTML, md.merge(`<table>
			<tr>
				<td>A1</td><td>A2</td>
			</tr><tr>
				<td>B1</td><td>B2</td>
			</tr>
		</table>`).outerHTML);
	});

	it('should repeat and call custom filter for placement', () => {
		const html = `<ul>
			<li>[list|at:li|repeat:item:custom:myparam|.txt]</li>
		</ul>`;
		const copy = md.extend({
			custom(ctx, item, cursor, frag, param) {
				assert.equal(param, "myparam");
				cursor.before(frag);
			}
		}).merge(html, {
			list: [
				{ txt: 'a' },
				{ txt: 'b' }
			]
		});
		assert.equal(copy.outerHTML, md.merge(`<ul>
			<li>a</li><li>b</li>
		</ul>`).outerHTML);
	});

	it('should repeat aliased array items', () => {
		const html = `<table>
			<tr>
				<td>[cells|at:td|repeat:cell|.txt] [cell.txt]</td>
			</tr>
		</table>`;
		const copy = md.merge(html, {
			cells: [
				{ txt: 'a' },
				{ txt: 'b' }
			]
		});
		assert.equal(copy.outerHTML, md.merge(`<table>
			<tr>
				<td>a a</td><td>b b</td>
			</tr>
		</table>`).outerHTML);
	});

	it('should repeat array recursively, with data outside scope', () => {
		const html = `<table>
			<tr>
				<td>[rows|at:tr|repeat:|cells|at:td|repeat:|val|scope:][some.data|scope:]</td>
			</tr>
		</table>`;
		const copy = md.extend({
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		}).merge(html, {
			rows: [
				{ cells: [{ val: 'A1' }, { val: 'A2' }] },
				{ cells: [{ val: 'B1' }, { val: 'B2' }] }
			],
			some: {
				data: "x"
			}
		});
		assert.equal(copy.outerHTML, md.merge(`<table>
			<tr>
				<td>A1x</td><td>A2x</td>
			</tr><tr>
				<td>B1x</td><td>B2x</td>
			</tr>
		</table>`).outerHTML);
	});

	it('should repeat array recursively, with data outside node and outside scope', () => {
		const html = `<div><span>[data.title]</span><table>
			<tr class="repeat">
				<td><h1>[data.title|scope:]</h1></td>
				<td><h2>[row.data.obj.title|scope:]</h2></td>
				<td><span>[data.text|scope:]</span></td>
				<td><p><span><strong><span>[rows|at:.repeat|repeat:row|.data.obj.text|scope:]</span></strong></span></p></td>
				<td>[data.extra|scope:]</td>
			</tr>
		</table></div>`;
		const copy = md.extend({
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		}).merge(html, {
			rows: [
				{ data: { obj: { title: 'title1', text: 'text1' } } },
				{ data: { obj: { title: 'title2', text: 'text2' } } }
			],
			data: {
				extra: "extra",
				title: "title",
				text: "text",
			}
		});
		assert.equal(copy.outerHTML, md.merge(`<div><span>title</span><table>
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

	it('should keep initial context when repeating array', () => {
		const html = `<div><span>[data.title]</span><table>
			<tr class="repeat">
				<td><h1>[data.title]</h1></td>
				<td><h2>[row.data.obj.title]</h2></td>
				<td><span>[data.text]</span></td>
				<td><p><span><strong><span>[rows|at:.repeat|repeat:row|.data.obj.text|test:]</span></strong></span></p></td>
				<td>[data.extra]</td>
			</tr>
		</table></div>`;

		const copy = md.extend({
			test: function (ctx, val) {
				// var curPath = ctx.expr.path.slice();
				// if (what.scope.alias) {
				// 	assert.equal(what.scope.alias, curPath.shift());
				// }
				//assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		}).merge(html, {
			rows: [
				{ data: { obj: { title: 'title1', text: 'text1' } } },
				{ data: { obj: { title: 'title2', text: 'text2' } } }
			],
			data: {
				extra: "extra",
				title: "title",
				text: "text",
			}
		});
		assert.equal(copy.outerHTML, md.merge(`<div><span>title</span><table>
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

	it('should repeat array of keys', () => {
		const html = `<div>
			<span>[obj.properties|as:entries|repeat:item|item.key|scope:]: [item.value|scope:]</span>
		</div>`;
		const copy = md.extend(ArrayPlugin, {
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		}).merge(html, {
			obj: {
				properties: {
					a: 'one',
					b: 'two'
				}
			}
		});
		assert.equal(copy.innerHTML, md.merge(`<div>
			<span>a: one</span><span>b: two</span>
		</div>`).innerHTML);
	});

	it('should repeat object then repeat keys', () => {
		const html = `<div>
			<span>[list|repeat:|props|as:entries|repeat:|key|scope:]: [value|scope:]</span>
		</div>`;
		const copy = md.extend(ArrayPlugin).extend({
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		}).merge(html, {
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
		});
		assert.equal(copy.innerHTML, md.merge(`<div>
			<span>a: one</span><span>b: two</span><span>c: three</span><span>d: four</span>
		</div>`).innerHTML);
	});

	it('should repeat array of keys and access nested value', () => {
		const html = `<div>
			<span>[obj.properties|as:entries|repeat:item|.key|scope:]: [item.value.nested|scope:]</span>
		</div>`;
		const copy = md.extend(ArrayPlugin).extend({
			scope: function (ctx, val) {
				assert.equal(val, ctx.expr.get(ctx.data, ctx.expr.path));
				return val;
			}
		}).merge(html, {
			obj: {
				properties: {
					a: { nested: 'one' },
					b: { nested: 'two' }
				}
			}
		});
		assert.equal(copy.innerHTML, md.merge(`<div>
			<span>a: one</span><span>b: two</span>
		</div>`).innerHTML);
	});
});


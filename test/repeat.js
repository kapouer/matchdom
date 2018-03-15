const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('dom-template-strings');
require('dom4'); // jsdom is missing .closest


describe('repeating', function() {
	it('should repeat array-in-object over node', function() {
		let node = dom`<div>
			<span>[arr|repeat]</span>
		</div>`;
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom`<div>
			<span>one</span><span>two</span>
		</div>`.outerHTML);
	});

	it('should repeat direct array over node', function() {
		let node = dom`<div>
			<span>[test|repeat]</span>
		</div>`;
		let copy = matchdom(node, [{test: 'one'}, {test: 'two'}]);
		assert.equal(copy.outerHTML, dom`<div>
			<span>one</span><span>two</span>
		</div>`.outerHTML);
	});

	it('should repeat array over closest node', function() {
		let node = dom`<table><tbody>
			<th><td>Hello</td></tr><tr><td>[arr|repeat:tr]</td></tr>
		</tbody></table>`;
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom`<table><tbody>
			<th><td>Hello</td></tr><tr><td>one</td></tr><tr><td>two</td></tr>
		</tbody></table>`.outerHTML);
	});

	it('should repeat array over parent of attribute', function() {
		let node = dom`<div>
			<img data-src="[arr|repeat|attr]" />
		</div>`;
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.outerHTML, dom`<div>
			<img src="one" /><img src="two" />
		</div>`.outerHTML);
	});

	it('should repeat array over parent of attribute with url', function() {
		let node = dom`<div><div>
			<img data-src="[arr|url|repeat:div]" />
		</div></div>`;
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.innerHTML, dom`<div><div>
			<img src="one" />
		</div><div>
			<img src="two" />
		</div></div>`.innerHTML);
	});

	it('should repeat array', function() {
		let node = dom`<div>
			<span>[arr.value|repeat]</span>
		</div>`;
		let copy = matchdom(node, {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(copy.outerHTML, dom`<div>
			<span>one</span><span>two</span>
		</div>`.outerHTML);
	});

	it('should repeat array and return fragment', function() {
		let node = dom`<span>[arr.value|repeat]</span>`;
		let copy = matchdom(node, {
			arr: [{value: 'one'}, {value: 'two'}]
		});
		assert.equal(dom`<div>${copy}</div>`.innerHTML, '<span>one</span><span>two</span>');
	});

	it('should repeat array when filter is not the first one', function() {
		let node = dom`<div>
			<span>[arr.key] [arr.value|repeat]</span>
		</div>`;
		let copy = matchdom(node, {
			arr: [{key: 1, value: 'one'}, {key: 2, value: 'two'}]
		});
		assert.equal(copy.outerHTML, dom`<div>
			<span>1 one</span><span>2 two</span>
		</div>`.outerHTML);
	});

	it('should repeat array when filter is not the first one and data is array', function() {
		let node = dom`<div>
			<span>[key] [value|repeat]</span>
		</div>`;
		let copy = matchdom(node, [
			{key: 1, value: 'one'},
			{key: 2, value: 'two'}
		]);
		assert.equal(copy.outerHTML, dom`<div>
			<span>1 one</span><span>2 two</span>
		</div>`.outerHTML);
	});

	it('should repeat array when filter is not the first one and data is array and first one is in attribute', function() {
		let node = dom`<div>
			<span data-class="[style|attr]">[key] [value|repeat]</span>
		</div>`;
		let copy = matchdom(node, [
			{key: 1, value: 'one', style: 'a'},
			{key: 2, value: 'two', style: 'b'}
		]);
		assert.equal(copy.outerHTML, dom`<div>
			<span class="a">1 one</span><span class="b">2 two</span>
		</div>`.outerHTML);
	});

	it('should repeat array recursively', function() {
		let node = dom`<table>
			<tr>
				<td>[rows.cells.val|repeat:tr|repeat]</td>
			</tr>
		</table>`;
		let copy = matchdom(node, {
			rows: [
				{cells: [{val:'A1'}, {val:'A2'}]},
				{cells: [{val:'B1'}, {val:'B2'}]}
			]
		});
		assert.equal(copy.outerHTML, dom`<table>
			<tr>
				<td>A1</td><td>A2</td>
			</tr><tr>
				<td>B1</td><td>B2</td>
			</tr>
		</table>`.outerHTML);
	});

	it('should repeat array recursively with direct value', function() {
		let node = dom`<table>
			<tr>
				<td>[rows.cells|repeat:tr|repeat]</td>
			</tr>
		</table>`;
		let copy = matchdom(node, {
			rows: [
				{cells: ['A1', 'A2']},
				{cells: ['B1', 'B2']}
			]
		});
		assert.equal(copy.outerHTML, dom`<table>
			<tr>
				<td>A1</td><td>A2</td>
			</tr><tr>
				<td>B1</td><td>B2</td>
			</tr>
		</table>`.outerHTML);
	});

	it('should repeat aliased array items', function() {
		let node = dom`<table>
			<tr>
				<td>[cells.txt|repeat:td:cell] [cell.txt]</td>
			</tr>
		</table>`;
		let copy = matchdom(node, {
			cells: [
				{txt: 'a'},
				{txt: 'b'}
			]
		});
		assert.equal(copy.outerHTML, dom`<table>
			<tr>
				<td>a a</td><td>b b</td>
			</tr>
		</table>`.outerHTML);
	});

	it('should repeat array recursively, with data outside scope', function() {
		let node = dom`<table>
			<tr>
				<td>[rows.cells.val|repeat:tr|repeat][some.data]</td>
			</tr>
		</table>`;
		let copy = matchdom(node, {
			rows: [
				{cells: [{val:'A1'}, {val:'A2'}]},
				{cells: [{val:'B1'}, {val:'B2'}]}
			],
			some: {
				data: "x"
			}
		});
		assert.equal(copy.outerHTML, dom`<table>
			<tr>
				<td>A1x</td><td>A2x</td>
			</tr><tr>
				<td>B1x</td><td>B2x</td>
			</tr>
		</table>`.outerHTML);
	});
});


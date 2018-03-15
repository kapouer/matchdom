const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('dom-template-strings');
require('dom4'); // jsdom is missing .closest

describe('integration', function() {
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

	it('should remove current attribute', function() {
		let node = dom`<div><a data-href="/test?[test|magnet|url]">test</a></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><a>test</a></div>');
	});

	it('should remove current node', function() {
		let node = dom`<div><a href="" data-href="[test|magnet:a|url]">test</a></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove currently repeated node if magnet kicks in', function() {
		let node = dom`<table>
			<tr><td>[rows.val|repeat:tr]</td><td>[rows.col|magnet:tr]</td></tr>
		</table>`;
		let copy = matchdom(node, {
			rows: [{
				val: 'one',
				col: '1'
			}, {
				val: 'two',
				col: '2'
			}, {
				val: 'three',
				col: null
			}]
		});
		assert.equal(copy.outerHTML, dom`<table>
			<tr><td>one</td><td>1</td></tr><tr><td>two</td><td>2</td></tr>
		</table>`.outerHTML);
	});
});


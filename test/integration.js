const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('domify');
require('dom4'); // jsdom is missing .closest

describe('integration', function() {
	it('should repeat array over parent of attribute with url', function() {
		let node = dom(`<div><div>
			<img data-src="[arr|url|repeat:div]" />
		</div></div>`);
		let copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.innerHTML, dom(`<div><div>
			<img src="one" />
		</div><div>
			<img src="two" />
		</div></div>`).innerHTML);
	});

	it('should remove current attribute', function() {
		let node = dom(`<div><a data-href="/test?[test|magnet|url]">test</a></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><a>test</a></div>');
	});

	it('should remove current attribute edge case', function() {
		let node = dom(`<div><link rel="icon" href="[$site.favicon|magnet:*|url]?format=ico"></div>`);
		let copy = matchdom(node, {
			$site: {}
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove current node', function() {
		let node = dom(`<div><a href="" data-href="[test|magnet:a|url]">test</a></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove currently repeated node if magnet kicks in', function() {
		let node = dom(`<table>
			<tr><td>[rows.val|repeat:tr]</td><td>[rows.val][rows.col|magnet:tr]</td></tr>
		</table>`);
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
		assert.equal(copy.outerHTML, dom(`<table>
			<tr><td>one</td><td>one1</td></tr><tr><td>two</td><td>two2</td></tr>
		</table>`).outerHTML);
	});

	it('should remove current text node and previous node', function() {
		let node = dom(`<div><br><span>test</span>[test|bmagnet:+*|]</div>`);
		let copy = matchdom(node, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div><br></div>');
	});

	it('fill filter should work with br mode by default', function() {
		let node = dom(`<div><span data-expr="[test|fill]">temp</span></div>`);
		let copy = matchdom(node, {
			test: "a\nb"
		});
		assert.equal(copy.outerHTML, '<div><span>a<br>b</span></div>');
	});

	it('attr and fill filters should work on same node', function() {
		let node = dom(`<div><a data-expr="[test|attr|fill]">temp</a></div>`);
		let copy = matchdom(node, {
			test: "toto"
		});
		assert.equal(copy.outerHTML, '<div><a expr="toto">toto</a></div>');
	});

	it('attr and fill filters should work on closest node', function() {
		let node = dom(`<div><a data-expr="[test|attr:class:div|fill]">temp</a></div>`);
		let copy = matchdom(node, {
			test: "toto"
		});
		assert.equal(copy.outerHTML, '<div class="toto"><a>toto</a></div>');
	});

	it('attr and fill filters should not work on same node from text node', function() {
		let node = dom(`<div><a href="/test">b[test|url:href|fill]a</a></div>`);
		let copy = matchdom(node, {
			test: "?toto=1"
		});
		assert.equal(copy.outerHTML, '<div><a href="?toto=1">?toto=1</a></div>');
	});

	it('nested fill filter', function() {
		let node = dom(`<p>a[sub.[name]|fill]b</p>`);
		let copy = matchdom(node, {
			sub: {
				key: 'word'
			},
			name: 'key'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});
});


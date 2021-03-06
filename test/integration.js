import assert from 'assert';

import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom()).extend({ filters }).merge(node, data);
};

describe('integration', function() {
	it('should repeat array over parent of attribute with url', function() {
		let node = dom(`<div><div>
			<img data-src="[arr|repeat:div|to:src]" />
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
		let node = dom(`<div><a data-href="/test?[test|at:|as:url]">test</a></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><a>test</a></div>');
	});

	it('should remove current attribute edge case', function() {
		let node = dom(`<div><link rel="icon" href="[$site.favicon|orAt:*|as:url]?format=ico"></div>`);
		let copy = matchdom(node, {
			$site: {}
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove current node', function() {
		let node = dom(`<div><a href="" data-href="[test|orAt:a|as:url]">test</a></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove currently repeated node if magnet kicks in', function() {
		let node = dom(`<table>
			<tr><td>[rows|repeat:tr|val]</td><td>[val][col|orAt:tr]</td></tr>
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
		let node = dom(`<div><br><span>test</span>[test|orAt:+*]</div>`);
		let copy = matchdom(node, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div><br></div>');
	});

	it('to: should work well with as:text', function() {
		let node = dom(`<div><span data-expr="[test|to:|as:text]">temp</span></div>`);
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

	it('should repeat parent node and fill current node and set an attribute on parent node using two separate expressions', function() {
		let node = dom(`<section><div class="ui toto grid"><div><p data-fill="[list.field|repeat:.ui.grid|fill]" data-attr="[list.field2|attr:data-test:.ui.grid]">astuffb</p></div></div></section>`);
		let copy = matchdom(node, {
			list: [
				{field: 'bluew', field2: 'blue'},
				{field: 'redw', field2: 'red'}
			]
		});
		assert.equal(copy.innerHTML, '<div class="ui toto grid" data-test="blue"><div><p>bluew</p></div></div><div class="ui toto grid" data-test="red"><div><p>redw</p></div></div>');
	});

	it('nested fill filter', function() {
		let node = dom(`<p>a[sub.[name]|to:]b</p>`);
		let copy = matchdom(node, {
			sub: {
				key: 'word'
			},
			name: 'key'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});
});


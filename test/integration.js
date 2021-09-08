import assert from 'assert';

import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom()).extend({ filters }).merge(node, data);
};

describe('integration', function() {
	it('should repeat array over parent of attribute with url', function() {
		const node = dom(`<div><div>
			<img data-src="[arr|repeat:div|to:src]" />
		</div></div>`);
		const copy = matchdom(node, {
			arr: ['one', 'two']
		});
		assert.equal(copy.innerHTML, dom(`<div><div>
			<img src="one" />
		</div><div>
			<img src="two" />
		</div></div>`).innerHTML);
	});

	it('should remove current attribute', function() {
		const node = dom(`<div><a data-href="/test?[test|at:|as:url]">test</a></div>`);
		const copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><a>test</a></div>');
	});

	it('should remove current attribute edge case', function() {
		const node = dom(`<div><link rel="icon" href="[$site.favicon|orAt:*|as:url]?format=ico"></div>`);
		const copy = matchdom(node, {
			$site: {}
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove current node', function() {
		const node = dom(`<div><a href="" data-href="[test|orAt:a|as:url]">test</a></div>`);
		const copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove currently repeated node if magnet kicks in', function() {
		const node = dom(`<table>
			<tr><td>[rows|repeat:tr|val]</td><td>[val][col|orAt:tr]</td></tr>
		</table>`);
		const copy = matchdom(node, {
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
		const node = dom(`<div><br><span>test</span>[test|orAt:+*]</div>`);
		const copy = matchdom(node, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div><br></div>');
	});

	it('to: should work well with as:text', function() {
		const node = dom(`<div><span data-expr="[test|to:|as:text]">temp</span></div>`);
		const copy = matchdom(node, {
			test: "a\nb"
		});
		assert.equal(copy.outerHTML, '<div><span>a<br>b</span></div>');
	});

	it('attr and fill filters should work on same node', function() {
		const node = dom(`<div><a data-expr="[test|attr|fill]">temp</a></div>`);
		const copy = matchdom(node, {
			test: "toto"
		});
		assert.equal(copy.outerHTML, '<div><a expr="toto">toto</a></div>');
	});

	it('attr and fill filters should work on closest node', function() {
		const node = dom(`<div><a data-expr="[test|attr:class:div|fill]">temp</a></div>`);
		const copy = matchdom(node, {
			test: "toto"
		});
		assert.equal(copy.outerHTML, '<div class="toto"><a>toto</a></div>');
	});

	it('attr and fill filters should not work on same node from text node', function() {
		const node = dom(`<div><a href="/test">b[test|url:href|fill]a</a></div>`);
		const copy = matchdom(node, {
			test: "?toto=1"
		});
		assert.equal(copy.outerHTML, '<div><a href="?toto=1">?toto=1</a></div>');
	});

	it('should repeat parent node and fill current node and set an attribute on parent node using two separate expressions', function() {
		const node = dom(`<section><div class="ui toto grid"><div><p data-fill="[list.field|repeat:.ui.grid|fill]" data-attr="[list.field2|attr:data-test:.ui.grid]">astuffb</p></div></div></section>`);
		const copy = matchdom(node, {
			list: [
				{field: 'bluew', field2: 'blue'},
				{field: 'redw', field2: 'red'}
			]
		});
		assert.equal(copy.innerHTML, '<div class="ui toto grid" data-test="blue"><div><p>bluew</p></div></div><div class="ui toto grid" data-test="red"><div><p>redw</p></div></div>');
	});

	it('nested fill filter', function() {
		const node = dom(`<p>a[sub.[name]|to:]b</p>`);
		const copy = matchdom(node, {
			sub: {
				key: 'word'
			},
			name: 'key'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});
});


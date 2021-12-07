import assert from 'assert';

import { Matchdom, DomPlugin, ArrayPlugin, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom()).extend(DomPlugin, ArrayPlugin, { filters }).merge(node, data);
};

describe('integration', () => {
	it('should repeat array over parent of attribute with url', () => {
		const node = dom(`<div><div>
			<img data-src="[arr|at:div|repeat:|to:src]" />
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

	it('should remove current attribute', () => {
		const node = dom(`<div><a data-href="/test?[test|at:-|as:url]">test</a></div>`);
		const copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><a>test</a></div>');
	});

	it('should remove current attribute edge case', () => {
		const node = dom(`<div><link rel="icon" href="[$site.favicon|at:-|as:url]?format=ico"></div>`);
		const copy = matchdom(node, {
			$site: {}
		});
		assert.equal(copy.outerHTML, '<div><link rel="icon"></div>');
	});

	it('should remove current node', () => {
		const node = dom(`<div><a href="" data-href="[test|prune:a|as:url]">test</a></div>`);
		const copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove currently repeated node if magnet kicks in', () => {
		const node = dom(`<table>
			<tr><td>[rows|at:tr|repeat:|val]</td><td>[val][col|else:prune:tr]</td></tr>
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

	it('should remove current node and previous node', () => {
		const node = dom(`<div><br><span>test</span><span>[test|prune:+*]</span></div>`);
		const copy = matchdom(node, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div><br></div>');
	});

	it('to: should work well with as:text', () => {
		const node = dom(`<div><span data-expr="[test|to:-|as:text]">temp</span></div>`);
		const copy = matchdom(node, {
			test: "a\nb"
		});
		assert.equal(copy.outerHTML, '<div><span>a<br>b</span></div>');
	});

	it('at and to should work on closest node', () => {
		const node = dom(`<div><a data-expr="[test|at:div|to:class]">temp</a></div>`);
		const copy = matchdom(node, {
			test: "toto"
		});
		assert.equal(copy.outerHTML, '<div class="toto"><a>temp</a></div>');
	});

	it('at and to should select parent attribute from text node', () => {
		const node = dom(`<div><a href="/test">b[test|to:href]anchor</a></div>`);
		const copy = matchdom(node, {
			test: "?toto=1"
		});
		assert.equal(copy.outerHTML, '<div><a href="?toto=1">banchor</a></div>');
	});

	it('should repeat parent node and fill current node and set an attribute on parent node using two separate expressions', () => {
		const node = dom(`<section><div class="ui toto grid"><div><p data-fill="[list|at:.ui.grid|repeat:|field|to:-]" data-attr="[field2|at:.ui.grid|to:data-test]">astuffb</p></div></div></section>`);
		const copy = matchdom(node, {
			list: [
				{field: 'bluew', field2: 'blue'},
				{field: 'redw', field2: 'red'}
			]
		});
		assert.equal(copy.innerHTML, '<div class="ui toto grid" data-test="blue"><div><p>bluew</p></div></div><div class="ui toto grid" data-test="red"><div><p>redw</p></div></div>');
	});

	it('nested merge and to:', () => {
		const node = dom(`<p>a[sub.[name]|to:-]b</p>`);
		const copy = matchdom(node, {
			sub: {
				key: 'word'
			},
			name: 'key'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});
});


import assert from 'assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin, ArrayPlugin } from 'matchdom';

before(function () {
	this.jsdom = globalJsdom();
});
after(function () {
	this.jsdom();
});

describe('integration', () => {
	const md = new Matchdom().extend(DomPlugin, ArrayPlugin);

	it('should repeat array over parent of attribute with url', () => {
		const html = `<div><div>
			<img data-src="[arr|at:div|repeat:|to:src]" />
		</div></div>`;
		const copy = md.merge(html, {
			arr: ['one', 'two']
		});
		assert.equal(copy.innerHTML, md.merge(`<div><div>
			<img src="one" />
		</div><div>
			<img src="two" />
		</div></div>`).innerHTML);
	});

	it('should remove current attribute', () => {
		const html = `<div><a data-href="/test?[test|at:-|as:url]">test</a></div>`;
		const copy = md.merge(html, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><a>test</a></div>');
	});

	it('should remove current attribute edge case', () => {
		const html = `<div><link rel="icon" href="[$site.favicon|at:-|as:url]?format=ico"></div>`;
		const copy = md.merge(html, {
			$site: {}
		});
		assert.equal(copy.outerHTML, '<div><link rel="icon"></div>');
	});

	it('should remove current node', () => {
		const html = `<div><a href="" data-href="[test|prune:a|as:url]">test</a></div>`;
		const copy = md.merge(html, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove currently repeated node if magnet kicks in', () => {
		const html = `<table>
			<tr><td>[rows|at:tr|repeat:|val]</td><td>[val][col|else:prune:tr]</td></tr>
		</table>`;
		const copy = md.merge(html, {
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
		assert.equal(copy.outerHTML, md.merge(`<table>
			<tr><td>one</td><td>one1</td></tr><tr><td>two</td><td>two2</td></tr>
		</table>`).outerHTML);
	});

	it('should remove current node and previous node', () => {
		const html = `<div><br><span>test</span><span>[test|prune:+*]</span></div>`;
		const copy = md.merge(html, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div><br></div>');
	});

	it('to: should work well with as:text', () => {
		const html = `<div><span data-expr="[test|to:-|as:text]">temp</span></div>`;
		const copy = md.merge(html, {
			test: "a\nb"
		});
		assert.equal(copy.outerHTML, '<div><span>a<br>b</span></div>');
	});

	it('at and to should work on closest node', () => {
		const html = `<div><a data-expr="[test|at:div|to:class]">temp</a></div>`;
		const copy = md.merge(html, {
			test: "toto"
		});
		assert.equal(copy.outerHTML, '<div class="toto"><a>temp</a></div>');
	});

	it('at and to should select parent attribute from text node', () => {
		const html = `<div><a href="/test">b[test|to:href]anchor</a></div>`;
		const copy = md.merge(html, {
			test: "?toto=1"
		});
		assert.equal(copy.outerHTML, '<div><a href="?toto=1">banchor</a></div>');
	});

	it('should repeat parent node and fill current node and set an attribute on parent node using two separate expressions', () => {
		const html = `<section><div class="ui toto grid"><div><p data-fill="[list|at:.ui.grid|repeat:|field|to:-]" data-attr="[field2|at:.ui.grid|to:data-test]">astuffb</p></div></div></section>`;
		const copy = md.merge(html, {
			list: [
				{field: 'bluew', field2: 'blue'},
				{field: 'redw', field2: 'red'}
			]
		});
		assert.equal(copy.innerHTML, '<div class="ui toto grid" data-test="blue"><div><p>bluew</p></div></div><div class="ui toto grid" data-test="red"><div><p>redw</p></div></div>');
	});

	it('nested merge and to:', () => {
		const html = `<p>a[sub.[name]|to:-]b</p>`;
		const copy = md.merge(html, {
			sub: {
				key: 'word'
			},
			name: 'key'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});
});


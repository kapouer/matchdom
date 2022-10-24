import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin } from 'matchdom';

describe('at filter', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});
	const md = new Matchdom().extend(DomPlugin);
	it('should replace current node', () => {
		const html = `<div><span>[test|at:*]</span></div>`;
		const copy = md.merge(html, {
			test: "mydiv",
			toto: 23
		});
		assert.equal(copy.outerHTML, '<div>mydiv</div>');
	});

	it('should remove current node and previous and next element siblings', () => {
		const html = `<div><br><br><span>[test|at:span:1:1]</span><hr><hr></div>`;
		const copy = md.merge(html, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove current node and previous and next element siblings with wildcard selector', () => {
		const html = `<div><br><br><span>[test|at:*:1:1]</span><hr><hr></div>`;
		const copy = md.merge(html, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should replace current expression and previous and next element siblings', () => {
		const html = `<div><br><br>[test|at::1:1]<hr><hr></div>`;
		const copy = md.merge(html, {
			test: 'me'
		});
		assert.equal(copy.outerHTML, '<div><br>me<hr></div>');
	});

	it('should replace current expression and previous and next characters', () => {
		const html = `<div>ABC[test|at::1:1]XYZ</div>`;
		const copy = md.merge(html, {
			test: 'me'
		});
		assert.equal(copy.outerHTML, '<div>ABmeYZ</div>');
	});

	it('should replace current expression and next 2 character', () => {
		const html = `<div>ABC[test|at::0:2]XYZ</div>`;
		const copy = md.merge(html, {
			test: 'me'
		});
		assert.equal(copy.outerHTML, '<div>ABCmeZ</div>');
	});

	it('should remove closest tr', () => {
		const html = `<table><tbody>
			<th><td>Hello</td></tr><tr><td>[test|at:tr]</td></tr>
		</tbody></table>`;
		const copy = md.merge(html, {
			test: null // nothing is fine too
		});
		assert.equal(copy.outerHTML, md.merge(`<table><tbody>
			<th><td>Hello</td></tr>
		</tbody></table>`).outerHTML);
	});

	it('should remove current attribute', () => {
		const html = `<div><span class="some [test|at:-] [tata]">[tata]</span></div>`;
		const copy = md.merge(html, {
			// test: null,
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should replace whole attribute', () => {
		const html = `<div><span class="some [test|at:-] [tata]">[tata]</span></div>`;
		const copy = md.merge(html, {
			test: "toto",
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span class="toto">test</span></div>');
	});

	it('should move attribute from one node to its parent', () => {
		const html = `<section><div><span class="[test|at:div|to:class]">test</span></div></section>`;
		const copy = md.merge(html, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section><div class="test"><span>test</span></div></section>');
	});


	it('should clobber other strings inside an attribute from one node to its parent', () => {
		const html = `<section><div><span class="some [test|at:div|to:class]">test</span></div></section>`;
		const copy = md.merge(html, {
			test: "test"
		});
		assert.equal(
			copy.outerHTML,
			'<section><div class="test"><span>test</span></div></section>'
		);
	});

	it('should move current node from attribute to parent node', () => {
		const html = `<section><div><span class="some [test|at:div]">test</span></div></section>`;
		const copy = md.merge(html, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section>test</section>');
	});

	it('should set attributes on all selected range', () => {
		const html = `<section><div>a</div><div><span class="[test|at:div:1:1|to:class]">test</span></div><div>b</div></section>`;
		const copy = md.merge(html, {
			test: "sel"
		});
		assert.equal(copy.outerHTML, '<section><div class="sel">a</div><div class="sel"><span>test</span></div><div class="sel">b</div></section>');
	});

	it('should remove current node from attribute', () => {
		const html = `<div><span class="some [test|at:div]">test</span></div>`;
		const copy = md.merge(html, {});
		assert.equal(copy.childNodes.length, 0);
	});

	it('should remove current node from attribute using wildcard selector', () => {
		const html = `<div><div><span class="[test|at:*]">test</span></div></div>`;
		const copy = md.merge(html, {
			test: null
		});
		assert.equal(copy.outerHTML, '<div><div></div></div>');
	});

});

import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin } from 'matchdom';

before(function () {
	this.jsdom = globalJsdom();
});
after(function () {
	this.jsdom();
});

describe('at filter', () => {
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
		const html = `<div><br><br><span>[test|at:+span+]</span><hr><hr></div>`;
		const copy = md.merge(html, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove current node and previous and next element siblings with wildcard selector', () => {
		const html = `<div><br><br><span>[test|at:+*+]</span><hr><hr></div>`;
		const copy = md.merge(html, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
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

describe('prune filter', () => {
	const md = new Matchdom().extend(DomPlugin);
	it('should remove current node', () => {
		const html = `<div><span>test [test|prune:*]</span></div>`;
		const copy = md.merge(html, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should not remove current node', () => {
		const html = `<div><span>test[test|prune:*]</span></div>`;
		const copy = md.merge(html, {
			test: true
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should remove current attribute', () => {
		const html = `<div><span class="some[test|prune:-]">test</span></div>`;
		const copy = md.merge(html, {
			test: 0
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should process following filters', () => {
		const html = `<div><span class="some[test|else:prune:-|prune:*]">test</span></div>`;
		const copy = md.merge(html, {
			test: 0
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove attr if prop is undefined', () => {
		const html = `<div><p class="[obj.val|prune:-]test">test</p></div>`;
		const copy = md.merge(html, { obj: {}});
		assert.equal(copy.outerHTML, '<div><p>test</p></div>');
	});

	it('should not change attr if prop is defined', () => {
		const html = `<div><p class="[obj.val|prune:-]test">test</p></div>`;
		const copy = md.merge(html, { obj: {val: 1}});
		assert.equal(copy.outerHTML, '<div><p class="test">test</p></div>');
	});

});


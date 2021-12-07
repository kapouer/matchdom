import assert from 'assert';
import { Matchdom, DomPlugin, HTML as dom } from 'matchdom';

describe('at filter', () => {
	const md = new Matchdom().extend(DomPlugin);
	it('should replace current node', () => {
		const node = dom(`<div><span>[test|at:*]</span></div>`);
		const copy = md.merge(node, {
			test: "mydiv",
			toto: 23
		});
		assert.equal(copy.outerHTML, '<div>mydiv</div>');
	});

	it('should remove current node and previous and next element siblings', () => {
		const node = dom(`<div><br><br><span>[test|at:+span+]</span><hr><hr></div>`);
		const copy = md.merge(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove current node and previous and next element siblings with wildcard selector', () => {
		const node = dom(`<div><br><br><span>[test|at:+*+]</span><hr><hr></div>`);
		const copy = md.merge(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove closest tr', () => {
		const node = dom(`<table><tbody>
			<th><td>Hello</td></tr><tr><td>[test|at:tr]</td></tr>
		</tbody></table>`);
		const copy = md.merge(node, {
			test: null // nothing is fine too
		});
		assert.equal(copy.outerHTML, dom(`<table><tbody>
			<th><td>Hello</td></tr>
		</tbody></table>`).outerHTML);
	});

	it('should remove current attribute', () => {
		const node = dom(`<div><span class="some [test|at:-] [tata]">[tata]</span></div>`);
		const copy = md.merge(node, {
			// test: null,
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should replace whole attribute', () => {
		const node = dom(`<div><span class="some [test|at:-] [tata]">[tata]</span></div>`);
		const copy = md.merge(node, {
			test: "toto",
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span class="toto">test</span></div>');
	});

	it('should move attribute from one node to its parent', () => {
		const node = dom(`<section><div><span class="[test|at:div|to:class]">test</span></div></section>`);
		const copy = md.merge(node, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section><div class="test"><span>test</span></div></section>');
	});


	it('should clobber other strings inside an attribute from one node to its parent', () => {
		const node = dom(`<section><div><span class="some [test|at:div|to:class]">test</span></div></section>`);
		const copy = md.merge(node, {
			test: "test"
		});
		assert.equal(
			copy.outerHTML,
			'<section><div class="test"><span>test</span></div></section>'
		);
	});

	it('should move current node from attribute to parent node', () => {
		const node = dom(`<section><div><span class="some [test|at:div]">test</span></div></section>`);
		const copy = md.merge(node, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section>test</section>');
	});

	it('should remove current node from attribute', () => {
		const node = dom(`<div><span class="some [test|at:div]">test</span></div>`);
		const copy = dom(`<div/>`);
		copy.appendChild(md.merge(node, {}));
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove current node from attribute using wildcard selector', () => {
		const node = dom(`<div><div><span class="[test|at:*]">test</span></div></div>`);
		const copy = md.merge(node, {
			test: null
		});
		assert.equal(copy.outerHTML, '<div><div></div></div>');
	});

});

describe('prune filter', () => {
	const md = new Matchdom().extend(DomPlugin);
	it('should remove current node', () => {
		const node = dom(`<div><span>test [test|prune:*]</span></div>`);
		const copy = md.merge(node, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should not remove current node', () => {
		const node = dom(`<div><span>test[test|prune:*]</span></div>`);
		const copy = md.merge(node, {
			test: true
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should remove current attribute', () => {
		const node = dom(`<div><span class="some[test|prune:-]">test</span></div>`);
		const copy = md.merge(node, {
			test: 0
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should process following filters', () => {
		const node = dom(`<div><span class="some[test|else:prune:-|prune:*]">test</span></div>`);
		const copy = md.merge(node, {
			test: 0
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove attr if prop is undefined', () => {
		const node = dom(`<div><p class="[obj.val|prune:-]test">test</p></div>`);
		const copy = md.merge(node, { obj: {}});
		assert.equal(copy.outerHTML, '<div><p>test</p></div>');
	});

	it('should not change attr if prop is defined', () => {
		const node = dom(`<div><p class="[obj.val|prune:-]test">test</p></div>`);
		const copy = md.merge(node, { obj: {val: 1}});
		assert.equal(copy.outerHTML, '<div><p class="test">test</p></div>');
	});

});


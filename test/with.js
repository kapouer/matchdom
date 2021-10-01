import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom()).extend({ filters }).merge(node, data);
};

describe('at filter', function() {
	it('should replace current node', function() {
		const node = dom(`<div><span>[test|at:*]</span></div>`);
		const copy = matchdom(node, {
			test: "mydiv",
			toto: 23
		});
		assert.equal(copy.outerHTML, '<div>mydiv</div>');
	});

	it('should remove current node and previous and next element siblings', function() {
		const node = dom(`<div><br><br><span>[test|at:+span+]</span><hr><hr></div>`);
		const copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove current node and previous and next element siblings with wildcard selector', function() {
		const node = dom(`<div><br><br><span>[test|at:+*+]</span><hr><hr></div>`);
		const copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove closest tr', function() {
		const node = dom(`<table><tbody>
			<th><td>Hello</td></tr><tr><td>[test|at:tr]</td></tr>
		</tbody></table>`);
		const copy = matchdom(node, {
			test: null // nothing is fine too
		});
		assert.equal(copy.outerHTML, dom(`<table><tbody>
			<th><td>Hello</td></tr>
		</tbody></table>`).outerHTML);
	});

	it('should remove current attribute', function() {
		const node = dom(`<div><span class="some [test|at:] [tata]">[tata]</span></div>`);
		const copy = matchdom(node, {
			// test: null,
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should replace whole attribute', function () {
		const node = dom(`<div><span class="some [test|at:] [tata]">[tata]</span></div>`);
		const copy = matchdom(node, {
			test: "toto",
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span class="toto">test</span></div>');
	});

	it('should move attribute from one node to its parent', function () {
		const node = dom(`<section><div><span class="[test|at:div|to:class]">test</span></div></section>`);
		const copy = matchdom(node, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section><div class="test"><span>test</span></div></section>');
	});


	it('should clobber other strings inside an attribute from one node to its parent', function () {
		const node = dom(`<section><div><span class="some [test|at:div|to:class]">test</span></div></section>`);
		const copy = matchdom(node, {
			test: "test"
		});
		assert.equal(
			copy.outerHTML,
			'<section><div class="test"><span>test</span></div></section>'
		);
	});

	it('should move current node from attribute to parent node', function () {
		const node = dom(`<section><div><span class="some [test|at:div]">test</span></div></section>`);
		const copy = matchdom(node, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section>test</section>');
	});

	it('should remove current node from attribute', function() {
		const node = dom(`<div><span class="some [test|at:div]">test</span></div>`);
		const copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove current node from attribute using wildcard selector', function() {
		const node = dom(`<div><div><span class="[test|at:*]">test</span></div></div>`);
		const copy = matchdom(node, {
			test: null
		});
		assert.equal(copy.outerHTML, '<div><div></div></div>');
	});

});

describe('thenAt filter', function() {
	it('should remove current node', function() {
		const node = dom(`<div><span>test [test|elseAt:*]</span></div>`);
		const copy = matchdom(node, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should not remove current node', function() {
		const node = dom(`<div><span>test[test|elseAt:*]</span></div>`);
		const copy = matchdom(node, {
			test: true
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should remove current attribute', function() {
		const node = dom(`<div><span class="some[test|elseAt:]">test</span></div>`);
		const copy = matchdom(node, {
			test: 0
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should not process following filters', function () {
		const node = dom(`<div><span class="some[test|elseAt:|elseAt:*]">test</span></div>`);
		const copy = matchdom(node, {
			test: 0
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should remove attr if prop is undefined', function() {
		const node = dom(`<div><p class="[obj.val|elseAt:]test">test</p></div>`);
		const copy = matchdom(node, { obj: {}});
		assert.equal(copy.outerHTML, '<div><p>test</p></div>');
	});

	it('should not change attr if prop is defined', function() {
		const node = dom(`<div><p class="[obj.val|elseAt:]test">test</p></div>`);
		const copy = matchdom(node, { obj: {val: 1}});
		assert.equal(copy.outerHTML, '<div><p class="test">test</p></div>');
	});

});


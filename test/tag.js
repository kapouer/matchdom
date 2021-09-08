import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom()).extend({ filters }).merge(node, data);
};

describe('tag', function() {
	it('should merge tag name', function() {
		const node = dom(`<h[n] class="[test]">Header</h[n]>`);
		const copy = matchdom(node, {
			test: "yes",
			n: 4
		});
		assert.equal(copy.outerHTML, '<h4 class="yes">Header</h4>');
	});
	it('should merge tag name and what is inside', function() {
		const node = dom(`<h[n] class="[test]">Some [text]</hN>`);
		const copy = matchdom(node, {
			test: "yes",
			text: "Header",
			n: 1
		});
		assert.equal(copy.outerHTML, '<h1 class="yes">Some Header</h1>');
	});
	it('should merge child tag name and what is inside', function() {
		const node = dom(`<div><h[n] class="[test]">Some [text]</hanything></div>`);
		const copy = matchdom(node, {
			test: "yes",
			text: "Header",
			n: 1
		});
		assert.equal(copy.outerHTML, '<div><h1 class="yes">Some Header</h1></div>');
	});
	it('should merge tag name with filter', function() {
		const node = dom(`<h[n|or:1] class="[test]">Header</hX>`);
		const copy = matchdom(node, {
			test: "yes",
			n: null
		});
		assert.equal(copy.outerHTML, '<h1 class="yes">Header</h1>');
	});
	it('should merge whole tag name', function() {
		const node = dom(`<h[name|at:] class="[test]">div</hn>`);
		const copy = matchdom(node, {
			name: "div",
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<div class="yes">div</div>');
	});
	it('should merge whole tag name when it has a parent', function() {
		const node = dom(`<div><h[name|at:] class="[test]">div</h[name|at:]></div>`);
		const copy = matchdom(node, {
			name: "main",
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<div><main class="yes">div</main></div>');
	});
	it('should merge whole tag name when it has a next sibling', function() {
		const node = dom(`<div><h[name|at:] class="[test]">div</h[name|at:]><div class="toto"></div></div>`);
		const copy = matchdom(node, {
			name: "main",
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<div><main class="yes">div</main><div class="toto"></div></div>');
	});
});


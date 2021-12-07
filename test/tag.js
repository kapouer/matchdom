import assert from 'assert';
import { Matchdom, DomPlugin, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom()).extend({ filters }).merge(node, data);
};

describe('tag', () => {
	it('should merge tag name', () => {
		const node = dom(`<h[n]>Header</h[n]>`);
		const copy = matchdom(node, {
			n: 4
		});
		assert.equal(copy.outerHTML, '<h4>Header</h4>');
	});
	it('should merge tag name and what is inside', () => {
		const node = dom(`<h[n] class="[test]">Some [text]</hN>`);
		const copy = matchdom(node, {
			test: "yes",
			text: "Header",
			n: 1
		});
		assert.equal(copy.outerHTML, '<h1 class="yes">Some Header</h1>');
	});
	it('should merge child tag name and what is inside', () => {
		const node = dom(`<div><h[n] class="[test]">Some [text]</hanything></div>`);
		const copy = matchdom(node, {
			test: "yes",
			text: "Header",
			n: 1
		});
		assert.equal(copy.outerHTML, '<div><h1 class="yes">Some Header</h1></div>');
	});
	it('should merge tag name with filter', () => {
		const node = dom(`<h[n|or:1] class="[test]">Header</hX>`);
		const copy = matchdom(node, {
			test: "yes",
			n: null
		});
		assert.equal(copy.outerHTML, '<h1 class="yes">Header</h1>');
	});
	it('should merge whole tag name', () => {
		const md = new Matchdom().extend(DomPlugin);
		const node = dom(`<h[name|at:-] class="[test]">div</hn>`);
		const copy = md.merge(node, {
			name: "div",
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<div class="yes">div</div>');
	});
	it('should merge whole tag name when it has a parent', () => {
		const md = new Matchdom().extend(DomPlugin);
		const node = dom(`<div><h[name|at:-] class="[test]">div</h[name|at:]></div>`);
		const copy = md.merge(node, {
			name: "main",
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<div><main class="yes">div</main></div>');
	});
	it('should merge whole tag name when it has a next sibling', () => {
		const md = new Matchdom().extend(DomPlugin);
		const node = dom(`<div><h[name|at:-] class="[test]">div</h[name|at:-]><div class="toto"></div></div>`);
		const copy = md.merge(node, {
			name: "main",
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<div><main class="yes">div</main><div class="toto"></div></div>');
	});
});


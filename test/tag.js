import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin, RepeatPlugin } from 'matchdom';

describe('tag', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom(DomPlugin, RepeatPlugin);

	it('should merge tag name', () => {
		const html = `<h[n]>Header</h[n]>`;
		const copy = md.merge(html, {
			n: 4
		});
		assert.equal(copy.outerHTML, '<h4>Header</h4>');
	});
	it('should merge tag name and what is inside', () => {
		const html = `<h[n] class="[test]">Some [text]</hN>`;
		const copy = md.merge(html, {
			test: "yes",
			text: "Header",
			n: 1
		});
		assert.equal(copy.outerHTML, '<h1 class="yes">Some Header</h1>');
	});
	it('should merge child tag name and what is inside', () => {
		const html = `<div><h[n] class="[test]">Some [text]</hanything></div>`;
		const copy = md.merge(html, {
			test: "yes",
			text: "Header",
			n: 1
		});
		assert.equal(copy.outerHTML, '<div><h1 class="yes">Some Header</h1></div>');
	});
	it('should merge tag name with filter', () => {
		const html = `<h[n|or:1] class="[test]">Header</hX>`;
		const copy = md.merge(html, {
			test: "yes",
			n: null
		});
		assert.equal(copy.outerHTML, '<h1 class="yes">Header</h1>');
	});
	it('should merge tag name with boolean filter', () => {
		const html = `<x[mybool|alt:div:p|at:-]>test</x>`;
		assert.equal(md.merge(html, { mybool: true }).outerHTML, '<div>test</div>');
		assert.equal(md.merge(html, { mybool: false }).outerHTML, '<p>test</p>');
		assert.equal(md.merge(html, { mybool: null }).outerHTML, '<p>test</p>');
		const html2 = `<x[mybool|alt:div:p|at:-]>test</x[mybool|alt:div:p|at:-]>`;
		assert.equal(md.merge(html2, { mybool: true }).outerHTML, '<div>test</div>');
		assert.equal(md.merge(html2, { mybool: false }).outerHTML, '<p>test</p>');
		assert.equal(md.merge(html2, { mybool: null }).outerHTML, '<p>test</p>');
		assert.equal(md.merge(html, {}).outerHTML, '<p>test</p>');
	});
	it('should merge whole tag name', () => {
		const md = new Matchdom(DomPlugin, RepeatPlugin);
		const html = `<h[name|at:-] class="[test]">div</hn>`;
		const copy = md.merge(html, {
			name: "div",
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<div class="yes">div</div>');
	});
	it('should merge whole tag name when it has a parent', () => {
		const md = new Matchdom(DomPlugin, RepeatPlugin);
		const html = `<div><h[name|at:-] class="[test]">div</h[name|at:]></div>`;
		const copy = md.merge(html, {
			name: "main",
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<div><main class="yes">div</main></div>');
	});
	it('should merge whole tag name when it has a next sibling', () => {
		const md = new Matchdom(DomPlugin, RepeatPlugin);
		const html = `<div><h[name|at:-] class="[test]">div</h[name|at:-]><div class="toto"></div></div>`;
		const copy = md.merge(html, {
			name: "main",
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<div><main class="yes">div</main><div class="toto"></div></div>');
	});
});


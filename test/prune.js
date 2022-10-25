import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin } from 'matchdom';

describe('prune filter', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});
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

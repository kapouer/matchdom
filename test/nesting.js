import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin } from 'matchdom';

describe('nesting', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom(DomPlugin);

	it('should not crash on empty expressions', () => {
		const html = `<div>[]</div>`;
		const copy = md.merge(html, {});
		assert.equal(copy.outerHTML, '<div>[]</div>');
	});

	it('should merge nested value', () => {
		const html = `<div>[[nested]]</div>`;
		const copy = md.merge(html, {nested: 'test', test: 'yes'});
		assert.equal(copy.outerHTML, '<div>yes</div>');
	});

	it('should not crash on nested empty expressions', () => {
		const html = `<div>[[nested]]</div>`;
		const copy = md.merge(html, {});
		assert.equal(copy.outerHTML, '<div>[]</div>');
	});

	it('should merge expression in text node expression parameter', () => {
		const html = `<div>[test|or:[def]]</div>`;
		const copy = md.merge(html, {
			test: null,
			def: 'str'
		});
		assert.equal(copy.outerHTML, '<div>str</div>');
	});
});


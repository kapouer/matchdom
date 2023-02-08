import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin} from 'matchdom';

describe('flow filters', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});
	const md = new Matchdom(DomPlugin);

	describe('then', () => {
		it('should run filter when true', () => {
			const html = `<p>[val|then:const:yes]</p>`;
			const copy = md.merge(html, { val: true });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should not run filter when false', () => {
			const html = `<p>[val|then:const:yes]</p>`;
			const copy = md.merge(html, { val: false });
			assert.equal(copy.outerHTML, '<p>false</p>');
		});
	});

	describe('else', () => {
		it('should not run filter when true', () => {
			const html = `<p>[val|else:const:yes]</p>`;
			const copy = md.merge(html, { val: true });
			assert.equal(copy.outerHTML, '<p>true</p>');
		});
		it('should run filter when false', () => {
			const html = `<p>[val|else:const:yes]</p>`;
			const copy = md.merge(html, { val: false });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});

		it('should run filter when null', () => {
			const html = `<p>[val|else:const:yes]</p>`;
			const copy = md.merge(html, { val: null });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});

		it('should run without filter when false', () => {
			const html = `<div><p>[val|prune:*]</p>test</div>`;
			const copy = md.merge(html, { val: false });
			assert.equal(copy.outerHTML, '<div>test</div>');
		});
	});

	describe('or', () => {
		it('should not change value when true', () => {
			const html = `<p>[str|or:yes]</p>`;
			const copy = md.merge(html, { str: "stuff" });
			assert.equal(copy.outerHTML, '<p>stuff</p>');
		});
		it('should change value when false', () => {
			const html = `<p>[str|or:yes]</p>`;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should fail with additional parameters', () => {
			const html = `<p>[str|or:yes:oui]</p>`;
			md.debug = true;
			assert.throws(() => {
				md.merge(html, {});
			}, {
				name: 'ParamError'
			});
		});
	});

	describe('and', () => {
		it('should change value when true', () => {
			const html = `<p>[str|and:yes]</p>`;
			const copy = md.merge(html, { str: "stuff" });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should not change value when false', () => {
			const html = `<p>[str|and:yes]</p>`;
			const copy = md.merge(html, { str: "" });
			assert.equal(copy.outerHTML, '<p></p>');
		});
	});

	describe('alt', () => {
		it('should match true to first param', () => {
			const html = `<p>[bool|alt:yes:no]</p>`;
			const copy = md.merge(html, { bool: true });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should match false to second param', () => {
			const html = `<p>[bool|alt:yes:no]</p>`;
			const copy = md.merge(html, { bool: false });
			assert.equal(copy.outerHTML, '<p>no</p>');
		});
		it('should work without second param', () => {
			const html = `<p>[bool|alt:yes]</p>`;
			const copy = md.merge(html, { bool: true });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should work with false without second param', () => {
			const html = `<p>[bool|alt:yes]</p>`;
			const copy = md.merge(html, { bool: false });
			assert.equal(copy.outerHTML, '<p></p>');
		});
	});

});

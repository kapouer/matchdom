import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => new Matchdom({debug:true}).extend({ filters }).merge(node, data);

describe('flow filters', () => {
	describe('then', () => {
		it('should run filter when true', () => {
			const node = dom(`<p>[val|then:const:yes]</p>`);
			const copy = matchdom(node, { val: true });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should not run filter when false', () => {
			const node = dom(`<p>[val|then:const:yes]</p>`);
			const copy = matchdom(node, { val: false });
			assert.equal(copy.outerHTML, '<p>false</p>');
		});
	});

	describe('else', () => {
		it('should not run filter when true', () => {
			const node = dom(`<p>[val|else:const:yes]</p>`);
			const copy = matchdom(node, { val: true });
			assert.equal(copy.outerHTML, '<p>true</p>');
		});
		it('should run filter when false', () => {
			const node = dom(`<p>[val|else:const:yes]</p>`);
			const copy = matchdom(node, { val: false });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});

		it('should run filter when null', () => {
			const node = dom(`<p>[val|else:const:yes]</p>`);
			const copy = matchdom(node, { val: null });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});

		it('should run without filter when false', () => {
			const node = dom(`<div><p>[val|prune:*]</p>test</div>`);
			const copy = matchdom(node, { val: false });
			assert.equal(copy.outerHTML, '<div>test</div>');
		});
	});

	describe('or', () => {
		it('should not change value when true', () => {
			const node = dom(`<p>[str|or:yes]</p>`);
			const copy = matchdom(node, { str: "stuff" });
			assert.equal(copy.outerHTML, '<p>stuff</p>');
		});
		it('should change value when false', () => {
			const node = dom(`<p>[str|or:yes]</p>`);
			const copy = matchdom(node, {});
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should fail with additional parameters', () => {
			const node = dom(`<p>[str|or:yes:oui]</p>`);
			assert.throws(() => {
				matchdom(node, {});
			}, {
				name: 'ParamError'
			});
		});
	});

	describe('and', () => {
		it('should change value when true', () => {
			const node = dom(`<p>[str|and:yes]</p>`);
			const copy = matchdom(node, { str: "stuff" });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should not change value when false', () => {
			const node = dom(`<p>[str|and:yes]</p>`);
			const copy = matchdom(node, { str: "" });
			assert.equal(copy.outerHTML, '<p></p>');
		});
	});

});

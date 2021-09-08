import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => new Matchdom({debug:true}).extend({ filters }).merge(node, data);

describe('flow filters', function () {
	describe('then', function () {
		it('should run filter when true', function () {
			const node = dom(`<p>[val|then:const:yes]</p>`);
			const copy = matchdom(node, { val: true });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should not run filter when false', function () {
			const node = dom(`<p>[val|then:const:yes]</p>`);
			const copy = matchdom(node, { val: false });
			assert.equal(copy.outerHTML, '<p>false</p>');
		});
	});

	describe('else', function () {
		it('should not run filter when true', function () {
			const node = dom(`<p>[val|else:const:yes]</p>`);
			const copy = matchdom(node, { val: true });
			assert.equal(copy.outerHTML, '<p>true</p>');
		});
		it('should run filter when false', function () {
			const node = dom(`<p>[val|else:const:yes]</p>`);
			const copy = matchdom(node, { val: false });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});

		it('should run filter when null', function () {
			const node = dom(`<p>[val|else:const:yes]</p>`);
			const copy = matchdom(node, { val: null });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});

		it('should run without filter when false', function () {
			const node = dom(`<div><p>[val|else:ifAt:*]</p>test</div>`);
			const copy = matchdom(node, { val: false });
			assert.equal(copy.outerHTML, '<div>test</div>');
		});
	});

	describe('or', function () {
		it('should not change value when true', function () {
			const node = dom(`<p>[str|or:yes]</p>`);
			const copy = matchdom(node, { str: "stuff" });
			assert.equal(copy.outerHTML, '<p>stuff</p>');
		});
		it('should change value when false', function () {
			const node = dom(`<p>[str|or:yes]</p>`);
			const copy = matchdom(node, {});
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should fail with additional parameters', function () {
			const node = dom(`<p>[str|or:yes:oui]</p>`);
			assert.throws(() => {
				matchdom(node, {});
			}, {
				name: 'ParamError'
			});
		});
	});

	describe('and', function () {
		it('should change value when true', function () {
			const node = dom(`<p>[str|and:yes]</p>`);
			const copy = matchdom(node, { str: "stuff" });
			assert.equal(copy.outerHTML, '<p>yes</p>');
		});
		it('should not change value when false', function () {
			const node = dom(`<p>[str|and:yes]</p>`);
			const copy = matchdom(node, { str: "" });
			assert.equal(copy.outerHTML, '<p></p>');
		});
	});

});

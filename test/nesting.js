import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom()).extend({ filters }).merge(node, data);
};

describe('nesting', function() {
	it('should not crash on empty expressions', function() {
		const node = dom(`<div>[]</div>`);
		const copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<div>[]</div>');
	});

	it('should merge nested value', function() {
		const node = dom(`<div>[[nested]]</div>`);
		const copy = matchdom(node, {nested: 'test', test: 'yes'});
		assert.equal(copy.outerHTML, '<div>yes</div>');
	});

	it('should not crash on nested empty expressions', function() {
		const node = dom(`<div>[[nested]]</div>`);
		const copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<div>[]</div>');
	});

	it('should merge expression in text node expression parameter', function() {
		const node = dom(`<div>[test|or:[def]]</div>`);
		const copy = matchdom(node, {
			test: null,
			def: 'str'
		});
		assert.equal(copy.outerHTML, '<div>str</div>');
	});
});


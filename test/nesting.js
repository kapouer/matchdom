import assert from 'assert';
import matchdom from 'matchdom';
import dom from 'domify';

describe('nesting', function() {
	it('should not crash on empty expressions', function() {
		let node = dom(`<div>[]</div>`);
		let copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<div>[]</div>');
	});

	it('should merge nested value', function() {
		let node = dom(`<div>[[nested]]</div>`);
		let copy = matchdom(node, {nested: 'test', test: 'yes'});
		assert.equal(copy.outerHTML, '<div>yes</div>');
	});

	it('should not crash on nested empty expressions', function() {
		let node = dom(`<div>[[nested]]</div>`);
		let copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<div>[]</div>');
	});

	it('should merge expression in text node expression parameter', function() {
		let node = dom(`<div>[test|or:[def]]</div>`);
		let copy = matchdom(node, {
			test: null,
			def: 'str'
		});
		assert.equal(copy.outerHTML, '<div>str</div>');
	});
});


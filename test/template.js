const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('domify');
require('dom4'); // jsdom is missing .closest

describe('template', function() {
	it('should append template content after template', function() {
		let node = dom(`<div><template><p>[test]</p><p>[toast]</p></template></div>`);
		let copy = matchdom(node, {
			test: "yes",
			toast: 4
		});
		assert.equal(copy.outerHTML, '<div><template><p>[test]</p><p>[toast]</p></template><p>yes</p><p>4</p></div>');
	});
	it('should replace template content and repeat', function() {
		let node = dom(`<div><template><p>[list|repeat:p]</p></template></div>`);
		let copy = matchdom(node, {
			list: ["one", "two"]
		});
		assert.equal(copy.outerHTML, '<div><template><p>[list|repeat:p]</p></template><p>one</p><p>two</p></div>');
	});
	it('should replace template content and repeat fragment', function() {
		let node = dom(`<div>
			<template><p>[list.a|repeat:p+:item]</p><p>[item.b]</p></template>
		</div>`);
		let copy = matchdom(node, {
			list: [{a: "aone", b: "atwo"}, {a: "bone", b: "btwo"}]
		});
		assert.equal(copy.outerHTML, `<div>
			<template><p>[list.a|repeat:p+:item]</p><p>[item.b]</p></template><p>aone</p><p>atwo</p><p>bone</p><p>btwo</p>
		</div>`);
	});
});


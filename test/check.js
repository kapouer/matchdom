import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';

const md = new Matchdom({
	visitor(node, iter) {
		if (node.content) {
			node.after(node.content.cloneNode(true));
			node.remove();
			return false;
		} else {
			return true;
		}
	}
});

const matchdom = (node, data) => md.merge(node, data);

describe('custom check', function() {
	it('should append template content after template', function() {
		let node = dom(`<div><template><p>[test]</p><p>[toast]</p></template></div>`);
		let copy = matchdom(node, {
			test: "yes",
			toast: 4
		});
		assert.strictEqual(copy.outerHTML, '<div><p>yes</p><p>4</p></div>');
	});
	it('should replace template content and repeat', function() {
		let node = dom(`<div><template><p>[list|repeat:p]</p></template></div>`);
		let copy = matchdom(node, {
			list: ["one", "two"]
		});
		assert.strictEqual(copy.outerHTML, '<div><p>one</p><p>two</p></div>');
	});
	it('should replace template content and repeat fragment', function() {
		let node = dom(`<div>
			<template><p>[list|repeat:p+:item|a]</p><p>[item.b]</p></template>
		</div>`);
		let copy = matchdom(node, {
			list: [{a: "aone", b: "atwo"}, {a: "bone", b: "btwo"}]
		});
		assert.strictEqual(copy.outerHTML, `<div>
			<p>aone</p><p>atwo</p><p>bone</p><p>btwo</p>
		</div>`);
	});
});


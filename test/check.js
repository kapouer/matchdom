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

describe('custom check', () => {
	it('should append template content after template', () => {
		const node = dom(`<div><template><p>[test]</p><p>[toast]</p></template></div>`);
		const copy = matchdom(node, {
			test: "yes",
			toast: 4
		});
		assert.strictEqual(copy.outerHTML, '<div><p>yes</p><p>4</p></div>');
	});
	it('should replace template content and repeat', () => {
		const node = dom(`<div><template><p>[list|repeat:p]</p></template></div>`);
		const copy = matchdom(node, {
			list: ["one", "two"]
		});
		assert.strictEqual(copy.outerHTML, '<div><p>one</p><p>two</p></div>');
	});
	it('should replace template content and repeat fragment', () => {
		const node = dom(`<div>
			<template><p>[list|at:p+|repeat:item|.a]</p><p>[item.b]</p></template>
		</div>`);
		const copy = matchdom(node, {
			list: [{a: "aone", b: "atwo"}, {a: "bone", b: "btwo"}]
		});
		assert.strictEqual(copy.outerHTML, `<div>
			<p>aone</p><p>atwo</p><p>bone</p><p>btwo</p>
		</div>`);
	});
});


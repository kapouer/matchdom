import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, DomPlugin, RepeatPlugin,
	ArrayPlugin
} from 'matchdom';

describe('dom', () => {

	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	describe('html type', () => {
		const md = new Matchdom().extend(DomPlugin);

		it('should keep whitespace', () => {
			const html = `<div>[str|as:html]</div>`;
			const copy = md.merge(html, {
				str: '<p>One <strong>two</strong>\n<strong>three</strong> four</p>'
			});
			assert.equal(copy.outerHTML, '<div><p>One <strong>two</strong>\n<strong>three</strong> four</p></div>');
		});

		it('should merge dom fragment', () => {
			const frag = document.createDocumentFragment();
			frag.appendChild(document.createTextNode('test'));
			const copy = md.merge(`<span>[frag]</span>`, {
				frag
			});
			assert.equal(copy.outerHTML, '<span>test</span>');
		});

		it('should allow child node to modify ancestors', () => {
			const div = document.createElement('div');
			div.innerHTML = '<p><span>[test|at:div|to:class]text</span></p><p><span>[test2|at:div|to:class]text2</span></p>';
			for (const node of div.querySelectorAll('span')) md.merge(node, {
				test: 'test',
				test2: 'test2'
			});
			assert.equal(div.outerHTML, '<div class="test test2"><p><span>text</span></p><p><span>text2</span></p></div>');
		});

		it('should select first node', () => {
			const html = `<p>[str|one:img+span]</p>`;
			const copy = md.merge(html, {
				str: '<img src="toto"><span>test</span><i>test</i><span>toto</span>'
			});
			assert.equal(copy.outerHTML, '<p><span>test</span></p>');
		});

		it('should select nodes', () => {
			const html = `<p>[str|all:span]</p>`;
			const copy = md.merge(html, {
				str: '<img src="toto"><span>test</span><i>test</i><span>toto</span>'
			});
			assert.equal(copy.outerHTML, '<p><span>test</span><span>toto</span></p>');
		});

		it('should allow null val', () => {
			const html = `<p>[str|as:html]</p>`;
			const copy = md.merge(html, {
				str: null
			});
			assert.equal(copy.outerHTML, '<p></p>');
		});

		it('should support xml', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
			<root>
				<title>[title]</title>
			</root>`;
			const node = (new DOMParser()).parseFromString(xml, "application/xml");
			const copy = md.merge(node, {
				title: 'test'
			});
			assert.equal((new XMLSerializer()).serializeToString(copy), `<root>
				<title>test</title>
			</root>`);
		});

		it('should support merging html in xml', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
			<root>
				<content>
					[content|as:xml]
				</content>
			</root>`;
			const node = (new DOMParser()).parseFromString(xml, "application/xml");
			const copy = md.merge(node, {
				content: 'test<br/>test'
			});
			assert.equal((new XMLSerializer()).serializeToString(copy), `<root>
				<content>
					test<br/>test
				</content>
			</root>`);
		});

		it('should support magnet in xml', () => {
			const xml = `<?xml version="1.0" encoding="utf-8"?>
			<root><content>
				[content|prune:content]
			</content></root>`;
			const node = (new DOMParser()).parseFromString(xml, "application/xml");
			const copy = md.extend(RepeatPlugin).merge(node, {
				content: null
			});
			assert.equal((new XMLSerializer()).serializeToString(copy), `<root/>`);
		});
	});

	describe('join filter', () => {
		const md = new Matchdom(DomPlugin, ArrayPlugin);
		it('with space', () => {
			const html = `<p>[arr|join: ]</p>`;
			const copy = md.merge(html, {
				arr: ['word1', 'word2']
			});
			assert.equal(copy.outerHTML, '<p>word1 word2</p>');
		});

		it('with newline in br mode', () => {
			const html = `<p>[arr|join:%0A|as:text]</p>`;
			const copy = md.merge(html, {
				arr: ['line1', 'line2']
			});
			assert.equal(copy.outerHTML, '<p>line1<br>line2</p>');
		});

		it('html with <br>', () => {
			const html = `<p>[arr|join:%3Cbr%3E|as:html]</p>`;
			const copy = md.merge(html, {
				arr: ['<b>line1</b>', '<i>line2</i>']
			});
			assert.equal(copy.outerHTML, '<p><b>line1</b><br><i>line2</i></p>');
		});
	});
});

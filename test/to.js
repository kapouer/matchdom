import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, ArrayPlugin, DomPlugin, RepeatPlugin, UrlPlugin
} from 'matchdom';

describe('to filter', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});
	const md = new Matchdom(ArrayPlugin, DomPlugin, RepeatPlugin, UrlPlugin);

	it('should be renamed and merged with simple value', () => {
		const html = `<img data-src="[test|to:src]">`;
		const copy = md.merge(html, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should be renamed and merged with simple value with parameter', () => {
		const html = `<img toubidouhoua="[test|to:src]">`;
		const copy = md.merge(html, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<img src="yes">');
	});

	it('should set attribute even when defined in the text html', () => {
		const html = `<a>test[href|to:href]</a>`;
		const copy = md.merge(html, {
			href: "/test"
		});
		assert.equal(copy.outerHTML, '<a href="/test">test</a>');
	});

	it('should set attribute of selected ancestor when defined in text html', () => {
		const html = `<div class="add"><span>test[myclass|at:div|to:class]</span></div>`;
		const copy = md.merge(html, {
			myclass: "test product"
		});
		assert.equal(copy.outerHTML, '<div class="add test product"><span>test</span></div>');
	});

	it('should set attribute of selected ancestor with undefined or filter', () => {
		const html = `<div><span>test[undef|or:toto|at:div|to:class]</span></div>`;
		const copy = md.merge(html, {});
		assert.equal(copy.outerHTML, '<div class="toto"><span>test</span></div>');
	});

	it('should add a class', () => {
		const html = `<span class="some">[label|to:class]test</span>`;
		const copy = md.merge(html, {
			label: "visible"
		});
		assert.equal(copy.outerHTML, '<span class="some visible">test</span>');
	});

	it('should not erase class attribute when adding an empty class from another place', () => {
		const html = `<span class="some">[label|to:class]test</span>`;
		const copy = md.merge(html, {
			label: ""
		});
		assert.equal(copy.outerHTML, '<span class="some">test</span>');
	});

	it('should fill current node', () => {
		const html = `<p>a[field|to:-]b</p>`;
		const copy = md.merge(html, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});

	it('should fill current node from attribute', () => {
		const html = `<div><p data-template="[field|to:-]">ab</p></div>`;
		const copy = md.merge(html, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<div><p>word</p></div>');
	});

	it('should replace current root node', () => {
		const html = `<p>[field|to:*]a</p>`;
		const copy = md.merge(html, {
			field: 'word'
		});
		assert.equal(copy, 'word');
	});

	it('should replace current node from attribute', () => {
		const html = `<div><p data-template="[field|to:*]">ab</p></div>`;
		const copy = md.merge(html, {
			field: 'word'
		});
		assert.equal(copy.outerHTML, '<div>word</div>');
	});

	it('should fill current node from attribute using html', () => {
		const html = `<p data-template="[field|to:-|as:html]">ab</p>`;
		const copy = md.merge(html, {
			field: '<b>word</b>'
		});
		assert.equal(copy.outerHTML, '<p><b>word</b></p>');
	});

	it('should replace current node from attribute using html', () => {
		const frag = md.merge(`[html|as:html]`, {
			html: `<p data-template="[field|as:html|to:*]">ab</p>thing`
		});
		const copy = md.merge(frag, {
			field: '<b>word</b>'
		});
		const div = copy.ownerDocument.createElement('div');
		div.append(copy);
		assert.equal(div.innerHTML, '<b>word</b>thing');
	});

	it('should not fill current node', () => {
		const html = `<p>a[field.it|to:]b</p>`;
		const copy = md.merge(html, {
			other: 'word'
		});
		assert.equal(copy.outerHTML, '<p>a[field.it|to:]b</p>');
	});

	it('should not fill from attribute', () => {
		const html = `<p data-template="[field.it|to:*]">abb</p>`;
		const copy = md.merge(html, {
			other: 'word'
		});
		assert.equal(copy.outerHTML, '<p data-template="[field.it|to:*]">abb</p>');
	});


	it('should append to space-separated attribute', () => {
		const html = `<p class="test">[style|to:class]abb</p>`;
		const copy = md.merge(html, {
			style: 'word'
		});
		assert.equal(copy.outerHTML, '<p class="test word">abb</p>');
	});

	it('should fill current node and set an attribute using two separate expressions', () => {
		const html = `<p data-fill="[field|to:-]" data-attr="[field2|to:class]">astuffb</p>`;
		const copy = md.merge(html, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<p class="myclass">word</p>');
	});

	it('should fill current node and set an attribute on parent node using two separate expressions', () => {
		const html = `<div><p data-fill="[field|to:-]" data-attr="[field2|at:div|to:class]">astuffb</p></div>`;
		const copy = md.merge(html, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<div class="myclass"><p>word</p></div>');
	});

	it('should fill current node before setting an attribute from within', () => {
		const html = `<p data-expr="[field|to:-]">a[field|to:class]b</p>`;
		const copy = md.merge(html, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<p>word</p>');
	});

	it('should not set an attribute partially filled', () => {
		const html = `<div><p data-attr="toto[field|to:-]aa">astuffb</p></div>`;
		const copy = md.merge(html, {
			field: 'word',
			field2: 'myclass'
		});
		assert.equal(copy.outerHTML, '<div><p>totowordaa</p></div>');
	});

	it('should target a node sibling', () => {
		const html = `<div>
			<div><p>test[val|at:div|to:value:input]</p></div>
			<input>
		</div>`;
		const copy = md.merge(html, {
			val: 'word'
		});
		assert.equal(copy.outerHTML, `<div>
			<div><p>test</p></div>
			<input value="word">
		</div>`);
	});

	it('should read value from target', () => {
		const html = `<a href="/mypath">test[at:a|from:href|as:url|set:query.id:[id]]</a>`;
		const copy = md.merge(html, {
			id: "2"
		});
		assert.equal(copy.outerHTML, '<a href="/mypath?id=2">test</a>');
	});

	it('should read value from target and assign id', () => {
		const html = `<a href="/mypath">test[at:a|from:href|as:url|assign:.query.id:id]</a>`;
		const copy = md.merge(html, {
			id: "2"
		});
		assert.equal(copy.outerHTML, '<a href="/mypath?id=2">test</a>');
	});
});


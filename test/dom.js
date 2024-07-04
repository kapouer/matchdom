import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, OpsPlugin, StringPlugin,
	ArrayPlugin, DomPlugin, DatePlugin, RepeatPlugin,
	TextPlugin
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
		const md = new Matchdom().extend(DomPlugin);
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

	describe('parts filter', () => {
		const md = new Matchdom(DatePlugin, StringPlugin, TextPlugin);

		it('should get last part of a path', () => {
			const html = `[path|parts:.:-1]`;
			const copy = md.merge(html, {
				path: 'test.to.last'
			});
			assert.equal(copy, 'last');
		});
		it('should get first parts of isodate', () => {
			const html = `[date|date:isodate|parts:-:0:2]`;
			const copy = md.merge(html, {
				date: new Date("2022-05-30")
			});
			assert.equal(copy, '2022-05');
		});

		it('should parse partial date', () => {
			const html = `[$query.date|or:now|clock:1:M|date:isodate|parts:-:0:2]`;
			const copy = md.merge(html, {
				$query: {
					date: "2022-05"
				}
			});
			assert.equal(copy, '2022-06');
		});

		it('should do nothing', () => {
			const html = `[str|parts:x]`;
			const copy = md.merge(html, {
				str: 'xyzzx'
			});
			assert.equal(copy, 'xyzzx');
		});
	});

	describe('to filter', () => {
		const md = new Matchdom(ArrayPlugin, DomPlugin, RepeatPlugin);

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

		it('should erase class attribute if setting an empty class', () => {
			const html = `<span class="some">[label|to:class]test</span>`;
			const copy = md.merge(html, {
				label: ""
			});
			assert.equal(copy.outerHTML, '<span>test</span>');
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
	});
});

describe('at filter', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});
	const md = new Matchdom(DomPlugin, OpsPlugin, RepeatPlugin);
	it('should replace current node', () => {
		const html = `<div><span>[test|at:*]</span></div>`;
		const copy = md.merge(html, {
			test: "mydiv",
			toto: 23
		});
		assert.equal(copy.outerHTML, '<div>mydiv</div>');
	});

	it('should remove current node and previous and next element siblings', () => {
		const html = `<div><br><br><span>[test|at:span:1:1]</span><hr><hr></div>`;
		const copy = md.merge(html, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove current node and previous and next element siblings with wildcard selector', () => {
		const html = `<div><br><br><span>[test|at:*:1:1]</span><hr><hr></div>`;
		const copy = md.merge(html, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should replace current expression and previous and next element siblings', () => {
		const html = `<div><br><br>[test|at::1:1]<hr><hr></div>`;
		const copy = md.merge(html, {
			test: 'me'
		});
		assert.equal(copy.outerHTML, '<div><br>me<hr></div>');
	});

	it('should replace current expression and previous node', () => {
		const html = `<div><br>ABC[test|at::0:1]XYZ<hr></div>`;
		const copy = md.merge(html, {
			test: 'me'
		});
		assert.equal(copy.outerHTML, '<div>ABCmeXYZ<hr></div>');
	});

	it('should replace current expression and next node', () => {
		const html = `<div><hr>ABC[test|at::1]XYZ<img></div>`;
		const copy = md.merge(html, {
			test: 'me'
		});
		assert.equal(copy.outerHTML, '<div><hr>ABCmeXYZ</div>');
	});

	it('should remove closest tr', () => {
		const html = `<table><tbody>
			<th><td>Hello</td></tr><tr><td>[test|at:tr]</td></tr>
		</tbody></table>`;
		const copy = md.merge(html, {
			test: null // nothing is fine too
		});
		assert.equal(copy.outerHTML, md.merge(`<table><tbody>
			<th><td>Hello</td></tr>
		</tbody></table>`).outerHTML);
	});

	it('should do nothing special on attribute', () => {
		const html = `<div><span class="some [test|at:] [tata]">[tata]</span></div>`;
		const copy = md.merge(html, {
			// test: null,
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span class="some test">test</span></div>');
	});

	it('should remove current attribute', () => {
		const html = `<div><span class="some [test|at:-] [tata]">[tata]</span></div>`;
		const copy = md.merge(html, {
			// test: null,
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should replace whole attribute', () => {
		const html = `<div><span class="some [test|at:-] [tata]">[tata]</span></div>`;
		const copy = md.merge(html, {
			test: "toto",
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span class="toto">test</span></div>');
	});

	it('should move attribute from one node to its parent', () => {
		const html = `<section><div><span class="[test|at:div|to:class]">test</span></div></section>`;
		const copy = md.merge(html, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section><div class="test"><span>test</span></div></section>');
	});


	it('should clobber other strings inside an attribute from one node to its parent', () => {
		const html = `<section><div><span class="some [test|at:div|to:class]">test</span></div></section>`;
		const copy = md.merge(html, {
			test: "test"
		});
		assert.equal(
			copy.outerHTML,
			'<section><div class="test"><span>test</span></div></section>'
		);
	});

	it('should move current node from attribute to parent node', () => {
		const html = `<section><div><span class="some [test|at:div]">test</span></div></section>`;
		const copy = md.merge(html, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section>test</section>');
	});

	it('should set attributes on all selected range', () => {
		const html = `<section><div>a</div><div><span class="[test|at:div:1:1|to:class]">test</span></div><div>b</div></section>`;
		const copy = md.merge(html, {
			test: "sel"
		});
		assert.equal(copy.outerHTML, '<section><div class="sel">a</div><div class="sel"><span>test</span></div><div class="sel">b</div></section>');
	});

	it('should remove current node from attribute', () => {
		const html = `<div><span class="some [test|at:div]">test</span></div>`;
		const copy = md.merge(html, {});
		assert.equal(copy, null);
	});

	it('should remove current node from attribute using wildcard selector', () => {
		const html = `<div><div><span class="[test|at:*]">test</span></div></div>`;
		const copy = md.merge(html, {
			test: null
		});
		assert.equal(copy.outerHTML, '<div><div></div></div>');
	});

	it('should be an alias of else:at', () => {
		const html = `<div>
			<span class="[test|fail:*]">test</span>
			<span>[ok|fail:*]</span>
			<span>[zero|neq:0|fail:*]</span>
			<span>[zero|switch:0|fail:*]</span>
			<p>[zero|fail:*]</p>
			<section>[un|fail:*]</section>
		</div>`;
		const copy = md.merge(html, {
			test: false,
			ok: 'oui',
			zero: 0,
			un: 1
		});
		assert.equal(copy.outerHTML.replaceAll(/\s/g, ''), `<div>
			<span>oui</span>
			<section>1</section>
		</div>`.replaceAll(/\s/g, ''));
	});

});

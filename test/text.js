import { strict as assert } from 'node:assert';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin } from 'matchdom';

before(function () {
	this.jsdom = globalJsdom();
});
after(function () {
	this.jsdom();
});

describe('text nodes', () => {
	const md = new Matchdom(DomPlugin);

	it('should be merged with simple value', () => {
		const html = `<span>no? [test]!</span>`;
		const copy = md.merge(html, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>no? yes!</span>');
	});

	it('should be merged with nested path accessor', () => {
		const html = `<span>[path.test.to]</span>`;
		const copy = md.merge(html, {
			path: {
				test: {
					to: "yes"
				}
			}
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should not be merged as html', () => {
		const md = new Matchdom().extend(DomPlugin);
		const html = `<span>[str|as:text]</span>`;
		const copy = md.merge(html, {
			str: "<b>bold</b>"
		});
		assert.equal(copy.outerHTML, '<span>&lt;b&gt;bold&lt;/b&gt;</span>');
	});

	it('should be merged as html', () => {
		const md = new Matchdom().extend(DomPlugin);
		const html = `<span>[str|as:html]</span>`;
		const copy = md.merge(html, {
			str: "test<b>bold</b><i>italic</i>test"
		});
		assert.equal(copy.outerHTML, '<span>test<b>bold</b><i>italic</i>test</span>');
	});

	it('should replace newlines with br', () => {
		const md = new Matchdom().extend(DomPlugin);
		const html = `<p>[str|as:text]</p>`;
		const copy = md.merge(html, {
			str: "test\n\ntest\n"
		});
		assert.equal(copy.outerHTML, '<p>test<br><br>test<br></p>');
	});

	it('should be merged as if empty when undefined and first level', () => {
		const html = `<span>no? [test]!</span>`;
		const copy = md.merge(html, {
			toto: 'me'
		});
		assert.equal(copy.outerHTML, '<span>no? !</span>');
	});

	it('should be merged as if empty when undefined and second level', () => {
		const html = `<span>no? [test.it]!</span>`;
		const copy = md.merge(html, {
			test: {
				ot: 'oui'
			}
		});
		assert.equal(copy.outerHTML, '<span>no? !</span>');
	});

	it('should be left unmerged when first-level is undefined on a two-level path', () => {
		const html = `<span>no? [test.it]!</span>`;
		const copy = md.merge(html, {
			tost: {
				it: 'oui'
			}
		});
		assert.equal(copy.outerHTML, '<span>no? [test.it]!</span>');
	});

	it('should not replace newlines of contiguous text nodes with br', () => {
		const html = `<div>
		<span>[inside]</span>[outside]at
		</div>`;
		const copy = md.merge(html, {
			inside: 'this',
			outside: 'th'
		});
		assert.equal(copy.outerHTML, `<div>
		<span>this</span>that
		</div>`);
	});
});

describe('filters on text nodes', () => {
	const md = new Matchdom(DomPlugin);

	it('should do nothing if missing', () => {
		const html = `<span>[test|notfound:]</span>`;
		const copy = md.merge(html, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should do nothing if multiple filters are missing', () => {
		const html = `<span>[test|notfound:|notfound2:]</span>`;
		const copy = md.merge(html, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should do nothing if multiple filters with parameters are missing', () => {
		const html = `<span>[test|notfound:ff|notfound2:kk]</span>`;
		const copy = md.merge(html, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should receive parameter', () => {
		const html = `<span>[test|prefix:me]</span>`;
		const copy = md.extend({filters:{
			prefix: ['?', 'string', function(ctx, val, prefix) {
				return prefix + val;
			}]
		}}).merge(html, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>meyes</span>');
	});

	it('should receive parameter when multiple filters are applied', () => {
		const html = `<span>[test|prefix:me|postfix:you]</span>`;
		const copy = md.extend({filters:{
			prefix: function(x, val, str) {
				return str + val;
			},
			postfix: function (x, val, str) {
				return val + str;
			}
		}}).merge(html, {
			test: " and "
		});
		assert.equal(copy.outerHTML, '<span>me and you</span>');
	});

	it('should be merge list of nodes', () => {
		const md = new Matchdom().extend(DomPlugin);
		const node = md.merge(`<div>
			<span>no? [test]!</span>
			<div><span>no? [test2]!</span></div>
		</div>`);
		md.merge(node.querySelectorAll('span'), {
			test: "yes",
			test2: "no"
		});
		assert.equal(node.outerHTML, md.merge(`<div>
			<span>no? yes!</span>
			<div><span>no? no!</span></div>
		</div>`).outerHTML);
	});
});


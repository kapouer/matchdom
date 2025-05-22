import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import globalJsdom from 'global-jsdom';
import { Matchdom, DomPlugin, RepeatPlugin, ArrayPlugin, DatePlugin, TextPlugin } from 'matchdom';

describe('text nodes', () => {
	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

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
		const copy = md.merge(html, {});
		assert.equal(copy.outerHTML, '<span>no? [test.it]!</span>');
	});

	it('should be merged when first-level is undefined and optionally chained on a two-level path', () => {
		const html = `<span>no? [test?.it]!</span>`;
		const copy = md.merge(html, {});
		assert.equal(copy.outerHTML, '<span>no? !</span>');
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

	it('should throw if filter is missing', () => {
		assert.throws(() => {
			const html = `<span>[test|notfound:]</span>`;
			md.copy().extend({ debug: true }).merge(html, {
				test: "yes"
			});
		}, {
			name: 'Error',
			message: 'Missing filter: notfound'
		});
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

	it('with a filter should receive parameter', () => {
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

	it('should merge inner child nodes and mutate parent', () => {
		const md = new Matchdom().extend(DomPlugin);
		const node = md.merge(`<div>
			<span>no? [test]!</span>
			<div><span>no? [test2]!</span></div>
		</div>`);
		for (const span of node.querySelectorAll('span')) md.merge(span, {
			test: "yes",
			test2: "no"
		});
		assert.equal(node.outerHTML, md.merge(`<div>
			<span>no? yes!</span>
			<div><span>no? no!</span></div>
		</div>`).outerHTML);
	});
});

describe('text without dom', () => {
	const md = new Matchdom(TextPlugin).extend(RepeatPlugin);

	it('should be merged and returned', () => {
		const copy = md.merge('no? [test]!', {
			test: "yes"
		});
		assert.equal(copy, 'no? yes!');
	});


	it('should not merge anything', () => {
		const md = new Matchdom();
		const copy = md.merge(true, {});
		assert.equal(copy, true);
	});

	it('should merge null', () => {
		const copy = md.extend(DatePlugin).merge('[test|then:date:Y]', {
			toto: 'one'
		});
		assert.equal(copy, null);
	});

	it('should be merged as text', () => {
		const copy = md.merge('no?\n [test]!', {
			test: "yes\nnl"
		});
		assert.equal(copy, 'no?\n yes\nnl!');
	});

	it('should return null', () => {
		const copy = md.merge('[test]', {
			test: null
		});
		assert.equal(copy, null);
	});

	it('should not change when nested variable has no parent set', () => {
		const copy = md.merge('notfound: [test.a]', {});
		assert.equal(copy, 'notfound: [test.a]');
	});

	it('should not change when top variable is not \\w\\S*', () => {
		const copy = md.merge('notfound: [\\w]', { test: 1 });
		assert.equal(copy, 'notfound: [\\w]');
	});

	it('should not return null', () => {
		const copy = md.merge('[test]a', {
			test: null
		});
		assert.equal(copy, 'a');
	});

	it('should repeat array', () => {
		const copy = md.merge("--[arr|repeat:|value]--", {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy, "--one----two--");
	});

	it('should repeat object', () => {
		const copy = md.extend(ArrayPlugin).merge("key:[obj|as:keys|repeat:] ", {
			obj: { a: 1, b: 2 }
		});
		assert.equal(copy, "key:a key:b ");
	});

	it('should repeat object keys', () => {
		const copy = md.merge("[obj|as:entries|repeat:item|.key]=[item.value]&", {
			obj: { a: 1, b: 2 }
		});
		assert.equal(copy, "a=1&b=2&");
	});

	it('should repeat array using whole string', () => {
		const copy = md.merge("--[arr|at:-|repeat:|value]--", {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy, "--one----two--");
	});

	it('should repeat array inside string', () => {
		const copy = md.merge("-X[arr|at:|repeat:|value]YY-", {
			arr: [{ value: 'one' }, { value: 'two' }]
		});
		assert.equal(copy, "-XonetwoYY-");
	});

	it('should return array', () => {
		const arr = ['one', 'two'];
		const copy = md.merge("[arr]", { arr });
		assert.deepEqual(copy, arr);
	});
});

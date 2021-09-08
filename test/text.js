import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom()).extend({ filters }).merge(node, data);
};

describe('text nodes', function() {
	it('should be merged with simple value', function() {
		const node = dom(`<span>no? [test]!</span>`);
		const copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>no? yes!</span>');
	});

	it('should be merged with nested path accessor', function() {
		const node = dom(`<span>[path.test.to]</span>`);
		const copy = matchdom(node, {
			path: {
				test: {
					to: "yes"
				}
			}
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should not be merged as html', function() {
		const node = dom(`<span>[str|as:text]</span>`);
		const copy = matchdom(node, {
			str: "<b>bold</b>"
		});
		assert.equal(copy.outerHTML, '<span>&lt;b&gt;bold&lt;/b&gt;</span>');
	});

	it('should be merged as html', function() {
		const node = dom(`<span>[str|as:html]</span>`);
		const copy = matchdom(node, {
			str: "test<b>bold</b><i>italic</i>test"
		});
		assert.equal(copy.outerHTML, '<span>test<b>bold</b><i>italic</i>test</span>');
	});

	it('should replace newlines with br', function() {
		const node = dom(`<p>[str|as:text]</p>`);
		const copy = matchdom(node, {
			str: "test\n\ntest\n"
		});
		assert.equal(copy.outerHTML, '<p>test<br><br>test<br></p>');
	});

	it('should be merged as if empty when undefined and first level', function() {
		const node = dom(`<span>no? [test]!</span>`);
		const copy = matchdom(node, {
			toto: 'me'
		});
		assert.equal(copy.outerHTML, '<span>no? !</span>');
	});

	it('should be merged as if empty when undefined and second level', function() {
		const node = dom(`<span>no? [test.it]!</span>`);
		const copy = matchdom(node, {
			test: {
				ot: 'oui'
			}
		});
		assert.equal(copy.outerHTML, '<span>no? !</span>');
	});

	it('should be left unmerged when first-level is undefined on a two-level path', function() {
		const node = dom(`<span>no? [test.it]!</span>`);
		const copy = matchdom(node, {
			tost: {
				it: 'oui'
			}
		});
		assert.equal(copy.outerHTML, '<span>no? [test.it]!</span>');
	});

	it('should not replace newlines of contiguous text nodes with br', function() {
		const node = dom(`<div>
		<span>[inside]</span>[outside]at
		</div>`);
		const copy = matchdom(node, {
			inside: 'this',
			outside: 'th'
		});
		assert.equal(copy.outerHTML, `<div>
		<span>this</span>that
		</div>`);
	});
});

describe('filters on text nodes', function() {
	it('should do nothing if missing', function() {
		const node = dom(`<span>[test|notfound:]</span>`);
		const copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should do nothing if multiple filters are missing', function() {
		const node = dom(`<span>[test|notfound:|notfound2:]</span>`);
		const copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should do nothing if multiple filters with parameters are missing', function() {
		const node = dom(`<span>[test|notfound:ff|notfound2:kk]</span>`);
		const copy = matchdom(node, {
			test: "yes"
		});
		assert.equal(copy.outerHTML, '<span>yes</span>');
	});

	it('should receive parameter', function() {
		const node = dom(`<span>[test|prefix:me]</span>`);
		const copy = matchdom(node, {
			test: "yes"
		}, {
			prefix: ['?', 'string', function(ctx, val, prefix) {
				return prefix + val;
			}]
		});
		assert.equal(copy.outerHTML, '<span>meyes</span>');
	});

	it('should receive parameter when multiple filters are applied', function() {
		const node = dom(`<span>[test|prefix:me|postfix:you]</span>`);
		const copy = matchdom(node, {
			test: " and "
		}, {
			prefix: function(x, val, str) {
				return str + val;
			},
			postfix: function (x, val, str) {
				return val + str;
			}
		});
		assert.equal(copy.outerHTML, '<span>me and you</span>');
	});

	it('should be merge list of nodes', function() {
		const node = dom(`<div>
			<span>no? [test]!</span>
			<div><span>no? [test2]!</span></div>
		</div>`);
		matchdom(node.querySelectorAll('span'), {
			test: "yes",
			test2: "no"
		});
		assert.equal(node.outerHTML, dom(`<div>
			<span>no? yes!</span>
			<div><span>no? no!</span></div>
		</div>`).outerHTML);
	});
});


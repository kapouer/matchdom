import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom({ filters })).merge(node, data);
};

describe('with filter', function() {
	it('should replace current node', function() {
		let node = dom(`<div><span>[test|with:*]</span></div>`);
		let copy = matchdom(node, {
			test: "mydiv",
			toto: 23
		});
		assert.equal(copy.outerHTML, '<div>mydiv</div>');
	});

	it('should remove current node and previous and next element siblings', function() {
		let node = dom(`<div><br><br><span>[test|with:+span+]</span><hr><hr></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove current node and previous and next element siblings with wildcard selector', function() {
		let node = dom(`<div><br><br><span>[test|with:+*+]</span><hr><hr></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove closest tr', function() {
		let node = dom(`<table><tbody>
			<th><td>Hello</td></tr><tr><td>[test|with:tr]</td></tr>
		</tbody></table>`);
		let copy = matchdom(node, {
			test: null // nothing is fine too
		});
		assert.equal(copy.outerHTML, dom(`<table><tbody>
			<th><td>Hello</td></tr>
		</tbody></table>`).outerHTML);
	});

	it('should remove current attribute', function() {
		let node = dom(`<div><span class="some [test|with:] [tata]">[tata]</span></div>`);
		let copy = matchdom(node, {
			// test: null,
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should replace whole attribute', function () {
		let node = dom(`<div><span class="some [test|with:] [tata]">[tata]</span></div>`);
		let copy = matchdom(node, {
			test: "toto",
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span class="toto">test</span></div>');
	});

	it('should move attribute from one node to its parent', function () {
		let node = dom(`<section><div><span class="[test|with:div|to:class]">test</span></div></section>`);
		let copy = matchdom(node, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section><div class="test"><span>test</span></div></section>');
	});


	it('should clobber other strings inside an attribute from one node to its parent', function () {
		let node = dom(`<section><div><span class="some [test|with:div|to:class]">test</span></div></section>`);
		let copy = matchdom(node, {
			test: "test"
		});
		assert.equal(
			copy.outerHTML,
			'<section><div class="test"><span>test</span></div></section>'
		);
	});

	it('should move current node from attribute to parent node', function () {
		let node = dom(`<section><div><span class="some [test|with:div]">test</span></div></section>`);
		let copy = matchdom(node, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section>test</section>');
	});

	it('should remove current node from attribute', function() {
		let node = dom(`<div><span class="some [test|with:div]">test</span></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove current node from attribute using wildcard selector', function() {
		let node = dom(`<div><div><span class="[test|with:*]">test</span></div></div>`);
		let copy = matchdom(node, {
			test: null
		});
		assert.equal(copy.outerHTML, '<div><div></div></div>');
	});

});

describe('without filter', function() {
	it('should remove current node', function() {
		let node = dom(`<div><span>test [test|without:*]</span></div>`);
		let copy = matchdom(node, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should not remove current node', function() {
		let node = dom(`<div><span>test[test|without:*]</span></div>`);
		let copy = matchdom(node, {
			test: true
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should remove current attribute', function() {
		let node = dom(`<div><span class="some[test|without:]">test</span></div>`);
		let copy = matchdom(node, {
			test: 0
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

});


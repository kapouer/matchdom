import assert from 'assert';
import { Matchdom, HTML as dom } from 'matchdom';
const matchdom = (node, data, filters) => {
	return (new Matchdom({ filters })).merge(node, data);
};

describe('widen filter', function() {
	it('should replace current node', function() {
		let node = dom(`<div><span>[test|widen:*]</span></div>`);
		let copy = matchdom(node, {
			test: "mydiv",
			toto: 23
		});
		assert.equal(copy.outerHTML, '<div>mydiv</div>');
	});

	it('should remove current node and previous and next element siblings', function() {
		let node = dom(`<div><br><br><span>[test|widen:+span+]</span><hr><hr></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove current node and previous and next element siblings with wildcard selector', function() {
		let node = dom(`<div><br><br><span>[test|widen:+*+]</span><hr><hr></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><br><hr></div>');
	});

	it('should remove closest tr', function() {
		let node = dom(`<table><tbody>
			<th><td>Hello</td></tr><tr><td>[test|widen:tr]</td></tr>
		</tbody></table>`);
		let copy = matchdom(node, {
			test: null // nothing is fine too
		});
		assert.equal(copy.outerHTML, dom(`<table><tbody>
			<th><td>Hello</td></tr>
		</tbody></table>`).outerHTML);
	});

	it('should remove current attribute', function() {
		let node = dom(`<div><span class="some [test|widen:] [tata]">[tata]</span></div>`);
		let copy = matchdom(node, {
			// test: null,
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should replace whole attribute', function () {
		let node = dom(`<div><span class="some [test|widen:] [tata]">[tata]</span></div>`);
		let copy = matchdom(node, {
			test: "toto",
			tata: "test"
		});
		assert.equal(copy.outerHTML, '<div><span class="toto">test</span></div>');
	});

	it('should move attribute from one node to its parent', function () {
		let node = dom(`<section><div><span class="[test|widen:div|to:class]">test</span></div></section>`);
		let copy = matchdom(node, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section><div class="test"><span>test</span></div></section>');
	});


	it('should clobber other strings inside an attribute from one node to its parent', function () {
		let node = dom(`<section><div><span class="some [test|widen:div|to:class]">test</span></div></section>`);
		let copy = matchdom(node, {
			test: "test"
		});
		assert.equal(
			copy.outerHTML,
			'<section><div class="test"><span>test</span></div></section>'
		);
	});

	it('should move current node from attribute to parent node', function () {
		let node = dom(`<section><div><span class="some [test|widen:div]">test</span></div></section>`);
		let copy = matchdom(node, {
			test: "test"
		});
		assert.equal(copy.outerHTML, '<section>test</section>');
	});

	it('should remove current node from attribute', function() {
		let node = dom(`<div><span class="some [test|widen:div]">test</span></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should remove current node from attribute using wildcard selector', function() {
		let node = dom(`<div><span class="[test|widen:*]">test</span></div>`);
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

});

describe('bmagnet filter', function() {
	it('should remove current node', function() {
		let node = dom(`<div><span>test [test|widen:*|to:null]</span></div>`);
		let copy = matchdom(node, {
			test: false
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});

	it('should not remove current node', function() {
		let node = dom(`<div><span>test[test|widen:*|to:null]</span></div>`);
		let copy = matchdom(node, {
			test: true
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

	it('should remove current attribute', function() {
		let node = dom(`<div><span class="some[test|widen:|to:null]">test</span></div>`);
		let copy = matchdom(node, {
			test: 0
		});
		assert.equal(copy.outerHTML, '<div><span>test</span></div>');
	});

});


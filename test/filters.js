const assert = require('assert');
const matchdom = require('../matchdom');
const dom = require('dom-template-strings');
require('dom4'); // jsdom is missing .closest



describe('join filter', function() {
	it('with space', function() {
		let node = dom`<p>[arr|join: ]</p>`;
		let copy = matchdom(node, {
			arr: ['word1', 'word2']
		});
		assert.equal(copy.outerHTML, '<p>word1 word2</p>');
	});

	it('with <br>', function() {
		let node = dom`<p>[arr|join::br]</p>`;
		let copy = matchdom(node, {
			arr: ['line1', 'line2']
		});
		assert.equal(copy.outerHTML, '<p>line1<br>line2</p>');
	});

	it('html with <br>', function() {
		let node = dom`<p>[arr|html|join::br]</p>`;
		let copy = matchdom(node, {
			arr: ['<b>line1</b>', '<i>line2</i>']
		});
		assert.equal(copy.outerHTML, '<p><b>line1</b><br><i>line2</i></p>');
	});
});

describe('slice filter', function() {
	it('should slice array with begin and end', function() {
		let node = dom`<p>[arr|slice:1:3|join: ]</p>`;
		let copy = matchdom(node, {
			arr: ['word1', 'word2', 'word3']
		});
		assert.equal(copy.outerHTML, '<p>word2 word3</p>');
	});
	it('should slice array with begin', function() {
		let node = dom`<p>[arr|slice:2|join: ]</p>`;
		let copy = matchdom(node, {
			arr: ['word1', 'word2', 'word3', 'word4']
		});
		assert.equal(copy.outerHTML, '<p>word3 word4</p>');
	});
});

describe('pad', function() {
	it('start', function() {
		let node = dom`<p>[str|padStart:3:x]</p>`;
		let copy = matchdom(node, {
			str: 'a'
		});
		assert.equal(copy.outerHTML, '<p>xxa</p>');
	});

	it('end', function() {
		let node = dom`<p>[str|padEnd:3:x]</p>`;
		let copy = matchdom(node, {
			str: 'a'
		});
		assert.equal(copy.outerHTML, '<p>axx</p>');
	});
});

describe('or', function() {
	it('should set a default value', function() {
		let node = dom`<p data-class="[yop|attr]" data-test="[vide|or:nothing|attr]">[str|or:empty] - [nul]</p>`;
		let copy = matchdom(node, {});
		assert.equal(copy.outerHTML, '<p data-class="[yop|attr]" test="nothing">empty - [nul]</p>');
	});
});

describe('eq', function() {
	it('should set another value if equal', function() {
		let node = dom`<p>[val|eq:ceci:cela]</p>`;
		let copy = matchdom(node, {val: 'ceci'});
		assert.equal(copy.outerHTML, '<p>cela</p>');
	});
});

describe('not', function() {
	it('should set to null if empty', function() {
		let node = dom`<p data-test="[val|not]">test</p>`;
		let copy = matchdom(node, {val: ''});
		assert.equal(copy.outerHTML, '<p>test</p>');
	});
});

describe('date filter', function() {
	it('toLocaleString', function() {
		let node = dom`<p>[str|date::en]</p>`;
		let copy = matchdom(node, {
			str: '2018-03-09T11:12:56.739Z'
		});
		assert.equal(copy.outerHTML, '<p>3/9/2018, 12:12:56 PM</p>');
	});

	it('getYear', function() {
		let node = dom`<p>[str|date:getFullYear]</p>`;
		let copy = matchdom(node, {
			str: '2018-03-09T11:12:56.739Z'
		});
		assert.equal(copy.outerHTML, '<p>2018</p>');
	});
});

describe('url filter', function() {
	it('should merge url query with target pathname', function() {
		let node = dom`<a href="/test" data-href="[href|url]">[title]</a>`;
		let copy = matchdom(node, {
			href: '?arg=1&val=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?arg=1&amp;val=2">anchor</a>');
	});

	it('should merge url pathname with target query', function() {
		let node = dom`<a href="/test?toto=1" data-href="[href|url]">[title]</a>`;
		let copy = matchdom(node, {
			href: '/path',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/path?toto=1">anchor</a>');
	});

	it('should overwrite target with url', function() {
		let node = dom`<a href="/test?toto=1" data-href="[href|url]">[title]</a>`;
		let copy = matchdom(node, {
			href: '/path?a=1&b=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/path?a=1&amp;b=2">anchor</a>');
	});

	it('should merge url query with partial template', function() {
		let node = dom`<a href="/test?toto=1" data-href="?id=[id|url]">[title]</a>`;
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?id=xx">anchor</a>');
	});

	it('should overwrite url pathname and query with partial template', function() {
		let node = dom`<a href="/test?toto=1" data-href="/this?id=[id|url]&amp;const=1">[title]</a>`;
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/this?id=xx&amp;const=1">anchor</a>');
	});

	it('should merge url query with partial template when repeated', function() {
		let node = dom`<div><a href="/test?toto=1" data-href="?id=[id|url]">[title|repeat]</a></div>`;
		let copy = matchdom(node, [{
			id: 'xx',
			title: 'anchor'
		}]);
		assert.equal(copy.outerHTML, '<div><a href="/test?id=xx">anchor</a></div>');
	});

	it('should be able to be called multiple times for the same attribute', function() {
		let node = dom`<div><a href="/test?toto=1" data-href="?id=[id|url]&amp;status=[status|url]">[title]</a></div>`;
		let copy = matchdom(node, {
			id: 'xx',
			title: 'anchor',
			status: "12"
		});
		assert.equal(copy.outerHTML, '<div><a href="/test?id=xx&amp;status=12">anchor</a></div>');
	});

	it('should not crash when data is not string', function() {
		let node = dom`<div><a href="/test?toto=1" data-href="?id=[id|url]">aaa</a></div>`;
		let copy = matchdom(node, {
			id: 12
		});
		assert.equal(copy.outerHTML, '<div><a href="/test?id=12">aaa</a></div>');
	});

	it('should remove current attribute', function() {
		let node = dom`<div><a data-href="/test?[test|magnet|url]">test</a></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div><a>test</a></div>');
	});

	it('should remove current node', function() {
		let node = dom`<div><a href="" data-href="[test|magnet:a|url]">test</a></div>`;
		let copy = matchdom(node, {
			// test: null
		});
		assert.equal(copy.outerHTML, '<div></div>');
	});
});


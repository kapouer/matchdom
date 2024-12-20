import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import globalJsdom from 'global-jsdom';
import {
	Matchdom,
	ArrayPlugin, DomPlugin, UrlPlugin
} from 'matchdom';

describe('url plugin', () => {

	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});

	const md = new Matchdom(ArrayPlugin, DomPlugin, UrlPlugin);

	describe('url type', () => {

		it('returns search part of the url', () => {
			const html = `<a href="/test[href|as:url|.search]">[title]</a>`;
			const copy = md.merge(html, {
				href: '/my/pathname?arg=1&val=2',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/test?arg=1&amp;val=2">anchor</a>');
		});

		it('returns pathname part of the url', () => {
			const html = `<a href="[href|as:url|.pathname]?toto=2">[title]</a>`;
			const copy = md.merge(html, {
				href: '/pathname?test=1',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/pathname?toto=2">anchor</a>');
		});

		it('returns searchParams as a query object with array values if needed', () => {
			const html = `<a href="[href|as:url|.pathname]">[href|as:url|.query.test|join:-]</a>`;
			const copy = md.merge(html, {
				href: '/pathname?test=1&test=a&toto=2'
			});
			assert.equal(copy.outerHTML, '<a href="/pathname">1-a</a>');
		});

		it('sets query part of the url', () => {
			const html = `<a href="[href|as:url|set:query.toto:2]">[title]</a>`;
			const copy = md.merge(html, {
				href: '/pathname?test=1',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/pathname?test=1&amp;toto=2">anchor</a>');
		});

		it('removes keys from query part of the url', () => {
			const html = `<a href="[href|as:url|set:-query:toto:-query:tata]">[title]</a>`;
			const copy = md.merge(html, {
				href: '/pathname?toto=1&it=3&tata=2',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/pathname?it=3">anchor</a>');
		});

		it('removes query part from the url', () => {
			const html = `<a href="[href|as:url|omit:query]">[title]</a>`;
			const copy = md.merge(html, {
				href: '/pathname?test=1',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/pathname">anchor</a>');
		});

		it('sets query part of the url with another object', () => {
			const html = `<a href="[href|as:url|assign:query:myobj]">[title]</a>`;
			const copy = md.merge(html, {
				href: '/pathname?test=1&notme=3',
				title: 'anchor',
				myobj: {
					toto: 2,
					me: null,
					notme: undefined
				}
			});
			assert.equal(copy.outerHTML, '<a href="/pathname?test=1&amp;toto=2&amp;me=">anchor</a>');
		});

		it('appends variables to query part of the url', () => {
			const html = `<a href="[href|as:url|set:+query.toto:2]">[title]</a>`;
			const copy = md.merge(html, {
				href: '/pathname?test=1&toto=1',
				title: 'anchor'
			});
			assert.equal(copy.outerHTML, '<a href="/pathname?test=1&amp;toto=1&amp;toto=2">anchor</a>');
		});

		it('use set inner expression to set query', () => {
			const html = `[href|as:url||.query|set:id:3|only:id:toto]`;
			const copy = md.merge(html, {
				href: '/mypath?test=1&toto=1'
			});
			assert.equal(copy.pathname + copy.search, '/mypath?toto=1&id=3');
		});
	});

	describe('query type', () => {
		it('converts nothing to empty string', () => {
			const html = `<a href="/test[str|as:query]">lien</a>`;
			assert.equal(
				md.merge(html, { str: "" }).outerHTML,
				'<a href="/test">lien</a>'
			);
			assert.equal(
				md.merge(html, { str: null }).outerHTML,
				'<a href="/test">lien</a>'
			);
			assert.equal(
				md.merge(html, { str: undefined }).outerHTML,
				'<a href="/test">lien</a>'
			);
			assert.equal(
				md.merge(html, {}).outerHTML,
				'<a href="/test">lien</a>'
			);
			assert.equal(
				md.merge(html, { str: {} }).outerHTML,
				'<a href="/test">lien</a>'
			);
		});

		it('converts string to URLSearchParams', () => {
			const copy = md.merge(`<a href="/test[str|as:query|set:id:3]">lien</a>`, {
				str: "?test=a&test=b"
			});
			assert.equal(copy.outerHTML, '<a href="/test?test=a&amp;test=b&amp;id=3">lien</a>');
		});

		it('converts object to URLSearchParams and outputs ?search', () => {
			const copy = md.merge(`<a href="/test[obj|as:query|set:id:3:+id:4]">lien</a>`, {
				obj: {
					test: ['a', 'b']
				}
			});
			assert.equal(copy.outerHTML, '<a href="/test?test=a&amp;test=b&amp;id=3&amp;id=4">lien</a>');
		});

		it('converts object to URLSearchParams and outputs nothing', () => {
			const copy2 = md.merge(`<a href="/test[obj|as:query|omit:test]">lien</a>`, {
				obj: {
					test: ['a', 'b']
				}
			});
			assert.equal(copy2.outerHTML, '<a href="/test">lien</a>');
		});

		it('should return a href', () => {
			const obj = {
				href: '/pathname?toto=1&it=3&tata=2'
			};
			const copy = md.merge(`[href|as:url|as:str]`, obj);
			assert.equal(copy, obj.href);
		});

		it('should return instance', () => {
			const copy = md.merge(`[obj|as:query]`, { obj: {} });
			assert.ok(copy instanceof URLSearchParams);
		});

		it('should return empty string', () => {
			const copy = md.merge(`a[obj|as:query]`, { obj: {} });
			assert.equal(copy, "a");
		});

		it('should return null when url query is empty with as:null', () => {
			const copy = md.merge(`[obj|as:query|as:null]`, { obj: {} });
			assert.equal(copy, null);
		});
	});
});

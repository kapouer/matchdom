import { strict as assert } from 'node:assert';
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

	it('returns search part of the url', () => {
		const html = `<a href="/test[href|url:search]">[title]</a>`;
		const copy = md.merge(html, {
			href: '/my/pathname?arg=1&val=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/test?arg=1&amp;val=2">anchor</a>');
	});

	it('returns pathname part of the url', () => {
		const html = `<a href="[href|url:pathname]?toto=2">[title]</a>`;
		const copy = md.merge(html, {
			href: '/pathname?test=1',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/pathname?toto=2">anchor</a>');
	});

	it('sets query part of the url', () => {
		const html = `<a href="[href|query:toto:2]">[title]</a>`;
		const copy = md.merge(html, {
			href: '/pathname?test=1',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/pathname?test=1&amp;toto=2">anchor</a>');
	});

	it('removes keys from query part of the url', () => {
		const html = `<a href="[href|query:-toto:-tata]">[title]</a>`;
		const copy = md.merge(html, {
			href: '/pathname?toto=1&it=3&tata=2',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/pathname?it=3">anchor</a>');
	});

	it('removes query part from the url', () => {
		const html = `<a href="[href|query:]">[title]</a>`;
		const copy = md.merge(html, {
			href: '/pathname?test=1',
			title: 'anchor'
		});
		assert.equal(copy.outerHTML, '<a href="/pathname">anchor</a>');
	});

	it('sets query part of the url with another object', () => {
		const html = `<a href="[href|query:myobj]">[title]</a>`;
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

	it('appends query part of the url with another object', () => {
		const html = `<a href="[href|query:+myobj]">[title]</a>`;
		const copy = md.merge(html, {
			href: '/pathname?test=1&toto=1',
			title: 'anchor',
			myobj: {
				toto: 2
			}
		});
		assert.equal(copy.outerHTML, '<a href="/pathname?test=1&amp;toto=1&amp;toto=2">anchor</a>');
	});
});

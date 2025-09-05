import { strict as assert } from 'node:assert';
import { describe, it, before, after } from 'node:test';
import globalJsdom from 'global-jsdom';
import {
	Matchdom, StringPlugin,
	DomPlugin, DatePlugin,
	TextPlugin,
	ArrayPlugin
} from 'matchdom';

describe('date', () => {

	before(function () {
		this.jsdom = globalJsdom();
	});
	after(function () {
		this.jsdom();
	});
	describe('with dom', () => {
		const md = new Matchdom(DatePlugin, DomPlugin, ArrayPlugin);

		it('toLocaleString', () => {
			const html = `<p>[str|locales:fr|date:]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>09/03/2018 12:12:56</p>');
		});

		it('full date', () => {
			assert.equal(
				md.merge(`<p>[str|locales:en|date:full]</p>`, {
					str: '2018-03-09T11:12:56.739Z'
				}).outerHTML,
				'<p>Friday, March 9, 2018 at 12:12 PM</p>'
			);
			assert.equal(
				md.merge(`<p>[str|locales:fr|date:full]</p>`, {
					str: '2018-03-09T11:12:56.739Z'
				}).outerHTML,
				'<p>vendredi 9 mars 2018 à 12:12</p>'
			);
		});

		it('undefined date should not be merged', () => {
			const html = `<p>[data.stamp|locales:en|date:M]</p>`;
			md.debug = true;
			const copy = md.merge(html, {});
			assert.equal(copy.outerHTML, '<p>[data.stamp|locales:en|date:M]</p>');
		});

		it('null date should stay null', () => {
			const html = `<p>[data.stamp|locales:en|date:M]</p>`;
			md.debug = true;
			const copy = md.merge(html, {
				data: {}
			});
			assert.equal(copy.outerHTML, '<p></p>');
		});

		it('complex format', () => {
			const html = `<p>[str|locales:fr|date:day:D:month:Y:h:m]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>vendredi 9 mars 2018 à 12:12</p>');
		});

		it('adds time', () => {
			const html = `<p>[str|clock:3:D|locales:fr|date:date]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>12/03/2018</p>');
		});

		it('accepts "now" as keyword', () => {
			const html = `<p>[str|locales:fr-FR|date:time]</p>`;
			const now = new Date();
			const copy = md.merge(html, {
				str: 'now'
			});
			assert.equal(copy.outerHTML, `<p>${now.toLocaleTimeString('fr-FR')}</p>`);
		});

		it('weekday', () => {
			const html = `<p>[str|date:weekday]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>5</p>');
		});

		it('days', () => {
			const html = `<p>[str|date:days]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>67</p>');
		});

		it('weeks', () => {
			const html = `<p>[str|date:weeks]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>10</p>');
		});

		it('getYear', () => {
			const html = `<p>[str|date:Y]</p>`;
			const copy = md.merge(html, {
				str: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>2018</p>');
		});

		it('formats range', () => {
			const html = `<p>[range|locales:es:fr|date:date]</p>`;
			const copy = md.merge(html, {
				range: ['2018-03-09T11:12:56.739Z', '2018-03-11']
			});
			assert.equal(copy.outerHTML, '<p>9/3/2018 – 11/3/2018</p>');
		});

		it('formats range with single date', () => {
			const html = `<p>[range|date:date]</p>`;
			const copy = md.merge(html, {
				range: '2018-03-09T11:12:56.739Z'
			});
			assert.equal(copy.outerHTML, '<p>3/9/2018</p>');
		});

		it('formats range with a pair of dates', () => {
			const html = `<p>[range|locales:fr|date:Y]</p>`;
			assert.equal(md.merge(html, {
				range: ['2018', '2019']
			}).outerHTML, '<p>2018–2019</p>');
			assert.equal(md.merge(html, {
				range: ['2018', '2018']
			}).outerHTML, '<p>2018</p>');
		});

		it('formats range with a pair of integer dates', () => {
			const html = `<p>[range|locales:fr|date:Y]</p>`;
			assert.equal(md.merge(html, {
				range: [2018, 2019]
			}).outerHTML, '<p>2018–2019</p>');
			assert.equal(md.merge(html, {
				range: [2018, 2018]
			}).outerHTML, '<p>2018</p>');
		});

		it('formats range with a pair of dynamic dates', () => {
			const html = `<p>[from|as:array|push:[to]|locales:fr|date:Y]</p>`;
			const copy = md.merge(html, {
				from: '2018',
				to: '2019'
			});
			assert.equal(copy.outerHTML, '<p>2018–2019</p>');
		});

		it('formats range with wrong dates', () => {
			const html = `<p>[range|locales:fr|date:date]</p>`;
			const copy = md.merge(html, {
				range: ['2018-03-11', '2018-03-09',]
			});
			assert.equal(copy.outerHTML, '<p>11/03/2018 – 09/03/2018</p>');
		});

	});

	describe('with text', () => {
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

});

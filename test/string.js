import { strict as assert } from 'node:assert';
import { Matchdom, StringPlugin, DomPlugin, DatePlugin, TextPlugin } from 'matchdom';

describe('pre', () => {
	const md = new Matchdom(StringPlugin, DomPlugin);

	it('should not prepend string if value is empty', () => {
		const html = `<a class="test [button|pre:ui ]">test</a>`;
		const copy = md.merge(html, { button: '' });
		assert.equal(copy.outerHTML, '<a class="test">test</a>');
	});
	it('should prepend string if value is not empty', () => {
		const html = `<a class="[button|pre:ui ]">test</a>`;
		const copy = md.merge(html, { button: 'button' });
		assert.equal(copy.outerHTML, '<a class="ui button">test</a>');
	});
});

describe('post', () => {
	const md = new Matchdom(StringPlugin, DomPlugin);

	it('should not append string if value is empty', () => {
		const html = `<a class="test [size|post: wide]">test</a>`;
		const copy = md.merge(html, { size: '' });
		assert.equal(copy.outerHTML, '<a class="test">test</a>');
	});
	it('should append string if value is not empty', () => {
		const html = `<a class="test [size|post: wide]">test</a>`;
		const copy = md.merge(html, { size: 'ten' });
		assert.equal(copy.outerHTML, '<a class="test ten wide">test</a>');
	});
});

describe('case', () => {
	const md = new Matchdom(StringPlugin, DomPlugin);

	it('should upper case', () => {
		const str = 'minusculés';
		const copy = md.merge("[str|case:up]", { str });
		assert.equal(copy, str.toUpperCase());
	});
	it('should lower case', () => {
		const str = 'ÉCRASÉS';
		const copy = md.merge("[str|case:low]", { str });
		assert.equal(copy, str.toLowerCase());
	});
	it('should capitalize sentences', () => {
		const str = 'à 0.5° il ne gèle pas.\nmais à .0 il gèle.';
		const copy = md.merge("[str|case:caps]", { str });
		assert.equal(copy, 'À 0.5° il ne gèle pas. Mais à .0 il gèle.');
	});
});

describe('trim', () => {
	const md = new Matchdom(StringPlugin, DomPlugin);
	it('out', () => {
		const html = `<span>-[test|trim:out]-</span>`;
		const copy = md.merge(html, { test: ' a ' });
		assert.equal(copy.outerHTML, '<span>-a-</span>');
	});

	it('default', () => {
		const html = `<span>-[test|trim:]-</span>`;
		const copy = md.merge(html, { test: ' a ' });
		assert.equal(copy.outerHTML, '<span>-a-</span>');
	});

	it('start', () => {
		const html = `<span>-[test|trim:start]-</span>`;
		const copy = md.merge(html, { test: ' a ' });
		assert.equal(copy.outerHTML, '<span>-a -</span>');
	});

	it('end', () => {
		const html = `<span>-[test|trim:end]-</span>`;
		const copy = md.merge(html, { test: ' a ' });
		assert.equal(copy.outerHTML, '<span>- a-</span>');
	});

	it('all', () => {
		const html = `<span>-[test|trim:all]-</span>`;
		const copy = md.merge(html, { test: ' a b\n\tc ' });
		assert.equal(copy.outerHTML, '<span>-abc-</span>');
	});

	it('line', () => {
		const html = `<span>-[test|trim:line]-</span>`;
		const copy = md.merge(html, { test: ' a\nb\n\nc ' });
		assert.equal(copy.outerHTML, '<span>- a\nb\nc -</span>');
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



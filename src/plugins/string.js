export const types = {
	pattern(ctx, pat, wildcards) {
		if (!pat) return null;
		return new RegExp('^' + pat.replaceAll(/[*+?]/g, c => {
			const cla = wildcards.shift();
			if (!cla) return c;
			return `([${cla}]${c})`;
		}) + '$');
	}
};
export const formats = {
	as: {
		flag(ctx, code) {
			if (!code) return code;
			code = code.toUpperCase();
			const reg = new Intl.DisplayNames(undefined, { type: 'region' });
			if (!reg.of(code)) return null;
			return String.fromCodePoint(
				...code.split('').map(char => 127397 + char.charCodeAt())
			);
		},
		language(ctx, code) {
			if (!code) return code;
			const names = new Intl.DisplayNames(ctx.locales, {
				type: 'language'
			});
			return names.of(code);
		}
	}
};
export const filters = {
	case: ['?', 'up|low|caps|kebab', (ctx, val, how) => {
		if (!val) return ctx.raw;
		val = val.toString();
		switch (how) {
			case "up":
				return val.toUpperCase();
			case "low":
				return val.toLowerCase();
			case "caps":
				return val.split(/\.\s+/).map(s => {
					return s.replace(/^\p{Letter}/u, c => c.toUpperCase());
				}).join('. ');
			case "kebab":
				return val.replace(/(\p{Lowercase_Letter})(\p{Uppercase_Letter})/ug, "$1-$2").toLowerCase();
		}
	}],
	trim: ['?', 'all|line|start|end|out|', (ctx, val, how) => {
		if (!val) return ctx.raw;
		switch (how) {
			case 'all':
				return val.replace(/\s/gm, '');
			case 'line':
				return val.replace(/(\r?\n)\r?\n/gm, '$1');
			case 'start':
				return val.trimStart();
			case 'end':
				return val.trimEnd();
			case 'out':
			default:
				return val.trim();
		}
	}],
	pre: ['?', 'str', (ctx, val, str) => {
		if (val == null || val === "") return ctx.raw;
		return str + val;
	}],
	post: ['?', 'str', (ctx, val, str) => {
		if (val == null || val === '') return ctx.raw;
		return val + str;
	}],
	enc: ['?', 'base64|base64url|hex|url|path', (ctx, str, type) => {
		if (!str) return ctx.raw;
		str = str.toString();
		switch (type) {
			case "base64": return btoa(str);
			case "base64url": return btoa(str).replace(/=*$/, '');
			case "url": return encodeURIComponent(str);
			case "hex": return Array.from(
				new TextEncoder().encode(str),
				i => i.toString(16).padStart(2, "0")
			).join('');
			case "path": return str.replace(/\./g, '%2E');
		}
	}],
	dec: ['str', 'base64|base64url|hex|url|path', (x, str, type) => {
		switch (type) {
			case "base64url":
			case "base64": return atob(str);
			case "url": return decodeURIComponent(str);
			case "hex": return new TextDecoder().decode(
				new Uint8Array(Array.from(str.match(/.{1,2}/g), i => parseInt(i, 16)))
			);
			case "path": return str.replace(/%2E/g, '.');
		}
	}],
	split: ['?', 'str', (x, str, tok) => {
		if (!str) return [];
		return str.split(tok);
	}],
	parts: ['?', 'str', 'int?', 'int?', (ctx, val, tok, a, b) => {
		if (typeof val != "string" || a == null) return ctx.raw;
		if (b == null) b = undefined;
		return val.split(tok).slice(a, b).join(tok);
	}],
	test: ['?', 'pattern*', (ctx, val, re) => {
		return re.test(val);
	}],
	match: ['?', 'pattern*', (ctx, val, re) => {
		return re.exec(val)?.slice(1);
	}],
	pad: ['str', 'int', 'str', (ctx, val, n, str) => {
		if (n > 0) return val.padStart(n, str);
		else if (n < 0) return val.padEnd(-n, str);
		else return val;
	}]
};

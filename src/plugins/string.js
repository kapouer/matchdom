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
export const filters = {
	case: ['?', 'up|low|caps', (ctx, val, how) => {
		if (!val) return ctx.raw;
		val = val.toString();
		if (how == "up") {
			return val.toUpperCase();
		} else if (how == "low") {
			return val.toLowerCase();
		} else if (how == "caps") {
			return val.split(/\.\s+/).map(s => {
				return s.replace(/^\p{Letter}/u, c => c.toUpperCase());
			}).join('. ');
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
	enc: ['?', 'base64|base64url|hex|url', (ctx, str, type) => {
		if (!str) return ctx.raw;
		str = str.toString();
		switch (type) {
			case "base64": return btoa(str);
			case "base64url": return btoa(str).replace(/=*$/, '');
			case "url": return encodeURIComponent(str);
			case "hex": return Array.from(str).map(c => {
				return c.charCodeAt(0) < 128 ?
					c.charCodeAt(0).toString(16) :
					encodeURIComponent(c).replace(/%/g, '').toLowerCase();
			}).join('');
		}
	}],
	dec: ['str', 'base64|base64url|hex|url', (x, str, type) => {
		switch (type) {
			case "base64url":
			case "base64": return atob(str);
			case "url": return decodeURIComponent(str);
			case "hex": return decodeURIComponent('%' + str.match(/.{1,2}/g).join('%'));
		}
	}],
	split: ['?', 'str', (x, str, tok) => {
		if (!str) return [];
		return str.split(tok);
	}],
	slice: ['?', 'int?', 'int?', (ctx, val, a, b) => {
		if (!val || a == null) return ctx.raw;
		if (b == null) b = undefined;
		if (val.slice) return val.slice(a, b);
		else return val;
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
	}]
};

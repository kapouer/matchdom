class RelativeURL extends URL {
	static origin = typeof document !== 'undefined' ? document.location : new URL('null://');

	constructor(str) {
		super(str, RelativeURL.origin);
	}
	toString() {
		if (this.host == RelativeURL.origin.host) {
			return this.pathname + this.search + this.hash;
		} else {
			return super.toString();
		}
	}
}

export const types = {
	url(ctx, str) {
		if (str == null) return str;
		return new RelativeURL(str);
	}
};

export const filters = {
	url: ['url', 'path', '?', (ctx, url, path, value) => {
		if (path[0] == "query") {
			if (path.length == 1) {
				if (value === undefined) {
					return url.search.substring(1);
				} else {
					if (value != null) {
						const h = new URL('/' + (value.startsWith('?') ? '' : '?') + value, url);
						for (const [key, val] of h.searchParams) {
							url.searchParams.append(key, val);
						}
					}
					return url;
				}
			} else {
				const key = path.slice(1).join('.');
				const list = url.searchParams.getAll(key);
				if (list.length == 0) return null;
				if (list.length == 1) return list[0];
				else return list;
			}
		} else {
			return url[path[0]];
		}
	}],
	query: ['url', 'any', 'any*', (ctx, url, str, ...params) => {
		const usp = url.searchParams;
		if (params.length == 0) {
			if (str == "") {
				url.search = "";
				return url;
			} else if (!str.startsWith('-')) {
				const add = str.startsWith('+');
				const obj = ctx.filter(ctx.data, 'get', add ? str.slice(1) : str);
				if (obj) for (const [key, val] of Object.entries(obj)) {
					const str = val == null ? '' : val;
					if (val === undefined) usp.delete(key);
					else if (add) usp.append(key, str);
					else usp.set(key, str);
				}
				return url;
			}
		}
		params.unshift(str);
		for (let i = 0; i < params.length; i++) {
			const p = params[i];
			params[i] = p.replace(/\./g, '%2E');
			if (!p.startsWith('-')) i += 1;
		}
		ctx.filter(usp, 'set', ...params);
		return url;
	}]
};

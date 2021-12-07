export const filters = {
	case: ['?', 'up|low|caps', (x, val, how) => {
		if (!val) return val;
		val = val.toString();
		if (how == "up") {
			return val.toUpperCase();
		} else if (how == "low") {
			return val.toLowerCase();
		} else if (how == "caps") {
			return val.split(/\.\s+/).map((s) => {
				return s.replace(/^\p{Letter}/u, (c) => c.toUpperCase());
			}).join('. ');
		}
	}],
	pre: ['?', 'str', (x, val, str) => {
		if (val == null || val === "") return val;
		return str + val;
	}],
	post: ['?', 'str', (x, val, str) => {
		if (val == null || val === '') return val;
		return val + str;
	}],
	enc: ['?', 'base64|base64url|hex|url', (x, str, type) => {
		if (!str) return str;
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
		if (!str) return str;
		switch (type) {
			case "base64url":
			case "base64": return atob(str);
			case "url": return decodeURIComponent(str);
			case "hex": return decodeURIComponent('%' + str.match(/.{1,2}/g).join('%'));
		}
	}]
};

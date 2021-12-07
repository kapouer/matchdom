export const types = {
	date(ctx, val) {
		if (val == null) return val;
		if (/^\d{1,2}:\d\d(:\d\d)?$/.test(val)) {
			val = '1970-01-01T' + val + 'Z';
		}
		const date = val == "now" ? new Date() : new Date(val);
		if (Number.isNaN(date.getTime())) return null;
		else return date;
	}
};

export const filters = {
	date: ['date', 'str*', (ctx, date, ...list) => {
		const com = list[0];
		switch (com) {
			case "isotime":
				return date.toISOString().split('T').pop().split('.').shift();
			case "isodate":
				return date.toISOString().split('T').shift();
			case "iso":
				return date.toISOString();
			case "time":
				return date.toLocaleTimeString(ctx.getLang());
			case "date":
				return date.toLocaleDateString(ctx.getLang());
		}
		const p = {};
		const n = 'narrow';
		const s = 'short';
		const l = 'long';
		const num = 'numeric';
		const dig = '2-digit';
		for (const tok of list) {
			switch (tok) {
				case 'd': p.weekday = n; break;
				case 'da': p.weekday = s; break;
				case 'day': p.weekday = l; break;
				case 'Y': p.year = num; break;
				case 'YY': p.year = dig; break;
				case 'mo': p.month = n; break;
				case 'mon': p.month = s; break;
				case 'month': p.month = l; break;
				case 'M': p.month = num; break;
				case 'MM': p.month = dig; break;
				case 'D': p.day = num; break;
				case 'DD': p.day = dig; break;
				case 'H': p.hour = num; break;
				case 'HH': p.hour = dig; break;
				case 'm': p.minute = num; break;
				case 'mm': p.minute = dig; break;
				case 's': p.second = num; break;
				case 'ss': p.second = dig; break;
				case 'tz': p.timeZoneName = s; break;
				case 'timezone': p.timeZoneName = l; break;
				default:
					if (/\w+\/\w+/.test(tok)) p.timeZone = tok;
					else console.warn("Unknown date filter param", tok);
					break;
			}
		}
		try {
			return date.toLocaleString(ctx.getLang(), p);
		} catch (err) {
			if (p.timeZone && p.timeZone != "UTC") {
				p.timeZone = "UTC";
				return date.toLocaleString(ctx.getLang(), p) + " UTC";
			} else {
				throw err;
			}
		}
	}],

	clock: ['date', 'int', 'Y|M|D|h|m|s?D', (ctx, date, num, unit) => {
		const name = {
			D: 'Date',
			M: 'Month',
			Y: 'FullYear',
			h: 'Hours',
			m: 'Minutes',
			s: 'Seconds'
		}[unit];
		date[`setUTC${name}`](date[`getUTC${name}`]() + num);
		return date;
	}]
};

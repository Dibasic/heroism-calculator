const DEFAULTS_XP = {
	mode: 'xp'
	, data: {
		orange  : { value: 1, default: true }
		, red   : { value: 15 }
		, blue  : { value: 30 }
		, green : { value: 60 }
		, cyan  : { value: 120 }
		, pink  : { value: 240 }
	}
};

const DEFAULTS_HEROISM = {
	mode: 'heroism'
	, data: {
		yellow  : { value: 1, default: true }
		, red   : { value: 5 }
		, blue  : { value: 10 }
		, green : { value: 25 }
		, brown : { value: 50 }
		, pink  : { value: 100 }
		, cyan  : { value: 200 }
	}
};

function expected(types) {
	// clone objects, and give the key as a label why not
	types = Object.keys(types).map((k) => { return { name: k, chance: types[k].chance, value: types[k].value }; });
	types = types.sort((left, right) => right.value - left.value);

	let prob = 1.0; // prob: probability we reach the current step in the first place
	let expected_value = 0;
	types.forEach((curr) => { // curr.chance: probability that we stop at the current step, if reached
		var prob_stop = prob * curr.chance; // prob_stop: probability we have reached the current step and then stop at it
		var step_value = prob_stop * curr.value; // step_value: this step's contribution to the total expected value
		prob -= prob_stop;
		expected_value += step_value;
	});

	return expected_value;
}

$(document).ready(() => {
	$('#status').text('Setting up...')
	load();
});

function getData() {
	let data = $('#calc .row')
		.toArray()
		.map(row => Array.from(row.children)
		.filter(elem => elem.nodeName === "INPUT"))
		.map(row => row.reduce((obj, elem) => { obj[elem.name] = elem.value; return obj; }, {}))
		// .map(row => { Object.keys(row).filter(key => ["name", "value"].indexOf(key) < 0).forEach(key => { delete row[key]; }); return row; })
		.reduce((obj, row) => { obj[row.name] = row; delete row.name; return obj; }, {})
	data[Object.keys(data)[0]].default = true;
	return {
		mode: $('#mode').val()
		, data: data
	};
}

function save() {
	localStorage.setItem('heroism_calculator', JSON.stringify(getData()));
	$('#status').text('Saved');
}

function drawForm(data) {
	console.log('drawForm', data);
	function drawRow(data, key) {
		return `
		<div class="row">
			<label>Name: </label><input name="name" value="${key}" disabled />
			<label>Chance:</label>
			<input name="chance" value="${data[key].default ? "100%" : (data[key].chance || "0%")}"${data[key].default ? " disabled" : ""} />
			<label>Chance upgrade cost:</label>
			<input name="chance_cost" value="${data[key].chance_cost || "0"}"${data[key].default ? " disabled" : ""} />
			<label>Value:</label>
			<input name="value" value="${data[key].value}" />
			<label>Value upgrade cost:</label>
			<input name="value_cost" value="${data[key].value_cost || "0"}" />
			<label>Value increment:</label>
			<input name="value_increment" value="${data[key].value_increment || data[key].value}" />
		</div>`;
	};
	let html = '';
	for (key in data.data) {
		html += drawRow(data.data, key);
	}
	$('#calc').html(html);
	$('#mode').val(data.mode);

	$('#calc input').change((e) => {
		calculate(e.target);
	});
	calculate();
}

function load() {
	let data = JSON.parse(localStorage.getItem('heroism_calculator')) || DEFAULTS_XP;
	drawForm(data);

	$('#status').text('Ready');
};

function mode() {
	let data;
	if ($('#mode').val() === 'xp') {
		data = DEFAULTS_HEROISM;
	}
	else if ($('#mode').val() === 'heroism') {
		data = DEFAULTS_XP;
	}
	if (data) {
		drawForm(data);
	}
	else {
		$('#status').text('Mode not recognized.');
	}
}

const validate = {
	percent: (str) => {
		return /^\d*%?$/.test(str) || /^\.\d+$/.test(str);
	},
	chance: (str) => {
		if (!validate.percent(str)) return false;
		let value = transform.percent_number(str);
		return value >= 0 && value <= 0.91;
	},
	suffix: (str) => {
		return /^\d*(?:\.\d*)?[KMBT]?$/i.test(str);
	},
	input: (target) => {
		if (target) {
			let valid = true;
			let suggested = target.value;
			switch (target.name) {
				case "chance":
					valid = valid && validate.chance(target.value);
					suggested = transform.percent_format(target.value);
					break;
				case "chance":
				case "value":
				case "chance_cost":
				case "value_cost":
				case "value_increment":
					valid = valid && validate.suffix(target.value);
					suggested = transform.suffix_format(target.value);
					break;
			}
			valid ? target.classList.remove('warning') : target.classList.add('warning');
			target.value = suggested;
		}
	}
};

const transform = {
	percent_format: (str) => {
		if (!validate.percent(str)) return str;
		return transform.number_percent(transform.percent_number(str));
	},
	suffix_format: (str) => {
		if (!validate.suffix(str)) return str;
		return transform.number_suffix(transform.suffix_number(str));
	},
	percent_number: (str) => {
		if (!validate.percent(str)) return;
		let val = Number(str.replace('%', ''));
		if (val > 1) val /= 100;
		return val;
	},
	number_percent: (num) => (num * 100).toFixed() + '%',
	suffix_number: (str) => {
		if (validate.suffix(str) && str.toString().length) {
			let int = Number(str);
			if (int) return int;

			let multiplier = 1;
			switch (str[str.length - 1].toUpperCase()) {
				case 'K': multiplier = 1000; break;
				case 'M': multiplier = Math.pow(10, 6); break;
				case 'B': multiplier = Math.pow(10, 9); break;
				case 'T': multiplier = Math.pow(10, 12); break;
			}
			return Number(str.substring(0, str.length - 1)) * multiplier;
		}
	},
	number_suffix: (num) => {
		if (!num) return '';
		if (num >= Math.pow(10, 15)) {	
			return Math.round(num / Math.pow(10, 12)) + 'T';
		}
		if (num >= 10000) {
			let order = Math.min(Math.floor(Math.log10(num) / 3), 4);
			num = (num / Math.pow(10, order * 3)).toPrecision(4);
			// num = num.toString().replace(/(...)$/, '.$1')
			return num + 'KMBT'[order - 1];
		}
		return num.toString();
	}
}

function calculate(target) {

	if (target) validate.input(target);
	else document.querySelectorAll('#calc input:not(:disabled)').forEach(validate.input);

	let data = getData().data, curr_types = {};
	Object.keys(data).forEach(key => {
		let row = data[key];
		row = {
			chance: validate.percent(row.chance) ? transform.percent_number(row.chance) : 0
			, value: validate.suffix(row.value) ? transform.suffix_number(row.value) : 1
			, chance_cost: validate.suffix(row.chance_cost) ? transform.suffix_number(row.chance_cost) : 1
			, value_cost: validate.suffix(row.value_cost) ? transform.suffix_number(row.value_cost) : 1
			, value_increment: validate.suffix(row.value_increment) ? transform.suffix_number(row.value_increment) : 1
		};
		curr_types[key] = row;
	});

	let curr_expected = expected(curr_types);
	$('#expected').html(`<strong>Expected value now: ${curr_expected.toFixed(2)}</strong><br/>`);

	Object.keys(curr_types).forEach(function(k) {
		if (curr_types[k].chance < .909) { // <.91
			let new_chance = curr_types[k].chance + ($('#mode').val() == "xp" ? .07 : .02);
			let new_types = JSON.parse(JSON.stringify(curr_types)); // deep copy
			new_types[k].chance = new_chance;
			let new_expected = expected(new_types);
			// console.log(`Expected value if increasing ${k} chance from ${curr_types[k].chance*100}% to ${new_chance*100}%: ${new_expected}. This represents a marginal increase in value of ${new_expected - curr_expected}`);
			curr_types[k].chance_upgrade = new_expected - curr_expected;
		}

		let new_value = curr_types[k].value + (curr_types[k].value_increment || 1);
		if (curr_types[k].chance > 0) {
			let new_types = JSON.parse(JSON.stringify(curr_types)); // deep copy
			new_types[k].value = new_value;
			let new_expected = expected(new_types);
			// console.log(`Expected value if increasing ${k} value from ${curr_types[k].value} to ${new_value}: ${new_expected}. This represents a marginal increase in value of ${new_expected - curr_expected}`);
			curr_types[k].value_upgrade = new_expected - curr_expected;
		}
	});

	// console.log('curr_types:', curr_types)

	var best_upgrades = Object.keys(curr_types).map((k) => { return { type: k, upgrade: 'chance', value: curr_types[k].chance_upgrade, cost: curr_types[k].chance_cost }; })
		.concat(Object.keys(curr_types).map((k) => { return { type: k, upgrade: 'value', value: curr_types[k].value_upgrade, cost: curr_types[k].value_cost }; }))
		.filter((row) => typeof row.value === "number") // filter out impossible upgrades, which we do not define, and anything else that looks fucked up
		.map((row) => {
			if (row.value && row.cost) row.ratio = row.value / row.cost;
			return row;
		})
		.sort((left, right) => {
			if (right.ratio || left.ratio) return (right.ratio || -1) - (left.ratio || -1);
			return right.value - left.value;
		});

	best_upgrades.forEach((row) => {
		if (row.value && row.cost) {
			row.ratio = (row.chance_upgrade || row.value_upgrade) / row.cost;
		}
	});

	// console.log(best_upgrades)

	$('#upgrades').html(best_upgrades.map((row) => `<span><strong>+${row.value.toFixed(2)}</strong> for <strong>${transform.number_suffix(row.cost) || "?"}</strong> XP: increase <strong>${row.type} ${row.upgrade}</strong>${row.ratio ? ` ... a cost ratio of ${row.ratio}` : ''}</span>`).join('<br />'));

};

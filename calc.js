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
	$('#calc input').change((e) => {
		calculate(e.target);
	});
	calculate();
});


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

	/*let*/  curr_types = {
		// orange: { chance:1, value:18 },
		// red: { chance:0.63, value:3706 },
		// blue: { chance:0.63, value:5853 },
		// green: { chance:0.84, value:724 },
		// cyan: { chance:0.49, value:1084 },
		// pink: { chance:0.21, value:964 },
	};

	Array.from(document.querySelectorAll('#calc input[name="name"]'))
		.map(elem => elem.parentElement)
		.map(row => row.children)
		.forEach(group => {
			let group_data = {};
			Array.from(group)
				.filter(child => child.nodeName === "INPUT")
				.forEach(input => {
					// console.log(input.name);
					switch (input.name) {
						case "name":
							group_name = input.value || '???';
							break;
						case "chance":
							group_data[input.name] = validate.percent(input.value) ? transform.percent_number(input.value) : 0;
							break;
						case "value":
						case "chance_cost":
						case "value_cost":
						case "value_increment":
							group_data[input.name] = validate.suffix(input.value) ? transform.suffix_number(input.value) : 1;
							break;
						default:
							// In case we throw anything else into an input
							group_data[input.name] = input.value;
					}
				});
			curr_types[group_name] = group_data;
		});

	let curr_expected = expected(curr_types);
	$('#expected').html(`<strong>Expected value now: ${curr_expected.toFixed(2)}</strong><br/>`);

	Object.keys(curr_types).forEach(function(k) {
		if (curr_types[k].chance < .909) { // <.91
			let new_chance = curr_types[k].chance + .07;
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

	console.log('curr_types:', curr_types)

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

	console.log(best_upgrades)

	$('#upgrades').html(best_upgrades.map((row) => `<span><strong>+${row.value.toFixed(2)}</strong> for <strong>${transform.number_suffix(row.cost) || "?"}</strong> XP: increase <strong>${row.type} ${row.upgrade}</strong>${row.ratio ? ` ... a cost ratio of ${row.ratio}` : ''}</span>`).join('<br />'));

};
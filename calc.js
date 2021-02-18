var chance_increment = .07;
var value_increment = {
	orange: 1,
	// red: 15,
	red: 409,
	// blue: 30
	blue: 727,
	green: 60,
	cyan: 120,
	pink: 240
}

function expected(types) {
	console.log(types)
	// clone objects, and give the key as a label why not
	types = Object.keys(types).map((k) => { return { name: k, chance: types[k].chance, value: types[k].value }; });
	types = types.sort((left, right) => right.value - left.value);
	// console.log('Sorted types:', types);

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
// h
// var curr = [
// 	{ name:"Yellow", chance:1, value:20 },
// 	{ name:"Red", chance:0.3, value:90 },
// 	{ name:"Blue", chance:0.24, value:120 }
// ];
// xp
// let curr = [
// 	{ name:"Orange", chance:1, value:18 },
// 	{ name:"Red", chance:0.63, value:3706 },
// 	{ name:"Blue", chance:0.63, value:5853 },
// 	{ name:"Green", chance:0.84, value:724 },
// 	{ name:"Cyan", chance:0.49, value:1084 },
// 	{ name:"Pink", chance:0.21, value:964 },
// ];
let curr_types = {
	orange: { chance:1, value:18 },
	red: { chance:0.63, value:3706 },
	blue: { chance:0.63, value:5853 },
	green: { chance:0.84, value:724 },
	cyan: { chance:0.49, value:1084 },
	pink: { chance:0.21, value:964 },
};
let curr_expected = expected(curr_types);
console.log(`Expected value now: ${curr_expected}`);

Object.keys(curr_types).forEach(function(k) {
	let new_chance = curr_types[k].chance + chance_increment;
	if (new_chance <= 1) {
		let new_types = JSON.parse(JSON.stringify(curr_types)); // deep copy
		new_types[k].chance = new_chance;
		let new_expected = expected(new_types);
		// console.log(`Expected value if increasing ${k} chance from ${curr_types[k].chance*100}% to ${new_chance*100}%: ${new_expected}. This represents a marginal increase in value of ${new_expected - curr_expected}`);
		curr_types[k].chance_upgrade = new_expected - curr_expected;
	}

	let new_value = curr_types[k].value + (value_increment[k] || 1);
	{
		let new_types = JSON.parse(JSON.stringify(curr_types)); // deep copy
		new_types[k].value = new_value;
		let new_expected = expected(new_types);
		// console.log(`Expected value if increasing ${k} value from ${curr_types[k].value} to ${new_value}: ${new_expected}. This represents a marginal increase in value of ${new_expected - curr_expected}`);
		curr_types[k].value_upgrade = new_expected - curr_expected;
	}
});

console.log(curr_types)

var best_upgrades = Object.keys(curr_types).map((k) => { return { type: k, upgrade: 'chance', value: curr_types[k].chance_upgrade }; })
	.concat(Object.keys(curr_types).map((k) => { return { type: k, upgrade: 'value', value: curr_types[k].value_upgrade }; }))
	.filter((row) => typeof row.value === "number") // filter out impossible upgrades, which we do not define, and anything else that looks fucked up
	.sort((left, right) => right.value - left.value);

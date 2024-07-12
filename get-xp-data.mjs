import * as fs from 'node:fs/promises';

const CHARACTER_NAME = 'Mathias Bynens';
const PATH_TO_SNAPSHOT = './data/_highscore-snapshot.json';

const pad = (number, length) => {
	return String(number).padStart(length, ' ');
};

const stringifyHistory = (history) => {
	const buffer = [];
	for (const [date, entry] of Object.entries(history)) {
		buffer.push(
			`\t${JSON.stringify(date)}: { "rank": ${
				pad(entry.rank, 3)}, "level": ${
				pad(entry.level, 4)}, "experience": ${
				pad(entry.experience, 11)} }`
		);
	}
	const json = `{\n${buffer.join(',\n')}\n}\n`;
	return json;
};

const stringify = (data) => {
	return JSON.stringify(data, null, '\t') + '\n';
};

const matchesSnapshot = async (todaysSnapshot) => {
	const yesterdaysSnapshot = JSON.parse(await fs.readFile(PATH_TO_SNAPSHOT, 'utf8'));
	return JSON.stringify(yesterdaysSnapshot) === JSON.stringify(todaysSnapshot);
};

const getHighscoreData = async (page = 1) => {
	const url = `https://dev.tibiadata.com/v4/highscores/Vunira/experience/paladins/${page}`;
	const response = await fetch(url);
	const data = await response.json();

	// The `timestamp` changes for every API request, and the
	// `highscore_age` potentially does too. Remove them to simplify
	// comparing snapshots.
	delete data.highscores.highscore_age;
	delete data.information.timestamp;

	if (page === 1) {
		const isLikelyStale = await matchesSnapshot(data);
		if (isLikelyStale) {
			throw new Error(
				'Same data as yesterday. Either the upstream website hasn’t ' +
				'updated yet (likely), or no experience was lost or gained by ' +
				'any of the top 50 paladins on Vunira (unlikely).'
			);
		}
		// Store a snapshot of the first page of highscore results. If none
		// of these entries changes the next time we run this script, we
		// can assume the upstream website hasn’t updated yet.
		await fs.writeFile(PATH_TO_SNAPSHOT, stringify(data));
	}

	const elements = data.highscores.highscore_list;
	for (const element of elements) {
		if (element.name === CHARACTER_NAME) {
			const rank = element.rank;
			const level = element.level;
			const experience = element.value;
			return {rank, level, experience};
		}
	}
	return getHighscoreData(page + 1);
};

const todaysData = await getHighscoreData();
console.log(todaysData);

const isoDate = (date) => {
	return date.toISOString().slice(0, 10);
};

const getDateIds = () => {
	const date = new Date();
	const today = isoDate(date);
	date.setDate(date.getDate() - 1);
	const yesterday = isoDate(date);
	return {
		yesterday,
		today,
	};
};

{
	const {today} = getDateIds();
	const HISTORY_FILE_PATH = './data/xp-history.json';
	const xpHistory = JSON.parse(await fs.readFile(HISTORY_FILE_PATH, 'utf8'));
	if (Object.hasOwn(xpHistory, today)) {
		throw new Error(`Data already contains an entry for ${today}.`);
	} else {
		xpHistory[today] = todaysData;
	}
	await fs.writeFile(
		HISTORY_FILE_PATH,
		stringifyHistory(xpHistory)
	);

	await fs.writeFile('./data/latest.json', stringify({
		date: today,
		...todaysData,
	}));
}

import * as fs from 'node:fs/promises';

import {updateReadmeTable} from './render-markdown.mjs';
import {updateHtml} from './render-html.mjs';

const readJsonFile = async (fileName) => {
	const json = await fs.readFile(fileName, 'utf8');
	const data = JSON.parse(json);
	return data;
};

const computeExperienceForLevel = (level) => {
	// https://tibia.fandom.com/wiki/Experience_Formula
	return 50 / 3 * (level ** 3 - 6 * level ** 2 + 17 * level - 12);
};

const computeLevelForExperience = (experience) => {
	// https://www.wolframalpha.com/input?i=solve+X+%3D+50+%2F+3+*+%28L+**+3+-+6+*+L+**+2+%2B+17+*+L+-+12%29+for+L
	return (
		Math.cbrt(Math.sqrt(3) * Math.sqrt(243 * experience ** 2 - 48_600 * experience + 3_680_000) + 27 * experience - 2_700) /
		30 ** (2 / 3) - (5 * 10 ** (2 / 3)) / Math.cbrt(3 * Math.sqrt(3) * Math.sqrt(243 * experience ** 2 - 48_600 * experience + 3_680_000) + 81 * experience - 8_100) + 2
	);
};

const computeExperienceUntilNextLevel = (level, experience) => {
	return 50 / 3 * level * ((level - 3) * level + 8) - experience;
};

const computeProgressWithinLevel = (level, experience) => {
	return (
		(level * ((600 - 100 * level) * level - 1700) + 6 * experience + 1200) /
		(level * (3 * level - 9) + 12)
	);
};

const statsWithinLevel = (level, experience) => {
	return {
		progressWithinLevel: Math.floor(computeProgressWithinLevel(level, experience)),
		experienceUntilNextLevel: computeExperienceUntilNextLevel(level, experience),
	};
};

const embellish = (history) => {
	const embellished = [];
	const first = { rank: -1, level: -1, experience: -1 };
	const prev = { rank: -1, level: -1, experience: -1 };
	const delta = { rank: -1, level: -1, experience: -1 };
	let isFirst = true;
	let lastDate;
	for (const [date, entry] of history) {
		if (isFirst) {
			first.rank = entry.rank;
			first.level = entry.level;
			first.experience = entry.experience;
		} else {
			delta.rank = entry.rank - prev.rank;
			delta.level = entry.level - prev.level;
			delta.experience = entry.experience - prev.experience;
		}
		const {
			progressWithinLevel,
			experienceUntilNextLevel,
		} = statsWithinLevel(entry.level, entry.experience);
		embellished.push({
			date: date,
			rank: entry.rank,
			rankDelta: isFirst ? null : delta.rank,
			experience: entry.experience,
			experienceDelta: isFirst ? null : delta.experience,
			level: entry.level,
			levelDelta: isFirst ? null : delta.level,
			progressWithinLevel: progressWithinLevel,
			experienceUntilNextLevel: experienceUntilNextLevel,
		});
		isFirst = false;
		prev.rank = entry.rank;
		prev.level = entry.level;
		prev.experience = entry.experience;
		lastDate = date;
	}
	const last = prev;
	delta.rank = last.rank - first.rank;
	delta.level = last.level - first.level;
	delta.experience = last.experience - first.experience;
	const meta = {
		updated: lastDate,
		days: history.size,
		rankDelta: delta.rank,
		experienceDelta: delta.experience,
		levelDelta: delta.level,
	};
	const result = {
		history: embellished,
		meta: meta,
	};
	return result;
};



const HISTORY = new Map(Object.entries(await readJsonFile('./data/xp-history.json')));
export const HISTORY_EMBELLISHED = embellish(HISTORY);

// const HISTORY_LAST_30_DAYS = new Map([...HISTORY].slice(-30));

//await updateReadmeTable(HISTORY_EMBELLISHED);

await updateHtml(HISTORY_EMBELLISHED);

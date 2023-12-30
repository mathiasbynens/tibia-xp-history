import * as fs from 'node:fs/promises';

import {updateReadmeTable} from './render-markdown.mjs';
import {updateHtml} from './render-html.mjs';
import {
	computeBaseValue,
	computeExperienceForLevel,
	computeExperienceUntilNextLevel,
	computeNextBaseBreakpointLevel,
	computeNextMilestoneLevel,
	computeProgressWithinLevel,
} from './formulae.mjs';

const readJsonFile = async (fileName) => {
	const json = await fs.readFile(fileName, 'utf8');
	const data = JSON.parse(json);
	return data;
};

const statsWithinLevel = (level, experience) => {
	return {
		progressWithinLevel: Math.floor(computeProgressWithinLevel(level, experience)),
		experienceUntilNextLevel: computeExperienceUntilNextLevel(level, experience),
	};
};

const embellish = (history, limit = false) => {
	if (limit) {
		const HISTORY_LAST_N_DAYS = new Map([...history].slice(-limit));
		history = HISTORY_LAST_N_DAYS;
	}
	const embellished = [];
	const first = { rank: -1, level: -1, experience: -1 };
	const prev = { rank: -1, level: -1, experience: -1 };
	const delta = { rank: -1, level: -1, experience: -1 };
	let isFirst = true;
	let lastDate;
	for (const [date, entry] of history) {
		entry.baseValue = computeBaseValue(entry.level);
		if (isFirst) {
			first.rank = entry.rank;
			first.level = entry.level;
			first.experience = entry.experience;
			first.baseValue = entry.baseValue;
		} else {
			delta.rank = entry.rank - prev.rank;
			delta.level = entry.level - prev.level;
			delta.experience = entry.experience - prev.experience;
			delta.baseValue = entry.baseValue - prev.baseValue;
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
			baseValue: entry.baseValue,
			baseValueDelta: isFirst ? null : delta.baseValue,
		});
		isFirst = false;
		prev.rank = entry.rank;
		prev.level = entry.level;
		prev.experience = entry.experience;
		prev.baseValue = entry.baseValue;
		lastDate = date;
	}
	const last = prev;
	delta.rank = last.rank - first.rank;
	delta.level = last.level - first.level;
	delta.experience = last.experience - first.experience;
	delta.baseValue = last.baseValue - first.baseValue;

	const days = history.size;
	const levelsPerDay = delta.level / days;
	const experiencePerDay = delta.experience / days;

	const nextBaseBreakpointLevel = computeNextBaseBreakpointLevel(last.level);
	const nextBaseBreakpointLevelDelta = nextBaseBreakpointLevel - last.level;
	const nextBaseBreakpointLevelExperience = computeExperienceForLevel(nextBaseBreakpointLevel);
	const nextBaseBreakpointLevelExperienceDelta = nextBaseBreakpointLevelExperience - last.experience;

	const nextMilestoneLevel = computeNextMilestoneLevel(last.level);
	const nextMilestoneLevelDelta = nextMilestoneLevel - last.level;
	const nextMilestoneLevelExperience = computeExperienceForLevel(nextMilestoneLevel);
	const nextMilestoneLevelExperienceDelta = nextMilestoneLevelExperience - last.experience;

	const meta = {
		updated: lastDate,
		days: days,
		rankDelta: delta.rank,
		levelDelta: delta.level,
		levelsPerDay: levelsPerDay,
		baseValueDelta: delta.baseValue,
		baseValuePercentageIncrease: Math.round((last.baseValue / first.baseValue - 1) * 100),
		experienceDelta: delta.experience,
		experiencePerDay: experiencePerDay,

		nextBaseBreakpointLevel: nextBaseBreakpointLevel,
		nextBaseValue: computeBaseValue(nextBaseBreakpointLevel),
		nextBaseBreakpointLevelDelta: nextBaseBreakpointLevelDelta,
		nextBaseBreakpointLevelExperience: nextBaseBreakpointLevelExperience,
		nextBaseBreakpointLevelExperienceDelta: nextBaseBreakpointLevelExperienceDelta,
		daysUntilNextBaseBreakpointLevelBasedOnLevelsPerDay: nextBaseBreakpointLevelDelta / levelsPerDay,
		daysUntilNextBaseBreakpointLevelExperienceBasedOnExperiencePerDay: nextBaseBreakpointLevelExperienceDelta / experiencePerDay,

		nextMilestoneLevel: nextMilestoneLevel,
		nextMilestoneLevelDelta: nextMilestoneLevelDelta,
		nextMilestoneLevelExperience: nextMilestoneLevelExperience,
		nextMilestoneLevelExperienceDelta: nextMilestoneLevelExperienceDelta,
		daysUntilNextMilestoneLevelBasedOnLevelsPerDay: nextMilestoneLevelDelta / levelsPerDay,
		daysUntilNextMilestoneLevelExperienceBasedOnExperiencePerDay: nextMilestoneLevelExperienceDelta / experiencePerDay,
	};
	const result = {
		history: embellished,
		meta: meta,
	};
	return result;
};

const HISTORY = new Map(Object.entries(await readJsonFile('./data/xp-history.json')));
export const HISTORY_EMBELLISHED = embellish(HISTORY, Infinity);
await updateHtml('./dist/index.html', HISTORY_EMBELLISHED);

export const HISTORY_30_EMBELLISHED = embellish(HISTORY, 30);
await updateHtml('./dist/30.html', HISTORY_30_EMBELLISHED);

// Formulas w.r.t. base damage and healing.
// https://tibia.fandom.com/wiki/Formulae#Base_Damage_and_Healing

const computeStepSize = (level) => {
	return Math.floor(
		(Math.sqrt(2 * level + 2025) + 5) / 10
	);
};

export const computeBaseValue = (level) => {
	const stepSize = computeStepSize(level);
	return Math.floor(
		(level + 1000) / stepSize - 50 * stepSize + 100 * stepSize - 450
	);
};

export const computeNextBaseBreakpointLevel = (level) => {
	const stepSize = computeStepSize(level);
	return level + stepSize - ((level + 1000) % stepSize);
};

// Formulas w.r.t. levels and experience.
// https://tibia.fandom.com/wiki/Experience_Formula

export const computeExperienceForLevel = (level) => {
	return 50 / 3 * (level ** 3 - 6 * level ** 2 + 17 * level - 12);
};

export const computeLevelForExperience = (experience) => {
	// https://www.wolframalpha.com/input?i=solve+X+%3D+50+%2F+3+*+%28L+**+3+-+6+*+L+**+2+%2B+17+*+L+-+12%29+for+L
	return (
		Math.cbrt(Math.sqrt(3) * Math.sqrt(243 * experience ** 2 - 48_600 * experience + 3_680_000) + 27 * experience - 2_700) /
		30 ** (2 / 3) - (5 * 10 ** (2 / 3)) / Math.cbrt(3 * Math.sqrt(3) * Math.sqrt(243 * experience ** 2 - 48_600 * experience + 3_680_000) + 81 * experience - 8_100) + 2
	);
};

export const computeExperienceUntilNextLevel = (level, experience) => {
	return 50 / 3 * level * ((level - 3) * level + 8) - experience;
};

export const computeProgressWithinLevel = (level, experience) => {
	return (
		(level * ((600 - 100 * level) * level - 1700) + 6 * experience + 1200) /
		(level * (3 * level - 9) + 12)
	);
};

const clamp = (number, granularity) => {
	const tmp = Math.ceil(number / granularity) * granularity;
	if (tmp === number) {
		return number + granularity;
	}
	return tmp;
};

export const computeNextMilestoneLevel = (level, granularity = 50) => {
	return clamp(level, granularity);
};

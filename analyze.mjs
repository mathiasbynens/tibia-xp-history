import * as fs from 'node:fs/promises';
import * as prettier from 'prettier';

const readJsonFile = async (fileName) => {
	const json = await fs.readFile(fileName, 'utf8');
	const data = JSON.parse(json);
	return data;
};

const writeJsonFile = async (fileName, data) => {
	const json = JSON.stringify(data, null, '\t') + '\n';
	await fs.writeFile(fileName, json);
};

const formatter = new Intl.NumberFormat('en');
const format = (number) => {
	return formatter.format(number);
};
const deltaFormatter = new Intl.NumberFormat('en', {
	signDisplay: 'exceptZero',
});
const formatDelta = (number) => {
	return deltaFormatter.format(number);
};

const showDelta = (value, hide = false, showZero = false) => {
	if (!showZero && value === 0) return '';
	if (hide) return '';
	return `${formatDelta(value)}`;
};

const formatMarkdown = async (text) => {
	const formatted = await prettier.format(text, {
		parser: 'markdown'
	});
	return formatted.trimEnd();
};

const fixReadme = async (markdown) => {
	const file = './README.md';
	const readme = await fs.readFile(file, 'utf8');
	const updated = readme.replace(
		/(?<=<!-- START AUTO-UPDATED SECTION -->)([^<]+)(?=<!-- END AUTO-UPDATED SECTION -->)/,
		`\n${markdown}\n`
	);
	await fs.writeFile(file, updated);
};

const createMarkdownTable = async (history) => {
	const MARKDOWN_TABLE_LINES = [];
	const first = { rank: -1, level: -1, experience: -1 };
	const prev = { rank: -1, level: -1, experience: -1 };
	const delta = { rank: -1, level: -1, experience: -1 };
	let isFirst = true;
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
		MARKDOWN_TABLE_LINES.push(`${date}|${entry.rank}|${showDelta(delta.rank, isFirst)}|${format(entry.experience)}|${showDelta(delta.experience, isFirst, true)}|${format(entry.level)}|${showDelta(delta.level, isFirst)}`);
		isFirst = false;
		prev.rank = entry.rank;
		prev.level = entry.level;
		prev.experience = entry.experience;
	}
	const last = prev;
	delta.rank = last.rank - first.rank;
	delta.level = last.level - first.level;
	delta.experience = last.experience - first.experience;
	MARKDOWN_TABLE_LINES.push(`**30 days**||**${showDelta(delta.rank)}**||**${showDelta(delta.experience, false, true)}**||**${showDelta(delta.level)}**`);
	const markdown = await formatMarkdown(
		'|date|rank|rank delta|experience|experience delta|level|level delta|\n|--|-:|-:|-:|-:|-:|-:|\n' +
		MARKDOWN_TABLE_LINES.join('\n')
	);
	return markdown;
};

const HISTORY = new Map(Object.entries(await readJsonFile('./data/xp-history.json')));
const HISTORY_LAST_30_DAYS = new Map([...HISTORY].slice(-30));
const markdown = await createMarkdownTable(HISTORY_LAST_30_DAYS);
await fixReadme(markdown);

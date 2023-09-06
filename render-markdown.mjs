import * as fs from 'node:fs/promises';
import * as prettier from 'prettier';

const intFormatter = new Intl.NumberFormat('en');
const formatInt = (number) => {
	return intFormatter.format(number);
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

const renderMarkdown = async (embellished) => {
	const MARKDOWN_TABLE_LINES = [
		'|date|rank|rank delta|experience|experience delta|level|level delta|\n|--|-:|-:|-:|-:|-:|-:|',
	];
	for (const entry of embellished.history) {
		MARKDOWN_TABLE_LINES.push(`${entry.date}|${entry.rank}|${showDelta(entry.rankDelta)}|${formatInt(entry.experience)}|${showDelta(entry.experienceDelta)}|${formatInt(entry.level)}|${showDelta(entry.levelDelta)}`);
	}
	const meta = embellished.meta;
	MARKDOWN_TABLE_LINES.push(`**${formatInt(meta.days)} days**||**${showDelta(meta.rankDelta)}**||**${showDelta(meta.experienceDelta, false, true)}**||**${showDelta(meta.levelDelta)}**`);
	const markdown = MARKDOWN_TABLE_LINES.join('\n');
	const formatted = await formatMarkdown(markdown);
	return formatted;
};

export const updateReadmeTable = async (embellished) => {
	const markdown = await renderMarkdown(embellished);
	const file = './README.md';
	const readme = await fs.readFile(file, 'utf8');
	const updated = readme.replace(
		/(?<=<!-- START AUTO-UPDATED SECTION -->)([^<]+)(?=<!-- END AUTO-UPDATED SECTION -->)/,
		`\n${markdown}\n`
	);
	await fs.writeFile(file, updated);
};

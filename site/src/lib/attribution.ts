/**
 * Data credit required on every page and share image (NFR-40, C-7): authors, title, year, OSF
 * link, the CC BY 4.0 licence with a link, and a note that the values are the atlas's own
 * aggregates. The audiences module credits the analysis of audience effects (FR-43, decision 66);
 * the 2000–2003 comparison data's credit (NFR-41) is in change-text.ts, which a build without the
 * change module leaves out (R-6).
 */
export const attribution = {
	authors: 'Eriksson, K., Strimling, P., Vartanova, I., Simpson, B., et al.',
	year: 2025,
	title: 'Everyday norms have become more permissive over time and vary across cultures',
	journal: 'Communications Psychology',
	volume: '3:145',
	articleUrl: 'https://doi.org/10.1038/s44271-025-00324-4',
	dataName: 'Global Study of Everyday Norms',
	dataUrl: 'https://doi.org/10.17605/OSF.IO/SH4RB',
	license: 'CC BY 4.0',
	licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
	note: 'Values shown are aggregated and modelled by The Etiquette Atlas.',
	codeUrl: 'https://github.com/Nathan98000/EtiquetteAtlas'
} as const;

/**
 * FR-43: the 2026 American Sociological Review analysis of these audience effects, as supplied by
 * the maintainer (decision 66).
 */
export const audienceCredit = {
	/** Short form for the credit line on the audiences routes. */
	short: 'Simpson, Eriksson, Vartanova, Strimling et al. (2026)',
	authors:
		'Simpson, B., Eriksson, K., Vartanova, I., Strimling, P., Merchan Tamayo, J. P., Abdi, K. A., … & Tung, H.',
	year: 2026,
	title:
		'How norms depend on the presence and status of observers: the relational contingency of everyday behaviors in 90 societies',
	journal: 'American Sociological Review',
	volume: '91(5), 709–730',
	url: 'https://doi.org/10.1177/00031224261464586'
} as const;

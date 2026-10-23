import { CHANGE_MODULE } from '#lib/change-module.ts';
import { sampleEffects, studentShares, versionsView } from '#lib/data/method.ts';
import { globalAll, societies } from '#lib/server/derived.ts';
import { globalAttention, globalPaper, manifest } from '#lib/server/method.ts';
import type { PageServerLoad } from './$types';

// FR-71, FR-72, §4.8: each sample's effect, the student share and the versions, as short strings
// from the committed files at build time (decisions 28 and 93). The per-society table is drawn in
// the browser from societies.json, which every route already loads.
export const load: PageServerLoad = () => ({
	samples: sampleEffects(societies, {
		all: globalAll,
		paper: globalPaper,
		attention: globalAttention
	}),
	students: studentShares(societies, 'all'),
	// R-6: without the change module, the 2000–2003 file is not listed (decision 75).
	versions: versionsView(manifest, CHANGE_MODULE)
});

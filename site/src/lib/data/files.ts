// Every data file is imported with ?url: Vite emits it as a content-hashed asset under
// _app/immutable/assets/ and gives back its URL, so the data is fetched when a view needs it
// and never bundled into the JavaScript (HR-3, NFR-3; decision 27).

import societies from '../../../../data/derived/societies.json?url';
import globalAll from '../../../../data/derived/global-all.json?url';
import globalPaper from '../../../../data/derived/global-paper.json?url';
import globalAttention from '../../../../data/derived/global-attention.json?url';
import cellsAll from '../../../../data/derived/cells-all.json?url';
import cellsPaper from '../../../../data/derived/cells-paper.json?url';
import cellsAttention from '../../../../data/derived/cells-attention.json?url';
import similarityAll from '../../../../data/derived/similarity-all.json?url';
import similarityPaper from '../../../../data/derived/similarity-paper.json?url';
import similarityAttention from '../../../../data/derived/similarity-attention.json?url';
import contextsAll from '../../../../data/derived/contexts-all.json?url';
import contextsPaper from '../../../../data/derived/contexts-paper.json?url';
import contextsAttention from '../../../../data/derived/contexts-attention.json?url';
// Natural Earth 1:110m land, public domain, as TopoJSON from world-atlas (FR-24, §3.1).
import land from 'world-atlas/land-110m.json?url';

export const FILES = {
	societies,
	global: { all: globalAll, paper: globalPaper, attention: globalAttention },
	cells: { all: cellsAll, paper: cellsPaper, attention: cellsAttention },
	similarity: { all: similarityAll, paper: similarityPaper, attention: similarityAttention },
	contexts: { all: contextsAll, paper: contextsPaper, attention: contextsAttention },
	land
} as const;

<script lang="ts">
	import { attribution } from '#lib/attribution.ts';
	import { comparison } from '#lib/change-text.ts';
</script>

<!-- FR-52, FR-70, NFR-41, §4.7, §4.8; decisions 67 to 75. Compiled to nothing in a build without
     the change module, so none of its text reaches build/ (R-6, decisions 75 and 95). -->
<section id="change">
	<h2>Change since the early 2000s</h2>
	<p>
		For 26 societies, a survey from 2000–2003 by Gelfand and colleagues asked about 12 of the same
		behaviors in the same 10 situations; resting, shouting in anger and using a mobile phone were
		not asked then. The change pages compare the two surveys' average answers for each society and
		pair. The surveys asked different people, recruited in different ways, with different
		questionnaires, about 20 years apart. A difference is therefore a difference between two
		surveys, not a change in anyone's views, and it does not say why the answers differ. Only
		summaries of the older survey are shown, each society's average for each pair, never an
		individual answer. The GSN authors' companion files describe its individual answers as provided
		to them privately.
	</p>
	<p>
		Both surveys are shown as raw averages on the −2.5 to +2.5 scale, whatever the scale toggle
		says, as the older survey has no centered scores. The difference is the 2023–2024 average minus
		the 2000–2003 average, with a 95% interval from resampling each survey's respondents within each
		society. A difference counts as higher or lower in 2023–2024 only when its interval excludes 0;
		an interval that ends exactly at 0 counts as within. In the older survey a pair rests on 107 to
		312 ratings. In the newer one, pairs with 10 to 29 respondents are marked as small samples; they
		occur only in the Attention check sample. Israel's 2000–2003 data have no value for laughing out
		loud at a party.
	</p>
	<p>
		Without a society, the pages average the societies in both surveys: 26, or 22 in the Paper's
		sample, which leaves out South Korea, the Netherlands, Portugal and Turkey. These are not the
		averages of all 90 societies shown elsewhere. A society's mean difference averages its pairs. A
		behavior's averages its 10 situations within each society, then the societies, as in Table 1 of
		Eriksson et al. ({attribution.year}), which the Paper's sample reproduces; its count of
		societies "above 0" includes differences within their intervals.
	</p>
	<p>
		2000–2003 data: <a href={comparison.url} rel="external">{comparison.text}</a>, shared by the GSN
		authors in their
		<a href={attribution.dataUrl} rel="external">deposit on OSF</a>.
	</p>
</section>

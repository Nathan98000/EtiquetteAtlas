<script lang="ts">
	import { signed } from '#lib/data/format.ts';
	import { DEVIATION_MAX } from './colors';
	import type { FingerprintCounts } from './fingerprint-model';
	import { MARK_GLYPH } from './matrix-model';
	import Ramp from './Ramp.svelte';

	interface Props {
		/** Undefined while the data loads; the legend keeps its size. */
		counts: FingerprintCounts | undefined;
	}

	let { counts }: Props = $props();

	const max = DEVIATION_MAX.toFixed(1);
	const missing = $derived(counts ? counts.tooFew + counts.notAsked : 0);
</script>

<div class="legend">
	<div class="item">
		<p class="key">Difference from the global average (fill)</p>
		<Ramp ends={[`${signed(-DEVIATION_MAX)} or less: stricter`, '0', `+${max} or more: looser`]} />
	</div>
	<!-- FR-31: the marks, with how many pairs carry each. Rendered before the data arrives, so the
	     grid below does not shift. -->
	<ul class="item marks">
		<li>
			<span class="glyph" aria-hidden="true">{MARK_GLYPH.looser}</span> notably looser (more
			appropriate): <span class="num">{counts?.looser ?? '…'}</span>
		</li>
		<li>
			<span class="glyph" aria-hidden="true">{MARK_GLYPH.stricter}</span> notably stricter (less
			appropriate): <span class="num">{counts?.stricter ?? '…'}</span>
		</li>
		<li>no mark: not notably different: <span class="num">{counts?.close ?? '…'}</span></li>
		<li>
			<span class="missing" aria-hidden="true">{MARK_GLYPH.missing}</span> too few responses or not
			asked: <span class="num">{counts ? missing : '…'}</span>
		</li>
	</ul>
</div>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 2rem;
		margin-bottom: 1rem;
		font-size: var(--text-sm);
	}

	.item {
		min-width: 0;
		margin: 0;
	}

	.key {
		margin: 0 0 0.25rem;
		color: var(--text-muted);
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.marks {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 0.125rem 1.5rem;
		flex: 1 1 28rem;
	}

	.glyph {
		display: inline-block;
		width: 1rem;
		text-align: center;
	}

	/* The same unfilled, dashed square as a cell with nothing to show (decision 46). */
	.missing {
		display: inline-grid;
		place-items: center;
		width: 1rem;
		height: 1rem;
		border: 1px dashed var(--border-strong);
		line-height: 1;
		vertical-align: -0.125rem;
	}
</style>

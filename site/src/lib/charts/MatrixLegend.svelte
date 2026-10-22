<script lang="ts">
	import { respondentsIn, spread } from '#lib/data/format.ts';
	import { DIVERGING } from './colors';
	import { dotSize, MARK_GLYPH, type MatrixCell, type SelectedSociety } from './matrix-model';

	interface Props {
		universal: MatrixCell | undefined;
		dependent: MatrixCell | undefined;
		society?: SelectedSociety;
	}

	let { universal, dependent, society }: Props = $props();

	const ramp = (stops: readonly string[]) => `linear-gradient(to right, ${stops.join(', ')})`;
	const style = `--ramp-light: ${ramp(DIVERGING.light)}; --ramp-dark: ${ramp(DIVERGING.dark)}`;
	const sizes = [0.2, 0.5, 0.8];
</script>

<div class="legend" {style}>
	<div class="item">
		<p class="key">Global average (fill)</p>
		<div class="ramp" aria-hidden="true"></div>
		<div class="ends">
			<span>Extremely inappropriate</span><span>0</span><span>Extremely appropriate</span>
		</div>
	</div>
	<div class="item">
		<p class="key">Disagreement between societies (circle size)</p>
		<ul class="sizes">
			{#each sizes as tau (tau)}
				<li>
					<span class="dot-box"><span class="dot" style="--r: {dotSize(tau)}"></span></span>
					{spread(tau)}
				</li>
			{/each}
		</ul>
	</div>
	<!-- Rendered before the data arrives too, so the matrix below does not shift. -->
	<ul class="item rings">
		<li>
			<span class="ring universal" aria-hidden="true"></span>
			Most universal: {universal ? `${universal.headline} (${spread(universal.tau)})` : '…'}
		</li>
		<li>
			<span class="ring dependent" aria-hidden="true"></span>
			Most culture-dependent: {dependent ? `${dependent.headline} (${spread(dependent.tau)})` : '…'}
		</li>
	</ul>
	{#if society}
		<div class="item">
			<p class="key">
				{respondentsIn(society.code, society.name)[0].toUpperCase() +
					respondentsIn(society.code, society.name).slice(1)}, compared with the global average
			</p>
			<ul class="marks">
				<li><span aria-hidden="true">{MARK_GLYPH.looser}</span> looser (more appropriate)</li>
				<li><span aria-hidden="true">{MARK_GLYPH.stricter}</span> stricter (less appropriate)</li>
				<li>no mark: close</li>
				<li><span aria-hidden="true">{MARK_GLYPH.missing}</span> too few responses or not asked</li>
			</ul>
		</div>
	{/if}
</div>

<style>
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 2rem;
		margin-bottom: 1rem;
		font-size: var(--text-sm);
		--ramp: var(--ramp-light);
	}

	:global(:root[data-theme='dark']) .legend {
		--ramp: var(--ramp-dark);
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .legend {
			--ramp: var(--ramp-dark);
		}
	}

	.item {
		min-width: 0;
		margin: 0;
	}

	.key {
		margin: 0 0 0.25rem;
		color: var(--text-muted);
	}

	.ramp {
		width: min(16rem, 100%);
		height: 0.75rem;
		background: var(--ramp);
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}

	.ends {
		display: flex;
		justify-content: space-between;
		width: min(16rem, 100%);
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.sizes {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.sizes li {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	/* The same size as a matrix cell or list mark (var(--cell)), so circles compare directly. */
	.dot-box {
		display: grid;
		place-items: center;
		width: var(--cell);
		height: var(--cell);
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}

	.dot {
		width: calc(var(--r) * 64%);
		aspect-ratio: 1;
		border-radius: 50%;
		background: var(--text);
	}

	.rings li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.ring {
		flex: none;
		width: 1.25rem;
		height: 1.25rem;
	}

	.ring.universal {
		box-shadow: inset 0 0 0 3px var(--text);
	}

	.ring.dependent {
		box-shadow:
			inset 0 0 0 2px var(--text),
			inset 0 0 0 4px var(--surface),
			inset 0 0 0 6px var(--text);
	}

	.marks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
	}
</style>

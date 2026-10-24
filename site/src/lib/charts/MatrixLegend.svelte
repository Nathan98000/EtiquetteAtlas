<script lang="ts">
	import { respondentsIn } from '#lib/data/format.ts';
	import Ramp from './Ramp.svelte';
	import { dotSize, MARK_GLYPH, type MatrixCell, type SelectedSociety } from './matrix-model';

	interface Props {
		universal: MatrixCell | undefined;
		dependent: MatrixCell | undefined;
		society?: SelectedSociety;
		/**
		 * The keys above the matrix, or the rings that name its two extreme pairs, under it, where
		 * their names can arrive with the data without moving the matrix (NFR-2).
		 */
		part?: 'keys' | 'rings';
	}

	let { universal, dependent, society, part = 'keys' }: Props = $props();

	const sizes = [0.2, 0.5, 0.8];
</script>

{#if part === 'rings'}
	<div class="legend under">
		<!-- FR-16: named under the matrix. -->
		<ul class="item rings">
			<li>
				<span class="ring universal" aria-hidden="true"></span>
				Most universal: {universal?.headline ?? '…'}
			</li>
			<li>
				<span class="ring dependent" aria-hidden="true"></span>
				Most culture-dependent: {dependent?.headline ?? '…'}
			</li>
		</ul>
	</div>
{:else}
	<div class="legend">
		<div class="item">
			<p class="key">
				{#if society?.inSample}
					<!-- D-13: the phone list's bars then show the society's averages. -->
					<span class="grid-only">Global average</span><span class="list-key">Average answer</span>
				{:else}
					Global average
				{/if}
				(fill)
			</p>
			<Ramp ends={['Extremely inappropriate', '0', 'Extremely appropriate']} />
		</div>
		<div class="item">
			<p class="key">How much societies disagree (circle size)</p>
			<!-- D-7: in words; each pair's value stays in its details. -->
			<ul class="sizes">
				{#each sizes as tau, i (tau)}
					<li>
						{#if i === 0}less{/if}
						<span class="dot-box"><span class="dot" style="--r: {dotSize(tau)}"></span></span>
						{#if i === sizes.length - 1}more{/if}
					</li>
				{/each}
			</ul>
		</div>

		{#if !society}
			<!-- A `?society=` link holds this key's place from the first paint (app.html, NFR-2). -->
			<div class="item society-pending" aria-hidden="true">
				<p class="key">Respondents in Japan:</p>
				<ul class="marks">
					<li class="list-only">
						<span class="bar-key"></span> their average, <span class="tick-key"></span> the global average
					</li>
					<li><span>{MARK_GLYPH.looser}</span> clearly looser (more appropriate)</li>
					<li><span>{MARK_GLYPH.stricter}</span> clearly stricter (less appropriate)</li>
					<li>no mark: too close to call</li>
					<li><span>{MARK_GLYPH.missing}</span> too few responses or not asked</li>
				</ul>
			</div>
		{:else}
			<div class="item">
				<p class="key">
					{respondentsIn(society.code, society.name)[0].toUpperCase() +
						respondentsIn(society.code, society.name).slice(1)}:
				</p>
				<ul class="marks">
					<!-- D-13: on phones the list's bars are this society's, the global average a tick. -->
					{#if society.inSample}
						<li class="list-only">
							<span class="bar-key" aria-hidden="true"></span> their average,
							<span class="tick-key" aria-hidden="true"></span> the global average
						</li>
					{/if}
					<li>
						<span aria-hidden="true">{MARK_GLYPH.looser}</span> clearly looser (more appropriate)
					</li>
					<li>
						<span aria-hidden="true">{MARK_GLYPH.stricter}</span> clearly stricter (less appropriate)
					</li>
					<li>no mark: too close to call</li>
					<li>
						<span aria-hidden="true">{MARK_GLYPH.missing}</span> too few responses or not asked
					</li>
				</ul>
			</div>
		{/if}
	</div>
{/if}

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

	.legend.under {
		margin: 0.75rem 0 0;
	}

	.society-pending {
		display: none;
	}

	:global(html[data-society]) .society-pending {
		display: block;
		visibility: hidden;
	}

	.list-key {
		display: none;
	}

	.list-only {
		display: none;
		align-items: center;
		gap: 0.25rem;
	}

	.bar-key {
		display: inline-block;
		width: 1.5rem;
		height: 0.75rem;
		background: var(--surface-muted);
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}

	.tick-key {
		display: inline-block;
		width: 2px;
		height: 1rem;
		margin-left: 0.25rem;
		background: var(--text);
	}

	/* Below 640 px there is no grid to ring: the list tags the two pairs itself (D-23). */
	@media (max-width: 639.98px) {
		.rings {
			display: none;
		}

		.list-only {
			display: flex;
		}

		/* The key's extra line keeps the list's top on the first screen (D-23). */
		.marks {
			row-gap: 0;
		}

		.grid-only {
			display: none;
		}

		.list-key {
			display: inline;
		}
	}
</style>

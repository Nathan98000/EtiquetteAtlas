<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ResolvedPathname } from '$app/types';
	import { respondentsIn } from '#lib/data/format.ts';
	import type { SimilarView } from '#lib/data/society.ts';

	interface Props {
		/** Undefined while the file loads: five rows keep their space. */
		similar: SimilarView[] | undefined;
		/** Why the list is empty: too few publishable pairs, or not in the sample. */
		empty: 'no-pairs' | 'not-in-sample';
		href: (code: string) => ResolvedPathname;
		compareHref: (code: string) => ResolvedPathname;
	}

	let { similar, empty, href, compareHref }: Props = $props();
</script>

<!-- FR-32: the five most similar societies (DR-14), each a link to its own fingerprint that keeps
     the sample and scale, with a link to compare the two (FR-33). -->
<section class="card" aria-labelledby="similar-title">
	<h2 id="similar-title">Most similar answers</h2>
	<p class="note">
		Similarity is the correlation of two fingerprints: 1 would mean the same pattern of stricter and
		looser pairs, 0 no shared pattern. It measures how alike the answers are, not how related the
		cultures are. <a href={resolve('method/#similar')}>About similarity</a>
	</p>
	{#if similar === undefined}
		<ol class="list" aria-busy="true">
			{#each [1, 2, 3, 4, 5] as rank (rank)}<li class="placeholder">&nbsp;</li>{/each}
		</ol>
	{:else if similar.length}
		<ol class="list">
			{#each similar as s (s.code)}
				<li>
					<a class="name" href={href(s.code)}>{s.name}</a>
					<span class="score">
						<span class="visually-hidden">similarity</span>
						<span class="num">{s.r}</span>
						<span class="bar" style="--w: {s.width * 100}%" aria-hidden="true"></span>
					</span>
					<span class="cells">{s.cells} shared pairs</span>
					<a class="compare" href={compareHref(s.code)}>
						Compare<span class="visually-hidden"> with {respondentsIn(s.code, s.name)}</span>
					</a>
				</li>
			{/each}
		</ol>
	{:else if empty === 'not-in-sample'}
		<p>Not in this sample.</p>
	{:else}
		<p>
			Too few pairs with enough responses to compare: similarity needs at least 120 of the 150
			pairs.
		</p>
	{/if}
</section>

<style>
	.card {
		padding: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-muted);
	}

	h2 {
		font-size: var(--text-lg);
		margin: 0 0 0.25rem;
	}

	.note {
		margin: 0 0 0.75rem;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.list {
		margin: 0;
		padding-left: 1.5rem;
	}

	li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 6.5rem auto;
		grid-template-areas: 'name score compare' 'cells cells cells';
		align-items: center;
		gap: 0 0.75rem;
		min-height: 3.25rem;
		padding: 0.25rem 0;
	}

	li + li {
		border-top: 1px solid var(--border);
	}

	li.placeholder {
		display: list-item;
	}

	.name {
		grid-area: name;
		font-weight: 600;
		/* A 44 px target (WCAG 2.5.8 needs 24 px). */
		padding: 0.25rem 0;
	}

	.score {
		grid-area: score;
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	/* The correlation as a bar from 0 to 1, in the text colour (3:1 against the card). */
	.bar {
		flex: 1;
		height: 0.5rem;
		background: linear-gradient(var(--text), var(--text)) 0 0 / var(--w) 100% no-repeat;
		box-shadow: inset 0 0 0 1px var(--border-strong);
	}

	.cells {
		grid-area: cells;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.compare {
		grid-area: compare;
		font-size: var(--text-sm);
		padding: 0.5rem 0;
	}
</style>

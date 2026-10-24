<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { attribution as a } from '#lib/attribution.ts';
	import { comparison } from '#lib/change-text.ts';
	import { DIVERGING } from '#lib/charts/colors.ts';
	import type { Layout } from './model';

	interface Props {
		kicker: string;
		headline: string;
		detail: string[];
		layout: Layout;
		comparisonCredit: boolean;
		children: Snippet;
	}

	let { kicker, headline, detail, layout, comparisonCredit, children }: Props = $props();

	const bare = (url: string) => url.replace(/^https:\/\//, '').replace(/\/$/, '');
	// The first author and "et al.", and the note in the credit's short form (NFR-40).
	const authors = `${a.authors.split(',')[0]} et al.`;
	const note = 'aggregated and modelled by The Etiquette Atlas';
	const site = bare(new URL(resolve('/'), page.url.origin).href);
	// Long headlines take a smaller size so they stay within four lines.
	const size = $derived(headline.length > 85 ? 'longer' : headline.length > 60 ? 'long' : '');
</script>

<!-- One share image (FR-82, §6.4). `data-attribution` is the NFR-40 credit that
     scripts/share-images.js checks on every card before photographing it (AT-5). -->
<div class="card {layout}" data-card>
	<div class="band" aria-hidden="true">
		{#each DIVERGING.light as color (color)}<span style:background={color}></span>{/each}
	</div>
	<header>
		<span class="brand">The Etiquette Atlas</span>
		<span class="kicker">{kicker}</span>
		<span class="site">{site}</span>
	</header>
	<div class="body">
		<div class="text">
			<h1 class={size} data-headline>{headline}</h1>
			{#each detail as line, i (i)}<p>{line}</p>{/each}
		</div>
		<div class="chart">{@render children()}</div>
	</div>
	<!-- D-38, decision 136: NFR-40's credit in two lines, every element kept: the authors, year
	     and title, then the data's link, the licence with its link and the note. The change
	     module's card adds NFR-41's credit on a third. -->
	<footer data-attribution>
		<span class="line">Data: {authors} ({a.year}), {a.title}, {a.journal} {a.volume}.</span>
		<span class="line"
			>GSN data, {bare(a.dataUrl)} · {a.license}, {bare(a.licenseUrl)} · {note}</span
		>
		{#if comparisonCredit}<span class="line">{comparison.label}: {comparison.text}.</span>{/if}
	</footer>
</div>

<style>
	.card {
		position: relative;
		box-sizing: border-box;
		width: 1200px;
		height: 630px;
		padding: 34px 56px 0;
		display: flex;
		flex-direction: column;
	}

	.band {
		position: absolute;
		inset: 0 0 auto;
		display: flex;
		height: 8px;
	}

	.band span {
		flex: 1;
	}

	header {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		font-size: 20px;
		color: var(--text-muted);
	}

	.brand {
		font-weight: 700;
		color: var(--text);
	}

	.kicker::before {
		content: '·';
		margin-right: 0.75rem;
	}

	.site {
		margin-left: auto;
		font-size: 17px;
		font-weight: 700;
		color: var(--text);
		white-space: nowrap;
	}

	.body {
		flex: 1;
		min-height: 0;
		display: grid;
		gap: 44px;
		align-items: center;
		padding: 16px 0 18px;
	}

	.side .body {
		grid-template-columns: 450px 1fr;
	}

	.stack .body {
		grid-template-rows: auto 1fr;
		gap: 12px;
		align-items: stretch;
	}

	h1 {
		margin: 0;
		font-size: 44px;
		line-height: 1.12;
		letter-spacing: -0.01em;
		font-weight: 700;
	}

	h1.long {
		font-size: 40px;
	}

	h1.longer {
		font-size: 36px;
	}

	.stack h1 {
		font-size: 40px;
	}

	p {
		margin: 16px 0 0;
		font-size: 22px;
		line-height: 1.35;
		color: var(--text-muted);
	}

	.stack p {
		margin-top: 10px;
		font-size: 21px;
	}

	.chart {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
	}

	footer {
		margin: 0 -56px;
		padding: 10px 56px 12px;
		border-top: 1px solid var(--border);
		background: var(--surface-muted);
		color: var(--text-muted);
		font-size: 15px;
		line-height: 1.4;
	}

	.line {
		display: block;
		white-space: nowrap;
	}
</style>

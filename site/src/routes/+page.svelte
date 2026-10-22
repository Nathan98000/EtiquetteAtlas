<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '#lib/components/Seo.svelte';
	import { GLOBAL_KEYS } from '#lib/state/url.ts';
	import { view, withView } from '#lib/state/view.svelte.ts';
</script>

<!-- FR-1 in M2: a short intro with a prominent "Skip to the atlas" link; the quiz entry replaces
     it in M6 (decision 25). -->
<Seo
	description="How appropriate are 15 everyday behaviors in 10 situations? An interactive atlas of how respondents in 90 societies judge them, built from the Global Study of Everyday Norms."
/>

<div class="intro">
	<h1>The Etiquette Atlas</h1>
	<p class="lede">
		Is it fine to eat on a bus, or to use a phone at a funeral? See how respondents in 90 societies
		judged 15 everyday behaviors in 10 situations.
	</p>
	<p>
		<a class="button primary" href={withView(resolve('explore/'), view.state, GLOBAL_KEYS)}>
			Skip to the atlas
		</a>
	</p>
	<p>
		The atlas shows where societies agree and where they disagree, from the 25,422 people who
		answered the Global Study of Everyday Norms in 2023 and 2024. A short quiz will open this page
		soon.
	</p>
</div>

<style>
	.intro {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 3rem var(--gutter) 0;
	}

	h1 {
		font-size: clamp(2rem, 1.2rem + 4vw, 3rem);
	}

	.lede {
		font-size: var(--text-lg);
	}

	.primary {
		font-size: var(--text-lg);
		font-weight: 600;
		padding: 0.75rem 1.5rem;
		border-color: var(--accent);
		background: var(--accent);
		color: var(--on-accent);
	}

	.primary:hover {
		background: var(--accent);
		text-decoration: underline;
	}
</style>

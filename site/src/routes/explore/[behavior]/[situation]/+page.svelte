<script lang="ts">
	import Seo from '#lib/components/Seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Seo title={data.title} description={data.summary} />

<div class="page">
	<h1>{data.title}</h1>
	<p>{data.summary}</p>
</div>

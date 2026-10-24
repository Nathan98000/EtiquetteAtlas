<script lang="ts">
	import Card from '../../Card.svelte';
	import type { CardData } from '../../model';
	import BarChart from '../../charts/BarChart.svelte';
	import GridChart from '../../charts/GridChart.svelte';
	import MapChart from '../../charts/MapChart.svelte';
	import SlopeChart from '../../charts/SlopeChart.svelte';
	import SpreadChart from '../../charts/SpreadChart.svelte';
	import StripChart from '../../charts/StripChart.svelte';
	import SwarmChart from '../../charts/SwarmChart.svelte';

	let { data }: { data: CardData } = $props();
	const chart = $derived(data.chart);
</script>

<svelte:head><title>{data.card}</title></svelte:head>

<Card
	kicker={data.kicker}
	headline={data.headline}
	detail={data.detail}
	layout={data.layout}
	comparisonCredit={data.comparisonCredit}
>
	{#if chart.kind === 'grid'}
		<GridChart cells={chart.cells} legend={chart.legend} />
	{:else if chart.kind === 'swarm'}
		<SwarmChart
			dots={chart.dots}
			mean={chart.mean}
			low={chart.low}
			high={chart.high}
			note={chart.note}
		/>
	{:else if chart.kind === 'slopes'}
		<SlopeChart columns={chart.columns} lines={chart.lines} />
	{:else if chart.kind === 'strip'}
		<StripChart rows={chart.rows} caption={chart.caption} />
	{:else if chart.kind === 'spread'}
		<SpreadChart
			pairs={chart.pairs}
			societies={chart.societies}
			labels={chart.labels}
			caption={chart.caption}
		/>
	{:else if chart.kind === 'bars'}
		<BarChart bars={chart.bars} max={chart.max} caption={chart.caption} />
	{:else}
		<MapChart land={chart.land} width={chart.width} height={chart.height} dots={chart.dots} />
	{/if}
</Card>

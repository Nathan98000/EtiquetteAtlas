<script lang="ts">
	import ControlBar from '#lib/components/ControlBar.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<ControlBar />
{@render children()}

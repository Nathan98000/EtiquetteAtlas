<script lang="ts">
	import { place } from '#lib/data/format.ts';

	interface Props {
		code: string;
		name: string;
		onchoose: () => void;
	}

	let { code, name, onchoose }: Props = $props();
</script>

<!-- D-14: on touch, a pinned tip chooses its society by this button, never by the tap itself. -->
<button type="button" class="button" onclick={onchoose}>
	Show respondents in {place(code, name)}
</button>

<style>
	button {
		justify-content: center;
		width: 100%;
		margin-top: 0.5rem;
		font-size: var(--text-sm);
	}
</style>

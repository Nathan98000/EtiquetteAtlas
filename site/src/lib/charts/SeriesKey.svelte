<script lang="ts" module>
	/** ● filled, ○ hollow, ■ square, a horizontal tick (a reference value on a vertical axis), a
	 *  vertical one (on a horizontal axis), or an arrow from ○ to ● (decision 69). */
	export type KeyMark = 'dot' | 'ring' | 'square' | 'tick' | 'vtick' | 'arrow';
	export type KeyLine = 'solid' | 'dashed' | 'long-dash';

	export interface KeyItem {
		label: string;
		mark: KeyMark;
		line?: KeyLine;
	}
</script>

<script lang="ts">
	interface Props {
		items: readonly KeyItem[];
	}

	let { items }: Props = $props();
</script>

<!-- Series told apart by shape and line style, never by hue alone, since blue and orange mean
     appropriateness and the region colours mean regions (§6.4, NFR-12; decisions 49 and 59). -->
<ul class="series-key">
	{#each items as item (item.label)}
		<li>
			<svg width="32" height="16" viewBox="0 0 32 16" aria-hidden="true">
				{#if item.line}
					<line class="line {item.line}" x1="2" x2="30" y1="8" y2="8" />
				{/if}
				{#if item.mark === 'dot'}
					<circle class="mark" cx="16" cy="8" r="5" />
				{:else if item.mark === 'ring'}
					<circle class="mark ring" cx="16" cy="8" r="5" />
				{:else if item.mark === 'square'}
					<rect class="mark" x="11.5" y="3.5" width="9" height="9" />
				{:else if item.mark === 'arrow'}
					<circle class="mark ring" cx="5" cy="8" r="3.5" />
					<line class="line" x1="10" x2="21" y1="8" y2="8" />
					<path class="head" d="M25,8 L20,4.5 L20,11.5 Z" />
					<circle class="mark" cx="28.5" cy="8" r="2.5" />
				{:else if item.mark === 'tick'}
					<line class="tick" x1="10" x2="22" y1="8" y2="8" />
				{:else}
					<line class="tick" x1="16" x2="16" y1="1" y2="15" />
				{/if}
			</svg>
			{item.label}
		</li>
	{/each}
</ul>

<style>
	.series-key {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1.5rem;
		margin: 0 0 0.75rem;
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	svg {
		flex: none;
	}

	.line {
		stroke: var(--text);
		stroke-width: 2;
	}

	.line.dashed {
		stroke: var(--text-muted);
		stroke-width: 1.5;
		stroke-dasharray: 4 3;
	}

	.line.long-dash {
		stroke-dasharray: 8 4;
	}

	/* Marks in the text colour: 3:1 and more on both surfaces (NFR-12). */
	.mark {
		fill: var(--text);
		stroke: var(--text);
		stroke-width: 2;
	}

	.mark.ring {
		fill: var(--surface);
	}

	.head {
		fill: var(--text);
	}

	.tick {
		stroke: var(--text-muted);
		stroke-width: 2.5;
	}
</style>

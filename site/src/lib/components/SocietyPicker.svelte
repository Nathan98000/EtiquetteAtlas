<script lang="ts">
	import { headline, type Cell } from '#lib/data/grid.ts';
	import type { SampleId, Societies, Society } from '#lib/data/model.ts';
	import { matchPairs, matchSocieties } from '#lib/data/search.ts';

	interface Props {
		societies: Societies | undefined;
		/** The selected code from the URL; unknown codes count as no selection. */
		selected: string | null;
		sample: SampleId;
		onselect: (code: string | null) => void;
		label?: string;
		/** The clear button's name; the selected society's name follows in brackets. */
		clearLabel?: string;
		/** A society left out of the options, such as the one a fingerprint shows (FR-33). */
		exclude?: string | null;
		/** The only societies offered, such as the 26 in both surveys (D-19). */
		only?: readonly string[] | null;
		/** Decision 122: typing also finds behaviors in situations, and choosing one calls this. */
		onpair?: ((cell: Cell) => void) | null;
		/** Finds behaviors in situations only, as the home page's "Look up a situation" does. */
		pairsOnly?: boolean;
	}

	let {
		societies,
		selected,
		sample,
		onselect,
		label = 'Society',
		clearLabel = 'Clear the society',
		exclude = null,
		only = null,
		onpair = null,
		pairsOnly = false
	}: Props = $props();

	const id = $props.id();
	const inputId = `${id}-input`;
	const listId = `${id}-list`;

	let query = $state('');
	let editing = $state(false);
	let open = $state(false);
	let active = $state(0);
	let input: HTMLInputElement | undefined = $state();

	const current = $derived(societies?.get(selected));

	const sorted = $derived(
		societies
			? societies.list
					.filter((s) => s.code !== exclude && (!only || only.includes(s.code)))
					.sort((a, b) => a.name.localeCompare(b.name, 'en'))
			: []
	);

	type Option =
		{ kind: 'society'; key: string; society: Society } | { kind: 'pair'; key: string; cell: Cell };
	interface Group {
		key: string;
		label: string;
		options: Option[];
		/** How many more matched than are shown. */
		more: number;
	}

	// FR-3: type-ahead by name (or code); names that start with the text come first. With pairs,
	// typing shows up to 6 societies and 8 pairs, each in its own group (decision 122).
	const groups: Group[] = $derived.by(() => {
		const typed = editing ? query : '';
		const found = matchSocieties(sorted, typed);
		const shown = onpair && typed.trim() ? 6 : found.length;
		const societyGroup: Group = {
			key: 'societies',
			label: 'Societies',
			options: found
				.slice(0, shown)
				.map((society): Option => ({ kind: 'society', key: society.code, society })),
			more: found.length - Math.min(shown, found.length)
		};
		if (!onpair) return [societyGroup];
		const cells = matchPairs(typed);
		const pairGroup: Group = {
			key: 'pairs',
			label: 'Behaviors in situations',
			options: cells
				.slice(0, 8)
				.map((cell): Option => ({ kind: 'pair', key: `cell-${cell.index}`, cell })),
			more: Math.max(0, cells.length - 8)
		};
		return (pairsOnly ? [pairGroup] : [societyGroup, pairGroup]).filter(
			(group) => group.options.length
		);
	});
	const options = $derived(groups.flatMap((group) => group.options));

	const optionId = (option: Option) => `${id}-option-${option.key}`;
	const activeOption = $derived(open ? options[active] : undefined);

	function show() {
		open = true;
		const i = options.findIndex((o) => o.kind === 'society' && o.society.code === current?.code);
		active = Math.max(0, i);
	}

	function close() {
		open = false;
		editing = false;
		query = '';
	}

	function choose(option: Option) {
		close();
		if (option.kind === 'pair') onpair?.(option.cell);
		else if (option.society.code !== current?.code) onselect(option.society.code);
	}

	function move(to: number) {
		if (!open) show();
		else active = Math.min(options.length - 1, Math.max(0, to));
		const option = options[active];
		if (option) document.getElementById(optionId(option))?.scrollIntoView({ block: 'nearest' });
	}

	function keydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (event.altKey) show();
				else move(active + 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				move(active - 1);
				break;
			case 'Home':
			case 'End':
				if (!open) return;
				event.preventDefault();
				move(event.key === 'Home' ? 0 : options.length - 1);
				break;
			case 'Enter':
				if (open && activeOption) {
					event.preventDefault();
					choose(activeOption);
				}
				break;
			case 'Escape':
				// §6.3: Escape closes the list; a second Escape clears the typed text.
				if (open) {
					event.preventDefault();
					open = false;
				} else if (editing) {
					event.preventDefault();
					close();
				}
				break;
			case 'Tab':
				close();
				break;
		}
	}

	function clear() {
		close();
		onselect(null);
		input?.focus();
	}
</script>

<!-- FR-3: an ARIA 1.2 combobox with a listbox popup, usable by keyboard alone (NFR-13). -->
<div class="picker">
	<label for={inputId}>{label}</label>
	<div class="field">
		<input
			bind:this={input}
			id={inputId}
			type="text"
			class:clearable={current}
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listId}
			aria-activedescendant={activeOption ? optionId(activeOption) : undefined}
			autocomplete="off"
			spellcheck="false"
			placeholder={pairsOnly
				? 'Try “eat bus” or “phone funeral”'
				: onpair
					? 'Search societies and situations'
					: `Search ${societies?.list.length ?? 90} societies`}
			value={editing ? query : (current?.name ?? '')}
			oninput={(event) => {
				query = event.currentTarget.value;
				editing = true;
				open = true;
				active = 0;
			}}
			onkeydown={keydown}
			onclick={() => (open ? (open = false) : show())}
			onblur={close}
		/>
		{#if current}
			<button
				type="button"
				class="clear"
				aria-label="{clearLabel} ({current.name})"
				onclick={clear}
			>
				<span aria-hidden="true">×</span>
			</button>
		{/if}
	</div>
	{#if open}
		<ul
			id={listId}
			role="listbox"
			aria-label={pairsOnly
				? 'Behaviors in situations'
				: onpair
					? 'Societies and behaviors in situations'
					: 'Societies'}
		>
			{#if onpair}
				{#each groups as group (group.key)}
					<li role="group" aria-labelledby="{id}-{group.key}">
						<div class="group-label" id="{id}-{group.key}" role="presentation">
							{group.label}
						</div>
						<ul role="none">
							{#each group.options as option (option.key)}
								{@render item(option)}
							{/each}
							{#if group.more}
								<li class="more" role="presentation">{group.more} more: type another word</li>
							{/if}
						</ul>
					</li>
				{:else}
					{@render empty()}
				{/each}
			{:else}
				{#each options as option (option.key)}
					{@render item(option)}
				{:else}
					{@render empty()}
				{/each}
			{/if}
		</ul>
	{/if}
</div>

{#snippet item(option: Option)}
	{@const i = options.indexOf(option)}
	<li
		id={optionId(option)}
		role="option"
		tabindex="-1"
		aria-selected={i === active}
		class:active={i === active}
		class:chosen={option.kind === 'society' && option.society.code === current?.code}
		onmousedown={(event) => event.preventDefault()}
		onclick={() => choose(option)}
		onkeydown={keydown}
	>
		{#if option.kind === 'pair'}
			{headline(option.cell)}
		{:else}
			{option.society.name}
			{#if !societies?.inSample(option.society.code, sample)}
				<span class="note">not in this sample</span>
			{/if}
		{/if}
	</li>
{/snippet}

{#snippet empty()}
	<li class="empty" role="presentation">
		{#if pairsOnly}
			{editing && query.trim() ? 'Nothing matches' : 'Type a behavior, a situation or both'}
		{:else if !societies}Loading societies…{:else if onpair}Nothing matches{:else}No society matches{/if}
	</li>
{/snippet}

<style>
	.picker {
		position: relative;
		min-width: 0;
		flex: 1 1 14rem;
		max-width: 22rem;
	}

	label {
		display: block;
		margin-bottom: 0.125rem;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.field {
		position: relative;
	}

	input {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface-raised);
		text-overflow: ellipsis;
	}

	input.clearable {
		padding-right: 2.75rem;
	}

	/* The search's prompt fits a phone's bar (decision 122). */
	@media (max-width: 479.98px) {
		input::placeholder {
			font-size: var(--text-sm);
		}
	}

	.clear {
		position: absolute;
		top: 0;
		right: 0;
		width: 2.75rem;
		height: 100%;
		border: 0;
		background: none;
		font-size: 1.25rem;
		color: var(--text-muted);
	}

	ul {
		position: absolute;
		z-index: 20;
		top: 100%;
		left: 0;
		right: 0;
		max-height: min(20rem, 60vh);
		overflow-y: auto;
		margin: 0.25rem 0 0;
		padding: 0.25rem 0;
		list-style: none;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface-raised);
		box-shadow: var(--shadow);
	}

	ul ul {
		margin: 0;
		padding: 0;
		border: 0;
		box-shadow: none;
		position: static;
		max-height: none;
		overflow: visible;
	}

	li[role='group'] {
		display: block;
		padding: 0;
		cursor: default;
	}

	li[role='group'] + li[role='group'] {
		margin-top: 0.25rem;
		border-top: 1px solid var(--border);
	}

	.group-label {
		padding: 0.375rem 0.75rem 0.125rem;
		font-size: var(--text-sm);
		font-weight: 700;
		color: var(--text-muted);
	}

	li {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
	}

	li.active {
		background: var(--accent);
		color: var(--on-accent);
	}

	li.chosen {
		font-weight: 700;
	}

	.note {
		font-size: var(--text-sm);
		font-style: italic;
	}

	.empty,
	.more {
		color: var(--text-muted);
		cursor: default;
	}

	.more {
		font-size: var(--text-sm);
	}
</style>

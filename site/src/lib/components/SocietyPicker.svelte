<script lang="ts">
	import type { SampleId, Societies, Society } from '#lib/data/model.ts';

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
	}

	let {
		societies,
		selected,
		sample,
		onselect,
		label = 'Society',
		clearLabel = 'Clear the society',
		exclude = null
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

	const fold = (text: string) =>
		text
			.normalize('NFD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase();

	const sorted = $derived(
		societies
			? societies.list
					.filter((s) => s.code !== exclude)
					.sort((a, b) => a.name.localeCompare(b.name, 'en'))
			: []
	);

	// FR-3: type-ahead by name (or code); names that start with the text come first.
	const options = $derived.by(() => {
		const q = fold(query.trim());
		if (!editing || !q) return sorted;
		const starts: Society[] = [];
		const contains: Society[] = [];
		for (const society of sorted) {
			const name = fold(society.name);
			if (name.startsWith(q) || society.code.toLowerCase() === q) starts.push(society);
			else if (name.includes(q)) contains.push(society);
		}
		return [...starts, ...contains];
	});

	const optionId = (code: string) => `${id}-option-${code}`;
	const activeOption = $derived(open ? options[active] : undefined);

	function show() {
		open = true;
		const i = options.findIndex((s) => s.code === current?.code);
		active = Math.max(0, i);
	}

	function close() {
		open = false;
		editing = false;
		query = '';
	}

	function choose(society: Society) {
		close();
		if (society.code !== current?.code) onselect(society.code);
	}

	function move(to: number) {
		if (!open) show();
		else active = Math.min(options.length - 1, Math.max(0, to));
		document.getElementById(optionId(options[active]?.code ?? ''))?.scrollIntoView({
			block: 'nearest'
		});
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
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listId}
			aria-activedescendant={activeOption ? optionId(activeOption.code) : undefined}
			autocomplete="off"
			spellcheck="false"
			placeholder="Search {societies?.list.length ?? 90} societies"
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
		<ul id={listId} role="listbox" aria-label="Societies">
			{#each options as society, i (society.code)}
				{@const outside = !societies?.inSample(society.code, sample)}
				<li
					id={optionId(society.code)}
					role="option"
					tabindex="-1"
					aria-selected={i === active}
					class:active={i === active}
					class:chosen={society.code === current?.code}
					onmousedown={(event) => event.preventDefault()}
					onclick={() => choose(society)}
					onkeydown={keydown}
				>
					{society.name}
					{#if outside}<span class="note">not in this sample</span>{/if}
				</li>
			{:else}
				<li class="empty" role="presentation">
					{societies ? 'No society matches' : 'Loading societies…'}
				</li>
			{/each}
		</ul>
	{/if}
</div>

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
		padding: 0.375rem 2.75rem 0.375rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface-raised);
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

	.empty {
		color: var(--text-muted);
		cursor: default;
	}
</style>

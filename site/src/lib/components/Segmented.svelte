<script lang="ts" generics="T extends string">
	interface Props {
		legend: string;
		/** The radio group's name, unique on the page. */
		name: string;
		value: T;
		options: readonly { value: T; label: string }[];
		onchange: (value: T) => void;
	}

	let { legend, name, value, options, onchange }: Props = $props();
</script>

<!-- A radio group drawn as a segmented control: arrow keys move between options natively. -->
<fieldset class="segmented">
	<legend>{legend}</legend>
	<div class="options">
		{#each options as option (option.value)}
			<label class:checked={option.value === value}>
				<input
					type="radio"
					{name}
					value={option.value}
					checked={option.value === value}
					onchange={() => onchange(option.value)}
				/>
				<span>{option.label}</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}

	legend {
		padding: 0;
		margin-bottom: 0.125rem;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.options {
		display: inline-flex;
		flex-wrap: wrap;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		overflow: hidden;
	}

	label {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		padding: 0.375rem 0.75rem;
		background: var(--surface-raised);
		cursor: pointer;
		line-height: 1.2;
	}

	label + label {
		border-left: 1px solid var(--border-strong);
	}

	label:hover {
		background: var(--surface-muted);
	}

	label.checked {
		background: var(--accent);
		color: var(--on-accent);
		font-weight: 600;
	}

	input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	label:has(input:focus-visible) {
		outline: 3px solid var(--focus);
		outline-offset: -3px;
		z-index: 1;
	}

	label.checked:has(input:focus-visible) {
		outline-color: var(--on-accent);
	}
</style>

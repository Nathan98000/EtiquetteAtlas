<script lang="ts">
	interface Props {
		label: string;
		checked: boolean;
		onchange: (checked: boolean) => void;
		/** Why the toggle cannot be used here; shown beside it and read with it. */
		disabled?: string | null;
	}

	let { label, checked, onchange, disabled = null }: Props = $props();

	const id = $props.id();
</script>

<!-- A checkbox that changes the view, such as "Show uncertainty" (FR-20) or the audiences'
     filters (FR-42). Off limits, it stays visible with its reason. -->
<div class="toggle">
	<label class="check" class:disabled>
		<input
			type="checkbox"
			checked={checked && !disabled}
			disabled={Boolean(disabled)}
			aria-describedby={disabled ? `${id}-why` : undefined}
			onchange={(event) => onchange(event.currentTarget.checked)}
		/>
		{label}
	</label>
	{#if disabled}
		<p id="{id}-why" class="why">{disabled}</p>
	{/if}
</div>

<style>
	.toggle {
		min-width: 0;
	}

	.check {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 2.75rem;
	}

	.check input {
		flex: none;
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--accent);
	}

	.check.disabled {
		color: var(--text-muted);
	}

	.why {
		max-width: 22rem;
		margin: 0;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}
</style>

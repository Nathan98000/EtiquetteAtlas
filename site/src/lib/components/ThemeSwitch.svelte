<script lang="ts">
	import { theme, type ThemeChoice } from '#lib/state/theme.svelte.ts';
</script>

<!-- §6.4: light and dark follow the system, with a manual switch kept in localStorage (NFR-30). -->
<label class="theme">
	<span>Theme</span>
	<select
		value={theme.choice}
		onchange={(event) => theme.set(event.currentTarget.value as ThemeChoice)}
	>
		<option value="system">System</option>
		<option value="light">Light</option>
		<option value="dark">Dark</option>
	</select>
</label>

<style>
	.theme {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	select {
		min-height: 2.75rem;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
		background: var(--surface-raised);
		color: var(--text);
		font-size: var(--text-md);
	}
</style>

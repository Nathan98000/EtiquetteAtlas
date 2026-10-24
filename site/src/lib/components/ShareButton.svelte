<script lang="ts">
	let message = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	// D-28: the browser's own share sheet where there is one, which sends nothing anywhere itself;
	// otherwise the link is copied, as Copy link does (FR-81). Only the page's title and address are
	// shared, and the quiz's answers are never in the address (C-12, decision 80).
	async function share() {
		const url = location.href;
		if (navigator.share) {
			try {
				await navigator.share({ title: document.title, url });
				return;
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') return;
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			message = 'Link copied';
		} catch {
			message = 'Copying failed: the link is in the address bar';
		}
		clearTimeout(timer);
		timer = setTimeout(() => (message = ''), 4000);
	}
</script>

<div class="share needs-js">
	<button type="button" class="button" onclick={share}>
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<path d="M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
		</svg>
		<span class="label">Share</span>
	</button>
	<span class="status" role="status">{message}</span>
</div>

<style>
	.share {
		position: relative;
		flex: none;
	}

	/* At a page's title's top right, in the room a float in the title keeps (app.css, D-23). */
	:global(.page-title) > .share {
		position: absolute;
		top: 0;
		right: 0;
	}

	button {
		width: 6rem;
		justify-content: center;
	}

	svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* Phones: the icon alone, so the title keeps its lines (D-23); the name stays "Share". */
	@media (max-width: 639.98px) {
		button {
			width: 2.75rem;
			min-height: 2rem;
			height: 2rem;
			padding: 0;
		}

		.label {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
	}

	/* Under the button, so the title does not move when it appears. */
	.status {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 5;
		white-space: nowrap;
		font-size: var(--text-sm);
		color: var(--text-muted);
	}

	.status:empty {
		display: none;
	}
</style>

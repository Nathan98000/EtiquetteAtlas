/**
 * D-14, §6.3: on touch, the first tap on a society's dot shows its tip, with a button that
 * chooses the society; a second tap on the dot, a tap anywhere else or Escape closes it. A mouse
 * click and Enter still choose at once. Create it while a component initialises: it closes the tip
 * on a tap outside `container`'s dots and tips.
 */
export class TouchPin {
	/** The society whose tip a tap pinned open. */
	code: string | null = $state(null);
	#pointer = '';

	constructor(container: () => HTMLElement | undefined) {
		$effect(() => {
			if (!this.code) return;
			const close = (event: PointerEvent) => {
				const target = event.target instanceof Element ? event.target : null;
				const own =
					target && container()?.contains(target) && target.closest('.tooltip, [data-code]');
				if (!own) this.code = null;
			};
			window.addEventListener('pointerdown', close);
			return () => window.removeEventListener('pointerdown', close);
		});
	}

	/** Remember how the coming click was made. */
	down(event: PointerEvent): void {
		this.#pointer = event.pointerType;
	}

	/** A click on a dot: true when it chooses the society now, false when a tap pinned its tip. */
	click(code: string): boolean {
		if (this.#pointer !== 'touch') return true;
		this.#pointer = '';
		this.code = this.code === code ? null : code;
		return false;
	}

	close(): void {
		this.code = null;
	}
}

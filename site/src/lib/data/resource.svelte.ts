/**
 * A value loaded for the current inputs, with its error and a retry (FR-86). Create it while a
 * component initialises; `load` may read reactive state, and the load restarts when that state
 * changes. The previous value stays until the next one arrives, so views do not flash empty.
 */
export class Resource<T> {
	current: T | undefined = $state.raw();
	error: Error | undefined = $state.raw();
	loading = $state(false);
	#attempt = $state(0);

	constructor(load: () => Promise<T> | undefined) {
		$effect(() => {
			void this.#attempt;
			const promise = load();
			if (!promise) {
				this.current = undefined;
				this.loading = false;
				return;
			}
			let live = true;
			this.loading = true;
			this.error = undefined;
			promise.then(
				(value) => {
					if (!live) return;
					this.current = value;
					this.loading = false;
				},
				(reason: unknown) => {
					if (!live) return;
					this.error = reason instanceof Error ? reason : new Error(String(reason));
					this.loading = false;
				}
			);
			return () => {
				live = false;
			};
		});
	}

	retry = (): void => {
		this.#attempt += 1;
	};
}

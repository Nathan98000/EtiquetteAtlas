/**
 * Light and dark themes follow the system unless the reader picks one (§6.4). The choice is the
 * only thing the site keeps in localStorage (NFR-30); the inline script in app.html applies it
 * before the first paint.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'theme';

class Theme {
	choice: ThemeChoice = $state('system');

	/** Reads the stored choice after hydration. */
	start(): void {
		try {
			const stored = localStorage.getItem(KEY);
			if (stored === 'light' || stored === 'dark') this.choice = stored;
		} catch {
			// Storage can be blocked; the system theme still applies.
		}
	}

	set(choice: ThemeChoice): void {
		this.choice = choice;
		const root = document.documentElement;
		if (choice === 'system') delete root.dataset.theme;
		else root.dataset.theme = choice;
		try {
			if (choice === 'system') localStorage.removeItem(KEY);
			else localStorage.setItem(KEY, choice);
		} catch {
			// The choice then lasts for this page only.
		}
	}
}

export const theme = new Theme();

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { i18n as i18nType } from 'i18next';
import type { Readable } from 'svelte/store';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

declare module 'svelte' {
	export function getContext(key: 'i18n'): Readable<i18nType>;
}

export {};

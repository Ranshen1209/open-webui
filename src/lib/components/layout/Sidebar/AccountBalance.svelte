<script lang="ts">
	import { onMount, onDestroy, getContext } from 'svelte';
	import { config, user } from '$lib/stores';
	import { getAccountBalance } from '$lib/apis';
	import { formatBalance } from '$lib/utils/balance';
	import Tooltip from '$lib/components/common/Tooltip.svelte';

	const i18n = getContext('i18n');

	export let collapsed = false;

	let balance: {
		available?: boolean;
		credit_remaining?: number;
		currency_symbol?: string;
	} | null = null;

	$: purchaseUrl = $config?.purchase_url ?? 'https://ai1.sakrylle.com/purchase';
	$: available = balance?.available === true;
	$: amountText = available
		? formatBalance(balance?.credit_remaining, balance?.currency_symbol)
		: '';

	const refresh = async () => {
		if (!$user) {
			balance = null;
			return;
		}
		balance = await getAccountBalance(localStorage.token);
	};

	onMount(() => {
		refresh();
		window.addEventListener('focus', refresh);
	});

	onDestroy(() => {
		window.removeEventListener('focus', refresh);
	});
</script>

{#if available && amountText}
	{#if collapsed}
		<Tooltip content={`${$i18n.t('Balance')} ${amountText}`} placement="right">
			<a
				href={purchaseUrl}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={$i18n.t('Top up')}
				class="flex items-center justify-center size-9 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850 transition"
			>
				<!-- wallet icon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="size-4.5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
					/>
				</svg>
			</a>
		</Tooltip>
	{:else}
		<div class="flex items-center justify-between gap-2 rounded-2xl py-1.5 px-3 mb-1 text-sm">
			<span class="text-gray-600 dark:text-gray-400 truncate">
				{$i18n.t('Balance')}
				<span class="font-medium text-gray-900 dark:text-gray-100">{amountText}</span>
			</span>
			<a
				href={purchaseUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="flex-shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-850 hover:bg-gray-200 dark:hover:bg-gray-800 transition"
			>
				{$i18n.t('Top up')}
			</a>
		</div>
	{/if}
{/if}

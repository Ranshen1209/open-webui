<script>
	import { getContext, onMount } from 'svelte';
	const i18n = getContext('i18n');

	import { WEBUI_BASE_URL } from '$lib/constants';

	import Marquee from './common/Marquee.svelte';
	import SlideShow from './common/SlideShow.svelte';
	import ArrowRightCircle from './icons/ArrowRightCircle.svelte';

	// Sakrylle onboarding background — theme-aware (dark / light)
	const bgImage =
		typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
			? `${WEBUI_BASE_URL}/assets/images/sakura-dark.webp`
			: `${WEBUI_BASE_URL}/assets/images/sakura-light.webp`;

	export let show = true;
	export let getStartedHandler = () => {};
	// prominent=true: 渲染醒目登录大按钮(展示页);false: 现有小箭头(首次安装引导)
	export let prominent = false;

	function setLogoImage() {
		const logo = document.getElementById('logo');

		if (logo) {
			const isDarkMode = document.documentElement.classList.contains('dark');

			if (isDarkMode) {
				const darkImage = new Image();
				darkImage.src = `${WEBUI_BASE_URL}/static/favicon-dark.png`;

				darkImage.onload = () => {
					logo.src = `${WEBUI_BASE_URL}/static/favicon-dark.png`;
					logo.style.filter = ''; // Ensure no inversion is applied if splash-dark.png exists
				};

				darkImage.onerror = () => {
					logo.style.filter = 'invert(1)'; // Invert image if splash-dark.png is missing
				};
			}
		}
	}

	$: if (show) {
		setLogoImage();
	}
</script>

{#if show}
	<div class="w-full h-screen max-h-[100dvh] text-white relative bg-[#181016]">
		<div class="fixed m-10 z-50">
			<div class="flex space-x-2">
				<div class=" self-center">
					<img
						id="logo"
						src="{WEBUI_BASE_URL}/static/favicon.png"
						class=" w-6 rounded-full"
						alt="logo"
					/>
				</div>
			</div>
		</div>

		<SlideShow duration={5000} imageUrls={[bgImage]} />

		<div class="w-full h-full absolute top-0 left-0 backdrop-blur-xs bg-black/40"></div>

		<div class="relative bg-transparent w-full h-screen max-h-[100dvh] flex z-10">
			<div class="flex flex-col justify-center w-full items-center text-center">
				<div
					class="text-2xl lg:text-4xl font-secondary leading-relaxed max-w-4xl px-6 [text-shadow:0_2px_12px_rgba(0,0,0,0.65)]"
				>
					<Marquee
						duration={6000}
						words={[
							$i18n.t(
								'In the season of drifting cherry blossoms, every conversation with you reads like a love letter written by the spring breeze'
							),
							$i18n.t('Let inspiration quietly bloom, and let thoughts gently meet')
						]}
					/>
				</div>

				<div class="flex justify-center mt-8">
					{#if prominent}
						<button
							aria-label={$i18n.t('Get started')}
							class="relative z-20 flex items-center justify-center gap-2 w-full max-w-xs sm:w-auto sm:max-w-none px-8 py-3 rounded-full bg-accent-500 hover:bg-accent-400 text-accent-950 transition font-medium text-base shadow-lg"
							on:click={() => {
								getStartedHandler();
							}}
						>
							<span class="font-primary">{$i18n.t(`Get started`)}</span>
							<ArrowRightCircle className="size-5" aria-hidden="true" />
						</button>
					{:else}
						<div class="flex flex-col justify-center items-center">
							<button
								aria-label={$i18n.t('Get started')}
								class="relative z-20 flex p-1 rounded-full bg-white/5 hover:bg-white/10 transition font-medium text-sm"
								on:click={() => {
									getStartedHandler();
								}}
							>
								<ArrowRightCircle className="size-6" aria-hidden="true" />
							</button>
							<div class="mt-1.5 font-primary text-base font-medium" aria-hidden="true">
								{$i18n.t(`Get started`)}
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

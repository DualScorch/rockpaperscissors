<script lang="ts">
	import { randomId } from '$lib/helpers';
	import type { ItemType, ItemValues } from './types';
	import { onDestroy } from 'svelte';

	export let container: HTMLDivElement;
	const { width, height } = container.getBoundingClientRect();
	const randomXPosition = () => Math.random() * (width - positionMargin) + positionMargin;
	const randomYPosition = () => Math.random() * (height - positionMargin) + positionMargin;
	const randomDirection = () => Math.random() * Math.PI * 2;
	const randomValue = (): ItemType => {
		const random = Math.random();
		if (random < 0.33) return 'rock';
		if (random < 0.66) return 'paper';
		return 'scissors';
	};
	const randomSpeed = () => Math.random() * 1.3 + 1;

	export let values: ItemValues = {
		id: randomId(),
		x: randomXPosition(),
		y: randomYPosition(),
		direction: randomDirection(),
		value: randomValue(),
		speed: randomSpeed(),
		radius: 10,
		zoneX: 0,
		zoneY: 0
	};
	// export let items: ItemValues[] = []

	const positionMargin = 64;

	// items.push(values)
	// onDestroy(() => {
	//     items = items.filter(item => item.id !== values.id)
	// })
</script>

<div
	class="flex items-center justify-center text-2xl absolute select-none"
	style="transform: translate({values.x - values.radius}px, {values.y -
		values.radius}px); height: {values.radius * 2}px; width: {values.radius * 2}px;"
>
	{#if values.value === 'rock'}
		🥌
	{:else if values.value === 'paper'}
		📄
	{:else if values.value === 'scissors'}
		✂️
	{/if}
</div>

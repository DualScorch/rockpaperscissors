<script lang="ts">
	import Item from '$lib/Item.svelte';
	import type { ItemType, ItemValues, ItemsStore } from '$lib/types';
	import { onDestroy, onMount } from 'svelte';
	import { construct_svelte_component } from 'svelte/internal';
	import { writable } from 'svelte/store';
	import { fade } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';

	let container: HTMLDivElement;
	let items: ItemValues[] = [];

	const verticalZones = 32;
	const horizonalZones = 18;
	const itemCount = 150;

	// create the zones
	const zones: string[][][] = [];

	const refreshZones = () => {
		for (let i = 0; i < verticalZones; i++) {
			zones[i] = [];
			for (let j = 0; j < horizonalZones; j++) {
				zones[i][j] = [];
			}
		}
	};

	refreshZones();
	let width: number, height: number;

	type TargetEnemies = {
		[key: string]: ItemValues;
	};
	const currentTargets: TargetEnemies = {};

	const checkWallCollision = (item: ItemValues) => {
		if (!container) return;
		// const { width, height } = container.getBoundingClientRect();
		let collided = false;
		if (item.x + item.radius > width || item.x - item.radius < 0) {
			item.direction = Math.PI - item.direction;
			collided = true;
		}
		if (item.y + item.radius > height || item.y - item.radius < 0) {
			item.direction = -item.direction;
			collided = true;
		}
		if (collided) {
			// item.value = getNextValue(item.value);
		}
	};

	const getEnemyType = (value: ItemType) => {
		if (value === 'rock') return 'scissors';
		if (value === 'paper') return 'rock';
		return 'paper';
	};

	const switchValue = (item1: ItemValues, item2: ItemValues) => {
		const item1Value = item1.value;
		const item2Value = item2.value;

		if (item1Value === 'rock') {
			if (item2Value === 'paper') {
				item1.value = 'paper';
			} else if (item2Value === 'scissors') {
				item2.value = 'rock';
			}
		} else if (item1Value === 'paper') {
			if (item2Value === 'rock') {
				item2.value = 'paper';
			} else if (item2Value === 'scissors') {
				item1.value = 'scissors';
			}
		} else if (item1Value === 'scissors') {
			if (item2Value === 'rock') {
				item1.value = 'rock';
			} else if (item2Value === 'paper') {
				item2.value = 'scissors';
			}
		}
	};

	const checkItemCollisions = (item: ItemValues) => {
		for (const otherItem of items) {
			if (otherItem.id === item.id) continue;
			if (Math.abs(item.zoneX - otherItem.zoneX) > 1 || Math.abs(item.zoneY - otherItem.zoneY) > 1)
				continue;
			const dx = item.x - otherItem.x;
			const dy = item.y - otherItem.y;
			if (dx > item.radius + otherItem.radius || dy > item.radius + otherItem.radius) continue;
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (distance < item.radius + otherItem.radius) {
				// $items[itemId].direction = Math.atan2(dy, dx);
				// $items[otherItemId].direction = Math.atan2(-dy, -dx);
				switchValue(item, otherItem);
			}
		}
	};

	const setZone = (item: ItemValues) => {
		item.zoneY = Math.floor((item.y / height) * verticalZones);
		item.zoneX = Math.floor((item.x / width) * horizonalZones);
	};

	const maxTurn = 0.04;
	const setNewDirection = (item: ItemValues, direction: number) => {
		if (Math.abs(item.direction - direction) > maxTurn) {
			if (item.direction > direction) {
				item.direction -= maxTurn;
			} else {
				item.direction += maxTurn;
			}
		} else {
			item.direction = direction;
		}
	};

	const setHomingDirection = (item: ItemValues) => {
		if (hasWon) return;
		const targetEnemyType = getEnemyType(item.value);

		if (currentTargets[item.id]) {
			const targetEnemy = currentTargets[item.id];
			if (targetEnemy.value !== targetEnemyType) {
				delete currentTargets[item.id];
			} else {
				// item.direction = Math.atan2(targetEnemy.y - item.y, targetEnemy.x - item.x);
				setNewDirection(item, Math.atan2(targetEnemy.y - item.y, targetEnemy.x - item.x));
				return;
			}
		}

		let closestEnemy: ItemValues | null = null;
		let closestDistance = Infinity;

		for (const otherItem of items) {
			if (otherItem.id === item.id) continue;
			if (otherItem.value !== targetEnemyType) continue;
			const dx = item.x - otherItem.x;
			const dy = item.y - otherItem.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestEnemy = otherItem;
				// break
			}
		}

		if (closestEnemy) {
			// item.direction = Math.atan2(closestEnemy.y - item.y, closestEnemy.x - item.x);
			setNewDirection(item, Math.atan2(closestEnemy.y - item.y, closestEnemy.x - item.x));
			currentTargets[item.id] = closestEnemy;
		}
	};

	const moveItem = (item: ItemValues) => {
		setHomingDirection(item);
		item.x += Math.cos(item.direction) * item.speed;
		item.y += Math.sin(item.direction) * item.speed;
		setZone(item);
		checkWallCollision(item);
		checkItemCollisions(item);
	};

	const calculateCounts = () => {
		scissorsCount = 0;
		rockCount = 0;
		paperCount = 0;
		for (const item of items) {
			if (item.value === 'scissors') scissorsCount++;
			if (item.value === 'rock') rockCount++;
			if (item.value === 'paper') paperCount++;
		}
	};

	const getNextValue = (value: ItemType) => {
		if (value === 'rock') return 'paper';
		if (value === 'paper') return 'scissors';
		return 'rock';
	};

	const changeValue = (item: ItemValues) => {
		if (Math.random() < 0.0005) {
			item.value = getNextValue(item.value);
		}
	};

	const run = () => {
		if (!container) return;
		const rect = container.getBoundingClientRect();
		width = rect.width;
		height = rect.height;
		for (const item of items) {
			moveItem(item);
			const index = items.indexOf(item);
			items[index] = item;
			// if (!hasWon) {
			// 	changeValue(itemId)
			// }
		}

		// do a for loop using the index so we can modify the array

		calculateCounts();
	};

	const runCountdown = () => {
		if (!hasWon) return;
		if (countdown > 0) {
			countdown--;
		} else {
			countdown = 5;
			restartGame = !restartGame;
			items = [];
		}
	};

	let frametime = 0;
	let frametimes: number[] = [];

	let countdownInterval: number;
	let frametimeSorterInterval: number;
	onMount(async () => {
		// const interval = setInterval(run, 1000 / 60)
		countdownInterval = setInterval(runCountdown, 1000);
		frametimeSorterInterval = setInterval(() => {
			frametimes.sort((a, b) => a - b);
			frametimes = frametimes;
		}, 1000);
		while (true) {
			const now = performance.now();
			run();
			frametime = performance.now() - now;
			frametimes.push(frametime);
			const timeToWait = 1000 / 60 - frametime;
			await new Promise((resolve) => setTimeout(resolve, timeToWait > 0 ? timeToWait : 0.1));
		}

		// onDestroy(() => clearInterval(interval))
	});
	onDestroy(() => clearInterval(countdownInterval));
	onDestroy(() => clearInterval(frametimeSorterInterval));

	let scissorsCount = 0;
	let rockCount = 0;
	let paperCount = 0;

	let hasWon = false;
	let countdown = 5;

	$: hasWon = scissorsCount === itemCount || rockCount === itemCount || paperCount === itemCount;

	$: hasWon, resetCountdown();
	let restartGame = false;
	$: restartGame, (items = []);

	const resetCountdown = () => {
		if (!hasWon) {
			countdown = 5;
		}
	};
</script>

<div class="w-full h-full flex items-center justify-center overflow-hidden">
	<div class="h-full w-full p-4 rounded-md bg-surface-800">
		<div class="w-full h-full relative" bind:this={container}>
			{#key restartGame}
				{#if container}
					{#each Array(itemCount) as _, index}
						<Item {container} bind:values={items[index]} />
					{/each}
				{/if}
			{/key}
		</div>
	</div>
</div>

<div class="flex justify-between w-1/3 absolute top-4 left-1/2 -translate-x-1/2 text-4xl">
	<span class="py-2 px-4 variant-soft-primary rounded-md">
		✂️ {scissorsCount}
	</span>
	<span class="py-2 px-4 variant-soft-primary rounded-md">
		🥌 {rockCount}
	</span>
	<span class="py-2 px-4 variant-soft-primary rounded-md">
		📄 {paperCount}
	</span>
</div>

<button
	class="button absolute top-4 right-4 text-4xl py-2 px-4 variant-glass-primary rounded-md"
	on:click={() => (restartGame = !restartGame)}
>
	🔄
</button>

<span class="absolute top-4 left-4 text-4xl py-2 px-4 variant-glass-primary rounded-md">
	ms: {Math.round(frametime)} <br />
	frames: {frametimes.length || 0} <br />
	avg: {Math.round(frametimes.reduce((a, b) => a + b, 0) / frametimes.length) || 0} <br />
	worst: {Math.round(frametimes[frametimes.length - 1]) || 0} <br />
	1%: {Math.round(
		frametimes
			.slice(frametimes.length - Math.round(frametimes.length * 0.01))
			.reduce((a, b) => a + b, 0) / Math.round(frametimes.length * 0.01)
	) || 0} <br />
	0.1%: {Math.round(
		frametimes
			.slice(frametimes.length - Math.round(frametimes.length * 0.001))
			.reduce((a, b) => a + b, 0) / Math.round(frametimes.length * 0.001)
	) || 0}
</span>

{#if hasWon}
	<span
		transition:fade={{ duration: 250, easing: cubicInOut }}
		class="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-6xl px-4 py-2 bg-black bg-opacity-50 rounded-md text-center"
	>
		{#if scissorsCount === itemCount}
			✂️
		{:else if rockCount === itemCount}
			🥌
		{:else if paperCount === itemCount}
			📄
		{/if}
		won
		<br />
		<span class="text-2xl">
			restarting in {countdown === 5 ? 5 : countdown + 1} seconds
		</span>
	</span>
{/if}

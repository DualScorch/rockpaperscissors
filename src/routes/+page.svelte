<script lang="ts">
	import Item from '$lib/Item.svelte';
	import type { ItemType, ItemsStore } from '$lib/types';
	import { onDestroy, onMount } from 'svelte';
	import { writable } from 'svelte/store';


	let container: HTMLDivElement;
	const items = writable<ItemsStore>({});

	const itemCount = 200;


	type TargetEnemies = {
		[key: string]: string
	}
	const currentTargets: TargetEnemies = {}

	const checkWallCollision = (itemId: string) => {
        if (!container) return
		const item = $items[itemId]
		if (!item) return
		const { width, height } = container.getBoundingClientRect();
		if (item.x + item.radius > width || item.x - item.radius < 0) {
			$items[itemId].direction = Math.PI - item.direction;
			$items[itemId].value = getNextValue(item.value);
		}
		if (item.y + item.radius > height || item.y - item.radius < 0) {
			$items[itemId].direction = -item.direction;
			$items[itemId].value = getNextValue(item.value);
		}
	}

	const getEnemyType = (value: ItemType) => {
		if (value === 'rock') return 'scissors'
		if (value === 'paper') return 'rock'
		return 'paper'
	}

	const switchValue = (item1Id: string, item2Id: string) => {
		const item1 = $items[item1Id]
		const item2 = $items[item2Id]
		if (!item1 || !item2 || item1 === item2) return
		const item1Value = item1.value
		const item2Value = item2.value

		if (item1Value === 'rock') {
			if (item2Value === 'paper') {
				$items[item1Id].value = 'paper'
			} else if (item2Value === 'scissors') {
				$items[item2Id].value = 'rock'
			}
		} else if (item1Value === 'paper') {
			if (item2Value === 'rock') {
				$items[item2Id].value = 'paper'
			} else if (item2Value === 'scissors') {
				$items[item1Id].value = 'scissors'
			}
		} else if (item1Value === 'scissors') {
			if (item2Value === 'rock') {
				$items[item1Id].value = 'rock'
			} else if (item2Value === 'paper') {
				$items[item2Id].value = 'scissors'
			}
		}
	}

	const checkItemCollisions = (itemId: string) => {
		const item = $items[itemId]
		if (!item) return
		for (const otherItemId in $items) {
			if (otherItemId === itemId) continue
			const otherItem = $items[otherItemId]
			if (!otherItem) continue
			const dx = item.x - otherItem.x;
			const dy = item.y - otherItem.y;
			if (dx > item.radius + otherItem.radius || dy > item.radius + otherItem.radius) continue
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (distance < item.radius + otherItem.radius) {
				// $items[itemId].direction = Math.atan2(dy, dx);
				// $items[otherItemId].direction = Math.atan2(-dy, -dx);
				switchValue(itemId, otherItemId)
			}
		}
	}

	const setHomingDirection = (itemId: string) => {
		const item = $items[itemId]
		if (!item) return
		// find the closest enemy
		
		const targetEnemyType = getEnemyType(item.value)

		if (currentTargets[itemId]) {
			const targetEnemy = $items[currentTargets[itemId]]
			if (!targetEnemy || targetEnemy.value !== targetEnemyType) {
				delete currentTargets[itemId]
			} else {
				$items[itemId].direction = Math.atan2(targetEnemy.y - item.y, targetEnemy.x - item.x);
				return
			}
		}
		
		let closestEnemy: string | null = null
		let closestDistance = Infinity
		for (const otherItemId in $items) {
			if (otherItemId === itemId) continue
			const otherItem = $items[otherItemId]
			if (!otherItem) continue
			if (otherItem.value !== targetEnemyType) continue
			const dx = item.x - otherItem.x;
			const dy = item.y - otherItem.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (distance < closestDistance) {
				closestDistance = distance
				closestEnemy = otherItemId
				// break
			}
		}

		if (closestEnemy) {
			const closestEnemyItem = $items[closestEnemy]
			if (!closestEnemyItem) return
			$items[itemId].direction = Math.atan2(closestEnemyItem.y - item.y, closestEnemyItem.x - item.x);
			currentTargets[itemId] = closestEnemy
		}

	}

	const moveItem = (itemId: string) => {
		const item = $items[itemId]
		if (!item) return
		setHomingDirection(itemId)
		$items[itemId].x += Math.cos(item.direction) * item.speed;
		$items[itemId].y += Math.sin(item.direction) * item.speed;
		checkWallCollision(itemId);
		checkItemCollisions(itemId);
	}

	const calculateCounts = () => {
		scissorsCount = 0
		rockCount = 0
		paperCount = 0
		for (const itemId in $items) {
			const item = $items[itemId]
			if (!item) continue
			if (item.value === 'scissors') scissorsCount++
			if (item.value === 'rock') rockCount++
			if (item.value === 'paper') paperCount++
		}
	}

	const getNextValue = (value: ItemType) => {
		if (value === 'rock') return 'paper'
		if (value === 'paper') return 'scissors'
		return 'rock'
	}

	const changeValue = (itemId: string) => {
		if (Math.random() < 0.0005) {
			const item = $items[itemId]
			if (!item) return
			$items[itemId].value = getNextValue(item.value)
		}
	}

	const run = () => {
		for (const itemId in $items) {
			moveItem(itemId)
			// if (!hasWon) {
			// 	changeValue(itemId)
			// }
		}
		calculateCounts()
	}

	const runCountdown = () => {
		if (!hasWon) return
		if (countdown > 0) {
			countdown--
		} else {
			countdown = 5
			// restartGame = !restartGame
		}
	}
	
	let frametime = 0
	onMount(async () => {
		// const interval = setInterval(run, 1000 / 60)
		while (true) {
			const now = performance.now()
			run()
			await new Promise(resolve => setTimeout(resolve, 1))
			frametime = performance.now() - now
		}
		const countdownInterval = setInterval(runCountdown, 1000)
		// onDestroy(() => clearInterval(interval))
		onDestroy(() => clearInterval(countdownInterval))
	})

	let scissorsCount = 0
	let rockCount = 0
	let paperCount = 0

	let hasWon = false
	let countdown = 5

	$: hasWon = scissorsCount === itemCount || rockCount === itemCount || paperCount === itemCount

	let restartGame = false
</script>


<div class="w-full h-full flex items-center justify-center">
	<div class="h-full w-full p-4 rounded-md bg-surface-800">
		<div class="w-full h-full relative" bind:this={container}>
			{#key restartGame}
				{#if container}
					{#each Array(itemCount) as _}
						<Item {items} {container}/>
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

<button class="button absolute top-4 right-4 text-4xl py-2 px-4 variant-glass-primary rounded-md" on:click={() => restartGame = !restartGame}>
	🔄
</button>

<span class="absolute top-4 left-4 text-4xl py-2 px-4 variant-glass-primary rounded-md" >
	{Math.round(frametime)} ms
</span>

{#if hasWon}
	<span class="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-6xl px-4 py-2 bg-black bg-opacity-50 rounded-md text-center">
		{#if scissorsCount === itemCount}
			✂️
		{:else if rockCount === itemCount}
			🥌
		{:else if paperCount === itemCount}
			📄
		{/if}
		 won
		 <br/>
		 <!-- <span class="text-2xl">
			restarting in {countdown === 5 ? 5 :  countdown + 1} seconds
		 </span> -->
	</span>
{/if}


<script lang="ts">
	import type { Writable } from "svelte/store";
    import { randomId } from '$lib/helpers'
	import type { ItemType, ItemValues, ItemsStore } from "./types";
	import { onDestroy } from "svelte";

    export let startingValues: ItemValues | null = null // { x: randomXPosition(), y: randomYPosition(), direction: randomDirection(), value: randomValue(), speed: 2, radius: 20 }
    export let items: Writable<ItemsStore>
    export let container: HTMLDivElement

    const positionMargin = 32

    const {width, height} = container.getBoundingClientRect()
    const randomXPosition = () => Math.random() * (width - positionMargin) + positionMargin
    const randomYPosition = () => Math.random() * (height - positionMargin) + positionMargin
    const randomDirection = () => Math.random() * Math.PI * 2
    const randomValue = (): ItemType => {
        const random = Math.random()
        if (random < 0.33) return 'rock'
        if (random < 0.66) return 'paper'
        return 'scissors'
    }
    const randomSpeed = () => Math.random() * 4 + 1

    if (!startingValues) startingValues = { x: randomXPosition(), y: randomYPosition(), direction: randomDirection(), value: randomValue(), speed: randomSpeed(), radius: 10 }

    const itemId = randomId()
    $items[itemId] = startingValues

    onDestroy(() => {
        delete $items[itemId]
    })
</script>

<div class="flex items-center justify-center text-2xl absolute " style="transform: translate({$items[itemId].x - $items[itemId].radius}px, {$items[itemId].y - $items[itemId].radius}px); height: {$items[itemId].radius * 2}px; width: {$items[itemId].radius * 2}px;">
    {#if $items[itemId].value === 'rock'}
        🥌
    {:else if $items[itemId].value === 'paper'}
        📄
    {:else if $items[itemId].value === 'scissors'}
        ✂️
    {/if}
</div>
<script lang="ts">
	import { randomId } from '$lib/helpers';
	import type { Entity, EntityType, GameConfig, Grid, ItemType } from '$lib/types';
	import { Vector } from '$lib/vector';
	import { onDestroy, onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { space } from 'svelte/internal';
	import { fade } from 'svelte/transition';

	let canvas: HTMLCanvasElement;
	let loaded = false;

	let redrawGUI = false;

	const FPS = 60;
	let frametime = 1000 / FPS;
	$: frametime = 1000 / FPS;

	let then = Date.now();

	let countdown = 0;
	let countdownInterval: number;

	const getRandomType = (): ItemType => {
		const rnd = Math.random();
		if (rnd < 0.33) return 'rock';
		if (rnd < 0.66) return 'paper';
		return 'scissors';
	};

	const hashStringToNumbers = (input: string): [number, number, number] => {
		// Simple hash function to convert the string to a number
		let hash = 0;
		for (let i = 0; i < input.length; i++) {
			const charCode = input.charCodeAt(i);
			hash = (hash << 5) - hash + charCode;
			hash |= 0; // Convert to 32-bit integer
		}

		// Reduce the hash value to three numbers between 0 and 255
		const num1 = (hash & 0xff) % 256;
		const num2 = ((hash >> 8) & 0xff) % 256;
		const num3 = ((hash >> 16) & 0xff) % 256;

		return [num1, num2, num3];
	};

	const getTarget = (type: EntityType): EntityType => {
		switch (type) {
			case 'rock':
				return 'scissors';
			case 'paper':
				return 'rock';
			case 'scissors':
				return 'paper';
		}
	};

	let scissors: HTMLImageElement;
	let scissorsHd: HTMLImageElement;

	let paper: HTMLImageElement;
	let paperHd: HTMLImageElement;

	let rock: HTMLImageElement;
	let rockHd: HTMLImageElement;

	let destroy = false;

	onDestroy(() => {
		destroy = true;
	});
	const imageMap: Map<ItemType, HTMLImageElement> = new Map();

	let imagesLoaded = 0;
	const loadImages = () => {
		scissors = new Image();
		scissors.src = '/scissors.png';
		scissors.addEventListener('load', () => {
			imagesLoaded++;
		});

		scissorsHd = new Image();
		scissorsHd.src = '/scissors_hd.png';
		scissorsHd.addEventListener('load', () => {
			imageMap.set('scissors', scissorsHd);
			imagesLoaded++;
		});

		paper = new Image();
		paper.src = '/paper.png';
		paper.addEventListener('load', () => {
			imagesLoaded++;
		});

		paperHd = new Image();
		paperHd.src = '/paper_hd.png';
		paperHd.addEventListener('load', () => {
			imageMap.set('paper', paperHd);
			imagesLoaded++;
		});

		rock = new Image();
		rock.src = '/rock.png';
		rock.addEventListener('load', () => {
			imagesLoaded++;
		});

		rockHd = new Image();
		rockHd.src = '/rock_hd.png';
		rockHd.addEventListener('load', () => {
			imageMap.set('rock', rockHd);
			imagesLoaded++;
		});
	};

	$: loaded = imagesLoaded === 6;

	let scale = 1;
	let translateX = 0;
	let translateY = 0;

	let gameSpeed = 1;
	$: gameSpeed = 1 / scale;

	let lastFrametime = 0;
	class Game {
		ctx: CanvasRenderingContext2D;
		grid: Grid;
		entities: Set<Entity>;
		config: GameConfig;
		currentTargets: {
			[key: string]: Entity | null;
		};
		rocks: Entity[];
		papers: Entity[];
		scissors: Entity[];

		constructor(ctx: CanvasRenderingContext2D) {
			this.ctx = ctx;
			this.config = {
				items: 5000,
				radius: 6,
				state: 'running'
			};
			loadImages();
			this.setCanvasSize();
			// this.setProportionalRadius();

			this.grid = {};
			this.entities = new Set();
			this.currentTargets = {};
			this.rocks = [];
			this.papers = [];
			this.scissors = [];

			for (let i = 0; i < this.config.items; i++) {
				this.addEntity();
			}
		}

		restartCountdown() {
			if (countdownInterval) return;
			countdown = 5;
			countdownInterval = setInterval(() => {
				countdown = countdown - 0.1;
				if (countdown <= 0) {
					this.restart();
					clearInterval(countdownInterval);
					countdownInterval = 0;
				}
			}, 100);
		}

		restart() {
			this.grid = {};
			this.entities = new Set();
			this.currentTargets = {};
			this.rocks = [];
			this.papers = [];
			this.scissors = [];

			for (let i = 0; i < this.config.items; i++) {
				this.addEntity();
			}
		}

		addEntity() {
			const entity = this.createRandomEntity();
			this.entities.add(entity);
			this.setZone(entity);
			this.currentTargets[entity.id] = null;

			if (entity.value === 'rock') {
				this.rocks.push(entity);
			} else if (entity.value === 'paper') {
				this.papers.push(entity);
			} else if (entity.value === 'scissors') {
				this.scissors.push(entity);
			}
		}

		removeEntity(entity: Entity) {
			if (!this.entities.has(entity)) return;

			this.entities.delete(entity);
			entity.lives = 0;
		}

		createRandomEntity = (): Entity => {
			return {
				id: randomId(),
				position: {
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height
				},
				velocity: Vector.random(),
				speed: Math.random() * 0.5 + 0.5,
				value: getRandomType(),
				zone: {
					x: 0,
					y: 0
				},
				lives: 20
			};
		};

		findNearestTarget = (entity: Entity): Entity | null => {
			const targetType = getTarget(entity.value);

			if (targetType === 'rock' && this.rocks.length === 0) return null;
			if (targetType === 'paper' && this.papers.length === 0) return null;
			if (targetType === 'scissors' && this.scissors.length === 0) return null;

			const currentTarget = this.currentTargets[entity.id];
			if (
				currentTarget !== null &&
				currentTarget?.value === targetType &&
				currentTarget.lives > 0 &&
				Vector.dist(entity.position, currentTarget.position) < 150
			) {
				return currentTarget;
			}

			this.currentTargets[entity.id] = null;

			let closestDistance = Infinity;
			let closestEntity: Entity | null = null;
			for (const e of this.entities) {
				if (e.value === targetType) {
					const distance = Vector.dist(entity.position, e.position);
					if (distance < closestDistance) {
						closestDistance = distance;
						closestEntity = e;

						if (distance < 150) {
							break;
						}
					}
				}
			}

			if (closestEntity) {
				this.currentTargets[entity.id] = closestEntity;
				return closestEntity;
			}

			return null;
		};

		getZoneEntities(zoneX: number, zoneY: number): Set<Entity> {
			return this.grid?.[zoneY]?.[zoneX] ?? new Set();
		}

		getNeighbors(zoneX: number, zoneY: number): Set<Entity>[] {
			const neighbours: Set<Entity>[] = [];
			for (let x = zoneX - 1; x <= zoneX + 1; x++) {
				for (let y = zoneY - 1; y <= zoneY + 1; y++) {
					neighbours.push(this.getZoneEntities(x, y));
				}
			}
			return neighbours;
		}

		setZone(entity: Entity) {
			const yZone = Math.floor(entity.position.y / (this.config.radius * 2));
			const xZone = Math.floor(entity.position.x / (this.config.radius * 2));

			if (entity.zone.x === xZone && entity.zone.y === yZone) return;

			if (this.grid[yZone] && this.grid[yZone][xZone]) {
				this.grid[yZone][xZone].delete(entity);
			}

			if (this.grid[yZone] === undefined) {
				this.grid[yZone] = {};
			}

			if (this.grid[yZone][xZone] === undefined) {
				this.grid[yZone][xZone] = new Set();
			}

			this.grid[yZone][xZone].add(entity);

			entity.zone.x = xZone;
			entity.zone.y = yZone;
		}

		checkWallCollision(entity: Entity) {
			const radius = this.config.radius;
			if (entity.position.x + radius > this.ctx.canvas.width) {
				entity.position.x = this.ctx.canvas.width - radius;
				entity.velocity.x *= -1;
			}

			if (entity.position.x - radius < 0) {
				entity.position.x = radius;
				entity.velocity.x *= -1;
			}

			if (entity.position.y + radius > this.ctx.canvas.height) {
				entity.position.y = this.ctx.canvas.height - radius;
				entity.velocity.y *= -1;
			}

			if (entity.position.y - radius < 0) {
				entity.position.y = radius;
				entity.velocity.y *= -1;
			}
		}

		switchValue(entity1: Entity, entity2: Entity) {
			const entity1Value = entity1.value;
			const entity2Value = entity2.value;

			if (entity1Value === 'rock') {
				if (entity2Value === 'paper') {
					entity1.value = 'paper';
					entity1.lives--;
				} else if (entity2Value === 'scissors') {
					entity2.value = 'rock';
					entity2.lives--;
				}
			} else if (entity1Value === 'paper') {
				if (entity2Value === 'rock') {
					entity2.value = 'paper';
					entity2.lives--;
				} else if (entity2Value === 'scissors') {
					entity1.value = 'scissors';
					entity1.lives--;
				}
			} else if (entity1Value === 'scissors') {
				if (entity2Value === 'rock') {
					entity1.value = 'rock';
					entity1.lives--;
				} else if (entity2Value === 'paper') {
					entity2.value = 'scissors';
					entity2.lives--;
				}
			}
		}

		checkEntityCollisions(entity: Entity) {
			const radius = this.config.radius;
			for (const zone of this.getNeighbors(entity.zone.x, entity.zone.y)) {
				for (const other of zone) {
					if (other.id === entity.id) continue;
					if (other.lives <= 0) continue;
					const distance = Vector.dist(entity.position, other.position);
					if (distance < radius * 2) {
						const collisionNormal = Vector.normalize(Vector.sub(other.position, entity.position));
						const dotProduct = Vector.dot(entity.velocity, collisionNormal);

						if (dotProduct < 0) continue;

						const reflection = Vector.mult(collisionNormal, 2 * dotProduct);

						entity.velocity = Vector.normalize(Vector.sub(entity.velocity, reflection));
						other.velocity = Vector.normalize(Vector.add(other.velocity, reflection));

						this.switchValue(entity, other);
					}
				}
			}
		}

		setHomingTarget(entity: Entity) {
			const target = this.findNearestTarget(entity);
			if (!target) return;

			const direction = Vector.sub(target.position, entity.position);
			entity.velocity = Vector.normalize(direction);
		}

		handleEntity(entity: Entity) {
			entity.position.x += entity.velocity.x * entity.speed * gameSpeed;
			entity.position.y += entity.velocity.y * entity.speed * gameSpeed;

			this.checkWallCollision(entity);
			this.checkEntityCollisions(entity);
			this.setZone(entity);
			this.setHomingTarget(entity);
		}

		handleEntities() {
			for (const entity of this.entities) {
				this.handleEntity(entity);
			}
		}

		skip() {
			requestAnimationFrame(() => this.run());
		}

		setProportionalRadius() {
			const { width, height } = this.ctx.canvas;
			this.config.radius = Math.floor(Math.min(width, height) / 200);
		}

		setCanvasSize() {
			const { width, height } = this.ctx.canvas.getBoundingClientRect();
			this.ctx.canvas.width = width;
			this.ctx.canvas.height = height;
		}

		getZoneColor(zoneX: number, zoneY: number): string {
			// Seed the random number generator using the zone coordinates
			const numbers = hashStringToNumbers(`${zoneX}${zoneY}`);

			// Return the formatted color string
			return `rgba(${numbers[0]}, ${numbers[1]}, ${numbers[2]}, 1)`;
		}

		drawGrid() {
			const { width, height } = this.ctx.canvas;
			const radius = this.config.radius;
			// this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
			this.ctx.lineWidth = 1;
			for (let x = 0; x < width; x += radius * 2) {
				for (let y = 0; y < height; y += radius * 2) {
					this.ctx.strokeStyle = this.getZoneColor(x, y);
					this.ctx.strokeRect(x, y, radius * 2, radius * 2);
				}
			}
		}

		toggleGameState() {
			if (this.config.state === 'running') {
				this.config.state = 'paused';
			} else {
				this.config.state = 'running';
			}
		}

		setEntityCount(count: number) {
			const diff = count - this.entities.size;
			if (this.entities.size - diff < 0 && diff < 0) return;
			if (diff > 0) {
				for (let i = 0; i < diff; i++) {
					this.addEntity();
				}
			} else {
				if (countdownInterval) return;
				const iterator = this.entities.values();
				for (let i = 0; i < Math.abs(diff); i++) {
					this.removeEntity(iterator.next().value);
				}
			}
		}

		run() {
			if (Math.random() < 0.001) {
				console.log(this.grid);
			}
			this.setCanvasSize();
			if (!loaded) {
				this.skip();
				return;
			}

			if (destroy) {
				destroy = false;
				return;
			}

			this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
			this.ctx.scale(scale, scale);
			this.ctx.translate(translateX, translateY);

			this.ctx.strokeStyle = '#0fba81';
			this.ctx.lineWidth = 4;
			this.ctx.globalAlpha = 0.5;
			this.ctx.roundRect(4, 4, this.ctx.canvas.width - 8, this.ctx.canvas.height - 8, 4);
			this.ctx.stroke();

			this.ctx.globalAlpha = 1;

			const now = Date.now();
			if (now - then > frametime && this.config.state === 'running') {
				lastFrametime = now - then;
				then = now;
				this.handleEntities();
			}

			for (const entity of this.entities) {
				if (entity.lives <= 0) {
					this.entities.delete(entity);
				}
			}

			const radius = this.config.radius;
			const doubleRadius = radius * 2;
			for (const entity of this.entities) {
				this.ctx.drawImage(
					imageMap.get(entity.value)!,
					entity.position.x - radius,
					entity.position.y - radius,
					doubleRadius,
					doubleRadius
				);

				// this.ctx.strokeStyle = this.getZoneColor(entity.zone.x, entity.zone.y);
				// this.ctx.strokeRect(
				// 	entity.position.x - radius,
				// 	entity.position.y - radius,
				// 	radius * 2,
				// 	radius * 2
				// );
			}

			this.rocks = [...this.entities].filter((entity) => entity.value === 'rock');
			this.papers = [...this.entities].filter((entity) => entity.value === 'paper');
			this.scissors = [...this.entities].filter((entity) => entity.value === 'scissors');

			const rocksLength = this.rocks.length;
			const papersLength = this.papers.length;
			const scissorsLength = this.scissors.length;

			if (
				rocksLength + papersLength === 0 ||
				rocksLength + scissorsLength === 0 ||
				papersLength + scissorsLength === 0
			) {
				this.restartCountdown();
			}

			// this.drawGrid();
			redrawGUI = !redrawGUI;

			requestAnimationFrame(() => this.run());
		}
	}

	let isMouseDown = false;
	let game: Game;
	onMount(() => {
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			console.error('Could not get canvas context');
			return;
		}
		game = new Game(ctx);
		console.log(game);
		requestAnimationFrame(() => game.run());
	});

	const handleScale = (e) => {
		// Get the current scale before changing it
		const prevScale = scale;

		// Determine the mouse position relative to the container
		const container = e.currentTarget;
		const containerRect = container.getBoundingClientRect();
		const mouseX = e.clientX - containerRect.left;
		const mouseY = e.clientY - containerRect.top;

		// Adjust the scale based on the scroll direction
		const delta = e.deltaY;
		if (delta < 0) {
			scale += 0.25 * scale * 0.75;
		} else if (scale > 1) {
			scale -= 0.25 * scale * 0.75;
		} else {
			return;
		}

		if (scale > 16) {
			scale = 16;
			return;
		}

		if (scale < 1) {
			scale = 1;
			return;
		}
		// Adjust translateX and translateY to keep the mouse position stable during zoom
		translateX -= mouseX * (1 / prevScale - 1 / scale);
		translateY -= mouseY * (1 / prevScale - 1 / scale);
	};

	const handleMove = (e) => {
		if (!isMouseDown) return;
		const delta = {
			x: e.movementX,
			y: e.movementY
		};

		translateX += delta.x * (1 / scale);
		translateY += delta.y * (1 / scale);
	};
</script>

<!-- <svelte:window
	on:resize={() => {
		if (game) game.setCanvasSize();
	}}
/> -->

<div class="relative p-4 w-full h-full flex items-center justify-center select-none">
	{#if game}
		{#key redrawGUI}
			<div
				class="flex justify-between w-full px-8 sm:w-1/3 absolute bottom-8 sm:bottom-auto sm:top-8 left-1/2 -translate-x-1/2 h2"
			>
				<span
					class="py-2 px-4 variant-glass-primary flex items-center rounded-md sm:w-40 w-24 justify-between"
				>
					<img src="/scissors.svg" class="w-8 sm:w-12" alt="Scissors" />
					{game.scissors.length}
				</span>
				<span
					class="py-2 px-4 variant-glass-primary flex items-center rounded-md sm:w-40 w-24 justify-between"
				>
					<img src="/rock.svg" class="w-8 sm:w-12" alt="Rock" />
					{game.rocks.length}
				</span>
				<span
					class="py-2 px-4 variant-glass-primary flex items-center rounded-md sm:w-40 w-24 justify-between"
				>
					<img src="/paper.svg" class="w-8 sm:w-12" alt="Paper" />
					{game.papers.length}
				</span>
			</div>
		{/key}
		<span
			class="absolute top-8 left-8 !h2 variant-glass-tertiary w-20 text-center px-4 py-2 rounded-md"
		>
			{lastFrametime}
		</span>

		<div class="flex gap-4 flex-col absolute top-8 right-8">
			<button
				on:click={() => game.toggleGameState()}
				class="btn !h2 variant-glass-primary rounded-md"
			>
				{#if game.config.state === 'running'}
					<img src="/pause.svg" class="h-8 sm:h-10" alt="Pause" />
				{:else}
					<img src="/play.svg" class="h-8 sm:h-10" alt="Play" />
				{/if}
			</button>
			<button on:click={() => game.restart()} class="btn !h2 variant-glass-primary rounded-md">
				<img src="/restart.svg" class="h-8 sm:h-10" alt="Restart" />
			</button>

			<button
				on:click={() => game.setEntityCount(game.entities.size + 100)}
				class="btn variant-glass-primary rounded-md !h3"
			>
				+100
			</button>
			<button
				on:click={() => game.setEntityCount(game.entities.size - 100)}
				class="btn variant-glass-primary rounded-md !h3"
			>
				-100
			</button>
		</div>
		{#if countdown > 0}
			<div
				out:fade={{ duration: 150, easing: cubicOut }}
				class="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 !h1 variant-glass-surface rounded-md px-4 py-2"
			>
				{#key countdown}
					{countdown.toFixed(1)}
				{/key}
			</div>
		{/if}
	{/if}
	<canvas
		on:mousewheel={(e) => handleScale(e)}
		on:mousedown={(e) => {
			if (e.button !== 0) return;
			isMouseDown = true;
		}}
		on:mouseup={(e) => {
			if (e.button !== 0) return;
			isMouseDown = false;
		}}
		on:mousemove={(e) => handleMove(e)}
		class="w-full h-full"
		bind:this={canvas}
	/>
</div>

<!-- 
<button
	class="button absolute top-4 right-4 h2 py-2 px-4 variant-glass-primary rounded-md rounded-md"
	on:click={() => (restartGame = !restartGame)}
>
	🔄
</button> -->

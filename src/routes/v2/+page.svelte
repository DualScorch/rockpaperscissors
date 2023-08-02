<script lang="ts">
	import { randomId } from '$lib/helpers';
	import type { Entity, GameConfig, Grid, GridCell, ItemType } from '$lib/types';
	import { Vector } from '$lib/vector';
	import { onDestroy, onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let loaded = false;

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

	// const getGridCells = (entity: Entity): { x: number; y: number } => {
	// 	const cells = entity.gridKey.split('-').map((v) => parseInt(v, 10));
	// 	return { x: cells[0], y: cells[1] };
	// };

	let scissors: HTMLImageElement;
	let paper: HTMLImageElement;
	let rock: HTMLImageElement;

	let destroy = false;

	onDestroy(() => {
		destroy = true;
	});

	let imagesLoaded = 0;
	const loadImages = () => {
		scissors = new Image();
		scissors.src = '/scissors.png';
		scissors.addEventListener('load', () => {
			imagesLoaded++;
		});

		paper = new Image();
		paper.src = '/paper.png';
		paper.addEventListener('load', () => {
			imagesLoaded++;
		});

		rock = new Image();
		rock.src = '/rock.png';
		rock.addEventListener('load', () => {
			imagesLoaded++;
		});
	};

	$: loaded = imagesLoaded === 3;

	class Game {
		ctx: CanvasRenderingContext2D;
		grid: Grid;
		entities: Entity[];
		config: GameConfig;

		constructor(ctx: CanvasRenderingContext2D) {
			this.ctx = ctx;
			this.grid = {};
			this.entities = [];
			this.config = {
				items: 800,
				radius: 10,
				state: 'running'
			};
			this.setCanvasSize();

			for (let i = 0; i < this.config.items; i++) {
				const entity = this.createRandomEntity();
				this.entities.push(entity);
				this.setZone(entity);
			}

			loadImages();
		}

		createRandomEntity = (): Entity => {
			return {
				id: randomId(),
				position: {
					x: Math.random() * canvas.width,
					y: Math.random() * canvas.height
				},
				velocity: Vector.random(),
				speed: 1,
				value: getRandomType(),
				zoneX: 0,
				zoneY: 0
			};
		};

		// getNeighbors(entity: Entity): Entity[] {
		// 	const neighbours: Entity[] = [];
		// 	const cells = getGridCells(entity);
		// 	for (let x = cells.x - 1; x <= cells.x + 1; x++) {
		// 		for (let y = cells.y - 1; y <= cells.y + 1; y++) {
		// 			const key = `${x}-${y}`;
		// 			if (this.grid[key]) {
		// 				for (const neighbour of this.grid[key]) {
		// 					if (neighbour.id === entity.id) continue;
		// 					neighbours.push(neighbour);
		// 				}
		// 			}
		// 		}
		// 	}
		// 	return neighbours;
		// }

		getNeighbors(entity: Entity): Entity[] {
			const neighbours: Entity[] = [];

			for (let x = entity.zoneX - 2; x <= entity.zoneX + 2; x++) {
				for (let y = entity.zoneY - 2; y <= entity.zoneY + 2; y++) {
					if (this.grid[y] && this.grid[y][x]) {
						for (const neighbour of this.grid[y][x]) {
							if (neighbour.id === entity.id) continue;
							neighbours.push(neighbour);
						}
					}
				}
			}
			return neighbours;
		}

		setZone(entity: Entity) {
			const yZone = Math.floor(entity.position.y / (this.config.radius * 2));
			const xZone = Math.floor(entity.position.x / (this.config.radius * 2));

			if (entity.zoneX === xZone && entity.zoneY === yZone) return;

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

			entity.zoneX = xZone;
			entity.zoneY = yZone;
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
				} else if (entity2Value === 'scissors') {
					entity2.value = 'rock';
				}
			} else if (entity1Value === 'paper') {
				if (entity2Value === 'rock') {
					entity2.value = 'paper';
				} else if (entity2Value === 'scissors') {
					entity1.value = 'scissors';
				}
			} else if (entity1Value === 'scissors') {
				if (entity2Value === 'rock') {
					entity1.value = 'rock';
				} else if (entity2Value === 'paper') {
					entity2.value = 'scissors';
				}
			}
		}

		checkEntityCollisions(entity: Entity) {
			const radius = this.config.radius;
			for (const other of this.getNeighbors(entity)) {
				const distance = Vector.dist(entity.position, other.position);
				if (distance < radius * 2) {
					const collisionNormal = Vector.normalize(Vector.sub(other.position, entity.position));
					const dotProduct = Vector.dot(entity.velocity, collisionNormal);

					if (dotProduct < 0) continue;

					const reflection = Vector.mult(collisionNormal, 2 * dotProduct);

					entity.velocity = Vector.sub(entity.velocity, reflection);
					other.velocity = Vector.add(other.velocity, reflection);

					entity.velocity = Vector.normalize(entity.velocity);
					other.velocity = Vector.normalize(other.velocity);

					this.switchValue(entity, other);
				}
			}
		}

		handleEntity(entity: Entity) {
			entity.position.x += entity.velocity.x * entity.speed;
			entity.position.y += entity.velocity.y * entity.speed;

			this.checkWallCollision(entity);
			this.checkEntityCollisions(entity);
			this.setZone(entity);
		}

		handleEntities() {
			for (const entity of this.entities) {
				this.handleEntity(entity);
			}
		}

		skip() {
			requestAnimationFrame(() => this.run());
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
				return;
			}

			this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

			this.handleEntities();
			const radius = this.config.radius;
			this.ctx.font = `${radius * 2}px serif`;
			for (const entity of this.entities) {
				this.ctx.drawImage(
					entity.value === 'rock' ? rock : entity.value === 'paper' ? paper : scissors,
					entity.position.x - radius,
					entity.position.y - radius,
					radius * 2,
					radius * 2
				);
				// this.ctx.strokeStyle = this.getZoneColor(entity.zoneX, entity.zoneY);
				// this.ctx.strokeRect(
				// 	entity.position.x - radius,
				// 	entity.position.y - radius,
				// 	radius * 2,
				// 	radius * 2
				// );
			}

			// this.drawGrid();

			requestAnimationFrame(() => this.run());
		}
	}

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			console.error('Could not get canvas context');
			return;
		}
		const game = new Game(ctx);
		console.log(game);
		requestAnimationFrame(() => game.run());
	});
</script>

<div class="relative p-4 w-full h-full bg-surface-800 flex items-center justify-center">
	<canvas class="w-full h-full" bind:this={canvas} />
</div>

<script lang="ts">
	import { randomId } from '$lib/helpers';
	import type {
		Entity,
		EntityType,
		GameConfig,
		Grid,
		GridCell,
		ItemType,
		Vector2D
	} from '$lib/types';
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

	let scale = 1;
	let translateX = 0;
	let translateY = 0;

	let gameSpeed = 1;
	$: gameSpeed = 1 / scale;
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
			this.grid = {};
			this.entities = new Set();
			this.config = {
				items: 1500,
				radius: 8,
				state: 'running'
			};
			this.currentTargets = {};
			this.setCanvasSize();
			this.rocks = [];
			this.papers = [];
			this.scissors = [];

			for (let i = 0; i < this.config.items; i++) {
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
				currentTarget.lives > 0
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

						if (distance < 300) {
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

			// const toCheck: Vector2D[] = [entity.zone];
			// const checked: Set<string> = new Set();

			// const maxX = Math.floor((canvas.width / this.config.radius) * 2);
			// const maxY = Math.floor((canvas.height / this.config.radius) * 2);

			// while (toCheck.length > 0) {
			// 	const current = toCheck.pop();
			// 	if (current === undefined) continue;
			// 	checked.add(Vector.toString(current));

			// 	if (current.x < 0 || current.y < 0) continue;
			// 	if (current.x >= maxX || current.y >= maxY) continue;

			// 	const entities = this.getZoneEntities(current.x, current.y);
			// 	for (const e of entities) {
			// 		if (e.value === targetType) {
			// 			this.currentTargets[entity.id] = e;
			// 			return e;
			// 		}
			// 	}

			// 	const x1y = { x: current.x - 1, y: current.y };
			// 	if (!checked.has(Vector.toString(x1y))) {
			// 		toCheck.push(x1y);
			// 	}
			// 	const x2y = { x: current.x + 1, y: current.y };
			// 	if (!checked.has(Vector.toString(x2y))) {
			// 		toCheck.push(x2y);
			// 	}
			// 	const xy1 = { x: current.x, y: current.y - 1 };
			// 	if (!checked.has(Vector.toString(xy1))) {
			// 		toCheck.push(xy1);
			// 	}
			// 	const xy2 = { x: current.x, y: current.y + 1 };
			// 	if (!checked.has(Vector.toString(xy2))) {
			// 		toCheck.push(xy2);
			// 	}
			// }

			// return null;
		};

		getZoneEntities(zoneX: number, zoneY: number): Set<Entity> {
			if (this.grid[zoneY] && this.grid[zoneY][zoneX]) {
				return this.grid[zoneY][zoneX];
			}
			return new Set();
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

						entity.velocity = Vector.sub(entity.velocity, reflection);
						other.velocity = Vector.add(other.velocity, reflection);

						entity.velocity = Vector.normalize(entity.velocity);
						other.velocity = Vector.normalize(other.velocity);

						this.switchValue(entity, other);
					}
				}
			}
		}

		handleEntity(entity: Entity) {
			entity.position.x += entity.velocity.x * entity.speed * gameSpeed;
			entity.position.y += entity.velocity.y * entity.speed * gameSpeed;

			this.checkWallCollision(entity);
			this.checkEntityCollisions(entity);
			this.setZone(entity);

			const target = this.findNearestTarget(entity);
			if (!target) return;

			const direction = Vector.sub(target.position, entity.position);
			entity.velocity = Vector.normalize(direction);
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
			this.ctx.scale(scale, scale);
			this.ctx.translate(translateX, translateY);

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

				// this.ctx.strokeStyle = this.getZoneColor(entity.zone.x, entity.zone.y);
				// this.ctx.strokeRect(
				// 	entity.position.x - radius,
				// 	entity.position.y - radius,
				// 	radius * 2,
				// 	radius * 2
				// );
			}

			for (const entity of this.entities) {
				if (entity.lives <= 0) {
					this.entities.delete(entity);
				}
			}

			this.ctx.scale(2, 2);

			this.rocks = [...this.entities].filter((entity) => entity.value === 'rock');
			this.papers = [...this.entities].filter((entity) => entity.value === 'paper');
			this.scissors = [...this.entities].filter((entity) => entity.value === 'scissors');

			// this.drawGrid();

			requestAnimationFrame(() => this.run());
		}
	}

	// function handleZoom(event: MouseEvent) {
	//         event.preventDefault();
	//         var x = event.clientX - canvas.offsetLeft;
	//         var y = event.clientY - canvas.offsetTop;
	//         var scroll = event.deltaY < 0 ? 1 : -2;

	//         var zoom = Math.exp(scroll * zoomIntensity);

	//         context.translate(orgnx, orgny);

	//         orgnx -= x / (scale * zoom) - x / scale;
	//         orgny -= y / (scale * zoom) - y / scale;

	//         context.scale(zoom, zoom);
	//         context.translate(-orgnx, -orgny);

	//         // Updating scale and visisble width and height
	//         scale *= zoom;
	//         visibleWidth = width / scale;
	//         visibleHeight = height / scale;
	//     }

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

<div class="relative p-4 w-full h-full bg-surface-800 flex items-center justify-center">
	<canvas
		on:mousewheel={(e) => handleScale(e)}
		on:mousedown={() => (isMouseDown = true)}
		on:mouseup={() => (isMouseDown = false)}
		on:mousemove={(e) => handleMove(e)}
		class="w-full h-full"
		bind:this={canvas}
	/>
	<button
		on:click={() => console.log(game.entities)}
		class="btn absolute top-0 right-0 variant-soft-primary">Entities</button
	>
</div>

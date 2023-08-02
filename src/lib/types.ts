export type ItemType = 'rock' | 'paper' | 'scissors';

export type Vector2D = {
    x: number;
    y: number;
}

export type EntityType = ItemType

export type Entity = {
    id: string;
    position: Vector2D;
    velocity: Vector2D;
    speed: number;
    value: ItemType;
    zone: Vector2D;
    lives: number;
}

export type Grid = {
    [key: string]: {
        [key: string]: Set<Entity>;
    }
}

export type GridCell = {
    [key: string]: Entity;
}

export type GameConfig = {
    items: number;
    radius: number;
    state: 'running' | 'paused';
}

export type ItemValues = {
    id: string;
    x: number;
    y: number;
    direction: number;
    speed: number;
    radius: number;
    value: ItemType;
    zoneX: number;
    zoneY: number;
}

export type ItemsStore = {
    [key: string]: ItemValues;
}
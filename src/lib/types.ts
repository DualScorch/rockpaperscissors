export type ItemType = 'rock' | 'paper' | 'scissors';

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
export type ItemType = 'rock' | 'paper' | 'scissors';

export type ItemValues = {
    x: number;
    y: number;
    direction: number;
    speed: number;
    radius: number;
    value: ItemType;
}

export type ItemsStore = {
    [key: string]: ItemValues;
}
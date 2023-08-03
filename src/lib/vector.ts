import type { Vector2D } from "./types";


export class Vector {
    static new = () => ({ x: 0, y: 0 });

    static add(v1: Vector2D, v2: Vector2D): Vector2D {
        return {
            x: v1.x + v2.x,
            y: v1.y + v2.y
        }
    }

    static sub(v1: Vector2D, v2: Vector2D): Vector2D {
        return {
            x: v1.x - v2.x,
            y: v1.y - v2.y
        }
    }

    static mult(v1: Vector2D, scalar: number): Vector2D {
        return {
            x: v1.x * scalar,
            y: v1.y * scalar
        }
    }

    static div(v1: Vector2D, v2: Vector2D): Vector2D {
        return {
            x: v1.x / v2.x,
            y: v1.y / v2.y
        }
    }

    static dot(v1: Vector2D, v2: Vector2D): number {
        return v1.x * v2.x + v1.y * v2.y;
    }

    static copy(v: Vector2D): Vector2D {
        return {
            x: v.x,
            y: v.y
        }
    }

    static angle(v: Vector2D): number {
        return Math.atan2(v.y, v.x);
    }

    static magnitude(v: Vector2D): number {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }

    static normalize(v: Vector2D): Vector2D {
        const magnitude = Vector.magnitude(v);
        return Vector.div(v, { x: magnitude, y: magnitude });
    }

    static dist(v1: Vector2D, v2: Vector2D): number {
        return Vector.magnitude(Vector.sub(v1, v2));
    }

    static angleBetween(v1: Vector2D, v2: Vector2D): number {
        return Math.atan2(v2.y - v1.y, v2.x - v1.x);
    }

    static random(): Vector2D {
        const angle = Math.random() * Math.PI * 2;
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        }
    }

    static heading(v: Vector2D): number {
        return Math.atan2(v.y, v.x);
    }

    static toString(v: Vector2D): string {
        return `${v.x},${v.y}`;
    }
}
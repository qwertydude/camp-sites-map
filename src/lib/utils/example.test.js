import { describe, it, expect } from 'vitest';

function sum(a, b) {
    return a + b;
}

describe('sum function', () => {
    it('adds two numbers correctly', () => {
        expect(sum(2, 3)).toBe(5);
        expect(sum(-1, 1)).toBe(0);
    });
});

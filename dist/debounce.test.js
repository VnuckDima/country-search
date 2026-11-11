import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { debounce } from './debounce';
describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    it('calls fn after delay when not called again', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);
        debounced('a');
        expect(fn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(99);
        expect(fn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('a');
    });
    it('resets the timer when called again before delay expires', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);
        debounced('a');
        vi.advanceTimersByTime(50);
        debounced('b');
        vi.advanceTimersByTime(50);
        expect(fn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('b');
    });
    it('supports multiple arguments', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);
        debounced('x', 'y');
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('x', 'y');
        expect(fn.mock.calls[0]).toEqual(['x', 'y']);
    });
});

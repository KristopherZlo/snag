import { describe, expect, it } from 'vitest';
import { buttonVariants } from './index';

describe('buttonVariants', () => {
    it('includes pointer affordances for interactive and disabled states', () => {
        const classes = buttonVariants();

        expect(classes).toContain('cursor-pointer');
        expect(classes).toContain('disabled:cursor-not-allowed');
    });
});

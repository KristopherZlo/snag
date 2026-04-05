import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import ZoomableImageLightbox from '@/Shared/ZoomableImageLightbox.vue';

describe('ZoomableImageLightbox', () => {
    const originalResizeObserver = globalThis.ResizeObserver;

    beforeEach(() => {
        globalThis.ResizeObserver = class {
            observe() {}

            disconnect() {}
        };
    });

    afterEach(() => {
        globalThis.ResizeObserver = originalResizeObserver;
        document.body.innerHTML = '';
    });

    it('opens the lightbox and updates zoom controls', async () => {
        const wrapper = mount(ZoomableImageLightbox, {
            props: {
                src: 'https://storage.example.test/report.png',
                alt: 'Bug report screenshot',
                placeholder: {
                    average_color: '#111827',
                    blur_data_url: 'data:image/png;base64,AAAA',
                },
            },
            attachTo: document.body,
            global: {
                stubs: {
                    Dialog: {
                        template: '<div><slot /></div>',
                    },
                    DialogContent: {
                        template: '<div><slot /></div>',
                    },
                    DialogDescription: {
                        template: '<div><slot /></div>',
                    },
                    DialogTitle: {
                        template: '<div><slot /></div>',
                    },
                },
            },
        });

        const viewport = wrapper.get('[data-testid="zoomable-image-viewport"]').element;
        const image = wrapper.get('[data-testid="zoomable-image-full"]').element;
        const trigger = wrapper.get('[data-testid="zoomable-image-trigger"]');
        const triggerImage = wrapper
            .findAll('[data-testid="zoomable-image-trigger"] img')
            .find((candidate) => candidate.attributes('data-testid') !== 'progressive-media-blur');

        expect(trigger.classes()).toContain('cursor-pointer');
        expect(trigger.classes()).toContain('h-full');
        expect(triggerImage).toBeTruthy();
        expect(triggerImage.classes()).toContain('group-hover:scale-[1.04]');
        expect(triggerImage.classes()).toContain('transform-gpu');

        viewport.getBoundingClientRect = () => ({
            width: 1200,
            height: 800,
            top: 0,
            left: 0,
            right: 1200,
            bottom: 800,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        });
        Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 1600 });
        Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 900 });

        image.dispatchEvent(new Event('load'));
        await nextTick();

        expect(wrapper.get('[data-testid="zoomable-image-zoom-level"]').text()).toBe('100%');

        await wrapper.get('[data-testid="zoomable-image-zoom-in"]').trigger('click');
        expect(wrapper.get('[data-testid="zoomable-image-zoom-level"]').text()).toBe('125%');

        await wrapper.get('[data-testid="zoomable-image-reset"]').trigger('click');
        expect(wrapper.get('[data-testid="zoomable-image-zoom-level"]').text()).toBe('100%');
    });
});

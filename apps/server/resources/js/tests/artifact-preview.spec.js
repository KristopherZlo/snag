import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ArtifactPreview from '@/Shared/ArtifactPreview.vue';

describe('ArtifactPreview', () => {
    it('renders a camera fallback when a screenshot preview is missing', () => {
        const wrapper = mount(ArtifactPreview, {
            props: {
                mediaKind: 'screenshot',
                preview: null,
            },
        });

        const fallback = wrapper.get('[data-testid="artifact-preview-fallback"]');

        expect(fallback.attributes('data-kind')).toBe('screenshot');
        expect(wrapper.find('img').exists()).toBe(false);
        expect(wrapper.find('video').exists()).toBe(false);
    });

    it('falls back to a video icon after a video preview load error', async () => {
        const wrapper = mount(ArtifactPreview, {
            props: {
                mediaKind: 'video',
                preview: {
                    kind: 'video',
                    url: 'http://localhost/broken-preview.webm',
                },
            },
        });

        await wrapper.get('video').trigger('error');

        expect(wrapper.get('[data-testid="artifact-preview-fallback"]').attributes('data-kind')).toBe('video');
    });
});

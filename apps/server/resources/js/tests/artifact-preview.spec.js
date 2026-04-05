import { flushPromises, mount } from '@vue/test-utils';
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

    it('shows an animated skeleton until image previews finish loading', async () => {
        const wrapper = mount(ArtifactPreview, {
            props: {
                mediaKind: 'screenshot',
                preview: {
                    kind: 'screenshot',
                    url: 'http://localhost/capture.png',
                },
            },
        });

        expect(wrapper.find('[data-testid="artifact-preview-skeleton"]').exists()).toBe(true);

        await wrapper.get('img').trigger('load');

        expect(wrapper.find('[data-testid="artifact-preview-skeleton"]').exists()).toBe(false);
    });

    it('renders a color-first blur placeholder when preview metadata is available', async () => {
        const wrapper = mount(ArtifactPreview, {
            props: {
                mediaKind: 'screenshot',
                preview: {
                    kind: 'screenshot',
                    url: 'http://localhost/capture.png',
                    placeholder: {
                        average_color: '#1f2937',
                        blur_data_url: 'data:image/png;base64,AAAA',
                    },
                },
            },
        });

        expect(wrapper.find('[data-testid="artifact-preview-skeleton"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="progressive-media-blur"]').exists()).toBe(true);

        await wrapper.get('img:not([data-testid="progressive-media-blur"])').trigger('load');

        expect(wrapper.find('[data-testid="progressive-media-blur"]').exists()).toBe(false);
    });

    it('renders a local dashboard placeholder for lightweight video previews', async () => {
        const wrapper = mount(ArtifactPreview, {
            props: {
                mediaKind: 'video',
                staticPreviewOnly: true,
                preview: {
                    kind: 'video',
                    url: 'http://localhost/full-video.webm',
                    duration_seconds: 42,
                },
            },
        });

        await flushPromises();

        expect(wrapper.find('video').exists()).toBe(false);
        expect(wrapper.find('img').exists()).toBe(false);
        expect(wrapper.get('[data-testid="artifact-preview-video-placeholder"]').text()).toContain('Video capture');
        expect(wrapper.get('[data-testid="artifact-preview-video-placeholder"]').text()).toContain('00:42');
    });

    it('renders a generated screenshot preview for lightweight video cards when one exists', async () => {
        const wrapper = mount(ArtifactPreview, {
            props: {
                mediaKind: 'video',
                staticPreviewOnly: true,
                preview: {
                    kind: 'screenshot',
                    url: 'http://localhost/full-preview.jpg',
                    dashboard_url: 'http://localhost/dashboard-preview.jpg',
                    duration_seconds: 42,
                },
            },
        });

        await flushPromises();

        expect(wrapper.find('img').exists()).toBe(true);
        expect(wrapper.find('[data-testid="artifact-preview-video-placeholder"]').exists()).toBe(false);
    });

    it('can open screenshot previews in a fullscreen viewer while still rendering a lightweight trigger image', async () => {
        const wrapper = mount(ArtifactPreview, {
            props: {
                mediaKind: 'screenshot',
                staticPreviewOnly: true,
                allowImageFullscreen: true,
                imageElementClass: 'group-hover/report-card:scale-[1.04]',
                preview: {
                    kind: 'screenshot',
                    url: 'http://localhost/full-preview.jpg',
                    dashboard_url: 'http://localhost/dashboard-preview.jpg',
                    placeholder: {
                        average_color: '#111827',
                        blur_data_url: 'data:image/png;base64,AAAA',
                    },
                },
            },
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

        await flushPromises();

        expect(wrapper.get('[data-testid="zoomable-image-trigger"]').exists()).toBe(true);
        const previewImage = wrapper.find('img[src="http://localhost/dashboard-preview.jpg"]');

        expect(previewImage.exists()).toBe(true);
        expect(previewImage.classes()).toContain('group-hover/report-card:scale-[1.04]');
    });
});

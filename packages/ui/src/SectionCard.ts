import { defineComponent, h } from 'vue';

export const SectionCard = defineComponent({
    name: 'SectionCard',
    props: {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
    },
    setup(props, { slots }) {
        return () =>
            h('section', { class: 'ck-card' }, [
                h('div', { class: 'ck-head' }, [
                    h('h3', props.title),
                    props.description ? h('p', props.description) : null,
                ]),
                slots.default?.(),
            ]);
    },
});

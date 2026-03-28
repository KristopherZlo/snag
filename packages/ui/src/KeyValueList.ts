import { defineComponent, h, PropType } from 'vue';

export interface KeyValueItem {
    label: string;
    value: string;
}

export const KeyValueList = defineComponent({
    name: 'KeyValueList',
    props: {
        items: {
            type: Array as PropType<KeyValueItem[]>,
            required: true,
        },
    },
    setup(props) {
        return () =>
            h(
                'div',
                { class: 'ck-meta' },
                props.items.map((item) =>
                    h('div', { key: item.label }, [
                        h('strong', `${item.label}: `),
                        h('span', item.value),
                    ]),
                ),
            );
    },
});

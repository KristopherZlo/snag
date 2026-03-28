import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const primaryPalette = {
    50: '#f8f3ec',
    100: '#f0e6d8',
    200: '#e2d0b8',
    300: '#d0b08c',
    400: '#ba9065',
    500: '#8b5e34',
    600: '#7c532d',
    700: '#684625',
    800: '#54391e',
    900: '#423019',
    950: '#24180c',
};

const surfacePalette = {
    0: '#ffffff',
    50: '#fbf9f5',
    100: '#f3eee5',
    200: '#e5dac8',
    300: '#d3c1a6',
    400: '#bca180',
    500: '#9c8160',
    600: '#7f674b',
    700: '#66523d',
    800: '#4f4131',
    900: '#382f24',
    950: '#1e1812',
};

export default definePreset(Aura, {
    semantic: {
        primary: primaryPalette,
        colorScheme: {
            light: {
                primary: {
                    color: primaryPalette[700],
                    contrastColor: '#ffffff',
                    hoverColor: primaryPalette[800],
                    activeColor: primaryPalette[900],
                },
                highlight: {
                    background: primaryPalette[100],
                    focusBackground: primaryPalette[200],
                    color: '#2b241a',
                    focusColor: '#2b241a',
                },
                surface: surfacePalette,
            },
        },
        formField: {
            borderRadius: '10px',
            focusRing: {
                width: '1px',
                style: 'solid',
                color: primaryPalette[400],
                offset: '0',
                shadow: '0 0 0 3px rgba(139, 94, 52, 0.12)',
            },
        },
        content: {
            borderRadius: '12px',
        },
        overlay: {
            select: {
                borderRadius: '12px',
            },
            popover: {
                borderRadius: '12px',
            },
            modal: {
                borderRadius: '14px',
            },
        },
        navigation: {
            item: {
                borderRadius: '8px',
            },
        },
    },
});

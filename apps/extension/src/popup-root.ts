import { createApp } from 'vue';
import PopupApp from './components/PopupApp.vue';

export const PopupRoot = PopupApp;

export function mountPopup(target: HTMLElement): void {
    createApp(PopupApp).mount(target);
}

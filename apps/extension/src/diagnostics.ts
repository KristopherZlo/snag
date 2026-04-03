import { createApp } from 'vue';
import './style.css';
import DiagnosticsApp from './components/DiagnosticsApp.vue';

document.documentElement.dataset.surface = 'diagnostics';
document.body.dataset.surface = 'diagnostics';

const target = document.getElementById('app');

if (target) {
    createApp(DiagnosticsApp).mount(target);
}

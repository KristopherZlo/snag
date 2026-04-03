import './style.css';
import { mountPopup } from './popup-root';

document.documentElement.dataset.surface = 'popup';
document.body.dataset.surface = 'popup';

const target = document.getElementById('app');

if (target) {
    mountPopup(target);
}

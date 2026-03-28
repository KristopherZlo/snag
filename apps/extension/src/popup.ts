import './popup.css';
import { mountPopup } from './popup-root';

const target = document.getElementById('app');

if (target) {
    mountPopup(target);
}

/* Option 2: the evening 3D scene of Foundation fills the hero; the camera pushes in from above and settles into a slow orbit. */
import { mountScene } from './assets/js/scene.js';
const host = document.getElementById('scene3d');
let scene = mountScene(host, { cinematic: true, view: 'site', frameRight: innerWidth >= 860, interactive: innerWidth >= 860, phone: innerWidth < 860 });
document.getElementById('replay').addEventListener('click', () => { scene.destroy(); scene = mountScene(host, { cinematic: true, view: 'site', frameRight: innerWidth >= 860, interactive: innerWidth >= 860, phone: innerWidth < 860 }); });

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildMotorcycle } from './motorcycleModel.js';

gsap.registerPlugin(ScrollTrigger);

// One entry per step returned by buildMotorcycle, in the same order.
const STEPS = [
  { title: 'Le cadre', text: 'La base de la moto. Toutes les autres pièces viennent s’y fixer.' },
  { title: 'Le moteur', text: 'Le bloc 125 cm³ se boulonne sous le cadre, avec ses repose-pieds.' },
  { title: 'La roue arrière', text: 'Bras oscillant, roue, chaîne et amortisseurs prennent place à l’arrière.' },
  { title: 'L’échappement', text: 'Le pot se fixe à la sortie du moteur et longe le côté droit.' },
  { title: 'Le train avant', text: 'La fourche, la roue avant, son frein à disque et le garde-boue.' },
  { title: 'Le guidon', text: 'Guidon, poignées, leviers et rétroviseurs.' },
  { title: 'Les carénages', text: 'Les habillages protègent la mécanique ; la face avant reçoit le phare.' },
  { title: 'La selle', text: 'La selle, la poignée passager et le feu arrière terminent le montage.' }
];
const INTRO_CAPTION = { label: 'Vue éclatée', title: `${STEPS.length} étapes, une moto`, text: 'Chaque pièce attend sa place. Faites défiler pour lancer le montage.' };
const DONE_CAPTION = { label: 'Terminé', title: 'Prête à rouler.', text: 'Toutes les pièces sont en place.' };

// Scroll budget in step-sized units: a short hold before the first step and a
// final turn around the finished bike after the last one.
const INTRO = 0.3;
const OUTRO = 0.7;
const GHOST_OPACITY = 0.26;
const FOCUS_Y = 0.6;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const lerp = (from, to, t) => from + (to - from) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(23, 24, 22, 0.55)');
  gradient.addColorStop(1, 'rgba(23, 24, 22, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export default function AssemblyScroll() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      setWebglFailed(true);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.8;
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(2, 4, 3);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.9);
    fill.position.set(-3, 2, -2);
    scene.add(key, fill, new THREE.HemisphereLight(0xffffff, 0xd9d4c6, 0.4));

    const model = buildMotorcycle();
    scene.add(model.root);
    const shadowTexture = createShadowTexture();
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    scene.add(shadow);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    let narrow = false;
    let dirty = true;

    function resize() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      narrow = width <= 640;
      // Keep the bike clear of the copy: right of the text column on wide
      // screens, above the caption card on phones.
      if (width > 900) camera.setViewOffset(width, height, -width * 0.12, height * 0.05, width, height);
      else if (narrow) camera.setViewOffset(width, height, 0, height * 0.1, width, height);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      dirty = true;
    }

    let lastStep = null;
    function apply(progress) {
      const units = progress * (STEPS.length + INTRO + OUTRO) - INTRO;
      const assembly = Math.min(STEPS.length, Math.max(0, units));
      const outro = easeInOut(clamp01((units - STEPS.length) / OUTRO));

      model.steps.forEach((pieces, index) => {
        const stagger = 0.1;
        const span = 1 - stagger * (pieces.length - 1);
        const opacity = lerp(GHOST_OPACITY, 1, clamp01((assembly - index) / 0.25));
        pieces.forEach((part, order) => {
          const remaining = 1 - easeInOut(clamp01((assembly - index - order * stagger) / span));
          part.holder.position.copy(part.base).addScaledVector(part.offset, remaining);
          part.holder.rotation.set(part.spin.x * remaining, part.spin.y * remaining, part.spin.z * remaining);
          if (part.opacity === opacity) return;
          const transparent = opacity < 1;
          for (const material of part.materials) {
            if (material.transparent !== transparent) material.needsUpdate = true;
            material.transparent = transparent;
            material.opacity = opacity;
            material.depthWrite = opacity > 0.6;
          }
          part.opacity = opacity;
        });
      });
      shadowMaterial.opacity = lerp(0.35, 1, assembly / STEPS.length);

      const sweep = easeInOut(assembly / STEPS.length);
      const theta = lerp(lerp(0.85, -0.6, sweep), 0.5, outro);
      const phi = lerp(lerp(0.36, 0.2, sweep), 0.14, outro);
      const radius = (lerp(5.4, 4.4, sweep) + outro * 0.2) * (narrow ? lerp(2, 1.75, sweep) : 1);
      camera.position.set(
        Math.sin(theta) * Math.cos(phi) * radius,
        FOCUS_Y + Math.sin(phi) * radius,
        Math.cos(theta) * Math.cos(phi) * radius
      );
      camera.lookAt(0, FOCUS_Y, 0);

      const step = units < 0 ? -1 : Math.min(STEPS.length, Math.floor(assembly));
      if (step !== lastStep) {
        lastStep = step;
        setActiveStep(step);
      }
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${assembly / STEPS.length})`;
    }

    const smoothing = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0.12;
    let target = 0;
    let current = -1;
    let frame = 0;
    let visible = false;

    function tick() {
      frame = 0;
      if (current < 0) current = target;
      const next = Math.abs(target - current) < 0.0005 ? target : current + (target - current) * smoothing;
      if (next !== current || dirty) {
        current = next;
        apply(current);
        renderer.render(scene, camera);
        dirty = false;
      }
      if (visible) frame = requestAnimationFrame(tick);
    }

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => { target = self.progress; }
    });
    target = trigger.progress;
    ScrollTrigger.refresh();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(tick);
    }, { rootMargin: '200px 0px' });
    intersectionObserver.observe(section);

    return () => {
      cancelAnimationFrame(frame);
      trigger.kill();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      scene.traverse((object) => {
        if (!object.isMesh) return;
        object.geometry.dispose();
        object.material.dispose();
      });
      shadowTexture.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  const caption = activeStep < 0
    ? INTRO_CAPTION
    : activeStep >= STEPS.length
      ? DONE_CAPTION
      : { label: `Étape ${String(activeStep + 1).padStart(2, '0')} / ${String(STEPS.length).padStart(2, '0')}`, ...STEPS[activeStep] };

  return (
    <section className={`assembly-section ${webglFailed ? 'is-static' : ''}`} id="montage" ref={sectionRef} aria-labelledby="assembly-title">
      <div className="assembly-sticky">
        <canvas ref={canvasRef} className="assembly-canvas" aria-hidden="true" />
        <div className="assembly-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> Le montage, pas à pas</p>
          <h2 id="assembly-title">Pièce par<br /><em>pièce.</em></h2>
          <ol className="assembly-steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className={index === activeStep ? 'is-active' : index < activeStep ? 'is-done' : ''}>
                <span>{String(index + 1).padStart(2, '0')}</span>{step.title}
              </li>
            ))}
          </ol>
        </div>
        {webglFailed
          ? <p className="assembly-fallback">La vue 3D n’est pas disponible sur ce navigateur.</p>
          : <div className="assembly-caption">
            <span className="assembly-count">{caption.label}</span>
            <h3>{caption.title}</h3>
            <p>{caption.text}</p>
            <div className="assembly-progress"><span ref={progressRef} /></div>
          </div>}
        <span className="assembly-note">Modèle 3D illustratif</span>
      </div>
    </section>
  );
}

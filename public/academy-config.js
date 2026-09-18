// DMF Academy — Module & Lesson Configuration
// Stream base URL: set DMF_STREAM_BASE in .env or defaults to localhost test server
// Cloudflare Stream pattern: {STREAM_BASE}/{VIDEO_UID}/manifest/video.m3u8
(function (root) {
  'use strict';

  var STREAM_BASE = root.__DMF_STREAM_BASE__ || 'http://localhost:8080';

  var MODULES = [
    {
      id: '01', code: 'IDEA',
      title: { en: 'Track Structure & Development', es: 'Estructura y desarrollo de un track' },
      desc: {
        en: 'Turn a loop or idea into a finished song: structure, intro, break, build-up, drop, outro and energy development.',
        es: 'Convierte un loop o una idea en una canción completa: estructura, intro, break, build-up, drop, outro y desarrollo de energía.'
      },
      duration: '~75 min',
      lessons: [
        { id: 'L01', title: { en: 'Kick / Snare / Hi Hat', es: 'Kick / Snare / Hi Hat' }, streamUid: '87da20f0d21e697054a3e84c0e6c78c7', duration: '18 min' },
        { id: 'L02', title: { en: 'Intro & Break', es: 'Intro y break' }, duration: '15 min' },
        { id: 'L03', title: { en: 'Build-up & Drop', es: 'Build-up y drop' }, duration: '20 min' },
        { id: 'L04', title: { en: 'Energy & Outro', es: 'Energía y outro' }, duration: '22 min' }
      ],
      practice: {
        en: 'Take one of your loops and build a full arrangement: intro (16 bars), break, build-up, drop and outro. Export and submit for review.',
        es: 'Toma uno de tus loops y construye un arreglo completo: intro (16 compases), break, build-up, drop y outro. Exporta y envía para revisión.'
      }
    },
    {
      id: '02', code: 'MIX',
      title: { en: 'Mixing & Balance', es: 'Mixing y balance' },
      desc: {
        en: 'A cleaner, more powerful mix: element balance, kick/bass relationship, EQ, dynamics, space and frequencies.',
        es: 'Una mezcla más limpia y potente: balance de elementos, relación kick/bass, EQ, dinámica, espacio y frecuencias.'
      },
      duration: '~90 min',
      lessons: [
        { id: 'L01', title: { en: 'Gain Staging & Balance', es: 'Gain staging y balance' }, duration: '22 min' },
        { id: 'L02', title: { en: 'Kick/Bass Relationship', es: 'Relación kick/bass' }, duration: '25 min' },
        { id: 'L03', title: { en: 'EQ & Dynamics', es: 'EQ y dinámica' }, duration: '23 min' },
        { id: 'L04', title: { en: 'Space & Frequencies', es: 'Espacio y frecuencias' }, duration: '20 min' }
      ],
      practice: {
        en: 'Mix your Module 01 arrangement from scratch using the techniques covered. Submit the mixdown.',
        es: 'Mezcla tu arreglo del Módulo 01 desde cero usando las técnicas cubiertas. Envía el mixdown.'
      }
    },
    {
      id: '03', code: 'SOUND',
      title: { en: 'Sound Selection', es: 'Sound Selection' },
      desc: {
        en: 'Choosing sounds that work in the track — kicks, bass, percussion, synths, textures and FX.',
        es: 'Elegir sonidos que funcionen dentro del track — kicks, bajos, percusión, synths, texturas y FX.'
      },
      duration: '~80 min',
      lessons: [
        { id: 'L01', title: { en: 'The Right Sound', es: 'El sonido correcto' }, duration: '20 min' },
        { id: 'L02', title: { en: 'Percussion & Textures', es: 'Percusión y texturas' }, duration: '20 min' },
        { id: 'L03', title: { en: 'Synths & FX', es: 'Synths y FX' }, duration: '20 min' },
        { id: 'L04', title: { en: 'Layering & Context', es: 'Layering y contexto' }, duration: '20 min' }
      ],
      practice: {
        en: 'Rebuild the percussion and texture layer of your track using curated selections. Submit before/after comparison.',
        es: 'Reconstruye la capa de percusión y texturas de tu track con selecciones curadas. Envía comparación antes/después.'
      }
    },
    {
      id: '04', code: 'BASS',
      title: { en: 'Bass Creation', es: 'Creación de bajos' },
      desc: {
        en: 'Building and choosing bass, the kick/bass relationship, groove and low frequencies.',
        es: 'Construcción y selección de bajos, relación kick/bass, groove y frecuencias bajas.'
      },
      duration: '~70 min',
      lessons: [
        { id: 'L01', title: { en: 'Bass Fundamentals', es: 'Fundamentos de bajos' }, duration: '18 min' },
        { id: 'L02', title: { en: 'Synthesis & Design', es: 'Síntesis y diseño' }, duration: '18 min' },
        { id: 'L03', title: { en: 'Groove & Movement', es: 'Groove y movimiento' }, duration: '18 min' },
        { id: 'L04', title: { en: 'Low End Control', es: 'Control del low end' }, duration: '16 min' }
      ],
      practice: {
        en: 'Create a bass line from scratch that locks with your kick. Submit the solo bass and the full mix.',
        es: 'Crea una línea de bajo desde cero que encaje con tu kick. Envía el bajo solo y la mezcla completa.'
      }
    },
    {
      id: '05', code: 'FLOW',
      title: { en: 'Workflow & Efficiency', es: 'Workflow y eficiencia' },
      desc: {
        en: 'Organize your process to produce faster and decide better.',
        es: 'Organiza tu proceso para producir más rápido y decidir mejor.'
      },
      duration: '~60 min',
      lessons: [
        { id: 'L01', title: { en: 'Session Setup', es: 'Setup de sesión' }, duration: '15 min' },
        { id: 'L02', title: { en: 'Templates & Routing', es: 'Templates y routing' }, duration: '15 min' },
        { id: 'L03', title: { en: 'Decision Making', es: 'Toma de decisiones' }, duration: '15 min' },
        { id: 'L04', title: { en: 'Time Management', es: 'Gestión del tiempo' }, duration: '15 min' }
      ],
      practice: {
        en: 'Create your production template and produce a 4-bar idea in under 30 minutes. Document your process.',
        es: 'Crea tu template de producción y produce una idea de 4 compases en menos de 30 minutos. Documenta tu proceso.'
      }
    },
    {
      id: '06', code: 'MINDSET',
      title: { en: 'Producer Mindset', es: 'Producer Mindset' },
      desc: {
        en: 'Finish projects, beat perfectionism and build a results-oriented mindset.',
        es: 'Terminar proyectos, combatir el perfeccionismo y desarrollar una mentalidad orientada a resultados.'
      },
      duration: '~60 min',
      lessons: [
        { id: 'L01', title: { en: 'Finishing Tracks', es: 'Terminar tracks' }, duration: '15 min' },
        { id: 'L02', title: { en: 'Beating Perfectionism', es: 'Combatir el perfeccionismo' }, duration: '15 min' },
        { id: 'L03', title: { en: 'Creative Blocks', es: 'Bloqueos creativos' }, duration: '15 min' },
        { id: 'L04', title: { en: 'Long-term Growth', es: 'Crecimiento a largo plazo' }, duration: '15 min' }
      ],
      practice: {
        en: 'Write a reflection on your biggest production block. Then finish one abandoned project and submit it.',
        es: 'Escribe una reflexión sobre tu mayor bloqueo productivo. Luego termina un proyecto abandonado y envíalo.'
      }
    },
    {
      id: '07', code: 'MARKET',
      title: { en: 'Music Market', es: 'Music Market' },
      desc: {
        en: 'How the ecosystem works: labels, releases, presenting your music and career development.',
        es: 'Cómo funciona el ecosistema: sellos, lanzamientos, presentación de música y desarrollo de carrera.'
      },
      duration: '~75 min',
      lessons: [
        { id: 'L01', title: { en: 'Label Ecosystem', es: 'Ecosistema de sellos' }, duration: '20 min' },
        { id: 'L02', title: { en: 'Presenting Your Music', es: 'Presentar tu música' }, duration: '20 min' },
        { id: 'L03', title: { en: 'Release Strategy', es: 'Estrategia de lanzamiento' }, duration: '18 min' },
        { id: 'L04', title: { en: 'Career Development', es: 'Desarrollo de carrera' }, duration: '17 min' }
      ],
      practice: {
        en: 'Research 5 labels that fit your style. Write a demo submission email for one of them. Submit for review.',
        es: 'Investiga 5 sellos que encajen con tu estilo. Escribe un email de envío de demo para uno. Envía para revisión.'
      }
    },
    {
      id: '08', code: 'RELEASE',
      title: { en: 'Mastering & Final Prep', es: 'Mastering y preparación final' },
      desc: {
        en: 'Mastering fundamentals and how to prepare a track before presenting or releasing it.',
        es: 'Conceptos básicos de mastering y cómo preparar un track antes de presentarlo o lanzarlo.'
      },
      duration: '~90 min',
      lessons: [
        { id: 'L01', title: { en: 'Mastering Basics', es: 'Fundamentos de mastering' }, duration: '22 min' },
        { id: 'L02', title: { en: 'Loudness & Standards', es: 'Loudness y estándares' }, duration: '22 min' },
        { id: 'L03', title: { en: 'Pre-release Checklist', es: 'Checklist pre-lanzamiento' }, duration: '23 min' },
        { id: 'L04', title: { en: 'Final Export & Delivery', es: 'Export final y entrega' }, duration: '23 min' }
      ],
      practice: {
        en: 'Master your finished track and prepare the final delivery package: WAV, metadata, artwork specs. Submit for final review.',
        es: 'Masteriza tu track terminado y prepara el paquete de entrega final: WAV, metadata, specs de artwork. Envía para revisión final.'
      }
    }
  ];

  function getStreamUrl(uid) {
    if (!uid) return null;
    var base = STREAM_BASE.replace(/\/+$/, '');
    return base + '/' + uid + '/manifest/video.m3u8';
  }

  root.DMF_ACADEMY = {
    STREAM_BASE: STREAM_BASE,
    MODULES: MODULES,
    getStreamUrl: getStreamUrl
  };

})(window);

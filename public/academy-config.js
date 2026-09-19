// DMF Academy — Published course order from Demian's source files
// Stream base URL: injected via DMF_STREAM_BASE.
// Cloudflare Stream pattern: {STREAM_BASE}/{VIDEO_UID}/manifest/video.m3u8
(function (root) {
  'use strict';

  var STREAM_BASE = root.__DMF_STREAM_BASE__ || 'http://localhost:8080';

  var MODULES = [
    {
      id: '01', code: 'INTRO',
      title: { en: 'Ableton Introduction', es: 'Introducción a Ableton' },
      desc: {
        en: 'Start with Demian’s Ableton orientation before moving into the production classes.',
        es: 'Parte con la introducción de Demian a Ableton antes de avanzar a las clases de producción.'
      },
      duration: '',
      lessons: [
        {
          id: 'L01',
          title: { en: 'Ableton Intro · Part 1', es: 'Intro Ableton · Parte 1' },
          streamKey: 'intro-ableton-p1',
          sourceFile: 'INTRO ABLETON/1. Intro ableton p1.mp4',
          streamUid: null,
          duration: ''
        },
        {
          id: 'L02',
          title: { en: 'Ableton Intro · Part 2', es: 'Intro Ableton · Parte 2' },
          streamKey: 'intro-ableton-p2',
          sourceFile: 'INTRO ABLETON/2. intro abeton pt2.mp4',
          streamUid: null,
          duration: ''
        }
      ],
      practice: {
        en: 'Open Ableton and reproduce the basic workspace and routing shown in the introduction.',
        es: 'Abre Ableton y reproduce el espacio de trabajo y routing básico mostrado en la introducción.'
      }
    },
    {
      id: '02', code: 'CLASE 1',
      title: { en: 'Class 1 · Groove Foundations', es: 'Clase 1 · Fundamentos del groove' },
      desc: {
        en: 'Kick, snare, hi-hat, structure, bass line and Loopcloud introduction.',
        es: 'Kick, snare, hi-hat, estructura, bass line e introducción a Loopcloud.'
      },
      duration: '',
      lessons: [
        {
          id: 'L01',
          title: { en: 'Kick / Snare / Hi Hat', es: 'Kick / Snare / Hi Hat' },
          streamKey: 'clase1-kick-snare-hihat',
          sourceFile: 'CLASE 1/2.1 Kickk snare Hi Hat.mp4',
          streamUid: '87da20f0d21e697054a3e84c0e6c78c7',
          duration: '17 min'
        },
        {
          id: 'L02',
          title: { en: 'Structure', es: 'Estructura' },
          streamKey: 'clase1-estructura',
          sourceFile: 'CLASE 1/2.2 Estructura.mp4',
          streamUid: null,
          duration: ''
        },
        {
          id: 'L03',
          title: { en: 'Bass Line', es: 'Bass Line' },
          streamKey: 'clase1-bass-line',
          sourceFile: 'CLASE 1/2.3 Bass line.mp4',
          streamUid: null,
          duration: ''
        },
        {
          id: 'L04',
          title: { en: 'Loopcloud Intro', es: 'Loopcloud Intro' },
          streamKey: 'clase1-loopcloud-intro',
          sourceFile: 'CLASE 1/2.4 Loopcloud Intro.mp4',
          streamUid: null,
          duration: ''
        }
      ],
      practice: {
        en: 'Build a first groove using the elements covered in Class 1.',
        es: 'Construye un primer groove usando los elementos trabajados en la Clase 1.'
      }
    },
    {
      id: '03', code: 'CLASE 2',
      title: { en: 'Class 2 · Layers & Sound Selection', es: 'Clase 2 · Capas y selección sonora' },
      desc: {
        en: 'Top loops, synth categories, percussion, shakers and open hi-hats.',
        es: 'Top loops, categorías de synths, percusión, shakers y hi-hats abiertos.'
      },
      duration: '',
      lessons: [
        {
          id: 'L01',
          title: { en: 'Top Loops', es: 'Top Loops' },
          streamKey: 'clase2-top-loops',
          sourceFile: 'CLASE 2/3.1 Top Loops.mp4',
          streamUid: null,
          duration: ''
        },
        {
          id: 'L02',
          title: { en: 'Synths & Categories', es: 'Synths y Categorías' },
          streamKey: 'clase2-synths-categorias',
          sourceFile: 'CLASE 2/3.2 Synths y Categorias .mp4',
          streamUid: null,
          duration: ''
        },
        {
          id: 'L03',
          title: { en: 'Percussion', es: 'Percusión' },
          streamKey: 'clase2-percusion',
          sourceFile: 'CLASE 2/3.3 Percusion.mp4',
          streamUid: null,
          duration: ''
        },
        {
          id: 'L04',
          title: { en: 'Shakers & Open Hi-Hat', es: 'Shakers y Hi-Hat Open' },
          streamKey: 'clase2-shakers-open-hihat',
          sourceFile: 'CLASE 2/3.4 Shakers and Hi hat open.mp4',
          streamUid: null,
          duration: ''
        }
      ],
      practice: {
        en: 'Add rhythmic and tonal layers without overcrowding the groove.',
        es: 'Agrega capas rítmicas y tonales sin sobrecargar el groove.'
      }
    },
    {
      id: '04', code: 'CLASE 3',
      title: { en: 'Class 3 · Edit, Vocals & Dynamics', es: 'Clase 3 · Edición, vocales y dinámica' },
      desc: {
        en: 'Editing and mix decisions, vocals, compression and dynamic range.',
        es: 'Decisiones de edición y mezcla, vocales, compresión y rango dinámico.'
      },
      duration: '',
      lessons: [
        {
          id: 'L01',
          title: { en: 'Edit & Mix', es: 'Edit & Mix' },
          streamKey: 'clase3-edit-mix',
          sourceFile: 'CLASE 3/3.5 Edit and mix.mp4',
          streamUid: null,
          duration: ''
        },
        {
          id: 'L02',
          title: { en: 'Vocals', es: 'Vocales' },
          streamKey: 'clase3-vocales',
          sourceFile: 'CLASE 3/3.6 Vocales.mp4',
          streamUid: null,
          duration: ''
        },
        {
          id: 'L03',
          title: { en: 'Compression & Dynamic Range', es: 'Compresión y rango dinámico' },
          streamKey: 'clase3-compresion-rango-dinamico',
          sourceFile: 'CLASE 3/3.7 Cmpression y rango dinamico.mp4',
          streamUid: null,
          duration: ''
        }
      ],
      practice: {
        en: 'Apply editing, vocal treatment and dynamics to the production developed in the previous classes.',
        es: 'Aplica edición, tratamiento vocal y dinámica a la producción desarrollada en las clases anteriores.'
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

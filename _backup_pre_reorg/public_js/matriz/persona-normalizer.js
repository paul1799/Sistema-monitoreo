/**
 * public/js/matriz/persona-normalizer.js
 * Normalización y enriquecimiento de datos de Directores, Subdirectores y Coordinadores
 * UGEL 03 · AGEBRE
 */

export const CATALOGO_CONDICION = {
  'd': 'Designado(a)',
  'designado': 'Designado(a)',
  'designada': 'Designado(a)',
  'designado(a)': 'Designado(a)',
  'designado (d)': 'Designado(a)',
  'e': 'Encargado(a)',
  'encargado': 'Encargado(a)',
  'encargada': 'Encargado(a)',
  'encargado(a)': 'Encargado(a)',
  'encargado (e)': 'Encargado(a)',
  'n': 'Nombrado(a)',
  'nombrado': 'Nombrado(a)',
  'nombrada': 'Nombrado(a)',
  'nombrado(a)': 'Nombrado(a)',
  'nombrado (n)': 'Nombrado(a)',
  'c': 'Contratado(a)',
  'contratado': 'Contratado(a)',
  'contratada': 'Contratado(a)',
  'contratado(a)': 'Contratado(a)',
  'contratado (c)': 'Contratado(a)'
};

/** Normaliza la condición laboral a la etiqueta oficial */
export function normalizarCondicion(val) {
  if (val === undefined || val === null) return '';
  const s = String(val).trim();
  if (!s || s === '—' || s === '-' || s === 'null' || s === 'undefined') return '';
  const k = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (CATALOGO_CONDICION[k]) return CATALOGO_CONDICION[k];
  for (const [key, label] of Object.entries(CATALOGO_CONDICION)) {
    if (k === key || k.startsWith(key + ' ') || k.endsWith('(' + key + ')')) {
      return label;
    }
  }
  return s;
}

/** Limpia y formatea un DNI asegurando 8 dígitos texto con ceros a la izquierda si aplica */
export function formatDni(val) {
  if (val === undefined || val === null) return '';
  let str = String(val).trim().replace(/[\r\n\t]/g, '');
  if (!str || str === '—' || str === '-' || str === 'null' || str === 'undefined') return '';
  // Si contiene solo dígitos y tiene entre 1 y 7 dígitos, completar con 0 hasta 8
  if (/^\d{1,7}$/.test(str)) {
    str = str.padStart(8, '0');
  }
  return str;
}

/** Limpia correo electrónico en minúsculas */
export function cleanEmail(val) {
  if (!val) return '';
  const s = String(val).trim().toLowerCase().replace(/\s+/g, '');
  if (s === '—' || s === '-' || s === 'null' || s === 'undefined' || !s.includes('@')) return '';
  return s;
}

/** Limpia teléfono */
export function cleanTelefono(val) {
  if (!val) return '';
  const s = String(val).trim().replace(/\s+/g, ' ');
  if (s === '—' || s === '-' || s === 'null' || s === 'undefined') return '';
  return s;
}

/** Detecta si un string o texto es un placeholder o no contiene una persona válida */
export function isPlaceholderPersona(str) {
  if (!str) return true;
  const s = String(str).trim();
  if (!s || s === '—' || s === '-' || s === '--' || s === 'null' || s === 'undefined' || s === '{}' || s === '[]' || s === '[object Object]') {
    return true;
  }
  const n = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const placeholders = [
    'NO CUENTA', 'NO CUENTA CON SUB DIRECTOR', 'NO CUENTA CON SUBDIRECTOR',
    'NO CUENTA CON SUB-DIRECTOR', 'NO CUENTA CON SUB DIRECTOR(A)', 'NO CUENTA CON SUBDIRECTOR(A)',
    'NO CUENTA CON DIRECTOR', 'NO CUENTA CON DIRECTORA', 'SIN SUBDIRECTOR', 'SIN SUB DIRECTOR',
    'SIN SUBDIRECTORA', 'SIN DIRECTOR', 'SIN DIRECTORA', 'NO TIENE', 'NO POSEE', 'NO APLICA',
    'NINGUNO', 'NINGUNA', 'S/N', 'SN', 'N/A', 'NA', 'S/D', 'SD', 'NO', 'VACANTE', 'SIN ASIGNAR', 'NO REGISTRA'
  ];
  if (placeholders.includes(n)) return true;
  if (/^NO\s+CUENTA(\s+CON)?(\s+(SUB\s*)?DIRECTOR(A)?)?$/i.test(n)) return true;
  if (/^SIN\s+(SUB\s*)?DIRECTOR(A)?$/i.test(n)) return true;
  if (/^NO\s+TIENE(\s+(SUB\s*)?DIRECTOR(A)?)?$/i.test(n)) return true;
  return false;
}

export function normalizeKey(k) {
  if (!k) return '';
  return String(k).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Diccionario de alias por propiedad (claves normalizadas sin tildes ni guiones)
const ALIAS_PROP_MAP = {
  nombres: [
    'nombres', 'nombre', 'nombresapellidos', 'apellidosnombres', 'nombrecompleto',
    'fullname', 'directornombres', 'directornombre', 'subdirectornombre', 'subdirectornombres',
    'coordinadornombre', 'coordinadornombres', 'directivo', 'nombredirectivo', 'directivoquebrindalainformacionsolicitada',
    'directivoquebrindalainformacion'
  ],
  dni: [
    'dni', 'documento', 'nrodocumento', 'numdoc', 'numerodocumento',
    'dnidirectivo', 'directordni', 'subdirectordni', 'coordinadordni', 'dnitutor'
  ],
  telefono: [
    'telefono', 'celular', 'movil', 'telefonocelular', 'phone',
    'tel', 'cel', 'directortelefono', 'directortel', 'subdirectortelefono', 'subdirectortel',
    'coordinadortelefono', 'coordinadortel'
  ],
  condicion: [
    'condicion', 'condicionlaboral', 'situacion', 'tipo', 'cargocondicion',
    'directorcondicion', 'subdirectorcondicion', 'coordinadorcondicion', 'especialidad', 'areas'
  ],
  correo: [
    'correo', 'email', 'mail', 'correoelectronico', 'emaildirector', 'correodirector',
    'directorcorreo', 'subdirectorcorreo', 'coordinadorcorreo', 'emailcoordinador'
  ]
};

function _extraerPropiedadPorAlias(obj, prop) {
  if (!obj || typeof obj !== 'object') return '';
  const aliases = ALIAS_PROP_MAP[prop] || [prop];

  // 1. Coincidencia directa de claves
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    const nk = normalizeKey(k);
    if (aliases.includes(nk)) {
      return String(v).trim();
    }
  }

  // 2. Si es 'nombres' y vienen separados: nombres + apellido_paterno + apellido_materno
  if (prop === 'nombres') {
    const nom = obj.nombres || obj.nombre || '';
    const apPat = obj.apellido_paterno || obj.apellidoPaterno || obj.apellidopaterno || '';
    const apMat = obj.apellido_materno || obj.apellidoMaterno || obj.apellidomaterno || '';
    if (apPat || apMat) {
      return [apPat, apMat, nom].filter(Boolean).join(' ').trim();
    }
  }

  return '';
}

function _normalizarObjetoOStringPersona(val) {
  if (val === undefined || val === null) {
    return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
  }

  // Si es string
  if (typeof val === 'string') {
    const str = val.trim();
    if (!str || str === '—' || str === '-' || str === '{}' || str === '[]' || str === '[object Object]') {
      return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
    }

    // String con JSON
    if (str.startsWith('{') || str.startsWith('[')) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          const personas = parsed.map(v => _normalizarObjetoOStringPersona(v)).filter(p => p.nombres || p.dni);
          return _combinarMultiplesPersonas(personas);
        }
        if (parsed && typeof parsed === 'object') {
          return {
            nombres: _extraerPropiedadPorAlias(parsed, 'nombres'),
            dni: _extraerPropiedadPorAlias(parsed, 'dni'),
            telefono: _extraerPropiedadPorAlias(parsed, 'telefono'),
            condicion: _extraerPropiedadPorAlias(parsed, 'condicion'),
            correo: _extraerPropiedadPorAlias(parsed, 'correo')
          };
        }
      } catch (e) {
        // String con JSON inválido -> usar texto limpio como nombre
        const cleanName = str.replace(/[{}\[\]"]/g, '').trim();
        return { nombres: cleanName, dni: '', telefono: '', condicion: '', correo: '' };
      }
    }

    if (isPlaceholderPersona(str)) {
      return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
    }
    return { nombres: str, dni: '', telefono: '', condicion: '', correo: '' };
  }

  // Si es un objeto JavaScript
  if (typeof val === 'object') {
    return {
      nombres: _extraerPropiedadPorAlias(val, 'nombres'),
      dni: _extraerPropiedadPorAlias(val, 'dni'),
      telefono: _extraerPropiedadPorAlias(val, 'telefono'),
      condicion: _extraerPropiedadPorAlias(val, 'condicion'),
      correo: _extraerPropiedadPorAlias(val, 'correo')
    };
  }

  return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
}

function _buscarEnExtras(s, posiblesNombres) {
  if (!s) return '';
  const extras = Array.isArray(s.extras) ? s.extras : [];
  for (const p of posiblesNombres) {
    const pNorm = String(p).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const found = extras.find(e => {
      const lNorm = (e.label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      return lNorm.includes(pNorm);
    });
    if (found && found.value !== undefined && found.value !== null) {
      return found.value;
    }
  }
  return '';
}

function _complementarDesdeDocFicha(p, s, cargo) {
  if (!s || typeof s !== 'object') return p;

  const res = { ...p };

  if (cargo === 'director') {
    if (s.director && typeof s.director === 'object') {
      const objDir = _normalizarObjetoOStringPersona(s.director);
      res.nombres = res.nombres || objDir.nombres;
      res.dni = res.dni || objDir.dni;
      res.telefono = res.telefono || objDir.telefono;
      res.condicion = res.condicion || objDir.condicion;
      res.correo = res.correo || objDir.correo;
    }

    res.nombres = res.nombres || s.directorNombre || s.dirNombre || (typeof s.director === 'string' && !s.director.startsWith('{') ? s.director : '') || _buscarEnExtras(s, ['directivo que brinda', 'director(a)', 'director']);
    res.dni = res.dni || s.directorDni || s.dirDni || _buscarEnExtras(s, ['dni directivo', 'dni director']);
    res.telefono = res.telefono || s.directorTelefono || s.dirTelefono || _buscarEnExtras(s, ['telefono celular', 'celular director', 'telefono director']);
    res.condicion = res.condicion || s.directorCondicion || s.dirCondicion || s.condicion || _buscarEnExtras(s, ['condicion directivo', 'condicion director']);
    res.correo = res.correo || s.directorCorreo || s.dirCorreo || _buscarEnExtras(s, ['correo electronico', 'email director', 'correo director']);
  } else if (cargo === 'subdirector') {
    if (Array.isArray(s.subdirectores) && s.subdirectores.length > 0) {
      const personas = s.subdirectores.map(sd => _normalizarObjetoOStringPersona(sd)).filter(sd => sd.nombres || sd.dni);
      if (personas.length > 0) {
        return _combinarMultiplesPersonas(personas);
      }
    }
    if (s.subdirector && typeof s.subdirector === 'object') {
      const objSub = _normalizarObjetoOStringPersona(s.subdirector);
      res.nombres = res.nombres || objSub.nombres;
      res.dni = res.dni || objSub.dni;
      res.telefono = res.telefono || objSub.telefono;
      res.condicion = res.condicion || objSub.condicion;
      res.correo = res.correo || objSub.correo;
    }
    res.nombres = res.nombres || s.subDirector || s.subdirector || s.subNombre || _buscarEnExtras(s, ['subdirector(a)', 'subdirector', 'sub director', 'subdirectora']);
    res.dni = res.dni || s.subDirectorDni || s.subdirectorDni || s.subDni || _buscarEnExtras(s, ['dni subdirector', 'dni sub director']);
    res.telefono = res.telefono || s.subDirectorTelefono || s.subdirectorTelefono || s.subTelefono || _buscarEnExtras(s, ['telefono subdirector', 'celular subdirector']);
    res.condicion = res.condicion || s.subDirectorCondicion || s.subdirectorCondicion || s.subCondicion || _buscarEnExtras(s, ['condicion subdirector']);
    res.correo = res.correo || s.subDirectorCorreo || s.subdirectorCorreo || s.subCorreo || _buscarEnExtras(s, ['correo subdirector', 'email subdirector']);
  } else if (cargo === 'coordinador_tutoria') {
    res.nombres = res.nombres || s.coordinadorTutoria || s.coordTutoriaNombre || _buscarEnExtras(s, ['coordinador(a) de tutoría', 'coordinador de tutoria', 'coordinadora de tutoria', 'coordinador tutoria']);
    res.dni = res.dni || s.coordTutoriaDni || s.coordinadorTutoriaDni || _buscarEnExtras(s, ['dni coordinador tutoria', 'dni tutor', 'dni coordinador(a) de tutoria']);
    res.telefono = res.telefono || s.coordTutoriaTelefono || s.coordinadorTutoriaTel || _buscarEnExtras(s, ['telefono coordinador tutoria', 'celular coordinador tutoria']);
    res.condicion = res.condicion || s.coordTutoriaCondicion || _buscarEnExtras(s, ['condicion coordinador tutoria']);
    res.correo = res.correo || s.coordTutoriaCorreo || _buscarEnExtras(s, ['correo coordinador tutoria']);
  } else if (cargo === 'coordinador_pedagogico') {
    res.nombres = res.nombres || s.coordinadorPedagogico || s.coordPedagNombre || _buscarEnExtras(s, ['coordinador(a) pedagógico', 'coordinador pedagogico', 'coordinadora pedagogica', 'coordinador pedagogico']);
    res.dni = res.dni || s.coordPedagDni || s.coordinadorPedagDni || _buscarEnExtras(s, ['dni coordinador pedagogico']);
    res.telefono = res.telefono || s.coordPedagTelefono || s.coordinadorPedagTel || _buscarEnExtras(s, ['telefono coordinador pedagogico']);
    res.condicion = res.condicion || s.coordPedagCondicion || s.coordPedagEspecialidad || _buscarEnExtras(s, ['condicion coordinador pedagogico', 'especialidad']);
    res.correo = res.correo || s.coordPedagCorreo || _buscarEnExtras(s, ['correo coordinador pedagogico']);
  }

  return res;
}

function _enriquecerConDirectorioYColegios(p, s, cargo, state) {
  if (!s || !state) return p;

  const codMod = String(s.codigoModular || s.codModular || (s.ie && s.ie.codigoModular) || '').trim();
  const codLoc = String(s.codigoLocal || (s.ie && s.ie.codigoLocal) || '').trim();
  const colId = String(s.colegioId || '').trim();
  const instNom = String(s.institucion || s.nombreIe || (typeof s.ie === 'string' ? s.ie : '') || '').trim();

  const res = { ...p };

  // 1. Búsqueda en Directorio (state.directivos)
  if (Array.isArray(state.directivos)) {
    const directivosIE = state.directivos.filter(d => {
      if (isPlaceholderPersona(d.apellidosNombres)) return false;
      if (d.estado && d.estado !== 'activo') return false;
      if (codMod && String(d.codigoModular || '').trim() === codMod) return true;
      if (codLoc && String(d.codigoLocal || '').trim() === codLoc) return true;
      if (colId && String(d.colegioId || '').trim() === colId) return true;
      return false;
    });

    if (cargo === 'director') {
      const matchDir = directivosIE.find(d => (d.cargo || '').toLowerCase().includes('director') && !(d.cargo || '').toLowerCase().includes('sub'));
      if (matchDir) {
        const fichaDni = formatDni(res.dni);
        const dirDni = formatDni(matchDir.dni);
        if (!fichaDni || !dirDni || fichaDni === dirDni) {
          res.nombres = res.nombres || matchDir.apellidosNombres || '';
          res.dni = res.dni || matchDir.dni || '';
          res.telefono = res.telefono || matchDir.telefono || '';
          res.condicion = res.condicion || matchDir.condicion || '';
          res.correo = res.correo || matchDir.correo || '';
        }
      }
    } else if (cargo === 'subdirector') {
      const matchSubs = directivosIE.filter(d => (d.cargo || '').toLowerCase().includes('sub'));
      if (matchSubs.length > 0) {
        if (!res.nombres && !res.dni) {
          if (matchSubs.length > 1) {
            return _combinarMultiplesPersonas(matchSubs.map(sd => ({
              nombres: sd.apellidosNombres,
              dni: sd.dni,
              telefono: sd.telefono,
              condicion: sd.condicion,
              correo: sd.correo
            })));
          }
          res.nombres = matchSubs[0].apellidosNombres || '';
          res.dni = matchSubs[0].dni || '';
          res.telefono = matchSubs[0].telefono || '';
          res.condicion = matchSubs[0].condicion || '';
          res.correo = matchSubs[0].correo || '';
        } else {
          const matchSub = matchSubs[0];
          const fichaDni = formatDni(res.dni);
          const dirDni = formatDni(matchSub.dni);
          if (!fichaDni || !dirDni || fichaDni === dirDni) {
            res.nombres = res.nombres || matchSub.apellidosNombres || '';
            res.dni = res.dni || matchSub.dni || '';
            res.telefono = res.telefono || matchSub.telefono || '';
            res.condicion = res.condicion || matchSub.condicion || '';
            res.correo = res.correo || matchSub.correo || '';
          }
        }
      }
    } else if (cargo === 'coordinador_tutoria') {
      const matchCoordTut = directivosIE.find(d => (d.cargo || '').toLowerCase().includes('tutor'));
      if (matchCoordTut) {
        const fichaDni = formatDni(res.dni);
        const dirDni = formatDni(matchCoordTut.dni);
        if (!fichaDni || !dirDni || fichaDni === dirDni) {
          res.nombres = res.nombres || matchCoordTut.apellidosNombres || '';
          res.dni = res.dni || matchCoordTut.dni || '';
          res.telefono = res.telefono || matchCoordTut.telefono || '';
          res.condicion = res.condicion || matchCoordTut.condicion || '';
          res.correo = res.correo || matchCoordTut.correo || '';
        }
      }
    } else if (cargo === 'coordinador_pedagogico') {
      const matchCoordPed = directivosIE.find(d => (d.cargo || '').toLowerCase().includes('pedagog'));
      if (matchCoordPed) {
        const fichaDni = formatDni(res.dni);
        const dirDni = formatDni(matchCoordPed.dni);
        if (!fichaDni || !dirDni || fichaDni === dirDni) {
          res.nombres = res.nombres || matchCoordPed.apellidosNombres || '';
          res.dni = res.dni || matchCoordPed.dni || '';
          res.telefono = res.telefono || matchCoordPed.telefono || '';
          res.condicion = res.condicion || matchCoordPed.condicion || '';
          res.correo = res.correo || matchCoordPed.correo || '';
        }
      }
    }
  }

  // 2. Búsqueda en Colegios (state.colegios) como fallback
  if (Array.isArray(state.colegios) && (!res.nombres || !res.dni || !res.telefono || !res.correo)) {
    const col = state.colegios.find(c => {
      if (codMod && String(c.codigoModular || '').trim() === codMod) return true;
      if (codLoc && String(c.codigoLocal || '').trim() === codLoc) return true;
      if (colId && String(c.id || '').trim() === colId) return true;
      if (instNom && normalizeKey(c.ie) === normalizeKey(instNom)) return true;
      return false;
    });

    if (col) {
      if (cargo === 'director' && col.director && !isPlaceholderPersona(col.director.nombre)) {
        const fichaDni = formatDni(res.dni);
        const colDni = formatDni(col.director.dni);
        if (!fichaDni || !colDni || fichaDni === colDni) {
          res.nombres = res.nombres || col.director.nombre || '';
          res.dni = res.dni || col.director.dni || '';
          res.telefono = res.telefono || col.director.telefono || '';
          res.correo = res.correo || col.director.correo || '';
          res.condicion = res.condicion || (col.tipoGestion ? normalizarCondicion(col.tipoGestion) : '');
        }
      } else if (cargo === 'subdirector' && col.subDirector && !isPlaceholderPersona(col.subDirector.nombre)) {
        const fichaDni = formatDni(res.dni);
        const colDni = formatDni(col.subDirector.dni);
        if (!fichaDni || !colDni || fichaDni === colDni) {
          res.nombres = res.nombres || col.subDirector.nombre || '';
          res.dni = res.dni || col.subDirector.dni || '';
          res.telefono = res.telefono || col.subDirector.telefono || '';
          res.correo = res.correo || col.subDirector.correo || '';
        }
      }
    }
  }

  return res;
}

function _formatearPersona(p) {
  if (!p) return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
  
  let nom = String(p.nombres || '').trim();
  if (isPlaceholderPersona(nom)) nom = '';

  return {
    nombres: nom,
    dni: formatDni(p.dni),
    telefono: cleanTelefono(p.telefono),
    condicion: normalizarCondicion(p.condicion),
    correo: cleanEmail(p.correo)
  };
}

function _combinarMultiplesPersonas(personas) {
  if (!personas || personas.length === 0) {
    return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
  }
  const formatted = personas.map(p => _formatearPersona(p));
  return {
    nombres: formatted.map(p => p.nombres).filter(Boolean).join('\n'),
    dni: formatted.map(p => p.dni).join('\n'),
    telefono: formatted.map(p => p.telefono).join('\n'),
    condicion: formatted.map(p => p.condicion).join('\n'),
    correo: formatted.map(p => p.correo).join('\n')
  };
}

function _buscarPersonaFallback(s, cargo, state) {
  const empty = { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
  return _enriquecerConDirectorioYColegios(empty, s, cargo, state);
}

/**
 * Función única para normalizar cualquier persona de cualquier bloque y ficha
 * @param {*} valor Objeto, string JSON, string nombre o arreglo
 * @param {Object} sourceDoc Submission de la ficha de monitoreo
 * @param {string} cargo 'director' | 'subdirector' | 'coordinador_tutoria' | 'coordinador_pedagogico'
 * @param {Object} state Estado global de la aplicación (contiene directivos y colegios)
 * @returns {Object} { nombres, dni, telefono, condicion, correo }
 */
export function normalizarPersona(valor, sourceDoc = null, cargo = '', state = null) {
  if (Array.isArray(valor)) {
    if (valor.length === 0) {
      return _formatearPersona(_buscarPersonaFallback(sourceDoc, cargo, state));
    }
    const personas = valor.map(v => _normalizarObjetoOStringPersona(v)).filter(p => p.nombres || p.dni);
    if (personas.length === 0) {
      return _formatearPersona(_buscarPersonaFallback(sourceDoc, cargo, state));
    }
    return _combinarMultiplesPersonas(personas);
  }

  let p = _normalizarObjetoOStringPersona(valor);

  if (sourceDoc && typeof sourceDoc === 'object') {
    p = _complementarDesdeDocFicha(p, sourceDoc, cargo);
  }

  p = _enriquecerConDirectorioYColegios(p, sourceDoc, cargo, state);

  return _formatearPersona(p);
}

/**
 * Wrapper de compatibilidad para consultas por campo plano
 */
export function _obtenerValorPersona(s, key, state = null) {
  if (!s) return '';
  let cargo = 'director';
  const lk = key.toLowerCase();
  if (lk.includes('sub')) cargo = 'subdirector';
  else if (lk.includes('tutor')) cargo = 'coordinador_tutoria';
  else if (lk.includes('pedag')) cargo = 'coordinador_pedagogico';

  let rawVal = null;
  if (cargo === 'director') {
    rawVal = s.director !== undefined ? s.director : (s.directorNombre || s.dirNombre || null);
  } else if (cargo === 'subdirector') {
    rawVal = s.subdirectores || s.subDirector || s.subdirector || s.subNombre || null;
  } else if (cargo === 'coordinador_tutoria') {
    rawVal = s.coordinadorTutoria || s.coordTutoria || s.coordTutoriaNombre || null;
  } else if (cargo === 'coordinador_pedagogico') {
    rawVal = s.coordinadorPedagogico || s.coordPedag || s.coordPedagNombre || null;
  }

  const p = normalizarPersona(rawVal, s, cargo, state);
  if (lk.includes('nombre')) return p.nombres;
  if (lk.includes('dni')) return p.dni;
  if (lk.includes('tel') || lk.includes('cel')) return p.telefono;
  if (lk.includes('condicion') || lk.includes('especialidad')) return p.condicion;
  if (lk.includes('correo') || lk.includes('email')) return p.correo;
  return p.nombres;
}

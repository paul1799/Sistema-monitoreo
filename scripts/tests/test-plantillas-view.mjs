import { renderPlantillasManagementView } from '../../public/js/ui/plantillas.js';

// Setup minimal DOM
const container = {
  innerHTML: '',
  querySelectorAll: () => [],
  querySelector: () => null
};

// Global document mock
global.document = {
  getElementById: (id) => null,
  querySelectorAll: () => [],
  querySelector: () => null
};

const mockState = {
  fichaTypes: [
    {
      id: 'ft_test_1',
      nombre: 'Ficha de Prueba 1',
      nombreCorto: 'Prueba 1',
      grupo: 'Modelo JEC',
      descripcion: 'Descripción de prueba para verificar que el renderizado de la lista de plantillas funcione perfectamente.',
      secciones: [{ items: [{ id: '1', texto: 'Pregunta 1' }] }]
    },
    {
      id: 'ft_test_2',
      nombre: 'Ficha de Prueba 2 con descripción muy larga que sobrepase los 140 caracteres para activar el botón de ver más y comprobar que fichaDescExpanded funcione correctamente sin ReferenceError.',
      nombreCorto: 'Prueba 2',
      grupo: 'EBR',
      descripcion: 'Esta es una descripción muy larga diseñada especialmente para probar el botón ver más y ver menos en la tarjeta de plantilla dentro del módulo de gestión de plantillas de ficha.',
      secciones: [{ items: [{ id: '1', texto: 'Pregunta 1' }] }]
    }
  ],
  submissions: []
};

const getFichaType = (id) => mockState.fichaTypes.find(f => f.id === id);

try {
  renderPlantillasManagementView(container, mockState, getFichaType, {}, true, { email: 'admin@test.pe' }, null, '<nav></nav>');
  console.log('✓ renderPlantillasManagementView executed successfully with NO errors!');
  console.log('Generated HTML length:', container.innerHTML.length);
} catch (e) {
  console.error('FAILED to execute renderPlantillasManagementView:', e);
  process.exit(1);
}

// =========================================================
//  bandas.html - Listado, búsqueda por nombre y eliminación
// =========================================================

const listaBandas = document.getElementById('listaBandas');
const campoBusqueda = document.getElementById('busqueda');
const contador = document.getElementById('contador');
const sinResultados = document.getElementById('sinResultados');
const alertas = document.getElementById('alertas');

let temporizador; // para no consultar al servidor en cada tecla

// Pide las bandas al servidor (filtradas por nombre si hay texto)
async function cargarBandas() {
  const texto = campoBusqueda.value.trim();
  try {
    const respuesta = await fetch(`api/bandas.php?nombre=${encodeURIComponent(texto)}`);
    if (!respuesta.ok) throw new Error();
    const bandas = await respuesta.json();
    pintarBandas(bandas, texto);
  } catch {
    contador.textContent = '';
    mostrarAlerta(alertas, 'No se pudo cargar el listado. Verifica que el servidor esté encendido.', 'danger');
  }
}

// Construye las tarjetas en el DOM
function pintarBandas(bandas, texto) {
  listaBandas.innerHTML = '';

  const total = bandas.length;
  contador.textContent = texto
    ? `${total} resultado${total === 1 ? '' : 's'} para “${texto}”`
    : `${total} banda${total === 1 ? '' : 's'} registrada${total === 1 ? '' : 's'}`;

  if (total === 0) {
    sinResultados.textContent = texto
      ? 'No hay bandas con ese nombre.'
      : 'Todavía no hay bandas registradas.';
    sinResultados.classList.remove('d-none');
    return;
  }
  sinResultados.classList.add('d-none');

  bandas.forEach((banda) => {
    const columna = document.createElement('div');
    columna.className = 'col-12 col-sm-6 col-lg-4 col-xl-3';
    columna.innerHTML = `
      <article class="card tarjeta-banda h-100">
        <a href="detalle.html?id=${banda.id}">
          <img src="${escaparHTML(banda.foto)}" class="foto-banda" alt="Foto de ${escaparHTML(banda.nombre)}">
        </a>
        <div class="card-body">
          <span class="etiqueta mb-2">${escaparHTML(banda.genero)}</span>
          <h2 class="h5 card-title mt-2 mb-1">${escaparHTML(banda.nombre)}</h2>
          <p class="texto-suave small mb-0">${escaparHTML(banda.ciudad)}</p>
        </div>
        <div class="card-footer bg-white border-0 pt-0 pb-3 d-flex gap-2">
          <a href="detalle.html?id=${banda.id}" class="btn btn-sm btn-dark">Ver</a>
          <a href="formulario.html?id=${banda.id}" class="btn btn-sm btn-outline-dark">Editar</a>
          <button type="button" class="btn btn-sm btn-outline-danger ms-auto">Eliminar</button>
        </div>
      </article>`;

    columna.querySelector('.btn-outline-danger').addEventListener('click', () => {
      confirmarEliminar(
        banda,
        () => {
          mostrarAlerta(alertas, `Se eliminó <strong>${escaparHTML(banda.nombre)}</strong>.`, 'success');
          cargarBandas(); // el listado se actualiza solo
        },
        (mensaje) => mostrarAlerta(alertas, escaparHTML(mensaje), 'danger')
      );
    });

    listaBandas.appendChild(columna);
  });
}

// Búsqueda mientras se escribe
campoBusqueda.addEventListener('input', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargarBandas, 250);
});

// Si se presiona Enter, no recargar la página
document.getElementById('formBusqueda').addEventListener('submit', (e) => {
  e.preventDefault();
  clearTimeout(temporizador);
  cargarBandas();
});

mostrarMensajeDeURL(alertas);
cargarBandas();

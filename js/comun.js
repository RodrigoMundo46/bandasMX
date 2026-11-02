// =========================================================
//  Funciones compartidas por todas las páginas
// =========================================================

// Evita que el texto de la base de datos se interprete como HTML
function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

// Lee un parámetro de la URL, ej. obtenerParametro('id')
function obtenerParametro(nombre) {
  return new URLSearchParams(window.location.search).get(nombre);
}

// Muestra una alerta de Bootstrap dentro del contenedor indicado.
// tipo: 'success' | 'danger' | 'warning' | 'info'
function mostrarAlerta(contenedor, mensaje, tipo = 'success') {
  contenedor.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>`;
  contenedor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Mensajes que se muestran después de redirigir (?msg=...)
const MENSAJES = {
  creada: 'La banda se agregó correctamente.',
  actualizada: 'Los datos de la banda se actualizaron correctamente.',
  eliminada: 'La banda se eliminó correctamente.'
};

function mostrarMensajeDeURL(contenedor) {
  const clave = obtenerParametro('msg');
  if (MENSAJES[clave]) {
    mostrarAlerta(contenedor, MENSAJES[clave], 'success');
    // Quita ?msg= de la URL para que no se repita al recargar
    const url = new URL(window.location.href);
    url.searchParams.delete('msg');
    window.history.replaceState({}, '', url);
  }
}

// ---------- Eliminación con ventana de confirmación ----------
// Usa el modal #modalEliminar que existe en bandas.html y detalle.html.
// alEliminar se ejecuta cuando el servidor confirma el borrado.
function confirmarEliminar(banda, alEliminar, alFallar) {
  const modalEl = document.getElementById('modalEliminar');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const boton = document.getElementById('btnConfirmarEliminar');

  document.getElementById('nombreEliminar').textContent = banda.nombre;

  // Se reemplaza el botón para no acumular eventos de usos anteriores
  const botonNuevo = boton.cloneNode(true);
  boton.replaceWith(botonNuevo);

  botonNuevo.addEventListener('click', async () => {
    botonNuevo.disabled = true;
    botonNuevo.textContent = 'Eliminando…';
    try {
      const respuesta = await fetch(`api/bandas.php?id=${banda.id}`, { method: 'DELETE' });
      const datos = await respuesta.json();
      modal.hide();
      if (!respuesta.ok) throw new Error(datos.errores?.[0] || 'No se pudo eliminar.');
      alEliminar();
    } catch (error) {
      modal.hide();
      alFallar(error.message);
    } finally {
      botonNuevo.disabled = false;
      botonNuevo.textContent = 'Eliminar';
    }
  });

  modal.show();
}

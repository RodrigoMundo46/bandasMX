function escaparHTML(texto) {
  const div = document.createElement('div');
  div.textContent = texto ?? '';
  return div.innerHTML;
}

function obtenerParametro(nombre) {
  return new URLSearchParams(window.location.search).get(nombre);
}

function mostrarAlerta(contenedor, mensaje, tipo = 'success') {
  contenedor.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>`;
  contenedor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

const MENSAJES = {
  creada: 'La banda se agregó correctamente.',
  actualizada: 'Los datos de la banda se actualizaron correctamente.',
  eliminada: 'La banda se eliminó correctamente.'
};

function mostrarMensajeDeURL(contenedor) {
  const clave = obtenerParametro('msg');
  if (MENSAJES[clave]) {
    mostrarAlerta(contenedor, MENSAJES[clave], 'success');
    const url = new URL(window.location.href);
    url.searchParams.delete('msg');
    window.history.replaceState({}, '', url);
  }
}

function confirmarEliminar(banda, alEliminar, alFallar) {
  const modalEl = document.getElementById('modalEliminar');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const boton = document.getElementById('btnConfirmarEliminar');

  document.getElementById('nombreEliminar').textContent = banda.nombre;
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

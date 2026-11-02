// =========================================================
//  detalle.html - Muestra una banda con su discografía
// =========================================================

const alertas = document.getElementById('alertas');
const cargando = document.getElementById('cargando');
const detalle = document.getElementById('detalle');
const id = obtenerParametro('id');

async function cargarDetalle() {
  if (!id) {
    cargando.classList.add('d-none');
    mostrarAlerta(alertas, 'No se indicó qué banda mostrar. <a href="bandas.html" class="alert-link">Ir al listado</a>.', 'warning');
    return;
  }

  try {
    const respuesta = await fetch(`api/bandas.php?id=${encodeURIComponent(id)}`);
    const banda = await respuesta.json();
    if (!respuesta.ok) throw new Error(banda.errores?.[0]);
    pintarDetalle(banda);
  } catch (error) {
    cargando.classList.add('d-none');
    mostrarAlerta(
      alertas,
      `${escaparHTML(error.message || 'No se pudo cargar la banda.')} <a href="bandas.html" class="alert-link">Ir al listado</a>.`,
      'danger'
    );
  }
}

function pintarDetalle(banda) {
  document.title = `${banda.nombre} | Bandas MX`;

  const foto = document.getElementById('foto');
  foto.src = banda.foto;
  foto.alt = `Foto de ${banda.nombre}`;

  document.getElementById('nombre').textContent = banda.nombre;
  document.getElementById('ciudad').textContent = banda.ciudad;
  document.getElementById('genero').textContent = banda.genero;
  document.getElementById('btnEditar').href = `formulario.html?id=${banda.id}`;

  const listaDiscos = document.getElementById('discos');
  listaDiscos.innerHTML = '';
  banda.discos.forEach((disco) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${escaparHTML(disco.titulo)}</span><span class="anio">${disco.anio}</span>`;
    listaDiscos.appendChild(li);
  });

  document.getElementById('btnEliminar').onclick = () => {
    confirmarEliminar(
      banda,
      () => { window.location.href = 'bandas.html?msg=eliminada'; },
      (mensaje) => mostrarAlerta(alertas, escaparHTML(mensaje), 'danger')
    );
  };

  cargando.classList.add('d-none');
  detalle.classList.remove('d-none');
}

mostrarMensajeDeURL(alertas);
cargarDetalle();

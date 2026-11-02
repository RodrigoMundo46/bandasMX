// =========================================================
//  formulario.html - Crear (sin ?id) o editar (con ?id=N)
// =========================================================

const formulario = document.getElementById('formBanda');
const alertas = document.getElementById('alertas');
const listaDiscos = document.getElementById('listaDiscos');
const plantillaDisco = document.getElementById('plantillaDisco');
const errorDiscos = document.getElementById('errorDiscos');
const btnGuardar = document.getElementById('btnGuardar');

const campoFoto = document.getElementById('foto');
const campoNombre = document.getElementById('nombre');
const campoCiudad = document.getElementById('ciudad');
const campoGenero = document.getElementById('genero');

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO = 2 * 1024 * 1024; // 2 MB (límite por defecto de PHP en WAMP)
const ANIO_ACTUAL = new Date().getFullYear();

const id = obtenerParametro('id');
const esEdicion = Boolean(id);

// ---------- Filas de discografía ----------

function agregarFilaDisco(titulo = '', anio = '') {
  const fila = plantillaDisco.content.firstElementChild.cloneNode(true);
  const campoTitulo = fila.querySelector('.campo-titulo');
  const campoAnio = fila.querySelector('.campo-anio');

  campoTitulo.value = titulo;
  campoAnio.value = anio;
  campoAnio.max = ANIO_ACTUAL;

  fila.querySelector('.btn-quitar').addEventListener('click', () => {
    fila.remove();
  });

  // Quita el estado de error cuando el usuario corrige
  [campoTitulo, campoAnio].forEach((campo) =>
    campo.addEventListener('input', () => campo.classList.remove('is-invalid'))
  );

  listaDiscos.appendChild(fila);
  errorDiscos.classList.add('d-none');
  return campoTitulo;
}

document.getElementById('btnAgregarDisco').addEventListener('click', () => {
  agregarFilaDisco().focus();
});

// ---------- Validación ----------

function marcar(campo, esValido) {
  campo.classList.toggle('is-invalid', !esValido);
  campo.classList.toggle('is-valid', esValido);
  return esValido;
}

function validarFoto() {
  const archivo = campoFoto.files[0];
  const errorFoto = document.getElementById('errorFoto');

  if (!archivo) {
    // En edición la foto es opcional (se conserva la actual)
    if (esEdicion) {
      campoFoto.classList.remove('is-invalid', 'is-valid');
      return true;
    }
    errorFoto.textContent = 'Selecciona una foto de la banda.';
    return marcar(campoFoto, false);
  }
  if (!TIPOS_FOTO.includes(archivo.type)) {
    errorFoto.textContent = 'La foto debe ser JPG, PNG o WEBP.';
    return marcar(campoFoto, false);
  }
  if (archivo.size > TAMANO_MAXIMO) {
    errorFoto.textContent = 'La foto no puede pesar más de 2 MB.';
    return marcar(campoFoto, false);
  }
  return marcar(campoFoto, true);
}

function validarTexto(campo) {
  return marcar(campo, campo.value.trim().length > 0);
}

function validarDiscos() {
  const filas = listaDiscos.querySelectorAll('.fila-disco');
  let validos = true;

  if (filas.length === 0) {
    errorDiscos.classList.remove('d-none');
    return false;
  }
  errorDiscos.classList.add('d-none');

  filas.forEach((fila) => {
    const titulo = fila.querySelector('.campo-titulo');
    const anio = fila.querySelector('.campo-anio');
    const valorAnio = Number(anio.value);

    const tituloOk = marcar(titulo, titulo.value.trim().length > 0);
    const anioOk = marcar(
      anio,
      anio.value !== '' && Number.isInteger(valorAnio) && valorAnio >= 1900 && valorAnio <= ANIO_ACTUAL
    );
    if (!tituloOk || !anioOk) validos = false;
  });

  return validos;
}

function validarFormulario() {
  // Se evalúan todos para marcar todos los errores a la vez
  const resultados = [
    validarFoto(),
    validarTexto(campoNombre),
    validarTexto(campoCiudad),
    validarTexto(campoGenero),
    validarDiscos()
  ];
  return resultados.every(Boolean);
}

// Validación en vivo de los campos de texto y la foto
[campoNombre, campoCiudad, campoGenero].forEach((campo) =>
  campo.addEventListener('input', () => validarTexto(campo))
);
campoFoto.addEventListener('change', validarFoto);

// ---------- Envío ----------

function obtenerDiscos() {
  return [...listaDiscos.querySelectorAll('.fila-disco')].map((fila) => ({
    titulo: fila.querySelector('.campo-titulo').value.trim(),
    anio: Number(fila.querySelector('.campo-anio').value)
  }));
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  alertas.innerHTML = '';

  if (!validarFormulario()) {
    mostrarAlerta(alertas, 'Revisa los campos marcados en rojo.', 'danger');
    formulario.querySelector('.is-invalid')?.focus();
    return;
  }

  // FormData permite mandar la foto junto con los demás datos
  const datos = new FormData();
  if (campoFoto.files[0]) datos.append('foto', campoFoto.files[0]);
  datos.append('nombre', campoNombre.value.trim());
  datos.append('ciudad', campoCiudad.value.trim());
  datos.append('genero', campoGenero.value.trim());
  datos.append('discos', JSON.stringify(obtenerDiscos()));

  const textoBoton = btnGuardar.textContent;
  btnGuardar.disabled = true;
  btnGuardar.textContent = 'Guardando…';

  try {
    // Crear: POST api/bandas.php   |   Editar: POST api/bandas.php?id=N
    // (PHP solo procesa archivos subidos en peticiones POST)
    const url = esEdicion ? `api/bandas.php?id=${encodeURIComponent(id)}` : 'api/bandas.php';
    const respuesta = await fetch(url, { method: 'POST', body: datos });
    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      const lista = (resultado.errores || ['Ocurrió un error.']).map(escaparHTML).join('<br>');
      mostrarAlerta(alertas, lista, 'danger');
      return;
    }

    const mensaje = esEdicion ? 'actualizada' : 'creada';
    window.location.href = `detalle.html?id=${resultado.id}&msg=${mensaje}`;
  } catch {
    mostrarAlerta(alertas, 'No se pudo conectar con el servidor.', 'danger');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.textContent = textoBoton;
  }
});

// ---------- Modo edición: cargar los datos actuales ----------

async function cargarParaEditar() {
  document.title = 'Editar banda | Bandas MX';
  document.getElementById('tituloFormulario').textContent = 'Editar banda';
  document.getElementById('subtituloFormulario').textContent = 'Modifica los datos y guarda los cambios.';
  document.getElementById('linkVolver').textContent = '← Volver al detalle';
  document.getElementById('linkVolver').href = `detalle.html?id=${encodeURIComponent(id)}`;
  document.getElementById('btnCancelar').href = `detalle.html?id=${encodeURIComponent(id)}`;
  btnGuardar.textContent = 'Guardar cambios';

  try {
    const respuesta = await fetch(`api/bandas.php?id=${encodeURIComponent(id)}`);
    const banda = await respuesta.json();
    if (!respuesta.ok) throw new Error(banda.errores?.[0]);

    campoNombre.value = banda.nombre;
    campoCiudad.value = banda.ciudad;
    campoGenero.value = banda.genero;
    document.getElementById('fotoActual').src = banda.foto;
    document.getElementById('bloqueFotoActual').classList.remove('d-none');

    banda.discos.forEach((d) => agregarFilaDisco(d.titulo, d.anio));
  } catch (error) {
    formulario.classList.add('d-none');
    mostrarAlerta(
      alertas,
      `${escaparHTML(error.message || 'No se pudo cargar la banda.')} <a href="bandas.html" class="alert-link">Ir al listado</a>.`,
      'danger'
    );
  }
}

if (esEdicion) {
  cargarParaEditar();
} else {
  document.getElementById('linkAgregar').classList.add('active');
  agregarFilaDisco(); // empieza con una fila vacía
}

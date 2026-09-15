const state = {
  trabajadores: []
};

let elementos = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  cachearElementos();
  configurarEventos();
  cargarTrabajadores();
}

function cachearElementos() {
  elementos.selectTrabajador = document.getElementById('selectTrabajador');
  elementos.inputPin = document.getElementById('inputPin');
  elementos.btnRegistrar = document.getElementById('btnRegistrar');
  elementos.mensajeError = document.getElementById('mensajeError');
  elementos.tarjetaFormulario = document.getElementById('tarjetaFormulario');
  elementos.tarjetaResultado = document.getElementById('tarjetaResultado');
  elementos.iconoResultado = document.getElementById('iconoResultado');
  elementos.tituloResultado = document.getElementById('tituloResultado');
  elementos.resNombre = document.getElementById('resNombre');
  elementos.resFecha = document.getElementById('resFecha');
  elementos.resHora = document.getElementById('resHora');
  elementos.resTurno = document.getElementById('resTurno');
  elementos.resTipo = document.getElementById('resTipo');
  elementos.btnNuevoRegistro = document.getElementById('btnNuevoRegistro');
}

function configurarEventos() {
  elementos.inputPin.addEventListener('input', function () {
    elementos.inputPin.value = elementos.inputPin.value.replace(/[^0-9]/g, '').slice(0, 4);
    validarFormulario();
  });
  elementos.selectTrabajador.addEventListener('change', validarFormulario);
  elementos.btnRegistrar.addEventListener('click', registrarAsistencia);
  elementos.btnNuevoRegistro.addEventListener('click', mostrarFormulario);
}

function validarFormulario() {
  const trabajadorSeleccionado = elementos.selectTrabajador.value;
  const pinValido = elementos.inputPin.value.length === 4;
  elementos.btnRegistrar.disabled = !(trabajadorSeleccionado && pinValido);
}

async function cargarTrabajadores() {
  ocultarError();

  if (!API_URL || API_URL.indexOf('PEGA_AQUI') !== -1) {
    mostrarError('La aplicacion no esta configurada. Falta la URL de la API en js/config.js.');
    return;
  }

  try {
    const respuesta = await fetch(API_URL + '?action=getWorkers');
    const json = await respuesta.json();

    if (!json.success) {
      mostrarError(obtenerMensajeError(json, 'No se pudo cargar la lista de trabajadores.'));
      return;
    }

    state.trabajadores = json.data.trabajadores || [];
    llenarSelect(state.trabajadores);
  } catch (err) {
    mostrarError('No se pudo conectar con el servidor. Verifica tu conexion a internet.');
  }
}

function llenarSelect(trabajadores) {
  elementos.selectTrabajador.innerHTML = '';

  const opcionInicial = document.createElement('option');
  opcionInicial.value = '';
  opcionInicial.textContent = 'Seleccione su nombre';
  elementos.selectTrabajador.appendChild(opcionInicial);

  trabajadores.forEach(function (t) {
    const opcion = document.createElement('option');
    opcion.value = t.id;
    opcion.textContent = t.nombre;
    elementos.selectTrabajador.appendChild(opcion);
  });

  elementos.selectTrabajador.disabled = false;
}

async function registrarAsistencia() {
  ocultarError();

  const idTrabajador = elementos.selectTrabajador.value;
  const pin = elementos.inputPin.value;

  if (!idTrabajador || pin.length !== 4) {
    mostrarError('Selecciona tu nombre e ingresa tu PIN de 4 digitos.');
    return;
  }

  elementos.btnRegistrar.disabled = true;
  elementos.btnRegistrar.textContent = 'REGISTRANDO...';

  try {
    // No se envia header "Content-Type: application/json" a proposito:
    // asi el navegador NO dispara una solicitud CORS "preflight" (OPTIONS),
    // que Google Apps Script no puede responder correctamente.
    const respuesta = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'registrarAsistencia',
        idTrabajador: idTrabajador,
        pin: pin
      })
    });

    const json = await respuesta.json();

    if (!json.success) {
      mostrarError(obtenerMensajeError(json, 'No se pudo registrar la asistencia.'));
      elementos.inputPin.value = '';
      validarFormulario();
      return;
    }

    mostrarResultado(json.data);
    elementos.inputPin.value = '';
  } catch (err) {
    mostrarError('No se pudo conectar con el servidor. Intenta de nuevo.');
  } finally {
    elementos.btnRegistrar.textContent = 'REGISTRAR ASISTENCIA';
    validarFormulario();
  }
}

function obtenerMensajeError(json, mensajePorDefecto) {
  if (json && json.error && json.error.message) {
    return json.error.message;
  }
  return mensajePorDefecto;
}

function mostrarResultado(data) {
  const esEntrada = data.tipo === 'ENTRADA';

  elementos.iconoResultado.textContent = esEntrada ? '✅' : '👋';
  elementos.tituloResultado.textContent = data.mensaje;
  elementos.resNombre.textContent = data.nombre;
  elementos.resFecha.textContent = data.fecha;
  elementos.resHora.textContent = data.hora;
  elementos.resTurno.textContent = data.turno;
  elementos.resTipo.textContent = esEntrada ? 'Entrada' : 'Salida';

  elementos.tarjetaFormulario.hidden = true;
  elementos.tarjetaResultado.hidden = false;
}

function mostrarFormulario() {
  elementos.tarjetaResultado.hidden = true;
  elementos.tarjetaFormulario.hidden = false;
  elementos.selectTrabajador.value = '';
  elementos.inputPin.value = '';
  ocultarError();
  validarFormulario();
}

function mostrarError(mensaje) {
  elementos.mensajeError.textContent = mensaje;
  elementos.mensajeError.hidden = false;
}

function ocultarError() {
  elementos.mensajeError.hidden = true;
  elementos.mensajeError.textContent = '';
}

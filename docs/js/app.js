const state = {
  trabajadores: []
};

const CLAVE_ULTIMO_TRABAJADOR = 'controlAsistencia_ultimoTrabajadorId';
const TEXTO_BOTON_DEFECTO = 'REGISTRAR ASISTENCIA';

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
  elementos.selectTrabajador.addEventListener('change', function () {
    validarFormulario();
    actualizarBotonSegunTrabajador(elementos.selectTrabajador.value);
  });
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

  // Si este telefono ya se uso antes para registrar a alguien, se deja su
  // nombre preseleccionado (nunca el PIN, eso no se guarda) para que no
  // tenga que buscarse en la lista cada vez que escanea el QR.
  const idRecordado = leerUltimoTrabajador();
  if (idRecordado && trabajadores.some(function (t) { return t.id === idRecordado; })) {
    elementos.selectTrabajador.value = idRecordado;
  }

  validarFormulario();
  actualizarBotonSegunTrabajador(elementos.selectTrabajador.value);
}

/**
 * Consulta (sin PIN) si el siguiente registro de este trabajador seria
 * una entrada o una salida, y actualiza el texto del boton para que el
 * trabajador sepa que va a pasar antes de confirmar.
 */
async function actualizarBotonSegunTrabajador(idTrabajador) {
  if (!idTrabajador) {
    elementos.btnRegistrar.textContent = TEXTO_BOTON_DEFECTO;
    return;
  }

  try {
    const respuesta = await fetch(API_URL + '?action=siguienteAccion&idTrabajador=' + encodeURIComponent(idTrabajador));
    const json = await respuesta.json();

    if (json.success && json.data && json.data.tipoSiguiente === 'SALIDA') {
      elementos.btnRegistrar.textContent = 'REGISTRAR SALIDA';
    } else {
      elementos.btnRegistrar.textContent = 'REGISTRAR ENTRADA';
    }
  } catch (err) {
    elementos.btnRegistrar.textContent = TEXTO_BOTON_DEFECTO;
  }
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

    guardarUltimoTrabajador(idTrabajador);
    mostrarResultado(json.data);
    elementos.inputPin.value = '';
  } catch (err) {
    mostrarError('No se pudo conectar con el servidor. Intenta de nuevo.');
  } finally {
    actualizarBotonSegunTrabajador(elementos.selectTrabajador.value);
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

  // El siguiente paso logico para esta misma persona es lo contrario de
  // lo que acaba de registrar.
  elementos.btnNuevoRegistro.textContent = esEntrada ? 'REGISTRAR SALIDA' : 'REGISTRAR ENTRADA';

  elementos.tarjetaFormulario.hidden = true;
  elementos.tarjetaResultado.hidden = false;
}

function mostrarFormulario() {
  elementos.tarjetaResultado.hidden = true;
  elementos.tarjetaFormulario.hidden = false;
  elementos.inputPin.value = '';
  ocultarError();
  validarFormulario();
  actualizarBotonSegunTrabajador(elementos.selectTrabajador.value);
}

function guardarUltimoTrabajador(idTrabajador) {
  try {
    localStorage.setItem(CLAVE_ULTIMO_TRABAJADOR, idTrabajador);
  } catch (err) {
    // Si el navegador bloquea localStorage (modo privado, etc.) no pasa
    // nada grave: simplemente no se recordara el nombre la proxima vez.
  }
}

function leerUltimoTrabajador() {
  try {
    return localStorage.getItem(CLAVE_ULTIMO_TRABAJADOR);
  } catch (err) {
    return null;
  }
}

function mostrarError(mensaje) {
  elementos.mensajeError.textContent = mensaje;
  elementos.mensajeError.hidden = false;
}

function ocultarError() {
  elementos.mensajeError.hidden = true;
  elementos.mensajeError.textContent = '';
}

/**
 * Acceso y validacion de la hoja PERSONAL.
 * IMPORTANTE: nunca se expone el PIN ni la tarifa por hora hacia la pagina publica.
 */

function obtenerTrabajadoresActivos() {
  const sheet = getSheet(SHEET_NAMES.PERSONAL);
  const registros = sheetToObjects(sheet);
  return registros
    .filter(function (t) { return t.ESTADO === ESTADOS.ACTIVO; })
    .map(function (t) {
      return {
        id: String(t.ID_TRABAJADOR),
        nombre: t.NOMBRE_COMPLETO
      };
    });
}

function buscarTrabajadorPorId(idTrabajador) {
  const sheet = getSheet(SHEET_NAMES.PERSONAL);
  const registros = sheetToObjects(sheet);
  const idBuscado = String(idTrabajador).trim();
  for (let i = 0; i < registros.length; i++) {
    if (String(registros[i].ID_TRABAJADOR).trim() === idBuscado) {
      return registros[i];
    }
  }
  return null;
}

function validarTrabajadorYPin(idTrabajador, pin) {
  if (!idTrabajador || !pin) {
    return { valido: false, error: buildError('DATOS_INCOMPLETOS', 'Debe seleccionar un trabajador e ingresar el PIN.') };
  }

  const trabajador = buscarTrabajadorPorId(idTrabajador);
  if (!trabajador) {
    return { valido: false, error: buildError('TRABAJADOR_NO_EXISTE', 'El trabajador seleccionado no existe.') };
  }

  if (trabajador.ESTADO !== ESTADOS.ACTIVO) {
    return { valido: false, error: buildError('TRABAJADOR_INACTIVO', 'Este trabajador no esta activo. Contacte al administrador.') };
  }

  const pinRegistrado = String(trabajador.PIN).trim();
  const pinIngresado = String(pin).trim();
  if (pinRegistrado !== pinIngresado) {
    return { valido: false, error: buildError('PIN_INCORRECTO', 'El PIN ingresado es incorrecto.') };
  }

  return { valido: true, trabajador: trabajador };
}

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

/**
 * Valida que el trabajador exista y este ACTIVO. Ya no se pide PIN: la
 * identidad se confirma con la foto que se toma al momento de registrar
 * (queda guardada junto al registro en ASISTENCIAS para poder revisarla
 * despues si hay alguna duda).
 */
function validarTrabajador(idTrabajador) {
  if (!idTrabajador) {
    return { valido: false, error: buildError('DATOS_INCOMPLETOS', 'Debe seleccionar un trabajador.') };
  }

  const trabajador = buscarTrabajadorPorId(idTrabajador);
  if (!trabajador) {
    return { valido: false, error: buildError('TRABAJADOR_NO_EXISTE', 'El trabajador seleccionado no existe.') };
  }

  if (trabajador.ESTADO !== ESTADOS.ACTIVO) {
    return { valido: false, error: buildError('TRABAJADOR_INACTIVO', 'Este trabajador no esta activo. Contacte al administrador.') };
  }

  return { valido: true, trabajador: trabajador };
}

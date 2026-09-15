/**
 * Acceso a la hoja TURNOS.
 * Los horarios NO estan escritos directamente en el codigo: se leen de
 * Google Sheets para que el jefe pueda modificarlos sin tocar el script.
 */

function buscarTurnoPorId(idTurno) {
  const sheet = getSheet(SHEET_NAMES.TURNOS);
  const registros = sheetToObjects(sheet);
  const idBuscado = String(idTurno).trim();
  for (let i = 0; i < registros.length; i++) {
    if (String(registros[i].ID_TURNO).trim() === idBuscado) {
      return registros[i];
    }
  }
  return null;
}

function obtenerTurnosActivos() {
  const sheet = getSheet(SHEET_NAMES.TURNOS);
  const registros = sheetToObjects(sheet);
  return registros.filter(function (t) { return t.ESTADO === ESTADOS.ACTIVO; });
}

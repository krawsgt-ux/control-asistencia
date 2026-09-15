/**
 * Configuración global del sistema de Control de Asistencia.
 *
 * Si creas este script desde "Extensiones > Apps Script" DENTRO del propio
 * Google Sheet (recomendado), deja SPREADSHEET_ID vacío: el sistema usará
 * automáticamente esa hoja.
 *
 * Si en cambio usas un proyecto de Apps Script independiente (standalone),
 * pega aquí el ID de tu Google Sheet (lo ves en la URL, entre /d/ y /edit).
 */

const SPREADSHEET_ID = '';

const TIMEZONE = 'America/Guatemala';

const SHEET_NAMES = {
  PERSONAL: 'PERSONAL',
  TURNOS: 'TURNOS',
  ASISTENCIAS: 'ASISTENCIAS',
  CONFIGURACION: 'CONFIGURACION',
  PAGOS: 'PAGOS'
};

const ESTADOS = {
  ACTIVO: 'ACTIVO',
  INACTIVO: 'INACTIVO',
  ABIERTO: 'ABIERTO',
  CERRADO: 'CERRADO'
};

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(sheetName) {
  const spreadsheet = getSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('No se encontro la hoja "' + sheetName + '". Verifica que exista en el Google Sheet.');
  }
  return sheet;
}

/**
 * Lee la hoja CONFIGURACION (columnas CLAVE / VALOR) y la devuelve como
 * un objeto { CLAVE: VALOR }, para leer parametros globales como
 * ADMIN_PASSWORD sin tener codigo sensible escrito en el script.
 */
function obtenerConfiguracion() {
  const sheet = getSheet(SHEET_NAMES.CONFIGURACION);
  const registros = sheetToObjects(sheet);
  const config = {};
  registros.forEach(function (r) {
    config[r.CLAVE] = r.VALOR;
  });
  return config;
}

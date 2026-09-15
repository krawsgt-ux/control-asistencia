/**
 * Utilidades generales: fecha/hora en zona horaria de Guatemala,
 * generacion de IDs, respuestas JSON y lectura de hojas por encabezado.
 */

function formatDateGT(date, pattern) {
  return Utilities.formatDate(date, TIMEZONE, pattern);
}

function getFechaHoyGT() {
  return formatDateGT(new Date(), 'dd/MM/yyyy');
}

function getHoraActualGT() {
  return formatDateGT(new Date(), 'HH:mm:ss');
}

/**
 * Google Sheets puede convertir automaticamente un texto tipo "15/09/2026"
 * u "09:00" en un valor de fecha/hora real al guardarlo, aunque la columna
 * no se haya formateado asi. Estas funciones normalizan lo que venga de la
 * hoja (texto o Date) a un string consistente, para que las comparaciones
 * y los calculos nunca fallen por ese motivo.
 */
function normalizarFecha(valor) {
  if (valor instanceof Date) {
    return formatDateGT(valor, 'dd/MM/yyyy');
  }
  return String(valor).trim();
}

function normalizarHora(valor) {
  if (valor instanceof Date) {
    return formatDateGT(valor, 'HH:mm:ss');
  }
  return String(valor).trim();
}

function generarIdRegistro(prefijo) {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return prefijo + '-' + timestamp + '-' + random;
}

function buildSuccess(data) {
  return { success: true, data: data };
}

function buildError(code, message) {
  return { success: false, error: { code: code, message: message } };
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Lee todas las filas de una hoja y las devuelve como arreglo de objetos,
 * usando la fila 1 como nombres de propiedad (deben coincidir EXACTAMENTE
 * con los encabezados definidos en el diseno de Google Sheets).
 * Cada objeto incluye "_row" con el numero de fila real en la hoja,
 * util para poder actualizar esa fila despues.
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach(function (header, colIndex) {
      obj[header] = data[i][colIndex];
    });
    obj._row = i + 1;
    rows.push(obj);
  }
  return rows;
}

function getColumnIndex(headers, columnName) {
  const index = headers.indexOf(columnName);
  if (index === -1) {
    throw new Error('No se encontro la columna "' + columnName + '". Verifica los encabezados de la hoja.');
  }
  return index;
}

function horaASegundos(horaTexto) {
  const partes = String(horaTexto).split(':').map(Number);
  const horas = partes[0] || 0;
  const minutos = partes[1] || 0;
  const segundos = partes[2] || 0;
  return (horas * 3600) + (minutos * 60) + segundos;
}

function calcularHorasTrabajadas(horaEntrada, horaSalida) {
  const inicio = horaASegundos(horaEntrada);
  const fin = horaASegundos(horaSalida);
  let diferenciaSegundos = fin - inicio;
  if (diferenciaSegundos < 0) diferenciaSegundos = 0;
  return Math.round((diferenciaSegundos / 3600) * 100) / 100;
}

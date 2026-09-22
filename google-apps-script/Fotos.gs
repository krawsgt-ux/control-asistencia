/**
 * Guarda en Google Drive las fotos que se toman al registrar asistencia.
 * Las fotos quedan privadas (solo accesibles a la cuenta de Google del
 * jefe, la misma que ejecuta el Apps Script); el enlace se guarda en
 * ASISTENCIAS para poder revisarlas despues si hay alguna duda.
 */

const NOMBRE_CARPETA_FOTOS = 'Fotos Control Asistencia';

function obtenerCarpetaFotos() {
  const carpetas = DriveApp.getFoldersByName(NOMBRE_CARPETA_FOTOS);
  if (carpetas.hasNext()) {
    return carpetas.next();
  }
  return DriveApp.createFolder(NOMBRE_CARPETA_FOTOS);
}

/**
 * Recibe una foto en formato Data URL (ej. "data:image/jpeg;base64,....")
 * y la guarda como archivo en Drive. Devuelve la URL del archivo, o null
 * si no se recibio ninguna foto valida.
 */
function guardarFoto(fotoBase64, idTrabajador, tipoRegistro) {
  if (!fotoBase64 || typeof fotoBase64 !== 'string') {
    return null;
  }

  const coincidencia = fotoBase64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!coincidencia) {
    return null;
  }

  const tipoMime = coincidencia[1];
  const datosBase64 = coincidencia[2];
  const extension = tipoMime === 'image/png' ? 'png' : 'jpg';

  const bytes = Utilities.base64Decode(datosBase64);
  const marcaTiempo = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd_HHmmss');
  const nombreArchivo = idTrabajador + '_' + tipoRegistro + '_' + marcaTiempo + '.' + extension;

  const blob = Utilities.newBlob(bytes, tipoMime, nombreArchivo);
  const archivo = obtenerCarpetaFotos().createFile(blob);

  return archivo.getUrl();
}

/**
 * Punto de entrada de la API (Web App de Google Apps Script).
 *
 * GET  -> lecturas publicas (ej. lista de trabajadores activos)
 * POST -> acciones que modifican datos (ej. registrar asistencia)
 *
 * El frontend envia el POST sin header "Content-Type: application/json"
 * a proposito (usa el tipo por defecto text/plain) para evitar que el
 * navegador dispare una solicitud CORS "preflight" (OPTIONS), que Apps
 * Script Web Apps no puede responder. Por eso aqui parseamos manualmente
 * e.postData.contents como JSON en lugar de usar un parametro ya parseado.
 */

function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getWorkers') {
      return jsonOutput(buildSuccess({ trabajadores: obtenerTrabajadoresActivos() }));
    }

    if (action === 'ping') {
      return jsonOutput(buildSuccess({ status: 'ok', servidor: getFechaHoyGT() + ' ' + getHoraActualGT() }));
    }

    return jsonOutput(buildError('ACCION_INVALIDA', 'Accion no reconocida.'));
  } catch (err) {
    console.error(err);
    return jsonOutput(buildError('ERROR_SERVIDOR', 'Ocurrio un error inesperado en el servidor.'));
  }
}

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonOutput(buildError('SOLICITUD_INVALIDA', 'No se recibieron datos en la solicitud.'));
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonOutput(buildError('JSON_INVALIDO', 'El formato de los datos enviados es invalido.'));
    }

    const action = payload.action;

    if (action === 'registrarAsistencia') {
      const resultado = registrarAsistencia(payload.idTrabajador, payload.pin);
      return jsonOutput(resultado);
    }

    if (action === 'adminLogin') {
      return jsonOutput(adminLogin(payload.password));
    }

    if (action === 'adminGetPersonal') {
      return jsonOutput(adminObtenerPersonal(payload.password));
    }

    if (action === 'adminAddPersonal') {
      return jsonOutput(adminAgregarPersonal(payload.password, payload.datos));
    }

    if (action === 'adminUpdatePersonal') {
      return jsonOutput(adminActualizarPersonal(payload.password, payload.idTrabajador, payload.datos));
    }

    if (action === 'adminSetEstadoPersonal') {
      return jsonOutput(adminCambiarEstadoPersonal(payload.password, payload.idTrabajador, payload.estado));
    }

    if (action === 'adminReporteAsistenciaDia') {
      return jsonOutput(adminReporteAsistenciaDia(payload.password, payload.fecha));
    }

    return jsonOutput(buildError('ACCION_INVALIDA', 'Accion no reconocida.'));
  } catch (err) {
    console.error(err);
    return jsonOutput(buildError('ERROR_SERVIDOR', 'Ocurrio un error inesperado en el servidor.'));
  }
}

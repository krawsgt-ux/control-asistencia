/**
 * Funciones administrativas para la futura app Android del jefe.
 * TODAS requieren la contraseña de administrador (guardada en la hoja
 * CONFIGURACION, clave ADMIN_PASSWORD) y se exponen solo por POST para
 * que la contraseña nunca viaje en la URL.
 *
 * Estas funciones SI exponen datos sensibles (PIN, tarifa) porque estan
 * pensadas para la app del jefe, nunca para la pagina publica del QR.
 */

function validarAdminPassword(password) {
  if (!password) return false;
  const config = obtenerConfiguracion();
  const passwordGuardado = config.ADMIN_PASSWORD;
  if (!passwordGuardado) return false;
  return String(password) === String(passwordGuardado);
}

function adminLogin(password) {
  if (!validarAdminPassword(password)) {
    return buildError('NO_AUTORIZADO', 'Contrasena de administrador incorrecta.');
  }
  return buildSuccess({ mensaje: 'Sesion iniciada correctamente.' });
}

function adminObtenerPersonal(password) {
  if (!validarAdminPassword(password)) {
    return buildError('NO_AUTORIZADO', 'Contrasena de administrador incorrecta.');
  }

  const sheet = getSheet(SHEET_NAMES.PERSONAL);
  const registros = sheetToObjects(sheet);
  const lista = registros.map(function (t) {
    return {
      id: String(t.ID_TRABAJADOR),
      nombre: t.NOMBRE_COMPLETO,
      pin: String(t.PIN),
      turno: String(t.ID_TURNO),
      tarifaHora: t.TARIFA_HORA,
      estado: t.ESTADO,
      fechaIngreso: normalizarFecha(t.FECHA_INGRESO)
    };
  });

  return buildSuccess({ trabajadores: lista });
}

function generarSiguienteIdTrabajador(registros) {
  let maxId = 0;
  registros.forEach(function (r) {
    const num = parseInt(String(r.ID_TRABAJADOR).replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > maxId) maxId = num;
  });
  const siguiente = maxId + 1;
  return String(siguiente).padStart(3, '0');
}

function adminAgregarPersonal(password, datos) {
  if (!validarAdminPassword(password)) {
    return buildError('NO_AUTORIZADO', 'Contrasena de administrador incorrecta.');
  }
  if (!datos || !datos.nombre || !datos.pin || !datos.turno) {
    return buildError('DATOS_INCOMPLETOS', 'Nombre, PIN y turno son obligatorios.');
  }

  const nombre = String(datos.nombre).trim();
  if (!nombre) {
    return buildError('DATOS_INCOMPLETOS', 'El nombre no puede estar vacio.');
  }

  const pin = String(datos.pin).trim();
  if (!/^[0-9]{4}$/.test(pin)) {
    return buildError('PIN_INVALIDO', 'El PIN debe tener exactamente 4 digitos.');
  }

  const turno = buscarTurnoPorId(datos.turno);
  if (!turno) {
    return buildError('TURNO_INVALIDO', 'El turno indicado no existe.');
  }

  const sheet = getSheet(SHEET_NAMES.PERSONAL);
  const registros = sheetToObjects(sheet);
  const nuevoId = generarSiguienteIdTrabajador(registros);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const nuevaFila = headers.map(function (col) {
    switch (col) {
      case 'ID_TRABAJADOR': return nuevoId;
      case 'NOMBRE_COMPLETO': return nombre;
      case 'PIN': return pin;
      case 'ID_TURNO': return String(datos.turno).trim();
      case 'TARIFA_HORA': return (datos.tarifaHora !== undefined && datos.tarifaHora !== null && datos.tarifaHora !== '') ? Number(datos.tarifaHora) : '';
      case 'ESTADO': return ESTADOS.ACTIVO;
      case 'FECHA_INGRESO': return getFechaHoyGT();
      default: return '';
    }
  });

  const nuevaFilaNumero = sheet.getLastRow() + 1;
  const columnasTexto = ['ID_TRABAJADOR', 'PIN', 'ID_TURNO', 'FECHA_INGRESO'];
  headers.forEach(function (col, idx) {
    if (columnasTexto.indexOf(col) !== -1) {
      sheet.getRange(nuevaFilaNumero, idx + 1).setNumberFormat('@');
    }
  });
  sheet.getRange(nuevaFilaNumero, 1, 1, headers.length).setValues([nuevaFila]);

  return buildSuccess({ id: nuevoId, mensaje: 'Trabajador agregado correctamente.' });
}

function adminActualizarPersonal(password, idTrabajador, datos) {
  if (!validarAdminPassword(password)) {
    return buildError('NO_AUTORIZADO', 'Contrasena de administrador incorrecta.');
  }
  if (!idTrabajador) {
    return buildError('DATOS_INCOMPLETOS', 'Debe indicar el ID del trabajador.');
  }

  const sheet = getSheet(SHEET_NAMES.PERSONAL);
  const registros = sheetToObjects(sheet);
  const idBuscado = String(idTrabajador).trim();
  let registro = null;
  for (let i = 0; i < registros.length; i++) {
    if (String(registros[i].ID_TRABAJADOR).trim() === idBuscado) {
      registro = registros[i];
      break;
    }
  }
  if (!registro) {
    return buildError('TRABAJADOR_NO_EXISTE', 'El trabajador no existe.');
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const fila = registro._row;
  datos = datos || {};

  if (datos.nombre !== undefined && datos.nombre !== null && String(datos.nombre).trim() !== '') {
    sheet.getRange(fila, getColumnIndex(headers, 'NOMBRE_COMPLETO') + 1).setValue(String(datos.nombre).trim());
  }

  if (datos.pin !== undefined && datos.pin !== null && String(datos.pin).trim() !== '') {
    const pin = String(datos.pin).trim();
    if (!/^[0-9]{4}$/.test(pin)) {
      return buildError('PIN_INVALIDO', 'El PIN debe tener exactamente 4 digitos.');
    }
    sheet.getRange(fila, getColumnIndex(headers, 'PIN') + 1).setNumberFormat('@').setValue(pin);
  }

  if (datos.turno !== undefined && datos.turno !== null && String(datos.turno).trim() !== '') {
    const turno = buscarTurnoPorId(datos.turno);
    if (!turno) {
      return buildError('TURNO_INVALIDO', 'El turno indicado no existe.');
    }
    sheet.getRange(fila, getColumnIndex(headers, 'ID_TURNO') + 1).setNumberFormat('@').setValue(String(datos.turno).trim());
  }

  if (datos.tarifaHora !== undefined && datos.tarifaHora !== null && datos.tarifaHora !== '') {
    sheet.getRange(fila, getColumnIndex(headers, 'TARIFA_HORA') + 1).setValue(Number(datos.tarifaHora));
  }

  return buildSuccess({ mensaje: 'Trabajador actualizado correctamente.' });
}

/**
 * Cambia el ESTADO de un trabajador (ACTIVO / INACTIVO). Nunca se elimina
 * la fila fisicamente, para conservar el historial de asistencias.
 */
function adminCambiarEstadoPersonal(password, idTrabajador, nuevoEstado) {
  if (!validarAdminPassword(password)) {
    return buildError('NO_AUTORIZADO', 'Contrasena de administrador incorrecta.');
  }
  if (nuevoEstado !== ESTADOS.ACTIVO && nuevoEstado !== ESTADOS.INACTIVO) {
    return buildError('ESTADO_INVALIDO', 'El estado debe ser ACTIVO o INACTIVO.');
  }

  const sheet = getSheet(SHEET_NAMES.PERSONAL);
  const registros = sheetToObjects(sheet);
  const idBuscado = String(idTrabajador).trim();
  let registro = null;
  for (let i = 0; i < registros.length; i++) {
    if (String(registros[i].ID_TRABAJADOR).trim() === idBuscado) {
      registro = registros[i];
      break;
    }
  }
  if (!registro) {
    return buildError('TRABAJADOR_NO_EXISTE', 'El trabajador no existe.');
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.getRange(registro._row, getColumnIndex(headers, 'ESTADO') + 1).setValue(nuevoEstado);

  return buildSuccess({
    mensaje: nuevoEstado === ESTADOS.ACTIVO ? 'Trabajador activado correctamente.' : 'Trabajador desactivado correctamente.'
  });
}

/**
 * Reporte de cumplimiento de turnos de un dia especifico: para cada
 * trabajador activo, muestra los turnos que registro ese dia (entrada,
 * salida, horas trabajadas, observaciones), o "asistio: false" si no
 * tiene ningun registro ese dia.
 */
function adminReporteAsistenciaDia(password, fecha) {
  if (!validarAdminPassword(password)) {
    return buildError('NO_AUTORIZADO', 'Contrasena de administrador incorrecta.');
  }
  if (!fecha) {
    return buildError('DATOS_INCOMPLETOS', 'Debe indicar una fecha en formato dd/MM/yyyy.');
  }

  const trabajadores = sheetToObjects(getSheet(SHEET_NAMES.PERSONAL))
    .filter(function (t) { return t.ESTADO === ESTADOS.ACTIVO; });

  const registrosAsistencia = sheetToObjects(getSheet(SHEET_NAMES.ASISTENCIAS))
    .filter(function (r) { return normalizarFecha(r.FECHA) === fecha; });

  const reporte = trabajadores.map(function (t) {
    const idTrabajador = String(t.ID_TRABAJADOR).trim();
    const registrosDelTrabajador = registrosAsistencia.filter(function (r) {
      return String(r.ID_TRABAJADOR).trim() === idTrabajador;
    });

    const turnos = registrosDelTrabajador.map(function (r) {
      return {
        turno: r.ID_TURNO,
        horaEntrada: normalizarHora(r.HORA_ENTRADA),
        horaSalida: r.HORA_SALIDA ? normalizarHora(r.HORA_SALIDA) : null,
        horasTrabajadas: r.HORAS_TRABAJADAS || 0,
        estadoRegistro: r.ESTADO_REGISTRO,
        observaciones: r.OBSERVACIONES || ''
      };
    });

    return {
      id: idTrabajador,
      nombre: t.NOMBRE_COMPLETO,
      asistio: turnos.length > 0,
      turnosRegistrados: turnos
    };
  });

  return buildSuccess({ fecha: fecha, trabajadores: reporte });
}

/**
 * Detalle de turnos de UN trabajador dentro de un rango de fechas
 * (pensado para la quincena: 01-15 o 16-fin de mes, pero el rango lo
 * decide quien llama, no esta fijo aqui). Devuelve los dias con registros,
 * mas totales de dias trabajados, horas y tardanzas, para ver de un
 * vistazo si el trabajador cumplio antes de calcular su pago.
 */
function adminReporteTrabajadorRango(password, idTrabajador, fechaInicio, fechaFin) {
  if (!validarAdminPassword(password)) {
    return buildError('NO_AUTORIZADO', 'Contrasena de administrador incorrecta.');
  }
  if (!idTrabajador || !fechaInicio || !fechaFin) {
    return buildError('DATOS_INCOMPLETOS', 'Debe indicar trabajador, fecha de inicio y fecha de fin.');
  }

  const trabajador = buscarTrabajadorPorId(idTrabajador);
  if (!trabajador) {
    return buildError('TRABAJADOR_NO_EXISTE', 'El trabajador no existe.');
  }

  const inicioComparable = fechaAComparable(fechaInicio);
  const finComparable = fechaAComparable(fechaFin);
  const idBuscado = String(idTrabajador).trim();

  const registros = sheetToObjects(getSheet(SHEET_NAMES.ASISTENCIAS)).filter(function (r) {
    if (String(r.ID_TRABAJADOR).trim() !== idBuscado) return false;
    const fechaComparable = fechaAComparable(normalizarFecha(r.FECHA));
    return fechaComparable >= inicioComparable && fechaComparable <= finComparable;
  });

  const porFecha = {};
  let totalHoras = 0;
  let totalTardanzas = 0;

  registros.forEach(function (r) {
    const fecha = normalizarFecha(r.FECHA);
    if (!porFecha[fecha]) porFecha[fecha] = [];
    porFecha[fecha].push({
      turno: r.ID_TURNO,
      horaEntrada: normalizarHora(r.HORA_ENTRADA),
      horaSalida: r.HORA_SALIDA ? normalizarHora(r.HORA_SALIDA) : null,
      horasTrabajadas: r.HORAS_TRABAJADAS || 0,
      estadoRegistro: r.ESTADO_REGISTRO,
      observaciones: r.OBSERVACIONES || ''
    });

    totalHoras += Number(r.HORAS_TRABAJADAS) || 0;
    if (r.OBSERVACIONES && String(r.OBSERVACIONES).indexOf('TARDANZA') !== -1) {
      totalTardanzas++;
    }
  });

  const dias = Object.keys(porFecha)
    .sort(function (a, b) {
      const compA = fechaAComparable(a);
      const compB = fechaAComparable(b);
      return compA < compB ? -1 : (compA > compB ? 1 : 0);
    })
    .map(function (fecha) {
      return { fecha: fecha, turnos: porFecha[fecha] };
    });

  return buildSuccess({
    id: String(trabajador.ID_TRABAJADOR),
    nombre: trabajador.NOMBRE_COMPLETO,
    fechaInicio: fechaInicio,
    fechaFin: fechaFin,
    diasTrabajados: dias.length,
    totalHoras: Math.round(totalHoras * 100) / 100,
    totalTardanzas: totalTardanzas,
    dias: dias
  });
}

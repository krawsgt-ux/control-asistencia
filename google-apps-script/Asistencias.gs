/**
 * Logica principal de registro de asistencia.
 * El trabajador NUNCA elige "entrada" o "salida": el sistema lo determina
 * segun si existe o no un registro ABIERTO para ese trabajador en el dia de hoy.
 */

function buscarRegistroAbiertoHoy(sheet, idTrabajador, fechaHoy) {
  const registros = sheetToObjects(sheet);
  const idBuscado = String(idTrabajador).trim();
  for (let i = 0; i < registros.length; i++) {
    const r = registros[i];
    if (String(r.ID_TRABAJADOR).trim() === idBuscado &&
        normalizarFecha(r.FECHA) === fechaHoy &&
        r.ESTADO_REGISTRO === ESTADOS.ABIERTO) {
      return r;
    }
  }
  return null;
}

/**
 * Devuelve los ID_TURNO que este trabajador ya completo (entrada + salida)
 * el dia de hoy, para no permitir repetir el mismo turno dos veces.
 */
function obtenerTurnosCompletadosHoy(sheet, idTrabajador, fechaHoy) {
  const registros = sheetToObjects(sheet);
  const idBuscado = String(idTrabajador).trim();
  const turnos = [];
  for (let i = 0; i < registros.length; i++) {
    const r = registros[i];
    if (String(r.ID_TRABAJADOR).trim() === idBuscado &&
        normalizarFecha(r.FECHA) === fechaHoy &&
        r.ESTADO_REGISTRO === ESTADOS.CERRADO) {
      turnos.push(String(r.ID_TURNO).trim());
    }
  }
  return turnos;
}

/**
 * Elige automaticamente a que turno corresponde una ENTRADA nueva: de los
 * turnos activos que el trabajador todavia no completo hoy, se elige el que
 * tenga la HORA_INICIO mas cercana a la hora actual. Esto permite que la
 * misma persona registre hasta un ciclo completo por cada turno activo
 * (por ejemplo Turno A en la manana y Turno B en la tarde) sin tener que
 * elegir manualmente cual es.
 */
function elegirTurnoParaEntrada(turnosActivos, turnosCompletadosHoy, horaActual) {
  const candidatos = turnosActivos.filter(function (t) {
    return turnosCompletadosHoy.indexOf(String(t.ID_TURNO).trim()) === -1;
  });
  if (candidatos.length === 0) return null;

  const horaActualSegundos = horaASegundos(horaActual);
  let elegido = candidatos[0];
  let menorDiferencia = Math.abs(horaASegundos(normalizarHora(elegido.HORA_INICIO)) - horaActualSegundos);
  for (let i = 1; i < candidatos.length; i++) {
    const diferencia = Math.abs(horaASegundos(normalizarHora(candidatos[i].HORA_INICIO)) - horaActualSegundos);
    if (diferencia < menorDiferencia) {
      menorDiferencia = diferencia;
      elegido = candidatos[i];
    }
  }
  return elegido;
}

/**
 * Indica si el proximo registro de este trabajador seria una ENTRADA o
 * una SALIDA, SIN pedir PIN. Es para que el boton de la pagina publica
 * pueda mostrar el texto correcto (Registrar entrada / Registrar salida)
 * apenas el trabajador selecciona su nombre, antes de escribir el PIN.
 * No expone PIN, tarifa ni ningun otro dato del trabajador.
 */
function obtenerSiguienteAccion(idTrabajador) {
  if (!idTrabajador) {
    return buildError('DATOS_INCOMPLETOS', 'Debe indicar el trabajador.');
  }

  const trabajador = buscarTrabajadorPorId(idTrabajador);
  if (!trabajador || trabajador.ESTADO !== ESTADOS.ACTIVO) {
    return buildSuccess({ tipoSiguiente: 'ENTRADA' });
  }

  const sheet = getSheet(SHEET_NAMES.ASISTENCIAS);
  const fechaHoy = getFechaHoyGT();
  const registroAbierto = buscarRegistroAbiertoHoy(sheet, idTrabajador, fechaHoy);

  return buildSuccess({ tipoSiguiente: registroAbierto ? 'SALIDA' : 'ENTRADA' });
}

/**
 * Punto de entrada principal. Valida trabajador, determina si corresponde
 * ENTRADA o SALIDA, guarda la foto tomada en Drive, y escribe/actualiza la
 * fila correspondiente en ASISTENCIAS. Protegido con LockService para
 * evitar registros duplicados si el trabajador presiona el boton varias
 * veces muy rapido.
 */
function registrarAsistencia(idTrabajador, fotoBase64) {
  const validacion = validarTrabajador(idTrabajador);
  if (!validacion.valido) {
    return validacion.error;
  }
  const trabajador = validacion.trabajador;

  const lock = LockService.getScriptLock();
  const obtuvoLock = lock.tryLock(30000);
  if (!obtuvoLock) {
    return buildError('SERVIDOR_OCUPADO', 'El sistema esta ocupado, intenta de nuevo en unos segundos.');
  }

  try {
    const sheet = getSheet(SHEET_NAMES.ASISTENCIAS);
    const fechaHoy = getFechaHoyGT();
    const horaActual = getHoraActualGT();

    const registroAbierto = buscarRegistroAbiertoHoy(sheet, trabajador.ID_TRABAJADOR, fechaHoy);
    if (registroAbierto) {
      const turnoDelRegistro = buscarTurnoPorId(registroAbierto.ID_TURNO);
      if (!turnoDelRegistro) {
        return buildError('TURNO_INVALIDO', 'No se encontro el turno asociado a tu entrada abierta.');
      }
      const urlFotoSalida = guardarFoto(fotoBase64, trabajador.ID_TRABAJADOR, 'salida');
      return registrarSalida(sheet, registroAbierto, turnoDelRegistro, horaActual, fechaHoy, urlFotoSalida);
    }

    const turnosActivos = obtenerTurnosActivos();
    if (turnosActivos.length === 0) {
      return buildError('SIN_TURNOS', 'No hay turnos activos configurados. Contacte al administrador.');
    }

    const turnosCompletadosHoy = obtenerTurnosCompletadosHoy(sheet, trabajador.ID_TRABAJADOR, fechaHoy);
    const turnoElegido = elegirTurnoParaEntrada(turnosActivos, turnosCompletadosHoy, horaActual);
    if (!turnoElegido) {
      return buildError('ASISTENCIA_COMPLETA', 'Ya completaste todos tus turnos de hoy.');
    }

    const urlFotoEntrada = guardarFoto(fotoBase64, trabajador.ID_TRABAJADOR, 'entrada');
    return registrarEntrada(sheet, trabajador, turnoElegido, horaActual, fechaHoy, urlFotoEntrada);
  } finally {
    lock.releaseLock();
  }
}

function registrarEntrada(sheet, trabajador, turno, horaActual, fechaHoy, urlFotoEntrada) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  let observaciones = '';
  const toleranciaMin = Number(turno.TOLERANCIA_MINUTOS) || 0;
  const limiteEntradaSegundos = horaASegundos(normalizarHora(turno.HORA_INICIO)) + (toleranciaMin * 60);
  if (horaASegundos(horaActual) > limiteEntradaSegundos) {
    observaciones = 'TARDANZA';
  }

  const nuevaFila = headers.map(function (col) {
    switch (col) {
      case 'ID_REGISTRO': return generarIdRegistro('REG');
      case 'FECHA': return fechaHoy;
      case 'ID_TRABAJADOR': return String(trabajador.ID_TRABAJADOR);
      case 'NOMBRE_TRABAJADOR': return trabajador.NOMBRE_COMPLETO;
      case 'ID_TURNO': return String(turno.ID_TURNO);
      case 'HORA_ENTRADA': return horaActual;
      case 'HORA_SALIDA': return '';
      case 'HORAS_TRABAJADAS': return '';
      case 'ESTADO_REGISTRO': return ESTADOS.ABIERTO;
      case 'OBSERVACIONES': return observaciones;
      case 'FOTO_ENTRADA_URL': return urlFotoEntrada || '';
      case 'FOTO_SALIDA_URL': return '';
      default: return '';
    }
  });

  // Se fuerza formato de texto en las columnas que Sheets podria intentar
  // convertir a fecha/hora/numero por si solo (ej. "001" -> 1, "15/09/2026" -> fecha),
  // para no depender de que la columna haya sido formateada manualmente.
  const nuevaFilaNumero = sheet.getLastRow() + 1;
  const columnasTexto = ['FECHA', 'ID_TRABAJADOR', 'ID_TURNO', 'HORA_ENTRADA', 'HORA_SALIDA'];
  headers.forEach(function (col, idx) {
    if (columnasTexto.indexOf(col) !== -1) {
      sheet.getRange(nuevaFilaNumero, idx + 1).setNumberFormat('@');
    }
  });
  sheet.getRange(nuevaFilaNumero, 1, 1, headers.length).setValues([nuevaFila]);

  return buildSuccess({
    tipo: 'ENTRADA',
    nombre: trabajador.NOMBRE_COMPLETO,
    fecha: fechaHoy,
    hora: horaActual,
    turno: turno.NOMBRE_TURNO,
    mensaje: 'Entrada registrada correctamente'
  });
}

function registrarSalida(sheet, registroAbierto, turno, horaActual, fechaHoy, urlFotoSalida) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const fila = registroAbierto._row;

  const horasTrabajadas = calcularHorasTrabajadas(normalizarHora(registroAbierto.HORA_ENTRADA), horaActual);

  let observaciones = registroAbierto.OBSERVACIONES || '';
  const finSegundos = horaASegundos(normalizarHora(turno.HORA_FIN));
  if (horaASegundos(horaActual) < finSegundos) {
    observaciones = observaciones ? observaciones + ' / SALIDA_ANTICIPADA' : 'SALIDA_ANTICIPADA';
  }

  const colHoraSalida = getColumnIndex(headers, 'HORA_SALIDA') + 1;
  const colHorasTrabajadas = getColumnIndex(headers, 'HORAS_TRABAJADAS') + 1;
  const colEstado = getColumnIndex(headers, 'ESTADO_REGISTRO') + 1;
  const colObservaciones = getColumnIndex(headers, 'OBSERVACIONES') + 1;
  const colFotoSalida = getColumnIndex(headers, 'FOTO_SALIDA_URL') + 1;

  sheet.getRange(fila, colHoraSalida).setNumberFormat('@').setValue(horaActual);
  sheet.getRange(fila, colHorasTrabajadas).setValue(horasTrabajadas);
  sheet.getRange(fila, colEstado).setValue(ESTADOS.CERRADO);
  sheet.getRange(fila, colObservaciones).setValue(observaciones);
  sheet.getRange(fila, colFotoSalida).setValue(urlFotoSalida || '');

  return buildSuccess({
    tipo: 'SALIDA',
    nombre: registroAbierto.NOMBRE_TRABAJADOR,
    fecha: fechaHoy,
    hora: horaActual,
    turno: turno.NOMBRE_TURNO,
    horasTrabajadas: horasTrabajadas,
    mensaje: 'Salida registrada correctamente'
  });
}

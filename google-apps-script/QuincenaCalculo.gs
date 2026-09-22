/**
 * Calculo de horas normales y horas extra por quincena, directamente
 * desde los registros de ASISTENCIAS (no se escribe nada a mano).
 *
 * Reglas de horas extra (ajustables abajo si cambian):
 * - Solo cuentan si ese dia el trabajador completo TODOS los turnos
 *   activos (ej. A y B). Si solo trabajo uno, ese dia no genera extra.
 * - Se cuenta como extra cualquier tiempo despues de HORA_INICIO_EXTRA
 *   (20:00 por defecto), tomando la hora de salida mas tardia del dia.
 * - Si el trabajador llego tarde a su primer turno del dia (el de
 *   HORA_INICIO mas temprana), esos minutos de tardanza se restan de
 *   las horas extra de ese mismo dia.
 * - El pago de las horas extra usa la misma TARIFA_HORA del trabajador
 *   (no se aplica ningun recargo). Cambiar RECARGO_HORA_EXTRA si se
 *   quiere pagar distinto (ej. 1.5 para tiempo y medio).
 */

const HORA_INICIO_EXTRA = '20:00:00';
const RECARGO_HORA_EXTRA = 1;

function calcularQuincena(fechaInicio, fechaFin) {
  const turnosActivos = obtenerTurnosActivos();
  const totalTurnosActivos = turnosActivos.length;

  const trabajadores = sheetToObjects(getSheet(SHEET_NAMES.PERSONAL))
    .filter(function (t) { return t.ESTADO === ESTADOS.ACTIVO; });

  const inicioComparable = fechaAComparable(fechaInicio);
  const finComparable = fechaAComparable(fechaFin);

  const registrosEnRango = sheetToObjects(getSheet(SHEET_NAMES.ASISTENCIAS)).filter(function (r) {
    if (r.ESTADO_REGISTRO !== ESTADOS.CERRADO) return false;
    const fc = fechaAComparable(normalizarFecha(r.FECHA));
    return fc >= inicioComparable && fc <= finComparable;
  });

  const filas = [];

  trabajadores.forEach(function (trabajador) {
    const idTrabajador = String(trabajador.ID_TRABAJADOR).trim();
    const registrosTrabajador = registrosEnRango.filter(function (r) {
      return String(r.ID_TRABAJADOR).trim() === idTrabajador;
    });

    const porFecha = {};
    registrosTrabajador.forEach(function (r) {
      const fecha = normalizarFecha(r.FECHA);
      if (!porFecha[fecha]) porFecha[fecha] = [];
      porFecha[fecha].push(r);
    });

    let totalHorasNormales = 0;
    let totalHorasExtra = 0;
    let diasTrabajados = 0;

    Object.keys(porFecha).sort().forEach(function (fecha) {
      const registrosDia = porFecha[fecha];
      diasTrabajados++;

      const turnosDelDia = registrosDia.map(function (r) { return String(r.ID_TURNO).trim(); });
      const horasDelDiaTotal = registrosDia.reduce(function (suma, r) {
        return suma + (Number(r.HORAS_TRABAJADAS) || 0);
      }, 0);

      const completoTodosLosTurnos = totalTurnosActivos > 0 && turnosDelDia.length >= totalTurnosActivos;
      let horasExtraDelDia = 0;

      if (completoTodosLosTurnos) {
        let horaSalidaFinalSeg = 0;
        registrosDia.forEach(function (r) {
          if (r.HORA_SALIDA) {
            const seg = horaASegundos(normalizarHora(r.HORA_SALIDA));
            if (seg > horaSalidaFinalSeg) horaSalidaFinalSeg = seg;
          }
        });

        const segundosExtra = Math.max(0, horaSalidaFinalSeg - horaASegundos(HORA_INICIO_EXTRA));
        const horasExtraBrutas = segundosExtra / 3600;

        const registroPrimerTurno = obtenerPrimerTurnoDelDia(registrosDia);
        let minutosTarde = 0;
        if (registroPrimerTurno && String(registroPrimerTurno.OBSERVACIONES || '').indexOf('TARDANZA') !== -1) {
          const turnoInfo = buscarTurnoPorId(registroPrimerTurno.ID_TURNO);
          if (turnoInfo) {
            const toleranciaSeg = (Number(turnoInfo.TOLERANCIA_MINUTOS) || 0) * 60;
            const limiteSeg = horaASegundos(normalizarHora(turnoInfo.HORA_INICIO)) + toleranciaSeg;
            const entradaSeg = horaASegundos(normalizarHora(registroPrimerTurno.HORA_ENTRADA));
            minutosTarde = Math.max(0, (entradaSeg - limiteSeg) / 60);
          }
        }

        horasExtraDelDia = Math.max(0, horasExtraBrutas - (minutosTarde / 60));
      }

      const horasNormalesDelDia = Math.max(0, horasDelDiaTotal - horasExtraDelDia);

      totalHorasNormales += horasNormalesDelDia;
      totalHorasExtra += horasExtraDelDia;

      filas.push({
        esResumen: false,
        fecha: fecha,
        idTrabajador: idTrabajador,
        nombre: trabajador.NOMBRE_COMPLETO,
        turnosTrabajados: turnosDelDia.length,
        horasNormales: redondear(horasNormalesDelDia),
        horasExtra: redondear(horasExtraDelDia)
      });
    });

    const tarifaHora = Number(trabajador.TARIFA_HORA) || 0;
    const pagoNormal = redondear(totalHorasNormales * tarifaHora);
    const pagoExtra = redondear(totalHorasExtra * tarifaHora * RECARGO_HORA_EXTRA);

    filas.push({
      esResumen: true,
      idTrabajador: idTrabajador,
      nombre: trabajador.NOMBRE_COMPLETO,
      diasTrabajados: diasTrabajados,
      totalHorasNormales: redondear(totalHorasNormales),
      totalHorasExtra: redondear(totalHorasExtra),
      tarifaHora: tarifaHora,
      pagoNormal: pagoNormal,
      pagoExtra: pagoExtra,
      totalPago: redondear(pagoNormal + pagoExtra)
    });
  });

  return filas;
}

/**
 * De los registros de un dia, devuelve el que corresponde al turno con
 * HORA_INICIO oficial mas temprana (el "primer turno" del dia).
 */
function obtenerPrimerTurnoDelDia(registrosDia) {
  let elegido = null;
  let menorInicioSeg = null;

  registrosDia.forEach(function (r) {
    const turnoInfo = buscarTurnoPorId(r.ID_TURNO);
    if (!turnoInfo) return;
    const inicioSeg = horaASegundos(normalizarHora(turnoInfo.HORA_INICIO));
    if (menorInicioSeg === null || inicioSeg < menorInicioSeg) {
      menorInicioSeg = inicioSeg;
      elegido = r;
    }
  });

  return elegido;
}

function redondear(numero) {
  return Math.round(numero * 100) / 100;
}

function obtenerOCrearHojaQuincena() {
  const spreadsheet = getSpreadsheet();
  let sheet = spreadsheet.getSheetByName('QUINCENA');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('QUINCENA');
  }
  return sheet;
}

/**
 * Calcula la quincena y escribe el resultado en la hoja QUINCENA
 * (la crea si no existe, y borra lo que tenia antes de escribir).
 */
function generarReporteQuincena(fechaInicio, fechaFin) {
  const filas = calcularQuincena(fechaInicio, fechaFin);
  const sheet = obtenerOCrearHojaQuincena();
  sheet.clearContents();

  const encabezados = ['FECHA', 'ID_TRABAJADOR', 'NOMBRE', 'TURNOS_TRABAJADOS', 'HORAS_NORMALES', 'HORAS_EXTRA'];
  sheet.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold');

  const filasDetalle = filas.filter(function (f) { return !f.esResumen; });
  if (filasDetalle.length > 0) {
    const datos = filasDetalle.map(function (f) {
      return [f.fecha, f.idTrabajador, f.nombre, f.turnosTrabajados, f.horasNormales, f.horasExtra];
    });
    sheet.getRange(2, 1, datos.length, encabezados.length).setValues(datos);
  }

  let filaActual = filasDetalle.length + 4;
  sheet.getRange(filaActual, 1).setValue('RESUMEN QUINCENA ' + fechaInicio + ' - ' + fechaFin).setFontWeight('bold');
  filaActual += 1;

  const encabezadosResumen = ['ID_TRABAJADOR', 'NOMBRE', 'DIAS_TRABAJADOS', 'HORAS_NORMALES', 'HORAS_EXTRA', 'TARIFA_HORA', 'PAGO_NORMAL', 'PAGO_EXTRA', 'TOTAL_PAGO'];
  sheet.getRange(filaActual, 1, 1, encabezadosResumen.length).setValues([encabezadosResumen]).setFontWeight('bold');
  filaActual += 1;

  const filasResumen = filas.filter(function (f) { return f.esResumen; });
  if (filasResumen.length > 0) {
    const datosResumen = filasResumen.map(function (f) {
      return [f.idTrabajador, f.nombre, f.diasTrabajados, f.totalHorasNormales, f.totalHorasExtra, f.tarifaHora, f.pagoNormal, f.pagoExtra, f.totalPago];
    });
    sheet.getRange(filaActual, 1, datosResumen.length, encabezadosResumen.length).setValues(datosResumen);
  }

  return { filasDetalle: filasDetalle.length, filasResumen: filasResumen.length };
}

/**
 * Agrega el menu "Asistencia" en la barra de Google Sheets al abrir el
 * archivo, para poder calcular la quincena sin entrar al editor de
 * Apps Script.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 Asistencia')
    .addItem('Calcular quincena...', 'menuCalcularQuincena')
    .addToUi();
}

function menuCalcularQuincena() {
  const ui = SpreadsheetApp.getUi();

  const respuestaInicio = ui.prompt('Calcular quincena', 'Fecha de inicio (dd/MM/yyyy):', ui.ButtonSet.OK_CANCEL);
  if (respuestaInicio.getSelectedButton() !== ui.Button.OK) return;
  const fechaInicio = respuestaInicio.getResponseText().trim();

  const respuestaFin = ui.prompt('Calcular quincena', 'Fecha de fin (dd/MM/yyyy):', ui.ButtonSet.OK_CANCEL);
  if (respuestaFin.getSelectedButton() !== ui.Button.OK) return;
  const fechaFin = respuestaFin.getResponseText().trim();

  const resultado = generarReporteQuincena(fechaInicio, fechaFin);
  ui.alert('Listo. Se generaron ' + resultado.filasDetalle + ' filas de detalle y ' + resultado.filasResumen + ' trabajadores en la hoja QUINCENA.');
}

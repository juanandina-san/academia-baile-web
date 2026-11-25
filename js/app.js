/* ═══════════════════════════════════════════════════════════════
   Academia de Baile — Lógica SPA
   Conserva rutas, IDs y flujo del frontend legacy.
   ═══════════════════════════════════════════════════════════════ */

const API_ORIGIN = (window.ACADEMIA_API_ORIGIN || '').replace(/\/$/, ''),
  $ = s => document.querySelector(s),
  esc = t =>
    String(t ?? '').replace(
      /[&<>"']/g,
      c =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[c]
    );

let token = localStorage.token,
  user = (() => {
    try {
      return JSON.parse(localStorage.user || 'null');
    } catch {
      return null;
    }
  })(),
  charts = [],
  clasesCache = [],
  pendientes = 0,
  busquedaTimer;

/* ─── Utilidades de presentación ─────────────────────────────── */
const icono = (n, cls = '') =>
  `<i class="ph ph-${n}${cls ? ' ' + cls : ''}" aria-hidden="true"></i>`,
  ini = (n = '', a = '') =>
    ((n.trim()[0] || '') + (a.trim()[0] || '')).toUpperCase() || 'A',
  hoy = () => {
    const t = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
    return t.charAt(0).toUpperCase() + t.slice(1);
  },
  money = n => '$' + Number(n || 0).toLocaleString('es-AR'),
  moneyCorto = n =>
    '$' +
    new Intl.NumberFormat('es-AR', {
      notation: 'compact',
      maximumFractionDigits: 1
    })
      .format(Number(n || 0))
      .replace(/\s/g, ''),
  tag = e => `<span class="tag ${esc(e)}">${esc(String(e).replace('_', ' '))}</span>`;

const vacio = (ic, titulo, texto = '') =>
  `<div class="empty">${icono(ic)}<b>${esc(titulo)}</b>${
    texto ? `<span>${esc(texto)}</span>` : ''
  }</div>`;

const skeleton = (filas = 5) => {
  const anchos = [64, 48, 72, 56, 66, 44];
  return `<div class="skeleton" aria-hidden="true">${Array.from(
    { length: filas },
    (_, i) =>
      `<div class="sk-row"><span class="sk-dot"></span><span class="sk-line" style="width:${
        anchos[i % anchos.length]
      }%"></span><span class="sk-line short"></span></div>`
  ).join('')}</div>`;
};

/* ─── Toasts ─────────────────────────────────────────────────── */
const ICONO_TOAST = {
  info: 'info',
  success: 'check-circle',
  error: 'warning-circle'
};

function toast(msg, tipo = 'info') {
  const caja = $('#toasts');
  if (!caja) return;
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icono(ICONO_TOAST[tipo] || 'info')}<p>${esc(
    msg
  )}</p><button type="button" class="toast-x" aria-label="Cerrar notificación">${icono(
    'x'
  )}</button>`;
  let salida;
  const cerrar = () => {
    clearTimeout(salida);
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 180);
  };
  el.querySelector('.toast-x').onclick = cerrar;
  caja.append(el);
  salida = setTimeout(cerrar, 4500);
}

const alerta = e => toast(e?.message || 'Ocurrió un error inesperado', 'error');

/* ─── API ────────────────────────────────────────────────────── */
const api = async (url, method = 'GET', body) => {
  pendientes++;
  document.body.classList.add('is-loading');
  try {
    const r = await fetch(API_ORIGIN + '/api/' + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: body && JSON.stringify(body)
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && url !== 'auth/login') {
      logout();
      throw new Error('Sesión vencida');
    }
    if (!r.ok) throw new Error(d.error || 'Error');
    return d;
  } finally {
    pendientes--;
    if (pendientes <= 0) {
      pendientes = 0;
      document.body.classList.remove('is-loading');
    }
  }
};

function logout() {
  localStorage.clear();
  location.reload();
}

/* ─── Confirmaciones ─────────────────────────────────────────── */
const confirmar = ({ titulo, cuerpo, ok = 'Confirmar', peligro = true }) =>
  new Promise(resolve => {
    const dlgConfirm = $('#confirmDlg'),
      btn = $('#confirmOk');
    $('#confirmTitle').textContent = titulo;
    $('#confirmBody').textContent = cuerpo || '';
    btn.textContent = ok;
    btn.className = peligro ? 'danger' : '';
    dlgConfirm.returnValue = '';
    const listo = () => {
      dlgConfirm.removeEventListener('close', listo);
      resolve(dlgConfirm.returnValue === 'ok');
    };
    dlgConfirm.addEventListener('close', listo);
    dlgConfirm.showModal();
  });

window.cerrarDlg = () => $('#dlg').close();

/* ─── Formularios en diálogo ─────────────────────────────────── */
const AL = [
  ['nombre', 'Nombre'],
  ['apellido', 'Apellido'],
  ['dni', 'DNI'],
  ['telefono', 'Teléfono', 'tel'],
  ['email', 'Email', 'email']
];

const PROF = [
  ['nombre', 'Nombre'],
  ['apellido', 'Apellido'],
  ['telefono', 'Teléfono', 'tel'],
  ['email', 'Email', 'email']
];

const DIAS = [
  ['1', 'Lunes'],
  ['2', 'Martes'],
  ['3', 'Miércoles'],
  ['4', 'Jueves'],
  ['5', 'Viernes'],
  ['6', 'Sábado'],
  ['7', 'Domingo']
];

function dialogo(titulo, campos, valores, guardar) {
  $('#dlgForm').innerHTML =
    `<h3 id="dlgTitle">${esc(titulo)}</h3><div class="form-grid">` +
    campos
      .map(([n, l, t = 'text', ops]) => {
        const valor = valores[n] ?? '';
        return `<label>${esc(l)}${
          ops
            ? `<select name="${n}">${ops
                .map(
                  o =>
                    `<option value="${esc(o[0])}" ${
                      o[0] == valor ? 'selected' : ''
                    }>${esc(o[1])}</option>`
                )
                .join('')}</select>`
            : `<input name="${n}" type="${t}" value="${esc(
                valor
              )}" ${
                t === 'tel' || t === 'email' ? '' : 'required'
              }>`
        }</label>`;
      })
      .join('') +
    `</div><div class="dlg-actions"><button type="button" class="sec" onclick="cerrarDlg()">Cancelar</button><button type="submit">Guardar</button></div>`;

  $('#dlgForm').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]'),
      texto = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
      await guardar(Object.fromEntries(new FormData(e.target)));
      $('#dlg').close();
      toast('Cambios guardados', 'success');
      show(cur);
    } catch (x) {
      alerta(x);
      btn.disabled = false;
      btn.textContent = texto;
    }
  };

  const dlg = $('#dlg');
  dlg.showModal();
}

/* ─── Vistas ─────────────────────────────────────────────────── */
const vistas = {
  async dashboard() {
    const d = await api('dashboard'),
      a = d.alumnos,
      DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
      dow = ((new Date().getDay() + 6) % 7) + 1;

    const cuando = dia => {
      const diff = (Number(dia) - dow + 7) % 7;
      if (diff === 0) return 'Hoy';
      if (diff === 1) return 'Mañana';
      return `En ${diff} días`;
    };

    const kpis = [
      ['users-three', 'Alumnos', a.total, 'wine', 'En el padrón'],
      ['user-check', 'Activos', a.activos, 'sage', 'Al día con la cuota'],
      ['hourglass-medium', 'Pago pendiente', a.pendientes, 'amber', 'Con deuda'],
      ['user-minus', 'Dados de baja', a.bajas, 'slate', 'Historial conservado'],
      ['currency-circle-dollar', 'Ingresos del mes', money(d.ingresosMes), 'wine', 'Cobrado este mes', true],
      ['receipt', 'Cuotas pendientes', d.pagosPendientes.n, 'amber', money(d.pagosPendientes.monto)],
      ['calendar-dots', 'Clases', d.clases, 'gold', 'Activas']
    ];

    $('#vista').innerHTML = `
      <header class="page-head">
        <div><p class="eyebrow">Resumen del estudio</p><h1>Panel</h1></div>
      </header>

      <div class="grid">${kpis
        .map(
          ([ic, label, valor, tono, nota, ancho]) => `
        <div class="card kpi${ancho ? ' wide' : ''}" data-tone="${tono}">
          <span class="kpi-icon">${icono(ic)}</span>
          <p class="kpi-label">${esc(label)}</p>
          <b>${valor}</b>
          <span class="kpi-note">${esc(nota)}</span>
        </div>`
        )
        .join('')}</div>

      <div class="charts">
        <section class="card">
          <div class="card-head"><h3>Ingresos por mes</h3><span>Últimos 6 meses</span></div>
          <div class="chart-box"><canvas id="c1" aria-label="Gráfico de ingresos por mes" role="img"></canvas></div>
        </section>
        <section class="card">
          <div class="card-head"><h3>Alumnos por clase</h3><span>Distribución</span></div>
          <div class="chart-box donut"><canvas id="c2" aria-label="Gráfico de alumnos por clase" role="img"></canvas></div>
        </section>
      </div>

      <section class="card">
        <div class="card-head"><h3>Próximas clases</h3><span>Agenda</span></div>
        ${
          d.proximas.length
            ? `<ul class="agenda">${d.proximas
                .map(
                  p => `<li class="agenda-item">
            <span class="day-badge"><b>${DIAS_CORTOS[p.dia_semana]}</b><span>${esc(p.hora)}</span></span>
            <span class="agenda-name">${esc(p.nombre)}</span>
            <span class="agenda-time">${cuando(p.dia_semana)}</span>
          </li>`
                )
                .join('')}</ul>`
            : vacio('calendar-x', 'Sin clases cargadas', 'Creá la primera clase para ver la agenda acá.')
        }
      </section>`;

    charts.forEach(c => c && c.destroy());
    charts = [graficoIngresos(d), graficoClases(d)];
  },

  async alumnos() {
    $('#vista').innerHTML = `
      <header class="page-head">
        <div><p class="eyebrow">Padrón</p><h1>Alumnos</h1></div>
      </header>
      <div class="bar">
        <span class="search">${icono('magnifying-glass')}<input id="q" type="search" placeholder="Buscar por nombre, apellido o DNI" aria-label="Buscar alumnos"></span>
        <select id="est" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="pendiente_pago">Pendientes</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <button id="nuevo">${icono('plus')}Nuevo alumno</button>
      </div>
      <div class="tbl" id="lista">${skeleton()}</div>`;

    const cargar = async () => {
      const l = await api(
        `alumnos?q=${encodeURIComponent($('#q').value)}&estado=${$('#est').value}`
      );
      $('#lista').innerHTML = l.length
        ? `<table><thead><tr><th scope="col">Alumno</th><th scope="col">Estado</th><th scope="col">Contacto</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>${l
            .map(
              a => `<tr>
          <td><div class="who"><span class="avatar">${ini(
            a.nombre,
            a.apellido
          )}</span><div><b>${esc(a.apellido)}, ${esc(
                a.nombre
              )}</b><small>DNI ${esc(a.dni)}</small></div></div></td>
          <td>${tag(a.estado)}</td>
          <td>${esc(a.telefono || '—')}${
                a.email ? `<br><small class="muted">${esc(a.email)}</small>` : ''
              }</td>
          <td>
            <button class="mini icon-only" title="Ver ficha" aria-label="Ver ficha de ${esc(
              a.nombre
            )}" onclick="ficha(${a.id})">${icono('eye')}</button>
            <button class="mini sec icon-only" title="Editar" aria-label="Editar a ${esc(
              a.nombre
            )}" onclick="editar(${a.id})">${icono('pencil-simple')}</button>
            ${
              user.rol === 'admin'
                ? `<button class="mini sec icon-only" title="Dar de baja" aria-label="Dar de baja a ${esc(
                    a.nombre
                  )}" onclick="baja(${a.id})">${icono('user-minus')}</button>
            <button class="mini sec icon-only danger-ghost" title="Eliminar definitivamente" aria-label="Eliminar a ${esc(
              a.nombre
            )}" onclick="eliminar(${a.id})">${icono('trash')}</button>`
                : ''
            }
          </td></tr>`
            )
            .join('')}</tbody></table>`
        : vacio(
            'users-three',
            'Sin alumnos para mostrar',
            'Probá con otro filtro o cargá el primero con “Nuevo alumno”.'
          );
    };

    $('#q').oninput = () => {
      clearTimeout(busquedaTimer);
      busquedaTimer = setTimeout(cargar, 220);
    };
    $('#est').onchange = cargar;
    await cargar();
    $('#nuevo').onclick = () =>
      dialogo('Nuevo alumno', AL, {}, d => api('alumnos', 'POST', d));
  },

  async clases() {
    const [cl, pr] = await Promise.all([api('clases'), api('clases/profesores')]);
    clasesCache = cl;

    $('#vista').innerHTML = `
      <header class="page-head">
        <div><p class="eyebrow">Oferta académica</p><h1>Clases</h1></div>
        <p class="page-date">${cl.length} clases activas</p>
      </header>
      ${
        user.rol === 'admin'
          ? `<div class="bar"><div class="bar-actions"><button id="nc">${icono('plus')}Nueva clase</button><button id="np" class="sec">${icono(
              'user-plus'
            )}Nuevo profesor</button></div></div>`
          : ''
      }
      <div class="tbl">${
        cl.length
          ? `<table><thead><tr><th scope="col">Clase</th><th scope="col">Profesor</th><th scope="col">Horarios</th><th scope="col" class="num">Precio</th><th scope="col">Cupo</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>
      ${cl
        .map(c => {
          const pct = Math.min(
            100,
            Math.round((c.inscriptos / Math.max(1, c.cupo_maximo)) * 100)
          );
          return `<tr>
            <td><b>${esc(c.nombre)}</b></td>
            <td>${esc(c.profesor)}</td>
            <td>${esc(c.horarios || '—')}</td>
            <td class="num money">${money(c.precio)}</td>
            <td>
              <span class="cupo"><b>${c.inscriptos}</b>/${c.cupo_maximo}</span>
              <span class="cupo-bar"><span style="width:${pct}%"></span></span>
            </td>
            <td>
              <button class="mini" title="Ver alumnos inscriptos" onclick="inscriptos(${
                c.id
              })">${icono('users')}Alumnos</button>
              ${
                user.rol === 'admin'
                  ? `<button class="mini sec icon-only" title="Editar clase" aria-label="Editar ${esc(
                      c.nombre
                    )}" onclick="editarClase(${c.id})">${icono('pencil-simple')}</button>
              <button class="mini sec icon-only danger-ghost" title="Eliminar clase" aria-label="Eliminar ${esc(
                c.nombre
              )}" onclick="borrarClase(${c.id})">${icono('trash')}</button>`
                  : ''
              }
              <button class="mini sec icon-only" title="Inscribir alumno" aria-label="Inscribir alumno en ${esc(
                c.nombre
              )}" onclick="inscribir(${c.id})">${icono('user-plus')}</button>
            </td></tr>`;
        })
        .join('')}</tbody></table>`
          : vacio(
              'calendar-x',
              'Todavía no hay clases',
              'Creá la primera clase con su profesor, horario y cupo.'
            )
      }</div>`;

    if (user.rol !== 'admin') return;
    $('#np').onclick = profesorNuevo;
    $('#nc').onclick = () =>
      dialogo(
        'Nueva clase',
        [
          ['nombre', 'Nombre'],
          [
            'profesor_id',
            'Profesor',
            'text',
            pr.map(p => [p.id, `${p.nombre} ${p.apellido}`])
          ],
          ['precio', 'Precio mensual', 'number'],
          ['cupo_maximo', 'Cupo', 'number'],
          ['dia', 'Día', 'text', DIAS],
          ['inicio', 'Inicio', 'time'],
          ['fin', 'Fin', 'time']
        ],
        {},
        d =>
          api('clases', 'POST', {
            ...d,
            horarios: [{ dia: d.dia, inicio: d.inicio, fin: d.fin }]
          })
      );
  },

  async profesores() {
    $('#vista').innerHTML = `
      <header class="page-head">
        <div><p class="eyebrow">Equipo docente</p><h1>Profesores</h1></div>
      </header>
      <div class="bar">
        <span class="search">${icono(
          'magnifying-glass'
        )}<input id="qprof" type="search" placeholder="Buscar por nombre, apellido o email" aria-label="Buscar profesores"></span>
        <select id="estprof" aria-label="Filtrar profesores por estado">
          <option value="activos">Activos</option>
          <option value="inactivos">Dados de baja</option>
          <option value="todos">Todos</option>
        </select>
        ${
          user.rol === 'admin'
            ? `<button id="nuevoProf">${icono('plus')}Nuevo profesor</button>`
            : ''
        }
      </div>
      <div class="tbl" id="listaProf">${skeleton()}</div>`;

    const cargar = async () => {
      const l = await api(
        `profesores?q=${encodeURIComponent($('#qprof').value)}&estado=${
          $('#estprof').value
        }`
      );
      $('#listaProf').innerHTML = l.length
        ? `<table><thead><tr><th scope="col">Profesor</th><th scope="col">Contacto</th><th scope="col" class="num">Clases</th><th scope="col" class="num">Alumnos</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>${l
            .map(
              p => `<tr>
          <td><div class="who"><span class="avatar">${ini(
            p.nombre,
            p.apellido
          )}</span><div><b>${esc(p.apellido)}, ${esc(
                p.nombre
              )}</b><small>${
                p.clases
                  ? `${p.clases} clase${p.clases === 1 ? '' : 's'} a cargo`
                  : 'Sin clases asignadas'
              }</small></div></div></td>
          <td>${esc(p.telefono || '—')}${
                p.email ? `<br><small class="muted">${esc(p.email)}</small>` : ''
              }</td>
          <td class="num">${p.clases}</td>
          <td class="num">${p.alumnos}</td>
          <td>${tag(p.activo ? 'activo' : 'inactivo')}</td>
          <td>
            <button class="mini icon-only" title="Ver ficha" aria-label="Ver ficha de ${esc(
              p.nombre
            )}" onclick="fichaProfesor(${p.id})">${icono('eye')}</button>
            ${
              user.rol === 'admin'
                ? `<button class="mini sec icon-only" title="Editar" aria-label="Editar a ${esc(
                    p.nombre
                  )}" onclick="editarProfesor(${p.id})">${icono(
                    'pencil-simple'
                  )}</button>
            ${
              p.activo
                ? `<button class="mini sec icon-only" title="Dar de baja" aria-label="Dar de baja a ${esc(
                    p.nombre
                  )}" onclick="bajaProfesor(${p.id})">${icono('user-minus')}</button>`
                : `<button class="mini sec icon-only" title="Reactivar" aria-label="Reactivar a ${esc(
                    p.nombre
                  )}" onclick="reactivarProfesor(${p.id})">${icono(
                    'user-check'
                  )}</button>`
            }
            <button class="mini sec icon-only danger-ghost" title="Eliminar definitivamente" aria-label="Eliminar a ${esc(
              p.nombre
            )}" onclick="eliminarProfesor(${p.id})">${icono('trash')}</button>`
                : ''
            }
          </td></tr>`
            )
            .join('')}</tbody></table>`
        : vacio(
            'chalkboard-teacher',
            'Sin profesores para mostrar',
            'Probá con otro filtro o sumá el primero con “Nuevo profesor”.'
          );
    };

    $('#qprof').oninput = () => {
      clearTimeout(busquedaTimer);
      busquedaTimer = setTimeout(cargar, 220);
    };
    $('#estprof').onchange = cargar;
    await cargar();
    if (user.rol === 'admin') $('#nuevoProf').onclick = profesorNuevo;
  },

  async pagos() {
    $('#vista').innerHTML = `
      <header class="page-head">
        <div><p class="eyebrow">Cobranzas</p><h1>Pagos</h1></div>
      </header>
      <div class="bar">
        <select id="pe" aria-label="Filtrar pagos por estado">
          <option value="pendiente">Pendientes</option>
          <option value="pagado">Realizados</option>
          <option value="">Todos</option>
        </select>
      </div>
      <div class="tbl" id="lp">${skeleton()}</div>
      <h3 class="section-title">Ingresos mensuales</h3>
      <div class="tbl" id="rep">${skeleton(4)}</div>`;

    const cargar = async () => {
      const l = await api('pagos?estado=' + $('#pe').value);
      $('#lp').innerHTML = l.length
        ? `<table><thead><tr><th scope="col">Alumno</th><th scope="col">Clase</th><th scope="col">Período</th><th scope="col" class="num">Importe</th><th scope="col">Vence</th><th scope="col">Pagó</th><th scope="col">Método</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>${l
            .map(
              p => `<tr>
          <td><b>${esc(p.alumno)}</b></td>
          <td>${esc(p.clase)}</td>
          <td>${p.periodo.slice(0, 7)}</td>
          <td class="num money">${money(p.importe)}</td>
          <td>${p.fecha_vencimiento}</td>
          <td>${p.fecha_pago || '—'}</td>
          <td>${esc(p.metodo_pago || '—')}</td>
          <td>${tag(p.estado)}</td>
          <td>${
            p.estado === 'pendiente'
              ? `<button class="mini" onclick="pagar(${p.id},${
                  p.importe
                })">${icono('check-circle')}Registrar pago</button>`
              : ''
          }</td></tr>`
            )
            .join('')}</tbody></table>`
        : vacio(
            'receipt',
            'No hay cuotas en este estado',
            'Cambiá el filtro para ver otras cuotas o generá inscripciones.'
          );
    };

    $('#pe').onchange = cargar;
    await cargar();

    const rep = await api('pagos/reporte');
    $('#rep').innerHTML = rep.length
      ? `<table><thead><tr><th scope="col">Mes</th><th scope="col" class="num">Total</th><th scope="col" class="num">Pagos</th></tr></thead><tbody>${rep
          .map(
            r =>
              `<tr><td>${r.mes}</td><td class="num money">${money(
                r.total
              )}</td><td class="num">${r.cantidad}</td></tr>`
          )
          .join('')}</tbody></table>`
      : vacio('chart-line-up', 'Sin ingresos registrados', '');
  },

  ia() {
    const sugerencias = [
      '¿Cuántos alumnos están inscriptos?',
      '¿Quiénes no pagaron este mes?',
      '¿Cuánto ingresó este mes?',
      '¿Qué clases tienen más alumnos?',
      '¿Qué alumnos están por quedar inactivos?',
      'Analiza el crecimiento y dame recomendaciones'
    ];

    $('#vista').innerHTML = `
      <header class="page-head">
        <div><p class="eyebrow">Inteligencia</p><h1>Asistente IA</h1></div>
        <p class="page-date">Solo lectura sobre datos reales</p>
      </header>
      <section class="card chat-shell">
        <div id="chat" aria-live="polite">
          <div class="msg a">Hola${user?.nombre ? ', ' + esc(user.nombre) : ''}. Consulto los datos reales de la academia. Probá: “¿Quiénes no pagaron este mes?”.</div>
        </div>
        <form class="composer" id="fAsk">
          <input id="pq" placeholder="Escribí tu consulta..." maxlength="500" aria-label="Consulta para el asistente" autocomplete="off">
          <button id="env" type="submit">${icono('paper-plane-tilt')}Enviar</button>
        </form>
        <div class="chips">${sugerencias
          .map(
            s =>
              `<button type="button" class="chip" data-q="${esc(
                s
              )}" onclick="preguntar(this.dataset.q)">${esc(s)}</button>`
          )
          .join('')}</div>
      </section>`;

    $('#fAsk').onsubmit = e => {
      e.preventDefault();
      preguntar($('#pq').value);
    };
  }
};

/* ─── Gráficos ───────────────────────────────────────────────── */
const PALETA = ['#8C1D3F', '#B8892F', '#3F6B5A', '#5E4B8B', '#C4703C', '#8A7B82'];
const sinMovimiento = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;

function baseTooltip() {
  return {
    backgroundColor: '#241A20',
    titleColor: '#F6F1E7',
    bodyColor: '#E4DACB',
    padding: 12,
    cornerRadius: 8,
    titleFont: { family: 'Inter', size: 12, weight: '600' },
    bodyFont: { family: 'Inter', size: 12 },
    displayColors: true,
    boxPadding: 4
  };
}

function graficoIngresos(d) {
  if (!window.Chart) return null;
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = '#6E6067';
  return new Chart($('#c1'), {
    type: 'bar',
    data: {
      labels: d.ingresos.map(i =>
        new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(
          new Date(i.mes + '-02T00:00:00')
        )
      ),
      datasets: [
        {
          label: 'Ingresos',
          data: d.ingresos.map(i => +i.total),
          backgroundColor: '#8C1D3F',
          hoverBackgroundColor: '#A82450',
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 38
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: sinMovimiento() ? false : { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip(),
          callbacks: { label: c => money(c.parsed.y) }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(36,26,32,.07)' },
          border: { display: false },
          ticks: { font: { size: 11 }, callback: v => moneyCorto(v), maxTicksLimit: 5 }
        }
      }
    }
  });
}

function graficoClases(d) {
  if (!window.Chart) return null;
  return new Chart($('#c2'), {
    type: 'doughnut',
    data: {
      labels: d.porClase.map(c => c.nombre),
      datasets: [
        {
          data: d.porClase.map(c => c.alumnos),
          backgroundColor: d.porClase.map((_, i) => PALETA[i % PALETA.length]),
          borderColor: '#FFFDF8',
          borderWidth: 3,
          hoverOffset: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      animation: sinMovimiento() ? false : { duration: 500 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 14,
            font: { size: 11 },
            color: '#5C4E55'
          }
        },
        tooltip: {
          ...baseTooltip(),
          callbacks: {
            label: c => `${c.label}: ${c.parsed} alumnos`
          }
        }
      }
    }
  });
}

/* ─── Acciones globales ──────────────────────────────────────── */
const etiquetaVista = {
  dashboard: 'Panel',
  alumnos: 'Alumnos',
  clases: 'Clases',
  profesores: 'Profesores',
  pagos: 'Pagos',
  ia: 'Asistente IA'
};

let cur = 'dashboard';

async function show(v) {
  cur = v;
  document
    .querySelectorAll('#menu a[data-v]')
    .forEach(a => {
      const activo = a.dataset.v === v;
      a.classList.toggle('on', activo);
      if (activo) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  const crumb = $('#crumb');
  if (crumb) crumb.textContent = etiquetaVista[v] || v;
  cerrarMenu();
  try {
    await vistas[v]();
  } catch (e) {
    $('#vista').innerHTML = `<div class="card">${vacio(
      'warning-circle',
      'No se pudo cargar la vista',
      e.message
    )}</div>`;
  }
}

function entrar() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  const nombre = user?.nombre || 'Cuenta',
    avatar = $('#userAvatar'),
    nombreEl = $('#userName'),
    rolEl = $('#userRole'),
    hoyEl = $('#today');
  if (avatar) avatar.textContent = nombre.trim()[0]?.toUpperCase() || 'A';
  if (nombreEl) nombreEl.textContent = nombre;
  if (rolEl)
    rolEl.textContent = user?.rol === 'admin' ? 'Administración' : 'Staff';
  if (hoyEl) hoyEl.textContent = hoy();
  show('dashboard');
}

/* ─── Menú móvil ─────────────────────────────────────────────── */
function cerrarMenu() {
  const menu = $('#menu'),
    overlay = $('#sidebarOverlay'),
    burger = $('#burger');
  menu?.classList.remove('open');
  overlay?.classList.remove('visible');
  burger?.setAttribute('aria-expanded', 'false');
}

function alternarMenu() {
  const menu = $('#menu'),
    overlay = $('#sidebarOverlay'),
    burger = $('#burger');
  const abierto = menu.classList.toggle('open');
  overlay?.classList.toggle('visible', abierto);
  burger?.setAttribute('aria-expanded', String(abierto));
}

/* ─── Chat ───────────────────────────────────────────────────── */
window.preguntar = async t => {
  if (!t || !t.trim()) return;
  const caja = $('#pq');
  if (caja) caja.value = '';
  const add = (c, x) => {
    const d = document.createElement('div');
    d.className = 'msg ' + c;
    d.textContent = x;
    $('#chat').append(d);
    $('#chat').scrollTop = 1e6;
    return d;
  };
  add('u', t.trim());
  const w = add('a', 'Consultando…');
  w.classList.add('typing');
  try {
    w.textContent = (await api('ia', 'POST', { pregunta: t.trim() })).respuesta;
    w.classList.remove('typing');
  } catch (e) {
    w.textContent = e.message;
    w.classList.remove('typing');
    alerta(e);
  }
};

/* ─── Alumnos ────────────────────────────────────────────────── */
window.editar = async id => {
  const a = await api('alumnos/' + id);
  dialogo(
    'Editar alumno',
    [
      ...AL,
      [
        'estado',
        'Estado',
        'text',
        [
          ['activo', 'Activo'],
          ['pendiente_pago', 'Pendiente de pago'],
          ['inactivo', 'Inactivo']
        ]
      ]
    ],
    a,
    d => api('alumnos/' + id, 'PUT', d)
  );
};

window.baja = async id => {
  const ok = await confirmar({
    titulo: 'Dar de baja al alumno',
    cuerpo: 'Se conserva todo su historial. Podés reactivarlo editando su estado.',
    ok: 'Dar de baja'
  });
  if (!ok) return;
  try {
    await api('alumnos/' + id, 'DELETE');
    toast('Alumno dado de baja', 'success');
    show(cur);
  } catch (e) {
    alerta(e);
  }
};

window.eliminar = async id => {
  const ok = await confirmar({
    titulo: 'Eliminar definitivamente',
    cuerpo: 'Esta acción no se puede deshacer y solo está disponible si el alumno no tiene historial.',
    ok: 'Eliminar'
  });
  if (!ok) return;
  try {
    await api('alumnos/' + id + '/definitivo', 'DELETE');
    toast('Alumno eliminado', 'success');
    show(cur);
  } catch (e) {
    alerta(e);
  }
};

window.ficha = async id => {
  const a = await api('alumnos/' + id);
  $('#dlgForm').innerHTML = `
    <div class="ficha-head">
      <span class="avatar lg">${ini(a.nombre, a.apellido)}</span>
      <div>
        <h3 id="dlgTitle">${esc(a.apellido)}, ${esc(a.nombre)}</h3>
        <p class="muted">DNI ${esc(a.dni)}${a.telefono ? ' · ' + esc(a.telefono) : ''}</p>
      </div>
      ${tag(a.estado)}
    </div>
    <div class="ficha-section">
      <h4>Clases</h4>
      ${
        a.clases.length
          ? a.clases
              .map(
                c =>
                  `<div class="list-row"><span>${esc(c.nombre)}</span>${tag(
                    c.estado
                  )}</div>`
              )
              .join('')
          : `<div class="list-row muted">Sin clases todavía</div>`
      }
    </div>
    <div class="ficha-section">
      <h4>Historial de pagos</h4>
      ${
        a.pagos.length
          ? a.pagos
              .map(
                p =>
                  `<div class="list-row"><span>${p.periodo.slice(
                    0,
                    7
                  )} · ${esc(p.clase)}</span><span class="money">${money(
                    p.importe
                  )}</span>${tag(p.estado)}</div>`
              )
              .join('')
          : `<div class="list-row muted">Sin pagos registrados</div>`
      }
    </div>
    <div class="dlg-actions"><button type="button" class="sec" onclick="cerrarDlg()">Cerrar</button></div>`;
  $('#dlgForm').onsubmit = null;
  $('#dlg').showModal();
};

/* ─── Profesores ─────────────────────────────────────────────── */
window.profesorNuevo = () =>
  dialogo('Nuevo profesor', PROF, {}, d => api('profesores', 'POST', d));

window.editarProfesor = async id => {
  const p = await api('profesores/' + id);
  dialogo(
    'Editar profesor',
    [
      ...PROF,
      [
        'activo',
        'Estado',
        'text',
        [
          ['1', 'Activo'],
          ['0', 'Dado de baja']
        ]
      ]
    ],
    p,
    d => api('profesores/' + id, 'PUT', d)
  );
};

window.fichaProfesor = async id => {
  const p = await api('profesores/' + id);
  $('#dlgForm').innerHTML = `
    <div class="ficha-head">
      <span class="avatar lg">${ini(p.nombre, p.apellido)}</span>
      <div>
        <h3 id="dlgTitle">${esc(p.apellido)}, ${esc(p.nombre)}</h3>
        <p class="muted">${esc(p.email || 'Sin email')}${
          p.telefono ? ' · ' + esc(p.telefono) : ''
        }</p>
      </div>
      ${tag(p.activo ? 'activo' : 'inactivo')}
    </div>
    <div class="ficha-section">
      <h4>Clases a cargo</h4>
      ${
        p.clases.length
          ? p.clases
              .map(
                c =>
                  `<div class="list-row"><span>${esc(c.nombre)}${
                    c.activa ? '' : ' <span class="muted">· dada de baja</span>'
                  }</span><span class="cupo"><b>${c.inscriptos}</b>/${
                    c.cupo_maximo
                  }</span></div>`
              )
              .join('')
          : `<div class="list-row muted">Sin clases asignadas</div>`
      }
    </div>
    <div class="dlg-actions">
      <button type="button" class="sec" onclick="cerrarDlg()">Cerrar</button>
      ${
        user.rol === 'admin'
          ? `<button type="button" onclick="cerrarDlg();editarProfesor(${p.id})">Editar</button>`
          : ''
      }
    </div>`;
  $('#dlgForm').onsubmit = null;
  $('#dlg').showModal();
};

window.bajaProfesor = async id => {
  const ok = await confirmar({
    titulo: 'Dar de baja al profesor',
    cuerpo:
      'Dejará de aparecer al asignar clases. Solo es posible si no tiene clases activas.',
    ok: 'Dar de baja'
  });
  if (!ok) return;
  try {
    await api('profesores/' + id, 'DELETE');
    toast('Profesor dado de baja', 'success');
    show(cur);
  } catch (e) {
    alerta(e);
  }
};

window.reactivarProfesor = async id => {
  try {
    const p = await api('profesores/' + id);
    await api('profesores/' + id, 'PUT', {
      nombre: p.nombre,
      apellido: p.apellido,
      telefono: p.telefono,
      email: p.email,
      activo: 1
    });
    toast('Profesor reactivado', 'success');
    show(cur);
  } catch (e) {
    alerta(e);
  }
};

window.eliminarProfesor = async id => {
  const ok = await confirmar({
    titulo: 'Eliminar definitivamente',
    cuerpo:
      'Esta acción no se puede deshacer y solo está disponible si el profesor nunca tuvo clases.',
    ok: 'Eliminar'
  });
  if (!ok) return;
  try {
    await api('profesores/' + id + '/definitivo', 'DELETE');
    toast('Profesor eliminado', 'success');
    show(cur);
  } catch (e) {
    alerta(e);
  }
};

/* ─── Clases ─────────────────────────────────────────────────── */
window.inscriptos = async id => {
  const l = await api(`clases/${id}/alumnos`);
  const clase = clasesCache.find(x => x.id == id);
  $('#dlgForm').innerHTML = `
    <h3 id="dlgTitle">${esc(clase?.nombre || 'Alumnos inscriptos')}</h3>
    ${
      l.length
        ? l
            .map(
              a => `<div class="list-row">
        <span><b>${esc(a.apellido)}, ${esc(a.nombre)}</b> <span class="muted">· DNI ${esc(
                a.dni
              )}</span></span>
        <span class="list-actions">${tag(a.estado)}<button type="button" class="mini sec" onclick="desinscribir(${
                a.inscripcion_id
              })">${icono('x')}Quitar</button></span>
      </div>`
            )
            .join('')
        : vacio('users', 'Sin alumnos inscriptos', 'Sumá el primero desde “Inscribir”.')
    }
    <div class="dlg-actions"><button type="button" class="sec" onclick="cerrarDlg()">Cerrar</button></div>`;
  $('#dlgForm').onsubmit = null;
  $('#dlg').showModal();
};

window.desinscribir = async id => {
  const ok = await confirmar({
    titulo: 'Quitar alumno de la clase',
    cuerpo: 'La inscripción queda dada de baja y se conserva el historial.',
    ok: 'Quitar'
  });
  if (!ok) return;
  try {
    await api('clases/inscripciones/' + id, 'DELETE');
    $('#dlg').close();
    toast('Alumno quitado de la clase', 'success');
    show(cur);
  } catch (e) {
    alerta(e);
  }
};

window.editarClase = async id => {
  const [cl, pr] = await Promise.all([api('clases'), api('clases/profesores')]);
  const c = cl.find(x => x.id == id),
    h = c.horarios_lista[0] || {};
  dialogo(
    'Editar clase',
    [
      ['nombre', 'Nombre'],
      [
        'profesor_id',
        'Profesor',
        'text',
        pr.map(p => [p.id, `${p.nombre} ${p.apellido}`])
      ],
      ['precio', 'Precio mensual', 'number'],
      ['cupo_maximo', 'Cupo', 'number'],
      ['dia', 'Día', 'text', DIAS],
      ['inicio', 'Inicio', 'time'],
      ['fin', 'Fin', 'time']
    ],
    { ...c, dia: h.dia, inicio: h.inicio, fin: h.fin },
    d => api('clases/' + id, 'PUT', d)
  );
};

window.borrarClase = async id => {
  const ok = await confirmar({
    titulo: 'Eliminar clase',
    cuerpo: 'Dejará de mostrarse en la agenda, pero se conserva su historial.',
    ok: 'Eliminar clase'
  });
  if (!ok) return;
  try {
    await api('clases/' + id, 'DELETE');
    toast('Clase dada de baja', 'success');
    show(cur);
  } catch (e) {
    alerta(e);
  }
};

window.inscribir = async id => {
  const l = (await api('alumnos?estado=')).filter(a => a.estado !== 'inactivo');
  if (!l.length) {
    toast('No hay alumnos disponibles para inscribir', 'info');
    return;
  }
  dialogo(
    'Inscribir alumno',
    [
      [
        'alumno_id',
        'Alumno',
        'text',
        l.map(a => [a.id, `${a.apellido}, ${a.nombre}`])
      ]
    ],
    {},
    d => api(`clases/${id}/inscribir`, 'POST', d)
  );
};

window.pagar = (id, imp) =>
  dialogo(
    'Registrar pago',
    [
      ['importe', 'Importe abonado', 'number'],
      [
        'metodo_pago',
        'Método',
        'text',
        [
          ['efectivo', 'Efectivo'],
          ['transferencia', 'Transferencia'],
          ['tarjeta', 'Tarjeta'],
          ['mercadopago', 'Mercado Pago'],
          ['otro', 'Otro']
        ]
      ]
    ],
    { importe: imp },
    d => api(`pagos/${id}/pagar`, 'POST', { ...d, importe: +d.importe })
  );

/* ─── Arranque ───────────────────────────────────────────────── */
document
  .querySelectorAll('#menu a[data-v]')
  .forEach(a => (a.onclick = () => show(a.dataset.v)));

$('#salir').onclick = logout;
$('#burger').onclick = alternarMenu;
$('#cerrarMenu').onclick = cerrarMenu;
$('#sidebarOverlay').onclick = cerrarMenu;
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarMenu();
});

$('#togglePass').onclick = e => {
  const input = $('#pass'),
    btn = e.currentTarget,
    ver = input.type === 'password';
  input.type = ver ? 'text' : 'password';
  btn.setAttribute('aria-pressed', String(ver));
  btn.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
  btn.innerHTML = icono(ver ? 'eye-slash' : 'eye');
};

$('#fLogin').onsubmit = async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  $('#loginErr').textContent = '';
  btn.disabled = true;
  try {
    const d = await api(
      'auth/login',
      'POST',
      Object.fromEntries(new FormData(e.target))
    );
    token = d.token;
    user = d;
    localStorage.token = token;
    localStorage.user = JSON.stringify(d);
    entrar();
  } catch (x) {
    $('#loginErr').textContent = x.message;
    btn.disabled = false;
  }
};

if (token && user) entrar();

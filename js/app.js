const $ = s => document.querySelector(s),
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
  user = JSON.parse(localStorage.user || 'null'),
  charts = [];
const api = async (url, method = 'GET', body) => {
  const r = await fetch('/api/' + url, {
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
};
const money = n => '$' + Number(n || 0).toLocaleString('es-AR'),
  tag = e => `<span class="tag ${e}">${esc(e.replace('_', ' '))}</span>`;
const alerta = e => alert(e.message);
function logout() {
  localStorage.clear();
  location.reload();
}
function dialogo(titulo, campos, valores, guardar) {
  $('#dlgForm').innerHTML =
    `<h3>${titulo}</h3>` +
    campos
      .map(
        ([n, l, t = 'text', ops]) =>
          `<label>${l}${
            ops
              ? `<select name="${n}">${ops.map(o => `<option value="${o[0]}" ${o[0] == valores[n] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`
              : `<input name="${n}" type="${t}" value="${esc(valores[n])}" ${t === 'tel' || t === 'email' ? '' : 'required'}>`
          }</label>`
      )
      .join('') +
    `<button>Guardar</button><button type="button" class="sec" onclick="dlg.close()">Cancelar</button>`;
  $('#dlgForm').onsubmit = async e => {
    e.preventDefault();
    try {
      await guardar(Object.fromEntries(new FormData(e.target)));
      dlg.close();
      show(cur);
    } catch (x) {
      alerta(x);
    }
  };
  dlg.showModal();
}
const AL = [
  ['nombre', 'Nombre'],
  ['apellido', 'Apellido'],
  ['dni', 'DNI'],
  ['telefono', 'Teléfono', 'tel'],
  ['email', 'Email', 'email']
];
const vistas = {
  async dashboard() {
    const d = await api('dashboard'),
      a = d.alumnos,
      DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    $('#vista').innerHTML = `<h1>Panel</h1><div class="grid">${[
      ['Alumnos', a.total],
      ['Activos', a.activos],
      ['Pago pendiente', a.pendientes],
      ['Dados de baja', a.bajas],
      ['Clases', d.clases],
      ['Ingresos del mes', money(d.ingresosMes)],
      [
        'Cuotas pendientes',
        `${d.pagosPendientes.n} (${money(d.pagosPendientes.monto)})`
      ]
    ]
      .map(([l, v]) => `<div class="card kpi">${l}<b>${v}</b></div>`)
      .join('')}</div>
      <div class="charts"><div class="card"><canvas id="c1"></canvas></div><div class="card"><canvas id="c2"></canvas></div></div>
      <div class="card" style="margin-top:1rem"><h3>Próximas clases</h3>${d.proximas.map(p => `<p>${DIAS[p.dia_semana]} ${p.hora} — ${esc(p.nombre)}</p>`).join('') || 'Sin clases cargadas'}</div>`;
    charts.forEach(c => c.destroy());
    charts = [
      new Chart($('#c1'), {
        type: 'bar',
        data: {
          labels: d.ingresos.map(i => i.mes),
          datasets: [
            {
              label: 'Ingresos',
              data: d.ingresos.map(i => +i.total),
              backgroundColor: '#7b2cbf'
            }
          ]
        }
      }),
      new Chart($('#c2'), {
        type: 'doughnut',
        data: {
          labels: d.porClase.map(c => c.nombre),
          datasets: [{ data: d.porClase.map(c => c.alumnos) }]
        }
      })
    ];
  },
  async alumnos() {
    $('#vista').innerHTML =
      `<h1>Alumnos</h1><div class="bar"><input id="q" placeholder="Buscar por nombre, apellido o DNI"><select id="est"><option value="">Todos</option><option value="activo">Activos</option><option value="pendiente_pago">Pendientes</option><option value="inactivo">Inactivos</option></select><button id="nuevo">+ Nuevo alumno</button></div><div class="tbl" id="lista"></div>`;
    const cargar = async () => {
      const l = await api(
        `alumnos?q=${encodeURIComponent($('#q').value)}&estado=${$('#est').value}`
      );
      $('#lista').innerHTML =
        `<table><tr><th>Alumno</th><th>DNI</th><th>Teléfono</th><th>Estado</th><th></th></tr>${l
          .map(
            a => `<tr><td>${esc(a.apellido)}, ${esc(a.nombre)}</td><td>${esc(a.dni)}</td><td>${esc(a.telefono)}</td><td>${tag(a.estado)}</td>
      <td><button class="mini" onclick="ficha(${a.id})">Ver</button> <button class="mini sec" onclick="editar(${a.id})">Editar</button> ${user.rol === 'admin' ? `<button class="mini sec" onclick="baja(${a.id})">Baja</button>   <button class="mini sec" onclick="baja(${a.id})">Baja</button> <button class="mini sec" onclick="eliminar(${a.id})">Eliminar</button>` : ''}</td></tr>`
          )
          .join('')}</table>`;
    };
    $('#q').oninput = cargar;
    $('#est').onchange = cargar;
    await cargar();
    $('#nuevo').onclick = () =>
      dialogo('Nuevo alumno', AL, {}, d => api('alumnos', 'POST', d));
  },
  async clases() {
    const [cl, pr] = await Promise.all([
      api('clases'),
      api('clases/profesores')
    ]);
    $('#vista').innerHTML =
      `<h1>Clases</h1><div class="bar">${user.rol === 'admin' ? '<button id="nc">+ Nueva clase</button><button id="np" class="sec">+ Profesor</button>' : ''}</div><div class="tbl"><table><tr><th>Clase</th><th>Profesor</th><th>Horarios</th><th>Precio</th><th>Cupo</th><th></th></tr>
    ${cl.map(c => `<tr><td>${esc(c.nombre)}</td><td>${esc(c.profesor)}</td><td>${esc(c.horarios)}</td><td>${money(c.precio)}</td><td>${c.inscriptos}/${c.cupo_maximo}</td><td><button class="mini" onclick="inscriptos(${c.id},'${esc(c.nombre)}')">Alumnos</button>${user.rol === 'admin' ? ` <button class="mini sec" onclick="editarClase(${c.id})">Editar</button> <button class="mini sec" onclick="borrarClase(${c.id})">Eliminar</button>` : ''} <button class="mini sec" onclick="inscribir(${c.id})">Inscribir</button></td></tr>`).join('')}</table></div>`;
    if (user.rol !== 'admin') return;
    $('#np').onclick = () =>
      dialogo('Nuevo profesor', AL.slice(0, 2), {}, d =>
        api('clases/profesores', 'POST', d)
      );
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
          [
            'dia',
            'Día',
            'text',
            [
              'Lunes',
              'Martes',
              'Miércoles',
              'Jueves',
              'Viernes',
              'Sábado',
              'Domingo'
            ].map((n, i) => [i + 1, n])
          ],
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
  async pagos() {
    $('#vista').innerHTML =
      `<h1>Pagos</h1><div class="bar"><select id="pe"><option value="pendiente">Pendientes</option><option value="pagado">Realizados</option><option value="">Todos</option></select></div><div class="tbl" id="lp"></div><h3>Ingresos mensuales</h3><div class="tbl" id="rep"></div>`;
    const cargar = async () => {
      const l = await api('pagos?estado=' + $('#pe').value);
      $('#lp').innerHTML =
        `<table><tr><th>Alumno</th><th>Clase</th><th>Período</th><th>Importe</th><th>Vence</th><th>Pagó</th><th>Método</th><th>Estado</th><th></th></tr>${l
          .map(
            p => `<tr><td>${esc(p.alumno)}</td><td>${esc(p.clase)}</td><td>${p.periodo.slice(0, 7)}</td><td>${money(p.importe)}</td><td>${p.fecha_vencimiento}</td><td>${p.fecha_pago || '-'}</td><td>${esc(p.metodo_pago || '-')}</td><td>${tag(p.estado)}</td>
      <td>${p.estado === 'pendiente' ? `<button class="mini" onclick="pagar(${p.id},${p.importe})">Registrar pago</button>` : ''}</td></tr>`
          )
          .join('')}</table>`;
    };
    $('#pe').onchange = cargar;
    await cargar();
    $('#rep').innerHTML =
      `<table><tr><th>Mes</th><th>Total</th><th>Pagos</th></tr>${(await api('pagos/reporte')).map(r => `<tr><td>${r.mes}</td><td>${money(r.total)}</td><td>${r.cantidad}</td></tr>`).join('')}</table>`;
  },
  ia() {
    $('#vista').innerHTML =
      `<h1>🤖 Asistente IA</h1><div class="card"><div id="chat"><div class="m a">Hola, consulto los datos reales de la academia. Probá: "¿Quiénes no pagaron este mes?"</div></div>
    <div class="bar" style="margin:0"><input id="pq" placeholder="Escribí tu consulta..." maxlength="500"><button id="env">Enviar</button></div>
    <div class="bar">${['¿Cuántos alumnos están inscriptos?', '¿Quiénes no pagaron este mes?', '¿Cuánto ingresó este mes?', '¿Qué clases tienen más alumnos?', '¿Qué alumnos están por quedar inactivos?', 'Analiza el crecimiento y dame recomendaciones'].map(s => `<button class="mini sec" onclick="preguntar(this.textContent)">${s}</button>`).join('')}</div></div>`;
    $('#env').onclick = () => preguntar($('#pq').value);
    $('#pq').onkeydown = e => e.key === 'Enter' && preguntar($('#pq').value);
  }
};
window.preguntar = async t => {
  if (!t.trim()) return;
  $('#pq').value = '';
  const add = (c, x) => {
    const d = document.createElement('div');
    d.className = 'm ' + c;
    d.textContent = x;
    $('#chat').append(d);
    $('#chat').scrollTop = 1e6;
    return d;
  };
  add('u', t);
  const w = add('a', 'Consultando...');
  try {
    w.textContent = (await api('ia', 'POST', { pregunta: t })).respuesta;
  } catch (e) {
    w.textContent = '⚠ ' + e.message;
  }
};
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
  if (confirm('¿Dar de baja al alumno? (se conserva su historial)')) {
    try {
      await api('alumnos/' + id, 'DELETE');
      show(cur);
    } catch (e) {
      alerta(e);
    }
  }
};
window.eliminar = async id => {
  if (confirm('¿Eliminar definitivamente? No se puede deshacer.')) {
    try {
      await api('alumnos/' + id + '/definitivo', 'DELETE');
      show(cur);
    } catch (e) {
      alerta(e);
    }
  }
};
window.ficha = async id => {
  const a = await api('alumnos/' + id);
  $('#dlgForm').innerHTML =
    `<h3>${esc(a.apellido)}, ${esc(a.nombre)} ${tag(a.estado)}</h3><b>Clases</b>${a.clases.map(c => `<div>${esc(c.nombre)} (${c.estado})</div>`).join('') || '<div>Sin clases</div>'}
  <b>Historial de pagos</b>${a.pagos.map(p => `<div>${p.periodo.slice(0, 7)} ${esc(p.clase)} ${money(p.importe)} ${tag(p.estado)}</div>`).join('') || '<div>Sin pagos</div>'}<button class="sec">Cerrar</button>`;
  $('#dlgForm').onsubmit = null;
  dlg.showModal();
};
window.inscriptos = async (id, n) => {
  const l = await api(`clases/${id}/alumnos`);
  $('#dlgForm').innerHTML =
    `<h3>${esc(n)}</h3>${l.map(a => `<div>${esc(a.apellido)}, ${esc(a.nombre)} <button type="button" class="mini sec" onclick="desinscribir(${a.inscripcion_id})">Quitar</button></div>`).join('') || '<div>Sin alumnos</div>'}<button class="sec">Cerrar</button>`;
  $('#dlgForm').onsubmit = null;
  dlg.showModal();
};
window.desinscribir = async id => {
  await api('clases/inscripciones/' + id, 'DELETE');
  dlg.close();
  show(cur);
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
      [
        'dia',
        'Día',
        'text',
        [
          'Lunes',
          'Martes',
          'Miércoles',
          'Jueves',
          'Viernes',
          'Sábado',
          'Domingo'
        ].map((n, i) => [i + 1, n])
      ],
      ['inicio', 'Inicio', 'time'],
      ['fin', 'Fin', 'time']
    ],
    { ...c, dia: h.dia, inicio: h.inicio, fin: h.fin },
    d => api('clases/' + id, 'PUT', d)
  );
};
window.borrarClase = async id => {
  if (
    confirm(
      '¿Eliminar esta clase? Dejará de mostrarse, pero se conserva su historial.'
    )
  ) {
    try {
      await api('clases/' + id, 'DELETE');
      show(cur);
    } catch (e) {
      alerta(e);
    }
  }
};
window.inscribir = async id => {
  const l = (await api('alumnos?estado=')).filter(a => a.estado !== 'inactivo');
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
        ['efectivo', 'transferencia', 'tarjeta', 'mercadopago', 'otro'].map(
          m => [m, m]
        )
      ]
    ],
    { importe: imp },
    d => api(`pagos/${id}/pagar`, 'POST', { ...d, importe: +d.importe })
  );
let cur = 'dashboard';
async function show(v) {
  cur = v;
  document
    .querySelectorAll('#menu a[data-v]')
    .forEach(a => a.classList.toggle('on', a.dataset.v === v));
  $('#menu').classList.remove('open');
  try {
    await vistas[v]();
  } catch (e) {
    $('#vista').innerHTML = `<p class="err">${esc(e.message)}</p>`;
  }
}
function entrar() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  show('dashboard');
}
document
  .querySelectorAll('#menu a[data-v]')
  .forEach(a => (a.onclick = () => show(a.dataset.v)));
$('#salir').onclick = logout;
$('#burger').onclick = () => $('#menu').classList.toggle('open');
$('#fLogin').onsubmit = async e => {
  e.preventDefault();
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
  }
};
if (token && user) entrar();

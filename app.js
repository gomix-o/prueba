function showTab(name) {
  const names = ['datos', 'resultado', 'sensibilidad'];
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', names[i] === name));
  document.querySelectorAll('.section').forEach((s, i) => s.classList.toggle('active', names[i] === name));
}

function g(id) { return parseFloat(document.getElementById(id).value) || 0; }

function simplex(c, A, b) {
  const m = b.length, n = c.length, cols = n + m;
  let T = [];
  for (let i = 0; i < m; i++) {
    let row = [...A[i]];
    for (let j = 0; j < m; j++) row.push(i === j ? 1 : 0);
    row.push(b[i]);
    T.push(row);
  }
  let zr = c.map(v => -v);
  for (let j = 0; j < m; j++) zr.push(0);
  zr.push(0);
  T.push(zr);

  for (let iter = 0; iter < 300; iter++) {
    const z = T[m];
    let pivCol = -1, minV = -1e-9;
    for (let j = 0; j < cols; j++) if (z[j] < minV) { minV = z[j]; pivCol = j; }
    if (pivCol === -1) break;

    let pivRow = -1, minR = Infinity;
    for (let i = 0; i < m; i++) {
      if (T[i][pivCol] > 1e-9) {
        const r = T[i][cols] / T[i][pivCol];
        if (r < minR) { minR = r; pivRow = i; }
      }
    }
    if (pivRow === -1) break;

    const pv = T[pivRow][pivCol];
    T[pivRow] = T[pivRow].map(v => v / pv);
    for (let i = 0; i <= m; i++) {
      if (i !== pivRow) {
        const f = T[i][pivCol];
        T[i] = T[i].map((v, j) => v - f * T[pivRow][j]);
      }
    }
  }

  const sol = new Array(cols).fill(0);
  for (let j = 0; j < cols; j++) {
    let ones = 0, oneRow = -1;
    for (let i = 0; i <= m; i++) {
      if (Math.abs(T[i][j] - 1) < 1e-9) { ones++; oneRow = i; }
      else if (Math.abs(T[i][j]) > 1e-9) ones = 99;
    }
    if (ones === 1 && oneRow < m) sol[j] = T[oneRow][cols];
  }

  return {
    x:     sol.slice(0, n),
    z:     T[m][cols],
    slack: sol.slice(n, n + m),
    duals: Array.from({ length: m }, (_, i) => T[m][n + i])
  };
}

let lastRes = null;

function pct(used, total) { return total > 0 ? Math.min(100, Math.round(used / total * 100)) : 0; }

/* ── CONTADOR ANIMADO ── */
function animarContador(elemento, valorFinal, duracion = 1200, prefix = 'Bs ') {
  const inicio = performance.now();
  function paso(ahora) {
    const progreso = Math.min((ahora - inicio) / duracion, 1);
    const easing = 1 - Math.pow(1 - progreso, 3);
    const valorActual = valorFinal * easing;
    elemento.textContent = prefix + valorActual.toFixed(2);
    if (progreso < 1) requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

function optimizar() {
  const u1 = g('v1') - g('c1'), u2 = g('v2') - g('c2'), u3 = g('v3') - g('c3');
  const rT = g('rT'), rH = g('rH'), rP = g('rP');
  const [t1,t2,t3] = [g('t1'),g('t2'),g('t3')];
  const [h1,h2,h3] = [g('h1'),g('h2'),g('h3')];
  const [p1,p2,p3] = [g('p1'),g('p2'),g('p3')];

  const res = simplex([u1,u2,u3], [[t1,t2,t3],[h1,h2,h3],[p1,p2,p3]], [rT,rH,rP]);

  const x1 = Math.round(res.x[0]), x2 = Math.round(res.x[1]), x3 = Math.round(res.x[2]);
  const z  = x1*u1 + x2*u2 + x3*u3;
  const usedT = t1*x1+t2*x2+t3*x3, usedH = h1*x1+h2*x2+h3*x3, usedP = p1*x1+p2*x2+p3*x3;
  const pT = pct(usedT,rT), pH = pct(usedH,rH), pP = pct(usedP,rP);
  const ingresos = x1*g('v1')+x2*g('v2')+x3*g('v3');
  const costos   = x1*g('c1')+x2*g('c2')+x3*g('c3');
  const sobraT = rT-usedT, sobraH = rH-usedH, sobraP = rP-usedP;

  lastRes = { x1,x2,x3,z,u1,u2,u3,usedT,usedH,usedP,pT,pH,pP,rT,rH,rP,ingresos,costos,sobraT,sobraH,sobraP,duals:res.duals };

  const maxU     = Math.max(u1,u2,u3);
  const bestProd = maxU===u1 ? 'collares' : maxU===u2 ? 'manillas' : 'anillos';
  const optProd  = x1>0&&x2===0&&x3===0 ? 'collares'
                 : x2>0&&x1===0&&x3===0 ? 'manillas'
                 : x3>0&&x1===0&&x2===0 ? 'anillos'
                 : 'una combinación de productos';

  const barColor = (p) => p >= 95 ? '#f472b6' : p >= 70 ? '#c084fc' : '#a78bfa';

  document.getElementById('result-content').innerHTML = `
  <div class="result-banner">
    <div class="result-label">Utilidad máxima mensual</div>
    <div class="result-amount" id="result-amount-anim">Bs 0.00</div>
    <div class="result-sub">Ingresos: Bs ${ingresos.toFixed(0)} &nbsp;·&nbsp; Costos: Bs ${costos.toFixed(0)}</div>
  </div>

  <div class="metrics-grid">
    <div class="metric metric-collar">
      <div class="metric-label"><img src="img/collar.png" alt="Collar" class="metric-img"> Collares</div>
      <div class="metric-value">${x1}</div>
      <div class="metric-unit">unidades</div>
    </div>
    <div class="metric metric-manilla">
      <div class="metric-label"><img src="img/brazalete.png" alt="Manilla" class="metric-img"> Manillas</div>
      <div class="metric-value">${x2}</div>
      <div class="metric-unit">unidades</div>
    </div>
    <div class="metric metric-anillo">
      <div class="metric-label"><img src="img/anillo.png" alt="Anillo" class="metric-img"> Anillos</div>
      <div class="metric-value">${x3}</div>
      <div class="metric-unit">unidades</div>
    </div>
    <div class="metric metric-total">
      <div class="metric-label">📦 Total piezas</div>
      <div class="metric-value">${x1+x2+x3}</div>
      <div class="metric-unit">al mes</div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="card-title">Uso de recursos</div>
      <div class="bar-row"><span class="bar-label"><span class="field-icon tiempo"></span> Tiempo</span><div class="bar-track"><div class="bar-fill" style="width:${pT}%;background:${barColor(pT)};"></div></div><span class="bar-pct">${pT}%</span><span class="bar-stats">${usedT}/${rT} min</span></div>
      <div class="bar-row"><span class="bar-label"><span class="field-icon hilo"></span> Hilo</span><div class="bar-track"><div class="bar-fill" style="width:${pH}%;background:${barColor(pH)};"></div></div><span class="bar-pct">${pH}%</span><span class="bar-stats">${usedH}/${rH} cm</span></div>
      <div class="bar-row"><span class="bar-label"><span class="field-icon perlas"></span> Perlas</span><div class="bar-track"><div class="bar-fill" style="width:${pP}%;background:${barColor(pP)};"></div></div><span class="bar-pct">${pP}%</span><span class="bar-stats">${usedP}/${rP} uni</span></div>
    </div>
    <div class="card">
      <div class="card-title">Recursos sobrantes</div>
      <div class="bar-row"><span class="bar-label"><span class="field-icon tiempo"></span> Tiempo</span><div class="bar-track"><div class="bar-fill" style="width:${100-pT}%;background:rgba(124,77,255,0.4);"></div></div><span class="bar-stats" style="font-weight:500;">${sobraT} min</span></div>
      <div class="bar-row"><span class="bar-label"><span class="field-icon hilo"></span> Hilo</span><div class="bar-track"><div class="bar-fill" style="width:${100-pH}%;background:rgba(124,77,255,0.4);"></div></div><span class="bar-stats" style="font-weight:500;">${sobraH} cm</span></div>
      <div class="bar-row"><span class="bar-label"><span class="field-icon perlas"></span> Perlas</span><div class="bar-track"><div class="bar-fill" style="width:${100-pP}%;background:rgba(124,77,255,0.4);"></div></div><span class="bar-stats" style="font-weight:500;">${sobraP} uni</span></div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="card-title">Utilidad por producto (Bs/uni)</div>
      <div class="bar-row">
        <span class="bar-label"><img src="img/collar.png" alt="" class="bar-img"> Collar</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,u1/Math.max(u1,u2,u3,0.01)*100)}%;background:var(--purple);"></div></div>
        <span class="bar-stats" style="font-weight:500;">Bs ${u1.toFixed(0)}</span>
      </div>
      <div class="bar-row">
        <span class="bar-label"><img src="img/brazalete.png" alt="" class="bar-img"> Manilla</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,u2/Math.max(u1,u2,u3,0.01)*100)}%;background:var(--accent2);"></div></div>
        <span class="bar-stats" style="font-weight:500;">Bs ${u2.toFixed(0)}</span>
      </div>
      <div class="bar-row">
        <span class="bar-label"><img src="img/anillo.png" alt="" class="bar-img"> Anillo</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0,u3/Math.max(u1,u2,u3,0.01)*100)}%;background:var(--gold);"></div></div>
        <span class="bar-stats" style="font-weight:500;">Bs ${u3.toFixed(0)}</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Modelo matemático</div>
      <div class="formula-box">
        Max Z = ${u1}X₁ + ${u2}X₂ + ${u3}X₃<br><br>
        s.a.<br>
        ${g('t1')}X₁ + ${g('t2')}X₂ + ${g('t3')}X₃ ≤ ${rT}<br>
        ${g('h1')}X₁ + ${g('h2')}X₂ + ${g('h3')}X₃ ≤ ${rH}<br>
        ${g('p1')}X₁ + ${g('p2')}X₂ + ${g('p3')}X₃ ≤ ${rP}<br>
        X₁, X₂, X₃ ≥ 0
      </div>
    </div>
  </div>

  <div class="recommendation rec-colapsable" onclick="toggleRec(this)">
    <div class="rec-header">
      <span class="rec-icon"><span class="field-icon foquito"></span></span>
      <span class="rec-title">Recomendación del sistema</span>
      <span class="rec-arrow">▼</span>
    </div>
    <div class="rec-body rec-hidden">
      Para maximizar utilidades, debes producir <strong>${optProd}</strong>. El producto con mayor utilidad unitaria son los <strong>${bestProd}</strong> (Bs ${maxU.toFixed(0)}/uni), pero el Simplex encontró la combinación que mejor aprovecha los tres recursos.
      ${sobraT>0||sobraH>0||sobraP>0 ? `Sobrará <strong>${sobraT} min</strong>, <strong>${sobraH} cm de hilo</strong> y <strong>${sobraP} perlas</strong> sin usar.` : 'Todos los recursos se agotan completamente.'}
    </div>
  </div>`;

  animarContador(document.getElementById('result-amount-anim'), z);
  renderSensibilidad();
  document.querySelector('.tabs-wrapper').scrollIntoView({ behavior: 'smooth' });
  showTab('resultado');
}

function renderSensibilidad() {
  if (!lastRes) return;
  const { duals } = lastRes;
  const d = duals;

  const resourceNames = [
    '<img src="img/tiempo.png" class="sens-icon"> Tiempo',
    '<img src="img/hilos.png" class="sens-icon"> Hilo',
    '<img src="img/perla.png" class="sens-icon"> Perlas'
  ];
  const resourceUnits = ['min', 'cm', 'uni'];

  let rows = '';
  for (let i = 0; i < 3; i++) {
    const per100   = (d[i] * 100).toFixed(2);
    const isCrit   = d[i] > 0.001;
    const badgeCls = isCrit ? 'badge-critical' : 'badge-ok';
    const badgeLbl = isCrit ? 'Limitante' : 'Holgura';
    const impactCls = parseFloat(per100) > 0 ? 'plus' : 'zero';
    rows += `<tr class="sens-row-hover">
      <td>${resourceNames[i]}</td>
      <td><span class="sens-badge ${badgeCls}">${badgeLbl}</span></td>
      <td>${d[i].toFixed(5)} Bs/${resourceUnits[i]}</td>
      <td class="${impactCls}" style="text-align:right;">
        <span class="impact-pill ${impactCls}">
          ${parseFloat(per100)>0?'+':''}Bs ${per100} por +100 ${resourceUnits[i]}
        </span>
      </td>
    </tr>`;
  }

  const critIdx   = d.indexOf(Math.max(...d));
  const critNames = ['tiempo', 'hilo elástico', 'perlas'];

  document.getElementById('sens-content').innerHTML = `
  <div class="card" style="margin-bottom:14px;">
    <div class="card-title">Precio sombra — valor marginal de cada recurso</div>
    <div class="sens-table-wrapper">
      <table class="sens-table">
        <thead>
          <tr><th>Recurso</th><th>Estado</th><th>Precio sombra</th><th style="text-align:right;">Impacto (+100 unidades)</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>

  <div class="recommendation rec-colapsable" style="margin-bottom:14px;" onclick="toggleRec(this)">
    <div class="rec-header">
      <span class="rec-icon"><span class="field-icon advertencia"></span></span>
      <span class="rec-title">Recurso más crítico</span>
      <span class="rec-arrow">▼</span>
    </div>
    <div class="rec-body rec-hidden">
      El recurso más valioso es el <strong>${critNames[critIdx]}</strong>. Cada unidad adicional genera un incremento de <strong>Bs ${d[critIdx].toFixed(4)}</strong> en la utilidad. Conviene comprarlo siempre que su costo sea menor a ese beneficio marginal.
    </div>
  </div>

  <div class="sim-separator">
    <span class="sim-separator-label">🧮 Simulador de recursos</span>
  </div>

  <div class="card">
    <div class="card-title">¿Qué pasa si compro más recursos?</div>
    <div style="font-size:14px;color:var(--text2);margin-bottom:1rem;">Estima la nueva utilidad al agregar recursos adicionales a los disponibles actualmente.</div>
    <div class="sim-fields">
      <div class="sim-field">
        <label><img src="img/perla.png" class="sens-icon"> + Perlas (uni)</label>
        <input type="number" id="simP" value="100" min="0">
      </div>
      <div class="sim-field">
        <label><img src="img/hilos.png" class="sens-icon"> + Hilo (cm)</label>
        <input type="number" id="simH" value="0" min="0">
      </div>
      <div class="sim-field">
        <label><img src="img/tiempo.png" class="sens-icon"> + Tiempo (min)</label>
        <input type="number" id="simT" value="0" min="0">
      </div>
    </div>
    <button class="btn-calc btn-sim-calc" onclick="simular()">Simular impacto →</button>
    <div class="sim-result" id="sim-result">
      <div class="sim-result-inner">
        <div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:4px;">Nueva utilidad estimada</div>
          <div class="sim-val" id="sim-val">—</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:4px;">Cambio vs. actual</div>
          <div class="sim-diff" id="sim-diff">—</div>
        </div>
      </div>
    </div>
  </div>`;
}

function simular() {
  if (!lastRes) return;
  const { duals, z } = lastRes;
  const addP = parseFloat(document.getElementById('simP').value) || 0;
  const addH = parseFloat(document.getElementById('simH').value) || 0;
  const addT = parseFloat(document.getElementById('simT').value) || 0;
  const zNew = z + duals[0]*addT + duals[1]*addH + duals[2]*addP;
  const diff = zNew - z;

  document.getElementById('sim-result').style.display = 'block';

  const simValEl = document.getElementById('sim-val');
  simValEl.textContent = 'Bs 0.00';
  animarContador(simValEl, zNew);

  const dEl = document.getElementById('sim-diff');
  dEl.textContent = (diff >= 0 ? '+' : '') + 'Bs ' + diff.toFixed(2);
  dEl.className = 'sim-diff ' + (diff > 0 ? 'positive' : diff < 0 ? 'negative' : '');
}

function toggleRec(el) {
  const body  = el.querySelector('.rec-body');
  const arrow = el.querySelector('.rec-arrow');
  body.classList.toggle('rec-hidden');
  arrow.textContent = body.classList.contains('rec-hidden') ? '▼' : '▲';
}
const resultEl   = document.getElementById('result');
const exprEl     = document.getElementById('expression');
const buttons    = document.querySelectorAll('.btn');

let state = {
  current:     '0',
  previous:    '',
  operator:    null,
  justEvaled:  false,
  expression:  ''
};

function updateDisplay() {
  const val = state.current;
  const num = parseFloat(val);
  let display = val;

  if (!isNaN(num) && val !== '-') {
    if (val.includes('.')) {
      const [int, dec] = val.split('.');
      display = formatInt(int) + '.' + dec;
    } else {
      display = formatInt(val);
    }
  }

  resultEl.textContent = display.length > 12 ? parseFloat(num.toPrecision(10)).toString() : display;
  exprEl.textContent   = state.expression;
  resultEl.classList.toggle('error', state.current === 'ERROR');
}

function formatInt(str) {
  const n = parseInt(str, 10);
  if (isNaN(n)) return str;
  return n.toLocaleString('en-US');
}

function inputDigit(digit) {
  if (state.justEvaled) {
    state.current    = digit === '.' ? '0.' : digit;
    state.expression = '';
    state.justEvaled = false;
    return;
  }
  if (digit === '.') {
    if (!state.current.includes('.')) state.current += '.';
    return;
  }
  state.current = state.current === '0' ? digit : state.current + digit;
}

function setOperator(op) {
  if (state.operator && !state.justEvaled) calculate();
  state.previous   = state.current;
  state.operator   = op;
  state.expression = `${state.previous} ${op}`;
  state.justEvaled = false;
  state.current    = '0';
  highlightOp(op);
}

function calculate() {
  if (!state.operator || state.previous === '') return;
  const a = parseFloat(state.previous);
  const b = parseFloat(state.current);
  const opSymbols = { '/': '÷', '*': '×', '-': '−', '+': '+' };

  state.expression = `${state.previous} ${opSymbols[state.operator] || state.operator} ${state.current} =`;

  let result;
  switch (state.operator) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    case '/': result = b === 0 ? 'ERROR' : a / b; break;
  }

  state.current    = result === 'ERROR' ? 'ERROR' : parseFloat(result.toPrecision(12)).toString();
  state.operator   = null;
  state.previous   = '';
  state.justEvaled = true;
  clearOpHighlight();
}

function clear() {
  state = { current: '0', previous: '', operator: null, justEvaled: false, expression: '' };
  clearOpHighlight();
}

function toggleSign() {
  if (state.current !== '0' && state.current !== 'ERROR')
    state.current = state.current.startsWith('-')
      ? state.current.slice(1)
      : '-' + state.current;
}

function percent() {
  const n = parseFloat(state.current);
  if (!isNaN(n)) state.current = (n / 100).toString();
}

function highlightOp(op) {
  clearOpHighlight();
  buttons.forEach(b => {
    if (b.dataset.value === op) b.classList.add('active-op');
  });
}

function clearOpHighlight() {
  document.querySelectorAll('.btn.op').forEach(b => b.classList.remove('active-op'));
}

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const { value, action } = btn.dataset;
    if (value !== undefined) {
      if (['+', '-', '*', '/'].includes(value)) setOperator(value);
      else inputDigit(value);
    } else {
      if (action === 'clear')   clear();
      if (action === 'sign')    toggleSign();
      if (action === 'percent') percent();
      if (action === 'equals')  calculate();
    }
    updateDisplay();
  });
});

document.addEventListener('keydown', e => {
  if (e.key >= '0' && e.key <= '9') { inputDigit(e.key); updateDisplay(); }
  else if (e.key === '.')  { inputDigit('.'); updateDisplay(); }
  else if (e.key === '+')  { setOperator('+'); updateDisplay(); }
  else if (e.key === '-')  { setOperator('-'); updateDisplay(); }
  else if (e.key === '*')  { setOperator('*'); updateDisplay(); }
  else if (e.key === '/')  { e.preventDefault(); setOperator('/'); updateDisplay(); }
  else if (e.key === 'Enter' || e.key === '=') { calculate(); updateDisplay(); }
  else if (e.key === 'Backspace') {
    if (!state.justEvaled && state.current.length > 1)
      state.current = state.current.slice(0, -1);
    else state.current = '0';
    updateDisplay();
  }
  else if (e.key === 'Escape') { clear(); updateDisplay(); }
});

updateDisplay();
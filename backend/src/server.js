import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { nanoid } from 'nanoid';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));


const demoTransactions = (() => {
  const items = [];
  const types = ['deposit', 'withdraw', 'transfer'];
  const statuses = ['success', 'pending', 'failed'];
  const now = Date.now();
  for (let i = 0; i < 150; i += 1) {
    const createdAt = new Date(now - i * 36e5).toISOString().slice(0, 16).replace('T', ' ');
    const id = nanoid(8).toUpperCase();
    const kind = types[i % types.length];
    const status = statuses[(i + 1) % statuses.length];
    const amount = Math.floor(Math.random() * 1500000) + 50000;
    const sign = kind === 'deposit' ? 1 : -1;
    const note = kind === 'deposit' ? 'Visa **** 1234' : kind === 'withdraw' ? 'Về ngân hàng ACB' : 'Chuyển nội bộ';
    items.push({
      time: createdAt,
      code: `#TXN-${String(10000 + i)}`,
      type: kind,
      amount: sign * amount,
      status,
      note,
      id
    });
  }
  return items;
})();

function applyFilters(data, { q, status, type }) {
  let result = data;
  if (q) {
    const needle = String(q).toLowerCase();
    result = result.filter((t) =>
      t.code.toLowerCase().includes(needle) || String(t.note).toLowerCase().includes(needle)
    );
  }
  if (status) {
    result = result.filter((t) => t.status === status);
  }
  if (type) {
    result = result.filter((t) => t.type === type);
  }
  return result;
}

function paginate(data, page = 1, pageSize = 10) {
  const p = Math.max(1, Number(page) || 1);
  const ps = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ps));
  const start = (p - 1) * ps;
  const items = data.slice(start, start + ps);
  return { items, page: p, pageSize: ps, totalItems, totalPages };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'congcu-backend', time: new Date().toISOString() });
});


app.get('/api/transactions', (req, res) => {
  const { q, status, type, page = '1', pageSize = '10' } = req.query;
  const filtered = applyFilters(demoTransactions, { q, status, type });
  const result = paginate(filtered, Number(page), Number(pageSize));
  res.json(result);
});

app.listen(PORT, () => {

  console.log(`API listening on http://localhost:${PORT}`);
});



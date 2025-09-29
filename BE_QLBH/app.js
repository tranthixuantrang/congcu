(function () {
  const store = {
    load(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  };

  const fmt = {
    money(n) { return new Intl.NumberFormat('vi-VN').format(Number(n || 0)); }
  };

  let state = {
    products: store.load('products', []),
    customers: store.load('customers', []),
    invoices: store.load('invoices', []),
    editingProductId: null,
    editingCustomerId: null,
    cart: store.load('cart', [])
  };

  // Helpers
  function genId(prefix) {
    const now = new Date();
    return `${prefix}${now.getFullYear().toString().slice(-2)}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}${Math.floor(Math.random()*90+10)}`;
  }

  // DOM refs
  const els = {
    // products
    productForm: document.getElementById('product-form'),
    productName: document.getElementById('product-name'),
    productPrice: document.getElementById('product-price'),
    productStock: document.getElementById('product-stock'),
    productTable: document.getElementById('product-table'),
    productSearch: document.getElementById('product-search'),
    // customers
    customerForm: document.getElementById('customer-form'),
    customerName: document.getElementById('customer-name'),
    customerPhone: document.getElementById('customer-phone'),
    customerTable: document.getElementById('customer-table'),
    // sales
    saleCustomer: document.getElementById('sale-customer'),
    saleProduct: document.getElementById('sale-product'),
    saleQty: document.getElementById('sale-qty'),
    addToCart: document.getElementById('add-to-cart'),
    cartTable: document.getElementById('cart-table'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    cartDiscount: document.getElementById('cart-discount'),
    cartVat: document.getElementById('cart-vat'),
    cartTotal: document.getElementById('cart-total'),
    checkout: document.getElementById('checkout'),
    clearCart: document.getElementById('clear-cart'),
    discountRate: document.getElementById('discount-rate'),
    vatRate: document.getElementById('vat-rate'),
    // invoices
    invoiceTable: document.getElementById('invoice-table'),
    revenueToday: document.getElementById('revenue-today'),
    revenueMonth: document.getElementById('revenue-month'),
    exportCsv: document.getElementById('export-csv'),
    exportJson: document.getElementById('export-json'),
    importJson: document.getElementById('import-json'),
    importFile: document.getElementById('import-file'),
    resetData: document.getElementById('reset-data'),
    // modal
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalClose: document.getElementById('modal-close'),
    printInvoice: document.getElementById('print-invoice')
  };

  // Renderers
  function renderProducts() {
    const q = (els.productSearch?.value || '').trim().toLowerCase();
    const list = !q ? state.products : state.products.filter(p =>
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
    els.productTable.innerHTML = (list.length === 0)
      ? `<tr><td colspan="5" class="right">Không có sản phẩm</td></tr>`
      : list.map(p => `
      <tr>
        <td class="pill">${p.id}</td>
        <td>${p.name}</td>
        <td class="right">${fmt.money(p.price)}</td>
        <td class="right ${p.stock <= 5 ? 'low-stock' : ''}">${p.stock}</td>
        <td>
          <button data-act="edit-p" data-id="${p.id}">Sửa</button>
          <button class="danger" data-act="del-p" data-id="${p.id}">Xóa</button>
        </td>
      </tr>
    `).join('');

    // dropdown for sale
    els.saleProduct.innerHTML = state.products.map(p => `<option value="${p.id}">${p.name} - ${fmt.money(p.price)}</option>`).join('');
  }

  function renderCustomers() {
    els.customerTable.innerHTML = (state.customers.length === 0)
      ? `<tr><td colspan="4" class="right">Không có khách hàng</td></tr>`
      : state.customers.map(c => `
      <tr>
        <td class="pill">${c.id}</td>
        <td>${c.name}</td>
        <td>${c.phone}</td>
        <td>
          <button data-act="edit-c" data-id="${c.id}">Sửa</button>
          <button class="danger" data-act="del-c" data-id="${c.id}">Xóa</button>
        </td>
      </tr>
    `).join('');

    els.saleCustomer.innerHTML = state.customers.map(c => `<option value="${c.id}">${c.name} (${c.phone})</option>`).join('');
  }

  function renderCart() {
    els.cartTable.innerHTML = (state.cart.length === 0)
      ? `<tr><td colspan="5" class="right">Giỏ hàng trống</td></tr>`
      : state.cart.map((item, idx) => {
      const line = item.price * item.qty;
      return `
        <tr>
          <td>${item.name}</td>
          <td class="right">${fmt.money(item.price)}</td>
          <td class="right"><input data-idx="${idx}" class="qty-input" type="number" min="1" value="${item.qty}" style="width:80px"></td>
          <td class="right">${fmt.money(line)}</td>
          <td><button class="secondary" data-act="rm-cart" data-idx="${idx}">Bỏ</button></td>
        </tr>
      `;
    }).join('');
    const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const dr = Math.min(100, Math.max(0, Number(els.discountRate?.value || 0)));
    const vr = Math.min(100, Math.max(0, Number(els.vatRate?.value || 0)));
    const discount = Math.round(subtotal * dr / 100);
    const vat = Math.round((subtotal - discount) * vr / 100);
    const total = subtotal - discount + vat;
    if (els.cartSubtotal) els.cartSubtotal.textContent = fmt.money(subtotal);
    if (els.cartDiscount) els.cartDiscount.textContent = fmt.money(discount);
    if (els.cartVat) els.cartVat.textContent = fmt.money(vat);
    els.cartTotal.textContent = fmt.money(total);
    if (els.checkout) els.checkout.disabled = state.cart.length === 0;
    store.save('cart', state.cart);
  }

  function renderInvoices() {
    els.invoiceTable.innerHTML = (state.invoices.length === 0)
      ? `<tr><td colspan="5" class="right">Chưa có hóa đơn</td></tr>`
      : state.invoices.map(inv => `
      <tr>
        <td class="pill">${inv.id}</td>
        <td>${new Date(inv.createdAt).toLocaleString('vi-VN')}</td>
        <td>${inv.customer.name}</td>
        <td class="right">${fmt.money(inv.total)}</td>
        <td><button class="secondary" data-act="view-inv" data-id="${inv.id}">Xem</button> <button class="danger" data-act="del-inv" data-id="${inv.id}">Xóa</button></td>
      </tr>
    `).join('');

    // stats
    const now = new Date();
    const isSameDay = (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    const isSameMonth = (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    const totalToday = state.invoices.filter(i => isSameDay(new Date(i.createdAt))).reduce((s, i) => s + i.total, 0);
    const totalMonth = state.invoices.filter(i => isSameMonth(new Date(i.createdAt))).reduce((s, i) => s + i.total, 0);
    els.revenueToday.textContent = fmt.money(totalToday);
    els.revenueMonth.textContent = fmt.money(totalMonth);
  }

  // Event handlers
  els.productForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = els.productName.value.trim();
    const price = Number(els.productPrice.value);
    const stock = Number(els.productStock.value);
    if (!name || price < 0 || stock < 0) return;

    if (state.editingProductId) {
      const idx = state.products.findIndex(p => p.id === state.editingProductId);
      if (idx >= 0) {
        state.products[idx] = { ...state.products[idx], name, price, stock };
      }
      state.editingProductId = null;
    } else {
      const id = genId('SP');
      state.products.push({ id, name, price, stock });
    }
    store.save('products', state.products);
    els.productForm.reset();
    renderProducts();
  });

  els.productTable.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if (act === 'edit-p') {
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      state.editingProductId = p.id;
      els.productName.value = p.name;
      els.productPrice.value = p.price;
      els.productStock.value = p.stock;
    } else if (act === 'del-p') {
      if (!confirm('Xóa sản phẩm này?')) return;
      state.products = state.products.filter(p => p.id !== id);
      store.save('products', state.products);
      renderProducts();
    }
  });

  els.customerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = els.customerName.value.trim();
    const phone = els.customerPhone.value.trim();
    if (!name || !phone) return;

    if (state.editingCustomerId) {
      const idx = state.customers.findIndex(c => c.id === state.editingCustomerId);
      if (idx >= 0) state.customers[idx] = { ...state.customers[idx], name, phone };
      state.editingCustomerId = null;
    } else {
      const id = genId('KH');
      state.customers.push({ id, name, phone });
    }
    store.save('customers', state.customers);
    els.customerForm.reset();
    renderCustomers();
  });

  els.customerTable.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const act = btn.getAttribute('data-act');
    if (act === 'edit-c') {
      const c = state.customers.find(x => x.id === id);
      if (!c) return;
      state.editingCustomerId = c.id;
      els.customerName.value = c.name;
      els.customerPhone.value = c.phone;
    } else if (act === 'del-c') {
      if (!confirm('Xóa khách hàng này?')) return;
      state.customers = state.customers.filter(c => c.id !== id);
      store.save('customers', state.customers);
      renderCustomers();
    }
  });

  els.addToCart.addEventListener('click', () => {
    const pid = els.saleProduct.value;
    const qty = Math.max(1, Number(els.saleQty.value || 1));
    const p = state.products.find(x => x.id === pid);
    if (!p) return;
    if (qty > p.stock) { alert('Vượt quá tồn kho'); return; }
    const existing = state.cart.find(i => i.id === pid);
    if (existing) {
      if (existing.qty + qty > p.stock) { alert('Vượt quá tồn kho'); return; }
      existing.qty += qty;
    } else {
      state.cart.push({ id: p.id, name: p.name, price: p.price, qty });
    }
    renderCart();
  });

  els.cartTable.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.getAttribute('data-idx'));
    state.cart.splice(idx, 1);
    renderCart();
  });
  els.cartTable.addEventListener('input', (e) => {
    const input = e.target.closest('input.qty-input');
    if (!input) return;
    const idx = Number(input.getAttribute('data-idx'));
    const newQty = Math.max(1, Number(input.value || 1));
    const line = state.cart[idx];
    const product = state.products.find(p => p.id === line.id);
    if (product && newQty > product.stock) {
      input.value = line.qty;
      alert('Vượt quá tồn kho');
      return;
    }
    line.qty = newQty;
    renderCart();
  });

  els.clearCart.addEventListener('click', () => {
    state.cart = [];
    renderCart();
  });

  els.checkout.addEventListener('click', () => {
    if (state.cart.length === 0) return;
    const cid = els.saleCustomer.value;
    const customer = state.customers.find(c => c.id === cid);
    if (!customer) return;
    const subtotal = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
    const dr = Math.min(100, Math.max(0, Number(els.discountRate?.value || 0)));
    const vr = Math.min(100, Math.max(0, Number(els.vatRate?.value || 0)));
    const discount = Math.round(subtotal * dr / 100);
    const vat = Math.round((subtotal - discount) * vr / 100);
    const total = subtotal - discount + vat;
    // update stock
    for (const line of state.cart) {
      const p = state.products.find(x => x.id === line.id);
      if (!p) continue;
      if (line.qty > p.stock) { alert('Tồn kho thay đổi, vui lòng kiểm tra'); return; }
      p.stock -= line.qty;
    }
    store.save('products', state.products);
    renderProducts();

    const invoice = {
      id: genId('HD'),
      createdAt: new Date().toISOString(),
      customer: { id: customer.id, name: customer.name },
      items: state.cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      subtotal,
      discountRate: dr,
      vatRate: vr,
      discount,
      vat,
      total
    };
    state.invoices.push(invoice);
    store.save('invoices', state.invoices);
    state.cart = [];
    renderCart();
    renderInvoices();
    alert('Thanh toán thành công');
  });

  // product search
  if (els.productSearch) {
    els.productSearch.addEventListener('input', () => renderProducts());
  }

  // persist discount/vat
  if (els.discountRate) {
    const savedDr = store.load('discountRate', null);
    if (savedDr !== null) els.discountRate.value = savedDr;
    els.discountRate.addEventListener('input', () => {
      store.save('discountRate', Number(els.discountRate.value || 0));
      renderCart();
    });
  }
  if (els.vatRate) {
    const savedVr = store.load('vatRate', null);
    if (savedVr !== null) els.vatRate.value = savedVr;
    els.vatRate.addEventListener('input', () => {
      store.save('vatRate', Number(els.vatRate.value || 0));
      renderCart();
    });
  }

  // invoice actions
  els.invoiceTable.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const id = btn.getAttribute('data-id');
    if (act === 'view-inv') {
      const inv = state.invoices.find(i => i.id === id);
      if (!inv) return;
      els.modalTitle.textContent = `Hóa đơn ${inv.id}`;
      const rows = inv.items.map(it => `<tr><td>${it.name}</td><td class="right">${fmt.money(it.price)}</td><td class="right">${it.qty}</td><td class="right">${fmt.money(it.price * it.qty)}</td></tr>`).join('');
      els.modalBody.innerHTML = `
        <div>Ngày: ${new Date(inv.createdAt).toLocaleString('vi-VN')}</div>
        <div>Khách: ${inv.customer.name}</div>
        <div class="table-wrap" style="margin-top:8px">
          <table>
            <thead><tr><th>Sản phẩm</th><th>Giá</th><th>SL</th><th>Thành tiền</th></tr></thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr><td colspan="3" class="right">Tạm tính</td><td class="right">${fmt.money(inv.subtotal ?? inv.total)}</td></tr>
              ${inv.discount ? `<tr><td colspan="3" class="right">Chiết khấu (${inv.discountRate || 0}%)</td><td class="right">${fmt.money(inv.discount)}</td></tr>` : ''}
              ${inv.vat ? `<tr><td colspan="3" class="right">VAT (${inv.vatRate || 0}%)</td><td class="right">${fmt.money(inv.vat)}</td></tr>` : ''}
              <tr><td colspan="3" class="right">Tổng thanh toán</td><td class="right">${fmt.money(inv.total)}</td></tr>
            </tfoot>
          </table>
        </div>
      `;
      els.modal.classList.remove('hidden');
      els.printInvoice.onclick = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<html><head><title>${inv.id}</title></head><body>${els.modalBody.innerHTML}</body></html>`);
        w.document.close();
        w.focus();
        w.print();
      };
    } else if (act === 'del-inv') {
      if (!confirm('Xóa hóa đơn này và hoàn lại tồn kho?')) return;
      const idx = state.invoices.findIndex(i => i.id === id);
      if (idx < 0) return;
      const inv = state.invoices[idx];
      for (const it of inv.items) {
        const p = state.products.find(x => x.id === it.id);
        if (p) p.stock += it.qty;
      }
      store.save('products', state.products);
      renderProducts();
      state.invoices.splice(idx, 1);
      store.save('invoices', state.invoices);
      renderInvoices();
      alert('Đã xóa hóa đơn và hoàn lại tồn');
    }
  });

  // export CSV
  if (els.exportCsv) {
    els.exportCsv.addEventListener('click', () => {
      if (!state.invoices.length) return;
      const header = ['id','createdAt','customer','subtotal','discount','vat','total'];
      const rows = state.invoices.map(i => [
        i.id,
        new Date(i.createdAt).toLocaleString('vi-VN'),
        i.customer.name,
        i.subtotal ?? i.total,
        i.discount ?? 0,
        i.vat ?? 0,
        i.total
      ]);
      const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `invoices_${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  // backup/restore JSON
  if (els.exportJson) {
    els.exportJson.addEventListener('click', () => {
      const data = {
        products: state.products,
        customers: state.customers,
        invoices: state.invoices
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `backup_${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
    });
  }
  if (els.importJson && els.importFile) {
    els.importJson.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', async () => {
      const file = els.importFile.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (!data || typeof data !== 'object') throw new Error('invalid');
        state.products = Array.isArray(data.products) ? data.products : [];
        state.customers = Array.isArray(data.customers) ? data.customers : [];
        state.invoices = Array.isArray(data.invoices) ? data.invoices : [];
        store.save('products', state.products);
        store.save('customers', state.customers);
        store.save('invoices', state.invoices);
        renderProducts(); renderCustomers(); renderInvoices(); renderCart();
        alert('Khôi phục dữ liệu thành công');
      } catch {
        alert('File không hợp lệ');
      } finally {
        els.importFile.value = '';
      }
    });
  }

  // modal close
  els.modalClose.addEventListener('click', () => els.modal.classList.add('hidden'));
  els.modal.addEventListener('click', (e) => { if (e.target === els.modal) els.modal.classList.add('hidden'); });

  // Init render
  renderProducts();
  renderCustomers();
  renderCart();
  renderInvoices();
})();



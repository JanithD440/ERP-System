import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

function POS() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [cashReceived, setCashReceived] = useState('');

  const fetchProducts = () => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  // Add product to cart (or increase qty if already there)
  const addToCart = (product) => {
    if (product.quantity_in_stock <= 0) {
      alert(`"${product.product_name}" is out of stock`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity_in_stock) {
          alert(`Only ${product.quantity_in_stock} units available for "${product.product_name}"`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prevCart,
        {
          product_id: product.id,
          product_name: product.product_name,
          price: parseFloat(product.price),
          quantity: 1,
          max_stock: product.quantity_in_stock
        }
      ];
    });
  };

  // Handle barcode scan / enter key search
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const match = products.find((p) => p.barcode === searchTerm.trim());
      if (match) {
        addToCart(match);
        setSearchTerm('');
      }
    }
  };

  const updateQuantity = (product_id, newQty) => {
    const item = cart.find((i) => i.product_id === product_id);
    if (newQty < 1) return;
    if (newQty > item.max_stock) {
      alert(`Only ${item.max_stock} units available`);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((i) =>
        i.product_id === product_id ? { ...i, quantity: newQty } : i
      )
    );
  };

  const removeFromCart = (product_id) => {
    setCart((prevCart) => prevCart.filter((i) => i.product_id !== product_id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const balance = cashReceived ? parseFloat(cashReceived) - cartTotal : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!cashReceived || parseFloat(cashReceived) < cartTotal) {
      alert('Cash received is less than the total amount');
      return;
    }

    setProcessing(true);

    try {
      const res = await fetch('http://localhost:5000/api/pos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity
          }))
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Checkout failed');
        setProcessing(false);
        return;
      }

     setReceipt({
        ...data,
        cash_received: parseFloat(cashReceived),
        balance: parseFloat(cashReceived) - data.grand_total
      });
      setCart([]);
      setCustomerName('');
      setCashReceived('');
      fetchProducts();

    } catch (err) {
      console.error(err);
      alert('Checkout error. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 150] // thermal receipt size (80mm width)
    });

    let y = 10;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Mini ERP Store', 40, y, { align: 'center' });
    y += 6;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('No 123, Main Street, Colombo', 40, y, { align: 'center' });
    y += 4;
    doc.text('Tel: 011-2345678', 40, y, { align: 'center' });
    y += 6;

    doc.setLineDash([1, 1], 0);
    doc.line(5, y, 75, y);
    y += 5;

    doc.setFontSize(8);
    doc.text(`Customer: ${receipt.customer_name}`, 5, y);
    y += 4;
    doc.text(`Date: ${new Date(receipt.date).toLocaleString()}`, 5, y);
    y += 4;
    doc.text(`Receipt #: ${Date.now().toString().slice(-8)}`, 5, y);
    y += 5;

    doc.line(5, y, 75, y);
    y += 5;

    doc.setFont(undefined, 'bold');
    doc.text('Item', 5, y);
    doc.text('Qty', 45, y);
    doc.text('Total', 60, y);
    doc.setFont(undefined, 'normal');
    y += 4;

    receipt.items.forEach((item) => {
      const name = item.product_name.length > 20 ? item.product_name.slice(0, 20) + '..' : item.product_name;
      doc.text(name, 5, y);
      doc.text(String(item.quantity), 47, y);
      doc.text(Number(item.total).toLocaleString(), 60, y);
      y += 4;
    });

    y += 2;
    doc.line(5, y, 75, y);
    y += 5;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Grand Total:', 5, y);
    doc.text(`Rs. ${Number(receipt.grand_total).toLocaleString()}`, 75, y, { align: 'right' });
    y += 5;

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Cash Received:', 5, y);
    doc.text(`Rs. ${Number(receipt.cash_received).toLocaleString()}`, 75, y, { align: 'right' });
    y += 4;

    doc.text('Balance:', 5, y);
    doc.text(`Rs. ${Number(receipt.balance).toLocaleString()}`, 75, y, { align: 'right' });
    y += 6;

    doc.line(5, y, 75, y);
    y += 5;

    doc.setFontSize(9);
    doc.text('Thank you for your purchase!', 40, y, { align: 'center' });

    doc.save(`Receipt-${Date.now()}.pdf`);
  };




  const closeReceipt = () => {
    setReceipt(null);
    setCashReceived('');
  };

  return (
    <div>
      <div className="app-header">
        <span style={{ fontSize: '32px' }}>🛒</span>
        <h1>Point of Sale</h1>
      </div>

      <div className="pos-layout">
        {/* Left: Product Search + Grid */}
        <div className="pos-products">
          <input
            type="text"
            className="pos-search"
            placeholder="🔍 Search or scan barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoFocus
          />

          <div className="pos-product-grid">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`pos-product-card ${product.quantity_in_stock <= 0 ? 'out-of-stock' : ''}`}
                onClick={() => addToCart(product)}
              >
                <p className="pos-product-name">{product.product_name}</p>
                <p className="pos-product-price">Rs. {Number(product.price).toLocaleString()}</p>
                <p className="pos-product-stock">
                  {product.quantity_in_stock > 0 ? `Stock: ${product.quantity_in_stock}` : 'Out of Stock'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="pos-cart">
          <h3 className="section-title">🛍️ Cart</h3>

          <input
            type="text"
            placeholder="Customer Name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="pos-customer-input"
          />

          <div className="pos-cart-items">
            {cart.length === 0 ? (
              <p className="pos-empty-cart">Cart is empty. Click a product to add.</p>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="pos-cart-item">
                  <div className="pos-cart-item-info">
                    <p className="pos-cart-item-name">{item.product_name}</p>
                    <p className="pos-cart-item-price">Rs. {item.price.toLocaleString()} each</p>
                  </div>
                  <div className="pos-cart-item-controls">
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>+</button>
                    <button className="pos-remove-btn" onClick={() => removeFromCart(item.product_id)}>🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-cart-total">
            <span>Total</span>
            <span>Rs. {cartTotal.toLocaleString()}</span>
          </div>

          <input
            type="number"
            placeholder="Cash Received (Rs.)"
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
            className="pos-cash-input"
          />

          {cashReceived && (
            <div className={`pos-balance ${balance < 0 ? 'negative' : ''}`}>
              <span>{balance < 0 ? 'Amount Short' : 'Balance to Return'}</span>
              <span>Rs. {Math.abs(balance).toLocaleString()}</span>
            </div>
          )}

          <button
            className="pos-checkout-btn"
            onClick={handleCheckout}
            disabled={processing || cart.length === 0}
          >
            {processing ? 'Processing...' : '✅ Checkout'}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <div className="receipt-overlay" onClick={closeReceipt}>
          <div className="receipt-box" onClick={(e) => e.stopPropagation()}>
            <h2>🧾 Receipt</h2>
            <p className="receipt-meta">Customer: {receipt.customer_name}</p>
            <p className="receipt-meta">Date: {new Date(receipt.date).toLocaleString()}</p>
            <div className="receipt-items">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="receipt-line">
                  <span>{item.product_name} x{item.quantity}</span>
                  <span>Rs. {Number(item.total).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="receipt-total">
              <span>Grand Total</span>
              <span>Rs. {Number(receipt.grand_total).toLocaleString()}</span>
            </div>
            <div className="receipt-line">
              <span>Cash Received</span>
              <span>Rs. {Number(receipt.cash_received).toLocaleString()}</span>
            </div>
            <div className="receipt-line receipt-balance">
              <span>Balance</span>
              <span>Rs. {Number(receipt.balance).toLocaleString()}</span>
            </div>
            <div className="receipt-actions">
              <button onClick={generatePDF}>📄 Download PDF</button>
              <button onClick={() => window.print()}>🖨️ Print</button>
              <button onClick={closeReceipt}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POS;
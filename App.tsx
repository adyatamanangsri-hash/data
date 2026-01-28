
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import { Transaction, TransactionStatus, TradeType, MasterData, SerialConfig, AppConfig, UserRole, User } from './types';

// Konfigurasi Standar Industri
const INITIAL_MASTER: MasterData = {
  suppliers: [{ name: 'CV SUMBER ALAM JAYA', address: 'Jl. Lintas Sumatera KM 12', contact: '0812-3456-7890' }],
  customers: [{ name: 'PT BANGUN INDUSTRI NUSANTARA', address: 'Kawasan Industri Jababeka', contact: '021-998877' }],
  cargoTypes: ['SAWIT (FFB)', 'CPO (CRUDE PALM OIL)', 'PK (PALM KERNEL)', 'CANGKANG', 'LIMBAH (EFB)', 'PUPUK'],
  operators: [
    { id: 'master-admin', name: 'SUPERVISOR', pin: '0000', role: UserRole.MASTER },
    { id: 'op-01', name: 'OPERATOR 1', pin: '1234', role: UserRole.OPERATOR }
  ]
};

const INITIAL_SERIAL: SerialConfig = {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  autoExtract: true
};

const INITIAL_APP_CONFIG: AppConfig = {
  companyName: 'WEIGHBRIDGE CONTROL SYSTEM',
  companyAddress: 'Sistem Timbangan Digital Industrial v2.0',
  printerMode: 'thermal',
  paperSize: '80mm',
  ticketHeader: 'STRUK RESMI TIMBANGAN JEMBATAN',
  ticketFooter: 'DATA TELAH TERCATAT SECARA SISTEMATIS',
  autoPrint: true
};

// --- COMPONENT: WEIGHING INTERFACE ---
const WeighingView: React.FC<{
  type: TradeType;
  transactions: Transaction[];
  masterData: MasterData;
  liveWeight: number;
  currentUser: User;
  onFirstWeight: (data: any, type: TradeType) => void;
  onSecondWeight: (id: string, weight2: number) => Transaction | undefined;
  onShowTicket: (tx: Transaction) => void;
  appConfig: AppConfig;
}> = ({ type, transactions, masterData, liveWeight, currentUser, onFirstWeight, onSecondWeight, onShowTicket, appConfig }) => {
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(`wt_draft_v2_${type}`);
    return saved ? JSON.parse(saved) : {
      plateNumber: '',
      driverName: '',
      cargoType: masterData.cargoTypes[0] || '',
      partyName: (type === TradeType.PENJUALAN ? masterData.customers[0]?.name : masterData.suppliers[0]?.name) || '',
    };
  });

  const [editingTxId, setEditingTxId] = useState<string | null>(() => localStorage.getItem(`wt_active_id_${type}`));
  const [lastSavedTx, setLastSavedTx] = useState<Transaction | null>(null);

  const editingTx = editingTxId ? transactions.find(t => t.id === editingTxId) : null;
  const pendingTransactions = transactions.filter(t => t.status === TransactionStatus.PENDING && t.type === type);

  // Auto-Draft Persistency
  useEffect(() => {
    localStorage.setItem(`wt_draft_v2_${type}`, JSON.stringify(formData));
    if (editingTxId) localStorage.setItem(`wt_active_id_${type}`, editingTxId);
    else localStorage.removeItem(`wt_active_id_${type}`);
  }, [formData, editingTxId, type]);

  const handleSelectPending = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setFormData({
      plateNumber: tx.plateNumber,
      driverName: tx.driverName,
      cargoType: tx.cargoType,
      partyName: tx.partyName,
    });
    setLastSavedTx(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingTxId(null);
    setFormData({
      plateNumber: '',
      driverName: '',
      cargoType: masterData.cargoTypes[0] || '',
      partyName: (type === TradeType.PENJUALAN ? masterData.customers[0]?.name : masterData.suppliers[0]?.name) || '',
    });
    localStorage.removeItem(`wt_draft_v2_${type}`);
  };

  const handleProcess = () => {
    if (editingTxId) {
      if (liveWeight < 10) return alert("Berat timbangan tidak valid untuk penimbangan kedua!");
      const result = onSecondWeight(editingTxId, liveWeight);
      if (result) {
        setLastSavedTx(result);
        onShowTicket(result);
        resetForm();
        
        if (appConfig.autoPrint) {
          setTimeout(() => {
            window.print();
          }, 500);
        }
      }
    } else {
      if (!formData.plateNumber) return alert("Mohon isi Nomor Polisi kendaraan!");
      if (liveWeight < 10) return alert("Timbangan kosong atau berat terlalu kecil!");
      
      const isAlreadyPending = pendingTransactions.some(t => t.plateNumber === formData.plateNumber);
      if (isAlreadyPending) return alert("Nomor Polisi ini sudah ada dalam antrian pending!");

      onFirstWeight(formData, type);
      resetForm();
      setLastSavedTx(null);
    }
  };

  const netto = editingTx ? Math.abs(editingTx.weight1 - liveWeight) : 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-500 pb-12">
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl border-b-[6px] border-blue-600 relative overflow-hidden group">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weight Indicator (KG)</span>
            <div className={`px-3 py-1 rounded-full text-[8px] font-black ${liveWeight > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
              {liveWeight > 0 ? '• LIVE SIGNAL' : 'NO LOAD'}
            </div>
          </div>
          <div className="flex items-baseline justify-center py-6">
            <span className="text-8xl font-black font-mono tracking-tighter text-white tabular-nums drop-shadow-lg">
              {liveWeight.toLocaleString()}
            </span>
          </div>
          <div className="text-center">
            <span className="text-blue-500 font-black text-sm uppercase tracking-widest">Kilograms</span>
          </div>
        </div>

        {editingTx && (
          <div className="bg-white rounded-[2rem] p-8 shadow-xl border-2 border-amber-400 border-dashed animate-pulse-once">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Data Perhitungan</span>
              <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Proses Ke-2</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Berat 1</span>
                <span className="text-xl font-black text-slate-700">{editingTx.weight1.toLocaleString()} KG</span>
              </div>
              <div className="flex justify-between items-center bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
                <span className="text-xs font-black uppercase">Netto Akhir</span>
                <span className="text-4xl font-black tracking-tighter">{netto.toLocaleString()} KG</span>
              </div>
            </div>
          </div>
        )}

        {lastSavedTx && (
          <div className="bg-emerald-600 text-white rounded-[2rem] p-8 shadow-xl animate-in bounce-in">
             <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2 text-center">Tiket Terakhir Disimpan</p>
             <p className="text-2xl font-black text-center mb-6">{lastSavedTx.ticketNumber}</p>
             <button onClick={() => onShowTicket(lastSavedTx)} className="w-full py-4 bg-white text-emerald-700 rounded-xl font-black text-xs uppercase shadow-md hover:scale-[1.02] active:scale-95 transition-all">
                🖨️ Cetak Ulang Tiket
             </button>
          </div>
        )}
      </div>

      <div className="xl:col-span-8">
        <div className={`bg-white rounded-[2rem] p-10 shadow-xl border-2 transition-all duration-300 ${editingTx ? 'border-amber-400 bg-amber-50/10' : 'border-slate-100'}`}>
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${editingTx ? 'bg-amber-500 shadow-amber-500/30' : 'bg-blue-600 shadow-blue-500/30'}`}>
                {editingTx ? '2' : '1'}
              </span>
              {editingTx ? 'Lengkapi Data Akhir' : `Registrasi ${type === TradeType.PENJUALAN ? 'Penjualan' : 'Pembelian'}`}
            </h2>
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase">Timestamp</p>
              <p className="text-xs font-black text-slate-900">{new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'short' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Polisi Kendaraan</label>
              <input 
                disabled={!!editingTx}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-2xl font-black uppercase tracking-widest focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-200"
                value={formData.plateNumber}
                onChange={e => setFormData({...formData, plateNumber: e.target.value.toUpperCase()})}
                placeholder="B 1234 ABC"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Pengemudi / Sopir</label>
              <input 
                disabled={!!editingTx}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-bold uppercase focus:bg-white focus:border-blue-500 outline-none transition-all"
                value={formData.driverName}
                onChange={e => setFormData({...formData, driverName: e.target.value.toUpperCase()})}
                placeholder="NAMA SOPIR"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jenis Muatan / Barang</label>
              <select 
                disabled={!!editingTx}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-black focus:bg-white outline-none"
                value={formData.cargoType}
                onChange={e => setFormData({...formData, cargoType: e.target.value})}
              >
                {masterData.cargoTypes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{type === TradeType.PENJUALAN ? 'Nama Pelanggan (Customer)' : 'Nama Pemasok (Supplier)'}</label>
              <select 
                disabled={!!editingTx}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-black focus:bg-white outline-none"
                value={formData.partyName}
                onChange={e => setFormData({...formData, partyName: e.target.value})}
              >
                {(type === TradeType.PENJUALAN ? masterData.customers : masterData.suppliers).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            {editingTx && (
              <button onClick={resetForm} className="px-10 py-6 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all">BATAL</button>
            )}
            <button 
              disabled={liveWeight < 10 || (!editingTx && !formData.plateNumber)}
              onClick={handleProcess}
              className={`flex-1 py-7 rounded-2xl font-black text-lg uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-20 disabled:grayscale ${editingTx ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20 text-white' : 'bg-blue-700 hover:bg-blue-800 shadow-blue-500/20 text-white'}`}
            >
              {editingTx ? '💾 Simpan & Cetak Tiket' : '➕ Timbang Tahap Pertama'}
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="px-10 py-6 bg-slate-900 flex justify-between items-center">
            <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Antrian Tunggu Tahap 2</h3>
            <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black">{pendingTransactions.length} UNIT</span>
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
             <table className="w-full text-left">
                <thead className="bg-slate-50 border-b sticky top-0">
                  <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-10 py-5">No. Tiket</th>
                    <th className="px-10 py-5">Kendaraan</th>
                    <th className="px-10 py-5">Muatan</th>
                    <th className="px-10 py-5 text-right">Berat 1</th>
                    <th className="px-10 py-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingTransactions.map(tx => (
                    <tr key={tx.id} className={`hover:bg-blue-50/50 transition-colors ${editingTxId === tx.id ? 'bg-amber-50' : ''}`}>
                      <td className="px-10 py-6 text-xs font-black text-slate-400">#{tx.ticketNumber}</td>
                      <td className="px-10 py-6">
                        <div className="font-black text-xl text-slate-800 uppercase tracking-tighter">{tx.plateNumber}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">{tx.driverName || '-'}</div>
                      </td>
                      <td className="px-10 py-6">
                         <div className="text-xs font-black text-blue-600 uppercase">{tx.cargoType}</div>
                         <div className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{tx.partyName}</div>
                      </td>
                      <td className="px-10 py-6 text-right font-black text-lg text-slate-700 tabular-nums">{tx.weight1.toLocaleString()} KG</td>
                      <td className="px-10 py-6 text-center">
                         <button onClick={() => handleSelectPending(tx)} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm transition-all ${editingTxId === tx.id ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white hover:bg-blue-700'}`}>PILIH</button>
                      </td>
                    </tr>
                  ))}
                  {pendingTransactions.length === 0 && (
                    <tr><td colSpan={5} className="py-20 text-center text-slate-300 italic font-black text-xs uppercase tracking-[0.2em]">Belum ada kendaraan dalam antrian</td></tr>
                  )}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('wt_tab_v2') || 'sales');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('wt_user_v2');
    return saved ? JSON.parse(saved) : null;
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => JSON.parse(localStorage.getItem('wt_data_v2') || '[]'));
  const [masterData, setMasterData] = useState<MasterData>(() => JSON.parse(localStorage.getItem('wt_master_v2') || JSON.stringify(INITIAL_MASTER)));
  const [serialConfig, setSerialConfig] = useState<SerialConfig>(() => JSON.parse(localStorage.getItem('wt_serial_v2') || JSON.stringify(INITIAL_SERIAL)));
  const [appConfig, setAppConfig] = useState<AppConfig>(() => JSON.parse(localStorage.getItem('wt_config_v2') || JSON.stringify(INITIAL_APP_CONFIG)));
  
  const [liveWeight, setLiveWeight] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<Transaction | null>(null);
  const [isSerialActive, setIsSerialActive] = useState(false);
  const [rawMonitor, setRawMonitor] = useState<string[]>([]);
  const [reportType, setReportType] = useState<TradeType>(TradeType.PENJUALAN);
  const [searchQuery, setSearchQuery] = useState('');

  // Master Data Editing state
  const [editingMaster, setEditingMaster] = useState<{ category: keyof MasterData, id: string } | null>(null);
  const [newItem, setNewItem] = useState({ name: '', pin: '' });

  const reportTransactions = useMemo(() => {
    return transactions
      .filter(t => t.status === TransactionStatus.COMPLETED && t.type === reportType)
      .filter(t => 
        t.plateNumber.includes(searchQuery) || 
        t.driverName.includes(searchQuery)
      );
  }, [transactions, reportType, searchQuery]);

  const reportStats = useMemo(() => {
    return reportTransactions.reduce((acc, curr) => ({
      totalNet: acc.totalNet + (curr.netWeight || 0),
    }), { totalNet: 0 });
  }, [reportTransactions]);
  
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const keepReading = useRef(false);

  useEffect(() => {
    localStorage.setItem('wt_data_v2', JSON.stringify(transactions));
    localStorage.setItem('wt_master_v2', JSON.stringify(masterData));
    localStorage.setItem('wt_serial_v2', JSON.stringify(serialConfig));
    localStorage.setItem('wt_config_v2', JSON.stringify(appConfig));
    localStorage.setItem('wt_tab_v2', activeTab);
    if (currentUser) localStorage.setItem('wt_user_v2', JSON.stringify(currentUser));
  }, [transactions, masterData, serialConfig, appConfig, activeTab, currentUser]);

  const disconnect = useCallback(async () => {
    keepReading.current = false;
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        await readerRef.current.releaseLock();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (e) { console.debug("Port closed"); }
    setIsSerialActive(false);
    setLiveWeight(0);
  }, []);

  const connect = useCallback(async () => {
    try {
      await disconnect();
      if (!('serial' in navigator)) return alert("Browser tidak kompatibel dengan Serial API. Gunakan Chrome atau Edge.");
      
      const port = await (navigator as any).serial.requestPort();
      await port.open({ 
        baudRate: serialConfig.baudRate,
        dataBits: serialConfig.dataBits,
        stopBits: serialConfig.stopBits,
        parity: serialConfig.parity
      });
      
      portRef.current = port;
      setIsSerialActive(true);
      keepReading.current = true;
      
      const reader = port.readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      while (keepReading.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || "";
          
          lines.forEach(line => {
            const clean = line.trim();
            if (clean) {
              setRawMonitor(prev => [clean, ...prev].slice(0, 15));
              const match = clean.match(/[-+]?\d+/);
              if (match) {
                const num = parseInt(match[0]);
                if (!isNaN(num)) setLiveWeight(Math.abs(num));
              }
            }
          });
        }
      }
    } catch (err: any) {
      alert(`Koneksi Gagal: ${err.message}`);
      setIsSerialActive(false);
    }
  }, [serialConfig, disconnect]);

  const startEditMaster = (cat: keyof MasterData, val: any) => {
    setEditingMaster({ category: cat, id: typeof val === 'string' ? val : (val.id || val.name) });
    if (cat === 'cargoTypes') {
      setNewItem({ name: val as string, pin: '' });
    } else if (cat === 'operators') {
      const op = val as User;
      setNewItem({ name: op.name, pin: op.pin });
    } else {
      setNewItem({ name: (val as any).name, pin: '' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditMaster = () => {
    setEditingMaster(null);
    setNewItem({ name: '', pin: '' });
  };

  const deleteItem = (cat: keyof MasterData, id: string) => {
    if (!confirm(`Hapus data ini?`)) return;
    setMasterData(prev => {
      const up = { ...prev };
      if (cat === 'cargoTypes') up.cargoTypes = prev.cargoTypes.filter(c => c !== id);
      else if (cat === 'operators') {
        const op = prev.operators.find(o => o.id === id);
        if (op?.role === UserRole.MASTER) return prev;
        up.operators = prev.operators.filter(o => o.id !== id);
      } else {
        // @ts-ignore
        up[cat] = prev[cat].filter((p: any) => p.name !== id);
      }
      return up;
    });
  };

  const addItem = (cat: 'suppliers'|'customers'|'cargoTypes'|'operators') => {
    if (!newItem.name) return;
    const name = newItem.name.toUpperCase().trim();
    
    setMasterData(prev => {
      const up = { ...prev };

      if (editingMaster) {
        // Logic Update
        if (cat === 'cargoTypes') {
          up.cargoTypes = prev.cargoTypes.map(c => c === editingMaster.id ? name : c);
        } else if (cat === 'operators') {
          up.operators = prev.operators.map(o => o.id === editingMaster.id ? { ...o, name, pin: newItem.pin } : o);
        } else {
          // @ts-ignore
          up[cat] = prev[cat].map((p: any) => p.name === editingMaster.id ? { ...p, name } : p);
        }
        setEditingMaster(null);
      } else {
        // Logic Tambah Baru
        if (cat === 'cargoTypes') { if(!prev.cargoTypes.includes(name)) up.cargoTypes = [...prev.cargoTypes, name]; }
        else if (cat === 'operators') {
          if (newItem.pin.length !== 4) { alert("PIN harus 4 digit"); return prev; }
          up.operators = [...prev.operators, { id: Date.now().toString(), name, pin: newItem.pin, role: UserRole.OPERATOR }];
        } else {
          // @ts-ignore
          if(!prev[cat].some(p => p.name === name)) up[cat] = [...prev[cat], { name, address: '-', contact: '-' }];
        }
      }
      return up;
    });
    setNewItem({ name: '', pin: '' });
  };

  const exportExcel = () => {
    const dataToExport = reportTransactions;
    if (dataToExport.length === 0) return alert("Tidak ada data untuk diekspor");

    let csv = "\uFEFFNo. Tiket,Tanggal,Plat,Sopir,Muatan,Pelanggan,Bruto,Tara,Netto,Operator\n";
    dataToExport.forEach(tx => {
      const b = Math.max(tx.weight1, tx.weight2 || 0);
      const t = Math.min(tx.weight1, tx.weight2 || 0);
      csv += `"${tx.ticketNumber}","${new Date(tx.timestamp2!).toLocaleDateString()}","${tx.plateNumber}","${tx.driverName}","${tx.cargoType}","${tx.partyName}",${b},${t},${tx.netWeight},"${tx.operator}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `LAPORAN_${reportType}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  if (!currentUser) {
    return (
       <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-6 z-[100] font-sans">
          <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border-t-[8px] border-blue-600 animate-in zoom-in duration-300">
             <div className="mb-10">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">🚛</div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{appConfig.companyName}</h1>
                <p className="text-[9px] font-black text-slate-400 mt-2 tracking-[0.2em] uppercase">Security Authorization Required</p>
             </div>
             <input 
               type="password" 
               className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-5xl font-black tracking-[0.5em] focus:border-blue-500 outline-none transition-all placeholder:text-slate-100" 
               placeholder="****" 
               maxLength={4} 
               autoFocus 
               onKeyUp={e => { 
                 if(e.key === 'Enter') { 
                   const pin = (e.target as HTMLInputElement).value;
                   const user = masterData.operators.find(o => o.pin === pin);
                   if(user) setCurrentUser(user);
                   else { alert('PIN tidak terdaftar!'); (e.target as HTMLInputElement).value = ''; }
                 }
               }} 
             />
             <div className="mt-8 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistem Menunggu Input PIN</span>
             </div>
          </div>
       </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      currentUser={currentUser} 
      onLogout={() => { disconnect(); setCurrentUser(null); }} 
      onBackup={() => {
        const data = { transactions, masterData, serialConfig, appConfig };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `BACKUP_SMARTSCALE_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
      }} 
      onReset={() => { if(confirm("PERINGATAN: Hapus semua data transaksi?")) setTransactions([]); }}
    >
      {(activeTab === 'sales' || activeTab === 'purchases') && (
        <WeighingView 
          type={activeTab === 'sales' ? TradeType.PENJUALAN : TradeType.PEMBELIAN}
          transactions={transactions}
          masterData={masterData}
          liveWeight={liveWeight}
          currentUser={currentUser}
          appConfig={appConfig}
          onFirstWeight={(data, type) => setTransactions(prev => [{
            id: Date.now().toString(),
            ticketNumber: `${type === TradeType.PENJUALAN ? 'OUT' : 'IN'}-${Date.now().toString().slice(-6)}`,
            ...data,
            type,
            weight1: liveWeight,
            timestamp1: Date.now(),
            status: TransactionStatus.PENDING,
            operator: currentUser.name,
            recordedByRole: currentUser.role
          }, ...prev])}
          onSecondWeight={(id, weight2) => {
             const tx = transactions.find(t => t.id === id);
             if(!tx) return;
             const updated = { ...tx, weight2, netWeight: Math.abs(tx.weight1 - weight2), timestamp2: Date.now(), status: TransactionStatus.COMPLETED };
             setTransactions(prev => prev.map(t => t.id === id ? updated : t));
             return updated;
          }}
          onShowTicket={setSelectedTicket}
        />
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 bg-white p-8 rounded-[2rem] shadow-xl border-l-8 border-blue-600">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Total Transaksi</p>
                 <p className="text-4xl font-black text-slate-900">{reportTransactions.length.toLocaleString()} <span className="text-xs opacity-40">Unit</span></p>
              </div>
              <div className="flex-1 bg-slate-900 p-8 rounded-[2rem] shadow-xl">
                 <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Akumulasi Netto</p>
                 <p className="text-4xl font-black text-white">{reportStats.totalNet.toLocaleString()} <span className="text-xs opacity-30 text-blue-400">KG</span></p>
              </div>
           </div>

           <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-100">
              <div className="flex border-b">
                 <button onClick={() => setReportType(TradeType.PENJUALAN)} className={`flex-1 py-6 font-black text-[10px] uppercase tracking-widest ${reportType === TradeType.PENJUALAN ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>📤 Penjualan</button>
                 <button onClick={() => setReportType(TradeType.PEMBELIAN)} className={`flex-1 py-6 font-black text-[10px] uppercase tracking-widest ${reportType === TradeType.PEMBELIAN ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>📥 Pembelian</button>
              </div>
              <div className="p-8 flex flex-col md:flex-row gap-4 items-center bg-slate-50/50">
                 <input 
                   className="flex-1 p-5 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all text-sm" 
                   placeholder="Cari Plat atau Sopir..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value.toUpperCase())}
                 />
                 <button onClick={exportExcel} className="px-8 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95">📊 EXPORT EXCEL (CSV)</button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b">
                       <tr className="font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-8 py-6">No. Tiket</th>
                          <th className="px-8 py-6">Kendaraan</th>
                          <th className="px-8 py-6 text-right">Bruto</th>
                          <th className="px-8 py-6 text-right">Tara</th>
                          <th className="px-8 py-6 text-right">Netto</th>
                          <th className="px-8 py-6 text-center">Aksi</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {reportTransactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-blue-50/40 transition-colors">
                             <td className="px-8 py-6">
                                <div className="font-black text-slate-900">#{tx.ticketNumber}</div>
                                <div className="opacity-40 text-[9px] font-bold">{new Date(tx.timestamp2!).toLocaleString()}</div>
                             </td>
                             <td className="px-8 py-6">
                                <div className="font-black text-lg text-slate-800">{tx.plateNumber}</div>
                                <div className="text-[10px] font-black text-blue-500">{tx.cargoType}</div>
                             </td>
                             <td className="px-8 py-6 text-right font-bold text-slate-400">{Math.max(tx.weight1, tx.weight2!).toLocaleString()}</td>
                             <td className="px-8 py-6 text-right font-bold text-slate-400">{Math.min(tx.weight1, tx.weight2!).toLocaleString()}</td>
                             <td className="px-8 py-6 text-right font-black text-xl text-slate-900 tabular-nums">{tx.netWeight?.toLocaleString()}</td>
                             <td className="px-8 py-6 text-center">
                                <button onClick={() => setSelectedTicket(tx)} className="p-4 bg-slate-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all">🖨️</button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'master' && currentUser.role === UserRole.MASTER && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4">
           {['suppliers', 'customers', 'cargoTypes', 'operators'].map(cat => (
             <div key={cat} className={`bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col h-[550px] border-2 transition-colors ${editingMaster?.category === cat ? 'border-amber-400 ring-4 ring-amber-400/10' : 'border-slate-100'}`}>
                <div className={`p-6 text-white font-black uppercase text-xs tracking-widest ${editingMaster?.category === cat ? 'bg-amber-500' : 'bg-slate-800'}`}>
                  {editingMaster?.category === cat ? '✍️ Mode Edit' : cat.replace('cargoTypes', 'Muatan').replace('operators', 'Operator')}
                </div>
                <div className="p-6 bg-slate-50 flex flex-col gap-2">
                   <input 
                     className="w-full p-3 border rounded-xl font-bold text-xs uppercase focus:border-blue-500" 
                     placeholder={editingMaster?.category === cat ? "Ubah Nama..." : "Tambah Baru..."}
                     value={newItem.name} 
                     onChange={e => setNewItem({...newItem, name: e.target.value})}
                   />
                   {cat === 'operators' && (
                     <input 
                        className="w-full p-3 border rounded-xl font-bold text-xs" 
                        placeholder="PIN (4 Digit)" 
                        maxLength={4} 
                        value={newItem.pin}
                        onChange={e => setNewItem({...newItem, pin: e.target.value.replace(/\D/g, '')})}
                     />
                   )}
                   <div className="flex gap-2">
                      <button onClick={() => addItem(cat as any)} className={`flex-1 py-3 rounded-xl font-black text-xs uppercase text-white ${editingMaster?.category === cat ? 'bg-amber-600' : 'bg-blue-600'}`}>
                        {editingMaster?.category === cat ? 'UPDATE' : 'TAMBAH'}
                      </button>
                      {editingMaster?.category === cat && (
                        <button onClick={cancelEditMaster} className="px-4 py-3 bg-slate-200 text-slate-500 rounded-xl font-black text-xs uppercase">X</button>
                      )}
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                   {(cat === 'cargoTypes' ? masterData.cargoTypes : 
                     // @ts-ignore
                     masterData[cat]).map((val: any, i: number) => {
                     const identifier = typeof val === 'string' ? val : (val.id || val.name);
                     const label = typeof val === 'string' ? val : (cat === 'operators' ? `${val.name} (${val.role})` : val.name);
                     
                     return (
                       <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200">
                          <span className="font-bold text-[10px] uppercase truncate mr-2">{label}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => startEditMaster(cat as any, val)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">✏️</button>
                             <button onClick={() => deleteItem(cat as any, identifier)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">🗑️</button>
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'setup' && currentUser.role === UserRole.MASTER && (
         <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-4">
                  <span className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">🔌</span> Komunikasi RS232
               </h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Baud Rate</label>
                     <select 
                       className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs focus:bg-white"
                       value={serialConfig.baudRate}
                       onChange={e => setSerialConfig({...serialConfig, baudRate: parseInt(e.target.value)})}
                     >
                        {[1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200].map(b => <option key={b} value={b}>{b}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Parity</label>
                     <select 
                       className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs focus:bg-white"
                       value={serialConfig.parity}
                       onChange={e => setSerialConfig({...serialConfig, parity: e.target.value as any})}
                     >
                        {['none', 'even', 'odd'].map(p => <option key={p} value={p}>{p}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data Bits</label>
                     <select 
                       className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs focus:bg-white"
                       value={serialConfig.dataBits}
                       onChange={e => setSerialConfig({...serialConfig, dataBits: parseInt(e.target.value)})}
                     >
                        {[7, 8].map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Stop Bits</label>
                     <select 
                       className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs focus:bg-white"
                       value={serialConfig.stopBits}
                       onChange={e => setSerialConfig({...serialConfig, stopBits: parseInt(e.target.value)})}
                     >
                        {[1, 2].map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                  </div>
               </div>
               <div className="flex gap-4 mb-8">
                  <button onClick={connect} className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all ${isSerialActive ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                     {isSerialActive ? '🟢 PORT TERHUBUNG' : '🔌 BUKA PORT SERIAL'}
                  </button>
                  <button onClick={disconnect} className="px-8 py-5 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px] border border-red-100">PUTUSKAN</button>
               </div>
               
               <div className="bg-slate-900 rounded-2xl p-6 shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                     <p className="text-emerald-500 font-mono text-[9px] uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Terminal Monitor
                     </p>
                     <button onClick={() => setRawMonitor([])} className="text-[8px] font-black text-slate-500 hover:text-white uppercase">Hapus Log</button>
                  </div>
                  <div className="h-40 overflow-y-auto font-mono text-emerald-400/80 text-[10px] custom-scrollbar space-y-1">
                     {rawMonitor.length === 0 && <p className="opacity-20 italic">Menunggu data timbangan...</p>}
                     {rawMonitor.map((l, i) => <div key={i} className="border-l border-emerald-900 pl-3 py-0.5">{l}</div>)}
                  </div>
               </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-4">
                  <span className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">🏛️</span> Identitas & Printer
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase">Nama Instansi / Perusahaan</label>
                     <input className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs" value={appConfig.companyName} onChange={e => setAppConfig({...appConfig, companyName: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase">Alamat Lokasi</label>
                     <input className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs" value={appConfig.companyAddress} onChange={e => setAppConfig({...appConfig, companyAddress: e.target.value})} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase">Header Tiket</label>
                     <input className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs" value={appConfig.ticketHeader} onChange={e => setAppConfig({...appConfig, ticketHeader: e.target.value})} />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase">Footer Tiket</label>
                     <input className="w-full p-4 bg-slate-50 border rounded-xl font-black text-xs" value={appConfig.ticketFooter} onChange={e => setAppConfig({...appConfig, ticketFooter: e.target.value})} />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                     <div className="flex-1">
                        <p className="text-xs font-black text-blue-900 uppercase">Cetak Otomatis (Auto-Print)</p>
                        <p className="text-[9px] text-blue-700 uppercase">Langsung memanggil dialog cetak setelah timbang kedua disimpan.</p>
                     </div>
                     <button 
                        onClick={() => setAppConfig({...appConfig, autoPrint: !appConfig.autoPrint})}
                        className={`w-14 h-8 rounded-full p-1 transition-all ${appConfig.autoPrint ? 'bg-blue-600' : 'bg-slate-300'}`}
                     >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all transform ${appConfig.autoPrint ? 'translate-x-6' : 'translate-x-0'}`}></div>
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-[2rem] p-12 font-mono text-slate-900 border-t-[16px] border-blue-600 shadow-2xl w-[450px] animate-in zoom-in duration-300">
              <div className="text-center border-b-2 border-slate-900 pb-8 mb-8">
                 <h2 className="font-black text-xl uppercase tracking-tighter mb-1">{appConfig.companyName}</h2>
                 <p className="text-[9px] font-black uppercase opacity-60">{appConfig.companyAddress}</p>
                 <div className="mt-4 bg-slate-100 py-1 text-[10px] font-black uppercase tracking-widest">{appConfig.ticketHeader}</div>
              </div>
              <div className="space-y-3 text-[12px] font-bold uppercase">
                 <div className="flex justify-between"><span>NO TIKET</span><span className="font-black">#{selectedTicket.ticketNumber}</span></div>
                 <div className="flex justify-between"><span>TANGGAL</span><span>{new Date(selectedTicket.timestamp2!).toLocaleDateString()}</span></div>
                 <div className="flex justify-between"><span>JAM</span><span>{new Date(selectedTicket.timestamp2!).toLocaleTimeString()}</span></div>
                 <div className="py-4 my-4 border-y-2 border-slate-900 flex justify-between items-center">
                    <span className="text-sm font-black">PLAT NOMOR</span>
                    <span className="text-3xl font-black tracking-tighter">{selectedTicket.plateNumber}</span>
                 </div>
                 <div className="flex justify-between"><span>PENGEMUDI</span><span>{selectedTicket.driverName || '-'}</span></div>
                 <div className="flex justify-between"><span>MUATAN</span><span className="font-black">{selectedTicket.cargoType}</span></div>
                 <div className="flex justify-between"><span>ASAL/TUJUAN</span><span className="font-black text-right">{selectedTicket.partyName}</span></div>
                 <div className="pt-6 mt-6 space-y-2 border-t-2 border-slate-100">
                    <div className="flex justify-between"><span>BRUTO</span><span className="tabular-nums">{Math.max(selectedTicket.weight1, selectedTicket.weight2!).toLocaleString()} KG</span></div>
                    <div className="flex justify-between"><span>TARA</span><span className="tabular-nums">{Math.min(selectedTicket.weight1, selectedTicket.weight2!).toLocaleString()} KG</span></div>
                    <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-2xl mt-4">
                       <span className="font-black text-sm">NETTO AKHIR</span>
                       <span className="text-4xl font-black tabular-nums tracking-tighter">{selectedTicket.netWeight?.toLocaleString()} KG</span>
                    </div>
                 </div>
                 <div className="pt-10 flex justify-between text-[9px] opacity-40 italic">
                    <span>OP: {selectedTicket.operator}</span>
                    <span>PRO: {selectedTicket.recordedByRole}</span>
                 </div>
                 <p className="text-[9px] text-center mt-6 opacity-60">{appConfig.ticketFooter}</p>
              </div>
              <div className="mt-12 flex gap-4 no-print">
                 <button onClick={() => window.print()} className="flex-1 bg-blue-700 text-white py-5 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-blue-800 active:scale-95 transition-all">🖨️ Cetak Struk</button>
                 <button onClick={() => setSelectedTicket(null)} className="px-8 py-5 bg-slate-100 text-slate-400 rounded-xl font-black text-xs uppercase hover:bg-slate-200">Tutup</button>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;

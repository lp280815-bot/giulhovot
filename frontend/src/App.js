import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Upload, FileSpreadsheet, Users, Settings, Zap, Building2, FileText, Download, Trash2, Plus, X, Loader2, ChevronDown, Check, AlertCircle, BarChart3, Mail, RefreshCw } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Navigation Tabs
const NavTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "processing", label: "עיבוד", icon: Zap },
    { id: "suppliers", label: "ספקים", icon: Users },
    { id: "settings", label: "כללים", icon: Settings },
    { id: "history", label: "היסטוריה", icon: BarChart3 },
  ];

  return (
    <div className="flex items-center gap-2 bg-white rounded-full px-2 py-1 shadow-sm border border-gray-100" data-testid="nav-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
            activeTab === tab.id
              ? "bg-[#00CDB8] text-white shadow-md"
              : "text-gray-600 hover:bg-gray-100"
          }`}
          data-testid={`tab-${tab.id}`}
        >
          <tab.icon size={18} />
          <span className="font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

// Header Component
const Header = ({ activeTab, setActiveTab }) => {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50" data-testid="header">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-[#00CDB8]">RISE</span>
              <span className="text-xs bg-[#00CDB8] text-white px-2 py-0.5 rounded-md font-semibold">PRO</span>
            </div>
            <span className="text-sm text-gray-500">הנהלת חשבונות מתקדמת</span>
          </div>

          {/* Navigation */}
          <NavTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>לקוח:</span>
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <Settings size={16} className="text-gray-400" />
                <span>החברה המרכזית למימוש</span>
                <ChevronDown size={16} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// Upload Card Component
const UploadCard = ({ title, description, icon: Icon, onFileSelect, file, onRemove, accept = ".xlsx" }) => {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.xlsx')) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center hover:border-[#00CDB8] transition-all duration-300 cursor-pointer group"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      data-testid={`upload-card-${title}`}
    >
      {file ? (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-[#00CDB8]/10 rounded-2xl flex items-center justify-center">
            <Check size={32} className="text-[#00CDB8]" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-red-500 hover:text-red-600 flex items-center gap-1 mx-auto text-sm"
            data-testid="remove-file-btn"
          >
            <Trash2 size={16} />
            <span>הסר קובץ</span>
          </button>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input
            type="file"
            className="hidden"
            accept={accept}
            onChange={(e) => e.target.files[0] && onFileSelect(e.target.files[0])}
            data-testid="file-input"
          />
          <div className="w-16 h-16 mx-auto bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-[#00CDB8]/10 transition-colors">
            <Icon size={32} className="text-gray-400 group-hover:text-[#00CDB8] transition-colors" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
          <p className="text-xs text-gray-400 mt-2">גרור קובץ או לחץ לבחירה</p>
        </label>
      )}
    </div>
  );
};

// Stats Card
const StatsCard = ({ label, value, color }) => (
  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm" data-testid={`stats-${label}`}>
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  </div>
);

// Processing Tab
const ProcessingTab = () => {
  const [mainFile, setMainFile] = useState(null);
  const [helperFile, setHelperFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [n8nClient, setN8nClient] = useState("");
  const [n8nSending, setN8nSending] = useState(false);
  const [n8nSuccess, setN8nSuccess] = useState(false);

  const handleProcess = async () => {
    if (!mainFile) return;

    setIsProcessing(true);
    setError(null);
    setStats(null);

    try {
      const formData = new FormData();
      formData.append("main_file", mainFile);
      if (helperFile) {
        formData.append("helper_file", helperFile);
      }

      const response = await axios.post(`${API}/process-excel`, formData, {
        responseType: "blob",
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Get stats from headers
      const newStats = {
        green: parseInt(response.headers["x-stats-green"] || "0"),
        orange: parseInt(response.headers["x-stats-orange"] || "0"),
        purple: parseInt(response.headers["x-stats-purple"] || "0"),
        blue: parseInt(response.headers["x-stats-blue"] || "0"),
        total: parseInt(response.headers["x-stats-total"] || "0"),
        emails: parseInt(response.headers["x-stats-emails"] || "0"),
      };
      setStats(newStats);

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `processed_${mainFile.name}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      // Handle error response that might be a blob
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          setError(json.detail || "שגיאה בעיבוד הקובץ");
        } catch {
          setError("שגיאה בעיבוד הקובץ");
        }
      } else {
        setError(err.response?.data?.detail || "שגיאה בעיבוד הקובץ");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleN8NTrigger = async () => {
    if (!n8nClient.trim()) return;
    
    setN8nSending(true);
    setN8nSuccess(false);
    
    try {
      await axios.post(`${API}/trigger-n8n`, { client_name: n8nClient });
      setN8nSuccess(true);
      setTimeout(() => setN8nSuccess(false), 3000);
    } catch (err) {
      setError("שליחת הטריגר נכשלה");
    } finally {
      setN8nSending(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="processing-tab">
      {/* Hero Section */}
      <div className="text-center py-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-3xl font-bold text-[#00CDB8]">RISE</span>
          <span className="text-xs bg-[#00CDB8] text-white px-2 py-1 rounded-md font-semibold">PRO</span>
        </div>
        <p className="text-sm text-[#00CDB8] mb-4">הנהלת חשבונות מתקדמת</p>
        <h1 className="text-4xl font-bold text-gray-800">
          <span className="text-[#00CDB8]">אופטימיזציה פיננסית</span> בלחיצת כפתור
        </h1>
      </div>

      {/* Upload Cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <UploadCard
          title="קובץ דף בנק"
          description="העלה קובץ DataSheet"
          icon={Building2}
          file={mainFile}
          onFileSelect={setMainFile}
          onRemove={() => setMainFile(null)}
        />
        <UploadCard
          title="קובץ עזר מסב"
          description="להתאמות מקבץ-נט"
          icon={FileText}
          file={helperFile}
          onFileSelect={setHelperFile}
          onRemove={() => setHelperFile(null)}
        />
      </div>

      {/* Process Button */}
      <div className="flex justify-center">
        <button
          onClick={handleProcess}
          disabled={!mainFile || isProcessing}
          className={`flex items-center gap-3 px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 ${
            mainFile && !isProcessing
              ? "bg-[#00CDB8] text-white hover:bg-[#00B5A3] shadow-lg hover:shadow-xl"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          data-testid="process-btn"
        >
          {isProcessing ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span>מעבד...</span>
            </>
          ) : (
            <>
              <Zap size={24} />
              <span>הפעל עיבוד</span>
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3" data-testid="error-message">
          <AlertCircle className="text-red-500" size={24} />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="mr-auto">
            <X size={20} className="text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* Stats Display */}
      {stats && (
        <div className="max-w-4xl mx-auto" data-testid="stats-display">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">תוצאות העיבוד</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard label="התאמה 100%" value={stats.green} color="bg-green-500" />
            <StatsCard label="התאמה 80%" value={stats.orange} color="bg-orange-500" />
            <StatsCard label="בדיקת ספקים" value={stats.purple} color="bg-purple-500" />
            <StatsCard label="מיילים נוצרו" value={stats.emails} color="bg-blue-500" />
          </div>
        </div>
      )}

      {/* N8N Trigger Section */}
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" data-testid="n8n-section">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Mail size={20} className="text-[#00CDB8]" />
          <span>טריגר לN8N</span>
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={n8nClient}
            onChange={(e) => setN8nClient(e.target.value)}
            placeholder="שם לקוח / ספק"
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8] focus:ring-2 focus:ring-[#00CDB8]/20"
            data-testid="n8n-input"
          />
          <button
            onClick={handleN8NTrigger}
            disabled={!n8nClient.trim() || n8nSending}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              n8nClient.trim() && !n8nSending
                ? "bg-[#00CDB8] text-white hover:bg-[#00B5A3]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            data-testid="n8n-trigger-btn"
          >
            {n8nSending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : n8nSuccess ? (
              <Check size={20} />
            ) : (
              "שלח"
            )}
          </button>
        </div>
        {n8nSuccess && (
          <p className="text-sm text-green-600 mt-2">הטריגר נשלח בהצלחה!</p>
        )}
      </div>
    </div>
  );
};

// Suppliers Tab
const SuppliersTab = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    account_number: "",
    name: "",
    currency: "ש\"ח",
    vat_number: "",
    purchase_account: "",
    purchase_account_desc: "",
    email: "",
    phone: "",
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/suppliers`);
      setSuppliers(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await axios.put(`${API}/suppliers/${editingSupplier.id}`, formData);
      } else {
        await axios.post(`${API}/suppliers`, formData);
      }
      fetchSuppliers();
      setShowForm(false);
      setEditingSupplier(null);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      account_number: "",
      name: "",
      currency: "ש\"ח",
      vat_number: "",
      purchase_account: "",
      purchase_account_desc: "",
      email: "",
      phone: "",
    });
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      account_number: supplier.account_number,
      name: supplier.name,
      currency: supplier.currency || "ש\"ח",
      vat_number: supplier.vat_number || "",
      purchase_account: supplier.purchase_account || "",
      purchase_account_desc: supplier.purchase_account_desc || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("האם למחוק ספק זה?")) return;
    try {
      await axios.delete(`${API}/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("האם למחוק את כל הספקים? פעולה זו בלתי הפיכה!")) return;
    if (!window.confirm("האם את/ה בטוח/ה? כל הספקים יימחקו לצמיתות!")) return;
    try {
      await axios.delete(`${API}/suppliers`);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleImport = async (replaceAll = false) => {
    if (!importFile) return;
    
    setImporting(true);
    setImportResult(null);
    
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      
      const response = await axios.post(
        `${API}/suppliers/import?replace_all=${replaceAll}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      
      setImportResult(response.data);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      setImportResult({ 
        errors: 1, 
        error_messages: [err.response?.data?.detail || "שגיאה בייבוא הקובץ"] 
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API}/suppliers/template`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "suppliers_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/suppliers/export`, {
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "suppliers_export.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.account_number?.includes(searchTerm) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="suppliers-tab">
      {/* Header with Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">ניהול ספקים ({suppliers.length})</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors"
            data-testid="download-template-btn"
          >
            <Download size={18} />
            <span>תבנית</span>
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors"
            data-testid="import-btn"
          >
            <Upload size={18} />
            <span>ייבוא מאקסל</span>
          </button>
          <button
            onClick={handleExport}
            disabled={suppliers.length === 0}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="export-btn"
          >
            <Download size={18} />
            <span>ייצוא</span>
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingSupplier(null);
              resetForm();
            }}
            className="flex items-center gap-2 bg-[#00CDB8] text-white px-4 py-2 rounded-xl hover:bg-[#00B5A3] transition-colors"
            data-testid="add-supplier-btn"
          >
            <Plus size={18} />
            <span>הוסף ספק</span>
          </button>
          {suppliers.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors"
              data-testid="delete-all-btn"
            >
              <Trash2 size={18} />
              <span>מחק הכל</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="חיפוש לפי שם, מספר חשבון או מייל..."
          className="w-full px-4 py-2 focus:outline-none"
          data-testid="search-suppliers"
        />
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">ייבוא ספקים מאקסל</h3>
              <button onClick={() => { setShowImport(false); setImportFile(null); setImportResult(null); }}>
                <X size={24} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* File Upload */}
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  importFile ? "border-[#00CDB8] bg-[#00CDB8]/5" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {importFile ? (
                  <div className="space-y-2">
                    <Check size={32} className="mx-auto text-[#00CDB8]" />
                    <p className="font-medium">{importFile.name}</p>
                    <button 
                      onClick={() => setImportFile(null)}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      הסר קובץ
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx"
                      onChange={(e) => e.target.files[0] && setImportFile(e.target.files[0])}
                    />
                    <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">לחץ לבחירת קובץ או גרור לכאן</p>
                    <p className="text-sm text-gray-400 mt-1">קבצי xlsx בלבד</p>
                  </label>
                )}
              </div>

              {/* Import Result */}
              {importResult && (
                <div className={`p-4 rounded-xl ${importResult.errors > 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {importResult.errors > 0 ? (
                      <AlertCircle className="text-red-500" size={20} />
                    ) : (
                      <Check className="text-green-500" size={20} />
                    )}
                    <span className="font-medium">
                      {importResult.errors > 0 ? "הייבוא הסתיים עם שגיאות" : "הייבוא הסתיים בהצלחה!"}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p>סה״כ שורות: {importResult.total}</p>
                    <p className="text-green-600">ספקים חדשים: {importResult.imported}</p>
                    <p className="text-blue-600">ספקים עודכנו: {importResult.updated}</p>
                    {importResult.errors > 0 && (
                      <p className="text-red-600">שגיאות: {importResult.errors}</p>
                    )}
                    {importResult.error_messages?.length > 0 && (
                      <div className="mt-2 text-red-600">
                        {importResult.error_messages.slice(0, 5).map((msg, i) => (
                          <p key={i}>{msg}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleImport(false)}
                  disabled={!importFile || importing}
                  className="flex-1 bg-[#00CDB8] text-white py-3 rounded-xl font-medium hover:bg-[#00B5A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? <Loader2 className="mx-auto animate-spin" size={20} /> : "ייבוא והוספה"}
                </button>
                <button
                  onClick={() => handleImport(true)}
                  disabled={!importFile || importing}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? <Loader2 className="mx-auto animate-spin" size={20} /> : "החלף הכל"}
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center">
                * &quot;ייבוא והוספה&quot; - מוסיף ספקים חדשים ומעדכן קיימים לפי מספר חשבון<br/>
                * &quot;החלף הכל&quot; - מוחק את כל הספקים הקיימים ומייבא מחדש
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="supplier-form-modal">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                {editingSupplier ? "עריכת ספק" : "הוספת ספק חדש"}
              </h3>
              <button onClick={() => setShowForm(false)}>
                <X size={24} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מס׳ ספק *</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8]"
                    required
                    data-testid="supplier-account-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם ספק *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8]"
                    required
                    data-testid="supplier-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מטבע</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מס. עוסק מורשה</label>
                  <input
                    type="text"
                    value={formData.vat_number}
                    onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">חשבון קניות</label>
                  <input
                    type="text"
                    value={formData.purchase_account}
                    onChange={(e) => setFormData({ ...formData, purchase_account: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תאור חשבון קניות</label>
                  <input
                    type="text"
                    value={formData.purchase_account_desc}
                    onChange={(e) => setFormData({ ...formData, purchase_account_desc: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">טלפון</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8]"
                    data-testid="supplier-phone-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מייל</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8]"
                    data-testid="supplier-email-input"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-[#00CDB8] text-white py-3 rounded-xl font-medium hover:bg-[#00B5A3] transition-colors"
                  data-testid="supplier-submit-btn"
                >
                  {editingSupplier ? "שמור שינויים" : "הוסף ספק"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-[#00CDB8]" />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">{searchTerm ? "לא נמצאו ספקים תואמים" : "אין ספקים במערכת"}</p>
          {!searchTerm && (
            <button
              onClick={() => setShowImport(true)}
              className="mt-4 text-[#00CDB8] hover:underline"
            >
              ייבא ספקים מקובץ אקסל
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
          <table className="w-full" data-testid="suppliers-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-right text-sm font-semibold text-gray-600 whitespace-nowrap">מס׳ ספק</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-gray-600 whitespace-nowrap">שם ספק</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-gray-600 whitespace-nowrap">עוסק מורשה</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-gray-600 whitespace-nowrap">חשבון קניות</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-gray-600 whitespace-nowrap min-w-[200px]">תאור חשבון קניות</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-gray-600 whitespace-nowrap min-w-[120px]">טלפון</th>
                <th className="px-3 py-3 text-right text-sm font-semibold text-gray-600 whitespace-nowrap">מייל</th>
                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-600 whitespace-nowrap">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50" data-testid={`supplier-row-${supplier.id}`}>
                  <td className="px-3 py-3 text-sm text-gray-800">{supplier.account_number}</td>
                  <td className="px-3 py-3 text-sm text-gray-800 font-medium">{supplier.name}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{supplier.vat_number || "-"}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{supplier.purchase_account || "-"}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{supplier.purchase_account_desc || "-"}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{supplier.phone || "-"}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{supplier.email || "-"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleEdit(supplier)}
                        className="p-2 text-gray-400 hover:text-[#00CDB8] hover:bg-[#00CDB8]/10 rounded-lg transition-colors"
                        title="עריכה"
                        data-testid={`edit-supplier-${supplier.id}`}
                      >
                        <Settings size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="מחיקה"
                        data-testid={`delete-supplier-${supplier.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Settings Tab
const SettingsTab = () => {
  return (
    <div className="space-y-6" data-testid="settings-tab">
      <h2 className="text-2xl font-bold text-gray-800">כללים והגדרות</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Logic 1 - Green */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <h3 className="text-lg font-semibold text-gray-800">התאמה 100% (ירוק)</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            מזהה שורות עם סכומים מתאימים בדיוק (חיוב וזיכוי שווים) בתוך אותו ספק.
            צובע את התאים בירוק ויוצר גיליון סיכום.
          </p>
        </div>

        {/* Logic 3 - Orange */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
            <h3 className="text-lg font-semibold text-gray-800">התאמה 80% (כתום)</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            מזהה שורות עם סכומים קרובים (הפרש עד ₪2) בתוך אותו ספק.
            צובע את התאים בכתום עבור התאמות חלקיות.
          </p>
        </div>

        {/* Logic 5 - Purple */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-purple-500" />
            <h3 className="text-lg font-semibold text-gray-800">בדיקת ספקים (סגול)</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            בדיקה גלובלית בין ספקים שונים - מחפש התאמות סכומים בין כל השורות.
            מסייע בזיהוי טעויות בהקלדת מספר ספק.
          </p>
        </div>

        {/* Logic 6 - Blue */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <h3 className="text-lg font-semibold text-gray-800">העברות בנקאיות (כחול)</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            מזהה תנועות מסוג &quot;העב&quot; (העברה בנקאית) ויוצר אוטומטית
            טקסט מייל לספק עם פרטי החשבוניות החסרות.
          </p>
        </div>
      </div>

      {/* N8N Integration Info */}
      <div className="bg-gradient-to-r from-[#00CDB8]/10 to-[#00CDB8]/5 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Zap size={20} className="text-[#00CDB8]" />
          אינטגרציה עם N8N
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          המערכת מחוברת ל-N8N לאוטומציות מתקדמות. ניתן לשלוח טריגרים ישירות מהמערכת
          לזרימות עבודה אוטומטיות, כולל שליחת מיילים, עדכון Google Sheets, ועוד.
        </p>
      </div>
    </div>
  );
};

// History Tab
const HistoryTab = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/processing-history`);
      setHistory(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6" data-testid="history-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">היסטוריית עיבודים</h2>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 text-[#00CDB8] hover:bg-[#00CDB8]/10 px-4 py-2 rounded-xl transition-colors"
          data-testid="refresh-history-btn"
        >
          <RefreshCw size={18} />
          <span>רענן</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-[#00CDB8]" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">אין היסטוריית עיבודים</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
              data-testid={`history-item-${item.id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileSpreadsheet size={20} className="text-[#00CDB8]" />
                    <span className="font-semibold text-gray-800">{item.filename}</span>
                  </div>
                  <p className="text-sm text-gray-500">{formatDate(item.processed_at)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  item.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {item.status === "completed" ? "הושלם" : "בעיבוד"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-lg font-bold text-gray-800">{item.green_matches}</span>
                  </div>
                  <p className="text-xs text-gray-500">100%</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-lg font-bold text-gray-800">{item.orange_matches}</span>
                  </div>
                  <p className="text-xs text-gray-500">80%</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-lg font-bold text-gray-800">{item.purple_matches}</span>
                  </div>
                  <p className="text-xs text-gray-500">בדיקה</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-lg font-bold text-gray-800">{item.blue_matches}</span>
                  </div>
                  <p className="text-xs text-gray-500">מיילים</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main App Component
function App() {
  const [activeTab, setActiveTab] = useState("processing");

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "processing" && <ProcessingTab />}
        {activeTab === "suppliers" && <SuppliersTab />}
        {activeTab === "settings" && <SettingsTab />}
        {activeTab === "history" && <HistoryTab />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>© 2025 RISE Pro - הנהלת חשבונות מתקדמת</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

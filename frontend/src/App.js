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
                <span>אילן גינון ופיתוח בע&quot;מ</span>
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [processedFileUrl, setProcessedFileUrl] = useState(null);
  const [processedFileName, setProcessedFileName] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filters, setFilters] = useState({ account: "", name: "", amount: "" });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [movingRow, setMovingRow] = useState(null);
  const [emailModal, setEmailModal] = useState(null); // For email modal
  const [supplierInfo, setSupplierInfo] = useState(null); // Supplier email/phone
  const [emailText, setEmailText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({ email: "", phone: "" });
  const [savingSupplier, setSavingSupplier] = useState(false);

  // Get email settings from localStorage
  const getEmailSettings = () => {
    const settings = localStorage.getItem("emailSettings");
    return settings ? JSON.parse(settings) : {
      companyEmail: "office@ilang.co.il",
      signerName: "ילנה זמליאנסקי",
      companyName: "אילן גינון ופיתוח בע\"מ"
    };
  };

  // Open email modal for a row
  const openEmailModal = async (row) => {
    setEmailModal(row);
    const settings = getEmailSettings();
    
    // Subject
    setEmailSubject("בקשה לחשבונית חסרה בגין העברה");
    
    // Generate email text with new template
    const defaultText = `שלום רב,

בהמשך לבדיקתנו, חסרה לנו חשבונית בגין העברה שבוצעה.

ספק: ${row.name}
סכום: ${row.amount?.toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪
תאריך: ${row.date}

נבקש לקבל את החשבונית בהקדם האפשרי לצורך השלמת הרישומים.
אשמח לקבל חשבונית חסרה במייל: ${settings.companyEmail}

בברכה,
${settings.signerName}
${settings.companyName}`;
    setEmailText(defaultText);
    
    // Fetch supplier info
    try {
      const response = await axios.get(`${API}/suppliers`);
      const suppliers = response.data;
      // Find supplier by account number or name
      const supplier = suppliers.find(s => 
        s.account_number === row.account || 
        s.name === row.name ||
        s.account_number === String(row.account)
      );
      setSupplierInfo(supplier || null);
    } catch (err) {
      console.error("Error fetching supplier:", err);
      setSupplierInfo(null);
    }
  };

  // Send email (opens default email client)
  const handleSendEmail = () => {
    if (!supplierInfo?.email) {
      alert("לא נמצא מייל לספק זה");
      return;
    }
    const subject = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(emailText);
    window.open(`mailto:${supplierInfo.email}?subject=${subject}&body=${body}`);
  };

  // Send WhatsApp
  const handleSendWhatsApp = () => {
    if (!supplierInfo?.phone) {
      alert("לא נמצא טלפון לספק זה");
      return;
    }
    // Clean phone number - remove spaces, dashes, etc.
    let phone = supplierInfo.phone.replace(/[\s\-\(\)]/g, "");
    // Add Israel country code if needed
    if (phone.startsWith("0")) {
      phone = "972" + phone.substring(1);
    }
    const text = encodeURIComponent(emailText);
    window.open(`https://wa.me/${phone}?text=${text}`);
  };

  // Handle row action (move to different category)
  const handleRowAction = async (row, action, rowIndex) => {
    if (!action) return;
    
    // Special case: "הסר מרשימה" from blue category = delete completely
    if (action === "special" && expandedCategory === "blue") {
      setMovingRow(rowIndex);
      try {
        await axios.post(`${API}/delete-row`, {
          from_category: expandedCategory,
          row_data: row
        });
        
        // Remove row from current view
        setCategoryDetails(prev => prev.filter((_, idx) => idx !== rowIndex));
        
        // Update stats - only decrease blue count, don't add anywhere
        setStats(prev => ({
          ...prev,
          blue: prev.blue - 1
        }));
      } catch (err) {
        console.error("Error deleting row:", err);
      } finally {
        setMovingRow(null);
      }
      return;
    }
    
    let toCategory = null;
    if (action === "special") {
      toCategory = "special";
    } else if (action === "command") {
      toCategory = "command";
    } else if (action === "match") {
      // התאמה - לא עושים כלום, רק מסמנים
      return;
    } else if (action === "emails") {
      toCategory = "emails";
    }
    
    if (!toCategory) return;
    
    setMovingRow(rowIndex);
    try {
      await axios.post(`${API}/move-row`, {
        row_index: rowIndex,
        from_category: expandedCategory,
        to_category: toCategory,
        row_data: row
      });
      
      // Remove row from current view
      setCategoryDetails(prev => prev.filter((_, idx) => idx !== rowIndex));
      
      // Update stats
      setStats(prev => {
        const newStats = { ...prev };
        // Decrease source count
        if (expandedCategory === "green") newStats.green--;
        else if (expandedCategory === "orange") newStats.orange--;
        else if (expandedCategory === "purple") newStats.purple--;
        else if (expandedCategory === "blue") newStats.blue--;
        else if (expandedCategory === "special") newStats.special--;
        else if (expandedCategory === "command") newStats.command--;
        else if (expandedCategory === "emails") newStats.emails--;
        
        // Increase target count
        if (toCategory === "special") newStats.special++;
        else if (toCategory === "command") newStats.command = (newStats.command || 0) + 1;
        else if (toCategory === "emails") newStats.emails++;
        
        return newStats;
      });
    } catch (err) {
      console.error("Error moving row:", err);
    } finally {
      setMovingRow(null);
    }
  };

  const handleCategoryClick = async (category) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
      setCategoryDetails([]);
      setFilters({ account: "", name: "", amount: "" });
      setSortConfig({ key: null, direction: "asc" });
      return;
    }
    
    setLoadingDetails(true);
    setExpandedCategory(category);
    setFilters({ account: "", name: "", amount: "" });
    setSortConfig({ key: null, direction: "asc" });
    
    try {
      const response = await axios.get(`${API}/processing-details/${category}`);
      setCategoryDetails(response.data.rows || []);
    } catch (err) {
      console.error(err);
      setCategoryDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Get unique values for filters
  const getUniqueAccounts = () => {
    const accounts = [...new Set(categoryDetails.map(row => row.account))].filter(Boolean);
    return accounts.sort();
  };

  const getUniqueNames = () => {
    const names = [...new Set(categoryDetails.map(row => row.name))].filter(Boolean);
    return names.sort();
  };

  const getUniqueAmounts = () => {
    // Get unique absolute values of amounts
    const amounts = [...new Set(categoryDetails.map(row => Math.abs(row.amount)))].filter(v => v > 0);
    return amounts.sort((a, b) => a - b);
  };

  const getFilteredAndSortedDetails = () => {
    let filtered = categoryDetails;
    
    // Apply filters
    if (filters.account) {
      filtered = filtered.filter(row => row.account === filters.account);
    }
    if (filters.name) {
      filtered = filtered.filter(row => row.name === filters.name);
    }
    if (filters.amount) {
      const filterAmount = parseFloat(filters.amount);
      // סטייה של עד 2 ש"ח - לא משנה אם פלוס או מינוס
      filtered = filtered.filter(row => Math.abs(Math.abs(row.amount) - filterAmount) <= 2);
    }
    
    // Apply sort
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        // Handle numeric sorting for amount
        if (sortConfig.key === "amount") {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        } else {
          aVal = String(aVal || "").toLowerCase();
          bVal = String(bVal || "").toLowerCase();
        }
        
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    
    return filtered;
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const handleProcess = async () => {
    if (!mainFile) return;

    setIsProcessing(true);
    setError(null);
    setStats(null);
    setProcessedFileUrl(null);
    setExpandedCategory(null);
    setCategoryDetails([]);

    try {
      const formData = new FormData();
      formData.append("main_file", mainFile);

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
        special: parseInt(response.headers["x-stats-special"] || "0"),
        total: parseInt(response.headers["x-stats-total"] || "0"),
        emails: parseInt(response.headers["x-stats-emails"] || "0"),
      };
      setStats(newStats);

      // Store file for download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setProcessedFileUrl(url);
      setProcessedFileName(`מעובד_${mainFile.name}`);

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

  const handleDownload = () => {
    if (!processedFileUrl) return;
    const link = document.createElement("a");
    link.href = processedFileUrl;
    link.setAttribute("download", processedFileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleReset = () => {
    setMainFile(null);
    setStats(null);
    setProcessedFileUrl(null);
    setProcessedFileName("");
    setError(null);
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
          <span className="text-[#00CDB8]">גיול חובות</span> אוטומטי
        </h1>
      </div>

      {/* Upload Card */}
      <div className="max-w-md mx-auto">
        <UploadCard
          title="גיול חובות"
          description="העלה קובץ Excel לעיבוד"
          icon={Building2}
          file={mainFile}
          onFileSelect={setMainFile}
          onRemove={() => setMainFile(null)}
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

      {/* Results Display with Action Buttons */}
      {stats && processedFileUrl && (
        <div className="max-w-5xl mx-auto space-y-6" data-testid="stats-display">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
              <Check size={20} />
              <span className="font-medium">העיבוד הושלם בהצלחה!</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-800">תוצאות העיבוד</h3>
            <p className="text-sm text-gray-500 mt-1">לחץ על כפתור לצפייה בפרטים</p>
          </div>

          {/* Result Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Green - 100% Match */}
            <button
              onClick={() => handleCategoryClick("green")}
              className={`bg-white rounded-2xl border-2 p-4 text-center hover:shadow-lg transition-all cursor-pointer ${
                expandedCategory === "green" ? "border-green-600 shadow-lg ring-2 ring-green-200" : "border-green-500"
              }`}
            >
              <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">{stats.green}</span>
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">התאמה 100%</h4>
              <p className="text-xs text-green-600 mt-1">(ירוק)</p>
              <ChevronDown size={16} className={`mx-auto mt-2 text-green-500 transition-transform ${expandedCategory === "green" ? "rotate-180" : ""}`} />
            </button>

            {/* Orange - 80% Match */}
            <button
              onClick={() => handleCategoryClick("orange")}
              className={`bg-white rounded-2xl border-2 p-4 text-center hover:shadow-lg transition-all cursor-pointer ${
                expandedCategory === "orange" ? "border-orange-600 shadow-lg ring-2 ring-orange-200" : "border-orange-500"
              }`}
            >
              <div className="w-12 h-12 mx-auto bg-orange-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">{stats.orange}</span>
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">התאמה 80%</h4>
              <p className="text-xs text-orange-600 mt-1">(כתום)</p>
              <ChevronDown size={16} className={`mx-auto mt-2 text-orange-500 transition-transform ${expandedCategory === "orange" ? "rotate-180" : ""}`} />
            </button>

            {/* Purple - Supplier Check */}
            <button
              onClick={() => handleCategoryClick("purple")}
              className={`bg-white rounded-2xl border-2 p-4 text-center hover:shadow-lg transition-all cursor-pointer ${
                expandedCategory === "purple" ? "border-purple-600 shadow-lg ring-2 ring-purple-200" : "border-purple-500"
              }`}
            >
              <div className="w-12 h-12 mx-auto bg-purple-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">{stats.purple}</span>
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">בדיקת ספקים</h4>
              <p className="text-xs text-purple-600 mt-1">(סגול)</p>
              <ChevronDown size={16} className={`mx-auto mt-2 text-purple-500 transition-transform ${expandedCategory === "purple" ? "rotate-180" : ""}`} />
            </button>

            {/* Blue - Bank Transfers */}
            <button
              onClick={() => handleCategoryClick("blue")}
              className={`bg-white rounded-2xl border-2 p-4 text-center hover:shadow-lg transition-all cursor-pointer ${
                expandedCategory === "blue" ? "border-blue-600 shadow-lg ring-2 ring-blue-200" : "border-blue-500"
              }`}
            >
              <div className="w-12 h-12 mx-auto bg-blue-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">{stats.blue}</span>
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">העברות בנקאיות בלי חשבונית</h4>
              <p className="text-xs text-blue-600 mt-1">(כחול)</p>
              <ChevronDown size={16} className={`mx-auto mt-2 text-blue-500 transition-transform ${expandedCategory === "blue" ? "rotate-180" : ""}`} />
            </button>

            {/* Emails - Turquoise */}
            <button
              onClick={() => handleCategoryClick("emails")}
              className={`bg-white rounded-2xl border-2 p-4 text-center hover:shadow-lg transition-all cursor-pointer ${
                expandedCategory === "emails" ? "border-[#00CDB8] shadow-lg ring-2 ring-[#00CDB8]/30" : "border-[#00CDB8]"
              }`}
            >
              <div className="w-12 h-12 mx-auto bg-[#00CDB8] rounded-full flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">{stats.emails}</span>
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">מיילים לספק</h4>
              <p className="text-xs text-[#00CDB8] mt-1">(חסרה חשבונית)</p>
              <ChevronDown size={16} className={`mx-auto mt-2 text-[#00CDB8] transition-transform ${expandedCategory === "emails" ? "rotate-180" : ""}`} />
            </button>

            {/* Special Treatment - Red */}
            <button
              onClick={() => handleCategoryClick("special")}
              className={`bg-white rounded-2xl border-2 p-4 text-center hover:shadow-lg transition-all cursor-pointer ${
                expandedCategory === "special" ? "border-red-600 shadow-lg ring-2 ring-red-200" : "border-red-500"
              }`}
            >
              <div className="w-12 h-12 mx-auto bg-red-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">{stats.special}</span>
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">לטיפול מיוחד/תשלום</h4>
              <p className="text-xs text-red-600 mt-1">(ללא התאמה)</p>
              <ChevronDown size={16} className={`mx-auto mt-2 text-red-500 transition-transform ${expandedCategory === "special" ? "rotate-180" : ""}`} />
            </button>

            {/* Command - Yellow */}
            <button
              onClick={() => handleCategoryClick("command")}
              className={`bg-white rounded-2xl border-2 p-4 text-center hover:shadow-lg transition-all cursor-pointer ${
                expandedCategory === "command" ? "border-yellow-600 shadow-lg ring-2 ring-yellow-200" : "border-yellow-500"
              }`}
            >
              <div className="w-12 h-12 mx-auto bg-yellow-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-white font-bold text-lg">{stats.command || 0}</span>
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">לעשות פקודה</h4>
              <p className="text-xs text-yellow-600 mt-1">(צהוב)</p>
              <ChevronDown size={16} className={`mx-auto mt-2 text-yellow-500 transition-transform ${expandedCategory === "command" ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Expanded Details Table */}
          {expandedCategory && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-fade-in">
              <div className={`px-4 py-3 font-semibold text-white flex items-center justify-between ${
                expandedCategory === "green" ? "bg-green-500" :
                expandedCategory === "orange" ? "bg-orange-500" :
                expandedCategory === "purple" ? "bg-purple-500" :
                expandedCategory === "blue" ? "bg-blue-500" :
                expandedCategory === "special" ? "bg-red-500" :
                expandedCategory === "emails" ? "bg-[#00CDB8]" :
                "bg-yellow-500"
              }`}>
                <span>
                  {expandedCategory === "green" && "התאמה 100% - פירוט"}
                  {expandedCategory === "orange" && "התאמה 80% - פירוט"}
                  {expandedCategory === "purple" && "בדיקת ספקים - פירוט"}
                  {expandedCategory === "blue" && "העברות בנקאיות בלי חשבונית - פירוט"}
                  {expandedCategory === "special" && "לטיפול מיוחד/תשלום - פירוט"}
                  {expandedCategory === "command" && "לעשות פקודה - פירוט"}
                  {expandedCategory === "emails" && "מיילים לספק - פירוט"}
                </span>
                <span className="text-sm opacity-80">
                  {getFilteredAndSortedDetails().length} שורות
                </span>
              </div>
              
              {loadingDetails ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </div>
              ) : categoryDetails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">אין נתונים להצגה</div>
              ) : (
                <>
                  {/* Filter Dropdowns */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4">
                    {/* Account Filter */}
                    <div className="relative">
                      <label className="block text-xs text-gray-500 mb-1">סינון לפי חשבון</label>
                      <select
                        value={filters.account}
                        onChange={(e) => setFilters({ ...filters, account: e.target.value })}
                        className="px-4 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00CDB8] bg-white min-w-[200px]"
                      >
                        <option value="">הכל</option>
                        {getUniqueAccounts().map(acc => (
                          <option key={acc} value={acc}>{acc}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Name Filter */}
                    <div className="relative">
                      <label className="block text-xs text-gray-500 mb-1">סינון לפי ספק</label>
                      <select
                        value={filters.name}
                        onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                        className="px-4 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00CDB8] bg-white min-w-[250px]"
                      >
                        <option value="">הכל</option>
                        {getUniqueNames().map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Amount Filter */}
                    <div className="relative">
                      <label className="block text-xs text-gray-500 mb-1">סינון לפי סכום</label>
                      <select
                        value={filters.amount}
                        onChange={(e) => setFilters({ ...filters, amount: e.target.value })}
                        className="px-4 py-2 pr-8 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00CDB8] bg-white min-w-[150px]"
                      >
                        <option value="">הכל</option>
                        {getUniqueAmounts().map(amt => (
                          <option key={amt} value={amt}>{amt.toLocaleString("he-IL", { minimumFractionDigits: 2 })}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Clear Filters */}
                    {(filters.account || filters.name || filters.amount) && (
                      <button
                        onClick={() => setFilters({ account: "", name: "", amount: "" })}
                        className="self-end px-4 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        נקה סינון
                      </button>
                    )}
                  </div>
                  
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th 
                            onClick={() => handleSort("account")}
                            className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap"
                          >
                            חשבון {getSortIcon("account")}
                          </th>
                          <th 
                            onClick={() => handleSort("name")}
                            className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap"
                          >
                            שם {getSortIcon("name")}
                          </th>
                          <th 
                            onClick={() => handleSort("amount")}
                            className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap"
                          >
                            סכום {getSortIcon("amount")}
                          </th>
                          <th 
                            onClick={() => handleSort("date")}
                            className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap"
                          >
                            תאריך {getSortIcon("date")}
                          </th>
                          <th 
                            onClick={() => handleSort("details")}
                            className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap"
                          >
                            פרטים {getSortIcon("details")}
                          </th>
                          <th 
                            onClick={() => handleSort("invoice")}
                            className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap"
                          >
                            חשבונית {getSortIcon("invoice")}
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">
                            פעולה
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {getFilteredAndSortedDetails().map((row, idx) => (
                          <tr 
                            key={idx} 
                            className={`hover:bg-gray-50 ${expandedCategory === "emails" ? "cursor-pointer" : ""}`}
                            onClick={() => expandedCategory === "emails" && openEmailModal(row)}
                          >
                            <td className="px-4 py-2 text-gray-800">{row.account}</td>
                            <td className="px-4 py-2 text-gray-800">{row.name}</td>
                            <td className={`px-4 py-2 font-medium ${row.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {row.amount?.toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 text-gray-600">{row.date}</td>
                            <td className="px-4 py-2 text-gray-600">{row.details}</td>
                            <td className="px-4 py-2 text-gray-600">{row.invoice}</td>
                            <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                              <select
                                className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00CDB8] bg-white"
                                onChange={(e) => {
                                  const originalIndex = categoryDetails.findIndex(r => 
                                    r.account === row.account && 
                                    r.name === row.name && 
                                    Math.abs(r.amount - row.amount) < 0.01 &&
                                    r.date === row.date
                                  );
                                  handleRowAction(row, e.target.value, originalIndex);
                                  e.target.value = "";
                                }}
                                disabled={movingRow !== null}
                                defaultValue=""
                              >
                                <option value="" disabled>בחר פעולה</option>
                                <option value="match">התאמה ✓</option>
                                <option value="special">הסר מרשימה</option>
                                <option value="command">לעשות פקודה</option>
                                <option value="emails">חסרה חשבונית</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {getFilteredAndSortedDetails().length === 0 && (filters.account || filters.name || filters.amount) && (
                    <div className="text-center py-4 text-gray-500">לא נמצאו תוצאות לסינון הנבחר</div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Email Modal */}
          {emailModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEmailModal(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-[#00CDB8] text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                  <h3 className="text-xl font-bold">שליחת הודעה לספק</h3>
                  <button onClick={() => setEmailModal(null)} className="text-white hover:bg-white/20 rounded-full p-1">
                    <X size={24} />
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Transaction Details */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">פרטי התנועה</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">ספק:</span> <span className="font-medium">{emailModal.name}</span></div>
                      <div><span className="text-gray-500">חשבון:</span> <span className="font-medium">{emailModal.account}</span></div>
                      <div><span className="text-gray-500">סכום:</span> <span className={`font-medium ${emailModal.amount >= 0 ? "text-green-600" : "text-red-600"}`}>{emailModal.amount?.toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪</span></div>
                      <div><span className="text-gray-500">תאריך:</span> <span className="font-medium">{emailModal.date}</span></div>
                      {emailModal.details && <div className="col-span-2"><span className="text-gray-500">פרטים:</span> <span className="font-medium">{emailModal.details}</span></div>}
                    </div>
                  </div>

                  {/* Supplier Contact Info */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">פרטי קשר של הספק</h4>
                    {supplierInfo ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-blue-500" />
                          <span className="text-gray-500">מייל:</span> 
                          <span className="font-medium">{supplierInfo.email || "לא צוין"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">📱 טלפון:</span> 
                          <span className="font-medium">{supplierInfo.phone || "לא צוין"}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">לא נמצאו פרטי ספק. יש להוסיף את הספק בלשונית ספקים.</p>
                    )}
                  </div>

                  {/* Email Subject */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">כותרת המייל</h4>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8] text-sm"
                      dir="rtl"
                    />
                  </div>

                  {/* Email Text */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">טקסט להודעה</h4>
                    <textarea
                      value={emailText}
                      onChange={(e) => setEmailText(e.target.value)}
                      className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00CDB8] resize-none text-sm"
                      dir="rtl"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleSendEmail}
                      disabled={!supplierInfo?.email}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                        supplierInfo?.email 
                          ? "bg-blue-500 text-white hover:bg-blue-600" 
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <Mail size={20} />
                      <span>שליחת מייל</span>
                    </button>
                    <button
                      onClick={handleSendWhatsApp}
                      disabled={!supplierInfo?.phone}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                        supplierInfo?.phone 
                          ? "bg-green-500 text-white hover:bg-green-600" 
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <span>📱</span>
                      <span>שליחת וואטסאפ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Download Button */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              onClick={handleDownload}
              className="flex items-center gap-3 bg-[#00CDB8] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[#00B5A3] shadow-lg hover:shadow-xl transition-all"
              data-testid="download-btn"
            >
              <Download size={24} />
              <span>הורד קובץ מעובד</span>
            </button>
            <button
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-2"
              data-testid="reset-btn"
            >
              <RefreshCw size={16} />
              <span>עיבוד קובץ חדש</span>
            </button>
          </div>
        </div>
      )}
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

      {/* Email Settings Section */}
      <EmailSettingsSection />
    </div>
  );
};

// Email Settings Component
const EmailSettingsSection = () => {
  // Initialize state with localStorage value directly
  const getInitialSettings = () => {
    const stored = localStorage.getItem("emailSettings");
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      companyEmail: "office@ilang.co.il",
      signerName: "ילנה זמליאנסקי",
      companyName: "אילן גינון ופיתוח בע\"מ"
    };
  };
  
  const [settings, setSettings] = useState(getInitialSettings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("emailSettings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-6">
      <div className="flex items-center gap-3 mb-6">
        <Mail size={24} className="text-[#00CDB8]" />
        <h3 className="text-lg font-semibold text-gray-800">הגדרות מייל</h3>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">מייל החברה לקבלת חשבוניות</label>
          <input
            type="email"
            value={settings.companyEmail}
            onChange={(e) => setSettings({...settings, companyEmail: e.target.value})}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00CDB8]"
            placeholder="office@company.co.il"
          />
          <p className="text-xs text-gray-500 mt-1">המייל שיופיע בהודעה לספק</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">שם החותם</label>
          <input
            type="text"
            value={settings.signerName}
            onChange={(e) => setSettings({...settings, signerName: e.target.value})}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00CDB8]"
            placeholder="שם מלא"
          />
          <p className="text-xs text-gray-500 mt-1">השם שיופיע בחתימת המייל</p>
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">שם החברה בחתימה</label>
          <input
            type="text"
            value={settings.companyName}
            onChange={(e) => setSettings({...settings, companyName: e.target.value})}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00CDB8]"
            placeholder="שם החברה"
          />
        </div>
      </div>
      
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-[#00CDB8] text-white rounded-lg font-medium hover:bg-[#00B5A3] transition-colors"
        >
          שמור הגדרות
        </button>
        {saved && (
          <span className="text-green-600 text-sm flex items-center gap-1">
            <Check size={16} /> ההגדרות נשמרו
          </span>
        )}
      </div>
      
      {/* Preview */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">תצוגה מקדימה של חתימת המייל:</h4>
        <p className="text-sm text-gray-600 whitespace-pre-line">
          {`בברכה,
${settings.signerName}
${settings.companyName}`}
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

import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Upload, FileSpreadsheet, Users, Settings, Zap, Building2, FileText, Download, Trash2, Plus, X, Loader2, ChevronDown, Check, AlertCircle, BarChart3, Mail, RefreshCw, Eye, EyeOff, Send } from "lucide-react";

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
  // Load saved results from localStorage
  const getSavedResults = () => {
    const saved = localStorage.getItem("processingResults");
    return saved ? JSON.parse(saved) : null;
  };
  
  const savedResults = getSavedResults();
  
  const [mainFile, setMainFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState(savedResults?.stats || null);
  const [error, setError] = useState(null);
  const [processedFileUrl, setProcessedFileUrl] = useState(savedResults?.processedFileUrl || null);
  const [processedFileName, setProcessedFileName] = useState(savedResults?.processedFileName || "");
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
  
  // Payment modal state
  const [paymentModal, setPaymentModal] = useState(null);
  const [selectedForPayment, setSelectedForPayment] = useState([]);
  const [generatingPayment, setGeneratingPayment] = useState(false);
  
  // Statement request modal state
  const [statementModal, setStatementModal] = useState(null);
  const [statementDateFrom, setStatementDateFrom] = useState("");
  const [statementDateTo, setStatementDateTo] = useState("");
  const [sendingStatement, setSendingStatement] = useState(false);

  // Get email settings from localStorage
  const getEmailSettings = () => {
    const settings = localStorage.getItem("emailSettings");
    return settings ? JSON.parse(settings) : {
      companyEmail: "office@ilang.co.il",
      signerName: "ילנה זמליאנסקי",
      companyName: "אילן גינון ופיתוח בע\"מ"
    };
  };

  // Open email modal for a row - aggregate all rows for the same supplier
  const openEmailModal = async (row) => {
    const settings = getEmailSettings();
    
    // Find all rows for the same supplier (by name or account)
    const supplierRows = categoryDetails.filter(r => 
      r.name === row.name || r.account === row.account
    );
    
    // Store all rows for reference
    setEmailModal({ ...row, allRows: supplierRows });
    
    // Calculate totals
    const totalAmount = supplierRows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const transferCount = supplierRows.length;
    
    // Determine singular/plural text
    const invoiceText = transferCount === 1 ? "חשבונית" : "חשבוניות";
    const invoiceTextFull = transferCount === 1 ? "חשבונית חסרה" : "חשבוניות חסרות";
    const transferText = transferCount === 1 ? "העברה שבוצעה" : "העברות שבוצעו";
    
    // Subject - singular or plural
    setEmailSubject(`בקשה ל${invoiceTextFull} בגין ${transferText}`);
    
    // Build transfers list
    let transfersList = "";
    supplierRows.forEach((r, idx) => {
      transfersList += `${idx + 1}. תאריך: ${r.date} | סכום: ${r.amount?.toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪\n`;
    });
    
    // Build signature - always include company email line, then custom signature or default
    const signaturePart = settings.customSignature 
      ? settings.customSignature.replace(/\*\*\*.*\*\*\*/g, '').trim() // Remove any *** line from custom signature
      : `בברכה,
${settings.signerName}
${settings.companyName}`;
    
    // Generate email text with all transfers
    const defaultText = `שלום רב,

בהמשך לבדיקתנו, חסרות לנו ${invoiceText} בגין ${transferText}.

ספק: ${row.name}
מספר העברות: ${transferCount}
סה"כ: ${totalAmount.toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪

פירוט ההעברות:
${transfersList}
נבקש לקבל את ה${invoiceText} בהקדם האפשרי לצורך השלמת הרישומים.

*** אשמח לקבל חשבוניות במייל: ${settings.companyEmail} ***

${signaturePart}`;
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

  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState(null);

  // Send email via Microsoft Graph API (automatic) and delete supplier rows after success
  const handleSendEmail = async () => {
    if (!supplierInfo?.email) {
      alert("לא נמצא מייל לספק זה");
      return;
    }
    
    const settings = getEmailSettings();
    if (!settings.microsoftEmail) {
      alert("יש להתחבר ל-Microsoft קודם בלשונית 'כללים'");
      return;
    }
    
    setSendingEmail(true);
    setEmailSendResult(null);
    
    try {
      await axios.post(`${API}/send-email-microsoft`, {
        sender_email: settings.microsoftEmail,
        recipient_email: supplierInfo.email,
        subject: emailSubject,
        body: emailText
      });
      
      // Delete all rows for this supplier after successful email
      const deletedCount = emailModal.allRows?.length || 1;
      await axios.post(`${API}/delete-supplier-rows`, {
        category: "emails",
        supplier_name: emailModal.name,
        supplier_account: emailModal.account
      });
      
      // Update local state - remove supplier rows from categoryDetails
      setCategoryDetails(prev => prev.filter(r => 
        r.name !== emailModal.name && r.account !== emailModal.account
      ));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        emails: Math.max(0, (prev.emails || 0) - deletedCount)
      }));
      
      setEmailSendResult({ success: true, message: `המייל נשלח בהצלחה! נמחקו ${deletedCount} שורות.` });
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setEmailModal(null);
        setEmailSendResult(null);
      }, 2000);
      
    } catch (err) {
      setEmailSendResult({ 
        success: false, 
        message: err.response?.data?.detail || "שגיאה בשליחת המייל"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Send WhatsApp and ask to delete after
  const handleSendWhatsApp = async () => {
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
    
    // Ask user if message was sent
    setTimeout(async () => {
      const confirmed = window.confirm("האם ההודעה נשלחה בוואטסאפ?\n\nאם כן - הספק יימחק מהרשימה.");
      
      if (confirmed) {
        try {
          // Delete all rows for this supplier
          const deletedCount = emailModal.allRows?.length || 1;
          await axios.post(`${API}/delete-supplier-rows`, {
            category: "emails",
            supplier_name: emailModal.name,
            supplier_account: emailModal.account
          });
          
          // Update local state
          setCategoryDetails(prev => prev.filter(r => 
            r.name !== emailModal.name && r.account !== emailModal.account
          ));
          
          // Update stats
          setStats(prev => ({
            ...prev,
            emails: Math.max(0, (prev.emails || 0) - deletedCount)
          }));
          
          setEmailSendResult({ success: true, message: `הודעת וואטסאפ נשלחה! נמחקו ${deletedCount} שורות.` });
          
          // Close modal after 2 seconds
          setTimeout(() => {
            setEmailModal(null);
            setEmailSendResult(null);
          }, 2000);
        } catch (err) {
          console.error("Error deleting supplier rows:", err);
        }
      }
    }, 1000);
  };

  // Save or update supplier from email modal
  const handleSaveSupplier = async () => {
    if (!emailModal) return;
    setSavingSupplier(true);
    
    try {
      if (supplierInfo) {
        // Update existing supplier
        await axios.put(`${API}/suppliers/${supplierInfo.id}`, {
          ...supplierInfo,
          email: newSupplierData.email || supplierInfo.email,
          phone: newSupplierData.phone || supplierInfo.phone
        });
        setSupplierInfo({
          ...supplierInfo,
          email: newSupplierData.email || supplierInfo.email,
          phone: newSupplierData.phone || supplierInfo.phone
        });
      } else {
        // Create new supplier
        const newSupplier = {
          account_number: String(emailModal.account),
          name: emailModal.name,
          email: newSupplierData.email,
          phone: newSupplierData.phone,
          currency: "ש\"ח",
          vat_number: "",
          purchase_account: "",
          purchase_account_desc: ""
        };
        const response = await axios.post(`${API}/suppliers`, newSupplier);
        setSupplierInfo(response.data);
      }
      setShowAddSupplier(false);
      setNewSupplierData({ email: "", phone: "" });
    } catch (err) {
      console.error("Error saving supplier:", err);
      alert("שגיאה בשמירת הספק");
    } finally {
      setSavingSupplier(false);
    }
  };

  // Handle payment action - open payment modal
  const handlePaymentAction = (row, rowIndex) => {
    // Close other modals first
    setStatementModal(null);
    setEmailModal(null);
    
    // Find all rows for the same supplier
    const supplierRows = categoryDetails.filter(r => 
      r.name === row.name || r.account === row.account
    );
    setPaymentModal({ row, rowIndex, supplierRows });
    setSelectedForPayment(supplierRows.map((_, idx) => idx)); // Select all by default
  };

  // Toggle row selection for payment
  const togglePaymentSelection = (idx) => {
    setSelectedForPayment(prev => 
      prev.includes(idx) 
        ? prev.filter(i => i !== idx)
        : [...prev, idx]
    );
  };

  // Generate payment file (Excel)
  const handleGeneratePayment = async () => {
    if (selectedForPayment.length === 0) {
      alert("יש לבחור לפחות שורה אחת לתשלום");
      return;
    }
    
    setGeneratingPayment(true);
    try {
      const rowsToPayment = paymentModal.supplierRows.filter((_, idx) => 
        selectedForPayment.includes(idx)
      );
      
      const response = await axios.post(`${API}/generate-payment`, {
        rows: rowsToPayment,
        supplier_name: paymentModal.row.name
      }, { responseType: 'blob' });
      
      // Download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `תשלום_${paymentModal.row.name}_${new Date().toLocaleDateString('he-IL')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Remove paid rows from the list
      const paidAccounts = new Set(rowsToPayment.map(r => `${r.account}-${r.amount}-${r.date}`));
      setCategoryDetails(prev => prev.filter(r => 
        !paidAccounts.has(`${r.account}-${r.amount}-${r.date}`)
      ));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        special: Math.max(0, (prev.special || 0) - rowsToPayment.length)
      }));
      
      setPaymentModal(null);
      setSelectedForPayment([]);
    } catch (err) {
      console.error("Error generating payment:", err);
      alert("שגיאה ביצירת קובץ תשלום");
    } finally {
      setGeneratingPayment(false);
    }
  };

  // Handle request statement action - open statement modal
  const handleRequestStatement = async (row, rowIndex) => {
    // Close other modals first
    setPaymentModal(null);
    setEmailModal(null);
    
    const settings = getEmailSettings();
    setStatementModal({ row, rowIndex });
    
    // Set default date range (last 3 months)
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    setStatementDateFrom(threeMonthsAgo.toISOString().split('T')[0]);
    setStatementDateTo(today.toISOString().split('T')[0]);
    
    // Fetch supplier info
    try {
      const response = await axios.get(`${API}/suppliers`);
      const suppliers = response.data;
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

  // Send statement request email
  const handleSendStatementRequest = async () => {
    if (!supplierInfo?.email) {
      alert("לא נמצא מייל לספק זה");
      return;
    }
    
    const settings = getEmailSettings();
    if (!settings.microsoftEmail) {
      alert("יש להתחבר ל-Microsoft קודם בלשונית 'כללים'");
      return;
    }
    
    setSendingStatement(true);
    try {
      // Format dates as DD/MM/YYYY
      const formatDateDDMMYYYY = (dateStr) => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };
      
      const fromDate = formatDateDDMMYYYY(statementDateFrom);
      const toDate = formatDateDDMMYYYY(statementDateTo);
      
      // Updated subject and body format
      const subject = `בקשה לכרטסת - ${statementModal.row.name}`;
      
      // Build company info with registration number
      const companyInfo = settings.companyRegistration 
        ? `${settings.companyName} (ח.פ ${settings.companyRegistration})`
        : settings.companyName;
      
      const body = `שלום רב,

נבקש לקבל כרטסת של ${companyInfo} עבור התקופה:
מתאריך: ${fromDate}
עד תאריך: ${toDate}

*** אשמח לקבל כרטסת במייל: ${settings.companyEmail} ***

בברכה,
${settings.signerName}
${settings.companyName}
${settings.companyRegistration ? `ח.פ ${settings.companyRegistration}` : ''}`;

      await axios.post(`${API}/send-email-microsoft`, {
        sender_email: settings.microsoftEmail,
        recipient_email: supplierInfo.email,
        subject: subject,
        body: body
      });
      
      // Delete the row from special category after successful send
      try {
        await axios.post(`${API}/delete-row`, {
          from_category: "special",
          row_data: statementModal.row
        });
        
        // Update local state - remove the row
        setCategoryDetails(prev => prev.filter(r => 
          !(r.account === statementModal.row.account && 
            r.name === statementModal.row.name &&
            Math.abs(r.amount - statementModal.row.amount) < 0.01)
        ));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          special: Math.max(0, (prev.special || 0) - 1)
        }));
      } catch (deleteErr) {
        console.error("Error deleting row after statement request:", deleteErr);
      }
      
      alert("בקשת הכרטסת נשלחה בהצלחה!");
      setStatementModal(null);
      setStatementDateFrom("");
      setStatementDateTo("");
    } catch (err) {
      console.error("Error sending statement request:", err);
      alert(err.response?.data?.detail || "שגיאה בשליחת הבקשה");
    } finally {
      setSendingStatement(false);
    }
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

  // Group rows by supplier for emails category
  const getGroupedBySupplier = () => {
    const grouped = {};
    categoryDetails.forEach(row => {
      const key = row.name || row.account;
      if (!grouped[key]) {
        grouped[key] = {
          name: row.name,
          account: row.account,
          rows: [],
          totalAmount: 0
        };
      }
      grouped[key].rows.push(row);
      grouped[key].totalAmount += row.amount || 0;
    });
    return Object.values(grouped);
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
      const fileName = `מעובד_${mainFile.name}`;
      setProcessedFileName(fileName);

      // Save results to localStorage
      localStorage.setItem("processingResults", JSON.stringify({
        stats: newStats,
        processedFileUrl: url,
        processedFileName: fileName,
        savedAt: new Date().toISOString()
      }));

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

  // Clear all results and localStorage
  const handleRefresh = () => {
    if (window.confirm("האם לנקות את כל התוצאות?")) {
      setMainFile(null);
      setStats(null);
      setProcessedFileUrl(null);
      setProcessedFileName("");
      setExpandedCategory(null);
      setCategoryDetails([]);
      setError(null);
      localStorage.removeItem("processingResults");
    }
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
                            {expandedCategory === "emails" ? "העברות" : "תאריך"} {getSortIcon("date")}
                          </th>
                          {expandedCategory !== "emails" && (
                            <>
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
                              {expandedCategory === "special" && (
                                <>
                                  <th 
                                    onClick={() => handleSort("account_description")}
                                    className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap"
                                  >
                                    תאור חשבון {getSortIcon("account_description")}
                                  </th>
                                  <th 
                                    onClick={() => handleSort("supplier_account")}
                                    className="px-4 py-3 text-right font-semibold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors whitespace-nowrap"
                                  >
                                    חש. ספק {getSortIcon("supplier_account")}
                                  </th>
                                </>
                              )}
                            </>
                          )}
                          <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">
                            פעולה
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expandedCategory === "emails" ? (
                          /* Grouped view for emails */
                          getGroupedBySupplier().map((group, idx) => (
                            <tr 
                              key={idx} 
                              className="hover:bg-[#00CDB8]/5 cursor-pointer transition-colors"
                              onClick={() => openEmailModal(group.rows[0])}
                            >
                              <td className="px-4 py-3 text-gray-800 font-medium">{group.account}</td>
                              <td className="px-4 py-3 text-gray-800 font-medium">{group.name}</td>
                              <td className={`px-4 py-3 font-bold ${group.totalAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {group.totalAmount.toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#00CDB8]/10 text-[#00CDB8] rounded-full text-sm font-medium">
                                  {group.rows.length} העברות
                                </span>
                              </td>
                              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                <select
                                  className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00CDB8] bg-white"
                                  onChange={(e) => {
                                    if (e.target.value === "send_email") {
                                      openEmailModal(group.rows[0]);
                                    } else if (e.target.value) {
                                      // Handle other actions for first row of group
                                      const originalIndex = categoryDetails.findIndex(r => 
                                        r.account === group.rows[0].account && 
                                        r.name === group.rows[0].name
                                      );
                                      handleRowAction(group.rows[0], e.target.value, originalIndex);
                                    }
                                    e.target.value = "";
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>בחר פעולה</option>
                                  <option value="send_email">שלח מייל 📧</option>
                                  <option value="match">התאמה ✓</option>
                                  <option value="special">הסר מרשימה</option>
                                  <option value="command">לעשות פקודה</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        ) : (
                          /* Regular view for other categories */
                          getFilteredAndSortedDetails().map((row, idx) => (
                            <tr 
                              key={idx} 
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-2 text-gray-800">{row.account}</td>
                              <td className="px-4 py-2 text-gray-800">{row.name}</td>
                              <td className={`px-4 py-2 font-medium ${row.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {row.amount?.toLocaleString("he-IL", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2 text-gray-600">{row.date}</td>
                              <td className="px-4 py-2 text-gray-600">{row.details}</td>
                              <td className="px-4 py-2 text-gray-600">{row.invoice}</td>
                              {expandedCategory === "special" && (
                                <>
                                  <td className="px-4 py-2 text-gray-600">{row.account_description}</td>
                                  <td className="px-4 py-2 text-gray-600">{row.supplier_account}</td>
                                </>
                              )}
                              <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                                {expandedCategory === "special" ? (
                                  /* Special actions for לטיפול מיוחד/תשלום */
                                  <select
                                    className="px-2 py-1 border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-500 bg-white"
                                    onChange={(e) => {
                                      const originalIndex = categoryDetails.findIndex(r => 
                                        r.account === row.account && 
                                        r.name === row.name && 
                                        Math.abs(r.amount - row.amount) < 0.01 &&
                                        r.date === row.date
                                      );
                                      if (e.target.value === "payment") {
                                        handlePaymentAction(row, originalIndex);
                                      } else if (e.target.value === "request_statement") {
                                        handleRequestStatement(row, originalIndex);
                                      } else {
                                        handleRowAction(row, e.target.value, originalIndex);
                                      }
                                      e.target.value = "";
                                    }}
                                    disabled={movingRow !== null}
                                    defaultValue=""
                                  >
                                    <option value="" disabled>בחר פעולה</option>
                                    <option value="payment">💰 תשלום</option>
                                    <option value="command">📝 לעשות פקודה</option>
                                    <option value="request_statement">📋 לבקש כרטסת</option>
                                  </select>
                                ) : (
                                  /* Regular actions for other categories */
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
                                )}
                              </td>
                          </tr>
                          ))
                        )}
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
                    <h4 className="font-semibold text-gray-700 mb-3">
                      פרטי {emailModal.allRows?.length > 1 ? `${emailModal.allRows.length} העברות` : 'התנועה'}
                    </h4>
                    <div className="text-sm mb-3">
                      <span className="text-gray-500">ספק:</span> <span className="font-medium">{emailModal.name}</span>
                    </div>
                    
                    {emailModal.allRows?.length > 1 ? (
                      /* Multiple transfers */
                      <div className="space-y-2">
                        <div className="bg-white rounded-lg p-3 max-h-40 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-500 border-b">
                                <th className="text-right pb-2">#</th>
                                <th className="text-right pb-2">תאריך</th>
                                <th className="text-right pb-2">סכום</th>
                              </tr>
                            </thead>
                            <tbody>
                              {emailModal.allRows.map((r, idx) => (
                                <tr key={idx} className="border-b border-gray-100 last:border-0">
                                  <td className="py-1">{idx + 1}</td>
                                  <td className="py-1">{r.date}</td>
                                  <td className={`py-1 font-medium ${r.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {r.amount?.toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-between text-sm font-medium bg-[#00CDB8]/10 rounded-lg p-2">
                          <span>סה״כ {emailModal.allRows.length} העברות:</span>
                          <span className="text-[#00CDB8]">
                            {emailModal.allRows.reduce((sum, r) => sum + (r.amount || 0), 0).toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Single transfer */
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">חשבון:</span> <span className="font-medium">{emailModal.account}</span></div>
                        <div><span className="text-gray-500">סכום:</span> <span className={`font-medium ${emailModal.amount >= 0 ? "text-green-600" : "text-red-600"}`}>{emailModal.amount?.toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪</span></div>
                        <div><span className="text-gray-500">תאריך:</span> <span className="font-medium">{emailModal.date}</span></div>
                        {emailModal.details && <div><span className="text-gray-500">פרטים:</span> <span className="font-medium">{emailModal.details}</span></div>}
                      </div>
                    )}
                  </div>

                  {/* Supplier Contact Info */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">פרטי קשר של הספק</h4>
                    
                    {/* Case 1: Supplier exists with all info */}
                    {supplierInfo && supplierInfo.email && supplierInfo.phone ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-blue-500" />
                          <span className="text-gray-500">מייל:</span> 
                          <span className="font-medium">{supplierInfo.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">📱 טלפון:</span> 
                          <span className="font-medium">{supplierInfo.phone}</span>
                        </div>
                      </div>
                    ) : supplierInfo && (!supplierInfo.email || !supplierInfo.phone) ? (
                      /* Case 2: Supplier exists but missing email or phone */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail size={16} className={supplierInfo.email ? "text-blue-500" : "text-red-400"} />
                            <span className="text-gray-500">מייל:</span> 
                            <span className={`font-medium ${!supplierInfo.email ? "text-red-500" : ""}`}>
                              {supplierInfo.email || "חסר מייל"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={!supplierInfo.phone ? "text-red-400" : ""}>📱</span>
                            <span className="text-gray-500">טלפון:</span> 
                            <span className={`font-medium ${!supplierInfo.phone ? "text-red-500" : ""}`}>
                              {supplierInfo.phone || "חסר טלפון"}
                            </span>
                          </div>
                        </div>
                        
                        {!showAddSupplier ? (
                          <button
                            onClick={() => {
                              setShowAddSupplier(true);
                              setNewSupplierData({ 
                                email: supplierInfo.email || "", 
                                phone: supplierInfo.phone || "" 
                              });
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Plus size={14} />
                            הוסף פרטים חסרים
                          </button>
                        ) : (
                          <div className="bg-white rounded-lg p-3 space-y-3">
                            {!supplierInfo.email && (
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">מייל</label>
                                <input
                                  type="email"
                                  value={newSupplierData.email}
                                  onChange={(e) => setNewSupplierData({...newSupplierData, email: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00CDB8]"
                                  placeholder="example@mail.com"
                                />
                              </div>
                            )}
                            {!supplierInfo.phone && (
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">טלפון</label>
                                <input
                                  type="tel"
                                  value={newSupplierData.phone}
                                  onChange={(e) => setNewSupplierData({...newSupplierData, phone: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00CDB8]"
                                  placeholder="050-0000000"
                                />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveSupplier}
                                disabled={savingSupplier}
                                className="px-4 py-2 bg-[#00CDB8] text-white rounded-lg text-sm font-medium hover:bg-[#00B5A3] disabled:opacity-50"
                              >
                                {savingSupplier ? "שומר..." : "שמור"}
                              </button>
                              <button
                                onClick={() => setShowAddSupplier(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
                              >
                                ביטול
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Case 3: Supplier doesn't exist */
                      <div className="space-y-3">
                        <p className="text-red-500 text-sm">
                          ⚠️ ספק &quot;{emailModal?.name}&quot; לא נמצא במאגר הספקים.
                        </p>
                        
                        {!showAddSupplier ? (
                          <button
                            onClick={() => setShowAddSupplier(true)}
                            className="px-4 py-2 bg-[#00CDB8] text-white rounded-lg text-sm font-medium hover:bg-[#00B5A3] flex items-center gap-2"
                          >
                            <Plus size={16} />
                            הוסף ספק למאגר
                          </button>
                        ) : (
                          <div className="bg-white rounded-lg p-3 space-y-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">מייל</label>
                              <input
                                type="email"
                                value={newSupplierData.email}
                                onChange={(e) => setNewSupplierData({...newSupplierData, email: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00CDB8]"
                                placeholder="example@mail.com"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">טלפון</label>
                              <input
                                type="tel"
                                value={newSupplierData.phone}
                                onChange={(e) => setNewSupplierData({...newSupplierData, phone: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00CDB8]"
                                placeholder="050-0000000"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveSupplier}
                                disabled={savingSupplier || (!newSupplierData.email && !newSupplierData.phone)}
                                className="px-4 py-2 bg-[#00CDB8] text-white rounded-lg text-sm font-medium hover:bg-[#00B5A3] disabled:opacity-50"
                              >
                                {savingSupplier ? "שומר..." : "הוסף ספק"}
                              </button>
                              <button
                                onClick={() => setShowAddSupplier(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
                              >
                                ביטול
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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

                  {/* Email Send Result */}
                  {emailSendResult && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${emailSendResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {emailSendResult.success ? <Check size={18} /> : <AlertCircle size={18} />}
                      <span className="text-sm">{emailSendResult.message}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={handleSendEmail}
                      disabled={!supplierInfo?.email || sendingEmail}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                        supplierInfo?.email && !sendingEmail
                          ? "bg-blue-500 text-white hover:bg-blue-600" 
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {sendingEmail ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                      <span>{sendingEmail ? "שולח..." : "שליחת מייל"}</span>
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

          {/* Payment Modal */}
          {paymentModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPaymentModal(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                  <h3 className="text-xl font-bold">💰 יצירת רשימת תשלום</h3>
                  <button onClick={() => setPaymentModal(null)} className="text-white hover:bg-white/20 rounded-full p-1">
                    <X size={24} />
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">ספק: {paymentModal.row.name}</h4>
                    <p className="text-sm text-gray-500 mb-4">בחר את השורות לתשלום:</p>
                    
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {paymentModal.supplierRows.map((row, idx) => (
                        <label 
                          key={idx}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedForPayment.includes(idx) ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedForPayment.includes(idx)}
                            onChange={() => togglePaymentSelection(idx)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1 flex justify-between items-center text-sm">
                            <span>{row.account} - {row.details || row.name}</span>
                            <span className={`font-medium ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {row.amount?.toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{row.date}</span>
                        </label>
                      ))}
                    </div>
                    
                    {/* Total */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="font-semibold">סה״כ לתשלום:</span>
                      <span className="text-xl font-bold text-blue-600">
                        {paymentModal.supplierRows
                          .filter((_, idx) => selectedForPayment.includes(idx))
                          .reduce((sum, r) => sum + (r.amount || 0), 0)
                          .toLocaleString("he-IL", { minimumFractionDigits: 2 })} ₪
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <button
                    onClick={handleGeneratePayment}
                    disabled={selectedForPayment.length === 0 || generatingPayment}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all ${
                      selectedForPayment.length > 0 && !generatingPayment
                        ? "bg-blue-600 text-white hover:bg-blue-700" 
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {generatingPayment ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>מייצר קובץ...</span>
                      </>
                    ) : (
                      <>
                        <Download size={20} />
                        <span>הורד רשימת תשלום (Excel)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statement Request Modal */}
          {statementModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setStatementModal(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-purple-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
                  <h3 className="text-xl font-bold">📋 בקשת כרטסת</h3>
                  <button onClick={() => setStatementModal(null)} className="text-white hover:bg-white/20 rounded-full p-1">
                    <X size={24} />
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Supplier Info */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">פרטי ספק</h4>
                    <p className="text-sm"><span className="text-gray-500">שם:</span> {statementModal.row.name}</p>
                    <p className="text-sm"><span className="text-gray-500">חשבון:</span> {statementModal.row.account}</p>
                    {supplierInfo?.email && (
                      <p className="text-sm"><span className="text-gray-500">מייל:</span> {supplierInfo.email}</p>
                    )}
                  </div>
                  
                  {/* Date Range */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-700">תקופה לכרטסת</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">מתאריך</label>
                        <input
                          type="date"
                          value={statementDateFrom}
                          onChange={(e) => setStatementDateFrom(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">עד תאריך</label>
                        <input
                          type="date"
                          value={statementDateTo}
                          onChange={(e) => setStatementDateTo(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Supplier Contact Warning or Add Form */}
                  {!supplierInfo?.email && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={18} className="text-purple-600 mt-0.5" />
                        <p className="text-sm text-purple-700">
                          לא נמצא מייל לספק זה. הוסף את פרטי הספק כאן:
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">מייל ספק</label>
                          <input
                            type="email"
                            value={newSupplierData.email}
                            onChange={(e) => setNewSupplierData({...newSupplierData, email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                            placeholder="supplier@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">טלפון (אופציונלי)</label>
                          <input
                            type="tel"
                            value={newSupplierData.phone}
                            onChange={(e) => setNewSupplierData({...newSupplierData, phone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                            placeholder="050-0000000"
                          />
                        </div>
                        <button
                          onClick={async () => {
                            if (!newSupplierData.email) {
                              alert("יש להזין מייל");
                              return;
                            }
                            setSavingSupplier(true);
                            try {
                              const newSupplier = {
                                account_number: String(statementModal.row.account),
                                name: statementModal.row.name,
                                email: newSupplierData.email,
                                phone: newSupplierData.phone || "",
                                currency: "ש\"ח",
                                vat_number: "",
                                purchase_account: "",
                                purchase_account_desc: ""
                              };
                              const response = await axios.post(`${API}/suppliers`, newSupplier);
                              setSupplierInfo(response.data);
                              setNewSupplierData({ email: "", phone: "" });
                            } catch (err) {
                              console.error("Error saving supplier:", err);
                              alert("שגיאה בשמירת הספק");
                            } finally {
                              setSavingSupplier(false);
                            }
                          }}
                          disabled={savingSupplier || !newSupplierData.email}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            newSupplierData.email && !savingSupplier
                              ? "bg-purple-600 text-white hover:bg-purple-700" 
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {savingSupplier ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>שומר...</span>
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              <span>הוסף ספק ושלח בקשה</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Button */}
                  <button
                    onClick={handleSendStatementRequest}
                    disabled={!supplierInfo?.email || sendingStatement || !statementDateFrom || !statementDateTo}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold transition-all ${
                      supplierInfo?.email && !sendingStatement && statementDateFrom && statementDateTo
                        ? "bg-purple-600 text-white hover:bg-purple-700" 
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {sendingStatement ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>שולח בקשה...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={20} />
                        <span>שלח בקשת כרטסת</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Download Button */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleDownload}
                className="flex items-center gap-3 bg-[#00CDB8] text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-[#00B5A3] shadow-lg hover:shadow-xl transition-all"
                data-testid="download-btn"
              >
                <Download size={24} />
                <span>הורד קובץ מעובד</span>
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-3 bg-red-500 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:bg-red-600 shadow-lg hover:shadow-xl transition-all"
                title="נקה את כל התוצאות"
              >
                <RefreshCw size={24} />
                <span>רענון</span>
              </button>
            </div>
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
      companyName: "אילן גינון ופיתוח בע\"מ",
      companyRegistration: "",
      microsoftEmail: "",
      microsoftName: "",
      customSignature: ""
    };
  };
  
  const [settings, setSettings] = useState(getInitialSettings);
  const [saved, setSaved] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [editingSignature, setEditingSignature] = useState(false);
  const [signatureText, setSignatureText] = useState("");

  // Check Microsoft auth status on mount and handle callback
  useEffect(() => {
    const checkAuthAndHandleCallback = async () => {
      // Check for auth callback in URL
      const urlParams = new URLSearchParams(window.location.search);
      const authSuccess = urlParams.get('auth_success');
      const authEmail = urlParams.get('email');
      const authName = urlParams.get('name');
      const authError = urlParams.get('auth_error');
      
      if (authSuccess && authEmail) {
        // Save to localStorage and state
        const newSettings = {
          ...settings,
          microsoftEmail: authEmail,
          microsoftName: authName || ""
        };
        setSettings(newSettings);
        localStorage.setItem("emailSettings", JSON.stringify(newSettings));
        setMicrosoftConnected(true);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setCheckingAuth(false);
        return;
      }
      
      if (authError) {
        alert("שגיאה בהתחברות ל-Microsoft: " + authError);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Check if already connected
      const currentSettings = getInitialSettings();
      if (currentSettings.microsoftEmail) {
        try {
          const response = await axios.get(`${API}/auth/microsoft/status?email=${encodeURIComponent(currentSettings.microsoftEmail)}`);
          setMicrosoftConnected(response.data.authenticated);
          if (!response.data.authenticated) {
            // Clear saved email if not authenticated
            const clearedSettings = { ...currentSettings, microsoftEmail: "", microsoftName: "" };
            setSettings(clearedSettings);
            localStorage.setItem("emailSettings", JSON.stringify(clearedSettings));
          }
        } catch (err) {
          console.error("Error checking auth status:", err);
        }
      }
      setCheckingAuth(false);
    };
    
    checkAuthAndHandleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    localStorage.setItem("emailSettings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleMicrosoftLogin = async () => {
    try {
      const response = await axios.get(`${API}/auth/microsoft/login`);
      window.location.href = response.data.auth_url;
    } catch (err) {
      alert("שגיאה בהתחלת תהליך ההתחברות");
    }
  };

  const handleMicrosoftLogout = async () => {
    try {
      await axios.post(`${API}/auth/microsoft/logout?email=${encodeURIComponent(settings.microsoftEmail)}`);
      const newSettings = { ...settings, microsoftEmail: "", microsoftName: "" };
      setSettings(newSettings);
      localStorage.setItem("emailSettings", JSON.stringify(newSettings));
      setMicrosoftConnected(false);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-6">
      <div className="flex items-center gap-3 mb-2">
        <Mail size={24} className="text-[#00CDB8]" />
        <h3 className="text-lg font-semibold text-gray-800">הגדרות שליחת מייל אוטומטית</h3>
      </div>
      <p className="text-sm text-gray-500 mb-6">התחבר עם חשבון Microsoft שלך כדי לשלוח מיילים ישירות מהאפליקציה.</p>
      
      {/* Microsoft Connection Section */}
      <div className={`rounded-xl p-4 mb-6 ${microsoftConnected ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{microsoftConnected ? '✅' : '🔗'}</span>
          <div className="flex-1">
            <h4 className={`font-medium ${microsoftConnected ? 'text-green-800' : 'text-blue-800'}`}>
              {microsoftConnected ? 'מחובר ל-Microsoft' : 'התחברות ל-Microsoft Outlook'}
            </h4>
            
            {checkingAuth ? (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm text-gray-600">בודק סטטוס התחברות...</span>
              </div>
            ) : microsoftConnected ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-green-700">
                  מחובר כ: <span className="font-medium">{settings.microsoftEmail}</span>
                  {settings.microsoftName && <span> ({settings.microsoftName})</span>}
                </p>
                <button
                  onClick={handleMicrosoftLogout}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  התנתק מ-Microsoft
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-blue-700 mb-3">
                  לחצי על הכפתור להתחברות עם חשבון Microsoft/Outlook שלך
                </p>
                <button
                  onClick={handleMicrosoftLogin}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0078d4] text-white rounded-lg font-medium hover:bg-[#106ebe] transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                    <rect width="10" height="10" fill="#f25022"/>
                    <rect x="11" width="10" height="10" fill="#7fba00"/>
                    <rect y="11" width="10" height="10" fill="#00a4ef"/>
                    <rect x="11" y="11" width="10" height="10" fill="#ffb900"/>
                  </svg>
                  התחבר עם Microsoft
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">שם העובד/ת</label>
          <input
            type="text"
            value={settings.signerName}
            onChange={(e) => setSettings({...settings, signerName: e.target.value})}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00CDB8]"
            placeholder="השם שלך"
          />
          <p className="text-xs text-gray-500 mt-1">השם שיופיע בחתימת המייל</p>
        </div>
        
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
          <label className="block text-sm font-medium text-gray-700 mb-2">שם החברה</label>
          <input
            type="text"
            value={settings.companyName}
            onChange={(e) => setSettings({...settings, companyName: e.target.value})}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00CDB8]"
            placeholder="שם החברה"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ח.פ (מספר חברה)</label>
          <input
            type="text"
            value={settings.companyRegistration || ""}
            onChange={(e) => setSettings({...settings, companyRegistration: e.target.value})}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#00CDB8]"
            placeholder="123456789"
          />
          <p className="text-xs text-gray-500 mt-1">יופיע בבקשת כרטסת</p>
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
      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Eye size={16} />
            תצוגה מקדימה של חתימת המייל:
          </h4>
          {!editingSignature ? (
            <button
              onClick={() => {
                const defaultSig = settings.customSignature || `*** אשמח לקבל חשבוניות במייל: ${settings.companyEmail} ***

בברכה,
${settings.signerName}
${settings.companyName}`;
                setSignatureText(defaultSig);
                setEditingSignature(true);
              }}
              className="text-sm text-[#00CDB8] hover:text-[#00B5A3] flex items-center gap-1"
            >
              <FileText size={14} />
              עריכה
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const newSettings = { ...settings, customSignature: signatureText };
                  setSettings(newSettings);
                  localStorage.setItem("emailSettings", JSON.stringify(newSettings));
                  setEditingSignature(false);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                <Check size={14} />
                שמור
              </button>
              <button
                onClick={() => setEditingSignature(false)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X size={14} />
                ביטול
              </button>
            </div>
          )}
        </div>
        
        {editingSignature ? (
          <textarea
            value={signatureText}
            onChange={(e) => setSignatureText(e.target.value)}
            className="w-full h-40 p-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#00CDB8] resize-none"
            dir="rtl"
            placeholder="ערוך את החתימה כאן..."
          />
        ) : (
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
              {settings.customSignature || `*** אשמח לקבל חשבוניות במייל: ${settings.companyEmail} ***

בברכה,
${settings.signerName}
${settings.companyName}`}
            </p>
          </div>
        )}
        
        {!editingSignature && settings.customSignature && (
          <button
            onClick={() => {
              const newSettings = { ...settings, customSignature: "" };
              setSettings(newSettings);
              localStorage.setItem("emailSettings", JSON.stringify(newSettings));
            }}
            className="mt-2 text-xs text-red-500 hover:text-red-700"
          >
            איפוס לברירת מחדל
          </button>
        )}
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

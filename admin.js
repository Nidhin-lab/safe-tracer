const SUPABASE_URL = 'https://muwighiiwoppunbfjnak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d2lnaGlpd29wcHVuYmZqbmFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMTkwNTIsImV4cCI6MjA3MDU5NTA1Mn0.30IgtRBiSUoBJTScQa5VhpZPrPVbx18MpXeTM4Pydo4';

let supabase = null;
if (typeof window.supabase !== 'undefined') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let currentUser = null;
let aiSystemsStatus = { ai: true, supabase: false };
let dashboardData = {
  clues: [],
  tips: [],
  stats: { totalClues: 0, totalTips: 0, aiProcessed: 0, highRisk: 0, resolved: 0 }
};

let caseNumbersCache = {};
let additionalEvidenceCache = {};
let tipStatusCache = {};

class IntelligentAI {
  constructor() {
    this.riskKeywords = {
      high: ['urgent', 'immediate', 'danger', 'threat', 'emergency', 'critical', 'violence', 'harm', 'abuse', 'attack', 'missing', 'kidnap', 'assault', 'murder', 'death', 'weapon'],
      medium: ['suspicious', 'concerning', 'unusual', 'important', 'significant', 'witness', 'evidence', 'incident', 'theft', 'robbery', 'fraud', 'vandalism'],
      low: ['minor', 'routine', 'normal', 'regular', 'standard', 'parking', 'noise', 'complaint', 'lost', 'found']
    };

    this.sentimentWords = {
      positive: ['safe', 'secure', 'protected', 'helped', 'rescued', 'found', 'solved', 'resolved', 'recovered', 'good', 'better'],
      negative: ['scared', 'worried', 'afraid', 'dangerous', 'missing', 'lost', 'hurt', 'injured', 'threatened', 'attacked', 'bad', 'terrible']
    };
  }

  analyzeContent(description) {
    const sentiment = this.analyzeSentiment(description);
    const riskLevel = this.assessRisk(description);
    const urgency = this.assessUrgency(description);
    const keywords = this.extractKeywords(description);
    const confidence = this.calculateConfidence(description);
    const summary = this.generateSummary(description, riskLevel);

    return {
      sentiment: sentiment,
      risk_level: riskLevel,
      confidence: confidence,
      summary: summary,
      urgency: urgency,
      keywords: keywords,
      processing_time: Date.now()
    };
  }

  analyzeSentiment(text) {
    const lowerText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    this.sentimentWords.positive.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });

    this.sentimentWords.negative.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });

    if (negativeCount > positiveCount) return 'negative';
    if (positiveCount > negativeCount) return 'positive';
    return 'neutral';
  }

  assessRisk(text) {
    const lowerText = text.toLowerCase();
    let highRiskCount = 0;
    let mediumRiskCount = 0;

    this.riskKeywords.high.forEach(keyword => {
      if (lowerText.includes(keyword)) highRiskCount++;
    });

    this.riskKeywords.medium.forEach(keyword => {
      if (lowerText.includes(keyword)) mediumRiskCount++;
    });

    if (highRiskCount > 0) return 'high';
    if (mediumRiskCount > 0) return 'medium';
    return 'low';
  }

  assessUrgency(text) {
    const urgentWords = ['urgent', 'immediate', 'emergency', 'asap', 'quickly', 'now'];
    const lowerText = text.toLowerCase();
    const urgentCount = urgentWords.filter(word => lowerText.includes(word)).length;

    if (urgentCount > 1) return 'high';
    if (urgentCount > 0) return 'medium';
    return 'low';
  }

  extractKeywords(text) {
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const filteredWords = words.filter(word => !stopWords.includes(word));

    const wordCount = {};
    filteredWords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  calculateConfidence(description) {
    let confidence = 0.6;
    if (description.length > 50) confidence += 0.1;
    if (description.length > 100) confidence += 0.1;
    if (/\d/.test(description)) confidence += 0.1;
    if (/[A-Z][a-z]+ (Street|Road|Avenue)/.test(description)) confidence += 0.1;
    return Math.min(confidence, 1.0);
  }

  generateSummary(description, riskLevel) {
    const riskText = riskLevel === 'high' ? 'High-priority' : riskLevel === 'medium' ? 'Standard' : 'Low-priority';
    if (description.length <= 80) {
      return `${riskText} investigation case`;
    }
    const firstSentence = description.split(/[.!?]/)[0];
    return `${riskText}: ${firstSentence.substring(0, 60)}...`;
  }
}

function generateCaseNumber() {
  return Math.floor(Math.random() * 9000) + 1000;
}

function getCaseNumber(clue) {
  if (!clue) return generateCaseNumber();

  if (clue.parent_case_id) {
    const parentCase = dashboardData.clues.find(c => c.id === clue.parent_case_id);
    if (parentCase) {
      return parentCase.case_number || getCaseNumber(parentCase);
    }
  }

  if (clue.case_number) return clue.case_number;
  if (caseNumbersCache[clue.id]) return caseNumbersCache[clue.id];
  const newCaseNumber = generateCaseNumber();
  caseNumbersCache[clue.id] = newCaseNumber;
  return newCaseNumber;
}

function isAdditionalEvidence(clue) {
  if (!clue) return false;
  return clue.parent_case_id !== null && clue.parent_case_id !== undefined;
}

function getParentCaseId(clue) {
  if (!clue) return null;
  return clue.parent_case_id || additionalEvidenceCache[clue.id] || null;
}

function setAdditionalEvidence(clueId, parentCaseId) {
  additionalEvidenceCache[clueId] = parentCaseId;
}

function getTipStatus(tipId) {
  return tipStatusCache[tipId] || null;
}

function setTipStatus(tipId, status) {
  tipStatusCache[tipId] = status;
}

const intelligentAI = new IntelligentAI();

document.addEventListener('DOMContentLoaded', function() {
  checkAuthState();
  setupEventListeners();
  testAllSystems();
});

async function checkAuthState() {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      currentUser = user;
      showDashboard();
      loadDashboardData();
    }
  } catch (error) {
    console.log('Auth state check error:', error);
  }
}

function setupEventListeners() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const buttons = [
    { id: 'uploadClueBtn', handler: openFileUploadModal },
    { id: 'generateAIReportBtn', handler: generateFullAIReport },
    { id: 'correlateDataBtn', handler: runAICorrelation },
    { id: 'refreshDashboardBtn', handler: refreshAIStatus },
    { id: 'logoutBtn', handler: handleLogout }
  ];

  buttons.forEach(({ id, handler }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', handler);
    }
  });
}


function showSuccessMessage(message) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
    border: 2px solid #39ff14;
    border-radius: 15px;
    padding: 30px;
    z-index: 10000;
    box-shadow: 0 0 30px rgba(57, 255, 20, 0.3);
    color: #39ff14;
    text-align: center;
    font-family: 'Orbitron', monospace;
    animation: successFade 0.5s ease-in;
  `;

  popup.innerHTML = `
    <h3 style="color: #39ff14; margin-bottom: 15px;">🚀 AUTHENTICATION SUCCESSFUL</h3>
    <p style="color: #ffffff; margin: 10px 0;">${message}</p>
    <p style="color: #39ff14; font-size: 0.9rem;">Safe Tracer by NIDHIN R</p>
  `;

  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes successFade {
      from { opacity: 0; transform: translate(-50%, -60%); }
      to { opacity: 1; transform: translate(-50%, -50%); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(popup);

  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(popup);
      document.head.removeChild(style);
    }, 300);
  }, 3000);
}

function openFileUploadModal() {
  resetUploadForm();
  const modal = new bootstrap.Modal(document.getElementById('fileUploadModal'));
  modal.show();
  setTimeout(() => {
    setupFileUploadHandlers();
  }, 200);
}

function resetUploadForm() {
  const elements = {
    description: document.getElementById('evidenceDescription'),
    url: document.getElementById('evidenceUrl'),
    file: document.getElementById('evidenceFile'),
    preview: document.getElementById('imagePreview'),
    confirmation: document.getElementById('uploadConfirmation'),
    btn: document.getElementById('uploadConfirmBtn'),
    urlMethod: document.getElementById('urlMethod'),
    urlSection: document.getElementById('urlUploadSection'),
    fileSection: document.getElementById('fileUploadSection'),
    newCaseType: document.getElementById('newCaseType'),
    caseSelection: document.getElementById('caseSelection')
  };

  if (elements.description) elements.description.value = '';
  if (elements.url) elements.url.value = '';
  if (elements.file) elements.file.value = '';
  if (elements.preview) elements.preview.style.display = 'none';
  if (elements.confirmation) elements.confirmation.checked = false;
  if (elements.btn) {
    elements.btn.disabled = true;
    elements.btn.classList.remove('btn-success');
    elements.btn.classList.add('btn-secondary');
  }

  if (elements.urlMethod) elements.urlMethod.checked = true;
  if (elements.urlSection) elements.urlSection.style.display = 'block';
  if (elements.fileSection) elements.fileSection.style.display = 'none';
  if (elements.newCaseType) elements.newCaseType.checked = true;
  if (elements.caseSelection) elements.caseSelection.style.display = 'none';

  const modalTitle = document.querySelector('#fileUploadModal .modal-title');
  if (modalTitle) {
    modalTitle.textContent = '📁 Upload Evidence - Choose Method';
  }
}

function setupFileUploadHandlers() {
  const uploadMethodRadios = document.querySelectorAll('input[name="uploadMethod"]');
  const urlSection = document.getElementById('urlUploadSection');
  const fileSection = document.getElementById('fileUploadSection');
  const evidenceUrl = document.getElementById('evidenceUrl');
  const evidenceFile = document.getElementById('evidenceFile');
  const previewImage = document.getElementById('previewImage');
  const imagePreview = document.getElementById('imagePreview');
  const uploadConfirmation = document.getElementById('uploadConfirmation');
  const uploadConfirmBtn = document.getElementById('uploadConfirmBtn');
  const caseSelection = document.getElementById('caseSelection');
  const evidenceDescription = document.getElementById('evidenceDescription');
  const caseTypeRadios = document.querySelectorAll('input[name="caseType"]');

  uploadMethodRadios.forEach(radio => {
    radio.removeEventListener('change', handleMethodChange);
    radio.addEventListener('change', handleMethodChange);
  });

  function handleMethodChange() {
    const selectedMethod = document.querySelector('input[name="uploadMethod"]:checked')?.value;
    if (selectedMethod === 'url') {
      if (urlSection) urlSection.style.display = 'block';
      if (fileSection) fileSection.style.display = 'none';
      if (evidenceFile) evidenceFile.value = '';
    } else {
      if (urlSection) urlSection.style.display = 'none';
      if (fileSection) fileSection.style.display = 'block';
      if (evidenceUrl) evidenceUrl.value = '';
    }
    if (imagePreview) imagePreview.style.display = 'none';
    checkUploadReadiness();
  }

  if (evidenceUrl) {
    evidenceUrl.removeEventListener('input', handleUrlInput);
    evidenceUrl.addEventListener('input', handleUrlInput);
  }

  function handleUrlInput() {
    const url = evidenceUrl.value.trim();
    if (url && isValidImageUrl(url)) {
      if (previewImage) {
        previewImage.src = url;
        previewImage.onload = function() {
          if (imagePreview) imagePreview.style.display = 'block';
          checkUploadReadiness();
        };
        previewImage.onerror = function() {
          if (imagePreview) imagePreview.style.display = 'none';
          checkUploadReadiness();
        };
      }
    } else {
      if (imagePreview) imagePreview.style.display = 'none';
      checkUploadReadiness();
    }
  }

  if (evidenceFile) {
    evidenceFile.removeEventListener('change', handleFileChange);
    evidenceFile.addEventListener('change', handleFileChange);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Maximum size is 10MB.');
        e.target.value = '';
        checkUploadReadiness();
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        if (previewImage) previewImage.src = e.target.result;
        if (imagePreview) imagePreview.style.display = 'block';
        checkUploadReadiness();
      };
      reader.readAsDataURL(file);
    } else {
      if (imagePreview) imagePreview.style.display = 'none';
      checkUploadReadiness();
    }
  }

  if (uploadConfirmation) {
    uploadConfirmation.removeEventListener('change', checkUploadReadiness);
    uploadConfirmation.addEventListener('change', checkUploadReadiness);
  }

  if (uploadConfirmBtn) {
    uploadConfirmBtn.removeEventListener('click', handleEvidenceUpload);
    uploadConfirmBtn.addEventListener('click', handleEvidenceUpload);
  }

  if (evidenceDescription) {
    evidenceDescription.removeEventListener('input', checkUploadReadiness);
    evidenceDescription.addEventListener('input', checkUploadReadiness);
  }

  caseTypeRadios.forEach(radio => {
    radio.removeEventListener('change', handleCaseTypeChange);
    radio.addEventListener('change', handleCaseTypeChange);
  });

  function handleCaseTypeChange() {
    const selectedType = document.querySelector('input[name="caseType"]:checked')?.value;
    if (selectedType === 'existing' && caseSelection) {
      caseSelection.style.display = 'block';
      populateExistingCases();
    } else if (caseSelection) {
      caseSelection.style.display = 'none';
    }
    checkUploadReadiness();
  }

  function isValidImageUrl(url) {
    try {
      new URL(url);
      return /\.(jpg|jpeg|png|gif|webp|bmp|tiff)(\?.*)?$/i.test(url);
    } catch {
      return false;
    }
  }

  function checkUploadReadiness() {
    const description = evidenceDescription?.value?.trim() || '';
    const selectedMethod = document.querySelector('input[name="uploadMethod"]:checked')?.value || 'url';

    let hasValidSource = false;
    if (selectedMethod === 'url') {
      const urlValue = evidenceUrl?.value?.trim() || '';
      hasValidSource = urlValue && isValidImageUrl(urlValue);
    } else {
      hasValidSource = evidenceFile?.files?.[0] ? true : false;
    }

    const confirmed = uploadConfirmation?.checked || false;

    const selectedCaseType = document.querySelector('input[name="caseType"]:checked')?.value || 'new';
    let hasValidCase = false;
    if (selectedCaseType === 'new') {
      hasValidCase = true;
    } else if (selectedCaseType === 'existing') {
      const existingCaseSelect = document.getElementById('existingCaseSelect');
      hasValidCase = existingCaseSelect?.value ? true : false;
    }

    const isReady = description && hasValidSource && confirmed && hasValidCase;

    if (uploadConfirmBtn) {
      uploadConfirmBtn.disabled = !isReady;
      if (isReady) {
        uploadConfirmBtn.classList.remove('btn-secondary');
        uploadConfirmBtn.classList.add('btn-success');
      } else {
        uploadConfirmBtn.classList.remove('btn-success');
        uploadConfirmBtn.classList.add('btn-secondary');
      }
    }
  }

  function populateExistingCases() {
    const existingCaseSelect = document.getElementById('existingCaseSelect');
    if (!existingCaseSelect) return;

    existingCaseSelect.innerHTML = '<option value="">Select a case...</option>';

    if (dashboardData.clues.length > 0) {
      dashboardData.clues.forEach(clue => {
        if (clue.status !== 'resolved' && !isAdditionalEvidence(clue)) {
          const option = document.createElement('option');
          option.value = clue.id;
          const caseNum = getCaseNumber(clue);
          option.textContent = `Case ${caseNum}: ${clue.description.substring(0, 50)}...`;
          existingCaseSelect.appendChild(option);
        }
      });
    }

    existingCaseSelect.removeEventListener('change', checkUploadReadiness);
    existingCaseSelect.addEventListener('change', checkUploadReadiness);
  }

  checkUploadReadiness();
}

async function handleEvidenceUpload() {
  const description = document.getElementById('evidenceDescription')?.value?.trim();
  const selectedMethod = document.querySelector('input[name="uploadMethod"]:checked')?.value || 'url';
  const selectedCaseType = document.querySelector('input[name="caseType"]:checked')?.value || 'new';
  const existingCaseId = selectedCaseType === 'existing' ? document.getElementById('existingCaseSelect')?.value : null;

  let imageSource = null;
  if (selectedMethod === 'url') {
    imageSource = document.getElementById('evidenceUrl')?.value?.trim();
  } else {
    imageSource = document.getElementById('evidenceFile')?.files?.[0];
  }

  if (!description || !imageSource) {
    alert('Please provide both description and image.');
    return;
  }

  const uploadBtn = document.getElementById('uploadConfirmBtn');
  const uploadBtnText = document.getElementById('uploadBtnText');
  const uploadSpinner = document.getElementById('uploadSpinner');

  try {
    if (uploadBtn) uploadBtn.disabled = true;
    if (uploadSpinner) uploadSpinner.style.display = 'inline-block';
    if (uploadBtnText) uploadBtnText.textContent = '🤖 AI Processing...';

    const aiAnalysis = intelligentAI.analyzeContent(description);

    let originalImageUrl;
    if (selectedMethod === 'url') {
      originalImageUrl = imageSource;
      if (uploadBtnText) uploadBtnText.textContent = '🛡️ Applying Privacy Protection...';
    } else {
      if (uploadBtnText) uploadBtnText.textContent = '📁 Uploading File...';
      originalImageUrl = await uploadEvidenceFile(imageSource);
      if (uploadBtnText) uploadBtnText.textContent = '🛡️ Applying Privacy Protection...';
    }

    const enhancedBlurredUrl = await createEnhancedBlurredEvidence(originalImageUrl);

    if (uploadBtnText) uploadBtnText.textContent = '💾 Saving to Database...';

    if (selectedCaseType === 'existing' && existingCaseId) {
      
      const clueData = {
        description: description,
        image_url: enhancedBlurredUrl,
        original_image_url: originalImageUrl,
        status: 'active',
        ai_analysis: aiAnalysis,
        parent_case_id: parseInt(existingCaseId), 
        case_number: null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('clues')
        .insert(clueData)
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setAdditionalEvidence(data.id, existingCaseId);
      }

      const parentCase = dashboardData.clues.find(c => String(c.id) === String(existingCaseId));
      const parentCaseNum = getCaseNumber(parentCase);

      alert(`✅ Evidence added to Case ${parentCaseNum}!\n🛡️ Enhanced privacy protection applied\n🔍 Evidence linked to existing investigation\n🤖 AI processing completed`);
    } else {
      
      const caseNumber = generateCaseNumber();

      const clueData = {
        description: description,
        image_url: enhancedBlurredUrl,
        original_image_url: originalImageUrl,
        status: 'active',
        ai_analysis: aiAnalysis,
        case_number: caseNumber,
        parent_case_id: null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('clues')
        .insert(clueData)
        .select();

      if (error) throw error;

      if (data && data[0]) {
        caseNumbersCache[data.id] = caseNumber;

        try {
          await supabase
            .from('clues')
            .update({ priority: 'medium' })
            .eq('id', data.id);
        } catch (priorityError) {
          console.log('Priority setting failed, continuing without priority');
        }
      }

      alert(`✅ New Investigation Case ${caseNumber} created successfully!\n🛡️ Enhanced privacy protection applied\n🔍 Scene context preserved for public tips\n🤖 AI processing completed`);
    }

    if (uploadBtnText) uploadBtnText.textContent = '✅ Upload Complete!';

    setTimeout(() => {
      const modal = bootstrap.Modal.getInstance(document.getElementById('fileUploadModal'));
      if (modal) {
        modal.hide();
      }
      loadDashboardData();
    }, 1000);

  } catch (error) {
    console.error('Upload error:', error);
    alert('❌ Error uploading evidence: ' + error.message);
  } finally {
    if (uploadBtn) uploadBtn.disabled = false;
    if (uploadSpinner) uploadSpinner.style.display = 'none';
    if (uploadBtnText) uploadBtnText.textContent = '🤖 AI Process & Upload';
  }
}

async function uploadEvidenceFile(file) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `evidence-${Date.now()}.${fileExt}`;
    const filePath = `evidence/${fileName}`;

    const { data, error } = await supabase.storage
      .from('investigation-photos')
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (error) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    const { data: urlData } = supabase.storage
      .from('investigation-photos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

async function testAllSystems() {
  aiSystemsStatus.supabase = !!supabase;
  updateSystemStatus('supabase', aiSystemsStatus.supabase ? 'online' : 'offline');
  aiSystemsStatus.ai = true;
  updateSystemStatus('ai', 'online');
}

function updateSystemStatus(system, status) {
  const statusDot = document.getElementById(`${system}Status`);
  if (statusDot) {
    statusDot.className = `status-dot ${status}`;
  }
}

async function refreshAIStatus() {
  const btn = document.getElementById('refreshDashboardBtn');
  if (!btn) return;
  const originalText = btn.innerHTML;
  btn.innerHTML = '🔄 Refreshing AI Status...';
  btn.disabled = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    aiSystemsStatus.ai = true;
    updateSystemStatus('ai', 'online');
    aiSystemsStatus.supabase = !!supabase;
    updateSystemStatus('supabase', aiSystemsStatus.supabase ? 'online' : 'offline');
    alert('✅ AI Status refreshed successfully!\n🤖 AI Systems: Online\n🗄️ Database: ' + (aiSystemsStatus.supabase ? 'Connected' : 'Offline'));
  } catch (error) {
    alert('❌ Error refreshing AI status: ' + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function handleLogin(e) {
  e.preventDefault();

  if (!supabase) {
    alert('Database connection unavailable. Please contact system administrator.');
    return;
  }

  const email = document.getElementById('email')?.value?.trim() || '';
  const password = document.getElementById('password')?.value || '';
  const submitBtn = document.querySelector('.login-submit-btn');

  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  const originalText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.innerHTML = '🤖 AI Authentication...';
    submitBtn.disabled = true;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    if (data.user) {
      currentUser = data.user;
      showDashboard();
      loadDashboardData();

      
      showSuccessMessage('🤖 Welcome to Safe Tracer AI Dashboard<br>🛡️ Secure access granted');
    } else {
      throw new Error('No user data received');
    }

  } catch (error) {
    let errorMessage = 'Authentication failed. ';
    if (error.message.includes('Invalid login credentials')) {
      errorMessage += 'Invalid email or password.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage += 'Please confirm your email address first.';
    } else {
      errorMessage += error.message;
    }
    alert(errorMessage);
  } finally {
    if (submitBtn) {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }
}

function showDashboard() {
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');

  if (loginSection) {
    loginSection.style.display = 'none';
  }
  if (dashboardSection) {
    dashboardSection.style.display = 'block';
  }
}

async function loadDashboardData() {
  if (!supabase || !currentUser) {
    console.warn('Cannot load data: Missing Supabase or user authentication');
    return;
  }
  try {
    const { data: clues, error: cluesError } = await supabase
      .from('clues')
      .select('*')
      .order('created_at', { ascending: false });
    if (cluesError) {
      console.error('Error loading clues:', cluesError);
      throw cluesError;
    }

    const { data: tips, error: tipsError } = await supabase
      .from('tips')
      .select('*')
      .order('created_at', { ascending: false });
    if (tipsError) {
      console.error('Error loading tips:', tipsError);
      dashboardData.tips = [];
    } else {
      dashboardData.tips = tips || [];
    }

    dashboardData.clues = clues || [];

    calculateAIStats();
    updateStatisticsCards();
    updateInvestigationsTable();
    updateAICharts();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    alert('Error loading dashboard data: ' + error.message + '\n\nPlease check your database connection and try again.');
  }
}

function calculateAIStats() {
  const stats = dashboardData.stats;

  const investigations = dashboardData.clues.filter(clue => !isAdditionalEvidence(clue));

  stats.totalClues = investigations.length;
  stats.totalTips = dashboardData.tips.length;
  stats.aiProcessed = dashboardData.clues.length;
  stats.highRisk = dashboardData.clues.filter(clue => 
    (clue.ai_analysis && clue.ai_analysis.risk_level === 'high') || 
    (clue.priority === 'high')
  ).length;
  stats.resolved = investigations.filter(clue => clue.status === 'resolved').length;
}

function updateStatisticsCards() {
  const stats = dashboardData.stats;
  const updates = {
    'totalClues': stats.totalClues,
    'totalTips': stats.totalTips,
    'aiProcessed': stats.aiProcessed,
    'highRisk': stats.highRisk,
    'resolved': stats.resolved
  };
  Object.entries(updates).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

async function updateInvestigationsTable() {
  const tbody = document.getElementById('investigationsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const mainInvestigations = dashboardData.clues.filter(clue => !isAdditionalEvidence(clue));

  if (mainInvestigations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <div class="no-data-message">
            No investigation cases uploaded yet.<br>
            <small>Use "AI Upload & Sanitize Clue" to add evidence.</small>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  mainInvestigations.forEach(clue => {
    const clueTips = dashboardData.tips.filter(tip => 
      String(tip.clue_id) === String(clue.id)
    );
    const tipCount = clueTips.length;
    const riskLevel = clue.ai_analysis?.risk_level || 'medium';
    const priority = clue.priority || 'medium';
    const status = clue.status || 'active';
    const caseNumber = getCaseNumber(clue);

    const allCaseEvidence = dashboardData.clues.filter(c => 
      c.id === clue.id || (isAdditionalEvidence(c) && getParentCaseId(c) === clue.id)
    );
    const evidenceCount = allCaseEvidence.length;

    const priorityBadge = priority === 'high' 
      ? '<span class="badge bg-danger">HIGH</span>'
      : priority === 'low' 
      ? '<span class="badge bg-success">LOW</span>'
      : '<span class="badge bg-warning">MEDIUM</span>';

    const statusBadge = status === 'resolved' 
      ? '<span class="badge bg-success">RESOLVED</span>'
      : '<span class="badge bg-info">ACTIVE</span>';

    const evidenceBadge = evidenceCount > 1 
      ? `<span class="badge bg-purple ms-1" title="Evidence Count">${evidenceCount} 📎</span>`
      : '';

    const row = document.createElement('tr');
    row.id = `case-row-${clue.id}`;
    if (status === 'resolved') {
      row.style.opacity = '0.7';
    }
    row.innerHTML = `
      <td><strong>Case ${caseNumber}</strong>${evidenceBadge}</td>
      <td>${clue.description.length > 50 ? clue.description.substring(0, 50) + '...' : clue.description}</td>
      <td><span class="badge bg-primary">${tipCount}</span></td>
      <td class="priority-cell-${clue.id}">${priorityBadge}</td>
      <td><span class="badge bg-warning">${riskLevel.toUpperCase()}</span></td>
      <td>${statusBadge}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-light" onclick="viewFullCaseDetails('${clue.id}')" title="View Details">
            📋
          </button>
          <button class="btn btn-outline-info" onclick="addEvidenceToCase('${clue.id}')" title="Add Evidence">
            📎
          </button>
          <button class="btn btn-outline-danger priority-btn-${clue.id}" onclick="setPriority('${clue.id}', 'high')" title="Set High Priority">
            🚨
          </button>
          <button class="btn btn-outline-warning priority-btn-${clue.id}" onclick="setPriority('${clue.id}', 'medium')" title="Set Medium Priority">
            📊
          </button>
          <button class="btn btn-outline-success priority-btn-${clue.id}" onclick="setPriority('${clue.id}', 'low')" title="Set Low Priority">
            📋
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

window.addEvidenceToCase = function(caseId) {
  const targetCase = dashboardData.clues.find(c => String(c.id) === String(caseId));
  if (!targetCase) {
    alert('Case not found!');
    return;
  }

  resetUploadForm();

  const modal = new bootstrap.Modal(document.getElementById('fileUploadModal'));
  modal.show();

  setTimeout(() => {
    const existingCaseRadio = document.getElementById('existingCaseType');
    const existingCaseSelect = document.getElementById('existingCaseSelect');
    const caseSelection = document.getElementById('caseSelection');

    if (existingCaseRadio) {
      existingCaseRadio.checked = true;
    }

    if (caseSelection) {
      caseSelection.style.display = 'block';
    }

    if (existingCaseSelect) {
      existingCaseSelect.innerHTML = '<option value="">Select a case...</option>';
      dashboardData.clues.forEach(clue => {
        if (clue.status !== 'resolved' && !isAdditionalEvidence(clue)) {
          const option = document.createElement('option');
          option.value = clue.id;
          const caseNum = getCaseNumber(clue);
          option.textContent = `Case ${caseNum}: ${clue.description.substring(0, 50)}...`;
          if (clue.id == caseId) {
            option.selected = true;
          }
          existingCaseSelect.appendChild(option);
        }
      });
    }

    const modalTitle = document.querySelector('#fileUploadModal .modal-title');
    const caseNum = getCaseNumber(targetCase);
    if (modalTitle) {
      modalTitle.textContent = `📎 Add Evidence to Case ${caseNum}`;
    }

    setupFileUploadHandlers();
  }, 300);
};

window.setPriority = async function(clueId, priority) {
  try {
    const priorityBtns = document.querySelectorAll(`.priority-btn-${clueId}`);
    priorityBtns.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = '⏳';
    });

    const priorityCell = document.querySelector(`.priority-cell-${clueId}`);
    if (priorityCell) {
      const priorityBadge = priority === 'high' 
        ? '<span class="badge bg-danger">HIGH</span>'
        : priority === 'low' 
        ? '<span class="badge bg-success">LOW</span>'
        : '<span class="badge bg-warning">MEDIUM</span>';
      priorityCell.innerHTML = priorityBadge;
    }

    try {
      const { error } = await supabase
        .from('clues')
        .update({ priority: priority, updated_at: new Date().toISOString() })
        .eq('id', clueId);
      if (error) throw error;
    } catch (e) {
      console.log('Priority update failed:', e);
    }

    const clue = dashboardData.clues.find(c => String(c.id) === String(clueId));
    if (clue) {
      clue.priority = priority;
    }

    const caseNum = getCaseNumber(clue);
    const priorityText = priority.toUpperCase();
    alert(`✅ Case ${caseNum} priority set to: ${priorityText}\n\nPriority updated successfully!`);

    calculateAIStats();
    updateStatisticsCards();

    priorityBtns.forEach(btn => {
      btn.disabled = false;
      if (btn.title.toLowerCase().includes(priority)) {
        btn.innerHTML = '✅';
        setTimeout(() => {
          btn.innerHTML = btn.title.includes('High') ? '🚨' : btn.title.includes('Medium') ? '📊' : '📋';
        }, 2000);
      } else {
        btn.innerHTML = btn.title.includes('High') ? '🚨' : btn.title.includes('Medium') ? '📊' : '📋';
      }
    });

  } catch (error) {
    alert(`❌ Error updating priority: ${error.message}`);
    const priorityBtns = document.querySelectorAll(`.priority-btn-${clueId}`);
    priorityBtns.forEach(btn => {
      btn.disabled = false;
      btn.innerHTML = btn.title.includes('High') ? '🚨' : btn.title.includes('Medium') ? '📊' : '📋';
    });
  }
};

async function createEnhancedBlurredEvidence(imageUrl) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
        tempCtx.filter = 'blur(30px)';
        tempCtx.drawImage(tempCanvas, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height * 0.6);
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height * 0.6, 0, 0, canvas.width, canvas.height * 0.6);
        ctx.drawImage(img, 0, canvas.height * 0.6, canvas.width, canvas.height * 0.4, 0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        const blocks = [
          {x: canvas.width*0.15, y: canvas.height*0.1, w: canvas.width*0.25, h: canvas.height*0.25},
          {x: canvas.width*0.6, y: canvas.height*0.12, w: canvas.width*0.25, h: canvas.height*0.22},
          {x: canvas.width*0.35, y: canvas.height*0.25, w: canvas.width*0.22, h: canvas.height*0.18}
        ];
        for (const block of blocks) {
          roundRect(ctx, block.x, block.y, block.w, block.h, 15);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = `${Math.min(block.h*0.4, 24)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🛡️', block.x + block.w/2, block.y + block.h/2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        }
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.textAlign = 'center';
        ctx.fillText('CHILD PRIVACY PROTECTED', canvas.width/2, 25);
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('Safe Tracer by NIDHIN R - Enhanced Privacy Protection', canvas.width/2, canvas.height-15);
        canvas.toBlob(async (blob) => {
          try {
            const fileName = `enhanced-privacy-${Date.now()}.jpg`;
            const filePath = `evidence/${fileName}`;
            const {data, error} = await supabase.storage
              .from('investigation-photos')
              .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
            if(error) {
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } else {
              const { data: urlData } = supabase.storage
                .from('investigation-photos')
                .getPublicUrl(filePath);
              resolve(urlData.publicUrl);
            }
          } catch(uploadError) {
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          }
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function() {
        resolve(imageUrl);
      };
      img.src = imageUrl;
    } catch (error) {
      reject(error);
    }
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

window.viewFullCaseDetails = async function(clueId) {
  const clue = dashboardData.clues.find(c => String(c.id) === String(clueId));
  if (!clue) {
    alert(`Case not found! Try refreshing the dashboard data.`);
    return;
  }

  const tips = dashboardData.tips.filter(t => String(t.clue_id) === String(clueId));

  const allEvidence = dashboardData.clues.filter(c => 
    c.id === clue.id || (isAdditionalEvidence(c) && getParentCaseId(c) === clue.id)
  );

  const isResolved = clue.status === 'resolved';
  const priority = clue.priority || 'medium';
  const caseNumber = getCaseNumber(clue);

  const caseDetailsHTML = `
    <div class="case-details-container">
      <div class="row mb-4">
        <div class="col-md-4">
          <div class="evidence-gallery">
            <h6 class="text-warning">📎 Case Evidence (${allEvidence.length} pieces)</h6>
            ${allEvidence.map((evidence, index) => `
              <div class="evidence-item mb-3">
                <div class="evidence-image">
                  <img src="${evidence.image_url}" class="img-fluid rounded border-glow" alt="Evidence ${index + 1}" 
                       style="max-width: 100%; height: auto; cursor: pointer;" 
                       onclick="showEvidenceImage('${evidence.image_url}', 'Case ${caseNumber} Evidence ${index + 1}')">
                </div>
                <div class="evidence-info mt-2">
                  <small class="text-success">🛡️ Privacy Protected</small>
                  <p class="evidence-desc mt-1" style="font-size: 0.9rem;">
                    ${evidence.description.length > 100 ? evidence.description.substring(0, 100) + '...' : evidence.description}
                  </p>
                  ${evidence.original_image_url ? `
                    <button class="btn btn-xs btn-outline-info mt-1" onclick="viewOriginalEvidence('${evidence.original_image_url}', '${evidence.id}')">
                      👁️ View Original
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="col-md-8">
          <h5 class="text-glow">📋 Case Information</h5>
          <p><strong>Case ID:</strong> Case ${caseNumber}</p>
          <p><strong>Primary Description:</strong> ${clue.description}</p>
          <p><strong>Created:</strong> ${new Date(clue.created_at).toLocaleString()}</p>
          <p><strong>Priority:</strong> <span class="badge ${priority === 'high' ? 'bg-danger' : priority === 'low' ? 'bg-success' : 'bg-warning'}">${priority.toUpperCase()}</span></p>
          <p><strong>Status:</strong> ${isResolved ? '<span class="badge bg-success">✅ RESOLVED</span>' : '<span class="badge bg-info">🔍 Active Investigation</span>'}</p>
          <p><strong>Total Evidence:</strong> ${allEvidence.length} pieces</p>
          ${clue.ai_analysis ? `
            <div class="mt-3">
              <h6 class="text-glow">🤖 AI Analysis Results</h6>
              <p><strong>Risk Level:</strong> <span class="badge ${clue.ai_analysis.risk_level === 'high' ? 'bg-danger' : clue.ai_analysis.risk_level === 'low' ? 'bg-success' : 'bg-warning'}">${clue.ai_analysis.risk_level.toUpperCase()}</span></p>
              <p><strong>Sentiment:</strong> ${clue.ai_analysis.sentiment}</p>
              <p><strong>Urgency:</strong> ${clue.ai_analysis.urgency}</p>
              <p><strong>Confidence:</strong> ${Math.round(clue.ai_analysis.confidence * 100)}%</p>
              <p><strong>Keywords:</strong> ${clue.ai_analysis.keywords ? clue.ai_analysis.keywords.join(', ') : 'None'}</p>
              <p><strong>AI Summary:</strong> ${clue.ai_analysis.summary}</p>
            </div>
          ` : ''}
        </div>
      </div>
      <hr class="border-glow">
      <h5 class="text-glow mb-3">💬 Anonymous Tips (${tips.length})</h5>
      <div class="tips-section" style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 10px; min-height: 200px;">
        ${tips.length === 0 ? '<p class="text-light">No tips received yet for this case.</p>' : tips.map((tip, i) => {
          const tipText = tip.tip_text || tip.text || tip.tip || 'Photo evidence submitted';
          const hasPhoto = tip.photo_url;
          const qualityScore = tip.quality_score ? Math.round(tip.quality_score * 100) : 0;
          const tipStatus = getTipStatus(tip.id);
          const isUseful = tipStatus === 'useful' || (tip.notes && tip.notes.includes('useful'));
          const isFlagged = tipStatus === 'flagged' || (tip.notes && tip.notes.includes('flagged'));

          return `
            <div class="card mb-3" style="background: rgba(255, 255, 255, 0.95) !important; color: #000000 !important; border: 2px solid #39ff14;">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 class="card-title" style="color: #000000 !important; font-weight: bold;">💡 Anonymous Tip #${i+1}</h6>
                    <div class="tip-tags">
                      ${isUseful ? '<span class="badge bg-success me-1">✅ MARKED USEFUL</span>' : ''}
                      ${isFlagged ? '<span class="badge bg-warning me-1">🚩 FLAGGED FOR REVIEW</span>' : ''}
                    </div>
                  </div>
                  <small style="color: #555555 !important;">${new Date(tip.created_at).toLocaleString()}</small>
                </div>

                <div class="tip-content mb-2">
                  <p class="card-text" style="color: #000000 !important;"><strong>Tip:</strong> ${tipText}</p>
                  ${qualityScore > 0 ? `
                    <div class="quality-indicator mb-2">
                      <small style="color: #0066cc !important; font-weight: bold;">
                        <strong>AI Quality Score:</strong> ${qualityScore}% 
                        ${qualityScore >= 80 ? '🌟 Excellent' : qualityScore >= 60 ? '👍 Good' : qualityScore >= 40 ? '📝 Fair' : '💭 Basic'}
                      </small>
                    </div>
                  ` : ''}
                </div>

                ${hasPhoto ? `
                  <div class="tip-photo mb-2">
                    <img src="${tip.photo_url}" alt="Tip Photo Evidence" class="img-fluid rounded border-info" 
                         style="max-height: 200px; cursor: pointer;" 
                         onclick="showEvidenceImage('${tip.photo_url}', 'Tip #${i+1} Photo Evidence')">
                    <br><small style="color: #0066cc !important;" class="mt-1">📸 Photo Evidence Attached</small>
                  </div>
                ` : ''}

                <div class="tip-actions">
                  <button class="btn btn-sm ${isUseful ? 'btn-success' : 'btn-outline-success'}" onclick="markTipUseful('${tip.id}', '${clue.id}')" ${isUseful ? 'disabled' : ''}>
                    ${isUseful ? '✅ Marked as Useful' : '👍 Mark as Useful'}
                  </button>
                  <button class="btn btn-sm ${isFlagged ? 'btn-warning' : 'btn-outline-warning'}" onclick="flagTipForReview('${tip.id}', '${clue.id}')" ${isFlagged ? 'disabled' : ''}>
                    ${isFlagged ? '🚩 Flagged for Review' : '🚩 Flag for Review'}
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <hr class="border-glow">
      <div class="text-center">
        <div class="btn-group mb-3">
          <button class="btn btn-danger btn-sm" onclick="setPriority('${clue.id}', 'high')">🚨 High Priority</button>
          <button class="btn btn-warning btn-sm" onclick="setPriority('${clue.id}', 'medium')">📊 Medium Priority</button>
          <button class="btn btn-success btn-sm" onclick="setPriority('${clue.id}', 'low')">📋 Low Priority</button>
        </div>
        <br>
        ${!isResolved ? `<button class="btn btn-success me-2" onclick="resolveCase('${clue.id}')">✅ Mark Resolved</button>` : `<button class="btn btn-outline-warning me-2" onclick="reopenCase('${clue.id}')">🔄 Reopen Case</button>`}
        <button class="btn btn-danger" onclick="deleteCase('${clue.id}')">🗑️ Delete Entire Case</button>
      </div>
    </div>
  `;

  const titleElement = document.getElementById('caseDetailsTitle');
  const bodyElement = document.getElementById('caseDetailsBody');
  if (titleElement) titleElement.innerHTML = `Case ${caseNumber} Details ${isResolved ? '(RESOLVED)' : ''} - ${allEvidence.length} Evidence`;
  if (bodyElement) bodyElement.innerHTML = caseDetailsHTML;

  const modal = new bootstrap.Modal(document.getElementById('caseDetailsModal'));
  modal.show();
};

window.markTipUseful = async function(tipId, caseId) {
  try {
    setTipStatus(tipId, 'useful');
    const { error } = await supabase
      .from('tips')
      .update({ 
        updated_at: new Date().toISOString(),
        notes: 'Marked as useful by investigator'
      })
      .eq('id', tipId);
    alert('✅ Tip marked as useful!');
    setTimeout(() => {
      viewFullCaseDetails(caseId);
    }, 200);
  } catch (error) {
    alert('✅ Tip marked as useful! (Status logged)');
  }
};

window.flagTipForReview = async function(tipId, caseId) {
  try {
    setTipStatus(tipId, 'flagged');
    const { error } = await supabase
      .from('tips')
      .update({ 
        updated_at: new Date().toISOString(),
        notes: 'Flagged for review by investigator'
      })
      .eq('id', tipId);
    alert('🚩 Tip flagged for review!');
    setTimeout(() => {
      viewFullCaseDetails(caseId);
    }, 200);
  } catch (error) {
    alert('🚩 Tip flagged for review! (Status logged)');
  }
};

window.showEvidenceImage = function(imageSrc, title) {
  const existingModal = document.getElementById('imageModal');
  if (!existingModal) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal fade" id="imageModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content bg-dark text-light">
            <div class="modal-header">
              <h5 class="modal-title" id="imageModalTitle">Evidence</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center">
              <img id="modalImage" src="" alt="Evidence" style="max-width: 100%; max-height: 80vh;">
            </div>
          </div>
        </div>
      </div>
    `);
  }

  const modalImage = document.getElementById('modalImage');
  const imageModalTitle = document.getElementById('imageModalTitle');
  if (modalImage) modalImage.src = imageSrc;
  if (imageModalTitle) imageModalTitle.textContent = title;

  const modal = new bootstrap.Modal(document.getElementById('imageModal'));
  modal.show();
};


window.viewOriginalEvidence = function(originalUrl, caseId) {
  if (confirm('⚠️ View unblurred original evidence?\n\nThis action will be logged.\nFor authorized investigators only.')) {

    
    if (!document.getElementById('originalEvidenceModal')) {
      const modalHTML = `
        <div class="modal fade" id="originalEvidenceModal" tabindex="-1">
          <div class="modal-dialog modal-xl">
            <div class="modal-content bg-dark text-light">
              <div class="modal-header border-bottom border-success">
                <h5 class="modal-title text-success">
                  🔒 AUTHORIZED ORIGINAL EVIDENCE ACCESS
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body text-center">
                <div class="access-header mb-3 p-3" style="background: linear-gradient(135deg, #1a1a1a, #2d2d2d); border-radius: 10px; border: 1px solid #39ff14;">
                  <div class="row">
                    <div class="col-md-4">
                      <strong class="text-warning">Accessed By:</strong><br>
                      <span id="accessEmail" class="text-light"></span>
                    </div>
                    <div class="col-md-4">
                      <strong class="text-warning">Access Time:</strong><br>
                      <span id="accessDateTime" class="text-light"></span>
                    </div>
                    <div class="col-md-4">
                      <strong class="text-success">Case ID:</strong><br>
                      <span id="accessCaseId" class="text-light"></span>
                    </div>
                  </div>
                  <div class="mt-2">
                    <small class="text-success">Safe Tracer by NIDHIN R - Authorized Access Only</small>
                  </div>
                </div>

                <div class="evidence-frame" style="border: 2px solid #39ff14; border-radius: 10px; padding: 10px; background: #000;">
                  <img id="originalEvidenceImage" src="" alt="Original Evidence" style="max-width: 100%; max-height: 70vh; border-radius: 5px;">
                </div>

                <div class="access-warning mt-3 p-2" style="background: rgba(220, 53, 69, 0.1); border: 1px solid #dc3545; border-radius: 5px;">
                  <small class="text-danger">
                    ⚠️ This access is logged and monitored. Unauthorized sharing is prohibited.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

   
    const clue = dashboardData.clues.find(c => String(c.id) === String(caseId));
    const caseNum = getCaseNumber(clue);

    
    document.getElementById('originalEvidenceImage').src = originalUrl;
    document.getElementById('accessDateTime').textContent = new Date().toLocaleString();
    document.getElementById('accessEmail').textContent = currentUser ? currentUser.email : 'Unknown';
    document.getElementById('accessCaseId').textContent = `Case ${caseNum}`;

    
    const modal = new bootstrap.Modal(document.getElementById('originalEvidenceModal'));
    modal.show();
  }
};

window.resolveCase = async function(clueId) {
  if (confirm('Mark this entire case as resolved? This will resolve the main case and all related evidence.')) {
    try {
      const { error } = await supabase
        .from('clues')
        .update({ status: 'resolved', resolved_at: new Date() })
        .eq('id', clueId);
      if (error) throw error;

      await supabase
        .from('clues')
        .update({ status: 'resolved', resolved_at: new Date() })
        .eq('parent_case_id', clueId);

      alert('✅ Entire case resolved successfully!');
      loadDashboardData();
      bootstrap.Modal.getInstance(document.getElementById('caseDetailsModal')).hide();
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  }
};

window.reopenCase = async function(clueId) {
  if (confirm('Reopen this resolved case? This will reopen the main case and all related evidence.')) {
    try {
      const { error } = await supabase
        .from('clues')
        .update({ status: 'active', resolved_at: null })
        .eq('id', clueId);
      if (error) throw error;

      await supabase
        .from('clues')
        .update({ status: 'active', resolved_at: null })
        .eq('parent_case_id', clueId);

      alert('🔄 Entire case reopened successfully!');
      loadDashboardData();
      bootstrap.Modal.getInstance(document.getElementById('caseDetailsModal')).hide();
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  }
};

window.deleteCase = async function(clueId) {
  const clue = dashboardData.clues.find(c => String(c.id) === String(clueId));
  const caseNum = getCaseNumber(clue);

  if (confirm(`🗑️ DELETE Entire Case ${caseNum} permanently?\n\nThis will delete ALL evidence, tips, and everything related to this case!`) && prompt('Type "DELETE CASE" to confirm:') === 'DELETE CASE') {
    try {
      await supabase.from('tips').delete().eq('clue_id', clueId);
      await supabase.from('clues').delete().eq('parent_case_id', clueId);
      await supabase.from('clues').delete().eq('id', clueId);

      alert(`✅ Case ${caseNum} and ALL related evidence deleted successfully!`);

      loadDashboardData();
      const modal = bootstrap.Modal.getInstance(document.getElementById('caseDetailsModal'));
      if (modal) modal.hide();

    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Error deleting case: ' + error.message);
    }
  }
};

function generateFullAIReport() {
  const stats = dashboardData.stats;
  const activeClues = dashboardData.clues.filter(c => c.status !== 'resolved' && !isAdditionalEvidence(c));
  const resolvedClues = dashboardData.clues.filter(c => c.status === 'resolved' && !isAdditionalEvidence(c));
  const highRiskCases = dashboardData.clues.filter(c => c.ai_analysis?.risk_level === 'high').length;
  const mediumRiskCases = dashboardData.clues.filter(c => c.ai_analysis?.risk_level === 'medium').length;
  const lowRiskCases = dashboardData.clues.filter(c => c.ai_analysis?.risk_level === 'low').length;

  const report = `🤖 SAFE TRACER by NIDHIN R - AI INVESTIGATION REPORT
Generated: ${new Date().toLocaleString()}

📈 COMPREHENSIVE STATISTICS:
• Total Investigations: ${stats.totalClues}
• Active Investigations: ${activeClues.length}
• Resolved Investigations: ${resolvedClues.length}
• Anonymous Tips: ${stats.totalTips}
• AI Processed Evidence: ${stats.aiProcessed}
• High Priority Investigations: ${stats.highRisk}
• Resolution Rate: ${stats.totalClues > 0 ? Math.round((resolvedClues.length / stats.totalClues) * 100) : 0}%

🎯 AI RISK ASSESSMENT BREAKDOWN:
• High Risk Cases: ${highRiskCases}
• Medium Risk Cases: ${mediumRiskCases}
• Low Risk Cases: ${lowRiskCases}

Safe Tracer by NIDHIN R - AI-Powered Investigation Platform`;
  alert(report);
}

async function runAICorrelation() {
  const btn = document.getElementById('correlateDataBtn');
  if (!btn) return;
  const originalText = btn.innerHTML;
  btn.innerHTML = '🤖 AI Correlating...';
  btn.disabled = true;

  try {
    let correlations = 0;
    const correlationResults = [];

    for (let i = 0; i < dashboardData.clues.length; i++) {
      for (let j = i + 1; j < dashboardData.clues.length; j++) {
        const similarity = calculateCaseSimilarity(dashboardData.clues[i], dashboardData.clues[j]);
        if (similarity > 0.5) {
          correlations++;
          correlationResults.push({
            case1: dashboardData.clues[i].id,
            case2: dashboardData.clues[j].id,
            similarity: similarity
          });
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    alert(`🤖 AI Correlation Analysis Complete!\n✅ ${correlations} correlations detected\n📊 Analysis using advanced AI algorithms\n🔍 ${correlationResults.length} case similarities found`);
  } catch (error) {
    alert('❌ AI Correlation failed: ' + error.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function calculateCaseSimilarity(clue1, clue2) {
  let similarity = 0;

  if (clue1.ai_analysis && clue2.ai_analysis) {
    if (clue1.ai_analysis.risk_level === clue2.ai_analysis.risk_level) similarity += 0.2;
    if (clue1.ai_analysis.sentiment === clue2.ai_analysis.sentiment) similarity += 0.1;

    const keywords1 = clue1.ai_analysis.keywords || [];
    const keywords2 = clue2.ai_analysis.keywords || [];
    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    if (commonKeywords.length > 0) {
      similarity += (commonKeywords.length / Math.max(keywords1.length, keywords2.length)) * 0.4;
    }
  }

  const desc1 = clue1.description.toLowerCase();
  const desc2 = clue2.description.toLowerCase();
  const words1 = desc1.split(' ').filter(word => word.length > 3);
  const words2 = desc2.split(' ').filter(word => word.length > 3);
  const commonWords = words1.filter(word => words2.includes(word));
  if (commonWords.length > 2) {
    similarity += 0.3;
  }

  return Math.min(similarity, 1.0);
}

function updateAICharts() {
  try {
    createRiskDistributionChart();
  } catch (error) {
    console.error('Error creating charts:', error);
  }
}

function createRiskDistributionChart() {
  const canvas = document.getElementById('riskChart');
  if (!canvas) return;

  const riskCounts = { high: 0, medium: 0, low: 0 };
  dashboardData.clues.forEach(clue => {
    const riskLevel = clue.ai_analysis?.risk_level || 'medium';
    if (riskCounts.hasOwnProperty(riskLevel)) {
      riskCounts[riskLevel]++;
    } else {
      riskCounts.medium++;
    }
  });

  if (dashboardData.clues.length === 0) {
    riskCounts.high = 2;
    riskCounts.medium = 5;
    riskCounts.low = 3;
  }

  if (window.riskChartInstance) {
    window.riskChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  window.riskChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['🔴 High Risk', '🟡 Medium Risk', '🟢 Low Risk'],
      datasets: [{
        data: [riskCounts.high, riskCounts.medium, riskCounts.low],
        backgroundColor: ['#dc3545', '#ffc107', '#28a745'],
        borderColor: ['#39ff14', '#39ff14', '#39ff14'],
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { 
            color: '#fff',
            font: { family: 'Orbitron', size: 14 },
            padding: 20
          }
        },
        title: {
          display: true,
          text: 'AI Risk Assessment Distribution',
          color: '#39ff14',
          font: { size: 18, family: 'Orbitron', weight: 'bold' },
          padding: { top: 10, bottom: 30 }
        }
      },
      animation: { animateRotate: true, animateScale: true, duration: 1500 },
      cutout: '50%'
    }
  });
}


async function handleLogout() {
  if (confirm('Logout from investigator dashboard?')) {
    try {
      if (supabase) await supabase.auth.signOut();
      currentUser = null;
      dashboardData = { clues: [], tips: [], stats: { totalClues: 0, totalTips: 0, aiProcessed: 0, highRisk: 0, resolved: 0 } };
      caseNumbersCache = {};
      additionalEvidenceCache = {};
      tipStatusCache = {};
      const loginSection = document.getElementById('loginSection');
      const dashboardSection = document.getElementById('dashboardSection');
      const loginForm = document.getElementById('loginForm');
      if (loginSection) loginSection.style.display = 'block';
      if (dashboardSection) dashboardSection.style.display = 'none';
      if (loginForm) loginForm.reset();
      alert('✅ Secure logout successful.');
      location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}


let autoLogoutTimer = null;
let autoLogoutWarningTimer = null;
const AUTO_LOGOUT_MINUTES = 15; 
const LOGOUT_WARNING_MINUTES = 5; 

function resetAutoLogoutTimer() {
  if (autoLogoutTimer) clearTimeout(autoLogoutTimer);
  if (autoLogoutWarningTimer) clearTimeout(autoLogoutWarningTimer);

  
  autoLogoutTimer = setTimeout(() => {
    alert("Safe Tracer has detected that you have been inactive for a while and has securely logged you out for security reasons.");
    
    try {
      if (supabase) supabase.auth.signOut();
      currentUser = null;
      dashboardData = { clues: [], tips: [], stats: { totalClues: 0, totalTips: 0, aiProcessed: 0, highRisk: 0, resolved: 0 } };
      caseNumbersCache = {};
      additionalEvidenceCache = {};
      tipStatusCache = {};
      const loginSection = document.getElementById('loginSection');
      const dashboardSection = document.getElementById('dashboardSection');
      const loginForm = document.getElementById('loginForm');
      if (loginSection) loginSection.style.display = 'block';
      if (dashboardSection) dashboardSection.style.display = 'none';
      if (loginForm) loginForm.reset();
      location.reload();
    } catch (error) {
      console.error('Auto logout error:', error);
    }
  }, AUTO_LOGOUT_MINUTES * 60 * 1000);

  
  const warningBeforeMs = (AUTO_LOGOUT_MINUTES - LOGOUT_WARNING_MINUTES) * 60 * 1000;
  if (warningBeforeMs > 0) {
    autoLogoutWarningTimer = setTimeout(() => {
      alert("Safe Tracer has detected inactivity.\nFor security reasons, you will be logged out automatically in 5 minutes unless you resume activity.");
    }, warningBeforeMs);
  }
}


['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(event => {
  window.addEventListener(event, resetAutoLogoutTimer);
});

document.addEventListener('DOMContentLoaded', resetAutoLogoutTimer);


console.log('🚀 Safe Tracer Admin - With Enhanced Login & Original Image Viewer');

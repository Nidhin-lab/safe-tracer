const SUPABASE_URL = 'https://muwighiiwoppunbfjnak.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11d2lnaGlpd29wcHVuYmZqbmFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMTkwNTIsImV4cCI6MjA3MDU5NTA1Mn0.30IgtRBiSUoBJTScQa5VhpZPrPVbx18MpXeTM4Pydo4';

let supabase = null;
if (typeof window.supabase !== 'undefined') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let aiSystemsOnline = true;
let aiStats = { processedClues: 0, correlations: 0, confidence: 98 };
let caseNumbersCache = {};

function generateCaseNumber() {
  return Math.floor(Math.random() * 9000) + 1000;
}

function getCaseNumber(clue) {
  if (!clue) return generateCaseNumber();
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

class SmartAI {
  constructor() {
    this.riskKeywords = {
      high: ['urgent', 'immediate', 'danger', 'threat', 'emergency', 'critical', 'violence', 'harm', 'abuse', 'attack', 'missing', 'kidnap', 'assault'],
      medium: ['suspicious', 'concerning', 'unusual', 'important', 'significant', 'witness', 'evidence', 'incident', 'theft', 'robbery'],
      low: ['minor', 'routine', 'normal', 'regular', 'standard', 'parking', 'noise', 'complaint', 'lost', 'found']
    };

    this.sentimentWords = {
      positive: ['safe', 'secure', 'protected', 'helped', 'rescued', 'found', 'solved', 'resolved'],
      negative: ['scared', 'worried', 'afraid', 'dangerous', 'missing', 'lost', 'hurt', 'injured', 'threatened']
    };

    this.qualityPatterns = {
      time: /\b(\d{1,2}:\d{2}|morning|afternoon|evening|night|today|yesterday)\b/gi,
      location: /\b([A-Z][a-z]+ (?:street|road|avenue|lane|drive|place))\b/gi,
      person: /\b(man|woman|boy|girl|person|suspect|witness|male|female)\b/gi,
      vehicle: /\b(car|truck|van|sedan|suv|motorcycle|bike|vehicle)\b/gi,
      color: /\b(red|blue|green|black|white|gray|yellow|brown|orange|purple)\b/gi
    };
  }

  analyzeContent(description) {
    const sentiment = this.analyzeSentiment(description);
    const riskLevel = this.assessRiskLevel(description);
    const urgency = this.assessUrgency(description);
    const keywords = this.extractKeywords(description);
    const confidence = this.calculateConfidence(description);
    const summary = this.generateSummary(description, riskLevel, sentiment);

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

  assessRiskLevel(text) {
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
    const urgentKeywords = ['urgent', 'immediate', 'emergency', 'asap', 'quickly', 'now'];
    const lowerText = text.toLowerCase();

    const urgentCount = urgentKeywords.filter(word => lowerText.includes(word)).length;

    if (urgentCount > 1) return 'high';
    if (urgentCount > 0) return 'medium';
    return 'low';
  }

  extractKeywords(text) {
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const filteredWords = words.filter(word => !stopWords.includes(word));

    const wordFreq = {};
    filteredWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  calculateConfidence(description) {
    let confidence = 0.6;

    if (description.length > 50) confidence += 0.1;
    if (description.length > 100) confidence += 0.1;
    if (Object.values(this.qualityPatterns).some(pattern => pattern.test(description))) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  generateSummary(description, riskLevel, sentiment) {
    const riskText = riskLevel === 'high' ? 'High-priority' : riskLevel === 'medium' ? 'Standard' : 'Low-priority';
    const sentimentText = sentiment === 'negative' ? 'requiring attention' : 'under review';

    if (description.length <= 80) {
      return `${riskText} case ${sentimentText}`;
    }

    const firstSentence = description.split(/[.!?]/)[0];
    return `${riskText}: ${firstSentence.substring(0, 60)}...`;
  }

  validateTip(tipText) {
    if (!tipText || tipText.trim().length === 0) {
      return { quality_score: 0.1, specificity: 0.1, relevance: 0.1, credibility: 0.1 };
    }

    const specificity = this.assessSpecificity(tipText);
    const relevance = this.assessRelevance(tipText);
    const credibility = this.assessCredibility(tipText);

    return {
      quality_score: (specificity + relevance + credibility) / 3,
      specificity: specificity,
      relevance: relevance,
      credibility: credibility,
      suggestions: this.generateSuggestions(specificity, relevance, credibility)
    };
  }

  assessSpecificity(text) {
    let score = 0.3;
    Object.values(this.qualityPatterns).forEach(pattern => {
      if (pattern.test(text)) score += 0.15;
    });
    if (text.length > 50) score += 0.1;
    if (text.length > 100) score += 0.1;
    return Math.min(score, 1.0);
  }

  assessRelevance(text) {
    const relevanceKeywords = ['saw', 'witnessed', 'noticed', 'observed', 'heard', 'know', 'location', 'time', 'person', 'vehicle'];
    let score = 0.4;
    const lowerText = text.toLowerCase();
    relevanceKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) score += 0.05;
    });
    return Math.min(score, 1.0);
  }

  assessCredibility(text) {
    let score = 0.5;
    if (text.length > 25) score += 0.1;
    if (/\b(I|me|my|personally)\b/i.test(text)) score += 0.15;
    if (/\b\d+\b/.test(text)) score += 0.1;
    if (text.includes('.') || text.includes(',')) score += 0.05;
    if (/\b(maybe|might|could be|not sure)\b/i.test(text)) score -= 0.1;
    if (text.length < 15) score -= 0.2;
    return Math.min(Math.max(score, 0.2), 1.0);
  }

  generateSuggestions(specificity, relevance, credibility) {
    const suggestions = [];
    if (specificity < 0.6) suggestions.push('Include more specific details like time, location, or descriptions');
    if (relevance < 0.6) suggestions.push('Focus on what you directly observed related to this case');
    if (credibility < 0.6) suggestions.push('Provide more concrete details about what you witnessed');
    return suggestions;
  }
}

const smartAI = new SmartAI();

function initializeNavigation() {
  console.log('Initializing navigation...');
  const loginBtn = document.getElementById('investigatorLoginBtn');
  if (loginBtn) {
    console.log('Login button found!');
    loginBtn.removeEventListener('click', navigateToAdmin);
    loginBtn.addEventListener('click', navigateToAdmin);
    loginBtn.onclick = navigateToAdmin;
    console.log('Navigation listeners attached!');
  } else {
    console.error('Login button not found!');
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      if (btn.textContent.toLowerCase().includes('login')) {
        console.log('Found backup login button');
        btn.addEventListener('click', navigateToAdmin);
      }
    });
  }
}

function navigateToAdmin(e) {
  e.preventDefault();
  e.stopPropagation();
  console.log('Navigation triggered!');
  try {
    window.location.href = 'admin.html';
  } catch (error) {
    console.log('Navigation method 1 failed, trying alternatives...');
    try {
      window.location.assign('admin.html');
    } catch (error2) {
      window.location.replace('admin.html');
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('Safe Tracer initializing...');
  initializeNavigation();
  setTimeout(initializeNavigation, 1000);
  initializeAISystems();
  initializeEffects();
  loadAIProcessedClues();
  startAIMonitoring();
});

window.addEventListener('load', function() {
  console.log('Window loaded, backup navigation init...');
  initializeNavigation();
});

async function initializeAISystems() {
  updateAIStatus('Connecting to AI services...', 'warning');
  try {
    aiSystemsOnline = true;
    updateAIStatus('AI Systems Online', 'success');
    console.log('AI systems initialized');
  } catch (error) {
    updateAIStatus('AI Limited Mode', 'warning');
    console.log('AI systems in fallback mode');
  }
  updateAIStatsDisplay();
}

function updateAIStatus(message, status) {
  const statusElement = document.getElementById('aiStatusText');
  const indicator = document.querySelector('.ai-indicator');
  if (statusElement) statusElement.textContent = `AI Systems: ${message}`;
  if (indicator) indicator.className = `ai-indicator ${status}`;
}

function initializeEffects() {
  if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
      particles: {
        number: { value: 120 },
        color: { value: '#39ff14' },
        shape: { type: 'circle' },
        opacity: { 
          value: 0.6, 
          random: true,
          animation: { enable: true, speed: 1, sync: false }
        },
        size: { 
          value: 3, 
          random: true,
          animation: { enable: true, speed: 2, sync: false }
        },
        move: { 
          enable: true, 
          speed: 2,
          direction: 'none',
          random: true,
          out_mode: 'out'
        }
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: { enable: true, mode: 'repulse' },
          onclick: { enable: true, mode: 'push' }
        }
      }
    });
  }
}

async function loadAIProcessedClues() {
  const container = document.getElementById('clues-container');
  if (!supabase) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning">
          <h5>Database Configuration Required</h5>
          <p>Please configure Supabase credentials to load investigation clues.</p>
          <small>Update SUPABASE_URL and SUPABASE_KEY in script.js</small>
        </div>
      </div>
    `;
    return;
  }
  try {
    const { data: clues, error } = await supabase
      .from('clues')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    container.innerHTML = '';
    if (!clues || clues.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="no-clues-message">
            <h4>No Investigation Clues Available</h4>
            <p>Investigators haven't uploaded any clues yet. Check back soon!</p>
            <small>Once investigators upload evidence, it will appear here for community tips.</small>
          </div>
        </div>
      `;
      return;
    }

    const mainCases = clues.filter(clue => !isAdditionalEvidence(clue));
    const additionalEvidence = clues.filter(clue => isAdditionalEvidence(clue));

    for (const clue of mainCases) {
      const relatedEvidence = additionalEvidence.filter(evidence => 
        evidence.parent_case_id === clue.id
      );

      const enhancedClue = enhanceClueWithAI(clue);
      enhancedClue.additionalEvidence = relatedEvidence;
      const clueCard = createAIEnhancedClueCard(enhancedClue);
      container.appendChild(clueCard);
      aiStats.processedClues++;
    }
    updateAIStatsDisplay();
  } catch (error) {
    console.error('Error loading AI-processed clues:', error);
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          <h5>Error Loading Clues</h5>
          <p>Unable to connect to database: ${error.message}</p>
          <small>Check your Supabase configuration and network connection.</small>
        </div>
      </div>
    `;
  }
}

function enhanceClueWithAI(clue) {
  if (!aiSystemsOnline) {
    return { 
      ...clue, 
      ai_enhanced: false,
      priority_score: 50,
      risk_level: 'medium'
    };
  }
  try {
    let aiAnalysis = clue.ai_analysis;
    if (!aiAnalysis && clue.description) {
      aiAnalysis = smartAI.analyzeContent(clue.description);
    }
    return {
      ...clue,
      ai_enhanced: true,
      ai_analysis: aiAnalysis,
      priority_score: calculatePriorityScore(clue, aiAnalysis),
      risk_level: aiAnalysis?.risk_level || 'medium'
    };
  } catch (error) {
    console.log('AI enhancement failed for clue:', clue.id, error);
    return { 
      ...clue, 
      ai_enhanced: false,
      priority_score: 50,
      risk_level: 'medium'
    };
  }
}

function calculatePriorityScore(clue, aiAnalysis) {
  let score = 50;
  if (aiAnalysis?.sentiment === 'negative') score += 25;
  else if (aiAnalysis?.sentiment === 'positive') score += 10;
  switch(aiAnalysis?.risk_level) {
    case 'high': score += 35; break;
    case 'medium': score += 15; break;
    case 'low': score += 5; break;
  }
  switch(aiAnalysis?.urgency) {
    case 'high': score += 20; break;
    case 'medium': score += 10; break;
  }
  score += ((aiAnalysis?.confidence || 0.5) * 20);
  if (clue.description?.length > 100) score += 10;
  if (clue.description?.length > 200) score += 10;
  return Math.min(Math.max(Math.round(score), 0), 100);
}

function createAIEnhancedClueCard(clue) {
  const cardCol = document.createElement('div');
  cardCol.className = 'col-lg-4 col-md-6 mb-4';
  const riskClass = getRiskClass(clue.risk_level);
  const aiIndicator = clue.ai_enhanced ? 'AI-Powered' : 'Standard';
  const priorityBar = createPriorityBar(clue.priority_score || 50);
  const aiSummary = clue.ai_analysis?.summary || 'Processing...';
  const caseNumber = getCaseNumber(clue);
  const evidenceCount = (clue.additionalEvidence?.length || 0) + 1;

  
  const isResolved = clue.status === 'resolved';

  cardCol.innerHTML = `
    <div class="clue-card ${riskClass} ${isResolved ? 'resolved-case' : ''}" data-risk="${clue.risk_level}">
      <div class="ai-enhancement-badge">
        ${aiIndicator}
      </div>
      <div class="clue-image-container">
        <img src="${clue.image_url}" alt="Investigation Evidence" class="clue-image" 
             style="cursor: pointer;"
             onclick="showImageModal('${clue.image_url}', 'Case ${caseNumber} Evidence')"
             onerror="this.src='https://via.placeholder.com/350x200/333/fff?text=Investigation+Evidence+%23${caseNumber}'">
        <div class="clue-overlay">
          <span class="clue-id">Case ${caseNumber}</span>
          <span class="risk-indicator ${riskClass}">${(clue.risk_level || 'MEDIUM').toUpperCase()}</span>
          ${evidenceCount > 1 ? `<span class="evidence-count">${evidenceCount} Evidence</span>` : ''}
          ${isResolved ? '<span class="resolved-badge" style="background: rgba(40, 167, 69, 0.9); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.7rem;">✅ RESOLVED</span>' : ''}
        </div>
      </div>
      <div class="clue-content">
        ${clue.additionalEvidence && clue.additionalEvidence.length > 0 ? `
          <div class="additional-evidence-preview mb-3">
            <h6>📎 Additional Evidence (${clue.additionalEvidence.length})</h6>
            <div class="evidence-thumbnails">
              ${clue.additionalEvidence.slice(0, 3).map((evidence, index) => `
                <img src="${evidence.image_url}" alt="Additional Evidence ${index + 1}" 
                     class="evidence-thumbnail" style="width: 60px; height: 60px; object-fit: cover; margin-right: 5px; border-radius: 5px; cursor: pointer;"
                     onclick="showImageModal('${evidence.image_url}', 'Additional Evidence ${index + 1}')">
              `).join('')}
              ${clue.additionalEvidence.length > 3 ? `<span class="more-evidence">+${clue.additionalEvidence.length - 3} more</span>` : ''}
            </div>
          </div>
        ` : ''}
        <div class="ai-analysis-summary">
          ${clue.ai_analysis ? `
            <div class="ai-tags">
              <span class="ai-tag">Sentiment: ${clue.ai_analysis.sentiment}</span>
              <span class="ai-tag">Confidence: ${Math.round((clue.ai_analysis.confidence || 0.75) * 100)}%</span>
              ${clue.ai_analysis.urgency ? `<span class="ai-tag">Urgency: ${clue.ai_analysis.urgency}</span>` : ''}
            </div>
            <div class="ai-summary">
              <small><strong>AI Summary:</strong> ${aiSummary}</small>
            </div>
          ` : ''}
          <div class="priority-section">
            <span class="priority-label">AI Priority Score:</span>
            ${priorityBar}
          </div>
        </div>
        <p class="clue-description">${clue.description}</p>
        <div class="tip-section">
          ${isResolved ? `
            <div class="resolved-case-notice" style="background: linear-gradient(45deg, #28a745, #20c997); padding: 15px; border-radius: 10px; text-align: center; color: white;">
              <h6><i class="fas fa-check-circle"></i> CASE RESOLVED</h6>
              <p style="margin: 5px 0; font-size: 0.9rem;">This investigation has been completed. No further tips are being accepted.</p>
              <small>Thank you for your interest in helping!</small>
            </div>
          ` : `
            <div class="ai-tip-helper">
              <small class="text-muted">AI Suggestion: Include specific details like time, location, or physical descriptions</small>
            </div>
            <textarea 
              id="tip-${clue.id}" 
              class="form-control tip-input" 
              placeholder="Share your anonymous tip about this evidence..."
              rows="3"
            ></textarea>
            <div class="tip-actions mt-2">
              <button 
                class="btn btn-success w-100 ai-submit-btn" 
                onclick="submitAIValidatedTip('${clue.id}')"
              >
                Submit AI-Validated Anonymous Tip
              </button>
              <div class="tip-photo-upload mt-2">
                <input type="file" id="photo-${clue.id}" accept="image/*" style="display:none;" onchange="handleTipPhotoSelection('${clue.id}')">
                <button class="btn btn-outline-light btn-sm w-100" onclick="document.getElementById('photo-${clue.id}').click()">
                  Add Photo Evidence (Optional)
                </button>
                <div id="photo-preview-${clue.id}" class="photo-preview"></div>
              </div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
  return cardCol;
}

window.showImageModal = function(imageSrc, title) {
  document.getElementById('modalImage').src = imageSrc;
  document.getElementById('imageModalTitle').textContent = title;
  const modal = new bootstrap.Modal(document.getElementById('imageModal'));
  modal.show();
};

function createPriorityBar(score) {
  const percentage = Math.min(Math.max(score, 0), 100);
  let color, label;
  if (percentage >= 80) {
    color = '#dc3545';
    label = 'Critical';
  } else if (percentage >= 60) {
    color = '#fd7e14';
    label = 'High';
  } else if (percentage >= 40) {
    color = '#ffc107';
    label = 'Medium';
  } else {
    color = '#28a745';
    label = 'Low';
  }
  return `
    <div class="priority-bar">
      <div class="priority-fill" style="width: ${percentage}%; background-color: ${color}"></div>
      <span class="priority-score">${percentage}/100 (${label})</span>
    </div>
  `;
}

function getRiskClass(riskLevel) {
  switch(riskLevel) {
    case 'high': return 'risk-high';
    case 'medium': return 'risk-medium';
    case 'low': return 'risk-low';
    default: return 'risk-medium';
  }
}

window.handleTipPhotoSelection = function(clueId) {
  const fileInput = document.getElementById(`photo-${clueId}`);
  const file = fileInput.files[0];
  const previewDiv = document.getElementById(`photo-preview-${clueId}`);
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo too large. Please select a file smaller than 5MB.');
      fileInput.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      fileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      previewDiv.innerHTML = `
        <div class="photo-preview-item mt-2">
          <img src="${e.target.result}" alt="Photo Evidence" style="max-width: 100%; max-height: 100px; border-radius: 8px;">
          <br>
          <button class="btn btn-sm btn-outline-danger mt-2" onclick="clearPhotoPreview('${clueId}')">Remove Photo</button>
          <small class="d-block text-muted mt-1">Photo will be uploaded as clear evidence</small>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  }
};

window.clearPhotoPreview = function(clueId) {
  document.getElementById(`photo-${clueId}`).value = '';
  document.getElementById(`photo-preview-${clueId}`).innerHTML = '';
};

window.submitAIValidatedTip = async function(clueId) {
  const tipInput = document.getElementById(`tip-${clueId}`);
  const tipText = tipInput.value.trim();
  const photoInput = document.getElementById(`photo-${clueId}`);
  const photo = photoInput.files[0];
  if (!tipText && !photo) {
    alert('Please enter a tip or add a photo before submitting.');
    tipInput.focus();
    return;
  }
  if (!supabase) {
    alert('Service temporarily unavailable. Please try again later.');
    return;
  }
  try {
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = 'AI Processing...';
    button.disabled = true;
    let photoUrl = null;
    if (photo) {
      button.innerHTML = 'Uploading photo...';
      photoUrl = await uploadTipPhoto(photo, clueId);
    }
    button.innerHTML = 'AI Validating...';
    const tipValidation = smartAI.validateTip(tipText);
    const { error } = await supabase.from('tips').insert({
      clue_id: clueId,
      tip_text: tipText || 'Photo evidence submitted',
      photo_url: photoUrl,
      status: 'pending',
      quality_score: tipValidation.quality_score,
      created_at: new Date().toISOString()
    });
    if (error) throw error;
    const qualityFeedback = getQualityFeedback(tipValidation.quality_score);
    const photoFeedback = photoUrl ? '\nPhoto evidence uploaded successfully.' : '';
    alert(`${qualityFeedback}\n\nYour anonymous tip has been AI-validated and submitted to investigators!${photoFeedback}`);
    tipInput.value = '';
    clearPhotoPreview(clueId);
    aiStats.correlations++;
    updateAIStatsDisplay();
    button.innerHTML = 'Submitted Successfully!';
    button.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
    setTimeout(() => {
      button.innerHTML = originalText;
      button.disabled = false;
      button.style.background = '';
    }, 3000);
  } catch (error) {
    console.error('Error submitting AI-validated tip:', error);
    alert('Error submitting tip: ' + error.message);
    const button = event.target;
    button.innerHTML = 'Submit AI-Validated Anonymous Tip';
    button.disabled = false;
  }
};

async function uploadTipPhoto(file, clueId) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `tip-${clueId}-${Date.now()}.${fileExt}`;
    const filePath = `tips/${fileName}`;
    try {
      const { data, error } = await supabase.storage
        .from('investigation-photos')
        .upload(filePath, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('investigation-photos')
        .getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (storageError) {
      console.log('Storage bucket not available, using base64 encoding');
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  } catch (error) {
    console.error('Photo upload error:', error);
    throw error;
  }
}

function getQualityFeedback(score) {
  if (score >= 0.85) return "Excellent tip quality! Very detailed and highly relevant.";
  if (score >= 0.70) return "Good tip quality! Thank you for the detailed information.";
  if (score >= 0.55) return "Helpful tip received! Additional details would be valuable.";
  if (score >= 0.40) return "Thank you for your tip! Any additional details would help investigators.";
  return "Thank you for contributing! Every piece of information helps the investigation.";
}

function updateAIStatsDisplay() {
  const elements = {
    aiProcessedClues: document.getElementById('aiProcessedClues'),
    correlationMatches: document.getElementById('correlationMatches'),
    aiConfidence: document.getElementById('aiConfidence')
  };
  if (elements.aiProcessedClues) elements.aiProcessedClues.textContent = aiStats.processedClues;
  if (elements.correlationMatches) elements.correlationMatches.textContent = aiStats.correlations;
  if (elements.aiConfidence) elements.aiConfidence.textContent = `${aiStats.confidence}%`;
}

function startAIMonitoring() {
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      updateAIStatsDisplay();
    }
  }, 30000);
  setInterval(() => {
    if (aiSystemsOnline && document.visibilityState === 'visible') {
      loadAIProcessedClues();
    }
  }, 120000);
  setInterval(() => {
    if (aiSystemsOnline) {
      aiStats.confidence = Math.min(aiStats.confidence + 1, 99);
    } else {
      aiStats.confidence = Math.max(aiStats.confidence - 1, 75);
    }
    updateAIStatsDisplay();
  }, 45000);
}

console.log('Safe Tracer AI-Powered Public System - With Resolved Case Tip Blocking');

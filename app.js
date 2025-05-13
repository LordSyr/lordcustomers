// Global variables
const DB_NAME = 'pwa-form-db';
const STORE_NAME = 'submissions';
let db;

// DOM elements
const contactForm = document.getElementById('contact-form');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const nameError = document.getElementById('name-error');
const phoneError = document.getElementById('phone-error');
const submitBtn = document.getElementById('submit-btn');
const downloadBtn = document.getElementById('download-btn');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const submissionsList = document.getElementById('submissions-list');
const collapsibleButton = document.querySelector('.collapsible-button');
const collapsibleContent = document.querySelector('.collapsible-content');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initDatabase();
    setupEventListeners();
});

// Initialize IndexedDB
function initDatabase() {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = (event) => {
        showNotification('خطأ في قاعدة البيانات: ' + event.target.errorCode, 'error');
        console.error('IndexedDB error:', event.target.errorCode);
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        
        // Create object store for submissions if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('phone', 'phone', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
        }
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        console.log('Database initialized successfully');
        loadSubmissions();
    };
}

// Set up event listeners
function setupEventListeners() {
    // Form submission
    contactForm.addEventListener('submit', handleFormSubmit);
    
    // Input validation
    nameInput.addEventListener('input', validateName);
    phoneInput.addEventListener('input', validatePhone);
    
    // Download CSV button
    downloadBtn.addEventListener('click', downloadCSV);
    
    // Collapsible container
    collapsibleButton.addEventListener('click', () => {
        collapsibleButton.classList.toggle('active');
        collapsibleContent.classList.toggle('active');
        
        if (collapsibleContent.classList.contains('active')) {
            // Load submissions when expanding
            loadSubmissions();
        }
    });
}

// Validate name input
function validateName() {
    const name = nameInput.value.trim();
    
    if (name === '') {
        nameError.textContent = 'الاسم مطلوب';
        return false;
    } else if (name.length < 2) {
        nameError.textContent = 'يجب أن يتكون الاسم من حرفين على الأقل';
        return false;
    } else {
        nameError.textContent = '';
        return true;
    }
}

// Validate phone input
function validatePhone() {
    const phone = phoneInput.value.trim();
    
    if (phone === '') {
        phoneError.textContent = 'رقم الهاتف مطلوب';
        return false;
    } else if (phone.length < 8) {
        phoneError.textContent = 'يرجى إدخال رقم هاتف صحيح';
        return false;
    } else {
        phoneError.textContent = '';
        return true;
    }
}

// Handle form submission
function handleFormSubmit(event) {
    event.preventDefault();
    
    // Validate inputs
    const isNameValid = validateName();
    const isPhoneValid = validatePhone();
    
    if (!isNameValid || !isPhoneValid) {
        return;
    }
    
    // Prepare submission data
    const submission = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        timestamp: new Date().toISOString()
    };
    
    // Save to IndexedDB
    saveSubmission(submission);
}

// Save submission to IndexedDB
function saveSubmission(submission) {
    if (!db) {
        showNotification('قاعدة البيانات غير متوفرة', 'error');
        return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(submission);
    
    request.onsuccess = () => {
        showNotification('تم حفظ البيانات بنجاح!', 'success');
        contactForm.reset();
        
        // Open the submissions panel automatically after a new submission
        if (!collapsibleContent.classList.contains('active')) {
            collapsibleButton.classList.add('active');
            collapsibleContent.classList.add('active');
        }
        
        loadSubmissions();
    };
    
    request.onerror = (event) => {
        showNotification('خطأ في حفظ البيانات', 'error');
        console.error('Save error:', event.target.error);
    };
}

// Load submissions from IndexedDB
function loadSubmissions() {
    if (!db) {
        showNotification('قاعدة البيانات غير متوفرة', 'error');
        return;
    }
    
    // Only load if the collapsible content is visible
    if (!collapsibleContent.classList.contains('active') && 
        !document.querySelector('.submissions-container.active')) {
        return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Newest first
    
    // Clear existing submissions
    submissionsList.innerHTML = '';
    
    request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            const submission = cursor.value;
            addSubmissionToDOM(submission);
            cursor.continue();
        }
    };
    
    request.onerror = (event) => {
        showNotification('خطأ في تحميل البيانات', 'error');
        console.error('Load error:', event.target.error);
    };
}

// Add a submission to the DOM
function addSubmissionToDOM(submission) {
    const submissionItem = document.createElement('div');
    submissionItem.className = 'submission-item';
    submissionItem.dataset.id = submission.id;
    
    const submissionInfo = document.createElement('div');
    submissionInfo.className = 'submission-info';
    
    const nameElement = document.createElement('span');
    nameElement.className = 'submission-name';
    nameElement.textContent = submission.name;
    
    const phoneElement = document.createElement('span');
    phoneElement.className = 'submission-phone';
    phoneElement.textContent = submission.phone;
    
    submissionInfo.appendChild(nameElement);
    submissionInfo.appendChild(phoneElement);
    
    // Remove the delete button as requested
    
    submissionItem.appendChild(submissionInfo);
    
    submissionsList.appendChild(submissionItem);
}

// Delete a submission
function deleteSubmission(id) {
    if (!db) {
        showNotification('قاعدة البيانات غير متوفرة', 'error');
        return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => {
        showNotification('تم حذف البيانات', 'success');
        
        // Make sure the collapsible is open to see updates
        if (!collapsibleContent.classList.contains('active')) {
            collapsibleButton.classList.add('active');
            collapsibleContent.classList.add('active');
        }
        
        loadSubmissions();
    };
    
    request.onerror = (event) => {
        showNotification('خطأ في حذف البيانات', 'error');
        console.error('Delete error:', event.target.error);
    };
}

// Download submissions as CSV with password protection
function downloadCSV() {
    // Prompt for password
    const password = prompt('أدخل كلمة المرور للتحميل:', '');
    
    // Check if the password is correct (HexApple)
    if (password !== 'HexApple') {
        showNotification('كلمة المرور غير صحيحة', 'error');
        return;
    }
    
    if (!db) {
        showNotification('قاعدة البيانات غير متوفرة', 'error');
        return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = (event) => {
        const submissions = event.target.result;
        
        if (submissions.length === 0) {
            showNotification('لا توجد بيانات للتصدير', 'error');
            return;
        }
        
        // Create CSV content
        const headers = ['الاسم', 'رقم الهاتف', 'التاريخ'];
        let csvContent = headers.join(',') + '\r\n';
        
        submissions.forEach(submission => {
            const row = [
                `"${submission.name.replace(/"/g, '""')}"`,
                `"${submission.phone.replace(/"/g, '""')}"`,
                `"${new Date(submission.timestamp).toLocaleString('ar-SA')}"`
            ];
            csvContent += row.join(',') + '\r\n';
        });
        
        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `نموذج-البيانات-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('تم تحميل ملف البيانات', 'success');
    };
    
    request.onerror = (event) => {
        showNotification('خطأ في تصدير البيانات', 'error');
        console.error('Export error:', event.target.error);
    };
}

// Show notification
function showNotification(message, type = 'info') {
    notificationMessage.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

// Connection status functionality removed as requested


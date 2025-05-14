// DOM elements
const contactForm = document.getElementById('contact-form');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const nameError = document.getElementById('name-error');
const phoneError = document.getElementById('phone-error');
const downloadBtn = document.getElementById('download-btn');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');

// Helpers for localStorage
function loadSubmissions() {
  const data = localStorage.getItem('submissions');
  return data ? JSON.parse(data) : [];
}

function saveSubmissions(list) {
  localStorage.setItem('submissions', JSON.stringify(list));
}

function showNotification(message, isError = false) {
  notificationMessage.textContent = message;
  notification.className = isError ? 'notification error show' : 'notification success show';
  setTimeout(() => {
    notification.className = 'notification';
  }, 3000);
}

// Validation
function validateName() {
  const name = nameInput.value.trim();
  if (!name) {
    nameError.textContent = 'يرجى إدخال الاسم';
    return false;
  }
  nameError.textContent = '';
  return true;
}

function validatePhone() {
  const phone = phoneInput.value.trim();
  if (!/^\d{8,15}$/.test(phone)) {
    phoneError.textContent = 'يرجى إدخال رقم هاتف صالح';
    return false;
  }
  phoneError.textContent = '';
  return true;
}

// Handle form submission
contactForm.addEventListener('submit', e => {
  e.preventDefault();
  const isNameValid = validateName();
  const isPhoneValid = validatePhone();
  if (!isNameValid || !isPhoneValid) return;

  const submissions = loadSubmissions();
  submissions.push({
    name: nameInput.value.trim(),
    phone: phoneInput.value.trim(),
    timestamp: new Date().toISOString()
  });
  saveSubmissions(submissions);
  showNotification('تم الحفظ بنجاح');
  contactForm.reset();
});

// Handle CSV download
downloadBtn.addEventListener('click', () => {
  const password = prompt('أدخل كلمة المرور للتحميل:');
  if (password !== 'HexApple') {
    showNotification('كلمة المرور غير صحيحة', true);
    return;
  }

  const submissions = loadSubmissions();
  if (submissions.length === 0) {
    showNotification('لا توجد بيانات للتصدير', true);
    return;
  }

  // Build CSV
  const headers = ['الاسم', 'رقم الهاتف', 'التاريخ'];
  const rows = submissions.map(s => 
    `"${s.name.replace(/"/g,'""')}","${s.phone.replace(/"/g,'""')}","${new Date(s.timestamp).toLocaleString('ar-SA')}"`);
  const csvContent = headers.join(',') + '\r\n' + rows.join('\r\n');

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `submissions-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification('تم تحميل ملف البيانات');
});

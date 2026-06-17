/**
 * MarkItDown Web Application Javascript Logic
 * Design and Developed by Shamim Ahmed Nahid (https://samnahid21.web.app/)
 * 
 * এই স্ক্রিপ্টটি ফাইল আপলোড, সার্ভারের সাথে যোগাযোগ, মার্কডাউন প্রিভিউ তৈরি, 
 * কপি ও ডাউনলোড কার্যক্রম এবং থিম পরিবর্তন নিয়ন্ত্রণ করে।
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // ১. DOM উপাদানসমূহ নির্বাচন করা (Select Elements)
    // ----------------------------------------------------
    const dragZone = document.getElementById('drag-zone');
    const fileInput = document.getElementById('file-input');
    const selectedFileContainer = document.getElementById('selected-file-container');
    const selectedFileName = document.getElementById('selected-file-name');
    const selectedFileSize = document.getElementById('selected-file-size');
    const removeFileBtn = document.getElementById('remove-file');
    const convertBtn = document.getElementById('convert-btn');
    
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const outputState = document.getElementById('output-state');
    
    const outputTextarea = document.getElementById('output-textarea');
    const previewBox = document.getElementById('preview-box');
    
    const tabCode = document.getElementById('tab-code');
    const tabPreview = document.getElementById('tab-preview');
    
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const themeToggle = document.getElementById('theme-toggle');
    
    // গ্লোবাল ভেরিয়েবল যাতে আপলোড করা ফাইলটির তথ্য রাখা হবে
    let currentFile = null;

    // ----------------------------------------------------
    // ২. থিম পরিবর্তন ব্যবস্থা (Dark/Light Theme Toggle)
    // ----------------------------------------------------
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        // আইকন পরিবর্তন করার জন্য
        const icon = themeToggle.querySelector('i');
        if (isLight) {
            icon.setAttribute('data-lucide', 'moon');
            showToast('লাইট থিম সক্রিয় করা হয়েছে', 'success');
        } else {
            icon.setAttribute('data-lucide', 'sun');
            showToast('ডার্ক থিম সক্রিয় করা হয়েছে', 'success');
        }
        // Lucide আইকন রিফ্রেশ করার জন্য
        lucide.createIcons();
    });

    // ----------------------------------------------------
    // ৩. ড্র্যাগ অ্যান্ড ড্রপ ইভেন্টসমূহ (Drag & Drop Events)
    // ----------------------------------------------------
    
    // ব্যবহারকারী যখন ফাইল টেনে আনবে
    ['dragenter', 'dragover'].forEach(eventName => {
        dragZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dragZone.classList.add('dragover');
        }, false);
    });

    // ব্যবহারকারী যখন ফাইল টানা বন্ধ করবে বা চলে যাবে
    ['dragleave', 'drop'].forEach(eventName => {
        dragZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dragZone.classList.remove('dragover');
        }, false);
    });

    // ড্রপ জোনে ফাইল ছেড়ে দিলে
    dragZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileSelection(files[0]);
        }
    });

    // ড্রপ জোনে ক্লিক করলে ফাইল ব্রাউজার ওপেন হবে
    dragZone.addEventListener('click', () => {
        fileInput.click();
    });

    // ফাইল ব্রাউজারে কোনো ফাইল সিলেক্ট করলে
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // ----------------------------------------------------
    // ৪. ফাইল নির্বাচন হ্যান্ডলিং (Handle Selected File)
    // ----------------------------------------------------
    function handleFileSelection(file) {
        currentFile = file;
        
        // ফাইলের নাম দেখানো
        selectedFileName.textContent = file.name;
        
        // ফাইলের সাইজ হিউম্যান রিডেবল করে দেখানো (KB/MB)
        const sizeInKB = (file.size / 1024).toFixed(1);
        if (sizeInKB > 1024) {
            selectedFileSize.textContent = `${(sizeInKB / 1024).toFixed(1)} MB`;
        } else {
            selectedFileSize.textContent = `${sizeInKB} KB`;
        }
        
        // ফাইল কার্ড দেখানো এবং কনভার্ট বাটন সক্রিয় করা
        selectedFileContainer.classList.remove('hidden');
        convertBtn.removeAttribute('disabled');
        
        showToast('ফাইল সফলভাবে সিলেক্ট করা হয়েছে', 'success');
    }

    // ফাইল রিমুভ করার জন্য
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // ড্রপ জোনের ক্লিক ইভেন্ট বন্ধ রাখতে
        currentFile = null;
        fileInput.value = '';
        selectedFileContainer.classList.add('hidden');
        convertBtn.setAttribute('disabled', 'true');
        showToast('ফাইল বাতিল করা হয়েছে', 'info');
    });

    // ----------------------------------------------------
    // ৫. রূপান্তর বা কনভার্ট রিকোয়েস্ট (Perform Conversion API Call)
    // ----------------------------------------------------
    convertBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // UI স্টেটস আপডেট করা (লোডিং মোড চালু করা)
        emptyState.classList.add('hidden');
        outputState.classList.add('hidden');
        loadingState.classList.remove('hidden');
        convertBtn.setAttribute('disabled', 'true');
        removeFileBtn.setAttribute('disabled', 'true');

        // মাল্টিপার্ট ফর্ম ডাটা প্রিপেয়ার করা
        const formData = new FormData();
        formData.append('file', currentFile);

        try {
            // সার্ভারের /convert এন্ডপয়েন্টে রিকোয়েস্ট পাঠানো
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // সফল রূপান্তর: আউটপুট ডেটা বসানো
                outputTextarea.value = data.markdown;
                
                // marked.js লাইব্রেরি ব্যবহার করে HTML তৈরি করা
                if (typeof marked !== 'undefined') {
                    previewBox.innerHTML = marked.parse(data.markdown);
                } else {
                    // marked.js লোড না হলে প্লেইন টেক্সট দেখাবে
                    previewBox.innerHTML = `<pre>${data.markdown}</pre>`;
                }

                // UI লোডিং বন্ধ করে আউটপুট দেখানো
                loadingState.classList.add('hidden');
                outputState.classList.remove('hidden');
                showToast('ফাইল সফলভাবে কনভার্ট হয়েছে!', 'success');
            } else {
                // সার্ভার লেভেল কোনো এরর হলে
                throw new Error(data.error || 'কনভার্ট করতে সমস্যা হয়েছে।');
            }
        } catch (error) {
            // কোনো এরর হলে ইউজারকে জানানো
            loadingState.classList.add('hidden');
            emptyState.classList.remove('hidden');
            showToast(error.message, 'error');
        } finally {
            // বাটন আবার সক্রিয় করা
            convertBtn.removeAttribute('disabled');
            removeFileBtn.removeAttribute('disabled');
        }
    });

    // ----------------------------------------------------
    // ৬. ট্যাব পরিবর্তন করা (Tabs: Code vs Preview)
    // ----------------------------------------------------
    tabCode.addEventListener('click', () => {
        tabCode.classList.add('active');
        tabPreview.classList.remove('active');
        outputTextarea.classList.remove('hidden');
        previewBox.classList.add('hidden');
    });

    tabPreview.addEventListener('click', () => {
        tabPreview.classList.add('active');
        tabCode.classList.remove('active');
        outputTextarea.classList.add('hidden');
        previewBox.classList.remove('hidden');
    });

    // ----------------------------------------------------
    // ৭. অ্যাকশন বাটনসমূহ (Copy & Download Functionality)
    // ----------------------------------------------------
    
    // ক্লিপবোর্ডে কপি করার কাজ
    copyBtn.addEventListener('click', () => {
        const text = outputTextarea.value;
        if (!text) return;
        
        navigator.clipboard.writeText(text).then(() => {
            showToast('ক্লিপবোর্ডে কপি করা হয়েছে!', 'success');
            // বাটন স্টেট ক্ষণিকের জন্য পরিবর্তন
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> কপি করা হয়েছে';
            lucide.createIcons();
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                lucide.createIcons();
            }, 2000);
        }).catch(err => {
            showToast('কপি করতে ব্যর্থ হয়েছে', 'error');
        });
    });

    // ডিরেক্ট ফাইল ডাউনলোড করার কাজ
    downloadBtn.addEventListener('click', () => {
        const text = outputTextarea.value;
        if (!text) return;
        
        // ফাইল ডিক্লেয়ার এবং ডাউনলোড প্রজেক্ট
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // আসল ফাইলের এক্সটেনশন বাদ দিয়ে .md যুক্ত করা
        const originalName = currentFile ? currentFile.name : 'document';
        const lastDot = originalName.lastIndexOf('.');
        const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
        
        link.href = url;
        link.setAttribute('download', `${baseName}.md`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('ফাইল ডাউনলোড শুরু হয়েছে!', 'success');
    });

    // ----------------------------------------------------
    // ৮. PWA সার্ভিস ওয়ার্কার ও ইন্সটলেশন লজিক (PWA Service Worker & Install Logic)
    // ----------------------------------------------------
    const installBtn = document.getElementById('install-btn');
    let deferredPrompt = null;

    // সার্ভিস ওয়ার্কার রেজিস্টার করা
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('ServiceWorker registered successfully with scope:', registration.scope);
                })
                .catch((error) => {
                    console.error('ServiceWorker registration failed:', error);
                });
        });
    }

    // PWA ইন্সটল প্রম্পট ধরার জন্য ইভেন্ট লিসেনার
    window.addEventListener('beforeinstallprompt', (e) => {
        // ব্রাউজারের ডিফল্ট প্রম্পট বন্ধ করা
        e.preventDefault();
        // ইভেন্টটি পরে ব্যবহারের জন্য সেভ করে রাখা
        deferredPrompt = e;
        // আমাদের কাস্টম ইন্সটল বাটনটি দৃশ্যমান করা
        if (installBtn) {
            installBtn.classList.remove('hidden');
        }
    });

    // কাস্টম ইন্সটল বাটনে ক্লিক ইভেন্ট
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            
            // ইন্সটলেশন প্রম্পট দেখানো
            deferredPrompt.prompt();
            
            // ব্যবহারকারীর পছন্দ জানা
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            
            // ইভেন্ট রিসেট করা এবং বাটন হাইড করা
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        });
    }

    // অ্যাপটি সফলভাবে ইন্সটল করা হলে
    window.addEventListener('appinstalled', (event) => {
        console.log('MarkItDown App was installed successfully.');
        if (installBtn) {
            installBtn.classList.add('hidden');
        }
        showToast('MarkItDown অ্যাপটি সফলভাবে ইন্সটল করা হয়েছে!', 'success');
    });

    // ----------------------------------------------------
    // ৯. কাস্টম নোটিফিকেশন সিস্টেম (Toast Notifications)
    // ----------------------------------------------------
    function showToast(message, type = 'info') {
        // নতুন টোস্ট ডিভ তৈরি
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // প্রকারভেদে আইকন নির্ধারণ
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';
        
        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        lucide.createIcons(); // আইকন রেন্ডারিং
        
        // ৪ সেকেন্ড পর টোস্টটি মুছে ফেলা
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s reverse forwards';
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 4000);
    }
});

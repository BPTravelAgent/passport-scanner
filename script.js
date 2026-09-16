document.addEventListener('DOMContentLoaded', () => {
    // ---- Firebase Configuration ----
    const firebaseConfig = {
        apiKey: "AIzaSyBcH-dZDDDh9oRQG5X4c8dPjS5LfzasW4U",
        authDomain: "bptravel-passport.firebaseapp.com",
        projectId: "bptravel-passport",
        storageBucket: "bptravel-passport.firebasestorage.app",
        messagingSenderId: "493422251",
        appId: "1:493422251:web:52c110869941ea688499ee",
        measurementId: "G-TYNCCN49JM"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const USERS_COL_REF = db.collection('users');

    // ---- State Management ----
    // Default Users
    const defaultUsers = [
        {
            username: 'BPsanju',
            password: 'Sanju@2027',
            role: 'admin',
            type: 'pro',
            trialDays: 0,
            trialStartDate: null,
            pic: null,
            scanCount: 0,
            lastLogin: null,
            isOnline: false,
            lastScanTime: null
        },
        {
            username: 'Kamesh',
            password: 'K@2027',
            role: 'user',
            type: 'trial',
            trialDays: 14,
            trialStartDate: '2026-09-15T00:00:00.000Z',
            pic: 'Kamesh/Kamesh Pic.jpg',
            scanCount: 0,
            lastLogin: null,
            isOnline: false,
            lastScanTime: null
        },
        {
            username: 'Piumal',
            password: 'P@2027',
            role: 'user',
            type: 'trial',
            trialDays: 14,
            trialStartDate: '2026-09-15T00:00:00.000Z',
            pic: 'Piumal/Piumal Pic.jpg',
            scanCount: 0,
            lastLogin: null,
            isOnline: false,
            lastScanTime: null
        },
        {
            username: 'Piyumi',
            password: 'Piyumi@2027',
            role: 'user',
            type: 'trial',
            trialDays: 30,
            trialStartDate: new Date().toISOString(), // Start trial today
            pic: 'Piyumi/Piyumi Pic.jpg',
            scanCount: 0,
            lastLogin: null,
            isOnline: false,
            lastScanTime: null
        }
    ];

    let users = [];
    let isUsersLoaded = false;
    const loginBtn = document.querySelector('#login-form button[type="submit"]');
    
    // Disable login until database loads
    if(loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Connecting to Database...';
    }

    async function loadUsers() {
        return new Promise((resolve) => {
            USERS_COL_REF.onSnapshot(async (snapshot) => {
                let tempUsers = [];
                snapshot.forEach(doc => {
                    tempUsers.push(doc.data());
                });

                if (tempUsers.length === 0 && !isUsersLoaded) {
                    for (let defUser of defaultUsers) {
                        await USERS_COL_REF.doc(defUser.username).set(defUser);
                        tempUsers.push(defUser);
                    }
                } else if (!isUsersLoaded) {
                    // Auto-migrate
                    for (let defUser of defaultUsers) {
                        if (!tempUsers.some(u => u.username === defUser.username)) {
                            await USERS_COL_REF.doc(defUser.username).set(defUser);
                            tempUsers.push(defUser);
                        }
                    }
                }
                
                users = tempUsers;
                
                if (!isUsersLoaded) {
                    isUsersLoaded = true;
                    if(loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Login';
                    }
                    resolve();
                }

                // If admin dashboard is active, re-render the table
                const adminDash = document.getElementById('admin-dashboard');
                if (adminDash && !adminDash.classList.contains('hidden')) {
                    renderUserTable();
                }
            }, (error) => {
                console.error("Error loading users from Firebase:", error);
                if (!isUsersLoaded) {
                    users = [...defaultUsers];
                    isUsersLoaded = true;
                    if(loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Login';
                    }
                    resolve();
                }
            });
        });
    }

    loadUsers();

    // ---- Login Logic ----
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    let currentUser = null;

    function getDaysRemaining(user) {
        if (user.type === 'pro') return 999;
        const start = new Date(user.trialStartDate);
        const now = new Date();
        const diffTime = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return user.trialDays - diffDays;
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value;

        loginError.classList.add('hidden');
        
        const user = users.find(u => u.username === usernameInput && u.password === passwordInput);

        if (user) {
            if (user.type === 'trial') {
                const daysLeft = getDaysRemaining(user);
                if (daysLeft <= 0) {
                    loginError.textContent = 'Your trial has expired. Please contact support.';
                    loginError.classList.remove('hidden');
                    return;
                }
            }
            currentUser = user;
            loginSuccess();
        } else {
            loginError.textContent = 'Invalid username or password.';
            loginError.classList.remove('hidden');
        }
    });

    function loginSuccess() {
        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        
        // Set online status and last login
        USERS_COL_REF.doc(currentUser.username).update({
            isOnline: true,
            lastLogin: new Date().toISOString()
        }).catch(console.error);
        
        const profileName = document.getElementById('profile-name');
        const profilePic = document.getElementById('profile-pic');
        const userProfile = document.getElementById('user-profile');
        const btnAdminPanel = document.getElementById('btn-admin-panel');
        
        profileName.textContent = currentUser.username;
        if (currentUser.pic) {
            profilePic.src = currentUser.pic;
            profilePic.classList.remove('hidden');
        } else {
            profilePic.classList.add('hidden');
        }
        userProfile.classList.remove('hidden');
        
        // Show Admin button if admin
        if (currentUser.role === 'admin') {
            btnAdminPanel.classList.remove('hidden');
        } else {
            btnAdminPanel.classList.add('hidden');
        }
        
        // Remove existing banner if any
        const existingBanner = mainApp.querySelector('.trial-banner');
        if (existingBanner) {
            existingBanner.remove();
        }

        if (currentUser.type === 'trial') {
            const daysLeft = getDaysRemaining(currentUser);
            const banner = document.createElement('div');
            banner.className = 'trial-banner';
            banner.textContent = `Welcome ${currentUser.username}! You have ${daysLeft} days remaining in your trial.`;
            mainApp.insertBefore(banner, mainApp.firstChild);
        }
    }

    document.getElementById('btn-logout').addEventListener('click', () => {
        if(currentUser) {
            USERS_COL_REF.doc(currentUser.username).update({
                isOnline: false
            }).catch(console.error);
        }
        mainApp.classList.add('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
        document.querySelector('.main-content').classList.remove('hidden'); // Reset to scanner view
        loginScreen.classList.remove('hidden');
        document.getElementById('login-form').reset();
        loginError.classList.add('hidden');
        currentUser = null;
    });

    window.addEventListener('beforeunload', () => {
        if (currentUser) {
            USERS_COL_REF.doc(currentUser.username).update({
                isOnline: false
            });
        }
    });

    // ---- Admin Dashboard Logic ----
    const adminDashboard = document.getElementById('admin-dashboard');
    const scannerSection = document.querySelector('.main-content');
    const userTableBody = document.getElementById('user-table-body');
    const userModal = document.getElementById('user-modal');
    const userForm = document.getElementById('user-form');
    
    document.getElementById('btn-admin-panel').addEventListener('click', () => {
        scannerSection.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        renderUserTable();
    });

    document.getElementById('btn-back-to-scanner').addEventListener('click', () => {
        adminDashboard.classList.add('hidden');
        scannerSection.classList.remove('hidden');
    });

    function renderUserTable() {
        userTableBody.innerHTML = '';
        
        let totalUsers = users.length;
        let onlineUsers = 0;
        let totalScans = 0;

        users.forEach((user, index) => {
            totalScans += (user.scanCount || 0);
            if(user.isOnline) onlineUsers++;

            const tr = document.createElement('tr');
            
            const picCell = user.pic ? `<img src="${user.pic}" class="table-profile-pic">` : `<div class="table-profile-pic"></div>`;
            const daysLeftStr = user.type === 'pro' ? 'Unlimited' : (getDaysRemaining(user) > 0 ? getDaysRemaining(user) : 'Expired');
            
            const statusBadge = user.isOnline 
                ? `<span class="status-badge status-online"><div class="status-dot"></div>Online</span>` 
                : `<span class="status-badge status-offline"><div class="status-dot"></div>Offline</span>`;

            const lastLoginStr = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never';
            const scanCountStr = user.scanCount || 0;
            
            tr.innerHTML = `
                <td>${picCell}</td>
                <td>${statusBadge}</td>
                <td>${user.username}</td>
                <td><span style="text-transform: capitalize;">${user.role}</span></td>
                <td><span style="text-transform: capitalize;">${user.type}</span></td>
                <td>${daysLeftStr}</td>
                <td>${lastLoginStr}</td>
                <td>${scanCountStr}</td>
                <td>
                    <div style="display: flex; gap: 6px; flex-wrap: nowrap; min-width: max-content;">
                        <button class="btn btn-secondary btn-edit-user" data-index="${index}" style="padding: 5px 10px; font-size: 12px;">Edit</button>
                        <button class="btn btn-secondary btn-reset-stats" data-index="${index}" style="padding: 5px 10px; font-size: 12px;">Reset</button>
                        ${user.username !== currentUser.username ? `<button class="btn btn-secondary btn-delete-user" data-index="${index}" style="padding: 5px 10px; font-size: 12px; border-color: var(--error-color); color: var(--error-color);">Delete</button>` : ''}
                    </div>
                </td>
            `;
            userTableBody.appendChild(tr);
        });

        // Update Summary Cards
        const elTotalUsers = document.getElementById('stat-total-users');
        const elOnlineUsers = document.getElementById('stat-online-users');
        const elTotalScans = document.getElementById('stat-total-scans');
        
        if (elTotalUsers) elTotalUsers.innerText = totalUsers;
        if (elOnlineUsers) elOnlineUsers.innerText = onlineUsers;
        if (elTotalScans) elTotalScans.innerText = totalScans;

        document.querySelectorAll('.btn-edit-user').forEach(btn => {
            btn.addEventListener('click', (e) => openUserModal(e.target.dataset.index));
        });
        document.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', (e) => deleteUser(e.target.dataset.index));
        });
        document.querySelectorAll('.btn-reset-stats').forEach(btn => {
            btn.addEventListener('click', (e) => resetUserStats(e.target.dataset.index));
        });
    }

    async function resetUserStats(index) {
        if(confirm(`Are you sure you want to reset scan stats for ${users[index].username}?`)) {
            try {
                await USERS_COL_REF.doc(users[index].username).update({
                    scanCount: 0,
                    lastScanTime: null
                });
            } catch(e) {
                console.error("Error resetting stats:", e);
                alert("Failed to reset stats.");
            }
        }
    }

    document.getElementById('btn-open-add-user').addEventListener('click', () => {
        openUserModal(-1);
    });

    document.getElementById('close-user-modal').addEventListener('click', () => {
        userModal.classList.add('hidden');
    });

    document.getElementById('add-type').addEventListener('change', (e) => {
        const trialDaysGroup = document.getElementById('trial-days-group');
        if (e.target.value === 'pro') {
            trialDaysGroup.classList.add('hidden');
        } else {
            trialDaysGroup.classList.remove('hidden');
        }
    });

    function openUserModal(index) {
        userForm.reset();
        const modalTitle = document.getElementById('modal-title');
        
        if (index === -1) {
            modalTitle.textContent = 'Add New User';
            document.getElementById('edit-original-username').value = '';
            document.getElementById('trial-days-group').classList.remove('hidden');
        } else {
            modalTitle.textContent = 'Edit User';
            const user = users[index];
            document.getElementById('edit-original-username').value = user.username;
            document.getElementById('add-username').value = user.username;
            document.getElementById('add-password').value = user.password;
            document.getElementById('add-role').value = user.role;
            document.getElementById('add-type').value = user.type;
            document.getElementById('add-trial-days').value = user.trialDays || 14;
            
            if (user.type === 'pro') {
                document.getElementById('trial-days-group').classList.add('hidden');
            } else {
                document.getElementById('trial-days-group').classList.remove('hidden');
            }
        }
        
        userModal.classList.remove('hidden');
    }

    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = userForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        
        const originalUsername = document.getElementById('edit-original-username').value;
        const newUsername = document.getElementById('add-username').value.trim();
        const password = document.getElementById('add-password').value;
        const role = document.getElementById('add-role').value;
        const type = document.getElementById('add-type').value;
        const trialDays = parseInt(document.getElementById('add-trial-days').value);
        const fileInput = document.getElementById('add-profile-pic');
        
        // Check duplicate
        if (originalUsername !== newUsername && users.some(u => u.username === newUsername)) {
            alert('Username already exists!');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save User';
            return;
        }

        let picBase64 = null;
        if (fileInput.files.length > 0) {
            picBase64 = await resizeImage(fileInput.files[0], 200);
        }

        const newUserObj = {
            username: newUsername,
            password: password,
            role: role,
            type: type,
            trialDays: type === 'pro' ? 0 : trialDays,
            trialStartDate: type === 'pro' ? null : new Date().toISOString(),
            pic: picBase64,
            scanCount: 0,
            lastLogin: null,
            isOnline: false,
            lastScanTime: null
        };

        try {
            if (originalUsername) {
                // Edit existing
                const index = users.findIndex(u => u.username === originalUsername);
                // Retain old values if not changing
                if (!picBase64) newUserObj.pic = users[index].pic;
                if (type === 'trial' && users[index].type === 'trial' && originalUsername === newUsername) {
                    newUserObj.trialStartDate = users[index].trialStartDate;
                }
                newUserObj.scanCount = users[index].scanCount || 0;
                newUserObj.lastLogin = users[index].lastLogin || null;
                newUserObj.isOnline = users[index].isOnline || false;
                newUserObj.lastScanTime = users[index].lastScanTime || null;
                
                // Update Firebase
                if (originalUsername !== newUsername) {
                    // Username changed, so delete old doc and create new
                    await USERS_COL_REF.doc(originalUsername).delete();
                }
                await USERS_COL_REF.doc(newUsername).set(newUserObj);
                
                // Update local array
                users[index] = newUserObj;
                if (currentUser.username === originalUsername) {
                    currentUser = newUserObj;
                }
            } else {
                // Add new
                await USERS_COL_REF.doc(newUsername).set(newUserObj);
                users.push(newUserObj);
            }

            userModal.classList.add('hidden');
            renderUserTable();
        } catch (error) {
            console.error("Error saving to Firebase:", error);
            alert("Error saving user to database. Check connection.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save User';
        }
    });

    async function deleteUser(index) {
        if (confirm(`Are you sure you want to delete ${users[index].username}?`)) {
            try {
                const username = users[index].username;
                await USERS_COL_REF.doc(username).delete();
                users.splice(index, 1);
                renderUserTable();
            } catch (error) {
                console.error("Error deleting from Firebase:", error);
                alert("Error deleting user from database.");
            }
        }
    }

    // Utility: Resize and compress image to base64
    function resizeImage(file, maxSize) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const cardsContainer = document.getElementById('cards-container');
    const template = document.getElementById('passport-card-template');
    const globalActions = document.getElementById('global-actions');
    const uploadSection = document.getElementById('upload-section');
    
    // Global Action Buttons
    document.getElementById('btn-add-more').addEventListener('click', () => fileInput.click());
    document.getElementById('btn-reset-all').addEventListener('click', () => {
        cardsContainer.innerHTML = '';
        cardsData = [];
        uploadSection.classList.remove('hidden');
        globalActions.classList.add('hidden');
        fileInput.value = '';
    });
    document.getElementById('btn-copy-all-global').addEventListener('click', (e) => {
        let allDataText = '';
        cardsData.forEach((card, index) => {
            if (card.status === 'success') {
                allDataText += `--- Passport ${index + 1} ---\n`;
                allDataText += getCardDataText(card) + '\n\n';
            }
        });
        if (allDataText) {
            copyToClipboard(allDataText.trim(), e.target);
        } else {
            alert('No successful scans to copy.');
        }
    });

    let cardsData = [];
    let isProcessing = false;
    let scanQueue = [];

    // Drag and Drop Events
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFiles(e.target.files);
        }
    });

    // Paste Image Event
    window.addEventListener('paste', (e) => {
        // Ensure user is logged in and not in the admin dashboard
        if (!currentUser) return;
        const adminDash = document.getElementById('admin-dashboard');
        if (adminDash && !adminDash.classList.contains('hidden')) return;

        if (e.clipboardData && e.clipboardData.files.length > 0) {
            const files = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
            if (files.length > 0) {
                e.preventDefault();
                handleFiles(files);
            }
        }
    });

    // ---- Camera Logic ----
    const cameraSection = document.getElementById('camera-section');
    const cameraFeed = document.getElementById('camera-feed');
    const cameraCanvas = document.getElementById('camera-canvas');
    let stream = null;

    document.getElementById('btn-open-camera').addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // Prefer rear camera
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            cameraFeed.srcObject = stream;
            uploadSection.classList.add('hidden');
            cameraSection.classList.remove('hidden');
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please ensure you have granted permissions.");
        }
    });

    document.getElementById('btn-close-camera').addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    });

    document.getElementById('btn-capture-camera').addEventListener('click', () => {
        if (!stream) return;
        
        // Draw video frame to canvas
        cameraCanvas.width = cameraFeed.videoWidth;
        cameraCanvas.height = cameraFeed.videoHeight;
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraFeed, 0, 0, cameraCanvas.width, cameraCanvas.height);
        
        // Convert canvas to Blob/File
        cameraCanvas.toBlob((blob) => {
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            
            // Close camera
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            cameraSection.classList.add('hidden');
            
            // Process the file
            handleFiles([file]);
        }, 'image/jpeg', 0.95);
    });

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type === 'application/pdf') {
                handlePDFFile(file);
            } else if (file.type.startsWith('image/')) {
                uploadSection.classList.add('hidden');
                globalActions.classList.remove('hidden');
                createPassportCard(file);
            }
        });
        
        processQueue();
    }

    // PDF Handling
    const pdfModal = document.getElementById('pdf-modal');
    const pdfThumbnailsContainer = document.getElementById('pdf-thumbnails-container');
    const pdfLoadingIndicator = document.getElementById('pdf-loading-indicator');
    
    document.getElementById('close-pdf-modal').addEventListener('click', () => {
        pdfModal.classList.add('hidden');
    });

    async function handlePDFFile(file) {
        pdfModal.classList.remove('hidden');
        pdfThumbnailsContainer.innerHTML = '';
        pdfLoadingIndicator.classList.remove('hidden');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            
            pdfLoadingIndicator.classList.add('hidden');

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                
                // Render thumbnail
                const viewport = page.getViewport({ scale: 0.5 });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                
                const thumbDiv = document.createElement('div');
                thumbDiv.className = 'pdf-thumbnail';
                
                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/jpeg');
                
                const label = document.createElement('div');
                label.className = 'page-number';
                label.innerText = `Page ${pageNum}`;
                
                thumbDiv.appendChild(img);
                thumbDiv.appendChild(label);
                
                thumbDiv.addEventListener('click', async () => {
                    pdfModal.classList.add('hidden');
                    
                    // Render high-res for OCR
                    const hrViewport = page.getViewport({ scale: 2.0 }); // 2.0 scale for better OCR
                    const hrCanvas = document.createElement('canvas');
                    const hrCtx = hrCanvas.getContext('2d');
                    hrCanvas.width = hrViewport.width;
                    hrCanvas.height = hrViewport.height;
                    
                    await page.render({ canvasContext: hrCtx, viewport: hrViewport }).promise;
                    
                    hrCanvas.toBlob((blob) => {
                        const imgFile = new File([blob], `passport_page_${pageNum}.jpg`, { type: 'image/jpeg' });
                        uploadSection.classList.add('hidden');
                        globalActions.classList.remove('hidden');
                        createPassportCard(imgFile);
                        processQueue();
                    }, 'image/jpeg', 0.95);
                });
                
                pdfThumbnailsContainer.appendChild(thumbDiv);
            }
        } catch (error) {
            console.error("Error loading PDF:", error);
            pdfLoadingIndicator.classList.add('hidden');
            alert("Could not load the PDF file. It might be corrupted or password protected.");
            pdfModal.classList.add('hidden');
        }
    }

    function createPassportCard(file) {
        const cardClone = template.content.cloneNode(true);
        const cardElement = cardClone.querySelector('.passport-card');
        
        const card = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            file: file,
            originalImageSrc: '',
            rotation: 0,
            zoom: 1,
            status: 'pending', // pending, scanning, success, error
            ui: {
                cardElement: cardElement,
                imagePreview: cardElement.querySelector('.image-preview'),
                imgWrapper: cardElement.querySelector('.img-wrapper'),
                scanningOverlay: cardElement.querySelector('.scanning-overlay'),
                scanStatus: cardElement.querySelector('.scan-status'),
                resultsSection: cardElement.querySelector('.results-section'),
                errorBanner: cardElement.querySelector('.error-banner'),
                errorMessage: cardElement.querySelector('.error-message'),
                inputs: {
                    firstName: cardElement.querySelector('.res-first-name'),
                    lastName: cardElement.querySelector('.res-last-name'),
                    sex: cardElement.querySelector('.res-sex'),
                    nationality: cardElement.querySelector('.res-nationality'),
                    dob: cardElement.querySelector('.res-dob'),
                    type: cardElement.querySelector('.res-type'),
                    passportNo: cardElement.querySelector('.res-passport-no'),
                    expiry: cardElement.querySelector('.res-expiry')
                }
            }
        };

        // Initialize Pan State
        card.panX = 0;
        card.panY = 0;

        // Attach Zoom and Rotate Event Listeners
        cardElement.querySelector('.btn-rotate-left').addEventListener('click', () => updateTransform(card, -90, 0));
        cardElement.querySelector('.btn-rotate-right').addEventListener('click', () => updateTransform(card, 90, 0));
        cardElement.querySelector('.btn-zoom-in').addEventListener('click', () => updateTransform(card, 0, 0.25));
        cardElement.querySelector('.btn-zoom-out').addEventListener('click', () => updateTransform(card, 0, -0.25));
        cardElement.querySelector('.btn-zoom-reset').addEventListener('click', () => {
            card.rotation = 0;
            card.zoom = 1;
            card.panX = 0;
            card.panY = 0;
            updateTransform(card, 0, 0);
        });

        // Mouse and Touch Drag to Pan
        let isDragging = false;
        let startX, startY, initialPanX, initialPanY;

        card.ui.imgWrapper.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialPanX = card.panX;
            initialPanY = card.panY;
            e.preventDefault(); // Prevent default image drag
        });

        card.ui.imgWrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                initialPanX = card.panX;
                initialPanY = card.panY;
            }
        }, { passive: true });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });

        window.addEventListener('touchend', () => {
            isDragging = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            card.panX = initialPanX + dx;
            card.panY = initialPanY + dy;
            updateTransform(card, 0, 0);
        });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length !== 1) return;
            if (e.cancelable) e.preventDefault(); // Prevent scrolling while panning
            
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            
            card.panX = initialPanX + dx;
            card.panY = initialPanY + dy;
            updateTransform(card, 0, 0);
        }, { passive: false });

        // Mouse Wheel to Zoom
        card.ui.imgWrapper.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault(); // Prevent page zooming
                if (e.deltaY < 0) {
                    updateTransform(card, 0, 0.15); // zoom in
                } else {
                    updateTransform(card, 0, -0.15); // zoom out
                }
            }
        });

        // Copy buttons per field
        cardElement.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = e.target.previousElementSibling;
                copyToClipboard(input.value, e.target);
            });
        });

        // Copy all details
        cardElement.querySelector('.btn-copy-card').addEventListener('click', (e) => {
            const text = getCardDataText(card);
            copyToClipboard(text, e.target);
        });

        // Re-scan logic
        cardElement.querySelector('.btn-rescan').addEventListener('click', () => {
            if(isProcessing) {
                alert("Please wait for current scans to finish before re-scanning.");
                return;
            }
            rescanCard(card);
        });

        // Load Image
        const reader = new FileReader();
        reader.onload = (e) => {
            card.originalImageSrc = e.target.result;
            card.ui.imagePreview.src = card.originalImageSrc;
            
            cardsData.push(card);
            cardsContainer.appendChild(cardElement);
            scanQueue.push(card);
            
            // Check if queue needs to start
            processQueue();
        };
        reader.readAsDataURL(file);
    }

    function updateTransform(card, rotChange, zoomChange) {
        card.rotation = (card.rotation + rotChange) % 360;
        card.zoom = Math.max(0.25, card.zoom + zoomChange);
        
        card.panX = card.panX || 0;
        card.panY = card.panY || 0;
        
        // Remove CSS transition while dragging to ensure smooth movement
        if (rotChange === 0 && zoomChange === 0) {
            card.ui.imagePreview.style.transition = 'none';
        } else {
            card.ui.imagePreview.style.transition = 'transform 0.1s ease-out';
        }
        
        card.ui.imagePreview.style.transform = `translate(${card.panX}px, ${card.panY}px) scale(${card.zoom}) rotate(${card.rotation}deg)`;
    }

    function showError(card, message) {
        card.ui.errorBanner.classList.remove('hidden');
        card.ui.errorMessage.innerText = message;
        card.ui.scanningOverlay.classList.add('hidden');
        card.status = 'error';
    }

    async function processQueue() {
        if (isProcessing || scanQueue.length === 0) return;
        
        isProcessing = true;
        const currentCard = scanQueue.shift();
        
        await runOCR(currentCard, currentCard.originalImageSrc);
        
        isProcessing = false;
        processQueue(); // Process next in queue
    }

    async function rescanCard(card) {
        card.ui.resultsSection.classList.add('hidden');
        card.ui.errorBanner.classList.add('hidden');
        
        // If image was rotated, we need to create a new rotated canvas image for Tesseract
        let targetSrc = card.originalImageSrc;
        
        if (card.rotation !== 0) {
            targetSrc = await getRotatedImageBase64(card.originalImageSrc, card.rotation);
        }

        scanQueue.push({ ...card, isRescan: true, targetSrc: targetSrc, originalCardRef: card });
        processQueue();
    }
    
    function getRotatedImageBase64(src, rotation) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new canvas size
                if (rotation === 90 || rotation === -270 || rotation === -90 || rotation === 270) {
                    canvas.width = img.height;
                    canvas.height = img.width;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }
                
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(rotation * Math.PI / 180);
                ctx.drawImage(img, -img.width / 2, -img.height / 2);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.src = src;
        });
    }

    async function runOCR(queueItem, defaultSrc) {
        const card = queueItem.isRescan ? queueItem.originalCardRef : queueItem;
        const targetSrc = queueItem.isRescan ? queueItem.targetSrc : defaultSrc;

        card.status = 'scanning';
        card.ui.scanningOverlay.classList.remove('hidden');
        card.ui.scanStatus.innerText = "Initializing OCR Engine...";

        try {
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if(m.status === 'recognizing text') {
                        card.ui.scanStatus.innerText = `Scanning: ${Math.round(m.progress * 100)}%`;
                    }
                }
            });
            
            card.ui.scanStatus.innerText = "Reading Passport MRZ Data...";
            const { data: { text } } = await worker.recognize(targetSrc);
            await worker.terminate();
            
            console.log(`Raw OCR Text (Card ID: ${card.id}):\n`, text);
            parseMRZ(text, card);

        } catch (error) {
            console.error("OCR Error:", error);
            showError(card, "An error occurred while analyzing the image.");
        }
    }

    function cleanString(str) {
        return str.replace(/[^A-Z0-9<]/g, '').toUpperCase();
    }

    function parseMRZ(rawText, card) {
        card.ui.scanningOverlay.classList.add('hidden');
        
        let cleanedText = rawText.replace(/[\(\[\{\©\«\<]/g, '<').toUpperCase();
        const lines = cleanedText.split('\n').map(l => l.trim().replace(/\s+/g, '')).filter(l => l.length > 20);
        
        let mrzLine1 = null;
        let mrzLine2 = null;

        for (let i = 0; i < lines.length - 1; i++) {
            const l1 = cleanString(lines[i]);
            const l2 = cleanString(lines[i+1]);
            
            if (l1.startsWith('P') && l1.length >= 40 && l2.length >= 40 && l1.includes('<') && l2.includes('<')) {
                mrzLine1 = l1.padEnd(44, '<').substring(0, 44);
                mrzLine2 = l2.padEnd(44, '<').substring(0, 44);
                break;
            }
        }

        if (!mrzLine1 || !mrzLine2) {
            if (lines.length >= 2) {
                mrzLine1 = cleanString(lines[lines.length - 2]).padEnd(44, '<').substring(0, 44);
                mrzLine2 = cleanString(lines[lines.length - 1]).padEnd(44, '<').substring(0, 44);
            } else {
                showError(card, "Could not detect MRZ. Try rotating the image or ensuring the bottom lines are visible.");
                return;
            }
        }

        try {
            const countryCode = mrzLine1.substring(2, 5).replace(/</g, '');
            const nameParts = mrzLine1.substring(5).split('<<');
            let lastName = nameParts[0].replace(/</g, ' ').trim();
            let firstName = (nameParts[1] || '').replace(/</g, ' ').trim();

            let passportNo = mrzLine2.substring(0, 9).replace(/</g, '');
            let nationality = mrzLine2.substring(10, 13).replace(/</g, '');
            
            let dobRaw = mrzLine2.substring(13, 19);
            let sex = mrzLine2.substring(20, 21);
            if(sex !== 'M' && sex !== 'F') sex = (sex === 'P' || sex === 'H' ? 'M' : 'F'); 
            
            let expiryRaw = mrzLine2.substring(21, 27);

            const formatDob = (yymmdd) => {
                if(!/^\d{6}$/.test(yymmdd)) return yymmdd;
                let year = parseInt(yymmdd.substring(0,2));
                year = year > new Date().getFullYear() % 100 ? 1900 + year : 2000 + year;
                let month = yymmdd.substring(2,4);
                let day = yymmdd.substring(4,6);
                return `${day}/${month}/${year}`;
            };

            const formatExpiry = (yymmdd) => {
                if(!/^\d{6}$/.test(yymmdd)) return yymmdd;
                let year = parseInt(yymmdd.substring(0,2)) + 2000;
                let month = yymmdd.substring(2,4);
                let day = yymmdd.substring(4,6);
                return `${day}/${month}/${year}`;
            };

            // Update UI
            card.ui.inputs.firstName.value = firstName || "";
            card.ui.inputs.lastName.value = lastName || "";
            card.ui.inputs.sex.value = sex === 'M' ? 'Male' : (sex === 'F' ? 'Female' : sex);
            card.ui.inputs.nationality.value = nationality || countryCode || "";
            card.ui.inputs.dob.value = formatDob(dobRaw) || "";
            card.ui.inputs.passportNo.value = passportNo || "";
            card.ui.inputs.expiry.value = formatExpiry(expiryRaw) || "";

            card.ui.resultsSection.classList.remove('hidden');
            card.status = 'success';
            
            // Increment Scan Count
            if(currentUser) {
                USERS_COL_REF.doc(currentUser.username).update({
                    scanCount: firebase.firestore.FieldValue.increment(1),
                    lastScanTime: new Date().toISOString()
                }).catch(console.error);
            }
        } catch (err) {
            console.error("Parsing error:", err);
            showError(card, "Failed to parse passport details. The image might be blurry.");
        }
    }

    function getCardDataText(card) {
        let text = [];
        for (const [key, input] of Object.entries(card.ui.inputs)) {
            text.push(`${input.dataset.field}: ${input.value}`);
        }
        return text.join('\n');
    }

    function copyToClipboard(text, iconElement) {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const originalHTML = iconElement.innerHTML;
            
            // Check if iconElement is the button or the span inside it
            let targetIcon = iconElement;
            if(iconElement.tagName === 'BUTTON') {
                targetIcon = iconElement.querySelector('.material-icons');
            }
            
            if(targetIcon) {
                 const originalIconHTML = targetIcon.innerHTML;
                 targetIcon.innerText = 'check';
                 targetIcon.style.color = 'var(--success-color)';
                 setTimeout(() => {
                     targetIcon.innerHTML = originalIconHTML;
                     targetIcon.style.color = '';
                 }, 1500);
            }
        }).catch(err => console.error("Failed to copy:", err));
    }
});

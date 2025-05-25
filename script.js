// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js')
    .then(function(registration) {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch(function(error) {
      console.error('Service Worker registration failed:', error);
    });
  });
}

// Environment detection helpers
const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone || 
                     document.referrer.includes('android-app://');
const isDesktop = !iOS && !isAndroid;

console.log('[PWA] Environment detection:', {
  iOS: iOS,
  isAndroid: isAndroid,
  isSafari: isSafari,
  isStandalone: isStandalone,
  isDesktop: isDesktop
});

// --- IndexedDB Helpers ---
function openDatabase() {
  return new Promise(function(resolve, reject) {
    const request = indexedDB.open('pwaGenerator', 2);
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('app')) {
        const store = db.createObjectStore('app', { keyPath: 'id' });
      }
    };
    request.onsuccess = function(event) {
      resolve(event.target.result);
    };
    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

function getCustomHTML() {
  // Use hostname as the unique key for the app
  const appKey = window.location.hostname;
  
  return openDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      const transaction = db.transaction('app', 'readonly');
      const store = transaction.objectStore('app');
      const getRequest = store.get(appKey);
      getRequest.onsuccess = function() {
        if (getRequest.result) {
          if (getRequest.result.html && 'gistUrl' in getRequest.result) {
            resolve({
              html: getRequest.result.html,
              gistUrl: getRequest.result.gistUrl
            });
          } else if (typeof getRequest.result.html === 'string') {
            resolve({
              html: getRequest.result.html,
              gistUrl: null
            });
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      getRequest.onerror = function() {
        resolve(null);
      };
    });
  });
}

function saveCustomHTML(html, gistUrl) {
  // Use hostname as the unique key for the app
  const appKey = window.location.hostname;
  
  return openDatabase().then(function(db) {
    return new Promise(function(resolve, reject) {
      const transaction = db.transaction('app', 'readwrite');
      const store = transaction.objectStore('app');
      const putRequest = store.put({ 
        id: appKey, 
        html: html,
        gistUrl: gistUrl || null
      });
      putRequest.onsuccess = function() {
        resolve();
      };
      putRequest.onerror = function() {
        reject(putRequest.error);
      };
    });
  });
}

// Function to save query parameters to localStorage
function saveQueryParamsToLocalStorage() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('gistUrl')) {
    console.log('[DEBUG] Saving gistUrl from URL params:', urlParams.get('gistUrl'));
    localStorage.setItem('gistUrl', urlParams.get('gistUrl'));
    return urlParams.get('gistUrl');
  }
  return null;
}

// Save query parameters on page load
const urlGistParam = saveQueryParamsToLocalStorage();

// iOS detection
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Add PWA install guidance for iOS - REMOVED this function's auto-popup functionality
function addIOSInstallGuide() {
  // Now returns immediately - we'll handle this via the button click instead
  return;
}

// Add iOS install guide when DOM is loaded - keeping this but the function now returns immediately
document.addEventListener('DOMContentLoaded', addIOSInstallGuide);

// Function to fetch and display gist content in preview mode
function fetchGistPreview(url) {
  // Extract the gist ID from URL
  let gistId = null;
  const gistRegex = /gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i;
  const match = url.match(gistRegex);
  
  if (match && match[1]) {
    gistId = match[1];
  } else {
    console.error("Invalid Gist URL format");
    return;
  }
  
  // Fetch the gist using the GitHub API
  fetch(`https://api.github.com/gists/${gistId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Get the first file from the gist
      const files = Object.values(data.files);
      if (files.length === 0) {
        throw new Error("No files found in this gist");
      }
      
      // Display gist information for preview
      if (data.owner) {
        displayGistPreview(data, files[0].filename);
      }
      
      // Save to cookies for later use
      try {
        document.cookie = `gistUrlCookie=${encodeURIComponent(url)};path=/;max-age=31536000`;
      } catch (e) {
        console.warn('Failed to save to cookies:', e);
      }
    })
    .catch(error => {
      console.error("Error fetching gist:", error);
    });
}

// Function to display gist information in preview mode
function displayGistPreview(gistData, filename) {
  // Make sure we have owner information
  if (!gistData.owner || !gistData.owner.avatar_url) {
    console.warn('Missing owner information in gist data');
    return;
  }
  
  // Get preview elements
  const previewContainer = document.getElementById('previewGistInfoContainer');
  const previewAvatar = document.getElementById('previewAuthorAvatar');
  const previewTitle = document.getElementById('previewGistTitle');
  const previewAuthor = document.getElementById('previewGistAuthor');
  const previewDescription = document.getElementById('previewGistDescription');
  
  // Set the author information
  previewAvatar.src = gistData.owner.avatar_url;
  previewAvatar.alt = `${gistData.owner.login}'s avatar`;
  previewAuthor.textContent = `Created by ${gistData.owner.login}`;
  
  // Set the gist title (use filename if description is empty)
  if (gistData.description && gistData.description.trim() !== "") {
    previewTitle.textContent = gistData.description;
    previewDescription.textContent = `File: ${filename}`;
  } else {
    previewTitle.textContent = filename;
    previewDescription.textContent = "No description provided";
  }
  
  // Show the gist info container
  previewContainer.style.display = "block";
}

// Function to check if there's existing app data
async function checkExistingApps() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['app'], 'readonly');
      const store = transaction.objectStore('app');
      const request = store.getAll();
      
      request.onsuccess = function(event) {
        const apps = event.target.result;
        resolve(apps && apps.length > 0);
      };
      
      request.onerror = function(event) {
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error('Error checking existing apps:', error);
    return false;
  }
}

// Function to show the warning dialog
function showExistingAppsWarning() {
  const warningDialog = document.createElement('div');
  warningDialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
  `;
  
  const dialogContent = document.createElement('div');
  dialogContent.style.cssText = `
    background: white;
    padding: 20px;
    border-radius: 10px;
    max-width: 90%;
    width: 400px;
    text-align: center;
  `;
  
  dialogContent.innerHTML = `
    <h2 style="color: #3498db; margin-top: 0;">Existing Apps Found</h2>
    <p>We found existing apps installed from this origin. Would you like to:</p>
    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
      <button id="continueBtn" style="background: #3498db; color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold;">Continue with Existing Data</button>
      <button id="deleteBtn" style="background: #e74c3c; color: white; border: none; padding: 10px; border-radius: 5px; font-weight: bold;">Delete Existing Data</button>
    </div>
  `;
  
  warningDialog.appendChild(dialogContent);
  document.body.appendChild(warningDialog);
  
  // Handle continue button
  document.getElementById('continueBtn').addEventListener('click', function() {
    warningDialog.remove();
    // Continue with normal app initialization
    initializeApp();
  });
  
  // Handle delete button
  document.getElementById('deleteBtn').addEventListener('click', async function() {
    try {
      const db = await openDatabase();
      const transaction = db.transaction(['app'], 'readwrite');
      const store = transaction.objectStore('app');
      await store.clear();
      warningDialog.remove();
      // Initialize app with fresh state
      initializeApp();
    } catch (error) {
      console.error('Error deleting existing apps:', error);
      alert('Error deleting existing apps. Please try again.');
    }
  });
}

// Helper functions to manage body classes and prevent scrolling
function showPreview() {
  document.body.classList.add('preview-active');
  const previewView = document.getElementById('previewView');
  previewView.style.display = 'flex';
}

function hidePreview() {
  document.body.classList.remove('preview-active');
  const previewView = document.getElementById('previewView');
  previewView.style.display = 'none';
}

function showApp() {
  document.body.classList.add('app-active');
  document.getElementById('appView').style.display = 'block';
}

function hideApp() {
  document.body.classList.remove('app-active');
  document.getElementById('appView').style.display = 'none';
}

// Function to initialize the app
function initializeApp() {
  // Show loading indicator initially
  document.getElementById('loadingUI').style.display = 'flex';
  document.getElementById('editorUI').style.display = 'none';
  document.getElementById('appView').style.display = 'none';
  document.getElementById('installUI').style.display = 'none';
  
  // Get DOM elements
  const htmlInput = document.getElementById('htmlInput');
  const startBtn = document.getElementById('startBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const shareBtn = document.getElementById('shareBtn');
  const previewBtn = document.getElementById('previewBtn');
  const gistUrlInput = document.getElementById('gistUrl');
  const fetchBtn = document.getElementById('fetchBtn');
  const fetchStatus = document.getElementById('fetchStatus');
  const toast = document.getElementById('toast');
  const previewView = document.getElementById('previewView');
  const previewFrame = document.getElementById('previewFrame');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  
  // Gist info elements
  const gistInfoContainer = document.getElementById('gistInfoContainer');
  const authorAvatar = document.getElementById('authorAvatar');
  const gistTitle = document.getElementById('gistTitle');
  const gistAuthor = document.getElementById('gistAuthor');
  const gistDescription = document.getElementById('gistDescription');
  
  // Function to show/hide buttons based on whether there's code
  function updateButtonVisibility(hasContent) {
    startBtn.style.display = hasContent ? 'block' : 'none';
    deleteBtn.style.display = hasContent ? 'block' : 'none';
    previewBtn.style.display = hasContent ? 'block' : 'none';
    
    // Show share button only if both gist URL and HTML content exist
    const hasGistUrl = gistUrlInput.value.trim().length > 0;
    shareBtn.style.display = (hasContent && hasGistUrl) ? 'block' : 'none';
  }
  
  // Function to fetch content from GitHub Gist
  function fetchGistContent(url) {
    fetchStatus.textContent = "Fetching gist...";
    
    // Hide the gist info container while fetching
    gistInfoContainer.style.display = "none";
    
    // Extract the gist ID from URL
    let gistId = null;
    const gistRegex = /gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)/i;
    const match = url.match(gistRegex);
    
    if (match && match[1]) {
      gistId = match[1];
    } else {
      fetchStatus.textContent = "Error: Invalid Gist URL format";
      return;
    }
    
    // Fetch the gist using the GitHub API
    fetch(`https://api.github.com/gists/${gistId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Get the first file from the gist
        const files = Object.values(data.files);
        if (files.length === 0) {
          throw new Error("No files found in this gist");
        }
        
        const fileContent = files[0].content;
        
        // Check if the content looks like HTML
        const isHtml = fileContent.trim().toLowerCase().startsWith('<!doctype html>') || 
                      fileContent.trim().toLowerCase().startsWith('<html') ||
                      (fileContent.includes('<body') && fileContent.includes('</body>'));
        
        if (isHtml) {
          htmlInput.value = fileContent;
          updateButtonVisibility(true);
          fetchStatus.textContent = "HTML content loaded successfully!";
        } else {
          htmlInput.value = fileContent;
          updateButtonVisibility(true);
          fetchStatus.textContent = "Warning: Content loaded but may not be valid HTML.";
        }
        
        // Update share button visibility since gist URL is now filled
        updateButtonVisibility(htmlInput.value.trim().length > 0);
        
        // Try to store the gistUrl
        try {
          localStorage.setItem('savedGistUrl', url);
        } catch (e) {
          console.warn('Failed to save gistUrl to localStorage:', e);
        }
        
        // Save to cookies (for iOS PWA compatibility)
        try {
          document.cookie = `gistUrlCookie=${encodeURIComponent(url)};path=/;max-age=31536000`;
        } catch (e) {
          console.warn('Failed to save to cookies:', e);
        }
        
        // Display gist information if we have author data
        if (data.owner) {
          displayGistInfo(data, files[0].filename);
        }
      })
      .catch(error => {
        console.error("Error fetching gist:", error);
        fetchStatus.textContent = `Error: ${error.message || "Failed to fetch gist content"}`;
      });
  }
  
  // Wait for service worker registration and data retrieval
  Promise.all([getCustomHTML()])
    .then(function(results) {
      const savedData = results[0]; // This contains {html, gistUrl}
      
      // Hide loading UI
      document.getElementById('loadingUI').style.display = 'none';
      
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const urlGistUrl = urlParams.get('gistUrl');
      const isPwaSource = urlParams.get('source') === 'pwa';
      
      // First, determine if we should show the app view
      if (savedData && savedData.html && !window.location.pathname.includes('/edit') && isStandalone) {
        // Display the custom app view if we're in standalone mode and have saved HTML
        document.getElementById('editorUI').style.display = 'none';
        document.getElementById('installUI').style.display = 'none';
        showApp();
        document.title = "Your Custom App";
        document.getElementById('appFrame').srcdoc = savedData.html;
        
        // Also save the gistUrl to cookies if available
        if (savedData.gistUrl) {
          try {
            document.cookie = `gistUrlCookie=${encodeURIComponent(savedData.gistUrl)};path=/;max-age=31536000`;
          } catch (e) {
            console.warn('Failed to save to cookies:', e);
          }
        }
        return; // Exit early
      }
      
      // If we're in standalone mode, show the editor UI
      if (isStandalone) {
        document.getElementById('installUI').style.display = 'none';
        document.getElementById('editorUI').style.display = 'block';
        
        // If there's a gistUrl in URL params, use it
        if (urlGistUrl) {
          gistUrlInput.value = urlGistUrl;
          fetchGistContent(urlGistUrl);
        }
        
        // If there's saved HTML, populate the editor
        if (savedData && savedData.html) {
          htmlInput.value = savedData.html;
          updateButtonVisibility(true);
        }
        
        // If there's a saved gistUrl, populate the input
        if (savedData && savedData.gistUrl) {
          gistUrlInput.value = savedData.gistUrl;
          fetchGistContent(savedData.gistUrl);
        } else {
          // Try to get from cookies
          try {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
              const cookie = cookies[i].trim();
              if (cookie.startsWith('gistUrlCookie=')) {
                const cookieGistUrl = decodeURIComponent(cookie.substring('gistUrlCookie='.length));
                if (cookieGistUrl) {
                  gistUrlInput.value = cookieGistUrl;
                  fetchGistContent(cookieGistUrl);
                  break;
                }
              }
            }
          } catch (e) {
            console.warn('Failed to read from cookies:', e);
          }
        }
      } else {
        // We're not in standalone mode, show the install UI
        document.getElementById('editorUI').style.display = 'none';
        document.getElementById('installUI').style.display = 'block';
        
        // Show platform-specific instructions
        if (iOS) {
          document.getElementById('ios-instructions').style.display = 'block';
          document.getElementById('android-instructions').style.display = 'none';
          document.getElementById('desktop-instructions').style.display = 'none';
        } else if (isAndroid) {
          document.getElementById('ios-instructions').style.display = 'none';
          document.getElementById('android-instructions').style.display = 'block';
          document.getElementById('desktop-instructions').style.display = 'none';
        } else {
          document.getElementById('ios-instructions').style.display = 'none';
          document.getElementById('android-instructions').style.display = 'none';
          document.getElementById('desktop-instructions').style.display = 'block';
        }
        
        // If there's a gistUrl in URL params, show the preview
        if (urlGistUrl) {
          fetchGistPreview(urlGistUrl);
        }
      }
    });

  // Handle fetch button click
  fetchBtn.addEventListener('click', function() {
    const url = gistUrlInput.value.trim();
    if (url) {
      fetchGistContent(url);
    } else {
      fetchStatus.textContent = "Please enter a valid GitHub Gist URL";
      // Hide gist info if URL is empty
      gistInfoContainer.style.display = 'none';
    }
  });

  // Monitor textarea for content to show/hide buttons
  htmlInput.addEventListener('input', function() {
    const hasContent = htmlInput.value.trim().length > 0;
    updateButtonVisibility(hasContent);
  });
  
  // "Launch App": Save to IndexedDB then navigate to the root
  startBtn.addEventListener('click', function() {
    // Special handling for iOS install experience
    if (iOS && !isStandalone && startBtn.textContent === 'Add to Home Screen') {
      // This is handled by the enhanceiOSInstallExperience function
      return;
    }
    
    const htmlCode = htmlInput.value;
    
    // Get the current gistUrl
    const currentGistUrl = gistUrlInput.value.trim();
    
    // For iOS in standalone mode (PWA), we need a different approach
    if (isStandalone) {
      // Save both HTML and gistUrl to IndexedDB
      saveCustomHTML(htmlCode, currentGistUrl).then(function() {
        // In standalone mode (PWA), we'll show the app directly in the current view
        document.getElementById('editorUI').style.display = 'none';
        showApp();
        document.title = "Your Custom App";
        document.getElementById('appFrame').srcdoc = htmlCode;
        
        // Update the URL to reflect we're in app view, but without forcing a page reload
        try {
          window.history.replaceState({}, '', './');
        } catch(e) {
          console.warn('Failed to update history state:', e);
        }
        
        console.log('Switched to app view directly');
      });
    } else {
      // Save both HTML and gistUrl to IndexedDB
      saveCustomHTML(htmlCode, currentGistUrl).then(function() {
        // For non-PWA contexts, use standard navigation
        window.location.href = './';
      });
    }
  });

  // "Clear Code": Clear the textarea and hide buttons
  deleteBtn.addEventListener('click', function() {
    htmlInput.value = '';
    updateButtonVisibility(false);
    
    // Hide gist info container but keep the URL
    gistInfoContainer.style.display = 'none';
    
    // Clear the fetch status text
    fetchStatus.textContent = '';
  });
  
  // "Share App": Copy shareable URL to clipboard
  shareBtn.addEventListener('click', function() {
    const gistUrl = gistUrlInput.value.trim();
    if (gistUrl) {
      // Save to IndexedDB with the current HTML
      const htmlCode = htmlInput.value;
      saveCustomHTML(htmlCode, gistUrl);
      
      // Create the shareable URL with the gistUrl parameter
      const shareableUrl = `${window.location.origin}?gistUrl=${encodeURIComponent(gistUrl)}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareableUrl)
        .then(function() {
          // Show success toast with animation
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(-50%) translateY(100px)';
          
          // Force a reflow to ensure the animation works
          void toast.offsetWidth;
          
          // Show the toast
          toast.style.opacity = '1';
          toast.style.transform = 'translateX(-50%) translateY(0)';
          
          // Highlight the share button to provide additional feedback
          shareBtn.style.backgroundColor = '#27ae60';
          shareBtn.style.transform = 'scale(1.05)';
          shareBtn.style.transition = 'all 0.3s ease';
          
          // Reset the share button after a delay
          setTimeout(function() {
            shareBtn.style.backgroundColor = '';
            shareBtn.style.transform = '';
          }, 1000);
          
          // Hide the toast after a delay
          setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(100px)';
          }, 3000);
        })
        .catch(function(err) {
          console.error('Could not copy text: ', err);
          alert('Failed to copy link to clipboard. Please try again.');
        });
    }
  });
  
  // Function to display gist information
  function displayGistInfo(gistData, filename) {
    // Make sure we have owner information
    if (!gistData.owner || !gistData.owner.avatar_url) {
      console.warn('Missing owner information in gist data');
      return;
    }
    
    // Set the author information
    authorAvatar.src = gistData.owner.avatar_url;
    authorAvatar.alt = `${gistData.owner.login}'s avatar`;
    gistAuthor.textContent = `Created by ${gistData.owner.login}`;
    
    // Set the gist title (use filename if description is empty)
    if (gistData.description && gistData.description.trim() !== "") {
      gistTitle.textContent = gistData.description;
      gistDescription.textContent = `File: ${filename}`;
    } else {
      gistTitle.textContent = filename;
      gistDescription.textContent = "No description provided";
    }
    
    // Show the gist info container
    gistInfoContainer.style.display = "block";
  }

  // Handle preview button click
  previewBtn.addEventListener('click', function() {
    const htmlCode = htmlInput.value;
    previewFrame.srcdoc = htmlCode;
    showPreview();
  });

  // Handle close preview button click
  closePreviewBtn.addEventListener('click', function() {
    hidePreview();
  });

  // Handle escape key to close preview
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && previewView.style.display === 'flex') {
      hidePreview();
    }
  });
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', async function() {
  // Check for existing apps if we're in standalone mode
  if (isStandalone) {
    const hasExistingApps = await checkExistingApps();
    if (hasExistingApps) {
      showExistingAppsWarning();
    } else {
      initializeApp();
    }
  } else {
    initializeApp();
  }
});

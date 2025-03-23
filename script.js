// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
      .then(function(registration) {
        console.log('Service Worker registered successfully with scope:', registration.scope);
      })
      .catch(function(error) {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// --- Query Parameter Persistence ---
function saveQueryParamsToLocalStorage() {
  const urlParams = new URLSearchParams(window.location.search);
  const gistUrl = urlParams.get('gistUrl');
  
  // If there's a gistUrl in the query parameters, save it to localStorage
  if (gistUrl) {
    try {
      localStorage.setItem('savedGistUrl', gistUrl);
      console.log('Saved gistUrl to localStorage:', gistUrl);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  } else {
    console.log('No gistUrl parameter found in URL');
  }
}

function getQueryParamOrSaved(name) {
  // First try to get from URL
  const urlParams = new URLSearchParams(window.location.search);
  const paramValue = urlParams.get(name);
  
  // If parameter exists in URL, return it
  if (paramValue) {
    console.log(`Found ${name} in URL:`, paramValue);
    return paramValue;
  }
  
  // Otherwise, try to get from localStorage
  if (name === 'gistUrl') {
    try {
      const savedValue = localStorage.getItem('savedGistUrl');
      console.log(`Retrieved ${name} from localStorage:`, savedValue);
      return savedValue;
    } catch (error) {
      console.error('Failed to retrieve from localStorage:', error);
    }
  }
  
  console.log(`No ${name} found in URL or localStorage`);
  return null;
}

// Try to access localStorage to check if it's available
try {
  localStorage.setItem('testStorage', 'test');
  localStorage.removeItem('testStorage');
  console.log('localStorage is available');
} catch (error) {
  console.error('localStorage is not available:', error);
}

// Save query parameters as soon as the script runs
saveQueryParamsToLocalStorage();

// --- IndexedDB Helpers ---
function openDatabase() {
  return new Promise(function(resolve, reject) {
    const request = indexedDB.open('pwaGenerator', 2); // Increment version to trigger upgrade
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
        // Return both HTML and gistUrl if available
        if (getRequest.result) {
          // If result has both properties
          if (getRequest.result.html && 'gistUrl' in getRequest.result) {
            resolve({
              html: getRequest.result.html,
              gistUrl: getRequest.result.gistUrl
            });
          } 
          // For backward compatibility with old data format
          else if (typeof getRequest.result.html === 'string') {
            resolve({
              html: getRequest.result.html,
              gistUrl: null
            });
          }
          else {
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
      // Store both HTML and gistUrl
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

// Function to get gistUrl from multiple storage mechanisms
function getPersistedGistUrl() {
  return new Promise(function(resolve) {
    // First try IndexedDB
    getCustomHTML()
      .then(function(data) {
        if (data && data.gistUrl) {
          resolve(data.gistUrl);
          return;
        }
        
        // Then try localStorage
        try {
          const localStorageGistUrl = localStorage.getItem('savedGistUrl');
          if (localStorageGistUrl) {
            resolve(localStorageGistUrl);
            return;
          }
        } catch (e) {
          console.warn('Failed to access localStorage:', e);
        }
        
        // Then try sessionStorage
        try {
          const sessionStorageGistUrl = sessionStorage.getItem('savedGistUrl');
          if (sessionStorageGistUrl) {
            resolve(sessionStorageGistUrl);
            return;
          }
        } catch (e) {
          console.warn('Failed to access sessionStorage:', e);
        }
        
        // Finally try cookies
        try {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('gistUrlCookie=')) {
              const cookieGistUrl = decodeURIComponent(cookie.substring('gistUrlCookie='.length));
              resolve(cookieGistUrl);
              return;
            }
          }
        } catch (e) {
          console.warn('Failed to parse cookies:', e);
        }
        
        // If we get here, we couldn't find a gistUrl
        resolve(null);
      })
      .catch(function(error) {
        console.error('Error in getPersistedGistUrl:', error);
        resolve(null);
      });
  });
}

// Function to save gistUrl to all available storage mechanisms
function persistGistUrl(gistUrl) {
  if (!gistUrl) return;
  
  // Save to localStorage
  try {
    localStorage.setItem('savedGistUrl', gistUrl);
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
  
  // Save to sessionStorage
  try {
    sessionStorage.setItem('savedGistUrl', gistUrl);
  } catch (e) {
    console.warn('Failed to save to sessionStorage:', e);
  }
  
  // Save to cookies (for iOS PWA compatibility)
  try {
    document.cookie = `gistUrlCookie=${encodeURIComponent(gistUrl)};path=/;max-age=31536000`;
  } catch (e) {
    console.warn('Failed to save to cookies:', e);
  }
}

// --- Function to parse URL parameters ---
function getQueryParam(name) {
  // This legacy function is kept for backward compatibility
  // but we'll use getQueryParamOrSaved instead for new code
  return getQueryParamOrSaved(name);
}

// --- Function to sanitize Gist URL from script tags or other formats ---
function sanitizeGistUrl(url) {
  // Check if it's a script tag
  const scriptTagRegex = /<script\s+src="(https:\/\/gist\.github\.com\/[^"]+\.js)"/i;
  const scriptMatch = url.match(scriptTagRegex);
  if (scriptMatch && scriptMatch[1]) {
    // Convert from JS URL to web URL
    return scriptMatch[1].replace(/\.js$/, '');
  }
  
  // Check if it's a JS direct URL
  if (url.endsWith('.js') && url.includes('gist.github.com')) {
    return url.replace(/\.js$/, '');
  }
  
  return url;
}

// --- Request Persistent Storage ---
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(function(granted) {
    console.log("Persistent storage granted:", granted);
  });
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', function() {
  // Try to save query parameters again when DOM is fully loaded
  saveQueryParamsToLocalStorage();
  
  // Show loading indicator initially
  document.getElementById('loadingUI').style.display = 'flex';
  document.getElementById('editorUI').style.display = 'none';
  document.getElementById('appView').style.display = 'none';
  
  // Get DOM elements
  const htmlInput = document.getElementById('htmlInput');
  const startBtn = document.getElementById('startBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const shareBtn = document.getElementById('shareBtn');
  const gistUrlInput = document.getElementById('gistUrl');
  const fetchBtn = document.getElementById('fetchBtn');
  const fetchStatus = document.getElementById('fetchStatus');
  const toast = document.getElementById('toast');
  
  // Check if we're in standalone mode or a valid PWA state
  let isPWA = false;
  if (
    window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone || 
    document.referrer.includes('android-app://')
  ) {
    console.log('This is running as installed PWA');
    isPWA = true;
  }
  
  // Handle shared link on subdomain access
  const currentHost = window.location.hostname;
  const isDirectSubdomainAccess = currentHost.split('.').length > 2 && !currentHost.startsWith('www.');
  
  // If we're on a subdomain via direct access (shared link)
  if (isDirectSubdomainAccess && !isPWA) {
    console.log('Direct subdomain access via shared link - prioritizing installation');
    
    // Focus on making the install button visible
    setTimeout(function() {
      if (startBtn) {
        startBtn.style.display = 'block';
        startBtn.textContent = "Install as App";
        startBtn.setAttribute('aria-label', 'Install this app for the best experience');
        startBtn.style.backgroundColor = '#ff5722';
        startBtn.style.fontWeight = 'bold';
      }
    }, 1000);
  }
  
  // Special handling for PWA mode with source=pwa parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (isPWA && urlParams.get('source') === 'pwa') {
    console.log('PWA in subdomain edit mode');
    isEditingMode = true;
    
    // If the PWA is launched with a new gistUrl, save it
    if (urlParams.has('gistUrl')) {
      localStorage.setItem('gistUrl', urlParams.get('gistUrl'));
    }
  }
  
  // Detect if user is on mobile device
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Detect browser type
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Listen for the beforeinstallprompt event
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    console.log('Install prompt detected and ready for use');
    
    // Update UI to show the install button
    if (startBtn) {
      startBtn.style.display = 'block';
      
      // Check if we're on a subdomain via direct access
      const hostname = window.location.hostname;
      const isDirectSubdomainAccess = hostname.split('.').length > 2 && !hostname.startsWith('www.');
      
      if (isDirectSubdomainAccess) {
        // Enhance the button for subdomain installs
        startBtn.textContent = "Install as App";
        startBtn.setAttribute('aria-label', 'Install this app for the best experience');
        startBtn.style.backgroundColor = '#ff5722';
        startBtn.style.fontWeight = 'bold';
        
        // Auto-prompt on subdomain after a small delay
        setTimeout(function() {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            
            // Log the user's choice
            deferredPrompt.userChoice.then(function(choiceResult) {
              if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                startBtn.textContent = "Launch App";
                startBtn.setAttribute('aria-label', 'Launch your app');
                startBtn.style.backgroundColor = '';
                startBtn.style.fontWeight = '';
              } else {
                console.log('User dismissed the install prompt');
              }
              deferredPrompt = null;
            });
          }
        }, 3000);
      } else {
        // Normal behavior for non-subdomain access
        startBtn.textContent = "Add to Homescreen";
        startBtn.setAttribute('aria-label', 'Add this app to your homescreen');
      }
    }
  });
  
  // Handle app installed event
  window.addEventListener('appinstalled', (evt) => {
    console.log('App was installed to homescreen');
    deferredPrompt = null;
    
    // Update UI
    if (startBtn && startBtn.textContent === "Add to Homescreen") {
      startBtn.textContent = "Launch App";
      startBtn.setAttribute('aria-label', 'Launch your HTML app');
    }
  });
  
  // For iOS Safari which doesn't support beforeinstallprompt
  if ((isIOS || isSafari) && !isPWA && startBtn) {
    startBtn.textContent = "Add to Homescreen";
    startBtn.setAttribute('aria-label', 'Add this app to your homescreen');
  }
  
  // If no installation prompt is available on non-Safari browsers, show Launch App
  if (startBtn && (!deferredPrompt && !isSafari && !isIOS) || isMobileDevice) {
    startBtn.textContent = "Launch App";
    startBtn.setAttribute('aria-label', 'Launch your HTML app');
  }
  
  // Gist info elements
  const gistInfoContainer = document.getElementById('gistInfoContainer');
  const authorAvatar = document.getElementById('authorAvatar');
  const gistTitle = document.getElementById('gistTitle');
  const gistAuthor = document.getElementById('gistAuthor');
  const gistDescription = document.getElementById('gistDescription');
  
  // Check if we're in edit mode (specifically on subdomain.html)
  // This should only happen on subdomains due to NGINX routing
  const isEditMode = window.location.pathname.includes('/subdomain.html');
  
  // Function to show/hide buttons based on whether there's code
  function updateButtonVisibility(hasContent) {
    startBtn.style.display = hasContent ? 'block' : 'none';
    deleteBtn.style.display = hasContent ? 'block' : 'none';
    
    // Show share button only if both gist URL and HTML content exist
    const hasGistUrl = gistUrlInput.value.trim().length > 0;
    shareBtn.style.display = (hasContent && hasGistUrl) ? 'block' : 'none';
  }
  
  // Function to display gist information
  function displayGistInfo(gistData, filename) {
    // Set the author information
    authorAvatar.src = gistData.owner.avatar_url;
    gistAuthor.textContent = `Created by ${gistData.owner.login}`;
    
    // Set the gist title (use filename if description is empty)
    if (gistData.description && gistData.description.trim() !== "") {
      gistTitle.textContent = gistData.description;
      gistDescription.textContent = `File: ${filename}`;
    } else {
      gistTitle.textContent = filename;
      gistDescription.textContent = "No description provided";
    }
    
    // Calculate time since creation
    const createdDate = new Date(gistData.created_at);
    const now = new Date();
    const timeDiff = now - createdDate;
    
    // Format the time difference
    let timeAgo;
    const seconds = Math.floor(timeDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      timeAgo = `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (hours > 0) {
      timeAgo = `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (minutes > 0) {
      timeAgo = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      timeAgo = `${seconds} ${seconds === 1 ? 'second' : 'seconds'} ago`;
    }
    
    // Add time ago to author info
    gistAuthor.textContent += ` • ${timeAgo}`;
    
    // Show the gist info container
    gistInfoContainer.style.display = "block";
  }
  
  // Function to fetch content from GitHub Gist
  function fetchGistContent(url) {
    fetchStatus.textContent = "Fetching gist...";
    
    // Sanitize the URL if it's a script tag
    const sanitizedUrl = sanitizeGistUrl(url);
    if (sanitizedUrl !== url) {
      // Update the input field with the sanitized URL
      gistUrlInput.value = sanitizedUrl;
      url = sanitizedUrl;
    }
    
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
        
        // Display gist information
        displayGistInfo(data, files[0].filename);
        
        // Save the gistUrl to all storage mechanisms
        persistGistUrl(gistUrlInput.value.trim());
      })
      .catch(error => {
        console.error("Error fetching gist:", error);
        fetchStatus.textContent = `Error: ${error.message || "Failed to fetch gist content"}`;
      });
  }
  
  // Wait for both service worker registration and data retrieval
  Promise.all([Promise.resolve(), getCustomHTML()])
    .then(function(results) {
      const savedData = results[1]; // This contains {html, gistUrl}
      
      // Hide loading UI
      document.getElementById('loadingUI').style.display = 'none';
      
      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const urlGistUrl = urlParams.get('gistUrl');
      const isPwaSource = urlParams.get('source') === 'pwa';
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      
      // CASE 1: If we have a gistUrl in URL and we're not in a PWA context, 
      // always show the editor UI first (this is the shared link case)
      if (urlGistUrl && !isPwaSource && !isStandalone) {
        // Show the editor UI
        document.getElementById('editorUI').style.display = 'block';
        document.getElementById('gistUrl').value = urlGistUrl;
        fetchGistContent(urlGistUrl);
        
        // Save this to all mechanisms for future use
        persistGistUrl(urlGistUrl);
        
        return; // Exit early
      }
      
      // CASE 2: If we have saved HTML and we're not in edit mode, display the app
      if (savedData && savedData.html && !isEditMode) {
        // Display the custom app view
        document.getElementById('editorUI').style.display = 'none';
        document.getElementById('appView').style.display = 'block';
        
        // Hide the GitHub corner when showing the app
        const githubBanner = document.getElementById('githubBanner');
        if (githubBanner) {
          githubBanner.style.display = 'none';
        }
        
        document.title = "Your Custom App";
        document.getElementById('appFrame').srcdoc = savedData.html;
        
        // Also save the gistUrl to all storage mechanisms if available
        if (savedData.gistUrl) {
          persistGistUrl(savedData.gistUrl);
        }
      } else {
        // CASE 3: Show the editor UI for all other cases
        document.getElementById('editorUI').style.display = 'block';
        
        // If there's saved HTML, populate the editor
        if (savedData && savedData.html) {
          document.getElementById('htmlInput').value = savedData.html;
        }
        
        // Handle gistUrl in this order of priority:
        // 1. URL parameter
        // 2. Saved in IndexedDB
        // 3. Other storage mechanisms via getPersistedGistUrl()
        
        if (urlGistUrl) {
          // First priority: URL parameter
          document.getElementById('gistUrl').value = urlGistUrl;
          fetchGistContent(urlGistUrl);
          
          // Save this to all mechanisms for future use
          persistGistUrl(urlGistUrl);
        } else if (savedData && savedData.gistUrl) {
          // Second priority: IndexedDB
          document.getElementById('gistUrl').value = savedData.gistUrl;
          fetchGistContent(savedData.gistUrl);
        } else {
          // Third priority: Check other storage mechanisms
          getPersistedGistUrl().then(function(persistedGistUrl) {
            if (persistedGistUrl) {
              document.getElementById('gistUrl').value = persistedGistUrl;
              fetchGistContent(persistedGistUrl);
            }
          });
        }
        
        // Update button visibility based on content
        updateButtonVisibility(document.getElementById('htmlInput').value.trim().length > 0);
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
  
  // Monitor gistUrl input for content to update share button visibility
  gistUrlInput.addEventListener('input', function() {
    const hasContent = htmlInput.value.trim().length > 0;
    updateButtonVisibility(hasContent);
    
    // Hide gist info when URL is changed or cleared
    if (gistUrlInput.value.trim() === '') {
      gistInfoContainer.style.display = 'none';
    }
  });
  
  // Add blur event to sanitize Gist URL when the input loses focus
  gistUrlInput.addEventListener('blur', function() {
    const url = gistUrlInput.value.trim();
    if (url) {
      const sanitizedUrl = sanitizeGistUrl(url);
      if (sanitizedUrl !== url) {
        gistUrlInput.value = sanitizedUrl;
      }
    }
  });

  // Handle click on "Add to Homescreen" or "Launch App" button
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      // Always save the current gist URL
      const currentGistUrl = gistUrlInput.value.trim();
      localStorage.setItem('gistUrl', currentGistUrl);
      
      // Check if the button is in install or launch mode
      if (startBtn.textContent === "Add to Homescreen") {
        if (deferredPrompt) {
          // Show the install prompt
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function(choiceResult) {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted the install prompt');
              startBtn.textContent = "Launch App";
              startBtn.setAttribute('aria-label', 'Launch the installed app');
              // Launch the app once installed
              setTimeout(launchApp, 1000);
            }
            deferredPrompt = null;
          });
        } else if (isIOS || isSafari) {
          // For iOS/Safari, show custom install instructions
          alert('To install this app: tap the share icon, then "Add to Home Screen"');
          launchApp();
        }
      } else {
        // Launch App mode
        launchApp();
      }
    });
  }

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
      // Save to all storage mechanisms
      persistGistUrl(gistUrl);
      
      // Make sure it's also in the IndexedDB with the current HTML
      const htmlCode = htmlInput.value;
      saveCustomHTML(htmlCode, gistUrl);
      
      // Create the shareable URL with the gistUrl parameter
      const currentUrl = window.location.href.split('?')[0]; // Remove any existing query parameters
      const shareableUrl = `${currentUrl}?gistUrl=${encodeURIComponent(gistUrl)}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareableUrl)
        .then(function() {
          // Show success toast
          toast.classList.add('visible');
          setTimeout(function() {
            toast.classList.remove('visible');
          }, 3000);
        })
        .catch(function(err) {
          console.error('Could not copy text: ', err);
          alert('Failed to copy link to clipboard. Please try again.');
        });
    }
  });
  
  // Special handling for iOS in standalone mode (PWA)
  window.addEventListener('load', function() {
    // Check if we're in standalone mode and on subdomain.html with a source=pwa parameter
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const urlParams = new URLSearchParams(window.location.search);
    const isPwaSource = urlParams.get('source') === 'pwa';
    const isSubdomainPage = window.location.pathname.includes('/subdomain.html');
    
    if (isStandalone && isPwaSource && isSubdomainPage) {
      console.log('PWA in subdomain edit mode - checking for gistUrl');
      
      // Check if we already have a gistUrl in the URL
      const urlGistUrl = urlParams.get('gistUrl');
      
      if (!urlGistUrl) {
        // No gistUrl in URL, try to restore from storage
        getPersistedGistUrl().then(function(persistedGistUrl) {
          if (persistedGistUrl) {
            console.log('Found persisted gistUrl:', persistedGistUrl);
            
            // Set the input field
            document.getElementById('gistUrl').value = persistedGistUrl;
            
            // Fetch the content
            fetchGistContent(persistedGistUrl);
            
            // Update the URL without reloading (important for iOS)
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('gistUrl', persistedGistUrl);
            window.history.replaceState({}, '', newUrl);
          }
        });
      }
    }
  });
});

// Function to launch the app
function launchApp() {
  // Logic to either launch or guide the user based on environment
  const gistUrl = localStorage.getItem('gistUrl');
  
  if (isMobileDevice) {
    if (isPWA) {
      // Already in standalone mode, just continue
      if (gistUrl) {
        window.location.href = `/subdomain.html?source=pwa&gistUrl=${encodeURIComponent(gistUrl)}`;
      } else {
        alert('No gist URL found. Please save a gist first.');
      }
    } else {
      // Not in standalone, guide user to add to homescreen
      if (isIOS || isSafari) {
        alert('To install: tap the share icon, then "Add to Home Screen"');
      } else {
        alert('Install this app from your browser menu for the best experience');
      }
    }
  } else {
    // Desktop behavior - open in a new tab
    if (gistUrl) {
      window.open(`/subdomain.html?source=pwa&gistUrl=${encodeURIComponent(gistUrl)}`, '_blank');
    } else {
      alert('No gist URL found. Please save a gist first.');
    }
  }
}

// --- Special handling for direct subdomain access ---
(function() {
  // Check if we're on a subdomain
  const hostname = window.location.hostname;
  const isSubdomain = hostname.split('.').length > 2 && !hostname.startsWith('www.');
  
  // If we're on a subdomain and not in standalone mode, trigger installation flow
  if (isSubdomain) {
    console.log('Direct subdomain access detected - optimizing for installation');
    // We'll prioritize PWA installation for subdomain links
  }
})(); 
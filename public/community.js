// FILE: public/community.js
import { auth } from "./Login Page/auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// TIDAK ADA IMPORT FIRESTORE LAGI

// DOM elements
const postInput = document.getElementById('community-post-input');
const postBtn = document.getElementById('community-post-btn');
const postsContainer = document.getElementById('community-posts-list');

let currentUser = null;

// Helper: Get Token
async function getToken() {
    if (auth.currentUser) return await auth.currentUser.getIdToken();
    return null;
}

// Track auth state
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if(postBtn) {
        postBtn.disabled = !user;
        postBtn.title = user ? 'Post to community' : 'Log in to post';
    }
    // Load posts saat login status berubah (atau saat halaman dibuka)
    loadPosts();
});

// 1. FUNGSI LOAD POSTS (Ganti setupPostsListener)
async function loadPosts() {
    if(!postsContainer) return;
    postsContainer.innerHTML = '<p style="text-align:center; color:gray;">Loading posts...</p>';
    
    try {
        // Method GET ke API (Bisa diakses tanpa login jika diatur di API, 
        // tapi di API tadi kita set boleh public utk GET atau harus login tergantung kebutuhan.
        // Di sini kita coba kirim token jika ada usernya)
        const token = await getToken();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch('/api/community', { headers });
        
        if (!response.ok) throw new Error("Gagal mengambil data posts");
        
        const posts = await response.json();
        
        postsContainer.innerHTML = '';
        if(posts.length === 0) {
            postsContainer.innerHTML = '<p style="opacity:0.7">No posts yet — be the first to share!</p>';
            return;
        }
        
        posts.forEach(post => {
            renderPost(post);
        });

    } catch (err) {
        console.error('Error loading posts:', err);
        postsContainer.innerHTML = '<p style="color: red;">Error loading posts. Please try again.</p>';
    }
}

// 2. FUNGSI RENDER POST (UI Logic - Hampir sama dengan sebelumnya)
function renderPost(post) {
    const postEl = document.createElement('div');
    postEl.className = 'post-item';
    
    // Avatar
    const avatarEl = document.createElement('div');
    avatarEl.className = 'post-avatar';
    if(post.userAvatarUrl) {
        const img = document.createElement('img');
        img.src = post.userAvatarUrl;
        img.alt = post.userName;
        avatarEl.appendChild(img);
    } else {
        const initials = (post.userName || 'A').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase();
        avatarEl.textContent = initials;
    }
    
    // Content
    const contentEl = document.createElement('div');
    contentEl.className = 'post-content';
    
    // Header
    const headerEl = document.createElement('div');
    headerEl.className = 'post-header';
    
    const nameEl = document.createElement('span');
    nameEl.className = 'post-name';
    nameEl.textContent = post.userName || 'Anonymous';
    
    const timeEl = document.createElement('span');
    timeEl.className = 'post-time';
    if(post.timestamp) {
        // API mengembalikan ISO string, jadi langsung new Date()
        const date = new Date(post.timestamp); 
        timeEl.textContent = date.toLocaleString();
    }
    
    headerEl.appendChild(nameEl);
    headerEl.appendChild(timeEl);
    
    // Text
    const textEl = document.createElement('p');
    textEl.className = 'post-text';
    textEl.textContent = post.postContent || '';
    
    // Actions (Delete)
    const actionsEl = document.createElement('div');
    actionsEl.className = 'post-actions';
    
    // Cek kepemilikan lokal (currentUser vs post.userId)
    if(currentUser && post.userId === currentUser.uid) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'post-delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deletePost(post.id); // Panggil fungsi API delete
        actionsEl.appendChild(deleteBtn);
    }
    
    contentEl.appendChild(headerEl);
    contentEl.appendChild(textEl);
    contentEl.appendChild(actionsEl);
    
    postEl.appendChild(avatarEl);
    postEl.appendChild(contentEl);
    postsContainer.appendChild(postEl);
}

// 3. FUNGSI ADD POST (Fetch POST)
async function addPost() {
    const text = postInput.value.trim();
    if(!text) { alert('Please enter text'); return; }
    if(!currentUser) { alert('Please log in'); return; }
    
    postBtn.disabled = true;
    
    try {
        const token = await getToken();
        const response = await fetch('/api/community', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                postContent: text,
                userName: currentUser.displayName || currentUser.email.split('@')[0],
                userAvatarUrl: currentUser.photoURL // Jika user punya foto profil
            })
        });

        if(!response.ok) throw new Error("Gagal mengirim post");

        postInput.value = '';
        // Reload manual karena tidak ada real-time listener lagi
        loadPosts(); 

    } catch(err) {
        console.error('Error posting:', err);
        alert('Failed to post');
    } finally {
        postBtn.disabled = false;
    }
}

// 4. FUNGSI DELETE POST (Fetch DELETE)
async function deletePost(postId) {
    if(!currentUser) return;
    if(!confirm("Are you sure you want to delete this post?")) return;

    try {
        const token = await getToken();
        const response = await fetch(`/api/community?id=${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if(!response.ok) throw new Error("Gagal menghapus post");

        // Reload setelah delete berhasil
        loadPosts();

    } catch(err) {
        console.error('Error deleting:', err);
        alert('Failed to delete post');
    }
}

// Event Listeners
if(postBtn) postBtn.addEventListener('click', addPost);

if(postInput) {
    postInput.addEventListener('keydown', (e) => {
        if((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            addPost();
        }
    });
}
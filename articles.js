// GitHub API configuration
const GITHUB_TOKEN = "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";
const REPO_OWNER = "competidora-cmd";
const REPO_NAME = "magazine";
const API_BASE = "https://api.github.com";

class ArticlesAPI {
    constructor() {
        this.headers = {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        };
    }

    async getArticles() {
        try {
            const response = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/users_data.json`, {
                headers: this.headers
            });
            
            if (!response.ok) throw new Error('Failed to fetch articles');
            
            const data = await response.json();
            const content = JSON.parse(atob(data.content));
            return content.articles || [];
        } catch (error) {
            console.error('Error fetching articles:', error);
            return [];
        }
    }

    async createArticle(articleData) {
        try {
            // Get current content
            const response = await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/users_data.json`, {
                headers: this.headers
            });
            
            const data = await response.json();
            const content = JSON.parse(atob(data.content));
            
            // Create new article
            const newArticle = {
                id: Date.now(),
                ...articleData,
                created_at: new Date().toISOString()
            };
            
            // Upload images first
            if (articleData.images && articleData.images.length > 0) {
                const imageUrls = await Promise.all(articleData.images.map(image => 
                    this.uploadImage(image, newArticle.id)
                ));
                newArticle.imageUrls = imageUrls;
            }
            
            // Add article to content
            content.articles = content.articles || [];
            content.articles.push(newArticle);
            
            // Update users_data.json
            await fetch(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/users_data.json`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify({
                    message: `Add article ${newArticle.id}`,
                    content: btoa(JSON.stringify(content, null, 2)),
                    sha: data.sha,
                    branch: 'main'
                })
            });
            
            return { success: true, article: newArticle };
        } catch (error) {
            console.error('Error creating article:', error);
            return { success: false, error: error.message };
        }
    }

    async uploadImage(imageFile, articleId) {
        try {
            const base64Content = await this.fileToBase64(imageFile);
            const fileName = `${articleId}_${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            
            const response = await fetch(
                `${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/images/${fileName}`,
                {
                    method: 'PUT',
                    headers: this.headers,
                    body: JSON.stringify({
                        message: `Upload image for article ${articleId}`,
                        content: base64Content,
                        branch: 'main'
                    })
                }
            );
            
            if (!response.ok) throw new Error('Failed to upload image');
            
            const data = await response.json();
            return data.content.download_url;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    }

    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = error => reject(error);
        });
    }
}

// Export for use in other files
window.ArticlesAPI = ArticlesAPI; 

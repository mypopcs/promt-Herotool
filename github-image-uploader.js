class GitHubImageUploader {
  constructor(config) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.token = config.token;
    this.path = config.path || "";
    this.baseUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents`;
  }

  async uploadImage(file, filename) {
    try {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const base64 = e.target.result;
            const content = base64.split(',')[1];
            const path = this.path ? `${this.path}/${filename}` : filename;
            
            const response = await fetch(`${this.baseUrl}/${path}`, {
              method: 'PUT',
              headers: {
                'Authorization': `token ${this.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `Upload ${filename}`,
                content: content,
              }),
            });

            const data = await response.json();
            
            if (response.ok) {
              resolve({
                url: data.content.download_url,
                path: data.content.path,
                sha: data.content.sha,
              });
            } else {
              reject(new Error(data.message || '上传失败'));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (error) {
      throw new Error(`上传图片失败: ${error.message}`);
    }
  }

  async deleteImage(path) {
    try {
      const response = await fetch(`${this.baseUrl}/${path}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${this.token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '获取文件信息失败');
      }

      const deleteResponse = await fetch(`${this.baseUrl}/${path}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Delete ${path}`,
          sha: data.sha,
        }),
      });

      if (deleteResponse.ok) {
        return true;
      } else {
        const deleteData = await deleteResponse.json();
        throw new Error(deleteData.message || '删除失败');
      }
    } catch (error) {
      throw new Error(`删除图片失败: ${error.message}`);
    }
  }

  async getImageInfo(path) {
    try {
      const response = await fetch(`${this.baseUrl}/${path}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${this.token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return {
          url: data.download_url,
          path: data.content.path,
          sha: data.content.sha,
        };
      } else {
        throw new Error(data.message || '获取文件信息失败');
      }
    } catch (error) {
      throw new Error(`获取图片信息失败: ${error.message}`);
    }
  }

  async listImages() {
    try {
      const path = this.path || '';
      const response = await fetch(`${this.baseUrl}/${path}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${this.token}`,
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        const files = Array.isArray(data) ? data : [];
        return files
          .filter(file => file.type === 'file' && this.isImageFile(file.name))
          .map(file => ({
            name: file.name,
            url: file.download_url,
            path: file.path,
            sha: file.sha,
            size: file.size,
          }));
      } else {
        throw new Error(data.message || '获取文件列表失败');
      }
    } catch (error) {
      throw new Error(`获取图片列表失败: ${error.message}`);
    }
  }

  isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${this.token}`,
        },
      });

      if (response.ok) {
        return { success: true, message: '连接成功' };
      } else {
        const data = await response.json();
        return { success: false, message: data.message || '连接失败' };
      }
    } catch (error) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubImageUploader;
}

/**
 * GitHub Gist 数据同步模块
 * 实现手机/电脑跨设备数据同步
 *
 * 原理：
 * - 数据存储在私有 GitHub Gist 中
 * - 页面加载时自动从 Gist 拉取最新数据
 * - 任何数据变更后自动推送到 Gist
 * - 使用 Personal Access Token (仅 gist 权限) 认证
 */

const Sync = {
  CONFIG_KEY: 'hongyi_sync_config',

  // ===== 配置管理 =====
  getConfig() {
    try {
      const raw = localStorage.getItem(this.CONFIG_KEY);
      return raw ? JSON.parse(raw) : { token: '', gistId: '', lastSync: null };
    } catch {
      return { token: '', gistId: '', lastSync: null };
    }
  },

  saveConfig(config) {
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
  },

  isConfigured() {
    const cfg = this.getConfig();
    return !!(cfg.token && cfg.gistId);
  },

  // ===== 初始化：创建 Gist =====
  async setup(token) {
    if (!token || token.length < 10) {
      throw new Error('请输入有效的 GitHub Token');
    }

    // 先验证 token 是否有效
    const userResp = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}` },
    });

    if (!userResp.ok) {
      if (userResp.status === 401) {
        throw new Error('Token 无效，请检查后重试');
      }
      throw new Error(`验证失败 (${userResp.status})，请检查网络连接`);
    }

    const userData = await userResp.json();
    const username = userData.login;

    // 创建私有 Gist
    const state = Store.load();
    const resp = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: '弘毅暑期打卡奖励系统 - 数据同步',
        public: false,
        files: {
          'checkin-data.json': {
            content: JSON.stringify(state, null, 2),
          },
        },
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      if (resp.status === 401) {
        throw new Error('Token 权限不足，请确保已勾选 "gist" 权限');
      }
      throw new Error(`创建失败 (${resp.status}): ${errData.message || '未知错误'}`);
    }

    const data = await resp.json();
    this.saveConfig({
      token,
      gistId: data.id,
      username,
      lastSync: new Date().toISOString(),
    });

    return { gistId: data.id, username };
  },

  // ===== 拉取远程数据 =====
  async pull() {
    const cfg = this.getConfig();
    if (!cfg.token || !cfg.gistId) return { success: false, msg: '未配置同步' };

    try {
      const resp = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        headers: {
          'Authorization': `token ${cfg.token}`,
          'Cache-Control': 'no-cache',
        },
      });

      if (!resp.ok) {
        if (resp.status === 404) {
          return { success: false, msg: 'Gist 不存在，请重新连接' };
        }
        if (resp.status === 401) {
          return { success: false, msg: 'Token 已失效，请重新设置' };
        }
        return { success: false, msg: `拉取失败 (${resp.status})` };
      }

      const data = await resp.json();
      const file = data.files['checkin-data.json'];
      if (!file || !file.content) {
        return { success: false, msg: '数据文件不存在' };
      }

      const remoteState = JSON.parse(file.content);
      const localState = Store.load();

      // 合并策略：以远程为准，保留本地不在远程中的自定义任务
      // （简单策略：直接覆盖，因为 Gist 始终是最新的）
      localStorage.setItem(Store.STORAGE_KEY, JSON.stringify(remoteState));

      cfg.lastSync = new Date().toISOString();
      this.saveConfig(cfg);

      return { success: true, msg: '数据已同步' };
    } catch (e) {
      console.error('Sync pull error:', e);
      return { success: false, msg: '网络错误，请检查连接' };
    }
  },

  // ===== 推送本地数据 =====
  async push() {
    const cfg = this.getConfig();
    if (!cfg.token || !cfg.gistId) return { success: false, msg: '未配置同步' };

    try {
      const state = Store.load();
      const resp = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${cfg.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'checkin-data.json': {
              content: JSON.stringify(state, null, 2),
            },
          },
        }),
      });

      if (!resp.ok) {
        if (resp.status === 404) {
          return { success: false, msg: 'Gist 已删除，请重新连接' };
        }
        if (resp.status === 401) {
          return { success: false, msg: 'Token 已失效' };
        }
        return { success: false, msg: `同步失败 (${resp.status})` };
      }

      cfg.lastSync = new Date().toISOString();
      this.saveConfig(cfg);

      return { success: true, msg: '同步成功' };
    } catch (e) {
      console.error('Sync push error:', e);
      return { success: false, msg: '网络错误' };
    }
  },

  // ===== 断开同步 =====
  disconnect() {
    // 只清除配置，不删除 Gist（数据安全）
    localStorage.removeItem(this.CONFIG_KEY);
  },

  // ===== 格式化最后同步时间 =====
  getLastSyncText() {
    const cfg = this.getConfig();
    if (!cfg.lastSync) return '从未同步';
    const d = new Date(cfg.lastSync);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },
};

if (typeof window !== 'undefined') {
  window.Sync = Sync;
}

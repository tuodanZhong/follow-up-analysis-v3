class DatabaseService {
    constructor() {
        this.baseUrl = window.location.origin;
        this.data = null;
        this.lastUpdate = null;
        this.fromCache = false;
    }

    // 检查缓存状态
    async checkCacheStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/api/cache-status`);
            if (response.ok) {
                const result = await response.json();
                return result.cache;
            }
        } catch (error) {
            console.warn('检查缓存状态失败:', error);
        }
        return { exists: false, isExpired: true };
    }

    // 加载缓存数据
    async loadCachedData(onProgress) {
        try {
            onProgress(20, '检查服务端缓存...');
            const response = await fetch(`${this.baseUrl}/api/cached-data`);

            if (response.ok) {
                onProgress(60, '加载缓存数据中...');
                const result = await response.json();

                if (result.success) {
                    onProgress(80, '处理缓存数据...');
                    this.data = result.data;
                    this.lastUpdate = result.timestamp;
                    this.dateRange = result.dateRange;
                    this.fromCache = true;

                    onProgress(100, '缓存数据加载完成');
                    return this.data;
                }
            }
        } catch (error) {
            console.warn('加载缓存数据失败:', error);
        }
        return null;
    }

    // 强制刷新数据
    async refreshData(onProgress) {
        try {
            onProgress(10, '连接数据库中...');

            const response = await fetch(`${this.baseUrl}/api/refresh-cache`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            onProgress(60, '处理数据中...');
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            onProgress(80, '数据分析中...');
            this.data = result.data;
            this.lastUpdate = result.timestamp;
            this.dateRange = result.dateRange;
            this.fromCache = false;

            this.saveToLocalStorage();
            onProgress(100, '数据刷新完成');

            return this.data;

        } catch (error) {
            console.error('数据刷新失败:', error);
            throw new Error(`数据刷新失败: ${error.message}`);
        }
    }

    // 智能数据提取 - 缓存优先
    async extractData(onProgress, forceRefresh = false) {
        try {
            if (!forceRefresh) {
                // 优先尝试加载缓存数据
                onProgress(5, '检查服务端缓存...');
                const cacheStatus = await this.checkCacheStatus();

                if (cacheStatus.exists && !cacheStatus.isExpired) {
                    console.log('使用服务端缓存数据');
                    const cachedData = await this.loadCachedData(onProgress);
                    if (cachedData) {
                        return cachedData;
                    }
                }

                if (cacheStatus.exists && cacheStatus.isExpired) {
                    console.log('缓存已过期，提示用户刷新');
                    onProgress(10, `缓存已过期 (${cacheStatus.ageHours}小时前)，建议刷新数据`);
                    await this.simulateDelay(2000);
                }
            }

            // 缓存不存在或已过期，执行刷新
            console.log('执行数据刷新');
            return await this.refreshData(onProgress);

        } catch (error) {
            console.error('数据提取失败:', error);
            throw new Error(`数据提取失败: ${error.message}`);
        }
    }

    simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    saveToLocalStorage() {
        try {
            const limitedData = this.data ? this.data.slice(0, 1000) : null;

            const dataToSave = {
                data: limitedData,
                lastUpdate: this.lastUpdate,
                timestamp: new Date().toISOString(),
                totalCount: this.data ? this.data.length : 0,
                dateRange: this.dateRange
            };

            const jsonString = JSON.stringify(dataToSave);
            const sizeInMB = new Blob([jsonString]).size / 1024 / 1024;

            if (sizeInMB > 4) {
                console.warn('数据量过大，只保存前500条记录');
                dataToSave.data = this.data ? this.data.slice(0, 500) : null;
            }

            localStorage.setItem('analysisData', JSON.stringify(dataToSave));
            console.log(`数据已保存到本地存储 (${sizeInMB.toFixed(2)}MB)`);

        } catch (error) {
            console.error('保存到本地存储失败:', error);
            try {
                localStorage.removeItem('analysisData');
                const summaryData = {
                    lastUpdate: this.lastUpdate,
                    timestamp: new Date().toISOString(),
                    totalCount: this.data ? this.data.length : 0,
                    summary: '数据量过大，仅保存统计信息'
                };
                localStorage.setItem('analysisData', JSON.stringify(summaryData));
            } catch (e) {
                console.error('无法保存任何数据到本地存储');
            }
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('analysisData');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data = parsed.data;
                this.lastUpdate = parsed.lastUpdate;
                this.dateRange = parsed.dateRange;

                if (parsed.summary) {
                    console.log('加载的是摘要数据:', parsed.summary);
                } else if (parsed.totalCount && parsed.data) {
                    console.log(`加载了 ${parsed.data.length}/${parsed.totalCount} 条记录`);
                }
                return true;
            }
        } catch (error) {
            console.error('加载本地数据失败:', error);
            localStorage.removeItem('analysisData');
        }
        return false;
    }

    getData() {
        return this.data;
    }

    getLastUpdate() {
        return this.lastUpdate;
    }

    hasData() {
        return this.data && this.data.length > 0;
    }

    getDateRange() {
        return this.dateRange;
    }

    isFromCache() {
        return this.fromCache;
    }
}
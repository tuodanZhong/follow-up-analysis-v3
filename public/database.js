class DatabaseService {
    constructor() {
        this.baseUrl = window.location.origin;
        this.data = null;
        this.lastUpdate = null;
    }

    async extractData(onProgress) {
        try {
            onProgress(10, '连接数据库中...');

            await this.simulateDelay(1000);
            onProgress(30, '执行SQL查询中...');

            const response = await fetch(`${this.baseUrl}/api/data`);

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

            this.saveToLocalStorage();

            onProgress(100, '数据提取完成');

            return this.data;

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
                totalCount: this.data ? this.data.length : 0
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
}
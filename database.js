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
            // 确保有数据可以保存
            if (!this.data || this.data.length === 0) {
                console.warn('没有数据需要保存');
                return;
            }

            const dataToSave = {
                data: this.data,
                lastUpdate: this.lastUpdate,
                timestamp: new Date().toISOString(),
                totalCount: this.data.length,
                version: '1.0' // 添加版本标识
            };

            // 尝试保存完整数据
            let jsonString = JSON.stringify(dataToSave);
            let sizeInMB = new Blob([jsonString]).size / 1024 / 1024;
            
            console.log(`尝试保存数据: ${this.data.length} 条记录, 大小: ${sizeInMB.toFixed(2)}MB`);

            // 如果数据过大，逐步减少数据量
            let maxRecords = this.data.length;
            while (sizeInMB > 4.5 && maxRecords > 100) { // 留一些余量
                maxRecords = Math.floor(maxRecords * 0.8); // 每次减少20%
                dataToSave.data = this.data.slice(0, maxRecords);
                dataToSave.isLimited = true;
                dataToSave.originalCount = this.data.length;
                jsonString = JSON.stringify(dataToSave);
                sizeInMB = new Blob([jsonString]).size / 1024 / 1024;
                console.log(`调整数据量: ${maxRecords} 条记录, 大小: ${sizeInMB.toFixed(2)}MB`);
            }

            // 尝试保存数据
            localStorage.setItem('analysisData', jsonString);
            console.log(`数据保存成功: ${dataToSave.data.length}/${dataToSave.totalCount} 条记录 (${sizeInMB.toFixed(2)}MB)`);
            
            // 验证保存是否成功
            const testLoad = localStorage.getItem('analysisData');
            if (!testLoad) {
                throw new Error('数据保存验证失败');
            }

        } catch (error) {
            console.error('保存到本地存储失败:', error);
            
            // 如果完全保存失败，至少保存基本的分析结果
            try {
                localStorage.removeItem('analysisData'); // 清除可能损坏的数据
                
                // 保存最小化的重要信息
                const minimalData = {
                    lastUpdate: this.lastUpdate,
                    timestamp: new Date().toISOString(),
                    totalCount: this.data ? this.data.length : 0,
                    version: '1.0',
                    summary: '数据量过大，仅保存基本信息',
                    hasData: this.data && this.data.length > 0
                };
                
                localStorage.setItem('analysisData', JSON.stringify(minimalData));
                console.log('保存了基本分析信息');
                
            } catch (e) {
                console.error('无法保存任何数据到本地存储:', e);
            }
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('analysisData');
            if (!saved) {
                console.log('未找到本地缓存数据');
                return false;
            }

            const parsed = JSON.parse(saved);
            
            // 检查数据版本和完整性
            if (!parsed.lastUpdate) {
                console.warn('本地数据格式过旧，将清除');
                localStorage.removeItem('analysisData');
                return false;
            }

            // 设置数据
            this.data = parsed.data || null;
            this.lastUpdate = parsed.lastUpdate;

            // 日志输出
            if (parsed.summary && !parsed.data) {
                console.log('加载的是摘要数据:', parsed.summary);
                console.log(`原始数据量: ${parsed.totalCount || 0} 条`);
                // 即使只有摘要数据，也认为有数据需要重新提取
                return parsed.hasData || false;
            } else if (parsed.data && parsed.data.length > 0) {
                const loadedCount = parsed.data.length;
                const totalCount = parsed.originalCount || parsed.totalCount || loadedCount;
                
                if (parsed.isLimited) {
                    console.log(`加载了部分数据: ${loadedCount}/${totalCount} 条记录 (因存储空间限制)`);
                } else {
                    console.log(`加载了完整数据: ${loadedCount} 条记录`);
                }
                
                return true;
            } else {
                console.log('本地数据为空');
                return false;
            }
            
        } catch (error) {
            console.error('加载本地数据失败:', error);
            // 清除损坏的数据
            try {
                localStorage.removeItem('analysisData');
                console.log('已清除损坏的本地数据');
            } catch (e) {
                console.error('无法清除损坏数据:', e);
            }
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
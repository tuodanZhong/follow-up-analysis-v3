class DashboardApp {
    constructor() {
        this.dbService = new DatabaseService();
        this.analyticsService = new AnalyticsService();
        this.charts = {};
        this.isExtracting = false;
        this.allData = []; // 存储所有数据
        this.filteredData = []; // 筛选后的数据

        this.initializeElements();
        this.bindEvents();
        this.loadExistingData();
    }

    initializeElements() {
        this.extractBtn = document.getElementById('extractBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.dashboardContainer = document.getElementById('dashboardContainer');

        this.totalUsersEl = document.getElementById('totalUsers');
        this.connectionRateEl = document.getElementById('connectionRate');
        this.deepCommunicationRateEl = document.getElementById('deepCommunicationRate');

        this.channelChartEl = document.getElementById('channelChart');
        this.storeChartEl = document.getElementById('storeChart');
        this.followupChartEl = document.getElementById('followupChart');
        this.timeChartEl = document.getElementById('timeChart');
        this.connectionTrendChartEl = document.getElementById('connectionTrendChart');
        this.deepCommTrendChartEl = document.getElementById('deepCommTrendChart');

        this.dataTableEl = document.getElementById('dataTable');
        
        // 筛选控件
        this.storeFilterEl = document.getElementById('storeFilter');
        this.dateFromFilterEl = document.getElementById('dateFromFilter');
        this.dateToFilterEl = document.getElementById('dateToFilter');
        this.resetFiltersBtn = document.getElementById('resetFilters');
        this.filteredCountEl = document.getElementById('filteredCount');
        this.totalCountEl = document.getElementById('totalCount');
        
        // 弹窗元素
        this.userDetailModal = document.getElementById('userDetailModal');
        this.modalClose = document.querySelector('.close');
        this.userBasicInfo = document.getElementById('userBasicInfo');
        this.userFollowupInfo = document.getElementById('userFollowupInfo');
    }

    bindEvents() {
        this.extractBtn.addEventListener('click', () => this.extractData());
        
        // 监听窗口大小变化，重新调整图表大小
        window.addEventListener('resize', () => {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        });
        
        // 筛选事件
        this.storeFilterEl.addEventListener('change', () => this.applyFilters());
        this.dateFromFilterEl.addEventListener('change', () => this.applyFilters());
        this.dateToFilterEl.addEventListener('change', () => this.applyFilters());
        this.resetFiltersBtn.addEventListener('click', () => this.resetFilters());
        
        // 弹窗事件
        this.modalClose.addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (event) => {
            if (event.target === this.userDetailModal) {
                this.closeModal();
            }
        });
    }

    loadExistingData() {
        if (this.dbService.loadFromLocalStorage()) {
            console.log('加载本地缓存数据');
            this.showDashboard();
            const analysis = this.analyticsService.analyzeData(this.dbService.getData());
            this.updateDashboard(analysis);
            this.extractBtn.textContent = `重新提取数据 (上次更新: ${new Date(this.dbService.getLastUpdate()).toLocaleString()})`;
        }
    }

    async extractData() {
        if (this.isExtracting) return;

        this.isExtracting = true;
        this.extractBtn.disabled = true;
        this.extractBtn.textContent = '提取中...';
        this.showProgress();
        this.hideDashboard();

        try {
            const data = await this.dbService.extractData((progress, message) => {
                this.updateProgress(progress, message);
            });

            const analysis = this.analyticsService.analyzeData(data);

            this.hideProgress();
            this.showDashboard();
            this.updateDashboard(analysis);

            this.extractBtn.textContent = `重新提取数据 (上次更新: ${new Date().toLocaleString()})`;

        } catch (error) {
            this.hideProgress();
            this.showError(error.message);
            this.extractBtn.textContent = '提取数据分析';
        } finally {
            this.isExtracting = false;
            this.extractBtn.disabled = false;
        }
    }

    updateProgress(progress, message) {
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = message;
    }

    showProgress() {
        this.progressContainer.style.display = 'block';
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
    }

    showDashboard() {
        this.dashboardContainer.classList.add('show');
    }

    hideDashboard() {
        this.dashboardContainer.classList.remove('show');
    }

    updateDashboard(analysis) {
        this.updateMetrics(analysis);
        this.updateCharts(analysis);
        this.allData = analysis.detailedData || [];
        this.filteredData = [...this.allData];
        this.setupFilters();
        this.updateDataTable(this.filteredData);
    }

    updateMetrics(analysis) {
        this.totalUsersEl.textContent = analysis.totalUsers.toLocaleString();
        this.connectionRateEl.textContent = `${analysis.connectionRate}%`;
        this.deepCommunicationRateEl.textContent = `${analysis.deepCommunicationRate}%`;
    }

    updateCharts(analysis) {
        this.updateChannelChart(analysis.channelDistribution);
        this.updateStoreChart(analysis.storeDistribution);
        this.updateConnectionTrendChart(analysis.connectionTrend);
        this.updateDeepCommTrendChart(analysis.deepCommTrend);
        this.updateFollowupChart(analysis.followupStatus);
        this.updateTimeChart(analysis.timeDistribution);
    }

    updateChannelChart(data) {
        // 销毁旧图表
        if (this.charts.channel) {
            this.charts.channel.dispose();
        }

        // 创建新的ECharts实例
        this.charts.channel = echarts.init(this.channelChartEl);

        const chartData = Object.keys(data).slice(0, 10).map(key => ({
            name: key,
            value: data[key]
        }));

        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 10,
                type: 'scroll',
                pageButtonItemGap: 5,
                pageIconSize: 10,
                pageTextStyle: {
                    fontSize: 12
                }
            },
            series: [
                {
                    name: '引流渠道',
                    type: 'pie',
                    radius: ['30%', '70%'],
                    center: ['65%', '50%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '16',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: chartData,
                    animationType: 'scale',
                    animationEasing: 'elasticOut',
                    animationDelay: function (idx) {
                        return Math.random() * 200;
                    }
                }
            ],
            color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f']
        };

        this.charts.channel.setOption(option);
    }

    updateStoreChart(data) {
        if (this.charts.store) {
            this.charts.store.dispose();
        }

        this.charts.store = echarts.init(this.storeChartEl);

        const categories = Object.keys(data);
        const values = Object.values(data);

        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: categories,
                axisTick: {
                    alignWithLabel: true
                },
                axisLabel: {
                    interval: 0,
                    rotate: categories.length > 5 ? 30 : 0
                }
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    name: '用户数',
                    type: 'bar',
                    data: values,
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#83bff6' },
                            { offset: 0.5, color: '#188df0' },
                            { offset: 1, color: '#188df0' }
                        ])
                    },
                    emphasis: {
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: '#2378f7' },
                                { offset: 0.7, color: '#2378f7' },
                                { offset: 1, color: '#83bff6' }
                            ])
                        }
                    },
                    animationDelay: function (idx) {
                        return idx * 10;
                    }
                }
            ],
            animationEasing: 'elasticOut',
            animationDelayUpdate: function (idx) {
                return idx * 5;
            }
        };

        this.charts.store.setOption(option);
    }

    updateFollowupChart(data) {
        if (this.charts.followup) {
            this.charts.followup.dispose();
        }

        this.charts.followup = echarts.init(this.followupChartEl);

        const chartData = Object.keys(data).map(key => ({
            name: key,
            value: data[key]
        }));

        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                top: '5%',
                left: 'center'
            },
            series: [
                {
                    name: '跟进状态',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['50%', '60%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '16',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: chartData,
                    animationType: 'scale',
                    animationEasing: 'elasticOut',
                    animationDelay: function (idx) {
                        return Math.random() * 200;
                    }
                }
            ],
            color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4']
        };

        this.charts.followup.setOption(option);
    }

    updateTimeChart(data) {
        if (this.charts.time) {
            this.charts.time.dispose();
        }

        this.charts.time = echarts.init(this.timeChartEl);

        const dates = Object.keys(data);
        const values = Object.values(data);

        const option = {
            tooltip: {
                trigger: 'axis'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: dates
            },
            yAxis: {
                type: 'value'
            },
            series: [
                {
                    name: '新增用户数',
                    type: 'line',
                    smooth: true,
                    data: values,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(58, 77, 233, 0.8)' },
                            { offset: 1, color: 'rgba(58, 77, 233, 0.1)' }
                        ])
                    },
                    lineStyle: {
                        color: '#3a4de9'
                    },
                    itemStyle: {
                        color: '#3a4de9'
                    },
                    animationDelay: function (idx) {
                        return idx * 10 + 100;
                    }
                }
            ],
            animationEasing: 'elasticOut',
            animationDelayUpdate: function (idx) {
                return idx * 5;
            }
        };

        this.charts.time.setOption(option);
    }

    updateConnectionTrendChart(data) {
        if (this.charts.connectionTrend) {
            this.charts.connectionTrend.dispose();
        }

        this.charts.connectionTrend = echarts.init(this.connectionTrendChartEl);

        const dates = Object.keys(data);
        const values = Object.values(data).map(v => parseFloat(v));

        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    return `${params[0].name}<br/>接通率: ${params[0].value}%`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: dates
            },
            yAxis: {
                type: 'value',
                max: 100,
                min: 0,
                axisLabel: {
                    formatter: '{value}%'
                }
            },
            series: [
                {
                    name: '接通率',
                    type: 'line',
                    smooth: true,
                    data: values,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(54, 162, 235, 0.8)' },
                            { offset: 1, color: 'rgba(54, 162, 235, 0.1)' }
                        ])
                    },
                    lineStyle: {
                        color: '#36a2eb'
                    },
                    itemStyle: {
                        color: '#36a2eb'
                    },
                    animationDelay: function (idx) {
                        return idx * 10 + 100;
                    }
                }
            ],
            animationEasing: 'elasticOut',
            animationDelayUpdate: function (idx) {
                return idx * 5;
            }
        };

        this.charts.connectionTrend.setOption(option);
    }

    updateDeepCommTrendChart(data) {
        if (this.charts.deepCommTrend) {
            this.charts.deepCommTrend.dispose();
        }

        this.charts.deepCommTrend = echarts.init(this.deepCommTrendChartEl);

        const dates = Object.keys(data);
        const values = Object.values(data).map(v => parseFloat(v));

        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    return `${params[0].name}<br/>深度沟通率: ${params[0].value}%`;
                }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: dates
            },
            yAxis: {
                type: 'value',
                max: 100,
                min: 0,
                axisLabel: {
                    formatter: '{value}%'
                }
            },
            series: [
                {
                    name: '深度沟通率',
                    type: 'line',
                    smooth: true,
                    data: values,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(255, 99, 132, 0.8)' },
                            { offset: 1, color: 'rgba(255, 99, 132, 0.1)' }
                        ])
                    },
                    lineStyle: {
                        color: '#ff6384'
                    },
                    itemStyle: {
                        color: '#ff6384'
                    },
                    animationDelay: function (idx) {
                        return idx * 10 + 100;
                    }
                }
            ],
            animationEasing: 'elasticOut',
            animationDelayUpdate: function (idx) {
                return idx * 5;
            }
        };

        this.charts.deepCommTrend.setOption(option);
    }

    updateDataTable(data) {
        if (!data || data.length === 0) {
            this.dataTableEl.innerHTML = '<p>暂无数据</p>';
            this.updateTableStats(0, this.allData.length);
            return;
        }

        const table = `
            <table>
                <thead>
                    <tr>
                        <th>用户ID</th>
                        <th>昵称</th>
                        <th>手机号</th>
                        <th>性别</th>
                        <th>年龄</th>
                        <th>身高</th>
                        <th>学历</th>
                        <th>入库时间</th>
                        <th>引流渠道</th>
                        <th>门店</th>
                        <th>跟进次数</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            <td>${row.mid}</td>
                            <td>${row.nickname || '-'}</td>
                            <td>${row.mobile || '-'}</td>
                            <td>${row.gender}</td>
                            <td>${row.age || '-'}</td>
                            <td>${row.height || '-'}</td>
                            <td>${row.education || '-'}</td>
                            <td>${new Date(row.createtime).toLocaleString()}</td>
                            <td>${row.channel}</td>
                            <td>${row.sitename || '-'}</td>
                            <td>${row.followups.length}</td>
                            <td><a href="#" class="user-link" data-user-id="${row.mid}">查看详情</a></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        this.dataTableEl.innerHTML = table;
        this.updateTableStats(data.length, this.allData.length);
        
        // 绑定查看详情点击事件
        this.dataTableEl.querySelectorAll('.user-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = e.target.getAttribute('data-user-id');
                this.showUserDetail(userId);
            });
        });
    }

    // 初始化筛选器
    setupFilters() {
        // 设置门店筛选器
        const stores = [...new Set(this.allData.map(item => item.sitename).filter(Boolean))];
        this.storeFilterEl.innerHTML = '<option value="">所有门店</option>' +
            stores.map(store => `<option value="${store}">${store}</option>`).join('');
        
        // 设置默认日期范围
        if (this.allData.length > 0) {
            const dates = this.allData.map(item => new Date(item.createtime).toISOString().split('T')[0]);
            const minDate = Math.min(...dates.map(d => new Date(d)));
            const maxDate = Math.max(...dates.map(d => new Date(d)));
            
            this.dateFromFilterEl.value = new Date(minDate).toISOString().split('T')[0];
            this.dateToFilterEl.value = new Date(maxDate).toISOString().split('T')[0];
        }
    }
    
    // 应用筛选
    applyFilters() {
        const storeFilter = this.storeFilterEl.value;
        const dateFrom = this.dateFromFilterEl.value;
        const dateTo = this.dateToFilterEl.value;
        
        this.filteredData = this.allData.filter(item => {
            // 门店筛选
            if (storeFilter && item.sitename !== storeFilter) {
                return false;
            }
            
            // 日期筛选
            const itemDate = new Date(item.createtime).toISOString().split('T')[0];
            if (dateFrom && itemDate < dateFrom) {
                return false;
            }
            if (dateTo && itemDate > dateTo) {
                return false;
            }
            
            return true;
        });
        
        this.updateDataTable(this.filteredData);
    }
    
    // 重置筛选
    resetFilters() {
        this.storeFilterEl.value = '';
        this.dateFromFilterEl.value = '';
        this.dateToFilterEl.value = '';
        this.filteredData = [...this.allData];
        this.updateDataTable(this.filteredData);
    }
    
    // 更新表格统计信息
    updateTableStats(filteredCount, totalCount) {
        this.filteredCountEl.textContent = filteredCount.toLocaleString();
        this.totalCountEl.textContent = totalCount.toLocaleString();
    }
    
    // 显示用户详情
    showUserDetail(userId) {
        const user = this.allData.find(item => item.mid == userId);
        if (!user) {
            this.showError('用户信息不存在');
            return;
        }
        
        // 基本信息
        const basicInfo = [
            { label: '用户ID', value: user.mid },
            { label: '昵称', value: user.nickname || '未设置' },
            { label: '手机号', value: user.mobile || '未提供' },
            { label: '性别', value: user.gender },
            { label: '年龄', value: user.age || '未提供' },
            { label: '身高', value: user.height ? `${user.height}cm` : '未提供' },
            { label: '学历', value: user.education || '未提供' },
            { label: '入库时间', value: new Date(user.createtime).toLocaleString() },
            { label: '引流渠道', value: user.channel },
            { label: '门店', value: user.sitename || '未分配' }
        ];
        
        this.userBasicInfo.innerHTML = basicInfo.map(info => `
            <div class="info-item">
                <div class="info-label">${info.label}</div>
                <div class="info-value">${info.value}</div>
            </div>
        `).join('');
        
        // 跟进记录
        if (user.followups && user.followups.length > 0) {
            // 按时间排序
            const sortedFollowups = user.followups.sort((a, b) => new Date(a.time) - new Date(b.time));
            
            this.userFollowupInfo.innerHTML = sortedFollowups.map(followup => `
                <div class="followup-item">
                    <div class="followup-time">${new Date(followup.time).toLocaleString()}</div>
                    <div class="followup-content">${followup.content}</div>
                </div>
            `).join('');
        } else {
            this.userFollowupInfo.innerHTML = '<div class="no-followup">暂无跟进记录</div>';
        }
        
        // 显示弹窗
        this.userDetailModal.classList.add('show');
    }
    
    // 关闭弹窗
    closeModal() {
        this.userDetailModal.classList.remove('show');
    }

    showError(message) {
        alert(`错误: ${message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardApp();
});
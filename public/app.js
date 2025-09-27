class DashboardApp {
    constructor() {
        this.dbService = new DatabaseService();
        this.analyticsService = new AnalyticsService();
        this.charts = {};
        this.isExtracting = false;
        this.allData = []; // 存储所有数据
        this.filteredData = []; // 筛选后的数据
        this.currentPage = 1; // 当前页码
        this.pageSize = 20; // 每页显示数量

        this.initializeElements();
        this.bindEvents();
        this.loadExistingData(); // 异步调用
    }

    initializeElements() {
        this.extractBtn = document.getElementById('extractBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.dashboardContainer = document.getElementById('dashboardContainer');

        this.totalUsersEl = document.getElementById('totalUsers');
        this.connectionRateEl = document.getElementById('connectionRate');
        this.threeDayConnectionRateEl = document.getElementById('threeDayConnectionRate');
        this.deepCommunicationRateEl = document.getElementById('deepCommunicationRate');
        this.invalidDataRateEl = document.getElementById('invalidDataRate');

        this.channelChartEl = document.getElementById('channelChart');
        this.storeChartEl = document.getElementById('storeChart');
        this.timeChartEl = document.getElementById('timeChart');
        this.connectionTrendChartEl = document.getElementById('connectionTrendChart');
        this.threeDayConnectionTrendChartEl = document.getElementById('threeDayConnectionTrendChart');
        this.deepCommTrendChartEl = document.getElementById('deepCommTrendChart');
        this.invalidDataTrendChartEl = document.getElementById('invalidDataTrendChart');

        this.dataTableEl = document.getElementById('dataTable');
        
        // 筛选控件
        this.storeFilterEl = document.getElementById('storeFilter');
        this.channelFilterEl = document.getElementById('channelFilter');
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

        // 分页元素将在showDashboard时初始化
        this.paginationInitialized = false;
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
        this.channelFilterEl.addEventListener('change', () => this.applyFilters());
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

        // 分页事件将在initializePagination中绑定
    }

    async loadExistingData() {
        // 优先尝试加载服务端缓存数据
        try {
            const cacheStatus = await this.dbService.checkCacheStatus();
            if (cacheStatus.exists && !cacheStatus.isExpired) {
                console.log('自动加载服务端缓存数据');
                this.extractBtn.textContent = '加载缓存数据中...';
                this.extractBtn.disabled = true;

                const cachedData = await this.dbService.loadCachedData((progress, message) => {
                    // 静默加载，不显示进度条
                    console.log(`${progress}%: ${message}`);
                });

                if (cachedData) {
                    console.log(`已加载服务端缓存数据: ${cachedData.length}条记录`);
                    this.showDashboard();
                    const analysis = this.analyticsService.analyzeData(cachedData);
                    this.updateDashboard(analysis);

                    const dateRange = this.dbService.getDateRange();
                    const dateRangeText = dateRange && dateRange.description ? ` - ${dateRange.description}` : '';
                    this.extractBtn.textContent = `刷新数据 (缓存: ${new Date(this.dbService.getLastUpdate()).toLocaleString()}${dateRangeText})`;
                    this.extractBtn.disabled = false;
                    return; // 成功加载缓存，直接返回
                }
            }
        } catch (error) {
            console.warn('加载服务端缓存失败，尝试本地数据:', error);
        }

        // 服务端缓存不可用时，才尝试本地数据
        if (this.dbService.loadFromLocalStorage()) {
            console.log('加载本地缓存数据 (数据可能不完整)');
            this.showDashboard();
            const analysis = this.analyticsService.analyzeData(this.dbService.getData());
            this.updateDashboard(analysis);
            const dateRange = this.dbService.getDateRange();
            const dateRangeText = dateRange && dateRange.description ? ` - ${dateRange.description}` : '';
            this.extractBtn.textContent = `刷新完整数据 (本地缓存: ${new Date(this.dbService.getLastUpdate()).toLocaleString()}${dateRangeText})`;
        } else {
            // 检查服务端缓存状态，更新按钮
            this.checkServerCache();
        }
    }

    async extractData() {
        if (this.isExtracting) return;

        // 密码验证
        const password = prompt('请输入访问密码:');
        if (password !== '1428') {
            alert('密码错误，无法访问数据提取功能！');
            return;
        }

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

            const dateRange = this.dbService.getDateRange();
            const dateRangeText = dateRange && dateRange.description ? ` - ${dateRange.description}` : '';
            const cacheText = this.dbService.isFromCache() ? ' [服务端缓存]' : ' [实时提取]';
            this.extractBtn.textContent = `重新提取数据 (上次更新: ${new Date().toLocaleString()}${dateRangeText}${cacheText})`;

        } catch (error) {
            this.hideProgress();
            this.showError(error.message);
            this.extractBtn.textContent = '提取数据分析';
            // 检查是否有服务端缓存
            this.checkServerCache();
        } finally {
            this.isExtracting = false;
            this.extractBtn.disabled = false;
        }
    }

    async checkServerCache() {
        try {
            const cacheStatus = await this.dbService.checkCacheStatus();
            if (cacheStatus.exists) {
                const ageText = cacheStatus.isExpired
                    ? `过期 (${cacheStatus.ageHours}小时前)`
                    : `有效 (${cacheStatus.ageHours}小时前)`;

                const statusColor = cacheStatus.isExpired ? '#ff6b6b' : '#51cf66';

                this.extractBtn.style.borderColor = statusColor;
                this.extractBtn.title = `服务端缓存状态: ${ageText}`;

                if (!cacheStatus.isExpired) {
                    this.extractBtn.textContent = `加载缓存数据 (${cacheStatus.ageHours}小时前更新)`;
                } else {
                    this.extractBtn.textContent = `刷新数据 (缓存已过期${cacheStatus.ageHours}小时)`;
                }
            }
        } catch (error) {
            console.warn('检查服务端缓存失败:', error);
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

        // 初始化分页元素（仅一次）
        if (!this.paginationInitialized) {
            this.initializePagination();
        }
    }

    hideDashboard() {
        this.dashboardContainer.classList.remove('show');
    }

    updateDashboard(analysis) {
        this.updateMetrics(analysis);
        this.updateCharts(analysis);
        this.allData = analysis.detailedData || [];
        this.filteredData = [...this.allData];

        console.log('数据加载完成:', {
            总记录数: this.allData.length,
            样本数据: this.allData[0],
            有createtime字段: this.allData[0] && 'createtime' in this.allData[0],
            有channel字段: this.allData[0] && 'channel' in this.allData[0]
        });

        this.setupFilters();
        this.updateDataTable(this.filteredData);
    }

    updateMetrics(analysis) {
        this.totalUsersEl.textContent = analysis.totalUsers.toLocaleString();
        this.connectionRateEl.textContent = `${analysis.connectionRate}%`;
        this.threeDayConnectionRateEl.textContent = `${analysis.threeDayConnectionRate}%`;
        this.deepCommunicationRateEl.textContent = `${analysis.deepCommunicationRate}%`;
        this.invalidDataRateEl.textContent = `${analysis.invalidDataRate}%`;
    }

    updateCharts(analysis) {
        this.updateChannelChart(analysis.channelDistribution);
        this.updateStoreChart(analysis.storeDistribution);
        this.updateConnectionTrendChart(analysis.connectionTrend);
        this.updateThreeDayConnectionTrendChart(analysis.threeDayConnectionTrend);
        this.updateDeepCommTrendChart(analysis.deepCommTrend);
        this.updateInvalidDataTrendChart(analysis.invalidDataTrend);
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
                type: 'value',
                scale: true
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

    updateThreeDayConnectionTrendChart(data) {
        if (this.charts.threeDayConnectionTrend) {
            this.charts.threeDayConnectionTrend.dispose();
        }

        this.charts.threeDayConnectionTrend = echarts.init(this.threeDayConnectionTrendChartEl);

        const dates = Object.keys(data);
        const values = Object.values(data).map(v => parseFloat(v));

        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    return `${params[0].name}<br/>3天接通率: ${params[0].value}%`;
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
                axisLabel: {
                    formatter: '{value}%'
                },
                scale: true
            },
            series: [
                {
                    name: '3天接通率',
                    type: 'line',
                    smooth: true,
                    data: values,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(75, 192, 192, 0.8)' },
                            { offset: 1, color: 'rgba(75, 192, 192, 0.1)' }
                        ])
                    },
                    lineStyle: {
                        color: '#4bc0c0'
                    },
                    itemStyle: {
                        color: '#4bc0c0'
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

        this.charts.threeDayConnectionTrend.setOption(option);
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
                type: 'value',
                scale: true
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
                axisLabel: {
                    formatter: '{value}%'
                },
                scale: true
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
                axisLabel: {
                    formatter: '{value}%'
                },
                scale: true
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

    updateInvalidDataTrendChart(data) {
        if (this.charts.invalidDataTrend) {
            this.charts.invalidDataTrend.dispose();
        }

        this.charts.invalidDataTrend = echarts.init(this.invalidDataTrendChartEl);

        const dates = Object.keys(data);
        const values = Object.values(data).map(v => parseFloat(v));

        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function (params) {
                    return `${params[0].name}<br/>资料不符率: ${params[0].value}%`;
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
                axisLabel: {
                    formatter: '{value}%'
                },
                scale: true
            },
            series: [
                {
                    name: '资料不符率',
                    type: 'line',
                    smooth: true,
                    data: values,
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(255, 165, 0, 0.8)' },
                            { offset: 1, color: 'rgba(255, 165, 0, 0.1)' }
                        ])
                    },
                    lineStyle: {
                        color: '#ffa500'
                    },
                    itemStyle: {
                        color: '#ffa500'
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

        this.charts.invalidDataTrend.setOption(option);
    }

    updateDataTable(data) {
        if (!data || data.length === 0) {
            this.dataTableEl.innerHTML = '<p>暂无数据</p>';
            this.updateTableStats(0, this.allData.length);
            this.updatePagination(0);
            return;
        }

        // 计算分页数据
        const totalPages = this.getTotalPages(data.length);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = data.slice(startIndex, endIndex);

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
                        <th>用户分类</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${pageData.map(row => `
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
                            <td>${this.formatClassifications(row.classifications || [])}</td>
                            <td><a href="#" class="user-link" data-user-id="${row.mid}">查看详情</a></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        this.dataTableEl.innerHTML = table;
        this.updateTableStats(data.length, this.allData.length);
        this.updatePagination(data.length);

        // 确保分页容器存在，如果不存在则创建
        this.ensurePaginationContainer();

        // 绑定查看详情点击事件
        this.dataTableEl.querySelectorAll('.user-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const userId = e.target.getAttribute('data-user-id');
                this.showUserDetail(userId);
            });
        });
    }

    formatClassifications(classifications) {
        if (!classifications || classifications.length === 0) {
            return '<span class="classification-tag no-classification">-</span>';
        }

        return classifications.map(classification => {
            let className = 'classification-tag';
            switch (classification) {
                case '深沟':
                    className += ' deep-communication';
                    break;
                case '接通':
                    className += ' connected';
                    break;
                case '资料不符':
                    className += ' invalid-data';
                    break;
                default:
                    className += ' other';
            }
            return `<span class="${className}">${classification}</span>`;
        }).join(' ');
    }

    // 初始化筛选器
    setupFilters() {
        // 设置门店筛选器
        const stores = [...new Set(this.allData.map(item => item.sitename).filter(Boolean))];
        this.storeFilterEl.innerHTML = '<option value="">所有门店</option>' +
            stores.map(store => `<option value="${store}">${store}</option>`).join('');

        // 设置渠道筛选器
        const channels = [...new Set(this.allData.map(item => item.channel).filter(Boolean))];
        this.channelFilterEl.innerHTML = '<option value="">所有渠道</option>' +
            channels.map(channel => `<option value="${channel}">${channel}</option>`).join('');

        // 不自动设置日期范围，让用户主动选择
        // 显示数据的日期范围供参考
        if (this.allData.length > 0) {
            const dates = this.allData.map(item => new Date(item.createtime));
            const validDates = dates.filter(date => !isNaN(date.getTime()));

            if (validDates.length > 0) {
                const minDate = new Date(Math.min(...validDates));
                const maxDate = new Date(Math.max(...validDates));

                console.log('数据日期范围 (供参考):', {
                    minDate: minDate.toISOString().split('T')[0],
                    maxDate: maxDate.toISOString().split('T')[0],
                    有效日期数: validDates.length,
                    总记录数: this.allData.length
                });

                // 显示部分样本日期供调试
                const sampleDates = this.allData.slice(0, 10).map(item => ({
                    mid: item.mid,
                    createtime: item.createtime,
                    日期解析: new Date(item.createtime).toISOString().split('T')[0]
                }));
                console.log('样本数据日期:', sampleDates);
            } else {
                console.warn('没有找到有效的日期数据');
            }
        }
    }
    
    // 应用筛选
    applyFilters() {
        const storeFilter = this.storeFilterEl.value;
        const channelFilter = this.channelFilterEl.value;
        const dateFrom = this.dateFromFilterEl.value;
        const dateTo = this.dateToFilterEl.value;

        console.log('应用筛选:', { storeFilter, channelFilter, dateFrom, dateTo });
        console.log('筛选前数据量:', this.allData.length);

        this.filteredData = this.allData.filter(item => {
            // 门店筛选
            if (storeFilter && item.sitename !== storeFilter) {
                return false;
            }

            // 渠道筛选
            if (channelFilter && item.channel !== channelFilter) {
                return false;
            }

            // 日期筛选 - 修复时区问题
            if (dateFrom || dateTo) {
                try {
                    const itemDate = new Date(item.createtime);

                    // 验证日期是否有效
                    if (isNaN(itemDate.getTime())) {
                        console.warn('无效日期:', item.createtime);
                        return true; // 无效日期不过滤
                    }

                    if (dateFrom) {
                        // 使用本地时间进行比较，避免时区问题
                        const fromDate = new Date(dateFrom + 'T00:00:00');
                        if (itemDate < fromDate) {
                            return false;
                        }
                    }

                    if (dateTo) {
                        // 使用本地时间进行比较，包含当天结束时间
                        const toDate = new Date(dateTo + 'T23:59:59');
                        if (itemDate > toDate) {
                            return false;
                        }
                    }
                } catch (error) {
                    console.warn('日期解析错误:', item.createtime, error);
                    return true; // 解析失败的数据不过滤
                }
            }

            return true;
        });

        console.log(`筛选结果: ${this.filteredData.length}/${this.allData.length} 条记录`);

        // 重置到第一页
        this.currentPage = 1;
        this.updateDataTable(this.filteredData);
    }
    
    // 重置筛选
    resetFilters() {
        this.storeFilterEl.value = '';
        this.channelFilterEl.value = '';
        this.dateFromFilterEl.value = '';
        this.dateToFilterEl.value = '';

        // 重置页码
        this.currentPage = 1;

        // 重置后重新应用筛选逻辑，确保一致性
        this.applyFilters();
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

    // 初始化分页元素和事件
    initializePagination() {
        console.log('开始初始化分页元素...');

        // 获取分页元素
        this.currentPageInfo = document.getElementById('currentPageInfo');
        this.totalPagesInfo = document.getElementById('totalPagesInfo');
        this.firstPageBtn = document.getElementById('firstPageBtn');
        this.prevPageBtn = document.getElementById('prevPageBtn');
        this.nextPageBtn = document.getElementById('nextPageBtn');
        this.lastPageBtn = document.getElementById('lastPageBtn');
        this.pageNumbers = document.getElementById('pageNumbers');
        this.pageSizeSelector = document.getElementById('pageSizeSelector');

        // 检查分页元素是否存在
        const paginationElements = {
            currentPageInfo: this.currentPageInfo,
            totalPagesInfo: this.totalPagesInfo,
            firstPageBtn: this.firstPageBtn,
            prevPageBtn: this.prevPageBtn,
            nextPageBtn: this.nextPageBtn,
            lastPageBtn: this.lastPageBtn,
            pageNumbers: this.pageNumbers,
            pageSizeSelector: this.pageSizeSelector
        };

        const missingElements = Object.keys(paginationElements).filter(key => !paginationElements[key]);
        if (missingElements.length > 0) {
            console.error('找不到以下分页元素:', missingElements);
            return;
        }

        console.log('所有分页元素找到，绑定事件...');

        // 绑定分页事件
        this.firstPageBtn.addEventListener('click', () => this.goToPage(1));
        this.prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        this.nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        this.lastPageBtn.addEventListener('click', () => this.goToPage(this.getTotalPages()));
        this.pageSizeSelector.addEventListener('change', () => {
            this.pageSize = parseInt(this.pageSizeSelector.value);
            this.currentPage = 1;
            this.updateDataTable(this.filteredData);
        });

        this.paginationInitialized = true;
        console.log('分页初始化完成');
    }

    // 确保分页容器存在
    ensurePaginationContainer() {
        let paginationContainer = document.querySelector('.pagination-container');

        if (!paginationContainer) {
            console.log('分页容器不存在，正在创建...');

            // 创建分页容器
            paginationContainer = document.createElement('div');
            paginationContainer.className = 'pagination-container';
            paginationContainer.innerHTML = `
                <div class="pagination-info">
                    第 <span id="currentPageInfo">1</span> 页，共 <span id="totalPagesInfo">1</span> 页
                </div>
                <div class="pagination-controls">
                    <button id="firstPageBtn" class="pagination-btn">首页</button>
                    <button id="prevPageBtn" class="pagination-btn">上一页</button>
                    <span class="page-numbers" id="pageNumbers"></span>
                    <button id="nextPageBtn" class="pagination-btn">下一页</button>
                    <button id="lastPageBtn" class="pagination-btn">末页</button>
                </div>
                <div class="page-size-selector">
                    每页显示：
                    <select id="pageSizeSelector">
                        <option value="20" selected>20条</option>
                        <option value="50">50条</option>
                        <option value="100">100条</option>
                    </select>
                </div>
            `;

            // 将分页容器添加到数据表容器后面
            const dataTableContainer = document.querySelector('.data-table-container');
            if (dataTableContainer) {
                dataTableContainer.appendChild(paginationContainer);
                console.log('分页容器已添加到DOM');

                // 等待DOM更新后再初始化分页事件，避免竞态条件
                setTimeout(() => {
                    this.paginationInitialized = false;
                    this.initializePagination();
                }, 0);
            } else {
                console.error('找不到数据表容器，无法添加分页容器');
            }
        } else {
            console.log('分页容器已存在');

            // 确保分页已正确初始化
            if (!this.paginationInitialized) {
                this.initializePagination();
            }
        }
    }

    // 分页相关方法
    getTotalPages(totalItems = null) {
        const total = totalItems !== null ? totalItems : this.filteredData.length;
        return Math.ceil(total / this.pageSize);
    }

    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page < 1 || page > totalPages) return;

        this.currentPage = page;
        this.updateDataTable(this.filteredData);
    }

    updatePagination(totalItems) {
        const totalPages = this.getTotalPages(totalItems);

        // 更新页面信息 - 添加空值检查
        if (this.currentPageInfo) {
            this.currentPageInfo.textContent = this.currentPage;
        }
        if (this.totalPagesInfo) {
            this.totalPagesInfo.textContent = totalPages;
        }

        // 更新按钮状态 - 添加空值检查
        if (this.firstPageBtn) {
            this.firstPageBtn.disabled = this.currentPage === 1;
        }
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = this.currentPage === 1;
        }
        if (this.nextPageBtn) {
            this.nextPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;
        }
        if (this.lastPageBtn) {
            this.lastPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;
        }

        // 更新页码数字
        this.updatePageNumbers(totalPages);
    }

    updatePageNumbers(totalPages) {
        if (!this.pageNumbers) {
            console.warn('页码元素不存在');
            return;
        }

        this.pageNumbers.innerHTML = '';

        if (totalPages <= 0) {
            return;
        }

        // 计算显示的页码范围
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, this.currentPage + 2);

        // 确保至少显示5个页码（如果总页数足够）
        if (endPage - startPage < 4) {
            if (startPage === 1) {
                endPage = Math.min(totalPages, startPage + 4);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, endPage - 4);
            }
        }

        // 如果不是从第1页开始，显示第1页和省略号
        if (startPage > 1) {
            this.createPageNumber(1);
            if (startPage > 2) {
                this.createEllipsis();
            }
        }

        // 创建页码按钮
        for (let i = startPage; i <= endPage; i++) {
            this.createPageNumber(i);
        }

        // 如果不是到最后一页结束，显示省略号和最后一页
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                this.createEllipsis();
            }
            this.createPageNumber(totalPages);
        }
    }

    createPageNumber(pageNum) {
        if (!this.pageNumbers) return;

        const pageBtn = document.createElement('span');
        pageBtn.className = `page-number ${pageNum === this.currentPage ? 'active' : ''}`;
        pageBtn.textContent = pageNum;
        pageBtn.addEventListener('click', () => this.goToPage(pageNum));
        this.pageNumbers.appendChild(pageBtn);
    }

    createEllipsis() {
        if (!this.pageNumbers) return;

        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-number';
        ellipsis.textContent = '...';
        ellipsis.style.cursor = 'default';
        ellipsis.style.backgroundColor = 'transparent';
        ellipsis.style.border = 'none';
        this.pageNumbers.appendChild(ellipsis);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DashboardApp();
});
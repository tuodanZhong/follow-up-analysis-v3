class AnalyticsService {
    constructor() {
        this.channelMapping = CONFIG.channelMapping;
    }

    analyzeData(rawData) {
        if (!rawData || rawData.length === 0) {
            return this.getEmptyAnalysis();
        }

        const analysis = {
            totalUsers: this.getTotalUsers(rawData),
            connectionRate: this.getConnectionRate(rawData),
            threeDayConnectionRate: this.getThreeDayConnectionRate(rawData),
            deepCommunicationRate: this.getDeepCommunicationRate(rawData),
            channelDistribution: this.getChannelDistribution(rawData),
            storeDistribution: this.getStoreDistribution(rawData),
            followupStatus: this.getFollowupStatus(rawData),
            timeDistribution: this.getTimeDistribution(rawData),
            connectionTrend: this.getConnectionTrend(rawData),
            threeDayConnectionTrend: this.getThreeDayConnectionTrend(rawData),
            deepCommTrend: this.getDeepCommTrend(rawData),
            detailedData: this.getDetailedData(rawData)
        };

        return analysis;
    }

    getTotalUsers(data) {
        const uniqueUsers = new Set(data.map(row => row.mid));
        return uniqueUsers.size;
    }

    getConnectionRate(data) {
        const users = new Map();
        data.forEach(row => {
            if (!users.has(row.mid)) {
                users.set(row.mid, {
                    hasFollowup: false,
                    logContent: []
                });
            }
            if (row.logcont) {
                users.get(row.mid).hasFollowup = true;
                users.get(row.mid).logContent.push(row.logcont);
            }
        });

        const totalUsers = users.size;
        const connectedUsers = Array.from(users.values()).filter(user =>
            user.hasFollowup && this.isConnected(user.logContent)
        ).length;

        return totalUsers > 0 ? ((connectedUsers / totalUsers) * 100).toFixed(2) : '0.00';
    }

    getFollowupRate(data) {
        const users = new Map();
        data.forEach(row => {
            if (!users.has(row.mid)) {
                users.set(row.mid, {
                    hasFollowup: false,
                    logContent: []
                });
            }
            if (row.logcont) {
                users.get(row.mid).hasFollowup = true;
                users.get(row.mid).logContent.push(row.logcont);
            }
        });

        const totalUsers = users.size;
        const followupUsers = Array.from(users.values()).filter(user =>
            user.hasFollowup && this.canFollowup(user.logContent)
        ).length;

        return totalUsers > 0 ? ((followupUsers / totalUsers) * 100).toFixed(2) : '0.00';
    }

    getThreeDayConnectionRate(data) {
        const users = new Map();
        
        // 收集用户数据：入库时间和所有跟进记录
        data.forEach(row => {
            if (!users.has(row.mid)) {
                users.set(row.mid, {
                    createtime: row.createtime,
                    followups: []
                });
            }
            if (row.addtime && row.logcont) {
                users.get(row.mid).followups.push({
                    time: row.addtime,
                    content: row.logcont
                });
            }
        });

        const totalUsers = users.size;
        let connectedWithin3Days = 0;

        users.forEach(user => {
            if (!user.createtime) return;
            
            const createDate = new Date(user.createtime);
            const threeDaysLater = new Date(createDate.getTime() + 3 * 24 * 60 * 60 * 1000);
            
            // 检查3天内的跟进记录是否有接通
            const hasConnectionWithin3Days = user.followups.some(followup => {
                const followupDate = new Date(followup.time);
                return followupDate <= threeDaysLater && 
                       this.isConnected([followup.content]);
            });
            
            if (hasConnectionWithin3Days) {
                connectedWithin3Days++;
            }
        });

        return totalUsers > 0 ? ((connectedWithin3Days / totalUsers) * 100).toFixed(2) : '0.00';
    }

    getDeepCommunicationRate(data) {
        const users = new Map();
        data.forEach(row => {
            if (!users.has(row.mid)) {
                users.set(row.mid, {
                    hasFollowup: false,
                    logContent: []
                });
            }
            if (row.logcont) {
                users.get(row.mid).hasFollowup = true;
                users.get(row.mid).logContent.push(row.logcont);
            }
        });

        const totalUsers = users.size;
        const deepCommUsers = Array.from(users.values()).filter(user =>
            user.hasFollowup && this.hasDeepCommunication(user.logContent)
        ).length;

        return totalUsers > 0 ? ((deepCommUsers / totalUsers) * 100).toFixed(2) : '0.00';
    }

    getThreeDayConnectionRate(data) {
        const users = new Map();
        
        // 按用户分组数据，记录入库时间和跟进记录
        data.forEach(row => {
            if (!users.has(row.mid)) {
                users.set(row.mid, {
                    createtime: row.createtime,
                    followups: []
                });
            }
            
            // 收集跟进记录（需要有跟进时间和内容）
            if (row.addtime && row.logcont) {
                users.get(row.mid).followups.push({
                    time: row.addtime,
                    content: row.logcont
                });
            }
        });

        const totalUsers = users.size;
        let connectedWithin3Days = 0;

        // 检查每个用户是否在入库后3天内有接通记录
        users.forEach(user => {
            if (!user.createtime) return;
            
            const createDate = new Date(user.createtime);
            const threeDaysLater = new Date(createDate.getTime() + 3 * 24 * 60 * 60 * 1000);
            
            // 检查是否有在3天内的接通记录
            const hasConnectionWithin3Days = user.followups.some(followup => {
                if (!followup.time) return false;
                
                const followupDate = new Date(followup.time);
                // 跟进时间在入库时间之后且在3天内
                const isWithinTimeRange = followupDate >= createDate && followupDate <= threeDaysLater;
                // 跟进内容包含接通关键词
                const isConnected = this.isConnected([followup.content]);
                
                return isWithinTimeRange && isConnected;
            });
            
            if (hasConnectionWithin3Days) {
                connectedWithin3Days++;
            }
        });

        return totalUsers > 0 ? ((connectedWithin3Days / totalUsers) * 100).toFixed(2) : '0.00';
    }

    isConnected(logContents) {
        const connectedKeywords = ['接通', '通话', '联系上', '接听'];
        return logContents.some(log =>
            connectedKeywords.some(keyword => log && log.includes(keyword))
        );
    }

    canFollowup(logContents) {
        const followupKeywords = ['可跟进', '有意向', '感兴趣', '愿意了解'];
        const noFollowupKeywords = ['拒绝', '不感兴趣', '挂断', '无意向'];

        const hasPositive = logContents.some(log =>
            followupKeywords.some(keyword => log && log.includes(keyword))
        );

        const hasNegative = logContents.some(log =>
            noFollowupKeywords.some(keyword => log && log.includes(keyword))
        );

        return hasPositive && !hasNegative;
    }

    hasDeepCommunication(logContents) {
        const deepCommKeywords = ['深度沟通', '详细了解', '邀约成功', '到店', '面谈'];
        return logContents.some(log =>
            deepCommKeywords.some(keyword => log && log.includes(keyword))
        );
    }

    getChannelDistribution(data) {
        const distribution = {};
        const userChannels = new Map();

        data.forEach(row => {
            if (!userChannels.has(row.mid)) {
                const channelName = this.channelMapping[row.sourcefrom] || `未知渠道(${row.sourcefrom})`;
                userChannels.set(row.mid, channelName);
            }
        });

        userChannels.forEach(channel => {
            distribution[channel] = (distribution[channel] || 0) + 1;
        });

        return this.sortObjectByValue(distribution);
    }

    getStoreDistribution(data) {
        const distribution = {};
        const userStores = new Map();

        data.forEach(row => {
            if (!userStores.has(row.mid) && row.sitename) {
                userStores.set(row.mid, row.sitename);
            }
        });

        userStores.forEach(store => {
            distribution[store] = (distribution[store] || 0) + 1;
        });

        return this.sortObjectByValue(distribution);
    }

    getFollowupStatus(data) {
        const users = new Map();
        data.forEach(row => {
            if (!users.has(row.mid)) {
                users.set(row.mid, {
                    logContent: []
                });
            }
            if (row.logcont) {
                users.get(row.mid).logContent.push(row.logcont);
            }
        });

        const status = {
            '已接通': 0,
            '可跟进': 0,
            '深度沟通': 0,
            '未接通': 0
        };

        users.forEach(user => {
            if (this.hasDeepCommunication(user.logContent)) {
                status['深度沟通']++;
            } else if (this.canFollowup(user.logContent)) {
                status['可跟进']++;
            } else if (this.isConnected(user.logContent)) {
                status['已接通']++;
            } else {
                status['未接通']++;
            }
        });

        return status;
    }

    getTimeDistribution(data) {
        const distribution = {};
        const userDates = new Map();

        data.forEach(row => {
            if (!userDates.has(row.mid) && row.createtime) {
                const date = new Date(row.createtime).toISOString().split('T')[0];
                userDates.set(row.mid, date);
            }
        });

        userDates.forEach(date => {
            distribution[date] = (distribution[date] || 0) + 1;
        });

        const sortedDates = Object.keys(distribution).sort();
        const result = {};
        sortedDates.forEach(date => {
            result[date] = distribution[date];
        });

        return result;
    }

    getDetailedData(data) {
        const userMap = new Map();

        data.forEach(row => {
            if (!userMap.has(row.mid)) {
                userMap.set(row.mid, {
                    mid: row.mid,
                    nickname: row.nickname,
                    mobile: row.mobile,
                    gender: row.gender === 1 ? '男' : row.gender === 2 ? '女' : '未知',
                    age: row.ageyear,
                    height: row.height,
                    education: row.education,
                    createtime: row.createtime,
                    channel: this.channelMapping[row.sourcefrom] || `未知渠道(${row.sourcefrom})`,
                    sitename: row.sitename,
                    followups: []
                });
            }

            if (row.addtime && row.logcont) {
                userMap.get(row.mid).followups.push({
                    time: row.addtime,
                    content: row.logcont
                });
            }
        });

        return Array.from(userMap.values()).slice(0, 100);
    }

    getConnectionTrend(data) {
        const dailyUsers = new Map();
        const dailyConnected = new Map();

        data.forEach(row => {
            if (!row.createtime) return;

            const date = new Date(row.createtime).toISOString().split('T')[0];

            if (!dailyUsers.has(date)) {
                dailyUsers.set(date, new Set());
                dailyConnected.set(date, new Set());
            }

            dailyUsers.get(date).add(row.mid);

            if (row.logcont && this.isConnected([row.logcont])) {
                dailyConnected.get(date).add(row.mid);
            }
        });

        const trend = {};
        const sortedDates = Array.from(dailyUsers.keys()).sort();

        sortedDates.forEach(date => {
            const totalUsers = dailyUsers.get(date).size;
            const connectedUsers = dailyConnected.get(date).size;
            trend[date] = totalUsers > 0 ? ((connectedUsers / totalUsers) * 100).toFixed(2) : '0.00';
        });

        return trend;
    }

    getDeepCommTrend(data) {
        const dailyUsers = new Map();
        const dailyDeepComm = new Map();

        data.forEach(row => {
            if (!row.createtime) return;

            const date = new Date(row.createtime).toISOString().split('T')[0];

            if (!dailyUsers.has(date)) {
                dailyUsers.set(date, new Set());
                dailyDeepComm.set(date, new Set());
            }

            dailyUsers.get(date).add(row.mid);

            if (row.logcont && this.hasDeepCommunication([row.logcont])) {
                dailyDeepComm.get(date).add(row.mid);
            }
        });

        const trend = {};
        const sortedDates = Array.from(dailyUsers.keys()).sort();

        sortedDates.forEach(date => {
            const totalUsers = dailyUsers.get(date).size;
            const deepCommUsers = dailyDeepComm.get(date).size;
            trend[date] = totalUsers > 0 ? ((deepCommUsers / totalUsers) * 100).toFixed(2) : '0.00';
        });

        return trend;
    }

    getThreeDayConnectionTrend(data) {
        const dailyUsers = new Map();
        const dailyThreeDayConnected = new Map();
        
        // 按入库日期分组用户
        const usersByCreateDate = new Map();
        data.forEach(row => {
            if (!row.createtime) return;
            
            const createDate = new Date(row.createtime).toISOString().split('T')[0];
            
            if (!usersByCreateDate.has(createDate)) {
                usersByCreateDate.set(createDate, new Map());
            }
            
            if (!usersByCreateDate.get(createDate).has(row.mid)) {
                usersByCreateDate.get(createDate).set(row.mid, {
                    createtime: row.createtime,
                    followups: []
                });
            }
            
            // 收集跟进记录
            if (row.addtime && row.logcont) {
                usersByCreateDate.get(createDate).get(row.mid).followups.push({
                    time: row.addtime,
                    content: row.logcont
                });
            }
        });
        
        // 计算每日的3天接通率
        const trend = {};
        const sortedDates = Array.from(usersByCreateDate.keys()).sort();
        
        sortedDates.forEach(date => {
            const usersOnDate = usersByCreateDate.get(date);
            const totalUsers = usersOnDate.size;
            let connectedWithin3Days = 0;
            
            usersOnDate.forEach(user => {
                const createDate = new Date(user.createtime);
                const threeDaysLater = new Date(createDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                
                const hasConnectionWithin3Days = user.followups.some(followup => {
                    if (!followup.time) return false;
                    
                    const followupDate = new Date(followup.time);
                    const isWithinTimeRange = followupDate >= createDate && followupDate <= threeDaysLater;
                    const isConnected = this.isConnected([followup.content]);
                    
                    return isWithinTimeRange && isConnected;
                });
                
                if (hasConnectionWithin3Days) {
                    connectedWithin3Days++;
                }
            });
            
            trend[date] = totalUsers > 0 ? ((connectedWithin3Days / totalUsers) * 100).toFixed(2) : '0.00';
        });
        
        return trend;
    }

    sortObjectByValue(obj) {
        return Object.entries(obj)
            .sort(([,a], [,b]) => b - a)
            .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
    }

    getEmptyAnalysis() {
        return {
            totalUsers: 0,
            connectionRate: '0.00',
            threeDayConnectionRate: '0.00',
            deepCommunicationRate: '0.00',
            channelDistribution: {},
            storeDistribution: {},
            followupStatus: {
                '已接通': 0,
                '可跟进': 0,
                '深度沟通': 0,
                '未接通': 0
            },
            timeDistribution: {},
            connectionTrend: {},
            threeDayConnectionTrend: {},
            deepCommTrend: {},
            detailedData: []
        };
    }
}
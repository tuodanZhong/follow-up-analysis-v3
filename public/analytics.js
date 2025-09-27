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
            invalidDataRate: this.getInvalidDataRate(rawData),
            channelDistribution: this.getChannelDistribution(rawData),
            storeDistribution: this.getStoreDistribution(rawData),
            followupStatus: this.getFollowupStatus(rawData),
            timeDistribution: this.getTimeDistribution(rawData),
            connectionTrend: this.getConnectionTrend(rawData),
            threeDayConnectionTrend: this.getThreeDayConnectionTrend(rawData),
            deepCommTrend: this.getDeepCommTrend(rawData),
            invalidDataTrend: this.getInvalidDataTrend(rawData),
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
        // 未接通的用户：没有深度沟通或资料不符关键词，且80%以上的跟进记录命中未接通关键词
        const notConnectedUsers = Array.from(users.values()).filter(user => {
            if (!user.hasFollowup || user.logContent.length === 0) return false;

            // 有深度沟通或资料不符，就不算未接通
            if (this.hasDeepCommunication(user.logContent) || this.hasInvalidData(user.logContent)) {
                return false;
            }

            // 计算未接通关键词的命中率
            const noConnectionCount = user.logContent.filter(log => this.hasNoConnection([log])).length;
            const noConnectionRate = noConnectionCount / user.logContent.length;

            // 超过80%的跟进记录命中未接通关键词，则判定为未接通
            return noConnectionRate > 0.8;
        }).length;

        const connectionRate = totalUsers > 0 ? (100 - (notConnectedUsers / totalUsers) * 100) : 0;
        return connectionRate.toFixed(2);
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

        // 未接通的用户（在3天内）：3天内没有深度沟通或资料不符关键词，且80%以上的跟进记录命中未接通关键词
        const notConnectedUsers = Array.from(users.values()).filter(user => {
            if (!user.createtime) return false;

            const createDate = new Date(user.createtime);
            const threeDaysLater = new Date(createDate.getTime() + 3 * 24 * 60 * 60 * 1000);

            // 获取3天内的跟进记录
            const followupsWithin3Days = user.followups.filter(followup => {
                if (!followup.time) return false;
                const followupDate = new Date(followup.time);
                return followupDate >= createDate && followupDate <= threeDaysLater;
            });

            // 没有跟进记录，不算未接通
            if (followupsWithin3Days.length === 0) return false;

            const logContents = followupsWithin3Days.map(f => f.content);

            // 有深度沟通或资料不符，就不算未接通
            if (this.hasDeepCommunication(logContents) || this.hasInvalidData(logContents)) {
                return false;
            }

            // 计算未接通关键词的命中率
            const noConnectionCount = logContents.filter(log => this.hasNoConnection([log])).length;
            const noConnectionRate = noConnectionCount / logContents.length;

            // 超过80%的跟进记录命中未接通关键词，则判定为未接通
            return noConnectionRate > 0.8;
        }).length;

        const connectionRate = totalUsers > 0 ? (100 - (notConnectedUsers / totalUsers) * 100) : 0;
        return connectionRate.toFixed(2);
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

    getInvalidDataRate(data) {
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
        // 资料不符用户：有资料不符关键词但没有深度沟通关键词（深度沟通优先级更高）
        const invalidDataUsers = Array.from(users.values()).filter(user =>
            user.hasFollowup &&
            !this.hasDeepCommunication(user.logContent) &&
            this.hasInvalidData(user.logContent)
        ).length;

        return totalUsers > 0 ? ((invalidDataUsers / totalUsers) * 100).toFixed(2) : '0.00';
    }


    hasInvalidData(logContents) {
        const invalidDataKeywords = ['有对象', '不是我', '已经结婚了', '不是单身', '不是本人', '有男朋友', '有女朋友', '有孩子', '有娃'];
        return logContents.some(log =>
            invalidDataKeywords.some(keyword => log && log.includes(keyword))
        );
    }

    hasNoConnection(logContents) {
        const noConnectionKeywords = ['秒挂', '接通挂', '开场挂', '不需要', '开口挂', '报挂', '不方便', '不考虑', '不用了', '不讲话', '随便注册', '玩玩', '拉黑', '删除', '未接', '通话中', '挂断', '正忙', '不接', '语音', '用户忙', '留言', '无人接听', '未响应', '无法接通', '拒接', '关机', '设置了', '黑名单', '停机', '空号', '接了挂', '来电提醒', '设置', '暂停服务', '稍后再拨', '听红娘挂', '呼叫失败', '按掉', '不说话'];
        return logContents.some(log =>
            noConnectionKeywords.some(keyword => log && log.includes(keyword))
        );
    }

    hasDeepCommunication(logContents) {
        const deepCommKeywords = ['核实资料', '基本信息', '微信跟进', '微信联系', '再说', '回电话', '人物介绍', '基本资料', '基本情况', '有空', '到店', '报价', '缔结', '点联系', '来店', '考虑结婚', '择偶标准', '费用', '过日子', '没圈子'];
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
            '深度沟通': 0,
            '资料不符': 0,
            '未接通': 0
        };

        users.forEach(user => {
            if (this.hasDeepCommunication(user.logContent)) {
                status['深度沟通']++;
            } else if (this.hasInvalidData(user.logContent)) {
                status['资料不符']++;
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

        const users = Array.from(userMap.values());

        // 为每个用户添加分类标签
        users.forEach(user => {
            user.classifications = this.getUserClassifications(user);
        });

        return users;
    }

    getUserClassifications(user) {
        const classifications = [];

        if (!user.followups || user.followups.length === 0) {
            return classifications;
        }

        const logContents = user.followups.map(f => f.content);

        // 1. 深沟分类：有深度沟通关键词
        if (this.hasDeepCommunication(logContents)) {
            classifications.push('深沟');
        } else if (this.hasInvalidData(logContents)) {
            // 2. 资料不符分类：有资料不符关键词，但深度沟通优先级更高
            classifications.push('资料不符');
        }

        // 3. 接通分类：新定义 - 不是未接通用户
        // 未接通用户定义：没有深度沟通或资料不符关键词，且80%以上的跟进记录命中未接通关键词
        const isNotConnected = !this.hasDeepCommunication(logContents) &&
                               !this.hasInvalidData(logContents) &&
                               (() => {
                                   const noConnectionCount = logContents.filter(log => this.hasNoConnection([log])).length;
                                   const noConnectionRate = noConnectionCount / logContents.length;
                                   return noConnectionRate > 0.8;
                               })();

        if (!isNotConnected) {
            classifications.push('接通');
        }

        return classifications;
    }

    getConnectionTrend(data) {
        const dailyUsers = new Map();

        // 按日期分组用户数据
        data.forEach(row => {
            if (!row.createtime) return;

            const date = new Date(row.createtime).toISOString().split('T')[0];

            if (!dailyUsers.has(date)) {
                dailyUsers.set(date, new Map());
            }

            if (!dailyUsers.get(date).has(row.mid)) {
                dailyUsers.get(date).set(row.mid, []);
            }

            if (row.logcont) {
                dailyUsers.get(date).get(row.mid).push(row.logcont);
            }
        });

        const trend = {};
        const sortedDates = Array.from(dailyUsers.keys()).sort();

        sortedDates.forEach(date => {
            const usersOnDate = dailyUsers.get(date);
            const totalUsers = usersOnDate.size;

            // 计算未接通用户数（使用新定义）
            const notConnectedUsers = Array.from(usersOnDate.values()).filter(logContents => {
                if (logContents.length === 0) return false;

                // 有深度沟通或资料不符，就不算未接通
                if (this.hasDeepCommunication(logContents) || this.hasInvalidData(logContents)) {
                    return false;
                }

                // 计算未接通关键词的命中率
                const noConnectionCount = logContents.filter(log => this.hasNoConnection([log])).length;
                const noConnectionRate = noConnectionCount / logContents.length;

                // 超过80%的跟进记录命中未接通关键词，则判定为未接通
                return noConnectionRate > 0.8;
            }).length;

            const connectionRate = totalUsers > 0 ? (100 - (notConnectedUsers / totalUsers) * 100) : 0;
            trend[date] = connectionRate.toFixed(2);
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

            // 使用新定义：计算3天内未接通的用户
            const notConnectedUsers = Array.from(usersOnDate.values()).filter(user => {
                if (!user.createtime) return false;

                const createDate = new Date(user.createtime);
                const threeDaysLater = new Date(createDate.getTime() + 3 * 24 * 60 * 60 * 1000);

                const followupsWithin3Days = user.followups.filter(followup => {
                    if (!followup.time) return false;
                    const followupDate = new Date(followup.time);
                    return followupDate >= createDate && followupDate <= threeDaysLater;
                });

                if (followupsWithin3Days.length === 0) return false;

                const logContents = followupsWithin3Days.map(f => f.content);

                // 有深度沟通或资料不符，就不算未接通
                if (this.hasDeepCommunication(logContents) || this.hasInvalidData(logContents)) {
                    return false;
                }

                // 计算未接通关键词的命中率
                const noConnectionCount = logContents.filter(log => this.hasNoConnection([log])).length;
                const noConnectionRate = noConnectionCount / logContents.length;

                // 超过80%的跟进记录命中未接通关键词，则判定为未接通
                return noConnectionRate > 0.8;
            }).length;

            const connectionRate = totalUsers > 0 ? (100 - (notConnectedUsers / totalUsers) * 100) : 0;
            trend[date] = connectionRate.toFixed(2);
        });

        return trend;
    }

    getInvalidDataTrend(data) {
        const dailyUsers = new Map();

        // 按日期分组用户数据
        data.forEach(row => {
            if (!row.createtime) return;

            const date = new Date(row.createtime).toISOString().split('T')[0];

            if (!dailyUsers.has(date)) {
                dailyUsers.set(date, new Map());
            }

            if (!dailyUsers.get(date).has(row.mid)) {
                dailyUsers.get(date).set(row.mid, []);
            }

            if (row.logcont) {
                dailyUsers.get(date).get(row.mid).push(row.logcont);
            }
        });

        const trend = {};
        const sortedDates = Array.from(dailyUsers.keys()).sort();

        sortedDates.forEach(date => {
            const usersOnDate = dailyUsers.get(date);
            const totalUsers = usersOnDate.size;

            // 计算资料不符用户数（深度沟通优先级更高）
            const invalidDataUsers = Array.from(usersOnDate.values()).filter(logContents => {
                if (logContents.length === 0) return false;

                // 有深度沟通，就不算资料不符
                if (this.hasDeepCommunication(logContents)) {
                    return false;
                }

                // 有资料不符关键词
                return this.hasInvalidData(logContents);
            }).length;

            const invalidDataRate = totalUsers > 0 ? ((invalidDataUsers / totalUsers) * 100) : 0;
            trend[date] = invalidDataRate.toFixed(2);
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
            invalidDataRate: '0.00',
            channelDistribution: {},
            storeDistribution: {},
            followupStatus: {
                '深度沟通': 0,
                '资料不符': 0,
                '未接通': 0
            },
            timeDistribution: {},
            connectionTrend: {},
            threeDayConnectionTrend: {},
            deepCommTrend: {},
            invalidDataTrend: {},
            detailedData: []
        };
    }
}
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    host: 'sh-cdb-41628zog.sql.tencentcdb.com',
    port: 23800,
    database: 'oe_service_prd',
    user: 'oe_service_prd',
    password: 'Oeservice45698#$%.',
    charset: 'utf8mb4'
};

// 缓存配置
const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'analysis-data.json');
const CACHE_EXPIRY_HOURS = 24; // 缓存24小时后过期

// 动态生成日期范围：昨天到4个月前
function getDateRange() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const fourMonthsAgo = new Date(today);
    fourMonthsAgo.setMonth(today.getMonth() - 4);

    return {
        startDate: fourMonthsAgo.toISOString().split('T')[0], // YYYY-MM-DD格式
        endDate: yesterday.toISOString().split('T')[0]        // YYYY-MM-DD格式
    };
}

function buildQuery() {
    const { startDate, endDate } = getDateRange();

    return `select
        mid,createtime,nickname,mobile,gender,ageyear,height,education,addtime,
        truename,sourcefrom,calltype,remark,pregiveupdes,pregiveups,pregiveupcat,sitename,logcont
        from
        (select
        mid,from_unixtime(addtime) as createtime,nickname,mobile,gender,ageyear,height,education,truename,sourcefrom,calltype,remark,pregiveupdes,pregiveups,pregiveupcat,siteid
        from oelv_pre_crm_member where from_unixtime(addtime,'%Y-%m-%d') >= date('${startDate}')
        and from_unixtime(addtime,'%Y-%m-%d') <= date('${endDate}')
        and siteid in (13,337,327,378)
        ) as users
        left join
        (select from_unixtime(addtime) as addtime,logcont,mid as fmid,siteid as fsiteid,
        ROW_NUMBER() OVER (PARTITION BY mid ORDER BY addtime ASC) AS rn
        from oelv_pre_crm_follow2
        where from_unixtime(addtime,'%Y-%m-%d') >= date('${startDate}')
        and from_unixtime(addtime,'%Y-%m-%d') <= date('${endDate}')
        and siteid in (13,337,327,378)
        ) as follow
        on fmid = users.mid and addtime >= createtime
        left join
        (select siteid as msiteid,sitename from oelv_pre_crm_site) as mendian
        on msiteid = fsiteid`;
}

// 缓存管理函数
async function getCacheInfo() {
    try {
        const stats = await fs.stat(CACHE_FILE);
        const cacheData = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
        const cacheAge = Date.now() - stats.mtime.getTime();
        const isExpired = cacheAge > (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);

        return {
            exists: true,
            lastUpdate: stats.mtime.toISOString(),
            isExpired,
            ageHours: Math.floor(cacheAge / (60 * 60 * 1000)),
            dateRange: cacheData.dateRange
        };
    } catch (error) {
        return {
            exists: false,
            lastUpdate: null,
            isExpired: true,
            ageHours: 0,
            dateRange: null
        };
    }
}

async function getCachedData() {
    try {
        const cacheData = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
        return cacheData;
    } catch (error) {
        return null;
    }
}

async function saveCachedData(data, analysisResult) {
    try {
        // 确保缓存目录存在
        await fs.mkdir(CACHE_DIR, { recursive: true });

        const { startDate, endDate } = getDateRange();
        const cacheData = {
            data,
            analysisResult,
            count: data.length,
            timestamp: new Date().toISOString(),
            dateRange: {
                startDate,
                endDate,
                description: `数据范围：${startDate} 到 ${endDate} (昨天到4个月前)`
            },
            version: '1.0'
        };

        await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData), 'utf8');
        console.log(`缓存数据已保存: ${data.length} 条记录`);
        return true;
    } catch (error) {
        console.error('保存缓存数据失败:', error);
        return false;
    }
}

app.get('/api/data', async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);

        // 动态生成查询语句
        const query = buildQuery();
        const { startDate, endDate } = getDateRange();

        console.log(`执行数据查询 - 日期范围: ${startDate} 到 ${endDate}`);

        const [rows] = await connection.execute(query);

        console.log(`数据查询完成 - 获取到 ${rows.length} 条记录`);

        res.json({
            success: true,
            data: rows,
            count: rows.length,
            timestamp: new Date().toISOString(),
            dateRange: {
                startDate,
                endDate,
                description: `数据范围：${startDate} 到 ${endDate} (昨天到4个月前)`
            }
        });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

// 缓存状态检查API
app.get('/api/cache-status', async (req, res) => {
    try {
        const cacheInfo = await getCacheInfo();
        res.json({
            success: true,
            cache: cacheInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取缓存数据API
app.get('/api/cached-data', async (req, res) => {
    try {
        const cachedData = await getCachedData();
        if (cachedData) {
            res.json({
                success: true,
                ...cachedData,
                fromCache: true
            });
        } else {
            res.status(404).json({
                success: false,
                error: '缓存数据不存在'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 刷新缓存API - 强制重新提取数据
app.post('/api/refresh-cache', async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);

        // 动态生成查询语句
        const query = buildQuery();
        const { startDate, endDate } = getDateRange();

        console.log(`强制刷新缓存 - 日期范围: ${startDate} 到 ${endDate}`);

        const [rows] = await connection.execute(query);
        console.log(`缓存刷新查询完成 - 获取到 ${rows.length} 条记录`);

        // 保存到缓存
        await saveCachedData(rows, null);

        res.json({
            success: true,
            data: rows,
            count: rows.length,
            timestamp: new Date().toISOString(),
            dateRange: {
                startDate,
                endDate,
                description: `数据范围：${startDate} 到 ${endDate} (昨天到4个月前)`
            },
            fromCache: false,
            refreshed: true
        });

    } catch (error) {
        console.error('缓存刷新失败:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    } finally {
        if (connection) {
            await connection.end();
        }
    }
});

app.get('/api/progress', (req, res) => {
    res.json({
        progress: Math.floor(Math.random() * 100),
        status: 'processing',
        message: '正在提取数据...'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
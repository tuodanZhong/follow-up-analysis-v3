const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const dbConfig = {
    host: 'sh-cdb-41628zog.sql.tencentcdb.com',
    port: 23800,
    database: 'oe_service_prd',
    user: 'oe_service_prd',
    password: 'Oeservice45698#$%.',
    charset: 'utf8mb4'
};

const query = `select
    mid,createtime,nickname,mobile,gender,ageyear,height,education,addtime,
    truename,sourcefrom,calltype,remark,pregiveupdes,pregiveups,pregiveupcat,sitename,logcont
    from
    (select
    mid,from_unixtime(addtime) as createtime,nickname,mobile,gender,ageyear,height,education,truename,sourcefrom,calltype,remark,pregiveupdes,pregiveups,pregiveupcat,siteid
    from oelv_pre_crm_member where from_unixtime(addtime,'%Y-%m-%d') > date('2025-08-01')
    and siteid in (13,337,327,378)
    ) as users
    left join
    (select from_unixtime(addtime) as addtime,logcont,mid as fmid,siteid as fsiteid,
    ROW_NUMBER() OVER (PARTITION BY mid ORDER BY addtime ASC) AS rn
    from oelv_pre_crm_follow2
    where from_unixtime(addtime,'%Y-%m-%d') > date('2025-08-01')
    and siteid in (13,337,327,378)
    ) as follow
    on fmid = users.mid and addtime >= createtime
    left join
    (select siteid as msiteid,sitename from oelv_pre_crm_site) as mendian
    on msiteid = fsiteid`;

app.get('/api/data', async (req, res) => {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.execute(query);

        res.json({
            success: true,
            data: rows,
            count: rows.length,
            timestamp: new Date().toISOString()
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

app.get('/api/progress', (req, res) => {
    res.json({
        progress: Math.floor(Math.random() * 100),
        status: 'processing',
        message: '正在提取数据...'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});